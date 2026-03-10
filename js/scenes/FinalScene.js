import { W, H, PAL } from "../config.js";

import { addFrame, addHeader, makeRetroText, beep } from "../objects/UI.js";

function centroid(pts) {
    let x = 0, y = 0;
    for (const p of pts) { x += p.x; y += p.y; }
    return { x: x / pts.length, y: y / pts.length };
}

function scalePoly(pts, s) {
    const c = centroid(pts);
    return pts.map(p => ({ x: c.x + (p.x - c.x) * s, y: c.y + (p.y - c.y) * s }));
}

function contains(poly, x, y) {
    return Phaser.Geom.Polygon.Contains(poly, x, y);
}

export default class FinalScene extends Phaser.Scene {
    constructor() { super("Final"); }

    create() {
        this.cameras.main.setBackgroundColor(PAL.BG);
        this.cameras.main.setPostPipeline("CRTPipeline");

        addFrame(this);
        addHeader(this, "OJINGO FINAL ARENA");

        this.add.tileSprite(W / 2, H / 2, W, H, "tile").setAlpha(0.18);

        makeRetroText(this, W / 2, 130, "ATTACKER: HOP → BRIDGE/ENTRY → TWO FEET → REACH HEAD", 16, "#ffe35a");
        makeRetroText(this, W / 2, H - 60, "WASD/ARROWS MOVE • SPACE HOP BOOST • [ESC] MAIN MENU", 14, "#b7b7ff");

        // ---- Squid field geometry (stylized, but rule-accurate territories) ----
        // Inside polygon = defense territory. Outside = offense territory.
        this.bodyPts = [
            { x: 220, y: 360 },
            { x: 360, y: 250 },
            { x: 480, y: 230 },
            { x: 600, y: 250 },
            { x: 740, y: 360 },
            { x: 600, y: 430 },
            { x: 480, y: 450 },
            { x: 360, y: 430 }
        ];

        this.bodyPoly = new Phaser.Geom.Polygon(this.bodyPts);

        // For "line foul": define a shrink + expand polygon band.
        // If attacker is between them => considered "on the line".
        const expandedPts = scalePoly(this.bodyPts, 1.06);
        const shrunkPts = scalePoly(this.bodyPts, 0.94);
        this.bodyPolyExpanded = new Phaser.Geom.Polygon(expandedPts);
        this.bodyPolyShrunk = new Phaser.Geom.Polygon(shrunkPts);

        // Draw field
        const g = this.add.graphics();
        g.lineStyle(6, PAL.CYAN, 0.9);
        g.fillStyle(0x0f1020, 0.35);

        g.beginPath();
        g.moveTo(this.bodyPts[0].x, this.bodyPts[0].y);
        for (let i = 1; i < this.bodyPts.length; i++) g.lineTo(this.bodyPts[i].x, this.bodyPts[i].y);
        g.closePath();
        g.fillPath();
        g.strokePath();

        // Optional: draw "line band" hint (subtle)
        g.lineStyle(2, PAL.MAG, 0.25);
        g.beginPath();
        g.moveTo(expandedPts[0].x, expandedPts[0].y);
        for (let i = 1; i < expandedPts.length; i++) g.lineTo(expandedPts[i].x, expandedPts[i].y);
        g.closePath();
        g.strokePath();

        g.beginPath();
        g.moveTo(shrunkPts[0].x, shrunkPts[0].y);
        for (let i = 1; i < shrunkPts.length; i++) g.lineTo(shrunkPts[i].x, shrunkPts[i].y);
        g.closePath();
        g.strokePath();

        // ---- Key points per traditional rules ----
        // B = Bridge/Inspector (midway): reaching it grants TWO FEET
        this.bridgeB = this.add.circle(W / 2, 310, 22, PAL.BLU, 0.9);
        this.bridgeB.setStrokeStyle(3, PAL.INK, 0.8);
        makeRetroText(this, this.bridgeB.x, this.bridgeB.y, "B", 14, "#000000");

        // C = Entry gate (alternate): touching it grants TWO FEET (enter via C route)
        this.entryC = this.add.circle(320, 410, 20, PAL.MAG, 0.9);
        this.entryC.setStrokeStyle(3, PAL.INK, 0.8);
        makeRetroText(this, this.entryC.x, this.entryC.y, "C", 14, "#000000");

        // D = Head (goal)
        this.headD = this.add.circle(W / 2, 200, 36, PAL.YEL, 0.9);
        this.headD.setStrokeStyle(3, PAL.INK, 0.8);
        makeRetroText(this, this.headD.x, this.headD.y, "HEAD", 12, "#000000");

        // World bounds
        this.physics.world.setBounds(40, 110, W - 80, H - 160, true, true, true, true);

        // ---- Attacker (Player) ----
        this.attacker = new Player(this, W / 2, 465, PAL.GRN);
        this.attacker.setControls(this.input.keyboard.createCursorKeys(), this.input.keyboard.addKeys("W,A,S,D"));
        this.attacker.speed = 210;

        // One-foot hopping mode state
        this.mode = "HOP"; // "HOP" or "TWO"
        this.enteredBodyOnce = false;

        // Hop button gives a tiny burst (feels like hopping)
        this.keyHop = this.input.keyboard.addKey("SPACE");

        // ---- Defender (AI) ----
        this.def = this.physics.add.sprite(W / 2, 320, "px");
        this.def.setTint(PAL.RED);
        this.def.setScale(.35, .35);
        this.def.setCollideWorldBounds(true);
        this.defSpeed = 240;

        // Make collisions actually shove (Arcade collider)
        this.attacker.sprite.body.setDrag(900, 900);
        this.attacker.sprite.body.setMaxVelocity(320, 320);

        this.def.body.setDrag(600, 600);
        this.def.body.setMaxVelocity(320, 320);

        this.physics.add.collider(this.attacker.sprite, this.def, () => {
            // little thump sound on contact
            beep(this, 170, 0.02, "square", 0.02);
        });

        // UI status
        this.status = makeRetroText(this, W / 2, 162, "", 16, "#e8e8ff");

        this.input.keyboard.on("keydown-ESC", () => this.scene.start("Hub"));

        this.state = "PLAY";
    }

