import { W, H, PAL } from "../config.js";
import { addFrame, addHeader, makeRetroText, beep } from "../objects/UI.js";

function distToSegment(p, a, b) {
    const apx = p.x - a.x, apy = p.y - a.y;
    const abx = b.x - a.x, aby = b.y - a.y;
    const ab2 = abx * abx + aby * aby;
    let t = (apx * abx + apy * aby) / (ab2 || 1);
    t = Math.max(0, Math.min(1, t));
    const x = a.x + abx * t, y = a.y + aby * t;
    return Math.hypot(p.x - x, p.y - y);
}

export default class HoneycombScene extends Phaser.Scene {
    constructor() { super("Honeycomb"); }

    create() {
        this.cameras.main.setBackgroundColor(PAL.BG);
        this.cameras.main.setPostPipeline("CRTPipeline");

        addFrame(this);
        addHeader(this, "HONEYCOMB TRACE");

        this.add.tileSprite(W / 2, H / 2, W, H, "tile").setAlpha(0.2);

        this.center = { x: W / 2, y: H / 2 + 10 };
        this.radius = 140;

        // pick a target shape
        const shapes = ["TRIANGLE", "SQUARE", "CIRCLE"];
        this.shapeName = shapes[Phaser.Math.Between(0, shapes.length - 1)];

        this.info = makeRetroText(this, W / 2, 130, `TRACE: ${this.shapeName}`, 18, "#ffe35a");
        makeRetroText(this, W / 2, H - 60, "HOLD MOUSE / TOUCH TO SCRATCH • STAY ON THE LINE • [ESC] MAIN MENU", 14, "#b7b7ff");

        this.g = this.add.graphics();
        this.g.lineStyle(6, PAL.YEL, 0.85);
        this.drawTargetShape();

        // "scratch" layer
        this.scratch = this.add.graphics();
        this.scratch.lineStyle(4, PAL.INK, 0.9);

        // scoring
        this.progress = 0;
        this.mistakes = 0;
        this.maxMistakes = 18;

        this.progressText = makeRetroText(this, W / 2, 168, `PROGRESS: 0%`, 16, "#e8e8ff");
        this.mistakeText = makeRetroText(this, W / 2, 192, `CRACKS: 0/${this.maxMistakes}`, 16, "#ff3a3a");

        this.pointerDown = false;
        this.lastP = null;

        this.input.on("pointerdown", (p) => { this.pointerDown = true; this.lastP = { x: p.x, y: p.y }; beep(this, 700, 0.02, "square", 0.02); });
        this.input.on("pointerup", () => { this.pointerDown = false; this.lastP = null; });

        this.input.keyboard.on("keydown-ESC", () => this.scene.start("Hub"));

        // Precompute poly segments for distance checks
        this.segs = this.buildSegments();
        this.covered = new Set();
        this.segCount = this.segs.length;
    }

    drawTargetShape() {
        const { x, y } = this.center;

        if (this.shapeName === "CIRCLE") {
            this.g.strokeCircle(x, y, this.radius);
            return;
        }

        const pts = [];
        if (this.shapeName === "TRIANGLE") {
            for (let i = 0; i < 3; i++) {
                const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
                pts.push({ x: x + Math.cos(a) * this.radius, y: y + Math.sin(a) * this.radius });
            }
        } else { // SQUARE
            const r = this.radius * 0.92;
            pts.push({ x: x - r, y: y - r }, { x: x + r, y: y - r }, { x: x + r, y: y + r }, { x: x - r, y: y + r });
        }

        this.g.beginPath();
        this.g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) this.g.lineTo(pts[i].x, pts[i].y);
        this.g.lineTo(pts[0].x, pts[0].y);
        this.g.strokePath();
    }

    buildSegments() {
        const { x, y } = this.center;
        const segs = [];

        if (this.shapeName === "CIRCLE") {
            const steps = 80;
            let prev = null;
            for (let i = 0; i <= steps; i++) {
                const a = (i / steps) * Math.PI * 2;
                const p = { x: x + Math.cos(a) * this.radius, y: y + Math.sin(a) * this.radius };
                if (prev) segs.push([prev, p]);
                prev = p;
            }
            return segs;
        }

        let pts = [];
        if (this.shapeName === "TRIANGLE") {
            for (let i = 0; i < 3; i++) {
                const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
                pts.push({ x: x + Math.cos(a) * this.radius, y: y + Math.sin(a) * this.radius });
            }
        } else {
            const r = this.radius * 0.92;
            pts = [{ x: x - r, y: y - r }, { x: x + r, y: y - r }, { x: x + r, y: y + r }, { x: x - r, y: y + r }];
        }

        for (let i = 0; i < pts.length; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % pts.length];
            // subdivide each edge into small segments
            const steps = 24;
            let prev = a;
            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                const p = { x: Phaser.Math.Linear(a.x, b.x, t), y: Phaser.Math.Linear(a.y, b.y, t) };
                segs.push([prev, p]);
                prev = p;
            }
        }
        return segs;
    }

    fail() {
        beep(this, 120, 0.12, "sawtooth", 0.04);
        this.registry.set("deaths", (this.registry.get("deaths") || 0) + 1);
        makeRetroText(this, W / 2, H / 2, "CRACKED", 34, "#ff3a3a").setShadow(0, 3, "#000", 5, true, true);
        this.time.delayedCall(1200, () => this.scene.start("Hub"));
    }

    win() {
        beep(this, 980, 0.08, "square", 0.04);
        this.registry.set("money", (this.registry.get("money") || 0) + 1800);
        const idx = this.registry.get("roundIndex") || 0;
        this.registry.set("roundIndex", Math.max(idx, 2));
        makeRetroText(this, W / 2, H / 2, "CLEAN CUT", 34, "#48ff7a").setShadow(0, 3, "#000", 5, true, true);
        this.time.delayedCall(1100, () => this.scene.start("Hub"));
    }

    update() {
        if (!this.pointerDown) return;

        const p = this.input.activePointer;
        const cur = { x: p.x, y: p.y };

        if (this.lastP) {
            this.scratch.beginPath();
            this.scratch.moveTo(this.lastP.x, this.lastP.y);
            this.scratch.lineTo(cur.x, cur.y);
            this.scratch.strokePath();
        }
        this.lastP = cur;

        // check if pointer is close to any segment; mark coverage
        const tol = 14;
        let close = false;

        for (let i = 0; i < this.segs.length; i++) {
            const [a, b] = this.segs[i];
            const d = distToSegment(cur, a, b);
            if (d < tol) {
                close = true;
                // cover if close enough
                this.covered.add(i);
            }
        }

        if (!close) {
            this.mistakes++;
            if (this.mistakes % 3 === 0) beep(this, 260, 0.02, "square", 0.02);
            this.mistakeText.setText(`CRACKS: ${this.mistakes}/${this.maxMistakes}`);
            if (this.mistakes >= this.maxMistakes) this.fail();
        }

        const pct = Math.floor((this.covered.size / this.segCount) * 100);
        this.progressText.setText(`PROGRESS: ${pct}%`);

        if (pct >= 92) this.win();
    }
}