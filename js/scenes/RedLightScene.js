// src/scenes/RedLightScene.js
// - Raycast spotlights (multi-ray cone clipped by first body hit)
// - Bullets/tracers when a competitor is eliminated
// - ONLY eliminate competitors if they are (a) moving on RED and (b) inside a spotlight cone

import { W, H, PAL } from "../config.js";
import StickMan from "../objects/StickMan.js";
import { addFrame, addHeader, makeRetroText, beep } from "../objects/UI.js";

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
}

// Ray vs axis-aligned box (returns distance t along ray, or Infinity)
function rayAABB(ox, oy, dx, dy, minX, minY, maxX, maxY) {
    const invDx = dx !== 0 ? 1 / dx : Infinity;
    const invDy = dy !== 0 ? 1 / dy : Infinity;

    const t1 = (minX - ox) * invDx;
    const t2 = (maxX - ox) * invDx;
    const t3 = (minY - oy) * invDy;
    const t4 = (maxY - oy) * invDy;

    const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

    if (tmax < 0) return Infinity;
    if (tmin > tmax) return Infinity;
    return tmin >= 0 ? tmin : tmax;
}

export default class RedLightScene extends Phaser.Scene {
    constructor() {
        super("RedLight");
    }

    create() {
        this.cameras.main.setBackgroundColor(PAL.BG);
        this.cameras.main.setPostPipeline("CRTPipeline");

        addFrame(this);
        addHeader(this, "RED LIGHT / GREEN LIGHT");

        this.bg = this.add.tileSprite(W / 2, H / 2, W, H, "tile").setAlpha(0.25);
        this.physics.world.setBounds(40, 110, W - 80, H - 160);

        // Goal line
        this.goalX = W - 90;
        const goal = this.add.rectangle(this.goalX, H / 2, 20, H - 120, PAL.YEL, 0.9);
        goal.setStrokeStyle(2, PAL.INK, 0.8);

        // Young-hee
        this.youngHee = this.createYoungHee(this.goalX + 48, H / 2);

        // Player
        this.player = new StickMan(this, 120, H / 2, PAL.GRN);
        this.player.setControls(
            this.input.keyboard.createCursorKeys(),
            this.input.keyboard.addKeys("W,A,S,D")
        );
        this.player.sprite.body.setDrag(900, 900);
        this.player.sprite.body.setMaxVelocity(340, 340);

        // Competitors
        this.competitors = [];
        this.competitorCount = 14;

        const topY = 150;
        const bottomY = H - 110;

        for (let i = 0; i < this.competitorCount; i++) {
            const laneY = Phaser.Math.Linear(topY, bottomY, i / (this.competitorCount - 1));
            const c = new StickMan(this, 120 + Phaser.Math.Between(-10, 20), laneY, PAL.WHITE);

            c.sprite.setTint(Phaser.Display.Color.RandomRGB(100, 255).color);
            c.sprite.setScale(0.35, 0.35);
            c.sprite.setCollideWorldBounds(true);
            c.sprite.body.setBounce(0.35, 0.35);
            c.sprite.body.setDrag(700, 700);
            c.sprite.body.setMaxVelocity(330, 330);

            c.alive = true;
            c.finished = false;
            c.place = 0;
            c._id = i + 1;

            c.laneY = laneY;
            c.baseSpeed = Phaser.Math.Between(150, 250);
            c.reactionMs = Phaser.Math.Between(70, 380);
            c.risk = Phaser.Math.FloatBetween(0.06, 0.33);
            c.panic = Phaser.Math.FloatBetween(0.0, 1.0);

            c.plan = "SPRINT";
            c.planUntil = 0;
            c.targetY = laneY;
            c.nextTargetAt = 0;
            c.zigDir = Math.random() < 0.5 ? -1 : 1;
            c.burstUntil = 0;
            c.fakeStopAt = 0;
            c.redStopAt = 0;
            c.stopStartedAt = 0;

            c.frozen = false;
            c.freezeUntil = 0;
            c.minFreezeMs = Phaser.Math.Between(900, 1800);

            c.eliminated = false;
            this.competitors.push(c);
        }

        if (!this.anims.exists("stickman_run")) {
            this.anims.create({
                key: "stickman_run",
                frames: this.anims.generateFrameNumbers("stickman", { start: 1, end: 6 }),
                frameRate: 18,
                repeat: -1
            });
        }

        if (!this.anims.exists("stickman_walk")) {
            this.anims.create({
                key: "stickman_walk",
                frames: this.anims.generateFrameNumbers("stickman", { start: 7, end: 10 }),
                frameRate: 18,
                repeat: -1
            });
        }


        this.stateText = makeRetroText(this, W / 2, 130, "", 20, "#e8e8ff");
        this.countText = makeRetroText(this, W / 2, 160, "", 16, "#e8e8ff");

        // Guards
        this.guard1 = this.add.container(W - 120, 80).setDepth(200);
        this.guard2 = this.add.container(W - 120, H - 80).setDepth(200);

        const turret = this.add.rectangle(0, 0, 38, 38, PAL.GRY, 0.95)
            .setStrokeStyle(2, PAL.INK, 0.8);
        const barrel = this.add.rectangle(0, 0, 56, 10, PAL.BLU, 0.7)
            .setStrokeStyle(2, PAL.INK, 0.8)
            .setOrigin(0.12, 0.5);
        turret.name = "turret";
        barrel.name = "barrel";
        barrel.setAngle(180);
        this.guard1.add([turret, barrel]);

        const turret2 = this.add.rectangle(0, 0, 38, 38, PAL.GRY, 0.95)
            .setStrokeStyle(2, PAL.INK, 0.8);
        const barrel2 = this.add.rectangle(0, 0, 56, 10, PAL.BLU, 0.7)
            .setStrokeStyle(2, PAL.INK, 0.8)
            .setOrigin(0.12, 0.5);
        turret2.name = "turret";
        barrel2.name = "barrel";
        barrel2.setAngle(180);
        this.guard2.add([turret2, barrel2]);

        this.spotG = this.add.graphics().setDepth(180);
        this.spotG.setBlendMode(Phaser.BlendModes.ADD);

        this.tracerG = this.add.graphics().setDepth(220);

        this.spotLen = 820;
        this.spotHalf = 0.38;
        this.spotRays = 28;
        this.spotAlpha = 0.14;

        this.green = true;
        this.dead = false;
        this.win = false;

        this.threshold = 16;
        this.spotMoveThresh = 6;

        this.activeCones = [];

        this.input.keyboard.on("keydown-ESC", () => this.scene.start("Hub"));

        const now = this.time.now;
        for (const c of this.competitors) {
            this.rollPlan(c, now);
            this.retarget(c, now);
        }

        this.scheduleFlip();
    }

