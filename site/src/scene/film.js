// Scroll-film, WebGL version: one continuous "camera" moving through a sequence of stills.
// Each still has a depth map (Depth Anything v2, computed offline), so the camera really
// dollies into it: near things grow faster than far things, and the frame sways with
// the pointer. Shots don't cut: the camera keeps pushing, the next shot dissolves in
// through a depth-and-noise matte (far parts first), with a radial zoom blur, a touch of
// chromatic aberration and a warm light leak at the peak. Film grain and vignette on top.
// Falls back to the 2D canvas renderer if WebGL is not available.
import * as THREE from 'three';
import { startFilm2D } from './film2d.js';

const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uA, uDA, uB, uDB;
uniform float uAspA, uAspB, uZA, uZB, uDolA, uDolB, uMix, uBlur, uCA, uLeak, uScr, uTime, uHasB, uGrain;
uniform vec2 uFocA, uFocB, uSway, uRes;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

// cover-fit the image, zoomed by z around its focus point (never showing an edge)
vec2 frameScale(float asp, float z) {
  vec2 s = uScr > asp ? vec2(1.0, asp / uScr) : vec2(uScr / asp, 1.0);
  return s / z;
}
// depth-aware dolly: pixels are pulled towards the centre by (1 + dol * depth), so near
// things magnify more than far ones; a few fixed-point steps keep it stable
vec2 dolly(sampler2D D, vec2 iuv, vec2 c, float dol, vec2 sway) {
  vec2 p = iuv;
  for (int i = 0; i < 3; i++) {
    float d = texture2D(D, p).r;
    p = c + (iuv - c) / (1.0 + dol * d) - sway * (d - 0.35);
  }
  return clamp(p, vec2(0.001), vec2(0.999));
}
vec3 shot(sampler2D T, sampler2D D, float asp, vec2 foc, float z, float dol, vec2 uv, out float depth) {
  vec2 s = frameScale(asp, z);
  vec2 c = clamp(foc, s * 0.5, 1.0 - s * 0.5);
  vec2 iuv = c + (uv - 0.5) * s;
  vec2 p = dolly(D, iuv, c, dol, uSway);
  depth = texture2D(D, p).r;
  vec2 dir = p - c;
  vec3 col = vec3(0.0);
  vec2 ca = dir * uCA;
  // radial zoom blur with the colour split applied per tap, so channels stay aligned
  float taps = uBlur > 0.002 ? 6.0 : 1.0;
  for (int k = 0; k < 6; k++) {
    if (float(k) >= taps) break;
    vec2 q = c + dir * (1.0 - uBlur * float(k) / 6.0);
    col += vec3(texture2D(T, q + ca).r, texture2D(T, q).g, texture2D(T, q - ca).b);
  }
  col /= taps;
  return col;
}

