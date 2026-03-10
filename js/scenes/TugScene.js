// src/scenes/TugScene.js
// Adds:
// - teammates + competitors
// - chasm in middle
// - rope held by front players
// - elimination when front rope holder crosses over chasm
// - randomized size + strength
// - character archetypes:
//    big strong brute
//    tiny fast kid
//    old weak player
//    panicked teammate
//    balanced
// - archetypes affect pull strength, wobble, timing, and visuals

import { W, H, PAL } from "../config.js";
import { addFrame, addHeader, makeRetroText, beep } from "../objects/UI.js";

export default class TugScene extends Phaser.Scene {
    constructor() {
        super("Tug");
    }

    create() {
        this.cameras.main.setBackgroundColor(PAL.BG);

        addFrame(this);
        addHeader(this, "TUG OF WAR");

        this.bg = this.add.tileSprite(W / 2, H / 2, W, H, "tile").setAlpha(0.15);

        makeRetroText(this, W / 2, 130, "PRESS SPACE ON THE BEAT", 20, "#ffe35a");
        makeRetroText(this, W / 2, H - 60, "SPACE: PULL • ESC: MAIN MENU", 14, "#b7b7ff");

        this.midY = H / 2 + 30;

        // platforms
        this.leftPlat = this.add.rectangle(220, this.midY + 40, 300, 120, 0x23263a, 1)
            .setStrokeStyle(3, PAL.INK, 0.7);

        this.rightPlat = this.add.rectangle(W - 220, this.midY + 40, 300, 120, 0x23263a, 1)
            .setStrokeStyle(3, PAL.INK, 0.7);

        // chasm
        this.chasmX = W / 2;
        this.chasmWidth = 180;
        this.chasmLeft = this.chasmX - this.chasmWidth / 2;
        this.chasmRight = this.chasmX + this.chasmWidth / 2;

        this.add.rectangle(this.chasmX, this.midY + 40, this.chasmWidth, 150, 0x05060c, 1);
        this.chasmGlow = this.add.rectangle(this.chasmX, this.midY + 40, this.chasmWidth + 10, 160, PAL.RED, 0.08);

        const pitLines = this.add.graphics();
        pitLines.lineStyle(2, 0x111111, 0.9);
        for (let y = this.midY - 20; y < this.midY + 110; y += 14) {
            pitLines.beginPath();
            pitLines.moveTo(this.chasmLeft + 8, y);
            pitLines.lineTo(this.chasmRight - 8, y + 6);
            pitLines.strokePath();
        }

        // rope
        this.ropeLeftX = 260;
        this.ropeRightX = W - 260;
        this.t = 0.5;

        this.marker = this.add.rectangle(W / 2, this.midY, 24, 24, PAL.YEL, 1)
            .setStrokeStyle(2, PAL.INK, 0.8);

        this.ropeG = this.add.graphics().setDepth(5);

        // teams
        this.leftTeam = [];
        this.rightTeam = [];

        this.createTeam(this.leftTeam, 170, this.midY + 18, 4, PAL.GRN, 1, "ALLY");
        this.createTeam(this.rightTeam, W - 170, this.midY + 18, 4, PAL.RED, -1, "ENEMY");

        // show archetypes / strengths
        this.leftInfo = this.add.text(70, 180, "", {
            fontFamily: "monospace",
            fontSize: "12px",
            color: "#a8ffba",
            lineSpacing: 2
        });

        this.rightInfo = this.add.text(W - 70, 180, "", {
            fontFamily: "monospace",
            fontSize: "12px",
            color: "#ffb0b0",
            align: "right",
            lineSpacing: 2
        }).setOrigin(1, 0);

        this.updateTeamInfo();

        // beat system
        this.bpm = 110;
        this.beatPeriod = 60 / this.bpm;
        this.beatPhase = 0;
        this.goodWindow = 0.14;

        // AI
        this.aiTimer = 0;

        // controls
        this.keys = this.input.keyboard.addKeys({
            space: "SPACE",
            esc: "ESC"
        });

        this.keys.space.on("down", () => this.onHit());
        this.keys.esc.on("down", () => this.scene.start("Hub"));

        // beat click
        this.time.addEvent({
            delay: this.beatPeriod * 1000,
            loop: true,
            callback: () => beep(this, 520, 0.02, "square", 0.02)
        });

        this.updateMarker();
    }