    rollPlan(c, now) {
        const opts = ["SPRINT", "CAUTIOUS", "ZIGZAG", "DRIFT_UP", "DRIFT_DOWN", "BURST_COAST", "FAKE_STOP"];
        const bag = [];

        bag.push("SPRINT", "SPRINT", "CAUTIOUS");
        bag.push(c.panic > 0.55 ? "ZIGZAG" : "SPRINT");
        bag.push(c.risk > 0.22 ? "BURST_COAST" : "CAUTIOUS");
        bag.push(c.panic > 0.65 ? "FAKE_STOP" : pick(opts));

        c.plan = pick(bag);
        c.planUntil = now + Phaser.Math.Between(450, 1200);
        c.nextTargetAt = now + Phaser.Math.Between(140, 320);

        if (c.plan === "ZIGZAG") c.zigDir = Math.random() < 0.5 ? -1 : 1;
        if (c.plan === "BURST_COAST") c.burstUntil = now + Phaser.Math.Between(220, 420);
        if (c.plan === "FAKE_STOP") c.fakeStopAt = now + Phaser.Math.Between(220, 520);
    }

    setYoungHeeMode(mode) {
        if (!this.youngHee) return;

        this.youngHee.mode = mode;
        this.youngHee.targetAngle =
            mode === "GREEN"
                ? this.youngHee.lookAwayAngle
                : this.youngHee.lookAtAngle;
    }

