import * as THREE from "three";

/**
 * Create all scene lighting based on device type.
 * @param {THREE.Scene} scene
 * @param {boolean} isMobile
 * @param {{ shadows: boolean }} graphics
 */
export function createLighting(scene, isMobile, graphics) {
    if (isMobile) {
        // Mobile: ambient + 1 directional top-down, no shadows
        scene.add(new THREE.AmbientLight(0xffffff, 1.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
        dirLight.position.set(0, 10, 0);
        dirLight.castShadow = false;
        scene.add(dirLight);
    } else {
        // PC: low ambient so shadows are visible
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));

        // Light 1: top-down left — main, casts shadows
        const topLeft = new THREE.DirectionalLight(0xffffff, 2.2);
        topLeft.position.set(-4, 14, 0);
        topLeft.target.position.set(0, 0, 0);
        topLeft.castShadow = graphics.shadows;
        topLeft.shadow.mapSize.set(512, 512);
        topLeft.shadow.camera.near = 1;
        topLeft.shadow.camera.far = 25;
        topLeft.shadow.camera.left = -7;
        topLeft.shadow.camera.right = 7;
        topLeft.shadow.camera.top = 7;
        topLeft.shadow.camera.bottom = -7;
        topLeft.shadow.bias = -0.001;
        scene.add(topLeft);
        scene.add(topLeft.target);

        // Light 2: top-down right — fill, no shadow
        const topRight = new THREE.DirectionalLight(0xffffff, 1.4);
        topRight.position.set(4, 14, 0);
        topRight.castShadow = false;
        scene.add(topRight);

        // Light 3: left wall → board (neutral tint now)
        const leftWall = new THREE.DirectionalLight(0xffffff, 1.0);
        leftWall.position.set(-12, 5, 0);
        leftWall.castShadow = false;
        scene.add(leftWall);

        // Light 4: right wall → board (neutral tint now)
        const rightWall = new THREE.DirectionalLight(0xffffff, 1.0);
        rightWall.position.set(12, 5, 0);
        rightWall.castShadow = false;
        scene.add(rightWall);

        // Light 5: black piece fill — low front light to reveal dark figure details (neutral tint)
        const blackFill = new THREE.DirectionalLight(0xffffff, 3.5);
        blackFill.position.set(0, 3, 14); // from black side, low angle
        scene.add(blackFill);
    }
}

/**
 * Process a loaded GLTF and add it to the board group.
 * @param {THREE.GLTF} gltf
 * @param {THREE.Group} boardGrp
 * @param {boolean} isMobile
 * @param {boolean} preserveMaterials
 * @param {number} customScale
 */
export function addBoardModel(gltf, boardGrp, isMobile, preserveMaterials = false, customScale = 0.45) {
    const model = gltf.scene;
    model.position.set(0, -0.25, 0);
    model.scale.setScalar(customScale);
    model.traverse(node => {
        if (node.isMesh) {
            node.geometry.computeBoundingSphere();
            // Hide baked-in sky domes or background proxy spheres from the 3D assets
            if (node.geometry.boundingSphere && node.geometry.boundingSphere.radius > 45) {
                node.visible = false;
                return;
            }

            node.receiveShadow = !isMobile;
            node.castShadow = false;
            if (node.material) {
                const mats = Array.isArray(node.material) ? node.material : [node.material];
                mats.forEach(m => {
                    m.envMap = null;
                    m.envMapIntensity = 0;
                    // Do NOT override color — preserve original texture
                    if (!preserveMaterials) {
                        m.roughness = 0.85;   // matte, not shiny
                        m.metalness = 0.0;
                        if (m.specular) m.specular.setHex(0x111111); // kill specular
                        if (m.shininess !== undefined) m.shininess = 0;
                        if (m.emissive) { m.emissive.setHex(0x000000); m.emissiveIntensity = 0; }
                    }
                    m.needsUpdate = true;
                });
            }
        }
    });
    boardGrp.add(model);
}

/**
 * Create the invisible hit-test meshes for each board square.
 * @param {THREE.Group} boardGrp
 * @param {number} SZ - square size
 * @param {(r:number, f:number) => THREE.Vector3} toWorld
 * @returns {THREE.Mesh[][]} 8×8 mesh array
 */
export function createSquareMeshes(boardGrp, SZ, toWorld) {
    const sqMeshes = [];
    const hitMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, visible: false, depthWrite: false });
    for (let r = 0; r < 8; r++) {
        sqMeshes[r] = [];
        for (let f = 0; f < 8; f++) {
            const mat = hitMat.clone();
            const m = new THREE.Mesh(new THREE.PlaneGeometry(SZ, SZ), mat);
            const pos = toWorld(r, f);
            m.rotation.x = -Math.PI / 2;
            m.position.set(pos.x, pos.y + 0.015, pos.z);
            m.userData = { r, f, mat };
            boardGrp.add(m);
            sqMeshes[r][f] = m;
        }
    }
    return sqMeshes;
}