    randomArchetype() {
        const roll = Math.random();

        if (roll < 0.22) {
            return {
                name: "BRUTE",
                strength: Phaser.Math.FloatBetween(1.45, 1.9),
                size: Phaser.Math.FloatBetween(1.18, 1.38),
                rhythm: Phaser.Math.FloatBetween(0.85, 1.0),
                panic: Phaser.Math.FloatBetween(0.0, 0.15),
                wobble: 0.5,
                lean: 1.2
            };
        }

        if (roll < 0.42) {
            return {
                name: "KID",
                strength: Phaser.Math.FloatBetween(0.75, 1.0),
                size: Phaser.Math.FloatBetween(0.78, 0.92),
                rhythm: Phaser.Math.FloatBetween(1.0, 1.18),
                panic: Phaser.Math.FloatBetween(0.1, 0.35),
                wobble: 1.25,
                lean: 0.9
            };
        }

        if (roll < 0.60) {
            return {
                name: "OLD",
                strength: Phaser.Math.FloatBetween(0.65, 0.95),
                size: Phaser.Math.FloatBetween(0.9, 1.02),
                rhythm: Phaser.Math.FloatBetween(0.78, 0.95),
                panic: Phaser.Math.FloatBetween(0.15, 0.4),
                wobble: 0.8,
                lean: 0.75
            };
        }

        if (roll < 0.78) {
            return {
                name: "PANIC",
                strength: Phaser.Math.FloatBetween(0.85, 1.2),
                size: Phaser.Math.FloatBetween(0.92, 1.08),
                rhythm: Phaser.Math.FloatBetween(0.7, 1.25),
                panic: Phaser.Math.FloatBetween(0.45, 0.9),
                wobble: 1.55,
                lean: 1.0
            };
        }

        return {
            name: "BAL",
            strength: Phaser.Math.FloatBetween(0.95, 1.25),
            size: Phaser.Math.FloatBetween(0.95, 1.12),
            rhythm: Phaser.Math.FloatBetween(0.92, 1.08),
            panic: Phaser.Math.FloatBetween(0.05, 0.2),
            wobble: 1.0,
            lean: 1.0
        };
    }

    createTeam(teamArr, baseX, baseY, count, color, facing, sideLabel) {
        for (let i = 0; i < count; i++) {
            const arche = this.randomArchetype();

            const x = baseX + i * 26 * -facing;
            const y = baseY + (i % 2) * 18 - 10;

            const c = this.add.container(x, y);
            c.setScale(arche.size);

            const g = this.add.graphics();
            g.lineStyle(2, color, 1);

            // head
            g.strokeCircle(0, -16, 6);

            // body
            g.beginPath();
            g.moveTo(0, -10);
            g.lineTo(0, 8);
            g.strokePath();

            // rear arm
            g.beginPath();
            g.moveTo(0, -3);
            g.lineTo(-8 * facing, -1);
            g.strokePath();

            // rope arm
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(12 * facing, 2);
            g.strokePath();

            // legs
            g.beginPath();
            g.moveTo(0, 8);
            g.lineTo(-5, 17);
            g.moveTo(0, 8);
            g.lineTo(5, 17);
            g.strokePath();

            // simple visual variation by archetype
            if (arche.name === "BRUTE") {
                g.lineStyle(3, color, 1);
                g.beginPath();
                g.moveTo(-4, -7);
                g.lineTo(4, -7);
                g.strokePath();
            } else if (arche.name === "OLD") {
                g.lineStyle(1, color, 0.9);
                g.beginPath();
                g.moveTo(0, -2);
                g.lineTo(8 * facing, 14);
                g.strokePath();
            } else if (arche.name === "PANIC") {
                g.lineStyle(1, color, 1);
                g.beginPath();
                g.moveTo(-3, -18);
                g.lineTo(-1, -20);
                g.moveTo(3, -18);
                g.lineTo(1, -20);
                g.strokePath();
            }

            c.add(g);

            teamArr.push({
                container: c,
                baseX: x,
                baseY: y,
                facing,
                sideLabel,
                fall: 0,
                swaySeed: Math.random() * 10,

                strength: arche.strength,
                size: arche.size,
                rhythm: arche.rhythm,
                panic: arche.panic,
                wobble: arche.wobble,
                lean: arche.lean,
                archetype: arche.name,

                handLocalX: 12 * facing,
                handLocalY: 2
            });
        }
    }

