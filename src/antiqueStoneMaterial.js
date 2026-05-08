import * as THREE from 'three';

const _materials = new Set();

export function getAntiqueStoneMaterial(style = 'demon') {
    const mat = createAntiqueStoneMaterial(style);
    _materials.add(mat);
    return mat;
}

export function updateAntiqueStoneMaterials(camera) {
    _materials.forEach(mat => {
        if (mat.isShaderMaterial) {
            mat.uniforms.u_cameraPos.value.copy(camera.position);
        }
    });
}

function createAntiqueStoneMaterial(style) {
    const isNokron = style === 'nokron';

    // ── Palette registry — add new styles here ──────────────────
    // Each entry: [dark, mid, bright] as THREE.Color
    const PALETTES = {
        angel: { dark: [0.550, 0.600, 0.650], mid: [0.850, 0.900, 0.950], bright: [0.950, 1.000, 1.000] },
        demon: { dark: [0.008, 0.012, 0.022], mid: [0.025, 0.050, 0.095], bright: [0.080, 0.160, 0.280] },
        nokron: { dark: [0.025, 0.030, 0.035], mid: [0.396, 0.435, 0.420], bright: [0.792, 0.870, 0.840] },
        northmen: { dark: [0.020, 0.030, 0.050], mid: [0.100, 0.130, 0.180], bright: [0.250, 0.300, 0.380] },
        erdtree: { dark: [0.120, 0.080, 0.020], mid: [0.500, 0.350, 0.100], bright: [0.850, 0.650, 0.250] },
        cthulhu: { dark: [0.010, 0.040, 0.030], mid: [0.040, 0.140, 0.100], bright: [0.120, 0.320, 0.220] },
        stone_white: { dark: [0.700, 0.700, 0.700], mid: [0.900, 0.900, 0.900], bright: [1.000, 1.000, 1.000] },
        stone_black: { dark: [0.005, 0.005, 0.008], mid: [0.030, 0.030, 0.035], bright: [0.100, 0.100, 0.110] },
    };

    const p = PALETTES[style] || PALETTES.angel;

    return new THREE.ShaderMaterial({
        uniforms: {
            u_dark: { value: new THREE.Color(...p.dark) },
            u_mid: { value: new THREE.Color(...p.mid) },
            u_bright: { value: new THREE.Color(...p.bright) },

            u_lightDir: { value: new THREE.Vector3(-4, 14, 0).normalize() },
            u_lightDir2: { value: new THREE.Vector3(4, 14, 0).normalize() },
            u_cameraPos: { value: new THREE.Vector3() },
        },

        vertexShader: /* glsl */`
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            void main() {
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPos   = worldPos.xyz;
                vNormal     = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,

        fragmentShader: /* glsl */`
            ${isNokron ? '#define IS_NOKRON 1' : ''}
            uniform vec3 u_dark;
            uniform vec3 u_mid;
            uniform vec3 u_bright;
            uniform vec3 u_lightDir;
            uniform vec3 u_lightDir2;
            uniform vec3 u_cameraPos;

            varying vec3 vNormal;
            varying vec3 vWorldPos;

            vec3 colorRamp(float t) {
                if (t < 0.3)      return mix(u_dark,   u_mid,         t / 0.3);
                else if (t < 0.7) return mix(u_mid,    u_bright,      (t - 0.3) / 0.4);
                else              return mix(u_bright,  u_bright * 1.5,(t - 0.7) / 0.3);
            }

            #ifdef IS_NOKRON
            float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
            float noise(vec2 p){
                vec2 i=floor(p), f=fract(p);
                f=f*f*(3.0-2.0*f);
                return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                           mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
            }
            float fbm(vec2 p){
                float v=0.0, a=0.5;
                for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.1; a*=0.5; }
                return v;
            }
            #endif

            void main() {
                vec3 N = normalize(vNormal);

                #ifdef IS_NOKRON
                {
                    // ── Nokron Atmospheric Stone ───────────────────────
                    vec2 wp = vWorldPos.xz + vWorldPos.y * 0.5;
                    float g1 = fbm(wp * 3.0 + vec2(1.2, 0.7));
                    float g2 = fbm(wp * 7.5 + vec2(3.1, 2.4));

                    // Use uniforms — driven by palette above
                    vec3 col = mix(u_dark, u_mid, g1 * 0.7);
                    col = mix(col, u_bright, g2 * 0.4);

                    float d1  = max(dot(N, u_lightDir),  0.0);
                    float d2  = max(dot(N, u_lightDir2), 0.0) * 0.25;
                    float amb = 0.18;
                    float lit = amb + d1 * 0.78 + d2;

                    vec3 color = col * lit;

                    // Wet stone specular — icy cyan gleam
                    vec3 V      = normalize(u_cameraPos - vWorldPos);
                    vec3 H      = normalize(u_lightDir + V);
                    float spec  = pow(max(dot(N, H), 0.0), 72.0) * 0.28;
                    color += spec * vec3(0.55, 0.80, 1.0);

                    // Faint starlight emissive in crevices (low fbm areas = deep cracks)
                    float crevice = smoothstep(0.55, 0.30, g1);
                    color += crevice * vec3(0.02, 0.06, 0.14) * 0.4;

                    // Outward atmospheric darkening — melts into the abyss
                    vec2 normalXZ    = normalize(N.xz + vec2(0.001));
                    vec2 centerDirXZ = normalize(vWorldPos.xz + vec2(0.001));
                    float outwardness      = dot(normalXZ, centerDirXZ);
                    float outwardDarkening = smoothstep(0.1, 0.8, outwardness);
                    color = mix(color, vec3(0.008, 0.015, 0.04), outwardDarkening * 0.65);

                    gl_FragColor = vec4(color, 1.0);
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                    return;
                }
                #endif

                // ── Generic (Demon / Angel) ────────────────────────────
                vec3 V = normalize(u_cameraPos - vWorldPos);

                float lightMix = max(dot(N, u_lightDir),  0.0) * 0.70
                               + max(dot(N, u_lightDir2), 0.0) * 0.30;
                float fresnel   = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 2.0);
                float intensity = clamp(lightMix * 0.85 + fresnel * 0.15, 0.0, 1.0);

                vec3 baseColor = colorRamp(intensity);
                float diff     = lightMix + 0.15;

                vec3  H    = normalize(u_lightDir + V);
                float spec = pow(max(dot(N, H), 0.0), 32.0) * 0.35;

                vec3 finalColor = baseColor * diff + spec;

                gl_FragColor = vec4(finalColor, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `,
        side: THREE.FrontSide,
    });
}