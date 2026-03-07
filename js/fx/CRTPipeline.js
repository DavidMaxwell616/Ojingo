export class CRTPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game,
            name: "CRTPipeline",
            fragShader: `
precision mediump float;

uniform sampler2D uMainSampler;
varying vec2 outTexCoord;

uniform float time;
uniform float strength;   // 0..1
uniform float scan;       // scanline intensity
uniform float noise;      // noise amount

float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = outTexCoord;

  // subtle barrel distortion
  vec2 cc = uv - 0.5;
  float r2 = dot(cc, cc);
  uv += cc * r2 * (0.10 * strength);

  // chromatic separation (tiny)
  float sep = 0.0015 * strength;
  vec3 col;
  col.r = texture2D(uMainSampler, uv + vec2(sep, 0.0)).r;
  col.g = texture2D(uMainSampler, uv).g;
  col.b = texture2D(uMainSampler, uv - vec2(sep, 0.0)).b;

  // scanlines
  float s = sin((outTexCoord.y * 540.0) * 3.14159);
  col *= 1.0 - scan * (0.15 + 0.15 * s);

  // vignette
  float v = smoothstep(0.9, 0.2, r2);
  col *= v;

  // noise
  float n = hash(outTexCoord * vec2(960.0, 540.0) + time);
  col += (n - 0.5) * noise;

  // slight bloom-ish lift
  col = mix(col, col * col * 1.2 + col * 0.15, 0.15 * strength);

  gl_FragColor = vec4(col, 1.0);
}
      `
        });

        this._t = 0;
        this.strength = 0.9;
        this.scan = 0.8;
        this.noise = 0.05;
    }

    onPreRender() {
        this._t += 0.016;
        this.set1f("time", this._t);
        this.set1f("strength", this.strength);
        this.set1f("scan", this.scan);
        this.set1f("noise", this.noise);
    }
}