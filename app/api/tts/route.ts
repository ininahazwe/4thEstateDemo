import { NextRequest, NextResponse } from 'next/server';
import { synthesize, type SupportedTTSLang } from '@/lib/tts/piper';

const SUPPORTED: SupportedTTSLang[] = ['EN', 'FR', 'PT', 'SW'];

export async function POST(req: NextRequest) {
    let body: { text?: string; lang?: string };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const text = body.text?.trim();
    if (!text) {
        return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    // Piper est rapide mais reste un process serveur par requete non-cachee :
    // borne large pour couvrir un article long, evite un abus trivial du endpoint.
    if (text.length > 20000) {
        return NextResponse.json({ error: 'text too long' }, { status: 413 });
    }

    const lang = (body.lang ?? 'EN').toUpperCase() as SupportedTTSLang;
    if (!SUPPORTED.includes(lang)) {
        return NextResponse.json(
            { error: `lang must be one of ${SUPPORTED.join(', ')}` },
            { status: 400 }
        );
    }

    try {
        const audio = await synthesize(text, lang);
        return new NextResponse(new Uint8Array(audio), {
            headers: {
                'Content-Type': 'audio/wav',
                // Le contenu est deterministe pour (texte, langue) -> cache navigateur agressif.
                'Cache-Control': 'public, max-age=604800, immutable',
            },
        });
    } catch (err) {
        console.error('TTS error:', err);
        return NextResponse.json(
            { error: 'TTS failed', detail: err instanceof Error ? err.message : String(err) },
            { status: 502 }
        );
    }
}
