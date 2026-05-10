// ═══════════════════════════════════════════════════════════════
//  AUDIO ENGINE — MP3 asset-based audio with volume controls
// ═══════════════════════════════════════════════════════════════

const SFX_PATH = "/assets/sounds/";

const SFX_FILES = {
    move: "piece_move.mp3",
    capture: "piece_capture.mp3",
    check: "game_check.mp3",
    win: "game_win.mp3",
    lose: "game_lose.mp3"
};

const BGM_FILES = {
    menu: "bgm_menu.mp3",
    game: "bgm_game.mp3",
};

function loadVolumes() {
    try {
        const s = localStorage.getItem("battleChessVolumes");
        return s ? JSON.parse(s) : { master: 1, music: 0.8, sfx: 1 };
    } catch (e) {
        return { master: 1, music: 0.8, sfx: 1 };
    }
}

function saveVolumes(v) {
    try { localStorage.setItem("battleChessVolumes", JSON.stringify(v)); } catch (e) { /* ignore */ }
}

export const AudioEngine = {
    ctx: null,
    volumes: loadVolumes(),
    sfxBuffers: {},
    bgmElements: {},
    currentBGM: null,
    _initialized: false,
    _loading: false,

    init() {
        if (this._initialized) {
            if (this.ctx?.state === "suspended") this.ctx.resume();
            return;
        }
        if (this._loading) return;
        this._loading = true;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.ctx.state === "suspended") this.ctx.resume();
        } catch (e) {
            console.warn("[AudioEngine] WebAudio unavailable:", e);
            this._loading = false;
            return;
        }

        // Only fetch SFX if not already preloaded
        if (Object.keys(this.sfxBuffers).length === 0) {
            for (const [key, file] of Object.entries(SFX_FILES)) {
                fetch(SFX_PATH + file)
                    .then(r => r.arrayBuffer())
                    .then(buf => this.ctx.decodeAudioData(buf))
                    .then(decoded => { this.sfxBuffers[key] = decoded; })
                    .catch(e => console.warn(`[AudioEngine] Failed to load ${file}:`, e));
            }
        }

        // Prepare BGM using HTML Audio elements (streaming, no full decode needed)
        if (Object.keys(this.bgmElements).length === 0) {
            for (const [key, file] of Object.entries(BGM_FILES)) {
                const audio = new Audio(SFX_PATH + file);
                audio.loop = true;
                audio.preload = "auto";
                audio.volume = this.volumes.master * this.volumes.music;
                this.bgmElements[key] = audio;
            }
        }

        this._initialized = true;
        this._loading = false;
    },

    // Preload all audio assets during loading screen. Returns a Promise.
    preload() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn("[AudioEngine] WebAudio unavailable:", e);
            return Promise.resolve();
        }

        const sfxPromises = Object.entries(SFX_FILES).map(([key, file]) =>
            fetch(SFX_PATH + file)
                .then(r => r.arrayBuffer())
                .then(buf => this.ctx.decodeAudioData(buf))
                .then(decoded => { this.sfxBuffers[key] = decoded; })
                .catch(e => console.warn(`[AudioEngine] Preload failed ${file}:`, e))
        );

        // Create BGM elements (browser will start buffering with preload="auto")
        for (const [key, file] of Object.entries(BGM_FILES)) {
            const audio = new Audio(SFX_PATH + file);
            audio.loop = true;
            audio.preload = "auto";
            audio.volume = this.volumes.master * this.volumes.music;
            this.bgmElements[key] = audio;
        }

        this._initialized = true;
        this._loading = false;
        return Promise.all(sfxPromises);
    },

    // ── SFX playback ────────────────────────────────────────────
    _playSfx(key) {
        if (!this.ctx || !this.sfxBuffers[key]) return;
        if (this.ctx.state === "suspended") this.ctx.resume();
        const source = this.ctx.createBufferSource();
        source.buffer = this.sfxBuffers[key];
        const gain = this.ctx.createGain();
        gain.gain.value = this.volumes.master * this.volumes.sfx;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
    },

    move() { this._playSfx("move"); },
    capture() { this._playSfx("capture"); },
    check() { this._playSfx("check"); },
    win() { this._playSfx("win"); },
    lose() { this._playSfx("lose"); },
    click() { this._playSfx("click"); },

    // Backward-compat alias
    clash() { this.capture(); },

    // ── BGM control ─────────────────────────────────────────────
    playBGM(key) {
        if (!this._initialized) return;
        // Stop current if different
        if (this.currentBGM && this.currentBGM !== key && this.bgmElements[this.currentBGM]) {
            const old = this.bgmElements[this.currentBGM];
            old.pause();
            old.currentTime = 0;
        }
        const audio = this.bgmElements[key];
        if (!audio) return;
        audio.volume = this.volumes.master * this.volumes.music;
        this.currentBGM = key;
        // Browsers block autoplay until user gesture — catch and ignore
        audio.play().catch(() => { });
    },

    stopBGM() {
        if (this.currentBGM && this.bgmElements[this.currentBGM]) {
            this.bgmElements[this.currentBGM].pause();
            this.bgmElements[this.currentBGM].currentTime = 0;
        }
        this.currentBGM = null;
    },

    // ── Volume control (called from SettingsPanel) ──────────────
    setMaster(v) {
        this.volumes.master = v;
        this._applyBGMVolume();
        saveVolumes(this.volumes);
    },
    setMusic(v) {
        this.volumes.music = v;
        this._applyBGMVolume();
        saveVolumes(this.volumes);
    },
    setSfx(v) {
        this.volumes.sfx = v;
        this._applyBGMVolume(); // bgm_game is now linked to SFX
        saveVolumes(this.volumes);
    },

    _applyBGMVolume() {
        for (const [key, audio] of Object.entries(this.bgmElements)) {
            // "menu" uses Music slider, "game" uses SFX slider since it's ambient
            const mult = (key === "game") ? this.volumes.sfx : this.volumes.music;
            audio.volume = Math.max(0, Math.min(1, this.volumes.master * mult));
        }
    },

    getVolumes() {
        return { ...this.volumes };
    },
};
