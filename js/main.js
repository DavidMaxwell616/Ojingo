import { W, H } from "./config.js";
import { CRTPipeline } from "./fx/CRTPipeline.js";

import BootScene from "./scenes/BootScene.js";
import MenuScene from "./scenes/MenuScene.js";
import HubScene from "./scenes/HubScene.js";
import RedLightScene from "./scenes/RedLightScene.js";
import HoneycombScene from "./scenes/HoneycombScene.js";
import TugScene from "./scenes/TugScene.js";
import GlassBridgeScene from "./scenes/GlassBridgeScene.js";
import FinalScene from "./scenes/FinalScene.js";

const config = {
    type: Phaser.WEBGL,
    parent: "game",
    width: W,
    height: H,
    backgroundColor: "#000000",
    pixelArt: true,
    antialias: false,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [
        BootScene,
        MenuScene,
        HubScene,
        RedLightScene,
        HoneycombScene,
        TugScene,
        GlassBridgeScene,
        FinalScene
    ]
};

const game = new Phaser.Game(config);

// Register pipeline once WebGL is ready
game.events.on("ready", () => {
    // Phaser internally sets renderer earlier; "ready" is safe.
});

Phaser.Renderer.WebGL.Pipelines.PostFXPipeline; // keep tree-shakers calm in some bundlers
game.events.once("postrender", () => {
    // no-op; placeholder if you later want to hook.
});

// Make pipeline available via game.registry once boot runs
window.__OJINGO__ = { CRTPipeline };