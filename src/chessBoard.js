import * as THREE from "three";
import { SZ, OFF } from "./constants.js";

// ═══════════════════════════════════════════════════════════════
//  PROCEDURAL CHESS BOARD
//  Marble tiles + antique stone base — zero asset loading
// ═══════════════════════════════════════════════════════════════

const TILE_H = 0.08;    // tile thickness
const BASE_H = 0.16;    // pedestal height
const BOARD_SIZE = SZ * 8;
const BORDER = SZ * 0.25; // reduced border to fit within ruins cleanly

// ── Marble tile shader ────────────────────────────────────────
function createMarbleMaterial(isDark) {
    return new THREE.ShaderMaterial({
        uniforms: {
            u_dark: {
                value: isDark
                    ? new THREE.Color(0.04, 0.02, 0.01)   // demon: deeper black
                    : new THREE.Color(0.65, 0.70, 0.82)   // angel: silver-pearl
            },
            u_mid: {
                value: isDark
                    ? new THREE.Color(0.25, 0.14, 0.03)   // demon: bronze
                    : new THREE.Color(0.85, 0.88, 0.95)   // angel: bright silver
            },
            u_vein: {
                value: isDark
                    ? new THREE.Color(0.85, 0.55, 0.08)   // demon: vibrant gold vein
                    : new THREE.Color(0.45, 0.52, 0.65)   // angel: cool grey vein
            },
            u_offset: { value: new THREE.Vector2(Math.random() * 10, Math.random() * 10) },
            u_lightDir: { value: new THREE.Vector3(-0.4, 1.0, 0.4).normalize() },
        },
        vertexShader: /* glsl */`
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            varying vec2 vUv;
            void main() {
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vWorldPos = wp.xyz;
                vNormal   = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                vUv       = uv;
                gl_Position = projectionMatrix * viewMatrix * wp;
            }
        `,
        fragmentShader: /* glsl */`
            uniform vec3  u_dark, u_mid, u_vein;
            uniform vec2  u_offset;
            uniform vec3  u_lightDir;
            varying vec3  vNormal, vWorldPos;
            varying vec2  vUv;

            float hash(vec2 p) {
                p = fract(p * vec2(127.1, 311.7));
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            float noise(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                f = f*f*(3.0-2.0*f);
                return mix(
                    mix(hash(i), hash(i+vec2(1,0)), f.x),
                    mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y
                );
            }
            float fbm(vec2 p) {
                float v = 0.0, a = 0.5;
                for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.1; a*=0.5; }
                return v;
            }

            void main() {
                vec2 uv = vUv * 3.0 + u_offset;

                // Marble veins — warped fbm
                float warp = fbm(uv * 1.2);
                float vein = abs(sin((uv.x + uv.y * 0.6 + warp * 2.2) * 5.0));
                vein = pow(1.0 - vein, 4.0); // sharp thin veins

                // Base marble gradient
                float grain = fbm(uv * 2.5 + vec2(3.7, 1.2));
                float t = grain * 0.7 + vein * 0.3;
                vec3 marble = mix(u_dark, u_mid, clamp(t, 0.0, 1.0));

                // Vein color overlay
                marble = mix(marble, u_vein, vein * 0.65);

                // Lighting
                float diff = max(dot(normalize(vNormal), u_lightDir), 0.0) * 0.8 + 0.2;

                // Softened specular highlight to prevent harsh triangle artifacts on large quads
                vec3 V = normalize(vec3(0.0, 12.0, 6.0) - vWorldPos);
                vec3 H = normalize(u_lightDir + V);
                float spec = pow(max(dot(normalize(vNormal), H), 0.0), 32.0) * 0.15;

                vec3 color = marble * diff + spec;
                gl_FragColor = vec4(color, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `,
        side: THREE.FrontSide,
    });
}

// ── Pedestal base / Stone Frame (RGB 157, 160, 157) ─────────────
function createBaseMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x6a6b65,     // RGB(157, 160, 157)
        roughness: 0.85,     // matte porous surface
        metalness: 0.10,     // slight mineral specularity
    });
}

// ── Public factory ────────────────────────────────────────────
export function createProceduralBoard(scene) {
    const boardGroup = new THREE.Group();

    const darkMat = createMarbleMaterial(true);
    const lightMat = createMarbleMaterial(false);
    const baseMat = createBaseMaterial();

    // ── 8×8 tiles ──────────────────────────────────────────────
    const tileGeo = new THREE.BoxGeometry(SZ, TILE_H, SZ);
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            // FIX: Parity inverted so that White's bottom right (H1) is Light, A1 is Dark.
            const isDark = (r + f) % 2 !== 0;
            const mesh = new THREE.Mesh(tileGeo, isDark ? darkMat : lightMat);
            // OFF centers the board exactly
            const x = f * SZ + OFF;
            const z = r * SZ + OFF;
            mesh.position.set(x, TILE_H * 0.5, z);
            mesh.receiveShadow = true;
            boardGroup.add(mesh);
        }
    }

    // ── Border frame (4 strips) ─────────────────────────────────
    const totalW = BOARD_SIZE + BORDER * 2;
    const borderH = TILE_H * 1.0;
    const half = BOARD_SIZE * 0.5;
    const borders = [
        [totalW, BORDER, 0, -(half + BORDER * 0.5)],
        [totalW, BORDER, 0, (half + BORDER * 0.5)],
        [BORDER, BOARD_SIZE, -(half + BORDER * 0.5), 0],
        [BORDER, BOARD_SIZE, (half + BORDER * 0.5), 0],
    ];
    borders.forEach(([w, d, x, z]) => {
        const geo = new THREE.BoxGeometry(w, borderH, d);
        const m = new THREE.Mesh(geo, baseMat);
        m.position.set(x, borderH * 0.5, z);
        m.receiveShadow = true;
        boardGroup.add(m);
    });

    // ── Pedestal base ───────────────────────────────────────────
    const baseW = totalW - 0.05; // Slightly undercut for shadow/depth
    const baseGeo = new THREE.BoxGeometry(baseW, BASE_H, baseW);
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -BASE_H * 0.5 + 0.01, 0); // Drop below tiles naturally
    baseMesh.castShadow = false;
    baseMesh.receiveShadow = true;
    boardGroup.add(baseMesh);

    // ── Top trim strip (Restored Gold) ──────────────────────────
    const trimW = BOARD_SIZE + (BORDER * 0.1);
    const trimGeo = new THREE.BoxGeometry(trimW, 0.015, trimW);
    const trimMat = new THREE.MeshStandardMaterial({
        color: 0xeed39e, metalness: 0.95, roughness: 0.15,
        emissive: 0xaa7020, emissiveIntensity: 0.25,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(0, -0.005, 0); // Nestled right under the tiles
    boardGroup.add(trim);

    // ── Corner accent cubes ─────────────────────────────────────
    const cornerGeo = new THREE.BoxGeometry(BORDER, borderH * 1.25, BORDER);
    const hw = half + BORDER * 0.5;
    [[-hw, -hw], [-hw, hw], [hw, -hw], [hw, hw]].forEach(([x, z]) => {
        const m = new THREE.Mesh(cornerGeo, baseMat);
        m.position.set(x, borderH * 1.25 * 0.5, z);
        boardGroup.add(m);
    });

    // Board sits exactly such that the top of the tiles is flat at y=0.0
    // Because tiles are height TILE_H and placed at TILE_H * 0.5
    boardGroup.position.y = -TILE_H;

    return boardGroup;
}