void main() {
  vec2 uv = vUv;
  float dA, dB;
  vec3 a = shot(uA, uDA, uAspA, uFocA, uZA, uDolA, uv, dA);
  vec3 col = a;
  if (uHasB > 0.5) {
    vec3 b = shot(uB, uDB, uAspB, uFocB, uZB, uDolB, uv, dB);
    // the matte: soft noise plus depth, so the far parts of A give way first
    float key = 0.55 * fbm(uv * vec2(uScr, 1.0) * 2.4 + uTime * 0.04) + 0.45 * (1.0 - dA);
    float t = uMix * 1.7 - 0.35;
    float m = 1.0 - smoothstep(t - 0.18, t + 0.18, key);
    col = mix(a, b, m);
    // light leak sweeping diagonally across the cut
    vec2 lv = uv - 0.5; lv.x *= uScr;
    float band = 1.0 - clamp(abs(dot(lv, normalize(vec2(0.9, 0.45))) - (uMix - 0.5) * 1.6) * 1.6, 0.0, 1.0);
    vec3 leak = vec3(1.0, 0.6, 0.3) * pow(band, 2.2) + vec3(0.35, 0.75, 0.85) * pow(band, 6.0) * 0.4;
    col += uLeak * leak * 0.55;
    col *= 1.0 + uLeak * 0.12;
  }
  // vignette + a little lift in the shadows towards the brand teal
  vec2 v = uv - 0.5; v.x *= min(uScr, 1.6);
  col *= mix(1.0, 0.58, smoothstep(0.32, 0.92, length(v)));
  col = mix(col, col + vec3(0.0, 0.012, 0.016), 1.0 - smoothstep(0.0, 0.25, dot(col, vec3(0.333))));
  // grain
  float g = hash(uv * uRes + fract(uTime * 7.13) * 91.7) - 0.5;
  col += g * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

export function startFilm({ section, canvas, overlays, scenes }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    return startFilm2D({ section, canvas, overlays, scenes });
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = scenes.length;
  const loader = new THREE.TextureLoader();
  const blank = new THREE.DataTexture(new Uint8Array([15, 28, 31, 255]), 1, 1);
  blank.needsUpdate = true;
  const flat = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  flat.needsUpdate = true;
  const tex = scenes.map(() => ({ c: null, d: null, asp: 16 / 9, req: false }));
  const prep = t => { t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
  function load(i) {
    if (i < 0 || i >= N || tex[i].req) return;
    tex[i].req = true;
    const src = scenes[i].src;
    loader.load(src, t => { tex[i].c = prep(t); tex[i].asp = t.image.width / t.image.height; });
    loader.load(scenes[i].depth || src.replace(/\.webp$/, '-depth.webp'), t => { tex[i].d = prep(t); });
  }

  const U = {
    uA: { value: blank }, uDA: { value: flat }, uB: { value: blank }, uDB: { value: flat },
    uAspA: { value: 16 / 9 }, uAspB: { value: 16 / 9 }, uZA: { value: 1 }, uZB: { value: 1 },
    uDolA: { value: 0 }, uDolB: { value: 0 }, uMix: { value: 0 }, uBlur: { value: 0 }, uCA: { value: 0 },
    uLeak: { value: 0 }, uScr: { value: 1 }, uTime: { value: 0 }, uHasB: { value: 0 }, uGrain: { value: 0.05 },
    uFocA: { value: new THREE.Vector2(0.5, 0.5) }, uFocB: { value: new THREE.Vector2(0.5, 0.5) },
    uSway: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2(1, 1) }
  };
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U, depthTest: false, depthWrite: false }));
  quad.frustumCulled = false;
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let W = 0, H = 0, pr = 1, maxPr = Math.min(window.devicePixelRatio || 1, 1.5);
  const resize = () => {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setPixelRatio(pr * maxPr);
    renderer.setSize(W, H, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    U.uScr.value = W / H;
    U.uRes.value.set(W * pr * maxPr, H * pr * maxPr);
  };

  // camera state of a shot at its own time t (0..1): a slow, constant push with growing parallax
  const portrait = () => W < H;
  function shotCam(i, t) {
    const sc = scenes[i];
    const [z0, z1] = sc.zoom || [1.02, 1.22];
    if (sc.reverse) {
      const e = easeInOut(clamp01(t / 0.85));
      return { z: 1.75 - 0.72 * e, dol: 0.55 - 0.45 * e };
    }
    return { z: z0 + (z1 - z0) * t, dol: 0.06 + 0.3 * t };
  }
  // landscape screens show the whole frame at first and drift towards the subject; portrait
  // screens crop hard, so they aim at the subject from the start
  function focus(i, z, out) {
    const sc = scenes[i];
    const k = portrait() ? 1 : clamp01((z - 1) / 0.5) * 0.85 + 0.15;
    out.set(0.5 + (sc.fx - 0.5) * k, 1 - (0.5 + (sc.fy - 0.5) * k));
  }

  const T0 = 0.56; // when, inside a shot, the move into the next one begins
  let target = 0, smoothP = 0, swayX = 0, swayY = 0, px = 0, py = 0;
  window.addEventListener('pointermove', e => { px = e.clientX / W - 0.5; py = e.clientY / H - 0.5; }, { passive: true });

  function frame(p, time) {
    const seg = p * N;
    const i = Math.min(N - 1, Math.floor(seg));
    const t = Math.min(1, seg - i);
    for (let j = i - 1; j <= i + 2; j++) load(j);
    const A = tex[i], next = i + 1 < N ? i + 1 : -1, B = next >= 0 ? tex[next] : null;
    const ca = shotCam(i, t);
    let zA = ca.z, dolA = ca.dol, mix = 0, blur = 0, chroma = 0, leak = 0, hasB = 0;
    let zB = 1, dolB = 0;
    if (B && t > T0 && !scenes[i].reverse) {
      const u = (t - T0) / (1 - T0);
      const e = u * u;
      const bell = Math.pow(Math.sin(Math.PI * clamp01(u)), 2);
      zA *= 1 + 0.75 * e;
      dolA += 1.35 * e;
      const cb = shotCam(next, 0);
      const arrive = 1 - smooth(0, 1, u);
      zB = cb.z * (1 + 0.04 * arrive);
      dolB = cb.dol - 0.42 * arrive;                // near things start small and rush in
      mix = smooth(0.12, 0.92, u);
      blur = 0.16 * bell;
      chroma = 0.006 * bell;
      leak = 0.95 * bell;
      hasB = 1;
    }
    if (reduce) { blur = 0; chroma = 0; dolA = 0; dolB = 0; }
    U.uA.value = A.c || blank; U.uDA.value = A.d || flat; U.uAspA.value = A.asp;
    U.uZA.value = zA; U.uDolA.value = dolA; focus(i, zA, U.uFocA.value);
    if (hasB) {
      U.uB.value = B.c || blank; U.uDB.value = B.d || flat; U.uAspB.value = B.asp;
      U.uZB.value = zB; U.uDolB.value = dolB; focus(next, zB, U.uFocB.value);
    }
    U.uHasB.value = hasB; U.uMix.value = mix; U.uBlur.value = blur; U.uCA.value = chroma; U.uLeak.value = leak;
    // sway: pointer on desktop, a slow drift everywhere
    const k = reduce ? 0 : 1;
    swayX += ((px * 0.018 + Math.sin(time * 0.37) * 0.004) * k - swayX) * 0.06;
    swayY += ((-py * 0.012 + Math.cos(time * 0.29) * 0.003) * k - swayY) * 0.06;
    U.uSway.value.set(swayX, swayY);
    U.uTime.value = time;
    renderer.render(scene, cam);

    // overlays: each has a scene index and [in, out] window in that scene's local time
    for (const o of overlays) {
      const local = seg - o.scene;
      const vin = clamp01((local - o.in[0]) / Math.max(0.001, o.in[1] - o.in[0]));
      const vout = clamp01((local - o.out[0]) / Math.max(0.001, o.out[1] - o.out[0]));
      const first = o.scene === 0 && o.in[0] <= 0;
      const v = first ? 1 - vout : vin * (1 - vout);
      if (v <= 0.001) { if (o.el.style.visibility !== 'hidden') o.el.style.visibility = 'hidden'; continue; }
      o.el.style.visibility = 'visible';
      const ein = easeInOut(vin), eo = easeInOut(vout);
      // type behaves like it sits in the same space: drifts in, then rushes past the camera
      const dy = (o.from?.y ?? 50) * (1 - ein) + (o.to?.y ?? -30) * eo;
      const sc2 = 0.94 + 0.06 * ein + 0.35 * eo * eo;
      const blurPx = (1 - ein) * 10 + eo * 14;
      o.el.style.opacity = (first ? 1 - eo : Math.min(ein, 1 - eo)).toFixed(3);
      o.el.style.transform = `translate3d(0, ${dy.toFixed(1)}px, 0) scale(${sc2.toFixed(3)})`;
      o.el.style.filter = blurPx > 0.3 ? `blur(${blurPx.toFixed(1)}px)` : 'none';
    }
    const endFade = clamp01((p - 0.965) / 0.035);
    canvas.style.opacity = (1 - endFade).toFixed(3);
  }

  function progress() {
    const r = section.getBoundingClientRect();
    return clamp01(-r.top / Math.max(1, r.height - window.innerHeight));
  }
  function visible() {
    const r = section.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  // adaptive resolution: if frames get slow, render fewer pixels
  let raf, lastT = performance.now(), slow = 0, fast = 0;
  const loop = now => {
    raf = requestAnimationFrame(loop);
    const dt = now - lastT; lastT = now;
    if (!visible() || document.hidden) return;
    if (dt > 26) { slow++; fast = 0; } else if (dt < 18) { fast++; slow = Math.max(0, slow - 1); }
    if (slow > 40 && pr > 0.6) { pr = Math.max(0.6, pr - 0.15); slow = 0; resize(); }
    if (fast > 240 && pr < 1) { pr = Math.min(1, pr + 0.1); fast = 0; resize(); }
    target = progress();
    smoothP += (target - smoothP) * (reduce ? 1 : 1 - Math.exp(-dt / 110));
    if (Math.abs(target - smoothP) < 0.00005) smoothP = target;
    frame(smoothP, now / 1000);
  };
  resize();
  window.addEventListener('resize', resize);
  load(0); load(1);
  raf = requestAnimationFrame(loop);

  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); };
}
