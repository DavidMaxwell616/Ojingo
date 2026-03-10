import { W, H, PAL } from "../config.js";
import { addFrame, addHeader, makeRetroText, beep } from "../objects/UI.js";

export default class GlassBridgeScene extends Phaser.Scene {
    constructor() {
        super("GlassBridge");
    }

    create() {
        this.cameras.main.setBackgroundColor(PAL.BG);

        addFrame(this);
        addHeader(this, "GLASS BRIDGE");
        makeRetroText(this, W / 2, 90, "UP / DOWN TO CHOOSE • RIGHT TO JUMP • ESC TO MAIN MENU", 16, "#b7b7ff");

        this.input.keyboard.on("keydown-ESC", () => this.scene.start("Hub"));

        this.rows = 8;
        this.cols = 2;
        this.startX = 220;
        this.gapX = 64;
        this.stepX = 80;
        this.topY = 220;
        this.botY = 300;

        this.safePath = [];
        this.panels = [];

        // background chasm
        this.add.rectangle(W / 2, H / 2 + 20, W - 180, 220, 0x05060c, 1);

        for (let i = 0; i < this.rows; i++) {
            const safe = Phaser.Math.Between(0, 1);
            this.safePath.push(safe);

            const x = this.startX + i * this.stepX;
            const top = this.add.rectangle(x, this.topY, 52, 22, 0x99dfff, 0.65).setStrokeStyle(2, 0xffffff, 0.35);
            const bot = this.add.rectangle(x, this.botY, 52, 22, 0x99dfff, 0.65).setStrokeStyle(2, 0xffffff, 0.35);

            this.panels.push([top, bot]);
        }

        // player stickman
        this.player = this.createStickMan(this.startX - 90, this.topY, PAL.YEL);
        this.playerRow = -1;
        this.playerLane = 0; // 0 top, 1 bottom
        this.jumping = false;
        this.dead = false;
        this.won = false;

        this.cursors = this.input.keyboard.createCursorKeys();
        this.cursors.up.on("down", () => {
            if (!this.jumping && this.playerRow < this.rows - 1) this.setLane(0);
        });
        this.cursors.down.on("down", () => {
            if (!this.jumping && this.playerRow < this.rows - 1) this.setLane(1);
        });
        this.cursors.right.on("down", () => {
            if (!this.jumping && !this.dead && !this.won) this.jumpForward();
        });

        this.otherPlayers = [];
        for (let i = 0; i < 3; i++) {
            const p = this.createStickMan(this.startX - 130 - i * 28, this.topY + i * 18, PAL.WHITE);
            this.otherPlayers.push({
                sprite: p,
                row: -1,
                lane: Phaser.Math.Between(0, 1),
                alive: true,
                thinkAt: this.time.now + 800 + i * 350
            });
        }
    }

    createStickMan(x, y, color) {
        const c = this.add.container(x, y);
        const g = this.add.graphics();
        g.lineStyle(2, color, 1);

        g.strokeCircle(0, -14, 6);

        g.beginPath();
        g.moveTo(0, -8);
        g.lineTo(0, 8);
        g.strokePath();

        g.beginPath();
        g.moveTo(-6, -2);
        g.lineTo(6, -2);
        g.strokePath();

        g.beginPath();
        g.moveTo(0, 8);
        g.lineTo(-5, 16);
        g.moveTo(0, 8);
        g.lineTo(5, 16);
        g.strokePath();

        c.add(g);
        return c;
    }

    setLane(lane) {
        this.playerLane = lane;
        this.player.y = lane === 0 ? this.topY : this.botY;
    }

    jumpForward() {
        this.jumping = true;
        const nextRow = this.playerRow + 1;

        const targetX = nextRow >= this.rows
            ? this.startX + this.rows * this.stepX
            : this.startX + nextRow * this.stepX;

        const targetY = this.playerLane === 0 ? this.topY : this.botY;

        this.tweens.add({
            targets: this.player,
            x: targetX,
            y: targetY,
            duration: 240,
            ease: "Sine.easeOut",
            onComplete: () => {
                this.playerRow = nextRow;
                this.jumping = false;

                if (this.playerRow >= this.rows) {
                    this.win();
                    return;
                }

                const safeLane = this.safePath[this.playerRow];
                if (safeLane !== this.playerLane) {
                    this.breakPanelAndFall(this.player, this.panels[this.playerRow][this.playerLane], true);
                } else {
                    beep(this, 600, 0.03);
                }
            }
        });
    }

    breakPanelAndFall(actor, panel, isPlayer = false, aiRef = null) {
        beep(this, 120, 0.06);
        panel.fillColor = 0x223344;
        panel.alpha = 0.25;

        this.tweens.add({
            targets: panel,
            angle: Phaser.Math.Between(-20, 20),
            alpha: 0,
            y: panel.y + 40,
            duration: 500
        });

        this.tweens.add({
            targets: actor,
            y: actor.y + 180,
            angle: Phaser.Math.Between(-80, 80),
            alpha: 0.2,
            duration: 700,
            onComplete: () => {
                if (isPlayer) {
                    this.dead = true;
                    makeRetroText(this, W / 2, H / 2, "YOU FELL", 34, "#ff3a3a");
                    this.time.delayedCall(1200, () => this.scene.start("Hub"));
                } else if (aiRef) {
                    aiRef.alive = false;
                }
            }
        });
    }

    aiUpdate() {
        const now = this.time.now;

        for (const ai of this.otherPlayers) {
            if (!ai.alive || now < ai.thinkAt) continue;

            ai.thinkAt = now + Phaser.Math.Between(900, 1700);

            const nextRow = ai.row + 1;
            if (nextRow >= this.rows) continue;

            const x = this.startX + nextRow * this.stepX;
            const lane = Phaser.Math.Between(0, 1);
            const y = lane === 0 ? this.topY : this.botY;

            ai.lane = lane;

            this.tweens.add({
                targets: ai.sprite,
                x,
                y,
                duration: 240,
                onComplete: () => {
                    ai.row = nextRow;
                    const safeLane = this.safePath[ai.row];

                    if (safeLane !== ai.lane) {
                        this.breakPanelAndFall(ai.sprite, this.panels[ai.row][ai.lane], false, ai);
                    }
                }
            });
        }
    }

    win() {
        if (this.won) return;
        this.won = true;
        beep(this, 820, 0.05);
        makeRetroText(this, W / 2, H / 2, "YOU CROSSED", 34, "#48ff7a");
        this.time.delayedCall(1000, () => this.scene.start("Hub"));
    }

    update() {
        if (this.dead || this.won) return;

        this.player.rotation = this.jumping ? 0.12 : Math.sin(this.time.now * 0.01) * 0.05;
        this.aiUpdate();
    }
}