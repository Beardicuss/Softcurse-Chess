import * as THREE from "three";

/**
 * Create a particle burst effect at a world position.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} pos
 * @param {number} col
 * @param {number} sz
 * @param {number} N
 * @returns {() => boolean} tick function — returns false when done
 */
export function mkBurst(scene, pos, col, sz = 0.07, N = 90) {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
        arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y + 0.3; arr[i * 3 + 2] = pos.z;
        vel[i * 3] = (Math.random() - 0.5) * 0.22;
        vel[i * 3 + 1] = Math.random() * 0.22 + 0.05;
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.22;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ color: col, size: sz, transparent: true, opacity: 1 });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts); let life = 0;
    return () => {
        life += 0.04;
        const p = geo.attributes.position.array;
        for (let i = 0; i < N; i++) {
            vel[i * 3 + 1] -= 0.006;
            p[i * 3] += vel[i * 3]; p[i * 3 + 1] += vel[i * 3 + 1]; p[i * 3 + 2] += vel[i * 3 + 2];
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = Math.max(0, 1 - life / 1.6);
        if (life >= 1.6) { scene.remove(pts); geo.dispose(); mat.dispose(); return false; }
        return true;
    };
}

/**
 * Create a shatter/crumble effect for a captured piece.
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D} victim
 * @param {boolean} isWhite
 * @param {number} BOARD_Y
 * @returns {() => boolean} tick function — returns false when done
 */
export function mkShatter(scene, victim, isWhite, BOARD_Y) {
    const N = 30;
    const geo = new THREE.TetrahedronGeometry(0.18, 0);
    let mat;
    victim.traverse(c => {
        if (c.isMesh && c.material && !mat) {
            mat = Array.isArray(c.material) ? c.material[0] : c.material;
        }
    });
    const baseColor = isWhite ? 0xdddddd : 0x060d18;
    if (!mat) mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.9 });

    const inst = new THREE.InstancedMesh(geo, mat, N);
    inst.castShadow = true;
    const dummy = new THREE.Object3D();
    const vels = []; const rots = []; const baseScales = [];
    const wPos = victim.position.clone();

    for (let i = 0; i < N; i++) {
        const x = (Math.random() - 0.5) * 0.8;
        const y = Math.random() * 2.0;
        const z = (Math.random() - 0.5) * 0.8;

        dummy.position.set(wPos.x + x, wPos.y + y, wPos.z + z);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        let scale;
        if (i < 2) scale = 1.3 + Math.random() * 0.5;
        else if (i < 9) scale = 0.6 + Math.random() * 0.4;
        else scale = 0.2 + Math.random() * 0.3;

        baseScales.push(scale);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);

        const vx = x * 0.5 + (Math.random() - 0.5) * 0.5;
        const vy = (Math.random() - 0.5) * 0.2;
        const vz = z * 0.5 + (Math.random() - 0.5) * 0.5;
        vels.push(new THREE.Vector3(vx, vy, vz));
        rots.push(new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2));
    }
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);

    let life = 0;
    return () => {
        life += 0.016;

        let moving = false;
        for (let i = 0; i < N; i++) {
            inst.getMatrixAt(i, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

            if (life > 1.0) {
                moving = true;
                const shrinkP = Math.max(0, 1 - (life - 1.0) / 1.0);
                dummy.scale.setScalar(baseScales[i] * shrinkP);
            }

            if (dummy.position.y > BOARD_Y + 0.05 || Math.abs(vels[i].y) > 0.1 || Math.abs(vels[i].x) > 0.1) {
                moving = true;
                vels[i].y -= 30 * 0.016;
                dummy.position.addScaledVector(vels[i], 0.016);

                if (dummy.position.y < BOARD_Y + 0.02) {
                    dummy.position.y = BOARD_Y + 0.02;
                    vels[i].y *= -0.2;
                    vels[i].x *= 0.4;
                    vels[i].z *= 0.4;
                    rots[i].multiplyScalar(0.4);
                }
                dummy.rotation.x += rots[i].x;
                dummy.rotation.y += rots[i].y;
                dummy.rotation.z += rots[i].z;
            }

            dummy.updateMatrix();
            inst.setMatrixAt(i, dummy.matrix);
        }

        if (moving || life < 1.0) inst.instanceMatrix.needsUpdate = true;
        if (life >= 2.0) { scene.remove(inst); geo.dispose(); return false; }
        return true;
    };
}

/**
 * Smooth move animation for a chess piece.
 * @param {THREE.Object3D} mesh
 * @param {THREE.Vector3} target
 * @param {number} duration
 * @param {{ current: boolean }} animatingRef
 * @param {() => void} cb
 */
export function animPiece(mesh, target, duration, animatingRef, cb) {
    const start = mesh.position.clone();
    let elapsed = 0; animatingRef.current = true;
    const step = () => {
        elapsed += 0.016; const t = Math.min(elapsed / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        mesh.position.lerpVectors(start, target, ease);
        if (t < 1) requestAnimationFrame(step); else { animatingRef.current = false; cb?.(); }
    };
    step();
}

/**
 * Battle capture animation (leap + shatter).
 * @param {object} ctx - { scene, particles, camState, animatingRef }
 * @param {THREE.Object3D} attacker
 * @param {THREE.Object3D} victim
 * @param {THREE.Vector3} target
 * @param {number} col - W or B color constant
 * @param {number} BOARD_Y
 * @param {() => void} cb
 */
export function battleAnim(ctx, attacker, victim, target, col, BOARD_Y, cb) {
    const { scene, particles, camState, animatingRef } = ctx;
    const start = attacker.position.clone();
    const vicStartPos = victim.position.clone();

    let elapsed = 0; animatingRef.current = true;
    let shattered = false;
    const duration = 0.55;

    const step = () => {
        elapsed += 0.016; const t = Math.min(elapsed / duration, 1);

        const easeH = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        attacker.position.lerpVectors(start, target, easeH);

        const jumpHeight = 3.0;
        const arcT = Math.sin(t * Math.PI);
        attacker.position.y += (arcT * jumpHeight);

        if (t >= 0.85 && !shattered && victim.parent) {
            shattered = true;
            const isWhite = victim.userData?.color === col;
            const dustColor = isWhite ? 0xdddddd : 0x060d18;

            particles.push(mkShatter(scene, victim, isWhite, BOARD_Y));
            particles.push(mkBurst(scene, vicStartPos, dustColor, 0.08, 60));

            scene.remove(victim);

            camState.current.theta += (Math.random() - 0.5) * 0.08;
            camState.current.phi += (Math.random() - 0.5) * 0.08;
        }

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            attacker.position.copy(target);
            animatingRef.current = false;
            cb?.();
        }
    };
    step();
}
