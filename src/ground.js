import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
//  UNDERGROUND STAR CITY — ANCIENT PEDESTAL
//  A ruined gothic plaza suspended in the dark: cold slate stone,
//  broken pedestal edges, silver liquid pools, and cyan stellar glows.
// ═══════════════════════════════════════════════════════════════

function hash2(x, y) {
    const d = x * 127.1 + y * 311.7;
    const n = Math.sin(d) * 43758.5453;
    return n - Math.floor(n);
}

function noise2(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const u = fx * fx * (3.0 - 2.0 * fx);
    const v = fy * fy * (3.0 - 2.0 * fy);
    const a = hash2(ix, iy), b = hash2(ix + 1, iy);
    const c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm2(x, y) {
    let val = 0, a = 0.5;
    for (let i = 0; i < 4; i++) { // Dropped 5 octaves -> 4 for CPU speed
        val += a * noise2(x, y);
        x *= 2.0; y *= 2.0; a *= 0.5;
    }
    return val;
}

export function createGround(scene) {
    const geo = new THREE.PlaneGeometry(22, 22, 280, 280);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);

        const dist2D = Math.sqrt(v.x * v.x + v.z * v.z);

        v.y = 0.0;

        const ang = Math.atan2(v.z, v.x);
        const rimNoise = (fbm2(Math.cos(ang) * 2.1 + 4.7, Math.sin(ang) * 2.1 - 1.3) - 0.5) * 0.42;

        // Optimization: Only compute fractal math aggressively on visible, flat surfaces
        const platformRadius = 5.45;
        const lipWidth = 1.15; // broad worn rim before the cliff
        const localPlatformRadius = platformRadius + rimNoise;
        const localOuterRadius = localPlatformRadius + lipWidth;

        if (dist2D < localOuterRadius) {
            // 1. Ancient Stone Irregularities — using extremely fast 2D noise processing
            const macroNoise = fbm2(v.x * 0.8, v.z * 0.8);
            const microNoise = fbm2(v.x * 3.0, v.z * 3.0);
            let stoneHeight = (macroNoise - 0.5) * 0.25 + (microNoise - 0.5) * 0.06;

            if (dist2D < localPlatformRadius) {
                // Flat center — smooth out so the board sits perfectly level
                const blend = Math.max(0, (localPlatformRadius - dist2D) / 2.2);
                v.y += stoneHeight * (1.0 - blend);
                if (v.y > -0.12) v.y = -0.12;

            } else {
                // Crumbling pedestal lip — stepped erosion and small chips
                const t = (dist2D - localPlatformRadius) / lipWidth;
                const jaggedChip = fbm2(v.x * 2.5, v.z * 2.5) * 0.18;
                const stepBreak = Math.floor(t * 5.0) * 0.035;
                v.y += stoneHeight * (1.0 - t);
                v.y -= t * 0.42 + jaggedChip * t + stepBreak;
                if (v.y > -0.12) v.y = -0.12;
            }
        } else {
            // Hard vertical cliff — drops straight down cleanly, math bypassed instantly
            const cliffDist = dist2D - localOuterRadius;
            v.y = -1.5 - cliffDist * 5.0;
        }

        pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();

    const uniforms = {
        // Cold, pale moonlight — slightly angled so it rakes across the stone surface
        u_lightDir: { value: new THREE.Vector3(0.18, 0.86, 0.46).normalize() },
        u_time: { value: 0 }
    };

    const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */`
            varying vec3 vWorldPos;
            varying vec3 vNormal;

            void main() {
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vWorldPos = wp.xyz;
                vNormal   = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * viewMatrix * wp;
            }
        `,
        fragmentShader: /* glsl */`
            uniform vec3 u_lightDir;
            uniform float u_time;
            
            varying vec3 vWorldPos;
            varying vec3 vNormal;

            float hash(vec3 p) {
                float d = dot(p, vec3(127.1, 311.7, 74.7));
                return fract(sin(d) * 43758.5453);
            }
            float noise3(vec3 p) {
                vec3 i = floor(p), f = fract(p);
                vec3 u = f*f*(3.0-2.0*f);
                float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
                float e=hash(i+vec3(0,0,1)), r=hash(i+vec3(1,0,1)), g=hash(i+vec3(0,1,1)), h=hash(i+vec3(1,1,1));
                float k0=a, k1=b-a, k2=c-a, k3=e-a, k4=a-b-c+d, k5=a-c-e+g, k6=a-b-e+r, k7=-a+b+c-d+e-r-g+h;
                return k0 + k1*u.x + k2*u.y + k3*u.z + k4*u.x*u.y + k5*u.y*u.z + k6*u.x*u.z + k7*u.x*u.y*u.z;
            }
            float fbm3(vec3 p) {
                float v=0.0, a=0.5;
                // PERFORMANCE: Dropped from 5 loops to 3 loops significantly dropping trig calls
                for(int i=0;i<3;i++){ v+=a*noise3(p); p*=2.0; a*=0.5; }
                return v;
            }

            void main() {
                vec3 N = normalize(vNormal);
                float radius = length(vWorldPos.xz);
                float upFace = smoothstep(0.55, 0.95, N.y);
                float sideFace = 1.0 - upFace;

                // ==========================================
                // 1. ANCIENT STAR-CITY STONE
                // ==========================================
                float stonePattern = fbm3(vWorldPos * 2.5);
                float darkPatches  = fbm3(vWorldPos * 0.8 + vec3(10.0));
                
                // Deep blue-black slate, with restrained cold highlights.
                vec3 baseStone  = vec3(0.018, 0.026, 0.045);
                vec3 midStone   = vec3(0.045, 0.060, 0.090);
                vec3 lightStone = vec3(0.105, 0.125, 0.165);
                vec3 stoneColor = mix(baseStone, midStone, stonePattern);
                stoneColor = mix(stoneColor, lightStone, smoothstep(0.72, 1.0, stonePattern) * 0.55);
                // Dark moss / ancient grime patches
                stoneColor = mix(stoneColor * 0.32, stoneColor, clamp(darkPatches + 0.22, 0.0, 1.0));

                // Vertical cliff strata and rain-like erosion streaks on the pedestal wall.
                float sideAngle = atan(vWorldPos.z, vWorldPos.x);
                float strata = smoothstep(0.56, 0.92, abs(sin(vWorldPos.y * 10.5 + fbm3(vec3(sideAngle * 2.0, radius, 0.0)) * 2.4)));
                float erosion = smoothstep(0.68, 0.96, fbm3(vec3(sideAngle * 5.5, vWorldPos.y * 1.8, radius * 0.18)));
                stoneColor *= 1.0 - sideFace * (strata * 0.22 + erosion * 0.28);
                stoneColor += vec3(0.025, 0.06, 0.09) * sideFace * erosion * 0.25;

                // Wet, ancient stone gradient: darker toward the broken rim and slightly polished near the board.
                float wetRim = smoothstep(4.35, 6.35, radius) * upFace;
                float wetInner = (1.0 - smoothstep(2.0, 3.35, radius)) * upFace;
                stoneColor = mix(stoneColor, stoneColor * vec3(0.56, 0.66, 0.86), wetRim * 0.42);
                stoneColor = mix(stoneColor, stoneColor * vec3(0.82, 0.90, 1.05), wetInner * 0.10);

                // Ancient carved channels: broken circular grooves plus radial seams.
                float ringInner = 1.0 - smoothstep(0.018, 0.060, abs(radius - 3.30));
                float ringMid   = 1.0 - smoothstep(0.020, 0.070, abs(radius - 4.55));
                float ringOuter = 1.0 - smoothstep(0.025, 0.085, abs(radius - 5.55));
                float ringBreak = fbm3(vec3(vWorldPos.xz * 1.15, 2.0));
                float carvedRings = (ringInner * 0.35 + ringMid * 0.55 + ringOuter * 0.85) * smoothstep(0.18, 0.72, ringBreak);

                float angle = atan(vWorldPos.z, vWorldPos.x);
                float radialSeam = smoothstep(0.985, 1.0, abs(sin(angle * 18.0 + ringBreak * 1.3)))
                                 * smoothstep(2.6, 4.2, radius)
                                 * (1.0 - smoothstep(6.1, 6.7, radius));
                stoneColor *= 1.0 - clamp(carvedRings * 0.42 + radialSeam * 0.18, 0.0, 0.5);

                // ==========================================
                // 2. SILVER TEAR POOLS (Mimic Tear liquid)
                // ==========================================
                float poolDepth = clamp((-vWorldPos.y - 0.27) * 10.0, 0.0, 1.0);
                float isUpward  = smoothstep(0.7, 1.0, N.y);
                
                float poolMask  = 0.0;
                vec3 silverColor = vec3(0.0);
                
                // PERFORMANCE BRANCH: Completely skip heavy liquid liquidRipple logic if not inside a physical pool
                if (poolDepth > 0.0 && isUpward > 0.5) {
                    float liquidRipple = fbm3(vWorldPos * 4.0 + vec3(0.0, -u_time * 0.2, u_time * 0.1));
                    silverColor = mix(vec3(0.34, 0.46, 0.62), vec3(0.74, 0.88, 1.0), liquidRipple);
                    poolMask = poolDepth * isUpward * smoothstep(0.04, 0.23, liquidRipple + poolDepth * 0.48);
                }
                float silverChannel = (carvedRings * 0.32 + radialSeam * 0.16)
                                    * smoothstep(0.46, 0.78, ringBreak)
                                    * upFace
                                    * (1.0 - smoothstep(6.25, 6.85, radius));
                poolMask = clamp(poolMask + silverChannel * 0.34, 0.0, 1.0);

                vec3 albedo = mix(stoneColor, silverColor, poolMask);

                // Soft contact stain around the chess-board footprint, so the board feels seated into the stone.
                float rectDist = max(abs(vWorldPos.x) / 2.22, abs(vWorldPos.z) / 2.22);
                float contactShadow = smoothstep(0.88, 1.0, rectDist) * (1.0 - smoothstep(1.0, 1.28, rectDist)) * upFace;
                albedo *= 1.0 - contactShadow * 0.38;

                // ==========================================
                // 3. ETHEREAL STELLAR GLOW
                // ==========================================
                float edgeGlowMask = 0.0;
                float fissureMask = 0.0;
                // PERFORMANCE BRANCH: Sky glow purely isolates to the top faces directly tracking edge lines
                if (isUpward > 0.5 && radius > 4.5 && poolMask < 0.1) {
                    float edgeGlowNoise = fbm3(vWorldPos * 6.0);
                    float rimFalloff = smoothstep(4.5, 6.6, radius);
                    edgeGlowMask  = smoothstep(0.62, 0.88, edgeGlowNoise) * isUpward * rimFalloff;
                    float fissureNoise = fbm3(vec3(vWorldPos.x * 2.2, radius * 0.8, vWorldPos.z * 2.2) + vec3(6.0, 0.0, 2.5));
                    fissureMask = smoothstep(0.78, 0.94, fissureNoise) * rimFalloff * (ringOuter * 0.7 + radialSeam * 0.45 + 0.12);
                }
                
                vec3 etherealGlow = vec3(0.06, 0.48, 0.72) * 0.82; 
                
                // Tiny embedded star sparks in the stone
                float starNoise   = hash(floor(vWorldPos * 42.0));
                float starMask    = 0.0;
                
                // PERFORMANCE BRANCH: Kill trig star calculations when out of noise bounds
                if (starNoise > 0.9975 && poolMask < 0.15 && radius > 3.4) {
                    float starFlicker = sin(u_time * 2.0 + hash(vWorldPos) * 10.0) * 0.5 + 0.5;
                    starMask = starFlicker * clamp(carvedRings * 1.4 + radialSeam * 0.8 + wetRim * 0.2, 0.0, 1.0);
                }
                vec3 starGlow     = vec3(0.48, 0.70, 1.0) * 0.72;

                // ==========================================
                // 4. LIGHTING
                // ==========================================
                vec3 V = normalize(vec3(0.0, 20.0, 10.0) - vWorldPos);
                vec3 H = normalize(u_lightDir + V);

                float diff = max(dot(N, u_lightDir), 0.0);

                // FIX: Much lower ambient (was 0.15 — too bright, washing out the stone)
                // Use a cold blue-tinted ambient to sell the underground Nokron atmosphere
                // instead of neutral white
                float ambientStrength = 0.045;
                vec3  ambientColor    = vec3(0.20, 0.32, 0.58); // Cold stellar blue ambient
                vec3  ambient         = ambientColor * ambientStrength;

                // FIX: Cold blue-tinted diffuse (was pure white)
                vec3 lightColor = vec3(0.52, 0.70, 1.0); // Pale cold moonlight

                float specPower     = mix(12.0, 80.0, poolMask);
                float specIntensity = mix(0.03, 0.7, poolMask);
                float spec = pow(max(dot(N, H), 0.0), specPower) * specIntensity;

                vec3 finalColor = albedo * (lightColor * diff + ambient) + vec3(spec);
                
                // Emissive: ethereal edge glow + star sparks
                finalColor += etherealGlow * edgeGlowMask * (1.0 - poolMask) * 0.72;
                finalColor += vec3(0.03, 0.36, 0.62) * fissureMask * (1.0 - poolMask) * 0.55;
                finalColor += starGlow * starMask;

                // Keep the broken cliff from reading as bright ice; the platform should fall into black stone.
                float rimDarken = 1.0 - smoothstep(5.35, 6.85, radius) * 0.48;
                finalColor *= rimDarken;

                // Fade to absolute black abyss at the broken edges
                float abyssFade = smoothstep(8.2, 5.65, radius);
                finalColor *= abyssFade;

                gl_FragColor = vec4(finalColor, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -0.15;
    mesh.receiveShadow = true;

    mesh.onBeforeRender = () => {
        // PERFORMANCE OPTIMIZATION: Only update time if window._isGameActive is true
        // This prevents the heavy ground shader from animating when idle
        if (window._isGameActive !== false) {
            uniforms.u_time.value = performance.now() * 0.001;
        }
    };

    scene.add(mesh);

    const mistGeo = new THREE.RingGeometry(5.2, 7.7, 160, 1);
    const mistMat = new THREE.ShaderMaterial({
        uniforms: { u_time: uniforms.u_time },
        vertexShader: /* glsl */`
            varying vec2 vUv;
            varying vec3 vWorldPos;
            void main() {
                vUv = uv;
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vWorldPos = wp.xyz;
                gl_Position = projectionMatrix * viewMatrix * wp;
            }
        `,
        fragmentShader: /* glsl */`
            uniform float u_time;
            varying vec2 vUv;
            varying vec3 vWorldPos;

            float hash(vec2 p) {
                p = fract(p * vec2(127.1, 311.7));
                p += dot(p, p + 34.7);
                return fract(p.x * p.y);
            }
            float noise(vec2 x) {
                vec2 i = floor(x), f = fract(x);
                f = f*f*(3.0-2.0*f);
                return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
                           mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
            }

            void main() {
                float radius = length(vWorldPos.xz);
                float ring = smoothstep(5.25, 6.0, radius) * (1.0 - smoothstep(7.05, 7.75, radius));
                float drift = noise(vWorldPos.xz * 0.48 + vec2(u_time * 0.035, -u_time * 0.022));
                float alpha = ring * smoothstep(0.18, 0.88, drift) * 0.18;
                vec3 color = mix(vec3(0.02, 0.10, 0.16), vec3(0.08, 0.38, 0.52), drift);
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });
    const rimMist = new THREE.Mesh(mistGeo, mistMat);
    rimMist.rotation.x = -Math.PI / 2;
    rimMist.position.y = -0.18;
    scene.add(rimMist);

    return mesh;
}