    teamStrength(team) {
        let total = 0;
        for (const m of team) total += m.strength;
        return total / team.length;
    }

    teamRhythm(team) {
        let total = 0;
        for (const m of team) total += m.rhythm;
        return total / team.length;
    }

    updateTeamInfo() {
        const fmt = m => `${m.archetype} ${m.strength.toFixed(2)}x`;
        this.leftInfo.setText([
            "ALLY TEAM",
            ...this.leftTeam.map(fmt),
            `AVG ${this.teamStrength(this.leftTeam).toFixed(2)}x`
        ].join("\n"));

        this.rightInfo.setText([
            "ENEMY TEAM",
            ...this.rightTeam.map(fmt),
            `AVG ${this.teamStrength(this.rightTeam).toFixed(2)}x`
        ].join("\n"));
    }

    onHit() {
        const dt = Math.abs(this.beatPhase);
        const leftPower = this.teamStrength(this.leftTeam);
        const rightPower = this.teamStrength(this.rightTeam);

        if (dt <= this.goodWindow) {
            this.t += (0.022 + (this.goodWindow - dt) * 0.05) * leftPower;
            beep(this, 880, 0.03, "square", 0.03);

            this.bumpTeam(this.leftTeam, 0.85);
            this.bumpTeam(this.rightTeam, -0.35);
        } else {
            this.t -= 0.018 * rightPower;
            beep(this, 180, 0.04, "square", 0.03);

            this.bumpTeam(this.leftTeam, -0.35);
            this.bumpTeam(this.rightTeam, 0.55);
        }

        this.t = Phaser.Math.Clamp(this.t, 0, 1);
        this.updateMarker();
        this.checkChasmElimination();
        if (this.ended) return;

        if (this.t >= 0.93) this.win();
        if (this.t <= 0.07) this.lose();
    }

    aiPull(dt) {
        this.aiTimer += dt;

        const beatNear = Math.abs(this.beatPhase);
        const rightPower = this.teamStrength(this.rightTeam);
        const rightRhythm = this.teamRhythm(this.rightTeam);

        if (beatNear < 0.08 && this.aiTimer > this.beatPeriod * (0.50 / rightRhythm + 0.15)) {
            this.aiTimer = 0;

            const successChance = Phaser.Math.Clamp(0.55 + (rightRhythm - 1) * 0.22, 0.35, 0.88);

            if (Math.random() < successChance) {
                this.t -= 0.016 * rightPower;
                this.bumpTeam(this.rightTeam, 0.8);
                this.bumpTeam(this.leftTeam, -0.28);
            } else {
                this.t += 0.008;
                this.bumpTeam(this.rightTeam, -0.2);
            }

            this.t = Phaser.Math.Clamp(this.t, 0, 1);
            this.updateMarker();
            this.checkChasmElimination();
            if (this.ended) return;

            if (this.t >= 0.93) this.win();
            if (this.t <= 0.07) this.lose();
        }
    }

    bumpTeam(team, amt) {
        for (const m of team) {
            const power = amt * m.strength;
            const panicJitter = (Math.random() - 0.5) * 0.15 * m.panic;

            m.fall = Phaser.Math.Clamp(
                m.fall + power * 0.55 + panicJitter,
                -1.5,
                1.5
            );
        }
    }

    updateMarker() {
        this.marker.x = Phaser.Math.Linear(this.ropeLeftX, this.ropeRightX, this.t);
    }