    setModeTwoFeet() {
        if (this.mode === "TWO") return;
        this.mode = "TWO";
        this.attacker.speed = 270;
        beep(this, 920, 0.06, "square", 0.04);
        this.status.setText("TWO FEET UNLOCKED");
        this.status.setColor("#48ff7a");
        this.time.delayedCall(900, () => { if (this.status) this.status.setText(""); });
    }

    foul(reason = "FOUL") {
        if (this.state !== "PLAY") return;
        this.state = "LOSE";
        beep(this, 110, 0.12, "sawtooth", 0.05);
        this.registry.set("deaths", (this.registry.get("deaths") || 0) + 1);

        this.attacker.kill();
        this.def.setVelocity(0, 0);

        makeRetroText(this, W / 2, H / 2, reason, 34, "#ff3a3a")
            .setShadow(0, 3, "#000", 5, true, true);

        this.time.delayedCall(1300, () => this.scene.start("Hub"));
    }

    win() {
        if (this.state !== "PLAY") return;
        this.state = "WIN";
        beep(this, 980, 0.1, "square", 0.05);

        this.registry.set("money", (this.registry.get("money") || 0) + 3000);
        this.registry.set("roundIndex", 4);

        this.attacker.sprite.setVelocity(0, 0);
        this.def.setVelocity(0, 0);

        makeRetroText(this, W / 2, H / 2, "MANSAE!", 44, "#48ff7a")
            .setShadow(0, 3, "#000", 6, true, true);

        this.time.delayedCall(1400, () => this.scene.start("Hub"));
    }

