const fs = require('fs');
const file = './src/BattleChess3D.jsx';
let text = fs.readFileSync(file, 'utf8');

// 1. Replace the board block
const boardRegex = /\/\/ ── Board ────────────────────────────────────────────────────[\s\S]*?\/\/ ── Piece mesh map ──────────────────────────────────────────/;
const newBoard = `// ── Board ────────────────────────────────────────────────────
    const boardGrp = new THREE.Group();
    scene.add(boardGrp);

    // ── Floating platform base ───────────────────────────────────
    // Main slab — dark obsidian
    const slabMat = new THREE.MeshStandardMaterial({
        color: 0x080810,
        metalness: 0.9,
        roughness: 0.15,
        envMapIntensity: 1.5,
    });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.18, 11.2), slabMat);
    slab.position.y = -0.09;
    slab.receiveShadow = true;
    slab.castShadow = true;
    boardGrp.add(slab);

    // Thin gold trim border on top of slab
    const trimMat = new THREE.MeshStandardMaterial({
        color: 0xc8860a,
        metalness: 1.0,
        roughness: 0.1,
        envMapIntensity: 2.0,
        emissive: new THREE.Color(0x331a00),
        emissiveIntensity: 0.4,
    });
    // 4 border strips
    const trimH = 0.022, trimW = 11.2, trimD = 0.18;
    const trimPositions = [
        [0, 0, -5.51],   // front
        [0, 0,  5.51],   // back
        [-5.51, 0, 0],   // left
        [ 5.51, 0, 0],   // right
    ];
    const trimDims = [
        [trimW, trimH, trimD],
        [trimW, trimH, trimD],
        [trimD, trimH, trimW],
        [trimD, trimH, trimW],
    ];
    trimPositions.forEach(([x, y, z], i) => {
        const [w, h, d] = trimDims[i];
        const trim = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trimMat);
        trim.position.set(x, 0.01, z);
        boardGrp.add(trim);
    });

    // Glow underneath the board (fake bounce light)
    const glowLight = new THREE.PointLight(0x1a3aff, 2.0, 8);
    glowLight.position.set(0, -0.8, 0);
    boardGrp.add(glowLight);

    // ── Chess squares ────────────────────────────────────────────
    const sqMeshes = [];

    // Reusable materials — dark and light
    const darkSqMat = new THREE.MeshStandardMaterial({
        color: 0x05050f,       // near-black deep space
        metalness: 0.8,
        roughness: 0.25,
        envMapIntensity: 1.8,
    });
    const lightSqMat = new THREE.MeshStandardMaterial({
        color: 0xb07a18,       // warm burnished gold
        metalness: 0.95,
        roughness: 0.12,
        envMapIntensity: 2.5,
        emissive: new THREE.Color(0x1a0e00),
        emissiveIntensity: 0.2,
    });

    for (let r = 0; r < 8; r++) {
        sqMeshes[r] = [];
        for (let f = 0; f < 8; f++) {
            const isDark = (r + f) % 2 === 1;
            // Clone mat per square so we can tint individually for highlights
            const mat = (isDark ? darkSqMat : lightSqMat).clone();
            const m = new THREE.Mesh(new THREE.PlaneGeometry(SZ, SZ), mat);
            const pos = toWorld(r, f);
            m.rotation.x = -Math.PI / 2;
            m.position.set(pos.x, 0.001, pos.z);
            m.receiveShadow = true;
            m.userData = { r, f, isDark, mat };
            boardGrp.add(m);
            sqMeshes[r][f] = m;
        }
    }

    // ── Subtle grid lines ────────────────────────────────────────
    const glm = new THREE.LineBasicMaterial({
        color: 0x4455aa,
        transparent: true,
        opacity: 0.12,
    });
    for (let i = 0; i <= 8; i++) {
        const x = i * SZ + OFF - SZ / 2;
        boardGrp.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, 0.008, OFF - SZ / 2),
                new THREE.Vector3(x, 0.008, OFF + 8 * SZ - SZ / 2)
            ]), glm));
    }
    for (let i = 0; i <= 8; i++) {
        const z = i * SZ + OFF - SZ / 2;
        boardGrp.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(OFF - SZ / 2, 0.008, z),
                new THREE.Vector3(OFF + 8 * SZ - SZ / 2, 0.008, z)
            ]), glm));
    }

    // ── Corner accent gems ───────────────────────────────────────
    const gemMat = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        metalness: 1.0,
        roughness: 0.0,
        envMapIntensity: 3.0,
        emissive: new THREE.Color(0x003366),
        emissiveIntensity: 0.8,
    });
    const corners = [
        [-5.3, -5.3], [-5.3, 5.3],
        [ 5.3, -5.3], [ 5.3, 5.3],
    ];
    corners.forEach(([x, z]) => {
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), gemMat);
        gem.position.set(x, 0.18, z);
        gem.userData.isCornerGem = true;
        boardGrp.add(gem);
    });

    // ── Piece mesh map ──────────────────────────────────────────`;

text = text.replace(boardRegex, newBoard);

// 2. Replace clearHL block
const clearHLRegex = /function clearHL\(\) \{[\s\S]*?\}\n    function showHL/m;
const newClear = `function clearHL() {
      hlMeshes.forEach(m => scene.remove(m));
      hlMeshes.length = 0;
      for (let r = 0; r < 8; r++)
        for (let f = 0; f < 8; f++) {
            const { isDark, mat } = sqMeshes[r][f].userData;
            mat.color.setHex(isDark ? 0x05050f : 0xb07a18);
            if (mat.emissive) mat.emissive.setHex(isDark ? 0x000000 : 0x1a0e00);
            mat.emissiveIntensity = isDark ? 0 : 0.2;
        }
    }
    function showHL`;

text = text.replace(clearHLRegex, newClear);

// 3. Replace the Render Loop additions 
const renderLoopRegex = /\/\/ Magma pulse effect for hell side[\s\S]*?\n      renderer\.render/;
const newLoop = `// Spin corner gems slowly
      boardGrp.children.forEach(c => {
          if (c.userData.isCornerGem) c.rotation.y = t * 0.8;
      });

      // Pulse the underglow
      if (typeof glowLight !== 'undefined') glowLight.intensity = 1.5 + 0.5 * Math.sin(t * 1.2);

      renderer.render`;

text = text.replace(renderLoopRegex, newLoop);

fs.writeFileSync(file, text);
console.log("Successfully patched BattleChess3D.jsx");
