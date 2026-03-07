import { W, H, PAL } from "../config.js";
import { addFrame, addHeader, makeRetroText, beep } from "../objects/UI.js";

export default class TugScene extends Phaser.Scene {
    constructor() { super("Tug"); }

    create() {
        this.cameras.main.setBackgroundColor(PAL.BG);
        this.cameras.main.setPostPipeline("CRTPipeline");

        addFrame(this);
        addHeader(this, "TUG OF WAR");

        this.add.tileSprite(W / 2, H / 2, W, H, "tile").setAlpha(0.18);

        makeRetroText(this, W / 2, 130, "PRESS SPACE ON THE BEAT", 18, "#ffe35a");
        makeRetroText(this, W / 2, H - 60, "HIT: PULL • MISS: SLIP • FIRST TO WIN LINE • [ESC] HUD", 14, "#b7b7ff");

        // rope line
        this.midY = H / 2 + 30;
        this.line = this.add.rectangle(W / 2, this.midY, W - 160, 6, PAL.INK, 0.7);
        this.winL = this.add.rectangle(120, this.midY, 10, 60, PAL.RED, 0.9);
        this.winR = this.add.rectangle(W - 120, this.midY, 10, 60, PAL.GRN, 0.9);

        // marker position: 0..1 mapped to rope span
        this.t = 0.5;
        this.marker = this.add.rectangle(W / 2, this.midY, 18, 18, PAL.YEL, 1);

        // beat system
        this.bpm = 110;
        this.beatPeriod = 60 / this.bpm;
        this.beatPhase = 0;

        this.goodWindow = 0.14; // seconds
        this.pull = 0;

        this.scoreText = makeRetroText(this, W / 2, 170, "", 16, "#e8e8ff");

        this.keys = this.input.keyboard.addKeys({ space: "SPACE", esc: "ESC" });
        this.keys.esc.on("down", () => this.scene.start("Hud"));

        this.keys.space.on("down", () => this.onHit());

        this.time.addEvent({
            delay: this.beatPeriod * 1000,
            loop: true,
            callback: () => beep(this, 520, 0.02, "square", 0.02)
        });

        this.updateMarker();
        this.updateScore();
    }

    onHit() {
        // how close to beat?
        const dt = Math.abs(this.beatPhase);
        if (dt <= this.goodWindow) {
            // good hit: pull right
            this.t += 0.032 + (this.goodWindow - dt) * 0.05;
            beep(this, 880, 0.03, "square", 0.03);
        } else {
            // miss: slip left
            this.t -= 0.028;
            beep(this, 180, 0.04, "square", 0.03);
        }

        this.t = Phaser.Math.Clamp(this.t, 0, 1);
        this.updateMarker();
        this.updateScore();

        if (this.t >= 0.96) this.win();
        if (this.t <= 0.04) this.lose();
    }

    updateMarker() {
        const leftX = 160;
        const rightX = W - 160;
        this.marker.x = Phaser.Math.Linear(leftX, rightX, this.t);
    }

    updateScore() {
        const pct = Math.floor(this.t * 100);
        this.scoreText.setText(`ROPE: ${pct}%`);
    }

    win() {
        beep(this, 980, 0.08, "square", 0.04);
        this.registry.set("money", (this.registry.get("money") || 0) + 1600);
        const idx = this.registry.get("roundIndex") || 0;
        this.registry.set("roundIndex", Math.max(idx, 3));
        makeRetroText(this, W / 2, H / 2, "PULLED THROUGH", 34, "#48ff7a").setShadow(0, 3, "#000", 5, true, true);
        this.time.delayedCall(1100, () => this.scene.start("Hud"));
    }

    lose() {
        beep(this, 110, 0.12, "sawtooth", 0.04);
        this.registry.set("deaths", (this.registry.get("deaths") || 0) + 1);
        makeRetroText(this, W / 2, H / 2, "FELL", 34, "#ff3a3a").setShadow(0, 3, "#000", 5, true, true);
        this.time.delayedCall(1200, () => this.scene.start("Hud"));
    }

    update(_, dtMs) {
        const dt = dtMs / 1000;

        // beatPhase: 0 at beat, ranges roughly -period/2..+period/2
        this.beatPhase += dt;
        while (this.beatPhase > this.beatPeriod / 2) this.beatPhase -= this.beatPeriod;
    }
}