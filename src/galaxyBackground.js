import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
//  NOKRON, ETERNAL CITY — VOID SKY
//  The underground star ocean of Nokron: a black abyss lit only
//  by ancient cold starlight and the ethereal glow of the Mimic
//  Tear. No warmth exists here — only silver, cyan, and dark.
// ═══════════════════════════════════════════════════════════════

export function createGalaxyBackground(scene) {

    const group = new THREE.Group();
    scene.add(group);

    // ── 1. Nokron void sky sphere ──────────────────────────────────
    // The "ceiling" of the eternal city: pure black punctured by
    // cold constellations and faint cyan nebula wisps.
    const nebMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            varying vec3 vPos;
            void main(){
                vPos = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec3 vPos;

            float hash(vec3 p) {
                p = fract(p * 0.3183099 + 0.1);
                p *= 17.0;
                return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }
            float noise(vec3 x) {
                vec3 i = floor(x);
                vec3 f = fract(x);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                        mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                    mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                        mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z
                );
            }
            float fbm(vec3 p) {
                float v = 0.0, a = 0.5;
                // PERFORMANCE: Dropped from 4 octaves to 2 octaves. Visuals retained via normals and basic noise structure.
                for (int i = 0; i < 2; i++) {
                    v += a * noise(p); p *= 2.0; a *= 0.5;
                }
                return v;
            }

            void main(){
                vec3 n = normalize(vPos);

                // ── Nokron star river (cold, structural, no warmth) ──
                // Slight diagonal band like a frozen Milky Way
                vec3 axis = normalize(vec3(0.15, 1.0, 0.25));
                float band = smoothstep(0.35, 0.0, abs(dot(n, axis)));

                vec3 riverCol = vec3(0.0);
                
                // PERFORMANCE BRANCH: Skip heavy FBM dusting math completely if outside the star river band
                if (band > 0.05) {
                    float dustA = fbm(n * 10.0 + vec3(uTime * 0.0008));
                    float dustB = fbm(n * 4.5  - vec3(uTime * 0.0004));

                    float river = band * (dustA * 1.2 + dustB * 0.4);

                    vec3 riverCore  = vec3(0.55, 0.72, 1.00) * river * smoothstep(0.10, 0.0, abs(dot(n, axis))) * 0.6;
                    vec3 riverEdge  = vec3(0.20, 0.50, 0.75) * band * dustA * 0.35;

                    float darkLane  = smoothstep(0.35, 0.65, fbm(n * 14.0));
                    riverCol  = (riverCore + riverEdge) * (1.0 - darkLane * 0.75);
                }

                vec3 cyanHaze = vec3(0.0);
                // PERFORMANCE BRANCH: Skip faint cyan nebula wisps if inside the intensely bright core
                if (band < 0.9) {
                    float neb = fbm(n * 6.0 + vec3(-0.7, 0.4, uTime * 0.0003));
                    cyanHaze = vec3(0.04, 0.12, 0.22) * neb * (1.0 - band) * 0.8;
                }

                // ── Void base: pitch black with the faintest deep navy ──
                vec3 base = vec3(0.000, 0.002, 0.010);

                gl_FragColor = vec4(base + riverCol + cyanHaze, 1.0);
            }
        `,
        transparent: false,
        fog: false,
        depthWrite: false,
        side: THREE.BackSide,
    });
    const nebSphere = new THREE.Mesh(new THREE.SphereGeometry(250, 32, 24), nebMat);
    group.add(nebSphere);

    // ── 2. Stars — Nokron constellation layer ─────────────────────
    // Dense, cold, ancient. Many tiny silver-white points with a
    // handful of brighter cyan "sentinel stars".
    // PERFORMANCE FIX: Halved the celestial background stars to instantly fix mobile overdraw clipping.
    // Raised particle size slightly to compensate for volume.
    const STAR_COUNT = 10000;
    const sPos = new Float32Array(STAR_COUNT * 3);
    const sCol = new Float32Array(STAR_COUNT * 3);
    const sSize = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 48 + Math.random() * 35;
        sPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        sPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        sPos[i * 3 + 2] = r * Math.cos(phi);

        const type = Math.random();
        if (type < 0.50) {
            // Common: pale silver-white
            const w = 0.75 + Math.random() * 0.25;
            sCol[i * 3] = w * 0.88; sCol[i * 3 + 1] = w * 0.94; sCol[i * 3 + 2] = w;
        } else if (type < 0.78) {
            // Cold blue-white
            sCol[i * 3] = 0.60 + Math.random() * 0.20;
            sCol[i * 3 + 1] = 0.78 + Math.random() * 0.15;
            sCol[i * 3 + 2] = 1.0;
        } else if (type < 0.93) {
            // Faint cyan — mimic tear glow
            sCol[i * 3] = 0.30 + Math.random() * 0.20;
            sCol[i * 3 + 1] = 0.70 + Math.random() * 0.20;
            sCol[i * 3 + 2] = 0.90 + Math.random() * 0.10;
        } else {
            // Rare bright sentinel star — pure cold white
            sCol[i * 3] = 1.0; sCol[i * 3 + 1] = 1.0; sCol[i * 3 + 2] = 1.0;
        }

        // Increased base rendering size dynamically to fill the void
        sSize[i] = 0.08 + Math.random() * 0.22;
    }

    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute("aColor", new THREE.BufferAttribute(sCol, 3));
    sGeo.setAttribute("size", new THREE.BufferAttribute(sSize, 1));

    const sMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            attribute float size;
            attribute vec3 aColor;
            varying vec3 vColor;
            varying float vSize;
            uniform float uTime;
            void main() {
                vColor = aColor;
                vSize  = size;
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                // Nokron stars breathe very slowly — ancient, not lively
                float pulse = 1.0 + 0.15 * sin(uTime * 1.2 + position.x * 7.3 + position.z * 4.1);
                gl_PointSize = size * (280.0 / -mvPos.z) * pulse;
                gl_Position  = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vSize;
            void main() {
                vec2  uv = gl_PointCoord.xy - 0.5;
                float r  = length(uv);
                if (r > 0.5) discard;
                float alpha;
                if (vSize > 1.4) {
                    // Bright sentinel: soft disc + faint cross spike
                    alpha = smoothstep(0.5, 0.0, r);
                    float cross = max(exp(-abs(uv.x) * 25.0), exp(-abs(uv.y) * 25.0));
                    alpha += cross * 0.35;
                } else {
                    alpha = smoothstep(0.5, 0.15, r);
                }
                gl_FragColor = vec4(vColor, alpha * 0.85);
            }
        `,
        fog: false,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
    });
    const stars = new THREE.Points(sGeo, sMat);
    group.add(stars);

    // ── 3. The Abyss Below — cold star ocean glimpsed beneath ─────
    // In Nokron you float above a black void that itself contains
    // stars. This plane is visible below the platform rim.
    const abyssMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;

            float hash2(vec2 p) {
                p = fract(p * vec2(127.34, 311.21));
                p += dot(p, p + 41.7);
                return fract(p.x * p.y);
            }
            float noise2(vec2 x) {
                vec2 i = floor(x), f = fract(x);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(hash2(i), hash2(i+vec2(1,0)), f.x),
                    mix(hash2(i+vec2(0,1)), hash2(i+vec2(1,1)), f.x), f.y
                );
            }
            float fbm2(vec2 p) {
                float v=0.0, a=0.5;
                // PERFORMANCE: Iterations knocked down 4 to 3
                for(int i=0;i<3;i++){ v+=a*noise2(p); p*=2.1; a*=0.5; }
                return v;
            }

            void main() {
                vec2  uv = vUv * 2.0 - 1.0;
                float r  = length(uv);
                float mask = smoothstep(0.95, 0.15, r);
                
                vec3 col = vec3(0.0);
                
                // PERFORMANCE BRANCH: Eradicate heavy vortex array computation if entirely hidden in alpha void
                if (mask > 0.01) {
                    float theta = atan(uv.y, uv.x);
                    float swirl = theta + r * 4.0 - uTime * 0.03;

                    float arms = pow(1.0 - abs(sin(swirl * 1.5)), 6.0);
                    float core = exp(-r * 12.0);
                    float dust = fbm2(uv * 8.0 - uTime * 0.015);

                    vec3 coreCol = vec3(0.40, 0.65, 1.00) * core * 2.5;
                    vec3 armCol  = vec3(0.05, 0.18, 0.40) * arms * dust * 1.5;
                    vec3 mistCol = vec3(0.08, 0.20, 0.35) * dust * exp(-r * 3.0) * 0.8;

                    col  = coreCol + armCol + mistCol;
                }

                gl_FragColor = vec4(col, mask * 0.85);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
    });
    const abyssPlane = new THREE.Mesh(new THREE.PlaneGeometry(500, 500, 1, 1), abyssMat);
    // Tilted and positioned far below — the star ocean floor of Nokron
    abyssPlane.position.set(0, -55, -70);
    abyssPlane.rotation.x = -Math.PI / 2.5;
    abyssPlane.rotation.z = Math.PI / 8;
    group.add(abyssPlane);

    // ── 4. Silver Mimic Tear mist — floating silver particles ─────
    // The signature of Nokron: tiny silver droplets drifting upward
    // slowly, catching the cold light like liquid starlight.
    // PERFORMANCE FIX: Nuked excessive silver teardrops down by 60%
    const MIST_COUNT = 2500;
    const mPos = new Float32Array(MIST_COUNT * 3);
    const mCol = new Float32Array(MIST_COUNT * 3);
    const mPhase = new Float32Array(MIST_COUNT); // drift phase per particle

    for (let i = 0; i < MIST_COUNT; i++) {
        // Concentrated near the platform, spreading outward
        const angle = Math.random() * Math.PI * 2;
        const rad = 2 + Math.random() * 22;
        const ht = -8 + Math.random() * 18;
        mPos[i * 3] = Math.cos(angle) * rad;
        mPos[i * 3 + 1] = ht;
        mPos[i * 3 + 2] = Math.sin(angle) * rad;

        // Silver-cyan gradient: pure silver to faint cyan
        const silver = 0.5 + Math.random() * 0.5;
        const cyan = Math.random() * 0.3;
        mCol[i * 3] = silver * 0.75;
        mCol[i * 3 + 1] = silver * 0.88 + cyan * 0.3;
        mCol[i * 3 + 2] = silver + cyan * 0.4;

        mPhase[i] = Math.random() * Math.PI * 2;
    }

    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
    mGeo.setAttribute("aColor", new THREE.BufferAttribute(mCol, 3));
    mGeo.setAttribute("aPhase", new THREE.BufferAttribute(mPhase, 1));

    const mistMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            attribute vec3  aColor;
            attribute float aPhase;
            varying   vec3  vColor;
            varying   float vAlpha;
            uniform   float uTime;
            void main() {
                vColor = aColor;
                // Drift upward slowly, oscillate horizontally
                vec3 p = position;
                float drift = mod(uTime * 0.18 + aPhase, 18.0) - 9.0;
                p.y += drift * 0.5;
                p.x += sin(uTime * 0.4 + aPhase * 3.0) * 0.3;
                p.z += cos(uTime * 0.35 + aPhase * 2.5) * 0.3;
                // Fade at top and bottom of drift range
                float t = drift / 9.0; // -1..1
                vAlpha = (1.0 - t*t) * 0.55;
                vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
                gl_PointSize = 1.5 * (120.0 / -mvPos.z);
                gl_Position  = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: `
            varying vec3  vColor;
            varying float vAlpha;
            void main() {
                vec2  uv = gl_PointCoord - 0.5;
                float r  = length(uv);
                if (r > 0.5) discard;
                float a = smoothstep(0.5, 0.0, r) * vAlpha;
                gl_FragColor = vec4(vColor, a);
            }
        `,
        fog: false,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    const mist = new THREE.Points(mGeo, mistMat);
    group.add(mist);

    // ── 5. Background star dust — deeper cold field ────────────────
    // PERFORMANCE FIX: Dropped to tightly packed minimum volume size to eliminate backbuffer overdraw
    const DUST_COUNT = 2000;
    const dPos = new Float32Array(DUST_COUNT * 3);
    const dCol = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 68 + Math.random() * 22;
        dPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        dPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        dPos[i * 3 + 2] = r * Math.cos(phi);
        // Cold: dark slate-blue dust
        const b = 0.3 + Math.random() * 0.35;
        dCol[i * 3] = b * 0.65; dCol[i * 3 + 1] = b * 0.80; dCol[i * 3 + 2] = b;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    dGeo.setAttribute("color", new THREE.BufferAttribute(dCol, 3));
    const dustMat = new THREE.PointsMaterial({
        size: 0.12, vertexColors: true, // Tweaked dot sizing to balance out less volume
        transparent: true, opacity: 0.45,
        depthWrite: false, fog: false,
        blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dGeo, dustMat);
    group.add(dust);

    // ═══════════════════════════════════════════════════════════════
    //  TICK
    // ═══════════════════════════════════════════════════════════════
    return {
        tick(t) {
            const T = t * 0.001;

            nebMat.uniforms.uTime.value = T;
            sMat.uniforms.uTime.value = T;
            abyssMat.uniforms.uTime.value = T;
            mistMat.uniforms.uTime.value = T;

            // Very slow, ancient rotations — Nokron is still, not energetic
            nebSphere.rotation.y = T * 0.0008;
            stars.rotation.y = T * 0.0015;
            dust.rotation.y = T * 0.001;
        }
    };
}