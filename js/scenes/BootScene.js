import { W, H, PAL } from "../config.js";
import { CRTPipeline } from "../fx/CRTPipeline.js";

export default class BootScene extends Phaser.Scene {
    constructor() { super("Boot"); }

    preload() {
        this.load.path = "../../assets/spritesheets/";
        this.load.spritesheet('stickman', 'stickman.png', {
            frameWidth: 76,
            frameHeight: 123
        });

    }

    create() {


        // Create 1x1 pixel texture "px"
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 1, 1);
        g.generateTexture("px", 1, 1);
        g.clear();

        // Simple tile texture for floors
        g.fillStyle(PAL.DK, 1);
        g.fillRect(0, 0, 32, 32);
        g.lineStyle(2, PAL.BLU, 0.35);
        g.strokeRect(1, 1, 30, 30);
        g.lineStyle(1, PAL.CYAN, 0.18);
        g.beginPath();
        g.moveTo(0, 16); g.lineTo(32, 16);
        g.moveTo(16, 0); g.lineTo(16, 32);
        g.strokePath();
        g.generateTexture("tile", 32, 32);
        g.destroy();

        // Add CRT PostFX pipeline
        const renderer = this.game.renderer;
        if (renderer && renderer.pipelines) {
            const crt = renderer.pipelines.get("CRTPipeline");
            if (!crt) {
                renderer.pipelines.addPostPipeline("CRTPipeline", CRTPipeline);
            }
        }

        // Global registry defaults
        this.registry.set("roundIndex", 0);
        this.registry.set("money", 0);
        this.registry.set("deaths", 0);

        this.scene.start("Menu");
    }
}