    updateYoungHee() {
        if (!this.youngHee) return;

        const yh = this.youngHee;

        const diff = Phaser.Math.Angle.Wrap(yh.targetAngle - yh.currentAngle);
        yh.currentAngle += diff * 0.12;
        yh.headPivot.rotation = yh.currentAngle;

        yh.beam.clear();
        if (this.green) return;

        const eyeX = yh.root.x;
        const eyeY = yh.root.y - 34;

        const beamLen = 760;
        const half = 0.22;
        const center = yh.currentAngle + Math.PI;

        const p1x = eyeX + Math.cos(center - half) * beamLen;
        const p1y = eyeY + Math.sin(center - half) * beamLen;
        const p2x = eyeX + Math.cos(center + half) * beamLen;
        const p2y = eyeY + Math.sin(center + half) * beamLen;

        yh.beam.fillStyle(0xff6666, 0.08);
        yh.beam.beginPath();
        yh.beam.moveTo(eyeX, eyeY);
        yh.beam.lineTo(p1x, p1y);
        yh.beam.lineTo(p2x, p2y);
        yh.beam.closePath();
        yh.beam.fillPath();

        yh.beam.lineStyle(1, 0xff9999, 0.18);
        yh.beam.strokePath();
    }

    retarget(c, now) {
        const drift = Phaser.Math.Between(-36, 36) * (0.6 + c.panic * 0.9);
        c.targetY = clamp(c.laneY + drift, 140, H - 120);
        c.nextTargetAt = now + Phaser.Math.Between(160, 360);
    }

    scheduleFlip() {
        const delay = Phaser.Math.Between(900, 1900);

        this.time.delayedCall(delay, () => {
            this.green = !this.green;
            const now = this.time.now;

            if (this.green) {
                this.stateText.setText("GREEN – MOVE!");
                this.stateText.setColor("#48ff7a");
                beep(this, 880, 0.03, "square", 0.03);
                this.setYoungHeeMode("GREEN");

                for (const c of this.competitors) {
                    c.stopStartedAt = 0;
                    c.frozen = false;
                    c.freezeUntil = 0;
                    if (c.sprite?.body) c.sprite.body.moves = true;

                    if (c.alive && !c.finished) {
                        this.rollPlan(c, now);
                        this.retarget(c, now);
                    }
                }
            } else {
                this.stateText.setText("RED – FREEZE!");
                this.stateText.setColor("#ff3a3a");
                beep(this, 220, 0.05, "square", 0.03);
                this.setYoungHeeMode("RED");

                for (const c of this.competitors) {
                    c.redStopAt = now + c.reactionMs + Phaser.Math.Between(0, 120);
                    c.stopStartedAt = now;
                    c.frozen = false;
                    c.freezeUntil = 0;
                    if (c.sprite?.body) c.sprite.body.moves = true;
                }
            }

            if (!this.win && !this.dead) this.scheduleFlip();
        });
    }

