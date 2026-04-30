import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
//  DARK COSMOS BACKGROUND
//  Deep space skybox with twinkling stars, procedural planets,
//  and drifting asteroids placed far from the board.
// ═══════════════════════════════════════════════════════════════

export function createGalaxyBackground(scene) {

    const group = new THREE.Group();
    scene.add(group);

    // ── 1. Deep-space nebula sky sphere ───────────────────────────
    const nebMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            varying vec3 vPos;
            void main(){
                vPos = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec3 vPos;

            float hash(vec3 p) {
                p = fract(p * 0.3183099 + 0.1);
                p *= 17.0;
                return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }
            float noise(vec3 x) {
                vec3 i = floor(x);
                vec3 f = fract(x);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z
                );
            }
            float fbm(vec3 p) {
                float v = 0.0, a = 0.5;
                for (int i = 0; i < 5; i++) {
                    v += a * noise(p);
                    p *= 2.0;
                    a *= 0.5;
                }
                return v;
            }

            void main(){
                vec3 n = normalize(vPos);

                // Silver-white nebula wisps using 3D noise (seamless)
                float neb1 = fbm(n * 4.5 + vec3(0.3, 0.1, 0.0)) * fbm(n * 3.8 + vec3(1.1, 0.4, 0.5));
                vec3 deepSilver = vec3(0.18, 0.20, 0.22) * neb1 * 2.5;

                // Subtle ash dust
                float neb2 = fbm(n * 5.5 + vec3(-0.8, 0.3, 0.9)) * fbm(n * 2.2 + vec3(-1.3, -0.2, 0.2));
                vec3 ashDust = vec3(0.12, 0.13, 0.15) * neb2 * 1.2;

                // Very faint grey lane
                float neb3 = fbm(n * 2.6 + vec3(2.1, -0.5 + uTime * 0.003, 1.4));
                vec3 paleGrey = vec3(0.08, 0.08, 0.09) * neb3 * 0.5;

                // Solid space backdrop (pure pitch black, extreme contrast)
                vec3 baseSpace = vec3(0.0, 0.0, 0.005);

                vec3 col = baseSpace + deepSilver + ashDust + paleGrey;
                gl_FragColor = vec4(col, 1.0);
            }
        `,
        transparent: false,
        fog: false,
        depthWrite: false,
        side: THREE.BackSide,
    });
    const nebSphere = new THREE.Mesh(new THREE.SphereGeometry(250, 48, 48), nebMat);
    group.add(nebSphere);

    // ── 2. Stars — layered: dim field + bright twinklers ─────────
    const STAR_COUNT = 15000;
    const BRIGHT_COUNT = 800;
    const sPos = new Float32Array(STAR_COUNT * 3);
    const sCol = new Float32Array(STAR_COUNT * 3);
    const sSize = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 50 + Math.random() * 30;
        sPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        sPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        sPos[i * 3 + 2] = r * Math.cos(phi);

        const type = Math.random();
        if (type < 0.35) {
            sCol[i * 3] = 0.9 + Math.random() * 0.1; sCol[i * 3 + 1] = 0.9 + Math.random() * 0.1; sCol[i * 3 + 2] = 1.0;
        } else if (type < 0.60) {
            sCol[i * 3] = 0.75 + Math.random() * 0.15; sCol[i * 3 + 1] = 0.80 + Math.random() * 0.15; sCol[i * 3 + 2] = 0.85 + Math.random() * 0.15;
        } else if (type < 0.75) {
            sCol[i * 3] = 0.8; sCol[i * 3 + 1] = 0.85 + Math.random() * 0.1; sCol[i * 3 + 2] = 1.0;
        } else {
            sCol[i * 3] = 1.0; sCol[i * 3 + 1] = 1.0; sCol[i * 3 + 2] = 1.0;
        }

        sSize[i] = i < BRIGHT_COUNT ? 2.0 + Math.random() * 3.0 : 0.06 + Math.random() * 0.15;
    }

    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
    sGeo.setAttribute("size", new THREE.BufferAttribute(sSize, 1));

    const sMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vSize;
            uniform float uTime;
            void main() {
                vColor = color;
                vSize = size;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                // Make bright stars twinkle slightly
                float pulse = 1.0 + 0.3 * sin(uTime * 3.0 + position.x * 10.0);
                gl_PointSize = size * (300.0 / -mvPosition.z) * pulse;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vSize;
            void main() {
                vec2 uv = gl_PointCoord.xy - 0.5;
                float r = length(uv);
                if(r > 0.5) discard;
                float alpha = 1.0;
                if(vSize > 1.5) {
                    alpha = smoothstep(0.5, 0.0, r);
                    float cross = max(exp(-abs(uv.x) * 20.0), exp(-abs(uv.y) * 20.0));
                    alpha += cross * 0.5;
                } else {
                    alpha = smoothstep(0.5, 0.2, r);
                }
                gl_FragColor = vec4(vColor, alpha * 0.8);
            }
        `,
        fog: false,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
    });
    const stars = new THREE.Points(sGeo, sMat);
    group.add(stars);

    // ── 3. Distant Dark Celestial Bodies ──────────────────────────
    const moons = [];
    const planetGeo = new THREE.SphereGeometry(1, 64, 64);

    // Abstract procedural dark planets (magma, dark gas giant, or eclipse silhouette)
    const planetMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uSeed: { value: 0 },
            uType: { value: 0 },
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = -mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uSeed;
            uniform float uType;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;

            float hash(vec3 p) {
                p = fract(p * 0.3183099 + 0.1);
                p *= 17.0;
                return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }
            float noise(vec3 x) {
                vec3 i = floor(x);
                vec3 f = fract(x);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), f.x),
                        mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
                    mix(mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), f.x),
                        mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z
                );
            }
            float fbm(vec3 p) {
                float v = 0.0, a = 0.5;
                for (int i = 0; i < 5; i++) {
                    v += a * noise(p);
                    p *= 2.0;
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                vec3 n = normalize(vNormal);
                vec3 v = normalize(vViewPosition);
                float fresnel = 1.0 - max(dot(n, v), 0.0);
                
                float phi = vUv.y * 3.14159;
                float theta = vUv.x * 3.14159 * 2.0;
                vec3 pos = vec3(sin(phi)*cos(theta), cos(phi), sin(phi)*sin(theta));
                
                vec3 col = vec3(0.0); 
                
                if (uType < 0.25) {
                    // Cracked Magma planet
                    float n1 = fbm(pos * 3.0 + vec3(uSeed));
                    // thin cracks where n1 is near 0.5
                    float cracks = 1.0 - smoothstep(0.0, 0.04, abs(n1 - 0.5));
                    cracks *= fbm(pos * 15.0 + vec3(uSeed)); // break them up
                    
                    vec3 magma = vec3(1.5, 0.4, 0.05) * cracks; // bright fire
                    vec3 rock = vec3(0.015, 0.015, 0.02) * fbm(pos * 8.0);
                    col = rock + magma;
                    col += vec3(0.0, 0.05, 0.1) * pow(fresnel, 4.0); // dim blue rim

                } else if (uType < 0.50) {
                    // Dark banded reddish gas giant
                    float warp = fbm(pos * 2.5 + vec3(uSeed)) * 1.5;
                    float band = fbm(vec3(0.0, pos.y * 6.0 + warp, 0.0));
                    
                    vec3 darkBase = vec3(0.0, 0.0, 0.0);
                    vec3 darkRed = vec3(0.12, 0.02, 0.01);
                    col = mix(darkBase, darkRed, band);
                    col += vec3(0.15, 0.05, 0.0) * pow(fresnel, 4.0); // rusty rim scatter
                    
                } else if (uType < 0.75) {
                    // Pitch Black Eclipse Silhouette
                    vec3 darkBase = vec3(0.0, 0.0, 0.0);
                    float rim = pow(fresnel, 7.0);
                    vec3 rimColor = vec3(0.2, 0.6, 1.0); // bright blue/white eclipse edge
                    col = darkBase + rimColor * rim * 1.5;
                    
                } else {
                    // Dead, dark rocky moon
                    float n1 = fbm(pos * 10.0 + vec3(uSeed));
                    vec3 rockColor = vec3(0.04, 0.04, 0.05) * n1;
                    col = rockColor + vec3(0.08) * pow(fresnel, 5.0);
                }
                
                gl_FragColor = vec4(col, 1.0);
            }
        `,
        transparent: false,
        fog: false
    });

    const MOON_COUNT = 4;
    for (let i = 0; i < MOON_COUNT; i++) {
        const mat = planetMat.clone();
        mat.uniforms.uSeed.value = Math.random() * 100.0;
        mat.uniforms.uType.value = (i / MOON_COUNT) + 0.01;

        const moon = new THREE.Mesh(planetGeo, mat);

        let dist = 100;
        let scale = 4.0;
        let theta = Math.PI + 0.3 + (i * Math.PI / 2.0); // Space by 90 degrees full panorama
        let phi = 0;

        if (i === 0) {
            // Magma: Far far out
            dist = 230.0;
            scale = 4.5;
            phi = 0.1; // Slightly up in the deep distance
        } else if (i === 1) {
            // Gas Giant: Upper
            dist = 130.0;
            scale = 3.5;
            phi = 0.35; // Upper
        } else if (i === 2) {
            // Eclipse: Horizon
            dist = 110.0;
            scale = 4.0;
            phi = 0.08;
        } else if (i === 3) {
            // Dead Rocky Moon: Bottom
            dist = 90.0;
            scale = 5.0; // Foreground
            phi = -0.28; // Bottom (below the board rendering plane)
        }

        // Accurate Y-UP Cartesian map
        moon.position.set(
            dist * Math.sin(theta) * Math.cos(phi),      // X
            dist * Math.sin(phi) - 1.0,                  // Y 
            dist * Math.cos(theta) * Math.cos(phi)       // Z
        );
        moon.scale.setScalar(scale);
        moon.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        moon.userData = {
            rotSpeed: new THREE.Vector3((Math.random() - 0.5) * 0.0005, (Math.random() - 0.5) * 0.0005, (Math.random() - 0.5) * 0.0005)
        };
        group.add(moon);
        moons.push(moon);
    }

    // ── 4. Asteroids — realistic space rocks ─────────────────────
    const asteroids = [];

    // Create a procedural noise texture for asteroid micro-roughness bump mapping
    const bCanvas = document.createElement("canvas");
    bCanvas.width = 128; bCanvas.height = 128;
    const ctx = bCanvas.getContext("2d");
    const imgData = ctx.createImageData(128, 128);
    for (let i = 0; i < imgData.data.length; i += 4) {
        const v = Math.floor(Math.random() * 255);
        imgData.data[i] = v; imgData.data[i + 1] = v; imgData.data[i + 2] = v; imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    const rockBump = new THREE.CanvasTexture(bCanvas);
    rockBump.wrapS = THREE.RepeatWrapping;
    rockBump.wrapT = THREE.RepeatWrapping;

    // Use detail level 2 for more facets (less low-poly look)
    const asteroidGeo = new THREE.IcosahedronGeometry(1, 2);
    // Base deformation
    const aPos = asteroidGeo.attributes.position;
    for (let i = 0; i < aPos.count; i++) {
        const scale = 0.8 + Math.random() * 0.4;
        aPos.setXYZ(i, aPos.getX(i) * scale, aPos.getY(i) * scale, aPos.getZ(i) * scale);
    }
    aPos.needsUpdate = true;
    asteroidGeo.computeVertexNormals();

    const asteroidMat = new THREE.MeshStandardMaterial({
        color: 0x111111,          // Darker base (asteroids have very low albedo)
        roughness: 0.85,
        metalness: 0.4,           // Iron-rich metallic glint
        bumpMap: rockBump,
        bumpScale: 0.08,
        flatShading: true,        // Keeps the rugged rocky facets
        fog: false,
    });

    const ASTEROID_COUNT = 30; // Reduced considerably as requested
    for (let i = 0; i < ASTEROID_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const dist = 30 + Math.random() * 45;

        const scale = 0.15 + Math.random() * 0.6;
        const asteroid = new THREE.Mesh(asteroidGeo.clone(), asteroidMat.clone());

        // Further deform each clone so rocks look uniquely shaped
        const clonePos = asteroid.geometry.attributes.position;
        for (let j = 0; j < clonePos.count; j++) {
            const s = 0.85 + Math.random() * 0.3;
            clonePos.setXYZ(j, clonePos.getX(j) * s, clonePos.getY(j) * s, clonePos.getZ(j) * s);
        }
        clonePos.needsUpdate = true;
        asteroid.geometry.computeVertexNormals();

        // Subtle color tint (iron, carbon, silica variations)
        const hue = Math.random() > 0.5 ? 0.05 : 0.6;
        const sat = Math.random() * 0.1;
        asteroid.material.color.setHSL(hue, sat, 0.05 + Math.random() * 0.1);

        asteroid.scale.setScalar(scale);
        asteroid.position.set(
            dist * Math.sin(phi) * Math.cos(theta),
            dist * Math.sin(phi) * Math.sin(theta),
            dist * Math.cos(phi)
        );
        asteroid.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);

        group.add(asteroid);
        asteroids.push({
            mesh: asteroid,
            rotSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.008,
                (Math.random() - 0.5) * 0.008,
                (Math.random() - 0.5) * 0.008
            ),
            orbitSpeed: (Math.random() - 0.5) * 0.0004,
            orbitAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        });
    }

    // ── 5. Distant star cluster (dense background dust) ──────────
    const dustCount = 4500;
    const dPos = new Float32Array(dustCount * 3);
    const dCol = new Float32Array(dustCount * 3);
    const dSize = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 70 + Math.random() * 20;
        dPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        dPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        dPos[i * 3 + 2] = r * Math.cos(phi);
        const b = 0.4 + Math.random() * 0.3;
        dCol[i * 3] = b * 0.8; dCol[i * 3 + 1] = b * 0.85; dCol[i * 3 + 2] = b;
        dSize[i] = 0.03 + Math.random() * 0.06;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    dGeo.setAttribute("color", new THREE.BufferAttribute(dCol, 3));
    const dustMat = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dGeo, dustMat);
    group.add(dust);

    // ═══════════════════════════════════════════════════════════════
    //  TICK — called every frame
    // ═══════════════════════════════════════════════════════════════
    return {
        tick(t) {
            const T = t * 0.001;

            // Nebula + stars
            nebMat.uniforms.uTime.value = T;
            sMat.uniforms.uTime.value = T;
            stars.rotation.y = T * 0.002;
            nebSphere.rotation.y = T * 0.001;
            dust.rotation.y = T * 0.0015;

            // Asteroids: tumble + slow orbit drift
            asteroids.forEach(a => {
                a.mesh.rotation.x += a.rotSpeed.x;
                a.mesh.rotation.y += a.rotSpeed.y;
                a.mesh.rotation.z += a.rotSpeed.z;
                // Drift in orbit
                a.mesh.position.applyAxisAngle(a.orbitAxis, a.orbitSpeed);
            });

            // Distant planets: slow rotation + shader time
            if (moons.length > 0) {
                moons.forEach(m => {
                    m.rotation.x += m.userData.rotSpeed.x;
                    m.rotation.y += m.userData.rotSpeed.y;
                    m.rotation.z += m.userData.rotSpeed.z;
                    m.material.uniforms.uTime.value = T;
                });
            }
        }
    };
}