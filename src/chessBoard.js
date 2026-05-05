import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { SZ, OFF } from "./constants.js";
import { getAntiqueStoneMaterial } from "./antiqueStoneMaterial.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const TILE_H = 0.08;
const BASE_H = 0.42;
const BOARD_SIZE = SZ * 8;
const BORDER = SZ * 0.34;

// ── Marble tile shader ────────────────────────────────────────
function createMarbleMaterial(isDark) {
    return new THREE.ShaderMaterial({
        uniforms: {
            u_dark: {
                value: isDark
                    ? new THREE.Color(0.008, 0.012, 0.022) // near-black abyss navy
                    : new THREE.Color(0.550, 0.600, 0.650) // BRIGHTENED BASE for High-Contrast
            },
            u_mid: {
                value: isDark
                    ? new THREE.Color(0.025, 0.050, 0.095) // cold deep blue
                    : new THREE.Color(0.850, 0.900, 0.950) // BRIGHT ALABASTER for High-Contrast
            },
            u_vein: {
                value: isDark
                    ? new THREE.Color(0.080, 0.160, 0.280) // cold silver-blue vein
                    : new THREE.Color(0.950, 1.000, 1.000) // SHARP WHITE for High-Contrast
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

                float warp = fbm(uv * 1.2);
                float vein = abs(sin((uv.x + uv.y * 0.6 + warp * 2.2) * 5.0));
                vein = pow(1.0 - vein, 4.0);

                float grain = fbm(uv * 2.5 + vec2(3.7, 1.2));
                float t = grain * 0.76 + vein * 0.24;
                vec3 marble = mix(u_dark, u_mid, clamp(t, 0.0, 1.0));
                marble = mix(marble, u_vein, vein * (0.28 + 0.12 * topFace));

                float scratch = smoothstep(0.78, 0.98, fbm(uv * 7.0 + vec2(11.0, 3.0)));
                marble = mix(marble, marble * 1.14, scratch * 0.09 * topFace);

                float crack = smoothstep(0.965, 0.998, abs(sin((uv.x * 1.7 - uv.y * 1.15 + warp * 1.8) * 7.0)));
                marble += vec3(0.20, 0.38, 0.55) * crack * topFace * 0.04;

                marble *= mix(0.34, 1.0, topFace);

                float diff = max(dot(normalize(vNormal), u_lightDir), 0.0) * 0.68 + 0.20;

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

// ── Board frame / border — match the dark walls exactly ───────
function createBaseMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x060D18, // Swapped to match Dark Square color for better contrast
        roughness: 0.95,
        metalness: 0.00,
    });
}

function createRecessMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x080e14,
        roughness: 0.95,
        metalness: 0.02,
        emissive: new THREE.Color(0x050e18),
        emissiveIntensity: 0.12,
    });
}

// Board edge inlay — dark grey, barely distinguishable from frame
function createInlayMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x2a3e5d,
        metalness: 0.30,
        roughness: 0.70,
        emissive: new THREE.Color(0x05080c),
        emissiveIntensity: 0.06,
    });
}

export function createProceduralBoard(scene) {
    const boardGroup = new THREE.Group();

    // Tiles — Nokron marble shader
    const darkMat = createMarbleMaterial(true);
    const lightMat = createMarbleMaterial(false);

    // Frame — dark wet stone
    const baseMat = createBaseMaterial();
    const inlayMat = createInlayMaterial();

    // ── 8×8 tiles ──────────────────────────────────────────────
    const tileGeo = new THREE.BoxGeometry(SZ, TILE_H, SZ);
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const isDark = (r + f) % 2 !== 0;
            const mesh = new THREE.Mesh(tileGeo, isDark ? darkMat : lightMat);
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

    // ── Top trim inlay ──────────────────────────────────────────
    const trimW = BOARD_SIZE + (BORDER * 0.1);
    const trimGeo = new THREE.BoxGeometry(trimW, 0.015, trimW);
    const trim = new THREE.Mesh(trimGeo, baseMat);;
    trim.position.set(0, -0.005, 0);
    boardGroup.add(trim);

    boardGroup.position.y = -TILE_H;
    return boardGroup;
}

// ═══════════════════════════════════════════════════════════════
//  GLB BASEMENT LOADER
// ═══════════════════════════════════════════════════════════════
export function loadBasementModel(boardGroup) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.setDRACOLoader(dracoLoader);
    const nokronMat = getAntiqueStoneMaterial('nokron');

    return new Promise((resolve, reject) => {
        loader.load(
            '/models/board/chess_basement.glb',
            (gltf) => {
                const original = gltf.scene;

                const box = new THREE.Box3().setFromObject(original);
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);

                console.log('[Basement] Size:', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2));

                const BASEMENT_EXPAND = 1.23;
                const MANUAL_Y_OFFSET = -0.22;

                const totalW = (BOARD_SIZE + BORDER * 2) * BASEMENT_EXPAND;
                const scaleX = totalW / Math.max(size.x, 0.001);
                const scaleZ = totalW / Math.max(size.z, 0.001);
                const scaleY = (scaleX + scaleZ) * 0.5;

                const basementGroup = new THREE.Group();

                original.traverse(node => {
                    if (node.isMesh) {
                        node.material = nokronMat;
                        node.castShadow = false;
                        node.receiveShadow = true;
                    }
                });

                original.scale.set(scaleX, scaleY, scaleZ);
                original.position.set(
                    -center.x * scaleX,
                    -box.min.y * scaleY,
                    -center.z * scaleZ
                );

                basementGroup.add(original);
                basementGroup.position.y = MANUAL_Y_OFFSET;
                boardGroup.add(basementGroup);
                resolve(basementGroup);
            },
            undefined,
            (err) => {
                console.warn('Failed to load chess_basement.glb:', err);
                reject(err);
            }
        );
    });
}