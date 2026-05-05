import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { W } from "./chessEngine.js";
import { ASSET_CDN } from "./constants.js";
import { getAntiqueStoneMaterial } from "./antiqueStoneMaterial.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.setDRACOLoader(dracoLoader);
const modelCache = {};
const resolvedCache = {};

const W_FILES = {
    P: "obj_003", R: "obj_005", N: "obj_002",
    B: "obj_000", Q: "obj_004", K: "obj_001",
};
const B_FILES = {
    P: "obj_009", R: "obj_011", N: "obj_008",
    B: "obj_006", Q: "obj_010", K: "obj_007",
};
const PIECE_SCALE = {
    P: 0.55, R: 0.65, N: 0.7, B: 0.75, Q: 0.85, K: 0.9,
};

// ── FIX 1: Shared geometry & materials — created ONCE, reused 32 times ──
const RING_GEO = new THREE.TorusGeometry(0.22, 0.02, 8, 24);
const ACCENT_MAT_W = new THREE.MeshStandardMaterial({
    color: 0xfff7ef, emissive: 0xfff7ef,
    emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.05,
});
const ACCENT_MAT_B = new THREE.MeshStandardMaterial({
    color: 0x7a3232, emissive: 0x7a3232,
    emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.05,
});

function loadGeometry(name) {
    if (!modelCache[name]) {
        modelCache[name] = new Promise((resolve, reject) => {
            loader.load(
                `${ASSET_CDN}/${name}.glb`,
                (gltf) => {
                    let meshObj = null;
                    gltf.scene.traverse((child) => {
                        if (child.isMesh && !meshObj) meshObj = child;
                    });
                    if (meshObj) {
                        meshObj.geometry.computeBoundingBox();
                        resolvedCache[name] = meshObj;
                        resolve(meshObj);
                    } else {
                        reject(new Error(`No mesh found in ${name}.glb`));
                    }
                },
                undefined,
                reject
            );
        });
    }
    return modelCache[name];
}

export function preloadModels() {
    const allNames = [...Object.values(W_FILES), ...Object.values(B_FILES)];
    return Promise.all([...new Set(allNames)].map((n) => loadGeometry(n)));
}

function makeProcedural(type, color) {
    const g = new THREE.Group();
    const isW = color === W;
    // ── FIX 2: procedural mats also shared ──
    const bMat = isW
        ? new THREE.MeshStandardMaterial({ color: 0xe8e8e8, emissive: 0x888888, emissiveIntensity: 0.15, metalness: 0.9, roughness: 0.15 })
        : new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x8b7500, emissiveIntensity: 0.2, metalness: 0.9, roughness: 0.15 });
    const aMat = isW ? ACCENT_MAT_W : ACCENT_MAT_B;

    const add = (geo, mat, y = 0, rx = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.y = y; m.rotation.x = rx; m.castShadow = true; g.add(m); return m;
    };
    const ring = (y) => add(RING_GEO, aMat, y, -Math.PI / 2);
    const base = () => add(new THREE.CylinderGeometry(0.23, 0.27, 0.07, 16), bMat, 0.035);

    switch (type) {
        case "P":
            base();
            add(new THREE.CylinderGeometry(0.085, 0.16, 0.25, 12), bMat, 0.19);
            add(new THREE.SphereGeometry(0.155, 14, 10), bMat, 0.44);
            ring(0.32);
            break;
        case "R":
            base();
            add(new THREE.CylinderGeometry(0.18, 0.22, 0.36, 12), bMat, 0.25);
            add(new THREE.CylinderGeometry(0.22, 0.18, 0.1, 12), bMat, 0.48);
            ring(0.46);
            break;
        case "N":
            base();
            add(new THREE.CylinderGeometry(0.12, 0.18, 0.2, 10), bMat, 0.17);
            add(new THREE.BoxGeometry(0.17, 0.3, 0.22), bMat, 0.5);
            break;
        case "B":
            base();
            add(new THREE.CylinderGeometry(0.085, 0.2, 0.46, 12), bMat, 0.3);
            add(new THREE.SphereGeometry(0.095, 12, 10), bMat, 0.58);
            ring(0.42);
            break;
        case "Q":
            base();
            add(new THREE.CylinderGeometry(0.12, 0.21, 0.5, 14), bMat, 0.32);
            ring(0.58);
            add(new THREE.SphereGeometry(0.085, 12, 10), bMat, 0.62);
            break;
        case "K":
            base();
            add(new THREE.CylinderGeometry(0.14, 0.21, 0.53, 14), bMat, 0.335);
            add(new THREE.BoxGeometry(0.07, 0.25, 0.07), aMat, 0.85);
            add(new THREE.BoxGeometry(0.19, 0.07, 0.07), aMat, 0.95);
            break;
    }
    g.userData = { type, color };
    return g;
}

export function makePiece(type, color) {
    const g = new THREE.Group();
    const isW = color === W;
    const style = isW ? 'angel' : 'demon';

    // ── FIX 1: reuse shared material, no new allocation ──
    const accentMat = isW ? ACCENT_MAT_W : ACCENT_MAT_B;

    const modelName = isW ? W_FILES[type] : B_FILES[type];
    const scale = PIECE_SCALE[type] || 0.7;

    loadGeometry(modelName)
        .then((geoMeshObj) => {
            while (g.children.length) g.remove(g.children[0]);

            const mesh = new THREE.Mesh(
                geoMeshObj.geometry,
                getAntiqueStoneMaterial(style)
            );
            mesh.castShadow = true;
            mesh.receiveShadow = false;

            const geo = mesh.geometry;
            const bb = geo.boundingBox; // already computed in loadGeometry
            const rawHeight = bb.max.y - bb.min.y;
            const desiredScale = scale / (rawHeight || 1);
            mesh.scale.setScalar(desiredScale);

            const cx = (bb.min.x + bb.max.x) / 2 * desiredScale;
            const cz = (bb.min.z + bb.max.z) / 2 * desiredScale;
            const bottom = bb.min.y * desiredScale;
            mesh.position.set(-cx, -bottom, -cz);

            g.add(mesh);
        })
        .catch(() => {
            const fallback = makeProcedural(type, color);
            fallback.children.forEach((child) => g.add(child.clone()));
        });

    if (!resolvedCache[modelName]) {
        const placeholder = makeProcedural(type, color);
        placeholder.children.forEach((child) => g.add(child.clone()));
    }

    g.userData = { type, color };
    return g;
}