    createYoungHee(x, y) {
        const root = this.add.container(x, y).setDepth(160);

        const body = this.add.graphics();
        body.lineStyle(2, 0x000000, 1);

        body.fillStyle(0x111111, 1);
        body.fillRect(-14, -48, 28, 10);

        body.fillStyle(0xf2c9a0, 1);
        body.fillRect(-12, -42, 24, 18);

        body.fillStyle(0xd96a2b, 1);
        body.fillRect(-16, -24, 32, 30);

        body.fillStyle(0xf2d94e, 1);
        body.fillRect(-14, -20, 28, 10);

        body.lineStyle(3, 0xf2c9a0, 1);
        body.beginPath();
        body.moveTo(-6, 6);
        body.lineTo(-6, 26);
        body.moveTo(6, 6);
        body.lineTo(6, 26);
        body.strokePath();

        body.lineStyle(3, 0xffffff, 1);
        body.beginPath();
        body.moveTo(-6, 22);
        body.lineTo(-6, 28);
        body.moveTo(6, 22);
        body.lineTo(6, 28);
        body.strokePath();

        body.lineStyle(3, 0xf2c9a0, 1);
        body.beginPath();
        body.moveTo(-16, -12);
        body.lineTo(-26, -2);
        body.moveTo(16, -12);
        body.lineTo(26, -2);
        body.strokePath();

        body.lineStyle(3, 0x111111, 1);
        body.beginPath();
        body.moveTo(-12, -34);
        body.lineTo(-22, -26);
        body.moveTo(12, -34);
        body.lineTo(22, -26);
        body.strokePath();

        root.add(body);

        const headPivot = this.add.container(0, -34);

        const head = this.add.graphics();
        head.lineStyle(2, 0x000000, 1);
        head.fillStyle(0xf2c9a0, 1);
        head.fillRect(-12, -10, 24, 20);

        head.fillStyle(0x000000, 1);
        head.fillRect(-6, -2, 2, 2);
        head.fillRect(4, -2, 2, 2);

        head.lineStyle(1, 0x662222, 1);
        head.beginPath();
        head.moveTo(-3, 5);
        head.lineTo(3, 5);
        head.strokePath();

        headPivot.add(head);
        root.add(headPivot);

        const beam = this.add.graphics().setDepth(155);

        return {
            root,
            headPivot,
            beam,
            mode: "GREEN",
            lookAwayAngle: Math.PI,
            lookAtAngle: 0,
            currentAngle: Math.PI,
            targetAngle: Math.PI
        };
    }

    drawRaycastSpotlights() {
        this.spotG.clear();
        this.activeCones.length = 0;

        if (this.green || !this.youngHee) return;

        const bodies = [];

        if (this.player?.sprite?.body?.enable) {
            bodies.push(this.player.sprite.body);
        }

        for (const c of this.competitors) {
            if (!c.alive || c.eliminated || c.finished) continue;
            if (c.sprite?.body?.enable) {
                bodies.push(c.sprite.body);
            }
        }

        const ox = this.youngHee.root.x;
        const oy = this.youngHee.root.y - 34;
        const ang = this.youngHee.currentAngle + Math.PI;

        const a0 = ang - this.spotHalf;
        const a1 = ang + this.spotHalf;

        const poly = [{ x: ox, y: oy }];

        this.spotG.fillStyle(PAL.CYAN, this.spotAlpha);
        this.spotG.beginPath();
        this.spotG.moveTo(ox, oy);

        for (let r = 0; r <= this.spotRays; r++) {
            const a = Phaser.Math.Linear(a0, a1, r / this.spotRays);
            const dx = Math.cos(a);
            const dy = Math.sin(a);

            let dist = this.spotLen;

            for (const b of bodies) {
                const hit = rayAABB(
                    ox,
                    oy,
                    dx,
                    dy,
                    b.x,
                    b.y,
                    b.right,
                    b.bottom
                );
                if (hit >= 0 && hit < dist) dist = hit;
            }

            const px = ox + dx * dist;
            const py = oy + dy * dist;

            this.spotG.lineTo(px, py);
            poly.push({ x: px, y: py });
        }

        this.spotG.closePath();
        this.spotG.fillPath();

        this.spotG.lineStyle(1, PAL.CYAN, 0.22);
        this.spotG.strokePath();

        this.activeCones.push({
            ox,
            oy,
            ang,
            len: this.spotLen,
            half: this.spotHalf,
            poly
        });
    }

