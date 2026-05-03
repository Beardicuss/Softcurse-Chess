import * as THREE from "three";
import { SZ, OFF } from "./constants.js";

// ═══════════════════════════════════════════════════════════════
//  PROCEDURAL CHESS BOARD
//  Ancient inlaid stone tiles + cold ruined frame — zero asset loading
// ═══════════════════════════════════════════════════════════════

const TILE_H = 0.08;    // tile thickness
const BASE_H = 0.42;    // raised gothic board base
const BOARD_SIZE = SZ * 8;
const BORDER = SZ * 0.34;

// ── Marble tile shader ────────────────────────────────────────
function createMarbleMaterial(isDark) {
    return new THREE.ShaderMaterial({
        uniforms: {
            u_dark: {
                value: isDark
                    ? new THREE.Color(0.012, 0.085, 0.078) // deep Nokron teal stone
                    : new THREE.Color(0.43, 0.45, 0.43)    // aged moonstone
            },
            u_mid: {
                value: isDark
                    ? new THREE.Color(0.030, 0.245, 0.205) // oxidized green-black marble
                    : new THREE.Color(0.72, 0.74, 0.70)    // worn pale stone
            },
            u_vein: {
                value: isDark
                    ? new THREE.Color(0.050, 0.70, 0.58)   // subtle teal fissure
                    : new THREE.Color(0.18, 0.27, 0.33)    // cold slate vein
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
                float topFace = smoothstep(0.35, 0.85, normalize(vNormal).y);

                // Marble veins — warped fbm
                float warp = fbm(uv * 1.2);
                float vein = abs(sin((uv.x + uv.y * 0.6 + warp * 2.2) * 5.0));
                vein = pow(1.0 - vein, 4.0); // sharp thin veins

                // Base marble gradient
                float grain = fbm(uv * 2.5 + vec2(3.7, 1.2));
                float t = grain * 0.76 + vein * 0.24;
                vec3 marble = mix(u_dark, u_mid, clamp(t, 0.0, 1.0));

                // Vein color overlay
                marble = mix(marble, u_vein, vein * (0.28 + 0.12 * topFace));

                // Fine worn inlay scratches; subtle, not sparkly.
                float scratch = smoothstep(0.78, 0.98, fbm(uv * 7.0 + vec2(11.0, 3.0)));
                marble = mix(marble, marble * 1.14, scratch * 0.09 * topFace);

                // Hairline cracks with a faint silver-tear glint.
                float crack = smoothstep(0.965, 0.998, abs(sin((uv.x * 1.7 - uv.y * 1.15 + warp * 1.8) * 7.0)));
                marble += vec3(0.35, 0.62, 0.72) * crack * topFace * 0.045;

                // Tile sides should sink into the ruin instead of reading as clean bright slab edges.
                marble *= mix(0.34, 1.0, topFace);

                // Lighting
                float diff = max(dot(normalize(vNormal), u_lightDir), 0.0) * 0.68 + 0.20;

                // Softened specular highlight to prevent harsh triangle artifacts on large quads
                vec3 V = normalize(vec3(0.0, 12.0, 6.0) - vWorldPos);
                vec3 H = normalize(u_lightDir + V);
                float spec = pow(max(dot(normalize(vNormal), H), 0.0), 38.0) * 0.08 * topFace;

                vec3 color = marble * diff + spec;
                gl_FragColor = vec4(color, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `,
        side: THREE.FrontSide,
    });
}

// ── Board base / cold stone frame ─────────────────────────────
function createBaseMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x0e151c,
        roughness: 0.88,
        metalness: 0.08,
    });
}

function createRecessMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x07100f,
        roughness: 0.94,
        metalness: 0.03,
        emissive: 0x021414,
        emissiveIntensity: 0.08,
    });
}

function createInlayMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x9aaeb2,
        metalness: 0.55,
        roughness: 0.36,
        emissive: 0x153a42,
        emissiveIntensity: 0.07,
    });
}

function addArcadeSide(group, z, dir, totalW, baseMat, recessMat, inlayMat) {
    const archCount = 6;
    const span = totalW / archCount;
    const faceDepth = 0.028;
    const y = -BASE_H * 0.46;
    const archRadius = span * 0.34;
    const panelGeo = new THREE.BoxGeometry(span * 0.82, BASE_H * 0.50, faceDepth);
    const columnGeo = new THREE.BoxGeometry(0.050, BASE_H * 0.72, 0.052);
    const footGeo = new THREE.BoxGeometry(0.090, 0.045, 0.060);
    const railGeo = new THREE.BoxGeometry(totalW, 0.040, 0.055);
    const archGeo = new THREE.TorusGeometry(archRadius, 0.018, 8, 32, Math.PI);

    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(totalW, BASE_H * 0.58, 0.018), recessMat);
    backPanel.position.set(0, y - BASE_H * 0.01, z - dir * 0.010);
    group.add(backPanel);

    const upperRail = new THREE.Mesh(railGeo, inlayMat);
    upperRail.position.set(0, y + BASE_H * 0.34, z + dir * 0.012);
    group.add(upperRail);

    const lowerRail = new THREE.Mesh(railGeo, inlayMat);
    lowerRail.position.set(0, y - BASE_H * 0.34, z + dir * 0.012);
    group.add(lowerRail);

    for (let i = 0; i < archCount; i++) {
        const x = -totalW / 2 + span * (i + 0.5);
        const panel = new THREE.Mesh(panelGeo, recessMat);
        panel.position.set(x, y - BASE_H * 0.04, z + dir * 0.002);
        group.add(panel);
    }

    for (let i = 0; i <= archCount; i++) {
        const x = -totalW / 2 + i * span;
        const col = new THREE.Mesh(columnGeo, baseMat);
        col.position.set(x, y - BASE_H * 0.02, z + dir * 0.022);
        group.add(col);

        const foot = new THREE.Mesh(footGeo, inlayMat);
        foot.position.set(x, y - BASE_H * 0.37, z + dir * 0.024);
        group.add(foot);
    }

    for (let i = 0; i < archCount; i++) {
        const x = -totalW / 2 + span * (i + 0.5);
        const arch = new THREE.Mesh(archGeo, inlayMat);
        arch.position.set(x, y - BASE_H * 0.09, z + dir * 0.030);
        arch.scale.y = 1.08;
        group.add(arch);

        const pendant = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.070, 0.035), inlayMat);
        pendant.position.set(x, y - BASE_H * 0.22, z + dir * 0.026);
        group.add(pendant);
    }
}

function addGothicDetails(group, totalW, totalD, baseMat, recessMat, inlayMat) {
    const frontZ = totalD / 2 + 0.012;
    const backZ = -totalD / 2 - 0.012;
    addArcadeSide(group, frontZ, 1, totalW, baseMat, recessMat, inlayMat);
    addArcadeSide(group, backZ, -1, totalW, baseMat, recessMat, inlayMat);

    const trimGeo = new THREE.BoxGeometry(0.040, BASE_H * 0.62, 0.040);
    [-totalW / 2, totalW / 2].forEach(x => {
        const sideTrim = new THREE.Mesh(trimGeo, inlayMat);
        sideTrim.position.set(x, -BASE_H * 0.20, 0);
        group.add(sideTrim);
    });
}

// ── Public factory ────────────────────────────────────────────
export function createProceduralBoard(scene) {
    const boardGroup = new THREE.Group();

    const darkMat = createMarbleMaterial(true);
    const lightMat = createMarbleMaterial(false);
    const baseMat = createBaseMaterial();
    const recessMat = createRecessMaterial();
    const inlayMat = createInlayMaterial();

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
    const totalD = totalW;
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

    // ── Top trim strip (cold silver-blue inlay) ─────────────────
    const trimW = BOARD_SIZE + (BORDER * 0.1);
    const trimGeo = new THREE.BoxGeometry(trimW, 0.015, trimW);
    const trim = new THREE.Mesh(trimGeo, inlayMat);
    trim.position.set(0, -0.005, 0); // Nestled right under the tiles
    boardGroup.add(trim);

    // ── Raised gothic arcade relief, inspired by carved stone reliquary boards ──
    addGothicDetails(boardGroup, totalW, totalD, baseMat, recessMat, inlayMat);

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
