import { W, H, PAL } from "../config.js";
import { addFrame, addHeader, makeRetroText, beep } from "../objects/UI.js";

const ROUNDS = [
    { key: "RedLight", name: "RED LIGHT / GREEN LIGHT" },
    { key: "Honeycomb", name: "HONEYCOMB TRACE" },
    { key: "Tug", name: "TUG OF WAR" },
    { key: "GlassBridge", name: "GLASS BRIDGE" },
    { key: "Final", name: "OJINGO FINAL ARENA" }
];

export default class HubScene extends Phaser.Scene {
    constructor() { super("Hub"); }

    create() {
        this.cameras.main.setBackgroundColor(PAL.BG);
        this.cameras.main.setPostPipeline("CRTPipeline");

        addFrame(this);
        addHeader(this, "MAIN MENU");

        this.moneyText = makeRetroText(this, 140, 44, "", 16, "#48ff7a").setOrigin(0, 0.5);
        this.deathText = makeRetroText(this, W - 140, 44, "", 16, "#ff3a3a").setOrigin(1, 0.5);

        const roundIndex = this.registry.get("roundIndex") || 0;

        this.list = this.add.container(W / 2, 170);
        ROUNDS.forEach((r, i) => {
            const y = i * 56;
            const t = this.add.text(0, y, `${i + 1}. ${r.name}`, {
                fontFamily: "monospace",
                fontSize: "20px",
                color: i === roundIndex ? "#35f2ff" : "#e8e8ff"
            }).setOrigin(0.5);
            t.setShadow(0, 2, "#000", 3, true, true);
            this.list.add(t);
        });

        this.cursor = this.add.text(W / 2 - 170, 170 + roundIndex * 56, "▶", {
            fontFamily: "monospace",
            fontSize: "22px",
            color: "#ffe35a"
        }).setOrigin(0.5, 0.5);

        makeRetroText(this, W / 2, H - 86, "ARROWS: SELECT  •  ENTER: PLAY  •  R: RESET RUN", 14, "#e8e8ff");
        makeRetroText(this, W / 2, H - 56, "TIP: TRY NOT TO MOVE ON RED.", 14, "#b7b7ff");

        this.sel = roundIndex;

        const keys = this.input.keyboard.addKeys({
            up: "UP", down: "DOWN", enter: "ENTER", r: "R"
        });

        keys.up.on("down", () => this.moveSel(-1));
        keys.down.on("down", () => this.moveSel(+1));
        keys.enter.on("down", () => this.launch());
        keys.r.on("down", () => this.resetRun());

        this.updateHub();
    }

    updateHub() {
        const money = this.registry.get("money") || 0;
        const deaths = this.registry.get("deaths") || 0;
        this.moneyText.setText(`₩ ${money.toString().padStart(6, "0")}`);
        this.deathText.setText(`DEAD: ${deaths}`);
    }

    moveSel(d) {
        beep(this, 520, 0.03, "square", 0.03);
        this.sel = Phaser.Math.Wrap(this.sel + d, 0, 4);
        this.cursor.y = 170 + this.sel * 56;

        // recolor list
        this.list.iterate((child, idx) => {
            child.setColor(idx === this.sel ? "#35f2ff" : "#e8e8ff");
        });
    }

    launch() {
        beep(this, 760, 0.06, "square", 0.04);
        const r = ["RedLight", "Honeycomb", "Tug", "GlassBridge", "Final"][this.sel];
        this.scene.start(r);
    }

    resetRun() {
        beep(this, 220, 0.08, "sawtooth", 0.03);
        this.registry.set("roundIndex", 0);
        this.registry.set("money", 0);
        this.registry.set("deaths", 0);
        this.scene.restart();
    }
}