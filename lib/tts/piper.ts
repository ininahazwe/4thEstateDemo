import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type SupportedTTSLang = 'EN' | 'FR' | 'PT' | 'SW';

// ---------------------------------------------------------------------------
// TTS backend : Piper (moteur neuronal open-source, 100% local, gratuit).
// Remplace window.speechSynthesis (voix/couverture linguistique dependant du
// navigateur/OS du visiteur -- cf. diagnostic 31/08/2026) par une synthese
// serveur, identique pour tous les visiteurs, mise en cache disque par
// (texte, langue).
//
// Modeles (fichiers .onnx + .onnx.json) a telecharger separement, voir
// claude/tts-piper-installation.md pour la procedure. Override possible par
// langue via PIPER_MODEL_EN / _FR / _PT / _SW (nom de fichier uniquement).
// ---------------------------------------------------------------------------

const VOICE_FILES: Record<SupportedTTSLang, string> = {
    EN: process.env.PIPER_MODEL_EN ?? 'en_GB-alan-medium.onnx',
    FR: process.env.PIPER_MODEL_FR ?? 'fr_FR-siwis-medium.onnx',
    PT: process.env.PIPER_MODEL_PT ?? 'pt_PT-tugao-medium.onnx',
    SW: process.env.PIPER_MODEL_SW ?? 'sw_CD-lanfrica-medium.onnx',
};

const PIPER_BIN = process.env.PIPER_BIN ?? path.join(process.cwd(), 'piper', 'piper');
const PIPER_MODELS_DIR = process.env.PIPER_MODELS_DIR ?? path.join(process.cwd(), 'piper', 'models');
const CACHE_DIR = process.env.TTS_CACHE_DIR ?? path.join(process.cwd(), '.tts-cache');

function cacheKey(text: string, lang: SupportedTTSLang): string {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    return `${lang}-${hash}.wav`;
}

/**
 * Synthetise `text` dans la langue `lang` via Piper. Resultat mis en cache
 * sur disque : un meme article est relu par de nombreux visiteurs, contrairement
 * a la traduction (texte variable par utilisateur), donc le cache disque tient
 * ici sa promesse au-dela d'un seul cold start.
 */
export function synthesize(text: string, lang: SupportedTTSLang): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const modelFile = VOICE_FILES[lang];
        const modelPath = path.join(PIPER_MODELS_DIR, modelFile);
        const outPath = path.join(CACHE_DIR, cacheKey(text, lang));

        if (fs.existsSync(outPath)) {
            fs.readFile(outPath, (err, data) => (err ? reject(err) : resolve(data)));
            return;
        }

        if (!fs.existsSync(modelPath)) {
            reject(new Error(`Piper voice model missing: ${modelPath}`));
            return;
        }

        fs.mkdirSync(CACHE_DIR, { recursive: true });

        const proc = spawn(PIPER_BIN, ['--model', modelPath, '--output_file', outPath]);

        let stderr = '';
        proc.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        proc.on('error', (err) => {
            // Binaire introuvable, pas executable (chmod +x manquant), etc.
            reject(new Error(`Failed to start Piper (${PIPER_BIN}): ${err.message}`));
        });

        proc.on('close', (code) => {
            if (code !== 0 || !fs.existsSync(outPath)) {
                reject(new Error(`Piper exited with code ${code}: ${stderr.slice(0, 500)}`));
                return;
            }
            fs.readFile(outPath, (err, data) => (err ? reject(err) : resolve(data)));
        });

        proc.stdin.write(text);
        proc.stdin.end();
    });
}
