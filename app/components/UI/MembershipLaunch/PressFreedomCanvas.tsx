"use client";

import { useEffect, useRef } from "react";

/**
 * Fond animé WebGL du popup « Membership launch ».
 *
 * Métaphore : un document interminable dont certaines lignes sont caviardées.
 * La lumière (curseur / doigt, ou un halo qui dérive tout seul) dissout les
 * bandeaux de censure et rend le texte lisible → « la liberté de la presse,
 * c'est ce qui reste quand on braque la lumière sur ce qu'on veut cacher ».
 *
 * Contraintes tenues volontairement :
 *  - AUCUNE dépendance (pas de three.js / GSAP) : ~7 Ko de shader + boilerplate,
 *    chargé en dynamic import uniquement quand le popup s'ouvre.
 *  - `powerPreference: "low-power"`, DPR plafonné, rAF arrêté quand l'onglet
 *    passe en arrière-plan.
 *  - Si WebGL est indisponible ou que la compilation échoue : on pose
 *    `data-fallback="1"` sur le canvas, le dégradé CSS du parent prend le
 *    relais. Le popup reste parfaitement utilisable.
 *  - `prefers-reduced-motion` : une seule frame est rendue, rien ne bouge.
 */

const VERT = `
attribute vec2 aPos;
void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uPointer;   // position de la lumière, en espace écran corrigé
uniform float uEnergy;    // 0..1, intensité du halo (monte quand on bouge)
uniform float uReveal;    // 0..1, ouverture automatique du document

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return v;
}

/* Bandeau horizontal centré sur une ligne : 1.0 au milieu, 0.0 aux bords. */
float band(float fy, float lo, float hi, float soft) {
    return smoothstep(lo - soft, lo + soft, fy) * (1.0 - smoothstep(hi - soft, hi + soft, fy));
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    /* --- le document défile lentement vers le haut ------------------------ */
    const float ROWS = 22.0;
    float scroll = uTime * 0.035;
    float ly  = (p.y + scroll) * ROWS;
    float row = floor(ly);
    float fy  = fract(ly);

    float rowSeed = hash(vec2(row, 7.0));

    /* Respiration : quelques lignes vides = sauts de paragraphe. */
    float blank = step(0.86, hash(vec2(row * 0.61, 41.0)));
    /* Et quelques intertitres : plus épais, plus courts, plus lumineux. */
    float isTitle = step(0.90, hash(vec2(row * 2.11, 57.0))) * (1.0 - blank);

    /* Marge de gauche variable : chaque paragraphe respire. */
    float indent = -0.5 * aspect + 0.06 * aspect + rowSeed * 0.03;
    /* Dernière ligne d'un paragraphe : plus courte. */
    float lineWidth = (0.62 + hash(vec2(row, 19.0)) * 0.32) * (1.0 - isTitle * 0.45);
    float lineEnd = indent + lineWidth * aspect * 0.92;
    float inLine = step(indent, p.x) * step(p.x, lineEnd) * (1.0 - blank);

    /* --- « mots » : segments interrompus par des espaces ------------------ */
    float wx  = (p.x - indent) * mix(26.0, 13.0, isTitle);
    wx += rowSeed * 11.0;
    float wi  = floor(wx);
    float wf  = fract(wx);
    float wordLen = 0.55 + hash(vec2(wi, row)) * 0.4;   // largeur du mot
    float word = 1.0 - smoothstep(wordLen - 0.06, wordLen + 0.06, wf);

    float thick = isTitle * 0.07;
    float glyph = band(fy, 0.30 - thick, 0.62 + thick, 0.05) * word * inLine;

    /* --- lignes caviardées ------------------------------------------------ */
    float censored = step(0.66, hash(vec2(row * 1.73, 3.0)));
    float redaction = band(fy, 0.22, 0.70, 0.04) * inLine * censored;

    /* --- lumière ---------------------------------------------------------- */
    float d = length((p - uPointer) * vec2(1.0, 1.35));
    float beam = exp(-d * 3.2);
    float halo = exp(-d * 7.0);

    float flow = fbm(p * 2.4 + vec2(uTime * 0.05, -uTime * 0.03));

    /* Ce qui est révélé : le faisceau, surtout, + un souffle d'ouverture auto. */
    float reveal = clamp(beam * (1.05 + uEnergy * 0.80) + uReveal * 0.16 + flow * 0.07 - 0.04, 0.0, 1.0);

    /* --- palette (accordée au site : #ff5252 / #003049) ------------------- */
    vec3 bg      = vec3(0.031, 0.043, 0.063);
    vec3 deep    = vec3(0.000, 0.188, 0.286);   // --bleufonce
    vec3 ink     = vec3(0.900, 0.918, 0.945);
    vec3 accent  = vec3(1.000, 0.322, 0.322);   // --sitePrimary

    vec3 col = bg;
    col += deep * (0.08 + flow * 0.22) * (0.30 + beam * 1.10);

    /* Le texte existe en filigrane, mais ne devient lisible que sous la lumière. */
    col = mix(col, ink * 0.10, glyph * 0.7);
    col = mix(col, ink * (0.85 + isTitle * 0.15), glyph * reveal);

    /* Le caviardage : bandeau plein, qui se dissout quand on l'éclaire. */
    float bar = clamp(redaction * (1.0 - reveal * 1.25), 0.0, 1.0);
    col = mix(col, mix(vec3(0.10, 0.02, 0.04), accent, 0.35), bar);
    /* Liseré chaud sur le bord du bandeau qui cède. */
    col += accent * bar * beam * 1.10;

    /* Halo du curseur. */
    col += accent * halo * (0.10 + uEnergy * 0.22);
    col += vec3(0.85, 0.90, 1.00) * beam * beam * 0.045;

    /* Grain + vignette. */
    float grain = hash(uv * uRes + fract(uTime) * 91.7) - 0.5;
    col += grain * 0.022;
    float vig = 1.0 - 0.55 * dot(p, p);
    col *= clamp(vig, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
}
`;

