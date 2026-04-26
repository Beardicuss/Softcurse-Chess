import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Galaxy Background
 * Loads the GLB, extracts vertex positions, renders as glowing particle system
 * matching the reference: bright white core fading to dark blue scattered stars
 */
export function createGalaxyBackground(scene) {
    const loader = new GLTFLoader();

    // ── Procedural starfield (immediate, no loading needed) ──────
    // Scattered background stars — tiny, dim, spread across a huge sphere
    const starCount = 6000;
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        // Random points on a large sphere shell
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 40 + Math.random() * 20;
        starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = r * Math.cos(phi);

        // Vary size — most tiny, few slightly larger
        starSizes[i] = Math.random() < 0.95 ? 0.3 + Math.random() * 0.4 : 0.8 + Math.random() * 0.6;

        // Color: mostly cold white-blue, occasional warm
        const warm = Math.random() < 0.08;
        starColors[i * 3] = warm ? 1.0 : 0.7 + Math.random() * 0.3;
        starColors[i * 3 + 1] = warm ? 0.85 : 0.85 + Math.random() * 0.15;
        starColors[i * 3 + 2] = warm ? 0.6 : 1.0;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
        depthWrite: false,
    });

    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ── GLB-based galaxy core particle system ────────────────────
    loader.load("/models/bg/space.glb", (gltf) => {
        // Extract all vertex positions from all meshes in the GLB
        const allPositions = [];
        gltf.scene.traverse((node) => {
            if (!node.isMesh) return;
            const geo = node.geometry;
            const pos = geo.attributes.position;
            if (!pos) return;

            // Apply the node's world transform to each vertex
            const mat = new THREE.Matrix4();
            node.updateWorldMatrix(true, false);
            mat.copy(node.matrixWorld);

            const vec = new THREE.Vector3();
            for (let i = 0; i < pos.count; i++) {
                vec.fromBufferAttribute(pos, i);
                vec.applyMatrix4(mat);
                allPositions.push(vec.x, vec.y, vec.z);
            }
        });

        if (allPositions.length === 0) {
            console.warn("Galaxy GLB: no vertices found");
            return;
        }

        const rawPos = new Float32Array(allPositions);

        // Find bounding box to calculate center and scale
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < rawPos.length; i += 3) {
            if (rawPos[i] < minX) minX = rawPos[i];
            if (rawPos[i] > maxX) maxX = rawPos[i];
            if (rawPos[i + 1] < minY) minY = rawPos[i + 1];
            if (rawPos[i + 1] > maxY) maxY = rawPos[i + 1];
            if (rawPos[i + 2] < minZ) minZ = rawPos[i + 2];
            if (rawPos[i + 2] > maxZ) maxZ = rawPos[i + 2];
        }

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const cz = (minZ + maxZ) / 2;
        const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
        const targetSize = 55; // how big the galaxy should be in world units
        const scaleFactor = targetSize / (maxDim || 1);

        const N = rawPos.length / 3;
        const positions = new Float32Array(N * 3);
        const colors = new Float32Array(N * 3);
        const sizes = new Float32Array(N);

        for (let i = 0; i < N; i++) {
            const x = (rawPos[i * 3] - cx) * scaleFactor;
            const y = (rawPos[i * 3 + 1] - cy) * scaleFactor;
            const z = (rawPos[i * 3 + 2] - cz) * scaleFactor;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Distance from center drives color and size
            const dist = Math.sqrt(x * x + y * y + z * z);
            const normDist = Math.min(dist / (targetSize * 0.5), 1.0);

            // Core: bright white → mid: blue-white → edge: dark navy
            if (normDist < 0.15) {
                // Bright white core
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 1.0;
                colors[i * 3 + 2] = 1.0;
                sizes[i] = 1.2 + Math.random() * 1.0;
            } else if (normDist < 0.4) {
                // Blue-white transition
                const t = (normDist - 0.15) / 0.25;
                colors[i * 3] = 1.0 - t * 0.4;
                colors[i * 3 + 1] = 1.0 - t * 0.3;
                colors[i * 3 + 2] = 1.0;
                sizes[i] = 0.6 + Math.random() * 0.6;
            } else {
                // Dark blue outer stars
                const t = Math.min((normDist - 0.4) / 0.6, 1.0);
                colors[i * 3] = 0.1 + (1 - t) * 0.3;
                colors[i * 3 + 1] = 0.15 + (1 - t) * 0.35;
                colors[i * 3 + 2] = 0.3 + (1 - t) * 0.5;
                sizes[i] = 0.2 + Math.random() * 0.3;
            }
        }

        const galaxyGeo = new THREE.BufferGeometry();
        galaxyGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        galaxyGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        galaxyGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

        // Custom shader for smooth circular particles with glow
        const galaxyMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                varying float vDist;
                uniform float uTime;

                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    // Subtle slow rotation shimmer
                    float shimmer = 1.0 + 0.08 * sin(uTime * 0.4 + position.x * 0.1 + position.z * 0.1);
                    gl_PointSize = size * shimmer * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                    vDist = length(position) / 27.5;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vDist;

                void main() {
                    // Circular soft particle
                    vec2 uv = gl_PointCoord - vec2(0.5);
                    float d = length(uv);
                    if (d > 0.5) discard;

                    // Soft glow falloff
                    float alpha = 1.0 - smoothstep(0.0, 0.5, d);
                    alpha = pow(alpha, 1.4);

                    // Fade out at edges of galaxy
                    float edgeFade = 1.0 - smoothstep(0.6, 1.0, vDist);
                    alpha *= edgeFade;

                    gl_FragColor = vec4(vColor, alpha * 0.9);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
        });

        const galaxy = new THREE.Points(galaxyGeo, galaxyMat);

        // Tilt to match the elliptical shape in the reference image
        galaxy.rotation.x = Math.PI * 0.15;
        galaxy.rotation.z = Math.PI * 0.05;

        // Push far behind the chess scene
        galaxy.position.set(0, 8, -30);

        scene.add(galaxy);

        // ── Bright glowing core overlay ──────────────────────────
        // A soft sprite at the center for the intense core bloom
        const coreGeo = new THREE.BufferGeometry();
        coreGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

        const coreMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: `
                uniform float uTime;
                void main() {
                    gl_PointSize = 180.0 + 20.0 * sin(uTime * 0.5);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                void main() {
                    vec2 uv = gl_PointCoord - vec2(0.5);
                    float d = length(uv);
                    if (d > 0.5) discard;
                    float alpha = pow(1.0 - d * 2.0, 2.5) * 0.6;
                    gl_FragColor = vec4(0.85, 0.92, 1.0, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const core = new THREE.Points(coreGeo, coreMat);
        core.position.copy(galaxy.position);
        scene.add(core);

        // Return update function so render loop can animate shimmers
        return { galaxy, core, galaxyMat, coreMat };
    });

    // ── Slow rotation for the background star field ──────────────
    // Returns an update tick to call in the render loop
    return {
        tick(t) {
            stars.rotation.y = t * 0.008;
            stars.rotation.x = t * 0.003;
        }
    };
}