    shootBulletAt(guard, x, y) {
        this.tracerG.clear();

        const barrel = guard.getByName("barrel");
        if (!barrel) return;

        // Convert world target into guard-local coordinates
        const localX = x - guard.x;
        const localY = y - guard.y;

        // Barrel points along +X because it's a horizontal rectangle
        barrel.rotation = Phaser.Math.Angle.Between(
            barrel.x,
            barrel.y,
            localX,
            localY
        );

        // Compute muzzle point in world space
        const muzzleLen = barrel.width * (1 - barrel.originX);
        const muzzleX = guard.x + barrel.x + Math.cos(barrel.rotation) * muzzleLen;
        const muzzleY = guard.y + barrel.y + Math.sin(barrel.rotation) * muzzleLen;

        this.tracerG.lineStyle(2, 0xff3a3a, 0.95);
        this.tracerG.beginPath();
        this.tracerG.moveTo(muzzleX, muzzleY);
        this.tracerG.lineTo(x, y);
        this.tracerG.strokePath();

        this.tracerG.fillStyle(0xffe35a, 0.85);
        this.tracerG.fillCircle(muzzleX, muzzleY, 4);

        const fx = this.add.rectangle(x, y, 140, 28, 0xff0000, 0.18).setDepth(300);
        this.tweens.add({
            targets: fx,
            alpha: { from: 0.22, to: 0 },
            duration: 220,
            repeat: 2,
            onComplete: () => fx.destroy()
        });

        this.time.delayedCall(90, () => this.tracerG.clear());
    }

    nearestGuardTo(x, y) {
        let best = this.guard1;
        let bestD = Phaser.Math.Distance.Between(best.x, best.y, x, y);

        const d = Phaser.Math.Distance.Between(this.guard2.x, this.guard2.y, x, y);
        if (d < bestD) {
            best = this.guard2;
            bestD = d;
        }

        return best;
    }

    eliminateCompetitor(c, reason = "SPOTTED") {
        if (!c || !c.alive || c.finished || c.eliminated) return;

        c.eliminated = true;
        c.alive = false;

        const gx = c.sprite.x;
        const gy = c.sprite.y;

        const g = this.nearestGuardTo(gx, gy);
        this.shootBulletAt(g, gx, gy);

        beep(this, 140, 0.06, "square", 0.03);
        this.cameras.main.shake(120, 0.004);

        c.sprite.setTint(PAL.RED);
        if (c.sprite?.body) c.sprite.body.moves = true;
        c.sprite.body.setDrag(1400, 1400);
        c.sprite.setVelocity(-Phaser.Math.Between(60, 120), Phaser.Math.Between(-30, 30));

        this.time.delayedCall(320, () => {
            if (!c.sprite?.active) return;
            c.sprite.setVelocity(0, 0);
            c.sprite.setScale(0.35, 0.35);
            c.sprite.angle = 90;
        });
    }

