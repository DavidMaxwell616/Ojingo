import { W, H, PAL } from "../config.js";
import { addFrame, addHeader, makeRetroText, beep } from "../objects/UI.js";

export default class MenuScene extends Phaser.Scene {
    constructor() { super("Menu"); }

    create() {
        this.cameras.main.setBackgroundColor(PAL.BG);
        this.cameras.main.setPostPipeline("CRTPipeline");

        addFrame(this);
        addHeader(this, "RETRO ARCADE SURVIVAL GAUNTLET");

        const hint = makeRetroText(this, W / 2, H / 2 + 40, "PRESS [SPACE] TO ENTER", 18, "#ffe35a");
        hint.setAlpha(0.95);

        this.add.text(W / 2, H / 2 - 30,
            "WIN CHILDHOOD GAMES.\nLOSE YOUR PIXELS.",
            { fontFamily: "monospace", fontSize: "22px", color: "#e8e8ff", align: "center", lineSpacing: 8 }
        ).setOrigin(0.5).setShadow(0, 2, "#000", 3, true, true);

        this.input.keyboard.on("keydown-SPACE", () => {
            beep(this, 660, 0.05, "square", 0.04);
            this.scene.start("Hub");
        });
    }
}