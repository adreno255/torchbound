// ============================================================
// common/audio.js
// Centralised audio manager for Torchbound.
// Uses the Web Audio API directly — no p5.sound required.
//
// ── VOLUME CONTROLS ──────────────────────────────────────────
// All master volume knobs are at the top of this file.
// Values are 0.0 (silent) to 1.0 (full).
//
//   VOLUME.BGM      — background music overall level
//   VOLUME.SFX      — all sound effects overall level
//
// Per-track fine-tuning (also 0.0–1.0, multiplied on top of master):
//   VOLUME.TRACKS.bgm_menu
//   VOLUME.TRACKS.bgm_dungeon_light
//   VOLUME.TRACKS.bgm_dungeon_dark
//   VOLUME.TRACKS.bgm_dungeon_abyss
//   VOLUME.TRACKS.bgm_last30
//
// Per-SFX fine-tuning:
//   VOLUME.SFX_TRACKS.sfx_hit
//   VOLUME.SFX_TRACKS.sfx_fall
//   ... etc.
//
// BGM crossfade duration:
//   CROSSFADE_MS    — milliseconds for BGM fade in/out transitions
// ============================================================

// ─────────────────────────────────────────────────────────────
// ★ VOLUME CONTROLS — edit these to tune levels
// ─────────────────────────────────────────────────────────────
export const VOLUME = {
    /** Master BGM volume  (0.0 – 1.0) */
    BGM: 0.5,

    /** Master SFX volume  (0.0 – 1.0) */
    SFX: 0.7,

    /** Per-track BGM multipliers — final vol = BGM * track value */
    TRACKS: {
        bgm_menu: 1.0,
        bgm_dungeon_light: 1.0,
        bgm_dungeon_dark: 1.0,
        bgm_dungeon_abyss: 1.0,
        bgm_last30: 1.0,
    },

    /** Per-SFX multipliers — final vol = SFX * track value */
    SFX_TRACKS: {
        sfx_hit: 0.8,
        sfx_fall: 1.0,
        sfx_darkness: 0.9,
        sfx_powerup_torch: 1.0,
        sfx_powerup_time: 1.0,
        sfx_powerup_vision: 1.0,
        sfx_gameover: 1.0,
        sfx_victory: 1.0,
        sfx_keypress: 0.35, // intentionally quiet — fires on every keystroke
    },
};

/** BGM crossfade duration in milliseconds */
const CROSSFADE_MS = 1200;

// ─────────────────────────────────────────────────────────────
// Internal state
// ─────────────────────────────────────────────────────────────
let ctx = null; // AudioContext
let masterBgm = null; // GainNode — BGM master bus
let masterSfx = null; // GainNode — SFX master bus
let audioLoaded = false;
let onLoadedCallback = null;

// BGM playback state
const bgm = {
    buffers: {}, // key → AudioBuffer
    current: null, // { key, source, gain }
    next: null, // { key, source, gain } — during crossfade
    pending: null, // key requested while a crossfade is in progress
};

// SFX buffers (key → AudioBuffer)
const sfxBuffers = {};

// ─────────────────────────────────────────────────────────────
// Initialisation
// ─────────────────────────────────────────────────────────────

/**
 * Call once from p5 setup() (or on first user interaction).
 * Creates the AudioContext and master gain nodes.
 */
export function initAudio() {
    if (ctx) return; // already initialised
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    masterBgm = ctx.createGain();
    masterBgm.gain.value = VOLUME.BGM;
    masterBgm.connect(ctx.destination);

    masterSfx = ctx.createGain();
    masterSfx.gain.value = VOLUME.SFX;
    masterSfx.connect(ctx.destination);
}

/**
 * Must be called after the first user gesture (click/keypress) to
 * resume the AudioContext if the browser suspended it.
 */
export function resumeAudio() {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!audioLoaded) {
        audioLoaded = true;
        loadAllAudio().then(() => {
            console.log('[audio] All audio loaded');
            if (onLoadedCallback) onLoadedCallback();
        });
    }
}