    updateCompetitors() {
        const now = this.time.now;

        for (const c of this.competitors) {
            if (!c.alive || c.finished) continue;

            if (c.sprite.x >= this.goalX - 10) {
                c.finished = true;
                c.sprite.setVelocity(0, 0);
                c.sprite.anims.stop();
                c.sprite.setFrame(0);
                continue;
            }

            const laneErr = c.laneY - c.sprite.y;
            const lanePull = clamp(laneErr * 2.1, -70, 70);

            if (this.green) {
                if (now > c.planUntil) this.rollPlan(c, now);
                if (now > c.nextTargetAt) this.retarget(c, now);

                const steerY = clamp((c.targetY - c.sprite.y) * 3.0, -120, 120);
                let speed = c.baseSpeed;

                if (speed !== 0) {
                    if (c.plan === "CAUTIOUS") c.sprite.play("stickman_walk", true);
                    else c.sprite.play("stickman_run", true);
                }

                let vy = steerY + lanePull * 0.25;

                if (c.plan === "SPRINT") {
                    speed *= Phaser.Math.FloatBetween(1.05, 1.18);
                    vy += Math.sin(now * 0.006 + c._id) * (8 + 10 * c.panic);
                } else if (c.plan === "CAUTIOUS") {
                    speed *= Phaser.Math.FloatBetween(0.58, 0.72);
                    vy += Math.sin(now * 0.004 + c._id) * (6 + 8 * c.panic);
                } else if (c.plan === "ZIGZAG") {
                    const z = Math.sin(now * 0.01 + c._id) > 0 ? 1 : -1;
                    vy += z * c.zigDir * (22 + 24 * c.panic);
                    speed *= Phaser.Math.FloatBetween(0.92, 1.05);
                } else if (c.plan === "DRIFT_UP") {
                    vy += -22 - 18 * c.panic;
                    speed *= Phaser.Math.FloatBetween(0.92, 1.02);
                } else if (c.plan === "DRIFT_DOWN") {
                    vy += 22 + 18 * c.panic;
                    speed *= Phaser.Math.FloatBetween(0.92, 1.02);
                } else if (c.plan === "BURST_COAST") {
                    if (now < c.burstUntil) speed *= 1.25;
                    else speed *= 0.75;
                    vy += Math.sin(now * 0.007 + c._id) * (10 + 10 * c.panic);
                } else if (c.plan === "FAKE_STOP") {
                    if (now > c.fakeStopAt && now < c.fakeStopAt + 220) speed *= 0.25;
                    else speed *= 1.02;
                    vy += Math.sin(now * 0.005 + c._id) * (10 + 14 * c.panic);
                }

                if (c.frozen) {
                    c.frozen = false;
                    c.freezeUntil = 0;
                    if (c.sprite?.body) c.sprite.body.moves = true;
                }

                c.sprite.setVelocity(speed, clamp(vy, -80, 80));
            } else {
                const shouldStop = now >= c.redStopAt;

                if (c.frozen && now < c.freezeUntil) {
                    c.sprite.anims.stop();
                    c.sprite.setFrame(0);
                    c.sprite.setVelocity(0, 0);
                } else if (!shouldStop) {
                    if (c.frozen) {
                        c.frozen = false;
                        c.freezeUntil = 0;
                        if (c.sprite?.body) c.sprite.body.moves = true;
                    }

                    const t = clamp((now - c.stopStartedAt) / (c.reactionMs + 140), 0, 1);
                    const vx = Phaser.Math.Linear(c.sprite.body.velocity.x, 0, 0.08 + 0.22 * t);
                    const vy = Phaser.Math.Linear(c.sprite.body.velocity.y, 0, 0.08 + 0.22 * t);
                    c.sprite.setVelocity(vx, vy + lanePull * 0.18);
                } else {
                    const inForcedFreeze = c.frozen && now < c.freezeUntil;
                    const creep = !inForcedFreeze && (Math.random() < c.risk);
                    const twitch = !inForcedFreeze && (Math.random() < (0.03 + 0.05 * c.panic));

                    if (creep) {
                        if (c.frozen) {
                            c.frozen = false;
                            if (c.sprite?.body) c.sprite.body.moves = true;
                        }
                        c.sprite.setVelocity(Phaser.Math.Between(8, 22), lanePull * 0.1);
                    } else if (twitch) {
                        if (c.frozen) {
                            c.frozen = false;
                            if (c.sprite?.body) c.sprite.body.moves = true;
                        }
                        c.sprite.setVelocity(
                            Phaser.Math.Between(-7, 7),
                            Phaser.Math.Between(-7, 7) + lanePull * 0.12
                        );
                    } else {
                        if (!c.frozen) {
                            c.frozen = true;
                            c.sprite.setVelocity(0, 0);
                            c.sprite.anims.stop();
                            c.sprite.setFrame(0);
                            c.sprite.body.moves = false;
                            c.freezeUntil = now + c.minFreezeMs;
                        } else {
                            c.sprite.setVelocity(0, 0);
                            c.sprite.anims.stop();
                            c.sprite.setFrame(0);
                        }
                    }
                }
            }

            c.sprite.y = clamp(c.sprite.y, 140, H - 120);
        }
    }

    rayHitsBodyFirst(ox, oy, tx, ty, targetBody, bodies, pad = 0) {
        const dx0 = tx - ox;
        const dy0 = ty - oy;
        const len = Math.hypot(dx0, dy0);
        if (len <= 0.0001) return false;

        const dx = dx0 / len;
        const dy = dy0 / len;

        let bestT = Infinity;
        let bestBody = null;

        for (const b of bodies) {
            if (!b || !b.enable) continue;

            const hit = rayAABB(
                ox,
                oy,
                dx,
                dy,
                b.x - pad,
                b.y - pad,
                b.right + pad,
                b.bottom + pad
            );

            if (hit >= 0 && hit < bestT) {
                bestT = hit;
                bestBody = b;
            }
        }

        return bestBody === targetBody && bestT <= len + pad;
    }

