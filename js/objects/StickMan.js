import { PAL } from "../config.js";

export default class StickMan {
    constructor(scene, x, y, color = PAL.GRN) {
        this.scene = scene;

        this.sprite = scene.physics.add.sprite(x, y, "stickman");
        this.sprite.setTint(color);
        this.sprite.setScale(.35, .35);
        this.sprite.setCollideWorldBounds(true);

        this.speed = 240;
        this.alive = true;

        this._vx = 0;
        this._vy = 0;


    }

    setControls(cursors, wasd) {
        this.cursors = cursors;
        this.wasd = wasd;
    }

    getVelocityMag() {
        const b = this.sprite.body;
        return b ? Math.hypot(b.velocity.x, b.velocity.y) : 0;
    }

    update() {
        if (!this.alive) return;

        const left = this.cursors.left.isDown || this.wasd.A.isDown;
        const right = this.cursors.right.isDown || this.wasd.D.isDown;
        const up = this.cursors.up.isDown || this.wasd.W.isDown;
        const down = this.cursors.down.isDown || this.wasd.S.isDown;

        let vx = 0, vy = 0;
        if (left) vx -= 1;
        if (right) {
            this.sprite.play(this.scene.stickManAnim);
            vx++;
        }
        if (up) vy -= 1;
        if (down) vy += 1;

        if (vx !== 0 || vy !== 0) {
            const len = Math.hypot(vx, vy);
            vx /= len; vy /= len;
        }

        this._vx = vx * this.speed;
        this._vy = vy * this.speed;

        this.sprite.setVelocity(this._vx, this._vy);
    }

    kill() {
        this.alive = false;
        this.sprite.setVelocity(0, 0);
        this.sprite.setTint(PAL.RED);
    }

    destroy() {
        this.sprite.destroy();
    }
}