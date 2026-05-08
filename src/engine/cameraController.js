import * as THREE from "three";
import { AudioEngine } from "../audioEngine.js";

/**
 * Sets up all camera orbit/zoom/input handlers.
 * Returns { cleanup, updateCam, getSquareFromHit } plus attaches DOM listeners.
 *
 * @param {object} opts
 * @param {THREE.PerspectiveCamera} opts.camera
 * @param {THREE.WebGLRenderer} opts.renderer
 * @param {THREE.Scene} opts.scene
 * @param {{ current: { theta, phi, dist, targetTheta, targetPhi, targetDist } }} opts.camState
 * @param {{ current: boolean }} opts.gameStartedRef
 * @param {number} opts.BOARD_Y
 * @param {THREE.Mesh[]} opts.raycastTargets
 * @param {(r: number, f: number) => void} opts.handleClick
 */
export function createCameraController(opts) {
    const { camera, renderer, scene, camState, gameStartedRef, BOARD_Y, raycastTargets, handleClick } = opts;

    const ray = new THREE.Raycaster();
    const mv2 = new THREE.Vector2();

    function updateCam() {
        const { theta, phi, dist } = camState.current;
        const panX = camState.current.panX || 0;
        const panZ = camState.current.panZ || 0;
        const pitchMod = gameStartedRef.current ? 0 : 0.2;
        camera.position.x = panX + dist * Math.sin(theta) * Math.cos(phi + pitchMod);
        camera.position.y = BOARD_Y + dist * Math.sin(phi + pitchMod);
        camera.position.z = panZ + dist * Math.cos(theta) * Math.cos(phi + pitchMod);
        camera.lookAt(panX, BOARD_Y + 0.5, panZ);
    }

    function getSquareFromHit(hits) {
        if (!hits.length) return null;
        for (const h of hits) {
            let obj = h.object;
            while (obj && obj !== scene) {
                if (obj.userData && obj.userData.r !== undefined) {
                    return [obj.userData.r, obj.userData.f];
                }
                obj = obj.parent;
            }
        }
        return null;
    }

    // ── Mouse controls ─────────────────────────────────────────
    // Right-click drag = orbit rotation, Left-click drag = camera pan
    let isDrag = false, dragButton = -1, dsx = 0, dsy = 0, didMove = false;

    const onMouseDown = (e) => {
        AudioEngine.init();
        if (e.button === 0 || e.button === 2) {
            isDrag = true; dragButton = e.button; didMove = false;
            dsx = e.clientX; dsy = e.clientY;
        }
    };

    const onMouseMove = (e) => {
        if (!isDrag) return;
        const dx = e.clientX - dsx, dy = e.clientY - dsy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didMove = true;

        if (dragButton === 2) {
            // Right-click: orbit rotation
            camState.current.targetTheta -= dx * 0.005;
            camState.current.targetPhi = Math.max(0.14, Math.min(Math.PI / 2.3, camState.current.targetPhi + dy * 0.005));
        } else if (dragButton === 0) {
            // Left-click: camera pan (move look-at point laterally)
            const panSpeed = 0.02 * camState.current.dist / 14;
            const theta = camState.current.theta;
            // Pan perpendicular to camera direction
            camState.current.panX = (camState.current.panX || 0) - dx * panSpeed * Math.cos(theta) - dy * panSpeed * Math.sin(theta) * 0.5;
            camState.current.panZ = (camState.current.panZ || 0) + dx * panSpeed * Math.sin(theta) - dy * panSpeed * Math.cos(theta) * 0.5;
            // Clamp pan range
            camState.current.panX = Math.max(-5, Math.min(5, camState.current.panX));
            camState.current.panZ = Math.max(-5, Math.min(5, camState.current.panZ));
        }

        dsx = e.clientX; dsy = e.clientY;
    };

    const onMouseUp = (e) => {
        isDrag = false; dragButton = -1;
        if (!gameStartedRef.current || didMove) return;
        if (e.button !== 0) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mv2.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mv2.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        ray.setFromCamera(mv2, camera);
        const hits = ray.intersectObjects(raycastTargets, true);
        const sq = getSquareFromHit(hits);
        if (sq) handleClick(sq[0], sq[1]);
    };

    const onMouseWheel = (e) => {
        e.preventDefault();
        const zoomAmount = e.deltaY > 0 ? 1.1 : 0.9;
        camState.current.targetDist = Math.max(3, Math.min(30, camState.current.targetDist * zoomAmount));
    };

    const onContextMenu = (e) => e.preventDefault();

    // ── Touch controls ─────────────────────────────────────────
    let touchStartX = 0, touchStartY = 0, touchDidMove = false, lastPinchDist = 0;

    const onTouchStart = (e) => {
        AudioEngine.init();
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchDidMove = false;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastPinchDist = Math.sqrt(dx * dx + dy * dy);
        }
    };

    const onTouchMove = (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            const dx = e.touches[0].clientX - touchStartX;
            const dy = e.touches[0].clientY - touchStartY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) touchDidMove = true;
            camState.current.targetTheta -= dx * 0.005;
            camState.current.targetPhi = Math.max(0.14, Math.min(Math.PI / 2.3, camState.current.targetPhi + dy * 0.005));
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (lastPinchDist > 0) {
                const scale = lastPinchDist / dist;
                camState.current.targetDist = Math.max(3, Math.min(30, camState.current.targetDist * scale));
            }
            lastPinchDist = dist;
        }
    };

    const onTouchEnd = (e) => {
        if (!gameStartedRef.current || touchDidMove || e.changedTouches.length !== 1) return;
        const touch = e.changedTouches[0];
        const rect = renderer.domElement.getBoundingClientRect();
        mv2.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mv2.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        ray.setFromCamera(mv2, camera);
        const hits = ray.intersectObjects(raycastTargets, true);
        const sq = getSquareFromHit(hits);
        if (sq) handleClick(sq[0], sq[1]);
    };

    // ── Attach listeners ───────────────────────────────────────
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onMouseWheel, { passive: false });
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", onTouchEnd);

    // ── Cleanup ────────────────────────────────────────────────
    function cleanup() {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        renderer.domElement.removeEventListener("mousedown", onMouseDown);
        renderer.domElement.removeEventListener("wheel", onMouseWheel);
        renderer.domElement.removeEventListener("contextmenu", onContextMenu);
        renderer.domElement.removeEventListener("touchstart", onTouchStart);
        renderer.domElement.removeEventListener("touchmove", onTouchMove);
        renderer.domElement.removeEventListener("touchend", onTouchEnd);
    }

    return { updateCam, getSquareFromHit, cleanup };
}
