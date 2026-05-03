import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
//  NOKRON, THE ETERNAL CITY
//  An ancient, ruined gothic plaza suspended in the dark.
//  Features: Cold slate stone, crumbling edges, pools of shimmering 
//  silver liquid (mimic tear), and ethereal cyan/stellar glows.
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

export function createMoonGround(scene) {
    const geo = new THREE.PlaneGeometry(22, 22, 280, 280);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);

        const dist2D = Math.sqrt(v.x * v.x + v.z * v.z);

        v.y = 0.0;

        // Optimization: Only compute fractal math aggressively on visible, flat surfaces
        const platformRadius = 5.8;
        const lipWidth = 0.9; // crumbling lip before the cliff

        if (dist2D < platformRadius + lipWidth) {
            // 1. Ancient Stone Irregularities — using extremely fast 2D noise processing
            const macroNoise = fbm2(v.x * 0.8, v.z * 0.8);
            const microNoise = fbm2(v.x * 3.0, v.z * 3.0);
            let stoneHeight = (macroNoise - 0.5) * 0.25 + (microNoise - 0.5) * 0.06;

            if (dist2D < platformRadius) {
                // Flat center — smooth out so the board sits perfectly level
                const blend = Math.max(0, (platformRadius - dist2D) / 2.0);
                v.y += stoneHeight * (1.0 - blend);
                if (v.y > -0.12) v.y = -0.12;

            } else {
                // Crumbling stone lip — gentle tilt + small chips
                const t = (dist2D - platformRadius) / lipWidth;
                const jaggedChip = fbm2(v.x * 2.5, v.z * 2.5) * 0.18;
                v.y += stoneHeight * (1.0 - t);
                v.y -= t * 0.35 + jaggedChip * t;
                if (v.y > -0.12) v.y = -0.12;
            }
        } else {
            // Hard vertical cliff — drops straight down cleanly, math bypassed instantly
            const cliffDist = dist2D - (platformRadius + lipWidth);
            v.y = -1.5 - cliffDist * 5.0;
        }

        pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();

    const uniforms = {
        // Cold, pale moonlight — slightly angled so it rakes across the stone surface
        u_lightDir: { value: new THREE.Vector3(0.3, 0.8, 0.4).normalize() },
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

                // ==========================================
                // 1. ANCIENT NOKRON STONE
                // ==========================================
                float stonePattern = fbm3(vWorldPos * 2.5);
                float darkPatches  = fbm3(vWorldPos * 0.8 + vec3(10.0));
                
                // FIX: Much darker base — genuine deep slate blue, not grey
                // Was: baseStone(0.08,0.10,0.14), lightStone(0.18,0.22,0.28) — too close to white under lighting
                vec3 baseStone  = vec3(0.035, 0.045, 0.07);  // Near-black blue slate
                vec3 lightStone = vec3(0.09,  0.11,  0.16);  // Cold pale highlight, still dark
                vec3 stoneColor = mix(baseStone, lightStone, stonePattern);
                // Dark moss / ancient grime patches
                stoneColor = mix(stoneColor * 0.4, stoneColor, clamp(darkPatches + 0.2, 0.0, 1.0));

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
                    silverColor = mix(vec3(0.45, 0.55, 0.70), vec3(0.75, 0.85, 1.0), liquidRipple);
                    poolMask = poolDepth * isUpward * smoothstep(0.05, 0.25, liquidRipple + poolDepth * 0.5);
                }

                vec3 albedo = mix(stoneColor, silverColor, poolMask);

                // ==========================================
                // 3. ETHEREAL STELLAR GLOW
                // ==========================================
                float edgeGlowMask = 0.0;
                // PERFORMANCE BRANCH: Sky glow purely isolates to the top faces directly tracking edge lines
                if (isUpward > 0.5 && radius > 4.5 && poolMask < 0.1) {
                    float edgeGlowNoise = fbm3(vWorldPos * 6.0);
                    edgeGlowMask  = smoothstep(0.62, 0.88, edgeGlowNoise) * isUpward;
                }
                
                vec3 etherealGlow = vec3(0.1, 0.55, 0.75) * 0.9; 
                
                // Tiny embedded star sparks in the stone
                float starNoise   = hash(floor(vWorldPos * 50.0));
                float starMask    = 0.0;
                
                // PERFORMANCE BRANCH: Kill trig star calculations when out of noise bounds
                if (starNoise > 0.985 && poolMask == 0.0) {
                    float starFlicker = sin(u_time * 2.0 + hash(vWorldPos) * 10.0) * 0.5 + 0.5;
                    starMask = starFlicker;
                }
                vec3 starGlow     = vec3(0.6, 0.75, 1.0) * 1.5;

                // ==========================================
                // 4. LIGHTING
                // ==========================================
                vec3 V = normalize(vec3(0.0, 20.0, 10.0) - vWorldPos);
                vec3 H = normalize(u_lightDir + V);

                float diff = max(dot(N, u_lightDir), 0.0);

                // FIX: Much lower ambient (was 0.15 — too bright, washing out the stone)
                // Use a cold blue-tinted ambient to sell the underground Nokron atmosphere
                // instead of neutral white
                float ambientStrength = 0.05;
                vec3  ambientColor    = vec3(0.25, 0.35, 0.55); // Cold stellar blue ambient
                vec3  ambient         = ambientColor * ambientStrength;

                // FIX: Cold blue-tinted diffuse (was pure white)
                vec3 lightColor = vec3(0.6, 0.75, 1.0); // Pale cold moonlight

                float specPower     = mix(12.0, 80.0, poolMask);
                float specIntensity = mix(0.03, 0.7, poolMask);
                float spec = pow(max(dot(N, H), 0.0), specPower) * specIntensity;

                vec3 finalColor = albedo * (lightColor * diff + ambient) + vec3(spec);
                
                // Emissive: ethereal edge glow + star sparks
                finalColor += etherealGlow * edgeGlowMask * (1.0 - poolMask) * 0.6;
                finalColor += starGlow * starMask;

                // Fade to absolute black abyss at the broken edges
                float abyssFade = smoothstep(8.5, 5.8, radius);
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
        uniforms.u_time.value = performance.now() * 0.001;
    };

    scene.add(mesh);
    return mesh;
}