export function setOnAudioLoaded(cb) {
    onLoadedCallback = cb;
}

// ─────────────────────────────────────────────────────────────
// Asset loading
// ─────────────────────────────────────────────────────────────

/**
 * Fetches and decodes an audio file into an AudioBuffer.
 * Returns a Promise — you can await all of these in preload equivalents.
 *
 * @param {string} key   - logical name (e.g. 'bgm_menu')
 * @param {string} path  - URL path (e.g. 'assets/audio/bgm/bgm_menu.ogg')
 * @param {'bgm'|'sfx'} type
 * @returns {Promise<void>}
 */
export async function loadAudio(key, path, type) {
    if (!ctx) initAudio();
    try {
        const resp = await fetch(path);
        const arrBuf = await resp.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrBuf);
        if (type === 'bgm') {
            bgm.buffers[key] = audioBuf;
        } else {
            sfxBuffers[key] = audioBuf;
        }
    } catch (err) {
        console.warn(`[audio] Failed to load ${path}:`, err);
    }
}

/**
 * Convenience: load all BGM and SFX files at once.
 * Returns a Promise that resolves when every file has been attempted.
 *
 * @returns {Promise<void>}
 */
export function loadAllAudio() {
    const bgmFiles = [
        ['bgm_menu', 'assets/audio/bgm/bgm_menu.ogg'],
        ['bgm_dungeon_light', 'assets/audio/bgm/bgm_dungeon_light.ogg'],
        ['bgm_dungeon_dark', 'assets/audio/bgm/bgm_dungeon_dark.ogg'],
        ['bgm_dungeon_abyss', 'assets/audio/bgm/bgm_dungeon_abyss.ogg'],
        ['bgm_last30', 'assets/audio/bgm/bgm_last30.ogg'],
    ];
    const sfxFiles = [
        ['sfx_hit', 'assets/audio/sfx/sfx_hit.ogg'],
        ['sfx_fall', 'assets/audio/sfx/sfx_fall.ogg'],
        ['sfx_darkness', 'assets/audio/sfx/sfx_darkness.ogg'],
        ['sfx_powerup_torch', 'assets/audio/sfx/sfx_powerup_torch.ogg'],
        ['sfx_powerup_time', 'assets/audio/sfx/sfx_powerup_time.ogg'],
        ['sfx_powerup_vision', 'assets/audio/sfx/sfx_powerup_vision.ogg'],
        ['sfx_gameover', 'assets/audio/sfx/sfx_gameover.ogg'],
        ['sfx_victory', 'assets/audio/sfx/sfx_victory.ogg'],
        ['sfx_keypress', 'assets/audio/sfx/sfx_keypress.ogg'],
    ];
    const allLoads = [
        ...bgmFiles.map(([k, p]) => loadAudio(k, p, 'bgm')),
        ...sfxFiles.map(([k, p]) => loadAudio(k, p, 'sfx')),
    ];
    return Promise.allSettled(allLoads);
}

// ─────────────────────────────────────────────────────────────
// BGM playback
// ─────────────────────────────────────────────────────────────

/**
 * Crossfades to the requested BGM track.
 * Safe to call every frame — it no-ops if the track is already playing
 * or if the same track is already fading in.
 *
 * @param {string} key  - one of the TRACKS keys, e.g. 'bgm_menu'
 */
export function playBgm(key) {
    if (!ctx || !bgm.buffers[key]) return;

    // Already playing this track
    if (bgm.current?.key === key) return;

    // Mid-crossfade to this same track — already on the way
    if (bgm.next?.key === key) return;

    // Mid-crossfade to a different track — queue for after it finishes
    if (bgm.next) {
        bgm.pending = key;
        return;
    }

    _startCrossfade(key);
}

/**
 * Stops all BGM immediately (or with a short fade).
 */
export function stopBgm() {
    _fadeTo(null);
}

