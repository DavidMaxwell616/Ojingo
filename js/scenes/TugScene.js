import { PPM } from "../config.js";

const pl = planck;

export default class TugScene extends Phaser.Scene {
    constructor() {
        super("Tug");
    }

    preload() {
        this.load.path = "../assets/images/";
        this.load.image('background', 'tugowar_background.png');
        this.load.path = "../assets/spritesheets/";
        this.load.spritesheet('greenTugger', 'green tugger.png', {
            frameWidth: 110,
            frameHeight: 110
        });
        this.load.spritesheet('redTugger', 'red tugger.png', {
            frameWidth: 110,
            frameHeight: 110
        });

    }
    create() {
        this.world = new pl.World(pl.Vec2(0, 9.8));
        this.w = this.scale.width;
        this.h = this.scale.height;
        this.background = this.add.image(0, 0, "background")
            .setOrigin(0, 0)
            .setDisplaySize(this.w, this.h)
            .setDepth(-100);

        this.centerX = this.w / 2;
        this.eliminateMargin = 110;

        this.links = [];
        this.players = [];
        this.joints = [];

        this.createGround();
        this.createRope();
        this.createTeams();
        this.anims.create({
            key: "greenTuggerPull",
            frames: this.anims.generateFrameNumbers("greenTugger", {
                start: 0,
                end: 3
            }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: "redTuggerPull",
            frames: this.anims.generateFrameNumbers("redTugger", {
                start: 0,
                end: 3
            }),
            frameRate: 10,
            repeat: -1
        });
        this.keys = this.input.keyboard.addKeys({
            leftPull: "A",
            rightPull: "L",
            reset: "R",
        });
        this.keys.reset.on("down", () => {
            this.scene.restart();
        });
        this.add.text(20, 20, "A = left team pull | L = right team pull", {
            fontSize: "18px",
            color: "#ffffff"
        });
    }

    px(x) {
        return x / PPM;
    }

    meters(x) {
        return x * PPM;
    }

    createGround() {
        this.groundY = this.h * 0.53;

        this.groundBody = this.world.createBody();

        const groundFix = this.groundBody.createFixture(
            pl.Edge(
                pl.Vec2(this.px(0), this.px(this.groundY)),
                pl.Vec2(this.px(this.w), this.px(this.groundY))
            )
        );

        groundFix.setFriction(1.0);

        // invisible left wall
        this.groundBody.createFixture(
            pl.Edge(
                pl.Vec2(this.px(20), this.px(0)),
                pl.Vec2(this.px(20), this.px(this.h))
            )
        );

        // invisible right wall
        this.groundBody.createFixture(
            pl.Edge(
                pl.Vec2(this.px(this.w - 20), this.px(0)),
                pl.Vec2(this.px(this.w - 20), this.px(this.h))
            )
        );

        //show elimination zone
        this.add.rectangle(
            this.centerX,
            this.groundY - 40,
            this.eliminateMargin * 2,
            160,
            0xff0000,
            0.15
        );
    }

    createRope() {
        const count = 28;
        const spacing = 12;
        const linkW = 14;
        const linkH = 4;

        const startX = this.centerX - ((count - 1) * spacing) / 2;
        const y = this.groundY - 35;
        let prev = null;

        for (let i = 0; i < count; i++) {
            const body = this.world.createDynamicBody({
                position: pl.Vec2(this.px(startX + i * spacing), this.px(y)),
                linearDamping: 1.5,
                angularDamping: 1.5
            });

            body.createFixture(
                pl.Box(this.px(linkW / 2), this.px(linkH / 2)),
                {
                    density: 0.8,
                    friction: 1.0,
                    restitution: 0
                }
            );

            const sprite = this.add.rectangle(
                startX + i * spacing,
                y,
                linkW,
                linkH,
                0xffffff
            );

            body.sprite = sprite;
            this.links.push(body);

            if (prev) {
                const joint = this.world.createJoint(
                    pl.DistanceJoint(
                        {
                            frequencyHz: 28,
                            dampingRatio: 0.35,
                            length: this.px(spacing * 0.72)
                        },
                        prev,
                        body,
                        prev.getWorldCenter(),
                        body.getWorldCenter()
                    )
                );

                this.joints.push(joint);
            }

            prev = body;
        }
    }

    createTeams() {
        const leftLinks = [0, 4, 7, 10, 13];

        const rightLinks = [
            this.links.length - 1,
            this.links.length - 5,
            this.links.length - 8,
            this.links.length - 11,
            this.links.length - 14
        ];

        for (let i = 0; i < 5; i++) {
            this.createPlayer({
                team: "left",
                isAnchor: i === 0,
                x: this.centerX - 140 - i * 48,
                y: this.groundY - 32,
                strength: Phaser.Math.FloatBetween(13, 23),
                friction: Phaser.Math.FloatBetween(0.7, 1.4),
                ropeLink: this.links[leftLinks[i]]
            });

            this.createPlayer({
                team: "right",
                isAnchor: i === 0,
                x: this.centerX + 140 + i * 48,
                y: this.groundY - 32,
                strength: Phaser.Math.FloatBetween(13, 23),
                friction: Phaser.Math.FloatBetween(0.7, 1.4),
                ropeLink: this.links[rightLinks[i]]
            });
        }
    }

    createPlayer({ team, isAnchor = false, x, y, strength, friction, ropeLink }) {
        const body = this.world.createDynamicBody({
            position: pl.Vec2(this.px(x), this.px(y)),
            fixedRotation: true,
            linearDamping: 3
        });

        body.createFixture(pl.Box(this.px(12), this.px(28)), {
            density: 1,
            friction,
            restitution: 0
        });

        const sprite = this.add.sprite(x, y, team === "left" ? "greenTugger" : "redTugger")
            .setScale(.5);
        const label = this.add.text(x - 18, y - 46, isAnchor ? "ANCHOR" : strength.toFixed(0), {
            fontSize: "12px",
            color: isAnchor ? "#ffe35a" : "#ffffff"
        });

        body.sprite = sprite;
        body.label = label;
        body.team = team;
        body.isAnchor = isAnchor;
        body.strength = isAnchor ? strength * 1.8 : strength;
        body.friction = isAnchor ? friction * 1.8 : friction;
        body.eliminated = false;

        const ropeAnchor = ropeLink.getWorldCenter();

        const joint = this.world.createJoint(
            pl.DistanceJoint(
                {
                    collideConnected: false
                },
                body,
                ropeLink,
                body.getWorldCenter(),
                ropeLink.getWorldCenter()
            )
        );
        body.ropeJoint = joint;

        this.players.push(body);
    }

    update(time, delta) {

        this.world.step(delta / 1000);

        const leftPulling = this.keys.leftPull.isDown;
        const rightPulling = this.keys.rightPull.isDown;

        for (const p of this.players) {
            if (p.eliminated) continue;

            const dir = p.team === "left" ? -1 : 1;
            const isPulling = p.team === "left" ? leftPulling : rightPulling;

            if (isPulling) {
                const force = p.strength * p.friction * 8;

                p.applyForceToCenter(
                    pl.Vec2(dir * force, 0),
                    true
                );

                if (p.team === "left") {
                    p.sprite.play("greenTuggerPull", true);
                } else {
                    p.sprite.play("redTuggerPull", true);
                }
            } else {
                p.sprite.anims.stop();
                p.sprite.setFrame(0);
            }

            const x = this.meters(p.getPosition().x);

            if (p.team === "left" && x > this.centerX - this.eliminateMargin) {
                this.eliminatePlayer(p);
            }

            if (p.team === "right" && x < this.centerX + this.eliminateMargin) {
                this.eliminatePlayer(p);
            }
        }

        this.syncSprites();
    }

    eliminatePlayer(p) {

        if (p.eliminated) return;

        p.eliminated = true;

        // detach from rope
        if (p.ropeJoint) {
            this.world.destroyJoint(p.ropeJoint);
            p.ropeJoint = null;
        }

        // stop pull animation
        p.sprite.anims.stop();

        // falling animation
        if (p.team === "left") {
            p.sprite.play("greenTuggerFall", true);
        } else {
            p.sprite.play("redTuggerFall", true);
        }

        // OUT label
        if (p.label) {
            p.label.setText("OUT");
            p.label.setColor("#ff4444");
        }

        // darker tint
        p.sprite.setTint(0x666666);

        // slippery body
        const fixture = p.getFixtureList();

        if (fixture) {
            fixture.setFriction(0.02);
        }

        // allow spinning
        p.setFixedRotation(false);

        // stronger gravity
        p.setGravityScale(3);

        // launch off platform
        const dir = p.team === "left" ? 1 : -1;

        p.applyLinearImpulse(
            pl.Vec2(
                dir * 10,
                14
            ),
            p.getWorldCenter(),
            true
        );

        // spin while falling
        p.setAngularVelocity(
            Phaser.Math.FloatBetween(-12, 12)
        );

        // fall through platform after delay
        this.time.delayedCall(600, () => {

            const fixture = p.getFixtureList();

            if (fixture) {
                fixture.setSensor(true);
            }
        });

        // cleanup after falling away
        this.time.delayedCall(5000, () => {

            if (p.sprite) {
                p.sprite.destroy();
            }

            if (p.label) {
                p.label.destroy();
            }

            this.world.destroyBody(p);
        });
    }

    eliminateTeam(team) {
        for (const p of this.players) {
            if (p.team === team && !p.eliminated) {
                this.eliminatePlayer(p);
            }
        }
    }
    syncSprites() {
        for (const link of this.links) {
            const pos = link.getPosition();
            link.sprite.x = this.meters(pos.x);
            link.sprite.y = this.meters(pos.y);
            link.sprite.rotation = link.getAngle();
        }

        for (const p of this.players) {
            const pos = p.getPosition();

            p.sprite.x = this.meters(pos.x);
            p.sprite.y = this.meters(pos.y);
            p.sprite.rotation = p.getAngle();

            p.label.x = p.sprite.x - 14;
            p.label.y = p.sprite.y - 46;
        }
    }
}