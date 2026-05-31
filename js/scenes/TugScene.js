import { PPM } from "../config.js";

const pl = planck;

export default class TugScene extends Phaser.Scene {
    constructor() {
        super("Tug");
    }

    preload() {
        this.load.path = "../assets/images/";
        this.load.image('background', 'background.png');
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
        this.eliminateMargin = 45;

        this.links = [];
        this.players = [];
        this.joints = [];

        this.createGround();
        this.createRope();
        this.createTeams();

        this.keys = this.input.keyboard.addKeys({
            leftPull: "A",
            rightPull: "L"
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
        this.groundY = this.h * .53;

        this.groundBody = this.world.createBody();

        const groundFix = this.groundBody.createFixture(
            pl.Edge(
                pl.Vec2(this.px(0), this.px(this.groundY)),
                pl.Vec2(this.px(this.w), this.px(this.groundY))
            )
        );

        groundFix.setFriction(1.0);

        this.add.line(
            0,
            0,
            this.centerX,
            this.groundY - 120,
            this.centerX,
            this.groundY + 30,
            0xff0000
        ).setLineWidth(4);

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
        const count = 20;
        const spacing = 24;
        const startX = this.centerX - ((count - 1) * spacing) / 2;
        const y = this.groundY - 45;

        let prev = null;

        for (let i = 0; i < count; i++) {
            const body = this.world.createDynamicBody({
                position: pl.Vec2(this.px(startX + i * spacing), this.px(y)),
                linearDamping: 1.5,
                angularDamping: 1.5
            });

            body.createFixture(pl.Box(this.px(10), this.px(4)), {
                density: 0.8,
                friction: 0.8,
                restitution: 0
            });

            const sprite = this.add.rectangle(
                startX + i * spacing,
                y,
                20,
                8,
                0xd6a85a
            );

            body.sprite = sprite;
            this.links.push(body);

            if (prev) {
                const joint = this.world.createJoint(
                    pl.DistanceJoint(
                        {
                            frequencyHz: 8,
                            dampingRatio: 0.7,
                            length: this.px(spacing)
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
        const leftRopeIndex = 3;
        const rightRopeIndex = this.links.length - 4;

        for (let i = 0; i < 5; i++) {
            this.createPlayer({
                team: "left",
                x: this.centerX - 140 - i * 48,
                y: this.groundY - 32,
                color: 0x00aaff,
                strength: Phaser.Math.FloatBetween(13, 23),
                friction: Phaser.Math.FloatBetween(0.7, 1.4),
                ropeLink: this.links[leftRopeIndex]
            });

            this.createPlayer({
                team: "right",
                x: this.centerX + 140 + i * 48,
                y: this.groundY - 32,
                color: 0xff4444,
                strength: Phaser.Math.FloatBetween(13, 23),
                friction: Phaser.Math.FloatBetween(0.7, 1.4),
                ropeLink: this.links[rightRopeIndex]
            });
        }
    }

    createPlayer({ team, x, y, color, strength, friction, ropeLink }) {
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

        const sprite = this.add.rectangle(x, y, 24, 56, color);
        const label = this.add.text(x - 14, y - 46, strength.toFixed(0), {
            fontSize: "12px",
            color: "#ffffff"
        });

        body.sprite = sprite;
        body.label = label;
        body.team = team;
        body.strength = strength;
        body.friction = friction;
        body.eliminated = false;

        const joint = this.world.createJoint(
            pl.DistanceJoint(
                {
                    frequencyHz: 5,
                    dampingRatio: 0.8,
                    length: this.px(Math.abs(x - this.meters(ropeLink.getPosition().x)))
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
        return;
        this.world.step(delta / 1000);

        const leftPulling = this.keys.leftPull.isDown;
        const rightPulling = this.keys.rightPull.isDown;

        for (const p of this.players) {
            if (p.eliminated) continue;

            const dir = p.team === "left" ? -1 : 1;
            const isPulling =
                p.team === "left" ? leftPulling : rightPulling;

            if (isPulling) {
                const force = p.strength * p.friction;
                p.applyForceToCenter(pl.Vec2(dir * force, 0), true);
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
        p.eliminated = true;

        if (p.ropeJoint) {
            this.world.destroyJoint(p.ropeJoint);
            p.ropeJoint = null;
        }

        p.sprite.setFillStyle(0x555555);
        p.label.setText("OUT");

        p.applyLinearImpulse(
            pl.Vec2(0, -5),
            p.getWorldCenter(),
            true
        );
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