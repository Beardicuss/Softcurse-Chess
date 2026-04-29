import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { W } from "./chessEngine.js";
import { ASSET_CDN } from "./constants.js";

const loader = new GLTFLoader();
const modelCache = {};

const W_FILES = {
    P: "obj_003",
    R: "obj_005",
    N: "obj_002",
    B: "obj_000",
    Q: "obj_004",
    K: "obj_001",
};

const B_FILES = {
    P: "obj_009",
    R: "obj_011",
    N: "obj_008",
    B: "obj_006",
    Q: "obj_010",
    K: "obj_007",
};

const PIECE_SCALE = {
    P: 0.55, R: 0.65, N: 0.7, B: 0.75, Q: 0.85, K: 0.9,
};

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
    const bMat = () => new THREE.MeshStandardMaterial({
        color: isW ? 0xe8e8e8 : 0xd4af37,
        emissive: isW ? 0x888888 : 0x8b7500,
        emissiveIntensity: isW ? 0.15 : 0.2, metalness: 0.9, roughness: 0.15
    });
    const aMat = () => new THREE.MeshStandardMaterial({
        color: isW ? 0xfff7ef : 0x7a3232,
        emissive: isW ? 0xfff7ef : 0x7a3232,
        emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.05
    });
    const add = (geo, mat, y = 0, rx = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.y = y; m.rotation.x = rx; m.castShadow = true; g.add(m); return m;
    };
    const ring = (y) => add(new THREE.TorusGeometry(0.17, 0.025, 8, 20), aMat(), y, -Math.PI / 2);
    const base = () => add(new THREE.CylinderGeometry(0.23, 0.27, 0.07, 16), bMat(), 0.035);

    switch (type) {
        case "P":
            base();
            add(new THREE.CylinderGeometry(0.085, 0.16, 0.25, 12), bMat(), 0.19);
            add(new THREE.SphereGeometry(0.155, 14, 10), bMat(), 0.44);
            ring(0.32);
            break;
        case "R":
            base();
            add(new THREE.CylinderGeometry(0.18, 0.22, 0.36, 12), bMat(), 0.25);
            add(new THREE.CylinderGeometry(0.22, 0.18, 0.1, 12), bMat(), 0.48);
            ring(0.46);
            break;
        case "N":
            base();
            add(new THREE.CylinderGeometry(0.12, 0.18, 0.2, 10), bMat(), 0.17);
            add(new THREE.BoxGeometry(0.17, 0.3, 0.22), bMat(), 0.5);
            break;
        case "B":
            base();
            add(new THREE.CylinderGeometry(0.085, 0.2, 0.46, 12), bMat(), 0.3);
            add(new THREE.SphereGeometry(0.095, 12, 10), bMat(), 0.58);
            ring(0.42);
            break;
        case "Q":
            base();
            add(new THREE.CylinderGeometry(0.12, 0.21, 0.5, 14), bMat(), 0.32);
            ring(0.58);
            add(new THREE.SphereGeometry(0.085, 12, 10), bMat(), 0.62);
            break;
        case "K":
            base();
            add(new THREE.CylinderGeometry(0.14, 0.21, 0.53, 14), bMat(), 0.335);
            add(new THREE.BoxGeometry(0.07, 0.25, 0.07), aMat(), 0.85);
            add(new THREE.BoxGeometry(0.19, 0.07, 0.07), aMat(), 0.95);
            break;
    }
    g.userData = { type, color };
    return g;
}

export function makePiece(type, color) {
    const g = new THREE.Group();
    const isW = color === W;

    const accentMat = new THREE.MeshStandardMaterial({
        color: isW ? 0xfff7ef : 0x7a3232,
        emissive: isW ? 0xfff7ef : 0x7a3232,
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.05,
    });

    const modelName = isW ? W_FILES[type] : B_FILES[type];
    const scale = PIECE_SCALE[type] || 0.7;

    loadGeometry(modelName)
        .then((geoMeshObj) => {
            while (g.children.length) g.remove(g.children[0]);

            const mesh = geoMeshObj.clone();

            mesh.traverse(node => {
                if (!node.isMesh) return;
                if (node.material) {
                    const mats = Array.isArray(node.material) ? node.material : [node.material];
                    mats.forEach(m => {
                        m.envMapIntensity = 0;
                        // Increase roughness and reduce metalness to make them less dependent on reflections
                        // and more responsive to direct scene lights
                        if (m.roughness !== undefined) m.roughness = 0.8;
                        if (m.metalness !== undefined) m.metalness = 0.1;

                        // Slightly brighten the base color if it's very dark to reveal details
                        if (m.color) {
                            const hsl = {};
                            m.color.getHSL(hsl);
                            if (hsl.l < 0.2) { // If it's very dark (like the black pieces)
                                m.color.setHSL(hsl.h, hsl.s, 0.25); // Lift the lightness slightly
                            }
                        }
                        m.needsUpdate = true;
                    });
                }
                node.castShadow = true;
                node.receiveShadow = true;
            });

            const geo = mesh.geometry;
            geo.computeBoundingBox();
            const bb = geo.boundingBox;
            const rawHeight = bb.max.y - bb.min.y;
            const desiredScale = scale / (rawHeight || 1);
            mesh.scale.setScalar(desiredScale);

            const cx = (bb.min.x + bb.max.x) / 2 * desiredScale;
            const cz = (bb.min.z + bb.max.z) / 2 * desiredScale;
            const bottom = bb.min.y * desiredScale;
            mesh.position.set(-cx, -bottom, -cz);

            g.add(mesh);

            // Glowing base ring
            const ringMesh = new THREE.Mesh(
                new THREE.TorusGeometry(0.22, 0.02, 8, 24),
                accentMat
            );
            ringMesh.position.y = 0.01;
            ringMesh.rotation.x = -Math.PI / 2;
            g.add(ringMesh);
        })
        .catch(() => {
            const fallback = makeProcedural(type, color);
            fallback.children.forEach((child) => g.add(child.clone()));
        });

    // Placeholder while loading
    const placeholder = makeProcedural(type, color);
    placeholder.children.forEach((child) => g.add(child.clone()));

    g.userData = { type, color };
    return g;
}
