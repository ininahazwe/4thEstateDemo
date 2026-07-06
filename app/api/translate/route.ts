// app/api/translate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// ---- Types ----

type SupportedLang = 'EN' | 'FR' | 'PT' | 'SW';

interface TranslateRequestBody {
    texts: string[];
    targetLang: SupportedLang;
}

interface TranslateResponseBody {
    translations: string[];
}

// ---- Config ----

const SUPPORTED_LANGS: SupportedLang[] = ['EN', 'FR', 'PT', 'SW'];

const LANG_NAMES: Record<SupportedLang, string> = {
    EN: 'English',
    FR: 'French',
    PT: 'Portuguese',
    SW: 'Swahili',
};

// ---------------------------------------------------------------------------
// Backend de traduction — switchable via TRANSLATE_PROVIDER ('gemini' | 'groq').
// Les deux sont des LLM contextuels à tier gratuit ; on bascule sans toucher
// au code, juste aux variables d'environnement.
//
//   gemini : Google Gemini. Clé gratuite https://aistudio.google.com/apikey.
//            Free tier ~1500 req/jour, 1 M tokens/min. ATTENTION : certains
//            projets/régions ont un quota gratuit à 0 (erreur 429 limit:0) —
//            créer la clé dans un NOUVEAU projet AI Studio corrige souvent ça.
//   groq   : Groq (Llama). Clé gratuite https://console.groq.com/keys.
//            Free tier fiable (pas de limit:0), très rapide, API JSON mode.
//
// Modèle override : GEMINI_MODEL / GROQ_MODEL.
// ---------------------------------------------------------------------------

type Provider = 'gemini' | 'groq';
const PROVIDER: Provider = process.env.TRANSLATE_PROVIDER === 'groq' ? 'groq' : 'gemini';

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Cache en mémoire : clé = hash(texte + langue) -> traduction
// NB : vidé à chaque cold start de la fonction serverless (Vercel).
// Suffisant pour la V1 ; à remplacer par un KV store si le volume augmente.
const translationCache = new Map<string, string>();

function cacheKey(text: string, lang: SupportedLang): string {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    return `${lang}:${hash}`;
}

// ---- Handler ----

export async function POST(req: NextRequest) {
    let body: TranslateRequestBody;

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { texts, targetLang } = body;

    if (!Array.isArray(texts) || texts.length === 0) {
        return NextResponse.json(
            { error: 'texts must be a non-empty array' },
            { status: 400 }
        );
    }

    if (!SUPPORTED_LANGS.includes(targetLang)) {
        return NextResponse.json(
            { error: `targetLang must be one of ${SUPPORTED_LANGS.join(', ')}` },
            { status: 400 }
        );
    }

    const apiKey = PROVIDER === 'groq' ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: `Translation service not configured (missing ${PROVIDER === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY'})` },
            { status: 500 }
        );
    }

    // Séparer ce qui est déjà en cache de ce qui doit être traduit
    const results: string[] = new Array(texts.length);
    const toTranslate: { index: number; text: string }[] = [];

    texts.forEach((text, index) => {
        const key = cacheKey(text, targetLang);
        const cached = translationCache.get(key);
        if (cached !== undefined) {
            results[index] = cached;
        } else {
            toTranslate.push({ index, text });
        }
    });

    // Tout était en cache : on renvoie directement
    if (toTranslate.length === 0) {
        return NextResponse.json<TranslateResponseBody>({ translations: results });
    }

    try {
        const translated = await translateBatch(
            toTranslate.map((t) => t.text),
            targetLang,
            apiKey
        );

        toTranslate.forEach(({ index, text }, i) => {
            const translation = translated[i] ?? text; // fallback : texte original si manquant
            results[index] = translation;
            translationCache.set(cacheKey(text, targetLang), translation);
        });

        return NextResponse.json<TranslateResponseBody>({ translations: results });
    } catch (err) {
        console.error('Translation error:', err);
        return NextResponse.json(
            { error: 'Translation failed', detail: err instanceof Error ? err.message : String(err) },
            { status: 502 }
        );
    }
}