    eliminateCompetitorsInSpotlightOnly() {
        if (this.green) return;
        if (!this.youngHee) return;

        const ox = this.youngHee.root.x;
        const oy = this.youngHee.root.y - 34;
        const ang = this.youngHee.currentAngle + Math.PI;

        const bodies = [];
        if (this.player?.sprite?.body?.enable) bodies.push(this.player.sprite.body);
        for (const c of this.competitors) {
            if (!c.alive || c.finished || c.eliminated) continue;
            if (c.sprite?.body?.enable) bodies.push(c.sprite.body);
        }

        for (const c of this.competitors) {
            if (!c.alive || c.finished || c.eliminated) continue;

            const b = c.sprite?.body;
            if (!b) continue;

            const v = Math.hypot(b.velocity.x, b.velocity.y);
            if (v <= this.spotMoveThresh) continue;

            const cx = b.center.x;
            const cy = b.center.y;

            const vx = cx - ox;
            const vy = cy - oy;
            const dist = Math.hypot(vx, vy);
            if (dist > this.spotLen) continue;

            const a = Math.atan2(vy, vx);
            const da = Phaser.Math.Angle.Wrap(a - ang);
            if (Math.abs(da) > this.spotHalf) continue;

            const visible = this.rayHitsBodyFirst(ox, oy, cx, cy, b, bodies, 2);

            if (visible) {
                c.sprite.anims.stop();
                c.sprite.setFrame(0);
                this.eliminateCompetitor(c, "SPOTTED");
            }
        }
    }

    updateCountText() {
        const alive = this.competitors.filter(c => c.alive && !c.finished).length;
        const finished = this.competitors.filter(c => c.finished).length;
        const elim = this.competitors.filter(c => !c.alive).length;
        this.countText.setText(`COMPETITORS — ALIVE: ${alive}  FINISHED: ${finished}  ELIM: ${elim}`);
    }
    eliminatePlayer() {
        if (this.dead || !this.player?.sprite?.active) return;

        this.dead = true;

        const px = this.player.sprite.x;
        const py = this.player.sprite.y;

        const g = this.nearestGuardTo(px, py);
        this.shootBulletAt(g, px, py);

        beep(this, 140, 0.08, "square", 0.04);
        this.cameras.main.shake(140, 0.006);

        this.player.sprite.setTint(PAL.RED);
        this.player.sprite.body.setDrag(1400, 1400);
        this.player.sprite.setVelocity(
            -Phaser.Math.Between(70, 130),
            Phaser.Math.Between(-40, 40)
        );

        this.stateText.setText("ELIMINATED");
        this.stateText.setColor("#ff3a3a");

        // stop competitors immediately and keep them frozen
        for (const c of this.competitors) {
            if (!c?.sprite?.active) continue;

            c.frozen = true;
            c.freezeUntil = this.time.now + 10000;

            c.sprite.setVelocity(0, 0);
            c.sprite.anims.stop();
            c.sprite.setFrame(0);

            if (c.sprite.body) {
                c.sprite.body.moves = false;
            }
        }
        this.player.kill();
        this.time.delayedCall(320, () => {
            if (!this.player?.sprite?.active) return;
            this.player.sprite.setVelocity(0, 0);
            this.player.sprite.angle = 90;
        });

        this.time.delayedCall(5000, () => {
            this.scene.start("Hub");
        });
    }
    update() {
        if (this.dead || this.win) return;

        this.bg.tilePositionX += 0.15;

        this.player.update();
        this.updateCompetitors();
        this.updateYoungHee();
        this.drawRaycastSpotlights();
        this.eliminateCompetitorsInSpotlightOnly();
        this.updateCountText();

        if (!this.green) {
            const v = this.player.getVelocityMag();
            if (v > this.threshold) {
                this.eliminatePlayer();
            }
        }

        if (this.player.sprite.x >= this.goalX) {
            this.win = true;
        }
    }
}