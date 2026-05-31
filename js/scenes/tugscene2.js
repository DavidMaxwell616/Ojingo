// src/scenes/TugScene.js

import { W, H, PAL } from "../config.js";
import {
    addFrame,
    addHeader,
    makeRetroText,
    beep
} from "../objects/UI.js";

export default class TugScene extends Phaser.Scene {

    constructor() {
        super("TugScene");
    }

    create() {

        this.cameras.main.setBackgroundColor(PAL.BG);

        addFrame(this);
        addHeader(this, "TUG OF WAR");

        this.midY = H / 2 + 10;

        /* BACKGROUND */

        this.add.rectangle(W / 2, H / 2, W, H, 0x070818, 1);

        /* CHASM */

        this.chasmWidth = 190;
        this.chasmLeft = W / 2 - this.chasmWidth / 2;
        this.chasmRight = W / 2 + this.chasmWidth / 2;

        this.add.rectangle(
            W / 2,
            this.midY + 52,
            this.chasmWidth,
            170,
            0x000000,
            1
        ).setStrokeStyle(4, PAL.RED, 0.35);

        /* PLATFORM SUPPORTS */

        const supportG = this.add.graphics();

        supportG.lineStyle(4, 0x544100, 1);

        // left supports
        supportG.beginPath();
        supportG.moveTo(110, this.midY + 90);
        supportG.lineTo(190, H - 20);

        supportG.moveTo(350, this.midY + 90);
        supportG.lineTo(270, H - 20);

        supportG.strokePath();

        // right supports
        supportG.beginPath();
        supportG.moveTo(W - 110, this.midY + 90);
        supportG.lineTo(W - 190, H - 20);

        supportG.moveTo(W - 350, this.midY + 90);
        supportG.lineTo(W - 270, H - 20);

        supportG.strokePath();

        /* PLATFORMS */

        this.leftPlat = this.add.rectangle(
            230,
            this.midY + 42,
            330,
            70,
            0xc99718,
            1
        ).setStrokeStyle(4, PAL.INK, 1);

        this.rightPlat = this.add.rectangle(
            W - 230,
            this.midY + 42,
            330,
            70,
            0xc99718,
            1
        ).setStrokeStyle(4, PAL.INK, 1);

        /* PLATFORM STRIPES */

        for (let x = 80; x < 380; x += 28) {

            this.add.rectangle(
                x,
                this.midY + 78,
                16,
                6,
                0x111111,
                1
            );

        }

        for (let x = W - 380; x < W - 80; x += 28) {

            this.add.rectangle(
                x,
                this.midY + 78,
                16,
                6,
                0x111111,
                1
            );

        }

        /* CENTER HANGING ROPE */

        this.add.line(
            W / 2,
            0,
            0,
            70,
            0,
            this.midY - 10,
            PAL.YEL,
            0.6
        ).setLineWidth(3);

        /* HUD */

        makeRetroText(
            this,
            W / 2,
            92,
            "PULL ON THE BEAT!",
            22,
            "#ffe35a"
        );

        makeRetroText(
            this,
            140,
            120,
            "YOUR TEAM",
            16,
            "#48ff7a"
        );

        makeRetroText(
            this,
            W - 140,
            120,
            "ENEMY TEAM",
            16,
            "#ff3a3a"
        );

        makeRetroText(
            this,
            W / 2,
            H - 36,
            "SPACE: PULL   |   ESC: MENU",
            16,
            "#ffe35a"
        );

        /* ROPE */

        this.ropeLeftX = 265;
        this.ropeRightX = W - 265;

        this.t = 0.5;

        this.marker = this.add.rectangle(
            W / 2,
            this.midY,
            20,
            20,
            PAL.YEL,
            1
        ).setStrokeStyle(3, PAL.INK, 1);

        this.ropeShadowG = this.add.graphics().setDepth(40);
        this.ropeG = this.add.graphics().setDepth(41);

        /* TEAMS */

        this.leftTeam = [];
        this.rightTeam = [];

        this.createTeam(
            this.leftTeam,
            170,
            this.midY + 14,
            5,
            PAL.GRN,
            1
        );

        this.createTeam(
            this.rightTeam,
            W - 170,
            this.midY + 14,
            5,
            PAL.RED,
            -1
        );

        /* BEAT */

        this.bpm = 110;
        this.beatPeriod = 60 / this.bpm;
        this.beatPhase = 0;
        this.goodWindow = 0.14;

        /* AI */

        this.aiTimer = 0;

        /* INPUT */

        this.keys = this.input.keyboard.addKeys({
            space: "SPACE",
            esc: "ESC"
        });

        this.keys.space.on("down", () => this.onHit());

        this.keys.esc.on(
            "down",
            () => this.scene.start("Hub")
        );

        /* CLICK TRACK */

        this.time.addEvent({
            delay: this.beatPeriod * 1000,
            loop: true,
            callback: () => {
                beep(this, 520, 0.02);
            }
        });

        this.updateMarker();
    }