type Props = { className?: string };

export default function PressFreedomCanvas({ className }: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const reduced =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const gl =
            (canvas.getContext("webgl", {
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
                powerPreference: "low-power",
            }) as WebGLRenderingContext | null) ??
            (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

        if (!gl) {
            canvas.dataset.fallback = "1";
            return;
        }

        const fail = () => {
            canvas.dataset.fallback = "1";
        };

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type);
            if (!sh) return null;
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                gl.deleteShader(sh);
                return null;
            }
            return sh;
        };

        const vs = compile(gl.VERTEX_SHADER, VERT);
        const fs = compile(gl.FRAGMENT_SHADER, FRAG);
        const prog = vs && fs ? gl.createProgram() : null;
        if (!vs || !fs || !prog) {
            fail();
            return;
        }
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            fail();
            return;
        }
        gl.useProgram(prog);

        // Un seul grand triangle qui recouvre tout le clip space.
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(prog, "aPos");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        const uRes = gl.getUniformLocation(prog, "uRes");
        const uTime = gl.getUniformLocation(prog, "uTime");
        const uPointer = gl.getUniformLocation(prog, "uPointer");
        const uEnergy = gl.getUniformLocation(prog, "uEnergy");
        const uReveal = gl.getUniformLocation(prog, "uReveal");

        let width = 1;
        let height = 1;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const rect = canvas.getBoundingClientRect();
            width = Math.max(1, Math.round(rect.width * dpr));
            height = Math.max(1, Math.round(rect.height * dpr));
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, width, height);
            }
        };
        resize();

        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
        ro?.observe(canvas);
        window.addEventListener("resize", resize);

        /* --- pointeur : position visée, lissée frame à frame --------------- */
        let target = { x: 0, y: 0 };
        let current = { x: 0, y: 0 };
        let energy = 0;
        let lastInput = -1e9;

        const onMove = (ev: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const aspect = rect.width / rect.height;
            target = {
                x: ((ev.clientX - rect.left) / rect.width - 0.5) * aspect,
                y: (1 - (ev.clientY - rect.top) / rect.height - 0.5),
            };
            energy = 1;
            lastInput = performance.now();
        };

        // On écoute sur la fenêtre : le contenu du popup est au-dessus du canvas,
        // le faisceau doit suivre le curseur même quand il passe sur le texte.
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerdown", onMove, { passive: true });

        let raf = 0;
        const t0 = performance.now();

        const draw = (now: number) => {
            const t = (now - t0) / 1000;

            // Sans interaction depuis 2,5 s : la lumière repart en balade seule.
            if (now - lastInput > 2500) {
                const rect = canvas.getBoundingClientRect();
                const aspect = rect.height ? rect.width / rect.height : 1.6;
                target = {
                    x: Math.cos(t * 0.31) * 0.30 * aspect,
                    y: Math.sin(t * 0.23) * 0.26,
                };
                energy *= 0.94;
            }

            current.x += (target.x - current.x) * 0.075;
            current.y += (target.y - current.y) * 0.075;
            energy *= 0.965;

            gl.uniform2f(uRes, width, height);
            gl.uniform1f(uTime, t);
            gl.uniform2f(uPointer, current.x, current.y);
            gl.uniform1f(uEnergy, energy);
            // Ouverture progressive du document sur ~7 s, puis respiration lente.
            const open = Math.min(1, t / 7);
            gl.uniform1f(uReveal, open * (0.82 + 0.18 * Math.sin(t * 0.35)));

            gl.drawArrays(gl.TRIANGLES, 0, 3);
            raf = requestAnimationFrame(draw);
        };

        const start = () => {
            if (!raf) raf = requestAnimationFrame(draw);
        };
        const stop = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
        };
        const onVisibility = () => (document.hidden ? stop() : start());

        if (reduced) {
            // Une frame, figée, avec le document déjà ouvert.
            gl.uniform2f(uRes, width, height);
            gl.uniform1f(uTime, 12);
            gl.uniform2f(uPointer, 0, 0);
            gl.uniform1f(uEnergy, 0.2);
            gl.uniform1f(uReveal, 1);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        } else {
            document.addEventListener("visibilitychange", onVisibility);
            start();
        }

        return () => {
            stop();
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerdown", onMove);
            window.removeEventListener("resize", resize);
            ro?.disconnect();
            gl.deleteBuffer(buf);
            gl.deleteProgram(prog);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
    }, []);

    return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