function _startCrossfade(key) {
    const buf = bgm.buffers[key];
    if (!buf) return;

    const now = ctx.currentTime;
    const fadeS = CROSSFADE_MS / 1000;

    // Gain node for the incoming track
    const inGain = ctx.createGain();
    const targetVol = VOLUME.BGM * (VOLUME.TRACKS[key] ?? 1.0);
    inGain.gain.setValueAtTime(0, now);
    inGain.gain.linearRampToValueAtTime(targetVol, now + fadeS);
    inGain.connect(masterBgm);

    // Source node for the incoming track
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    source.connect(inGain);
    source.start(0);

    bgm.next = { key, source, gain: inGain };

    // Fade out the current track
    if (bgm.current) {
        const outGain = bgm.current.gain;
        outGain.gain.cancelScheduledValues(now);
        outGain.gain.setValueAtTime(outGain.gain.value, now);
        outGain.gain.linearRampToValueAtTime(0, now + fadeS);

        const oldSource = bgm.current.source;
        setTimeout(() => {
            try {
                oldSource.stop();
            } catch (_) {}
            try {
                outGain.disconnect();
            } catch (_) {}
        }, CROSSFADE_MS + 50);
    }

    // After the crossfade completes, promote next → current
    setTimeout(() => {
        bgm.current = bgm.next;
        bgm.next = null;

        // Play any queued track
        if (bgm.pending) {
            const p = bgm.pending;
            bgm.pending = null;
            _startCrossfade(p);
        }
    }, CROSSFADE_MS + 60);
}

function _fadeTo(key) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const fadeS = CROSSFADE_MS / 1000;

    if (bgm.current) {
        const outGain = bgm.current.gain;
        outGain.gain.cancelScheduledValues(now);
        outGain.gain.setValueAtTime(outGain.gain.value, now);
        outGain.gain.linearRampToValueAtTime(0, now + fadeS);
        const oldSource = bgm.current.source;
        setTimeout(() => {
            try {
                oldSource.stop();
            } catch (_) {}
            try {
                outGain.disconnect();
            } catch (_) {}
        }, CROSSFADE_MS + 50);
        bgm.current = null;
    }

    if (key) _startCrossfade(key);
}

// ─────────────────────────────────────────────────────────────
// SFX playback
// ─────────────────────────────────────────────────────────────

/**
 * Plays a one-shot sound effect.
 * Safe to call every frame for short sounds — each call is independent.
 *
 * @param {string} key  - e.g. 'sfx_hit'
 */
export function playSfx(key) {
    if (!ctx || !sfxBuffers[key]) return;
    resumeAudio();

    const vol = VOLUME.SFX * (VOLUME.SFX_TRACKS[key] ?? 1.0);
    const gain = ctx.createGain();
    gain.gain.value = vol;
    gain.connect(masterSfx);

    const source = ctx.createBufferSource();
    source.buffer = sfxBuffers[key];
    source.connect(gain);
    source.start(0);

    // Auto-cleanup after playback
    source.onended = () => {
        try {
            gain.disconnect();
        } catch (_) {}
    };
}

// ─────────────────────────────────────────────────────────────
// Runtime volume adjustment helpers
// ─────────────────────────────────────────────────────────────

/**
 * Change the master BGM volume at runtime.
 * Also updates the VOLUME.BGM constant so future crossfades use the new value.
 *
 * @param {number} vol  0.0 – 1.0
 */
export function setBgmVolume(vol) {
    VOLUME.BGM = Math.max(0, Math.min(1, vol));
    if (masterBgm)
        masterBgm.gain.linearRampToValueAtTime(
            VOLUME.BGM,
            ctx.currentTime + 0.1,
        );
}

/**
 * Change the master SFX volume at runtime.
 *
 * @param {number} vol  0.0 – 1.0
 */
export function setSfxVolume(vol) {
    VOLUME.SFX = Math.max(0, Math.min(1, vol));
    if (masterSfx)
        masterSfx.gain.linearRampToValueAtTime(
            VOLUME.SFX,
            ctx.currentTime + 0.1,
        );
}