    /* RANDOM TEAM TYPES */

    randomArchetype() {

        const types = [

            {
                name: "BRUTE",
                strength: 1.7,
                size: 1.35
            },

            {
                name: "KID",
                strength: 0.9,
                size: 0.82
            },

            {
                name: "OLD",
                strength: 0.7,
                size: 1.0
            },

            {
                name: "BAL",
                strength: 1.2,
                size: 1.08
            }

        ];

        return Phaser.Utils.Array.GetRandom(types);
    }

    /* CREATE TEAM */

    createTeam(
        teamArr,
        baseX,
        baseY,
        count,
        color,
        facing
    ) {

        for (let i = 0; i < count; i++) {

            const arche = this.randomArchetype();

            const x = baseX + i * 30 * -facing;
            const y = baseY + (i % 2) * 14;

            const c = this.add.container(x, y)
                .setDepth(20);

            c.setScale(arche.size);

            const g = this.add.graphics();

            g.lineStyle(3, color, 1);

            /* HEAD */

            g.strokeCircle(0, -16, 6);

            /* BODY */

            g.beginPath();
            g.moveTo(0, -10);
            g.lineTo(0, 10);
            g.strokePath();

            /* ARMS */

            g.beginPath();
            g.moveTo(-8, -2);
            g.lineTo(12 * facing, 0);
            g.strokePath();

            /* LEGS */

            g.beginPath();
            g.moveTo(0, 10);
            g.lineTo(-5, 20);

            g.moveTo(0, 10);
            g.lineTo(5, 20);

            g.strokePath();

            /* BRUTE */

            if (arche.name === "BRUTE") {

                g.lineStyle(4, color, 1);

                g.beginPath();
                g.moveTo(-6, -8);
                g.lineTo(6, -8);
                g.strokePath();

            }

            /* OLD */

            if (arche.name === "OLD") {

                c.rotation = 0.12 * facing;

            }

            c.add(g);

            teamArr.push({

                container: c,

                strength: arche.strength,
                size: arche.size,

                handLocalX: 12 * facing,
                handLocalY: 0,

                swaySeed: Math.random() * 10,

                fall: 0,
                facing

            });

        }

    }

    /* TEAM POWER */

    teamStrength(team) {

        let s = 0;

        for (const m of team)
            s += m.strength;

        return s / team.length;
    }

    /* PLAYER HIT */

    onHit() {

        const dt = Math.abs(this.beatPhase);

        const leftPower =
            this.teamStrength(this.leftTeam);

        const rightPower =
            this.teamStrength(this.rightTeam);

        if (dt <= this.goodWindow) {

            this.t += 0.022 * leftPower;

            beep(this, 880, 0.03);

            this.bumpTeam(this.leftTeam, 1);
            this.bumpTeam(this.rightTeam, -0.35);

        } else {

            this.t -= 0.02 * rightPower;

            beep(this, 180, 0.04);

            this.bumpTeam(this.leftTeam, -0.3);
            this.bumpTeam(this.rightTeam, 0.6);

        }

        this.t = Phaser.Math.Clamp(
            this.t,
            0,
            1
        );

        this.updateMarker();

        this.checkChasm();
    }

    /* AI */

    aiPull(dt) {

        this.aiTimer += dt;

        if (
            Math.abs(this.beatPhase) < 0.08 &&
            this.aiTimer > 0.52
        ) {

            this.aiTimer = 0;

            this.t -=
                0.014 *
                this.teamStrength(this.rightTeam);

            this.updateMarker();
        }

    }

    /* TEAM BALANCE */

    bumpTeam(team, amt) {

        for (const m of team) {

            m.fall = Phaser.Math.Clamp(
                m.fall + amt * m.strength * 0.45,
                -1.5,
                1.5
            );

        }

    }

    /* MARKER */

