import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
//  DARK COSMOS BACKGROUND
//  Deep space skybox with twinkling stars, procedural planets,
//  and drifting asteroids placed far from the board.
// ═══════════════════════════════════════════════════════════════

export function createGalaxyBackground(scene) {

    const group = new THREE.Group();
    scene.add(group);

    // ── 1. Deep-space nebula sky sphere ───────────────────────────
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
                    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z
                );
            }
            float fbm(vec3 p) {
                float v = 0.0, a = 0.5;
                for (int i = 0; i < 3; i++) {
                    v += a * noise(p);
                    p *= 2.0;
                    a *= 0.5;
                }
                return v;
            }

            void main(){
                vec3 n = normalize(vPos);

                // Add procedural Milky Way equator band with slight slant
                vec3 slant = normalize(vec3(0.3, 1.0, 0.1));
                float equator = dot(n, slant);
                // Dense glowing band at the center, tapering off
                float band = smoothstep(0.3, 0.0, abs(equator)); 
                
                // Add extreme procedural dust density inside the band
                float dustNoise = fbm(n * 12.0 + vec3(uTime*0.001));
                float structuralNoise = fbm(n * 4.0 - vec3(uTime*0.0005));
                float mw = band * ((dustNoise * 1.5) + (structuralNoise * 0.5));
                
                // Colors: deep dark gold/brown at the core, icy blue at the edges
                vec3 coreColor = vec3(1.0, 0.6, 0.3) * mw * smoothstep(0.08, 0.0, abs(equator)) * 0.8;
                vec3 edgeColor = vec3(0.5, 0.6, 0.9) * band * dustNoise * 0.5;
                
                // Dark light-absorbing dust lanes overlapping the center
                float darkLanes = smoothstep(0.35, 0.65, fbm(n * 15.0 + vec3(0.5, 0.2, 0.0)));
                vec3 col = (coreColor + edgeColor) * (1.0 - darkLanes*0.8);
                
                // Subtle ambient ash dust outside the band
                float neb2 = fbm(n * 5.5 + vec3(-0.8, 0.3, 0.9));
                vec3 ashDust = vec3(0.08, 0.09, 0.10) * neb2 * (1.0 - band);

                // Solid space backdrop (pure pitch black, extreme contrast)
                vec3 baseSpace = vec3(0.00, 0.00, 0.002);

                gl_FragColor = vec4(baseSpace + col + ashDust, 1.0);
            }
        `,
        transparent: false,
        fog: false,
        depthWrite: false,
        side: THREE.BackSide,
    });
    const nebSphere = new THREE.Mesh(new THREE.SphereGeometry(250, 48, 48), nebMat);
    group.add(nebSphere);

    // ── 2. Stars — layered: dim field + bright twinklers ─────────
    const STAR_COUNT = 15000;
    const BRIGHT_COUNT = 800;
    const sPos = new Float32Array(STAR_COUNT * 3);
    const sCol = new Float32Array(STAR_COUNT * 3);
    const sSize = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 50 + Math.random() * 30;
        sPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        sPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        sPos[i * 3 + 2] = r * Math.cos(phi);

        const type = Math.random();
        if (type < 0.35) {
            sCol[i * 3] = 0.9 + Math.random() * 0.1; sCol[i * 3 + 1] = 0.9 + Math.random() * 0.1; sCol[i * 3 + 2] = 1.0;
        } else if (type < 0.60) {
            sCol[i * 3] = 0.75 + Math.random() * 0.15; sCol[i * 3 + 1] = 0.80 + Math.random() * 0.15; sCol[i * 3 + 2] = 0.85 + Math.random() * 0.15;
        } else if (type < 0.75) {
            sCol[i * 3] = 0.8; sCol[i * 3 + 1] = 0.85 + Math.random() * 0.1; sCol[i * 3 + 2] = 1.0;
        } else {
            sCol[i * 3] = 1.0; sCol[i * 3 + 1] = 1.0; sCol[i * 3 + 2] = 1.0;
        }

        sSize[i] = i < BRIGHT_COUNT ? 2.0 + Math.random() * 3.0 : 0.06 + Math.random() * 0.15;
    }

    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
    sGeo.setAttribute("size", new THREE.BufferAttribute(sSize, 1));

    const sMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vSize;
            uniform float uTime;
            void main() {
                vColor = color;
                vSize = size;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                // Make bright stars twinkle slightly
                float pulse = 1.0 + 0.3 * sin(uTime * 3.0 + position.x * 10.0);
                gl_PointSize = size * (300.0 / -mvPosition.z) * pulse;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vSize;
            void main() {
                vec2 uv = gl_PointCoord.xy - 0.5;
                float r = length(uv);
                if(r > 0.5) discard;
                float alpha = 1.0;
                if(vSize > 1.5) {
                    alpha = smoothstep(0.5, 0.0, r);
                    float cross = max(exp(-abs(uv.x) * 20.0), exp(-abs(uv.y) * 20.0));
                    alpha += cross * 0.5;
                } else {
                    alpha = smoothstep(0.5, 0.2, r);
                }
                gl_FragColor = vec4(vColor, alpha * 0.8);
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

    // ── 3. Colossal Spiral Galaxy Underneath ──────────────────────────
    const spiralGeo = new THREE.PlaneGeometry(600, 600, 1, 1);
    const spiralMat = new THREE.ShaderMaterial({
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
            
            float hash(vec2 p) {
                p = fract(p * vec2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }
            float noise(vec2 x) {
                vec2 i = floor(x);
                vec2 f = fract(x);
                f = f * f * (3.0 - 2.0 * f);
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            float fbm(vec2 p) {
                float v = 0.0, add = 0.5;
                for (int i = 0; i < 3; i++) {
                    v += add * noise(p);
                    p *= 2.0;
                    add *= 0.5;
                }
                return v;
            }

            void main() {
                vec2 uv = vUv * 2.0 - 1.0;
                float r = length(uv);
                float theta = atan(uv.y, uv.x);
                
                // Spiral warp equation
                float swirl = theta + r * 6.5 - uTime * 0.10;
                
                // Two main spiral arms
                float arms = abs(sin(swirl));
                arms = pow(1.0 - arms, 5.0); // thin out arms
                
                // Dense central core
                float core = exp(-r * 15.0); // exceptionally bright tight core
                
                // Dense procedural dust cloud
                float dust = fbm(uv * 12.0 - uTime * 0.05);
                
                // Colors: Deep blue/white galaxy core
                vec3 coreColor = vec3(0.9, 0.95, 1.0) * core * 3.0;
                vec3 armColor = vec3(0.2, 0.4, 0.9) * arms * dust * 2.0;
                vec3 dustBelt = vec3(0.8, 0.4, 0.1) * dust * exp(-r * 4.0) * 0.6; // inner brown dust
                
                vec3 col = coreColor + armColor + dustBelt;
                
                // Distant void masking (soft circular clipping)
                float mask = smoothstep(0.9, 0.2, r);
                
                // Additive blend alpha map
                gl_FragColor = vec4(col, mask);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        side: THREE.BackSide
    });
    const spiralPlane = new THREE.Mesh(spiralGeo, spiralMat);
    // Positioned just beneath the horizon plane so it is permanently visible beneath the board
    spiralPlane.position.set(0, -60, -90);
    // Tilted gracefully so it stretches beneath the playable area deep into the skybox
    spiralPlane.rotation.x = -Math.PI / 2.3;
    spiralPlane.rotation.z = Math.PI / 6;
    group.add(spiralPlane);

    // Asteroids removed entirely per user request

    // ── 5. Distant star cluster (dense background dust) ──────────
    const dustCount = 4500;
    const dPos = new Float32Array(dustCount * 3);
    const dCol = new Float32Array(dustCount * 3);
    const dSize = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 70 + Math.random() * 20;
        dPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        dPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        dPos[i * 3 + 2] = r * Math.cos(phi);
        const b = 0.4 + Math.random() * 0.3;
        dCol[i * 3] = b * 0.8; dCol[i * 3 + 1] = b * 0.85; dCol[i * 3 + 2] = b;
        dSize[i] = 0.03 + Math.random() * 0.06;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    dGeo.setAttribute("color", new THREE.BufferAttribute(dCol, 3));
    const dustMat = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dGeo, dustMat);
    group.add(dust);

    // ═══════════════════════════════════════════════════════════════
    //  TICK — called every frame
    // ═══════════════════════════════════════════════════════════════
    return {
        tick(t) {
            const T = t * 0.001;

            // Nebula + stars
            nebMat.uniforms.uTime.value = T;
            sMat.uniforms.uTime.value = T;
            stars.rotation.y = T * 0.002;
            nebSphere.rotation.y = T * 0.001;
            dust.rotation.y = T * 0.0015;

            // Asteroids animation logic removed

            // Massive spiral galaxy spinning
            spiralMat.uniforms.uTime.value = T;
        }
    };
}