    animateTeams() {
        const now = this.time.now * 0.005;

        const leftGripX = this.marker.x - 14;
        const rightGripX = this.marker.x + 14;
        const gripY = this.midY;

        for (let i = 0; i < this.leftTeam.length; i++) {
            const m = this.leftTeam[i];
            const sway = Math.sin(now * m.wobble + m.swaySeed) * (2 + m.panic * 2);

            const handX = leftGripX - i * (22 + (1.15 - m.size) * 6);
            const handY = gripY + (i % 2) * 10 - 6;

            m.container.x = handX - m.handLocalX + (this.t - 0.5) * (70 + (m.strength - 1) * 8) - m.fall * 6;
            m.container.y = handY - m.handLocalY + sway + Math.abs(m.fall) * 2;
            m.container.rotation = -0.10 * m.lean - m.fall * 0.10 + (m.strength - 1) * 0.05;
        }

        for (let i = 0; i < this.rightTeam.length; i++) {
            const m = this.rightTeam[i];
            const sway = Math.sin(now * m.wobble + m.swaySeed) * (2 + m.panic * 2);

            const handX = rightGripX + i * (22 + (1.15 - m.size) * 6);
            const handY = gripY + (i % 2) * 10 - 6;

            m.container.x = handX - m.handLocalX + (this.t - 0.5) * (70 + (m.strength - 1) * 8) - m.fall * 6;
            m.container.y = handY - m.handLocalY + sway + Math.abs(m.fall) * 2;
            m.container.rotation = 0.10 * m.lean + m.fall * 0.10 - (m.strength - 1) * 0.05;
        }

        // rope
        this.ropeG.clear();
        this.ropeG.lineStyle(3, PAL.INK, 0.95);

        const leftFront = this.leftTeam[0];
        const rightFront = this.rightTeam[0];

        const lx = leftFront.container.x + leftFront.handLocalX;
        const ly = leftFront.container.y + leftFront.handLocalY;

        const rx = rightFront.container.x + rightFront.handLocalX;
        const ry = rightFront.container.y + rightFront.handLocalY;

        this.ropeG.beginPath();
        this.ropeG.moveTo(lx, ly);
        this.ropeG.lineTo(this.marker.x - 10, this.midY);
        this.ropeG.lineTo(this.marker.x + 10, this.midY);
        this.ropeG.lineTo(rx, ry);
        this.ropeG.strokePath();
    }

    checkChasmElimination() {
        if (this.ended) return;

        const leftFront = this.leftTeam[0];
        const rightFront = this.rightTeam[0];

        const leftHandX = leftFront.container.x + leftFront.handLocalX;
        const rightHandX = rightFront.container.x + rightFront.handLocalX;

        if (leftHandX >= this.chasmLeft && leftHandX <= this.chasmRight) {
            this.lose();
            return;
        }

        if (rightHandX >= this.chasmLeft && rightHandX <= this.chasmRight) {
            this.win();
        }
    }

    animateFalls(team, dir) {
        this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 850,
            onUpdate: tw => {
                const v = tw.getValue();

                for (const m of team) {
                    m.container.rotation = dir * (0.25 + v * (1.1 + m.panic * 0.4));
                    m.container.y = m.baseY + v * 70;
                    m.container.x = m.baseX + dir * v * (60 + (m.strength - 1) * 20);
                    m.container.alpha = 1 - v * 0.35;
                }
            }
        });
    }

    win() {
        if (this.ended) return;
        this.ended = true;

        beep(this, 980, 0.08, "square", 0.04);
        this.animateFalls(this.rightTeam, 1);

        makeRetroText(this, W / 2, H / 2 - 30, "THEY FELL INTO THE CHASM", 28, "#48ff7a");

        this.time.delayedCall(1200, () => this.scene.start("Hub"));
    }

    lose() {
        if (this.ended) return;
        this.ended = true;

        beep(this, 110, 0.12, "sawtooth", 0.04);
        this.animateFalls(this.leftTeam, -1);

        makeRetroText(this, W / 2, H / 2 - 30, "YOUR TEAM FELL", 34, "#ff3a3a");

        this.time.delayedCall(1200, () => this.scene.start("Hub"));
    }

    update(_, dtMs) {
        if (this.ended) return;

        const dt = dtMs / 1000;

        this.beatPhase += dt;
        while (this.beatPhase > this.beatPeriod / 2) {
            this.beatPhase -= this.beatPeriod;
        }

        this.aiPull(dt);
        if (this.ended) return;

        this.animateTeams();
        this.checkChasmElimination();

        this.chasmGlow.alpha = 0.06 + Math.sin(this.time.now * 0.01) * 0.02;
    }
}