    updateMarker() {

        this.marker.x = Phaser.Math.Linear(
            this.ropeLeftX,
            this.ropeRightX,
            this.t
        );

    }

    /* TEAM ANIMATION */

    animateTeams() {

        const now = this.time.now * 0.006;

        const leftGripX = this.marker.x - 14;
        const rightGripX = this.marker.x + 14;

        const gripY = this.midY;

        /* LEFT */

        for (let i = 0; i < this.leftTeam.length; i++) {

            const m = this.leftTeam[i];

            const sway =
                Math.sin(now + m.swaySeed) * 2;

            const handX =
                leftGripX - i * 28;

            const handY =
                gripY + (i % 2) * 10;

            m.container.x =
                handX -
                m.handLocalX +
                (this.t - 0.5) * 70 -
                m.fall * 6;

            m.container.y =
                handY -
                m.handLocalY +
                sway;

            m.container.rotation =
                -0.1 -
                m.fall * 0.1;

        }

        /* RIGHT */

        for (let i = 0; i < this.rightTeam.length; i++) {

            const m = this.rightTeam[i];

            const sway =
                Math.sin(now + m.swaySeed) * 2;

            const handX =
                rightGripX + i * 28;

            const handY =
                gripY + (i % 2) * 10;

            m.container.x =
                handX -
                m.handLocalX +
                (this.t - 0.5) * 70 -
                m.fall * 6;

            m.container.y =
                handY -
                m.handLocalY +
                sway;

            m.container.rotation =
                0.1 +
                m.fall * 0.1;

        }

        /* ROPE */

        const leftFront =
            this.leftTeam[0];

        const rightFront =
            this.rightTeam[0];

        const lx =
            leftFront.container.x +
            leftFront.handLocalX;

        const ly =
            leftFront.container.y +
            leftFront.handLocalY;

        const rx =
            rightFront.container.x +
            rightFront.handLocalX;

        const ry =
            rightFront.container.y +
            rightFront.handLocalY;

        /* SHADOW */

        this.ropeShadowG.clear();

        this.ropeShadowG.lineStyle(
            7,
            0x000000,
            0.65
        );

        this.ropeShadowG.beginPath();

        this.ropeShadowG.moveTo(lx, ly);

        this.ropeShadowG.lineTo(
            this.marker.x,
            this.midY
        );

        this.ropeShadowG.lineTo(rx, ry);

        this.ropeShadowG.strokePath();

        /* MAIN */

        this.ropeG.clear();

        this.ropeG.lineStyle(
            5,
            0xf2e6c9,
            1
        );

        this.ropeG.beginPath();

        this.ropeG.moveTo(lx, ly);

        this.ropeG.lineTo(
            this.marker.x,
            this.midY
        );

        this.ropeG.lineTo(rx, ry);

        this.ropeG.strokePath();

    }

    /* CHASM */

    checkChasm() {

        if (this.ended) return;

        const leftFront =
            this.leftTeam[0];

        const rightFront =
            this.rightTeam[0];

        const lx =
            leftFront.container.x +
            leftFront.handLocalX;

        const rx =
            rightFront.container.x +
            rightFront.handLocalX;

        if (
            lx >= this.chasmLeft &&
            lx <= this.chasmRight
        ) {

            this.lose();
            return;

        }

        if (
            rx >= this.chasmLeft &&
            rx <= this.chasmRight
        ) {

            this.win();

        }

    }

    /* WIN */

    win() {

        if (this.ended) return;

        this.ended = true;

        makeRetroText(
            this,
            W / 2,
            H / 2 - 40,
            "YOU WIN",
            36,
            "#48ff7a"
        );

        this.time.delayedCall(
            1200,
            () => this.scene.start("Hub")
        );

    }

    /* LOSE */

    lose() {

        if (this.ended) return;

        this.ended = true;

        makeRetroText(
            this,
            W / 2,
            H / 2 - 40,
            "YOU FELL",
            36,
            "#ff3a3a"
        );

        this.time.delayedCall(
            1200,
            () => this.scene.start("Hub")
        );

    }

    /* UPDATE */

    update(_, dtMs) {

        if (this.ended) return;

        const dt = dtMs / 1000;

        this.beatPhase += dt;

        while (
            this.beatPhase >
            this.beatPeriod / 2
        ) {

            this.beatPhase -=
                this.beatPeriod;

        }

        this.aiPull(dt);

        this.animateTeams();

        this.checkChasm();

    }

}