// ---- Dispatcher ----

async function translateBatch(
    texts: string[],
    targetLang: SupportedLang,
    apiKey: string
): Promise<string[]> {
    const langName = LANG_NAMES[targetLang];

    // On numérote les segments pour donner au modèle un ancrage d'ordre clair.
    const numbered = texts.map((t, i) => `${i}: ${t}`).join('\n');

    const systemPrompt = `You are a professional news translator for a Ghanaian news outlet called The Fourth Estate.
Each input line has the form "<i>: <text>" where <i> is a segment index.
Translate every segment's text into ${langName}.
Rules:
- Preserve journalistic tone and meaning. Do not summarize, add commentary, or omit information.
- Use the surrounding segments as context to disambiguate meaning and keep terminology consistent across the page.
- Keep proper nouns, names, and place names unchanged unless they have a standard translated form.
- Preserve any HTML tags exactly as they appear in the source segment.
- You MUST return one object per input segment, echoing back its index i. Never merge, split, drop, or reorder segments.
- Respond ONLY with a JSON object of the form: {"translations": [{"i": 0, "t": "<translation>"}, {"i": 1, "t": "..."}]}.`;

    const pairs =
        PROVIDER === 'groq'
            ? await callGroq(numbered, systemPrompt, apiKey)
            : await callGemini(numbered, systemPrompt, apiKey);

    // Reconstruction par index : robuste aux omissions / réordonnancements du
    // LLM. Un index manquant retombe silencieusement sur le texte original
    // plutôt que de casser tout l'alignement (ancien bug "count mismatch").
    const byIndex = new Map<number, string>();
    for (const p of pairs) {
        if (p && typeof p.i === 'number' && typeof p.t === 'string') {
            byIndex.set(p.i, p.t);
        }
    }

    return texts.map((original, k) => byIndex.get(k) ?? original);
}

// Segment traduit renvoyé par le LLM : index + texte.
interface TranslationPair {
    i: number;
    t: string;
}

// ---- Appel Gemini ----

async function callGemini(
    numbered: string,
    systemPrompt: string,
    apiKey: string
): Promise<TranslationPair[]> {
    const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent`;

    const response = await fetch(url, {
        method: 'POST',
        // Auth par header (x-goog-api-key) plutôt que ?key= en query : requis
        // par le nouveau format de clé Gemini (préfixe AQ.) que l'ancien passage
        // en query param rejette selon la route.
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
            systemInstruction: {
                parts: [{ text: systemPrompt }],
            },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: numbered }],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                // Sortie JSON garantie + schéma strict : plus de parsing de markdown.
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        translations: {
                            type: 'ARRAY',
                            items: {
                                type: 'OBJECT',
                                properties: {
                                    i: { type: 'INTEGER' },
                                    t: { type: 'STRING' },
                                },
                                required: ['i', 't'],
                            },
                        },
                    },
                    required: ['translations'],
                },
            },
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    // Gemini renvoie le JSON contraint dans candidates[0].content.parts[0].text.
    const textBlock = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textBlock) {
        // Cause fréquente : blocage safety ou finishReason != STOP.
        const reason = data?.candidates?.[0]?.finishReason ?? 'unknown';
        throw new Error(`No text content in Gemini response (finishReason: ${reason})`);
    }

    let parsed: { translations: TranslationPair[] };
    try {
        parsed = JSON.parse(textBlock);
    } catch {
        throw new Error(`Failed to parse translation JSON: ${String(textBlock).slice(0, 200)}`);
    }

    return parsed.translations ?? [];
}

// ---- Appel Groq (API compatible OpenAI, JSON mode) ----

async function callGroq(
    numbered: string,
    systemPrompt: string,
    apiKey: string
): Promise<TranslationPair[]> {
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: numbered },
            ],
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('No content in Groq response');
    }

    let parsed: { translations: TranslationPair[] };
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new Error(`Failed to parse translation JSON: ${String(content).slice(0, 200)}`);
    }

    return parsed.translations ?? [];
}
