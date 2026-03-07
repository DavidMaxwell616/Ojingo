import { PAL, W, H, GAME_TITLE } from "../config.js";

export function makeRetroText(scene, x, y, text, size = 18, color = "#e8e8ff") {
    return scene.add.text(x, y, text, {
        fontFamily: "monospace",
        fontSize: `${size}px`,
        color,
        stroke: "#000000",
        strokeThickness: 3
    }).setOrigin(0.5);
}

export function addFrame(scene) {
    const g = scene.add.graphics();
    g.lineStyle(4, PAL.INK, 1);
    g.strokeRoundedRect(18, 18, W - 36, H - 36, 14);
    g.lineStyle(2, PAL.CYAN, 0.6);
    g.strokeRoundedRect(26, 26, W - 52, H - 52, 12);
    g.setScrollFactor(0);
    return g;
}

export function addHeader(scene, subtitle) {
    const title = makeRetroText(scene, W / 2, 52, GAME_TITLE, 34, "#35f2ff");
    const sub = makeRetroText(scene, W / 2, 88, subtitle, 16, "#e8e8ff");
    title.setShadow(0, 2, "#000", 4, true, true);
    sub.setShadow(0, 2, "#000", 2, true, true);
    return { title, sub };
}

export function beep(scene, freq = 440, dur = 0.06, type = "square", vol = 0.03) {
    // Minimal WebAudio beep (no external files)
    const ctx = scene.sound.context;
    if (!ctx) return;

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;

    o.connect(g);
    g.connect(ctx.destination);

    const t0 = ctx.currentTime;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    o.start(t0);
    o.stop(t0 + dur);
}