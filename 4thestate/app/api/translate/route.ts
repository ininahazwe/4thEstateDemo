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

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'Translation service not configured' },
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
            { error: 'Translation failed' },
            { status: 502 }
        );
    }
}

// ---- Appel Anthropic ----

async function translateBatch(
    texts: string[],
    targetLang: SupportedLang,
    apiKey: string
): Promise<string[]> {
    const langName = LANG_NAMES[targetLang];

    // On numérote les segments pour garantir l'alignement de la réponse,
    // même si Claude reformule légèrement la structure du JSON.
    const numbered = texts.map((t, i) => `${i}: ${t}`).join('\n');

    const systemPrompt = `You are a professional news translator for a Ghanaian news outlet called The Fourth Estate.
Translate each numbered text segment into ${langName}.
Rules:
- Preserve journalistic tone and meaning. Do not summarize, add commentary, or omit information.
- Keep proper nouns, names, and place names unchanged unless they have a standard translated form.
- Preserve any HTML tags exactly as they appear in the source segment.
- Respond ONLY with a valid JSON object: {"translations": ["...", "...", ...]}
- The translations array must have exactly ${texts.length} elements, in the same order as the input segments.
- Do not include the numbering in your translated output.
- Do not include any text outside the JSON object — no preamble, no markdown fences.`;

    const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: numbered,
                },
            ],
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    const textBlock = data.content?.find((block: any) => block.type === 'text');
    if (!textBlock?.text) {
        throw new Error('No text content in Anthropic response');
    }

    const cleaned = textBlock.text.trim().replace(/^```json\s*|\s*```$/g, '');

    let parsed: { translations: string[] };
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error(`Failed to parse translation JSON: ${cleaned.slice(0, 200)}`);
    }

    if (!Array.isArray(parsed.translations) || parsed.translations.length !== texts.length) {
        throw new Error(
            `Translation count mismatch: expected ${texts.length}, got ${parsed.translations?.length}`
        );
    }

    return parsed.translations;
}