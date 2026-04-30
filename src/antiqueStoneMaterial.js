import * as THREE from 'three';

const _cache = {};

export function getAntiqueStoneMaterial(style = 'demon') {
    if (!_cache[style]) _cache[style] = createAntiqueStoneMaterial(style);
    return _cache[style];
}

export function updateAntiqueStoneMaterials(camera) {
    Object.values(_cache).forEach(mat => {
        mat.uniforms.u_cameraPos.value.copy(camera.position);
    });
}

function createAntiqueStoneMaterial(style) {
    const isDemon = style === 'demon';
    return new THREE.ShaderMaterial({
        uniforms: {
            // ── Demon: near-black crevices → dark bronze → warm gold tips
            // ── Angel: near-black crevices → pewter → bright silver tips
            u_dark: {
                value: isDemon
                    ? new THREE.Color(0.04, 0.02, 0.005) // deep warm brown
                    : new THREE.Color(0.02, 0.02, 0.03) // deep grey
            },
            u_mid: {
                value: isDemon
                    ? new THREE.Color(0.35, 0.20, 0.05) // bronze mid
                    : new THREE.Color(0.25, 0.28, 0.32) // pewter mid
            },
            u_bright: {
                value: isDemon
                    ? new THREE.Color(0.85, 0.55, 0.15) // gold bright
                    : new THREE.Color(0.75, 0.82, 0.95) // brilliant silver
            },

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
                // Transform normal to world space (assuming uniform scale)
                vNormal     = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,

        fragmentShader: /* glsl */`
            uniform vec3 u_dark;
            uniform vec3 u_mid;
            uniform vec3 u_bright;
            uniform vec3 u_lightDir;
            uniform vec3 u_lightDir2;
            uniform vec3 u_cameraPos;

            varying vec3 vNormal;
            varying vec3 vWorldPos;

            vec3 colorRamp(float t) {
                // Drop sharply into u_dark in the shadows (t < 0.3)
                if (t < 0.3)       return mix(u_dark,   u_mid,    t / 0.3);
                else if (t < 0.7)  return mix(u_mid,    u_bright, (t - 0.3) / 0.4);
                else               return mix(u_bright,  u_bright * 1.5, (t - 0.7) / 0.3);
            }

            void main() {
                vec3 N = normalize(vNormal);
                vec3 V = normalize(u_cameraPos - vWorldPos);

                // Diffuse light intensity from both directional lights
                float lightMix = max(dot(N, u_lightDir),  0.0) * 0.70
                               + max(dot(N, u_lightDir2), 0.0) * 0.30;

                // Fresnel edge detection
                float fresnel = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 2.0);

                // Intensity heavily favors light direction to create deep shadows on the back
                float intensity = lightMix * 0.85 + fresnel * 0.15;
                intensity = clamp(intensity, 0.0, 1.0);

                vec3 baseColor = colorRamp(intensity);

                // Combine diffuse lighting with a very low ambient floor so shadows are deep
                float diff = lightMix + 0.15;

                // Sharp metallic specular highlight
                vec3  H    = normalize(u_lightDir + V);
                float spec = pow(max(dot(N, H), 0.0), 32.0) * 0.35;

                vec3 color = baseColor * diff + spec;
                gl_FragColor = vec4(color, 1.0);

                // Apply Three.js native Scene ToneMapping & ColorSpace
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `,
        side: THREE.DoubleSide,
    });
}