    update() {
        if (this.state !== "PLAY") return;

        // --- Attacker movement ---
        this.attacker.update();

        // Hop burst + hop constraint (one-foot feel)
        if (this.mode === "HOP") {
            // Force mostly-cardinal movement (reduces diagonal finesse)
            const b = this.attacker.sprite.body;
            const ax = Math.abs(b.velocity.x);
            const ay = Math.abs(b.velocity.y);
            if (ax > ay) b.setVelocityY(0);
            else b.setVelocityX(0);

            // Slight hop burst
            if (Phaser.Input.Keyboard.JustDown(this.keyHop)) {
                const vx = b.velocity.x, vy = b.velocity.y;
                const len = Math.hypot(vx, vy) || 1;
                b.velocity.x += (vx / len) * 90;
                b.velocity.y += (vy / len) * 90;
                beep(this, 520, 0.02, "square", 0.02);
            }
        }

        const ax = this.attacker.sprite.x;
        const ay = this.attacker.sprite.y;

        // --- Defender AI (intercept/push) ---
        // Target: cut off route to Head once attacker has two-feet; otherwise patrol near bridge
        let tx, ty;
        if (this.mode === "TWO") {
            tx = Phaser.Math.Linear(ax, this.headD.x, 0.55);
            ty = Phaser.Math.Linear(ay, this.headD.y, 0.55);
        } else {
            // hold bridge area while attacker is hopping
            tx = Phaser.Math.Linear(this.bridgeB.x, ax, 0.35);
            ty = Phaser.Math.Linear(this.bridgeB.y, ay, 0.35);
        }

        // Defender is "supposed" to be inside the body; bias it back in if it drifts
        const defInside = contains(this.bodyPolyExpanded, this.def.x, this.def.y);
        if (!defInside) {
            tx = Phaser.Math.Linear(tx, W / 2, 0.7);
            ty = Phaser.Math.Linear(ty, 340, 0.7);
        }

        const dx = tx - this.def.x;
        const dy = ty - this.def.y;
        const dlen = Math.hypot(dx, dy) || 1;
        this.def.setVelocity((dx / dlen) * this.defSpeed, (dy / dlen) * this.defSpeed);

        // --- Zone checks (traditional disqualifications) ---
        // Determine attacker position relative to field
        const inShrunk = contains(this.bodyPolyShrunk, ax, ay);
        const inExpanded = contains(this.bodyPolyExpanded, ax, ay);
        const inBody = contains(this.bodyPoly, ax, ay);

        const onLine = (!inShrunk && inExpanded); // between shrunk and expanded

        // Touch B (bridge/inspector) or C (entry) to unlock two feet
        const dB = Phaser.Math.Distance.Between(ax, ay, this.bridgeB.x, this.bridgeB.y);
        const dC = Phaser.Math.Distance.Between(ax, ay, this.entryC.x, this.entryC.y);

        if (this.mode === "HOP" && (dB <= 26 || dC <= 24)) {
            this.setModeTwoFeet();
        }

        // Line foul always applies to attacker (stepping on the outline)
        if (onLine) {
            this.foul("STEPPED ON LINE");
            return;
        }

        // In hop mode, entering defense territory is a foul (two-feet not yet allowed)
        if (this.mode === "HOP" && inBody) {
            // allow a tiny grace if you're literally at the entry circles (B/C)
            if (dB > 28 && dC > 26) {
                this.foul("TWO FEET TOO SOON");
                return;
            }
        }

        // Track if attacker has entered body at least once after unlocking
        if (this.mode === "TWO" && inBody) this.enteredBodyOnce = true;

        // Defense win: attacker pushed into offense territory *after* having entered body
        // (i.e., pushed out of the squid drawing)
        if (this.mode === "TWO" && this.enteredBodyOnce && !inExpanded) {
            this.foul("PUSHED OUT");
            return;
        }

        // Optional: if defender leaves the field completely, attacker wins (prevents goofy stalls)
        if (!defInside) {
            // Not an official universal rule, but good gameplay guardrail.
            // Comment out if you want strict play.
            this.win();
            return;
        }

        // Win condition: reach head while in TWO mode (traditionally: tap head with foot)
        const dHead = Phaser.Math.Distance.Between(ax, ay, this.headD.x, this.headD.y);
        if (this.mode === "TWO" && dHead <= 36) {
            this.win();
        }
    }
}