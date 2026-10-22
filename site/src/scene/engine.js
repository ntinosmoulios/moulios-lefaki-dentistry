// The scroll engine: Lenis smooth scroll + one GSAP master timeline whose time
// is the (smoothed) scroll position in pixels. It drives a single Three.js scene
// with a "film camera": dolly zooms, orbits, dutch angles, impact shake and a
// final fly-through, while the tooth itself assembles, whitens and gets scanned.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { LensShader, makeSnow, makeIce, makeDebris, makeWave } from './fx.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { buildTooth } from './tooth.js';
import { makeSky, makeTerrain, makeContactShadow, addDissolve, makeCloud } from './frost.js';

gsap.registerPlugin(ScrollTrigger);

const BG = 0xe3eaee;
const YELLOW = new THREE.Color('#d6c294');
const WHITE = new THREE.Color('#f8f6ee');
const TAU = Math.PI * 2;

export function startEngine({ onStep, onShade, onIntroDone }) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth < 760;
  const $ = s => document.querySelector(s);
  const cleanups = [];

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduceMotion) {
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = t => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    cleanups.push(() => { gsap.ticker.remove(raf); lenis.destroy(); });
  }
  const scrollTo = (target, offset = 0) => {
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.6 });
    else window.scrollTo({ top: typeof target === 'number' ? target : target.offsetTop + offset });
  };
  const onAnchor = e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const el = id.length > 1 && document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    scrollTo(id === '#top' ? 0 : el, 0);
  };
  document.addEventListener('click', onAnchor);
  cleanups.push(() => document.removeEventListener('click', onAnchor));

  /* ---------- Renderer ---------- */
  const canvas = $('#scene');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    document.documentElement.classList.add('no-webgl');
  }

  /* ---------- State ----------
     sx, sy: where the tooth sits on screen (fraction of the viewport, 0 = centre)
     dist/orbit/pitch/roll/fov: the camera; lookY: what the camera aims at (model units) */
  const S = {};
  function poses() {
    const m = isMobile();
    return m ? {
      hero: { sx: 0, sy: 0.17, scale: 0.6 },
      story: { sx: 0, sy: 0.15, scale: 0.55 },
      about: { sx: 0, sy: 0.3, scale: 0.0001 },
      services: { sx: 0, sy: 0.3, scale: 0.5 },
      white: { sx: 0, sy: 0.25, scale: 0.62 },
      tech: { sx: 0, sy: 0.25, scale: 0.6 }
    } : {
      hero: { sx: 0.31, sy: 0.06, scale: 0.92 },
      story: { sx: 0.24, sy: 0, scale: 0.95 },
      about: { sx: 0.27, sy: -0.02, scale: 0.72 },
      services: { sx: 0, sy: 0.02, scale: 1.15 },
      white: { sx: 0.24, sy: 0, scale: 1.15 },
      tech: { sx: 0.24, sy: 0, scale: 1.15 }
    };
  }
  const base = () => ({
    ...poses().hero, modelY: 0.4, tiltX: 0.25, rotY: -0.5, lookY: 0.2,
    dist: 11, orbit: 0, pitch: 0.15, roll: 0, fov: 32,
    screwY: 0, abutY: 0.04, crownY: 0.38, spin: 0,
    jaw: 0, glow: 0, parts: 1, white: 1, scan: 5, scanOn: 0, diss: 0, spread: 0, ground: 1, ice: 0, drill: 0, wave: 0, labels: 0,
    sparkle: 0, shake: 0, flash: 0
  });
  Object.assign(S, base());

  // Intro overlay, applied on top of the scroll state: a macro shot that pulls back
  const I = reduceMotion
    ? { scale: 1, rot: 0, crown: 0, screw: 0, dist: 0, roll: 0, center: 1, fov: 0 }
    : { scale: 1, rot: -1.4, crown: 0, screw: 0, dist: -4.5, roll: 0.2, center: 0, fov: 12, diss: 1, ice: 1 };
  if (reduceMotion) { I.diss = 0; I.ice = 0; }

  let tooth, composer, bloom, scene, camera, particles, sparkles, sky, terrain, shadow, cloud, ice, debris, wave, lens;
  let lastSmooth = 0, vel = 0;
  const D = { uDiss: { value: 0 }, uSpread: { value: 0 }, uTime: { value: 0 }, uEdge: { value: new THREE.Color('#7fd8f0') } };
  const quality = { dpr: 1, level: 0, samples: [], settleAt: 0, bloom: 0.34 };
  const pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 };

  if (renderer) {
    quality.dpr = Math.min(window.devicePixelRatio, isMobile() ? 1.25 : 1.5);
    quality.bloom = isMobile() ? 0.08 : 0.1;
    renderer.setPixelRatio(quality.dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.localClippingEnabled = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(BG, 9, 22);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.22;

    camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.05, 80);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 6, 5);
    const rim = new THREE.DirectionalLight(0x8fd6ea, 3.2);
    rim.position.set(-5, 3, -4);
    const rim2 = new THREE.DirectionalLight(0xffe2c4, 1.4);
    rim2.position.set(5, -2, -3);
    scene.add(key, rim, rim2);

    scene.add(new THREE.HemisphereLight(0xf4f9fb, 0x7d8d95, 0.3));
    sky = makeSky(); scene.add(sky);
    terrain = makeTerrain(); terrain.position.y = -2.75; scene.add(terrain);
    shadow = makeContactShadow(); shadow.position.y = -2.7; scene.add(shadow);

    tooth = buildTooth();
    scene.add(tooth.pivot);
    // dissolve + point cloud of the assembled implant
    addDissolve(tooth.dissolveMats, D);
    tooth.crown.position.y = 0.38; tooth.abutment.position.y = 0.04; tooth.screw.position.y = 0;
    tooth.pivot.updateMatrixWorld(true);
    cloud = makeCloud(tooth.cloudMeshes, tooth.model, isMobile() ? 7000 : 16000, D);
    tooth.model.add(cloud);

    sparkles = makeSparkles(70);
    tooth.crown.add(sparkles);

    particles = makeSnow(isMobile() ? 700 : 1800);
    scene.add(particles);
    ice = makeIce(isMobile());
    tooth.model.add(ice.group);
    debris = makeDebris(isMobile() ? 160 : 320);
    tooth.model.add(debris);
    wave = makeWave();
    tooth.model.add(wave.mesh);

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), quality.bloom, 0.4, 0.97);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    lens = new ShaderPass(LensShader);
    composer.addPass(lens);
    sizeComposer();
  }

  // Bloom runs at half resolution: it is a blur, so nobody can tell, and it costs a quarter
  function sizeComposer() {
    composer.setPixelRatio(quality.dpr);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloom.setSize(Math.round(window.innerWidth * quality.dpr / 2), Math.round(window.innerHeight * quality.dpr / 2));
  }

  function degrade() {
    quality.level++;
    if (quality.level === 1) { quality.dpr = Math.min(quality.dpr, 1); renderer.setPixelRatio(quality.dpr); sizeComposer(); }
    else if (quality.level === 2) { bloom.enabled = false; }
    else if (quality.level === 3) { particles.visible = false; }
    quality.samples = [];
    quality.settleAt = performance.now() + 1500;
  }

  /* ---------- Master timeline: time = scroll px ---------- */
  let tl = null;
  let marks = {};
  let cards = [];
  const top = el => el.getBoundingClientRect().top + window.scrollY;

  function build() {
    const vh = window.innerHeight;
    const svc = $('.services'), trackEl = $('.track');
    if (svc && trackEl && !reduceMotion) {
      trackEl.style.transform = 'none';
      const travel = Math.max(0, trackEl.scrollWidth - window.innerWidth);
      svc.style.height = `${travel + vh}px`;
      marks.travel = travel;
      cards = [...trackEl.children].map(el => ({ el, c: el.offsetLeft + el.offsetWidth / 2, last: '' }));
    }
    const maxScroll = document.documentElement.scrollHeight - vh;
    const sec = id => { const el = $(id); return el ? { t: top(el), h: el.offsetHeight } : { t: 0, h: 0 }; };
    const film = sec('.film');
    const filmEnd = film.h ? film.t + film.h - vh : 0;
    marks.filmCover = film.h ? film.t + (film.h - vh) * 0.96 : -1;
    const sg = sec('.surgery');
    marks.cover = sg.h ? [sg.t + vh * 0.05, sg.t + sg.h - vh * 1.05] : null;
    const imp = sec('.implant'), ab = sec('.about'), sv = sec('.services'), wh = sec('.whitening'), te = sec('.tech'), fq = sec('.faq');
    marks = { ...marks, imp, ab, sv, wh, te, fq, maxScroll };

    if (tl) tl.kill();
    Object.assign(S, base());
    if (reduceMotion) return;
    const P = poses();
    const m = isMobile();
    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    let cursor = 0;
    const enter = (t, d = vh) => { const s = Math.max(cursor, t - d); const dur = Math.max(1, t - s); cursor = t; return [s, dur]; };
    const io = 'power2.inOut';

    // 1. Hero → implant: the tooth comes apart above an empty socket in a cut-away jaw
    const d0 = Math.max(1, imp.t - filmEnd);
    tl.to(S, { ice: 1, ease: 'power2.in', duration: d0 * 0.5 }, filmEnd)
      .to(S, { labels: 1, duration: d0 * 0.2 }, filmEnd + d0 * 0.8);
    tl.to(S, { ...P.story, tiltX: 0.1, rotY: -0.18, modelY: 0.35, lookY: 1.0, duration: d0 }, filmEnd)
      .to(S, { orbit: -0.22, pitch: 0.16, dist: m ? 15 : 13.5, roll: -0.03, ease: io, duration: d0 }, filmEnd)
      .to(S, { jaw: 1, screwY: 2.7, abutY: 2.85, crownY: 3.35, ease: 'power1.inOut', duration: d0 }, filmEnd);
    cursor = imp.t;

    // 2. Implant story (sticky): six beats, each with its own shot. PH marks where each beat starts.
    const len = Math.max(1, imp.h - vh), s0 = imp.t, at = f => s0 + f * len, dur = f => f * len;
    // beat 1 - the screw drills in, turning, as the camera pushes in on the socket
    tl.to(S, { labels: 0, duration: dur(0.03) }, at(0.11))
      .to(S, { drill: 1, duration: dur(0.02) }, at(0.2))
      .to(S, { drill: 0, duration: dur(0.04) }, at(0.35));
    tl.to(S, { screwY: 0, spin: TAU * 5, ease: 'power1.inOut', duration: dur(0.24) }, at(0.14))
      .to(S, { abutY: 1.7, crownY: 2.5, duration: dur(0.24) }, at(0.14))
      .to(S, { dist: m ? 10 : 9.2, lookY: -0.35, orbit: 0.16, pitch: 0.08, roll: 0.04, modelY: 0.45, ease: io, duration: dur(0.22) }, at(0.14))
    // beat 2 - macro on the bone as it grows onto the titanium
      .to(S, { dist: m ? 9 : 8, lookY: -0.75, orbit: -0.18, pitch: 0.02, roll: -0.03, ease: io, duration: dur(0.12) }, at(0.39))
      .to(S, { glow: 1, duration: dur(0.07) }, at(0.41))
      .to(S, { glow: 0.25, duration: dur(0.07) }, at(0.48))
    // beat 3 - the abutment clicks in
      .to(S, { dist: m ? 10 : 9, lookY: 0.15, orbit: 0.22, pitch: 0.12, roll: 0.02, ease: io, duration: dur(0.12) }, at(0.55))
      .to(S, { abutY: 0.04, ease: 'power2.in', duration: dur(0.1) }, at(0.57))
      .to(S, { crownY: 1.5, duration: dur(0.12) }, at(0.56))
    // beat 4 - the crown drops into place: a hit of shake and light on impact
      .to(S, { dist: m ? 11.5 : 10.5, lookY: 0.4, orbit: -0.05, pitch: 0.1, roll: 0, ease: io, duration: dur(0.14) }, at(0.7))
      .to(S, { crownY: 0.38, ease: 'power3.in', duration: dur(0.12) }, at(0.72))
      .to(S, { shake: 1, flash: 1, duration: dur(0.006) }, at(0.84))
      .to(S, { wave: 1, ease: 'power2.out', duration: dur(0.07) }, at(0.84))
      .to(S, { shake: 0, flash: 0, ease: 'power2.out', duration: dur(0.03) }, at(0.846))
    // beat 5 - the finished implant, the camera drifts round it
      .to(S, { orbit: -0.38, rotY: 0.22, dist: m ? 12 : 11, lookY: 0.2, pitch: 0.14, ease: io, duration: dur(0.12) }, at(0.88));
    cursor = s0 + len;
    marks.story = { s0, len };

    // 3. About: dutch angle, the camera keeps circling the finished implant
    let [s, d] = enter(ab.t + vh * 0.2, vh * 1.1);
    tl.to(S, { ...P.about, jaw: 0, glow: 0, ground: 0, rotY: TAU - 0.4, tiltX: 0.35, modelY: 0.3, lookY: 0.25,
      dist: 12, orbit: 0.9, pitch: 0.18, roll: 0.12, ease: io, duration: d }, s);
    const abEnd = sv.t - vh;
    if (abEnd > cursor + 10) { tl.to(S, { orbit: 1.9, roll: -0.06, duration: abEnd - cursor }, cursor); cursor = abEnd; }

    // 4. Services: far wide shot, then a slow push-in while the camera orbits once
    [s, d] = enter(sv.t);
    tl.to(S, { ...P.services, tiltX: 0.15, rotY: TAU + 0.2, lookY: 0.25, dist: 16, pitch: 0.05, roll: 0, ease: io, duration: d }, s);
    const svLen = Math.max(1, sv.h - vh);
    tl.to(S, { rotY: TAU * 3 + 0.2, duration: svLen }, sv.t)
      .to(S, { orbit: 1.9 + TAU, duration: svLen }, sv.t)
      .to(S, { dist: m ? 10 : 8.5, ease: 'power1.inOut', duration: svLen }, sv.t);
    cursor = sv.t + svLen;

    // 5. Whitening: a vertigo dolly-zoom into the crown, which whitens and starts to sparkle
    [s, d] = enter(wh.t);
    tl.to(S, { ...P.white, parts: 0, modelY: -0.85, tiltX: 0.45, rotY: TAU * 3 - 0.5, white: 0, lookY: 0.1,
      dist: 6.5, fov: 24, pitch: 0.35, orbit: 1.9 + TAU + 0.4, ease: io, duration: d }, s);
    const whLen = Math.max(1, wh.h - vh);
    tl.to(S, { white: 1, duration: whLen * 0.85, ease: 'power1.inOut' }, wh.t)
      .to(S, { rotY: TAU * 3 + 0.5, duration: whLen }, wh.t)
      .to(S, { dist: 7.6, fov: 30, duration: whLen }, wh.t)
      .to(S, { sparkle: 1, duration: whLen * 0.25 }, wh.t + whLen * 0.62);
    cursor = wh.t + whLen;
    marks.whiteRange = { start: wh.t, len: whLen * 0.85 };

    // 6. Tech: top-down shot that circles while the scanner digitises the crown
    [s, d] = enter(te.t);
    tl.to(S, { ...P.tech, tiltX: 0.55, rotY: TAU * 3 - 0.2, scan: 1.35, sparkle: 0, dist: 7, fov: 32, pitch: 0.55, orbit: 1.9 + TAU + 1.1, ease: io, duration: d }, s);
    const teLen = Math.max(1, te.h - vh);
    tl.to(S, { scanOn: 1, duration: teLen * 0.08 }, te.t)
      .to(S, { scan: -0.12, ease: 'power1.inOut', duration: teLen * 0.8 }, te.t)
      .to(S, { rotY: TAU * 3 + 0.9, duration: teLen }, te.t)
      .to(S, { orbit: 1.9 + TAU * 1.75 + 1.1, pitch: 0.12, duration: teLen }, te.t)
      .to(S, { scanOn: 0, duration: teLen * 0.12 }, te.t + teLen * 0.82);
    cursor = te.t + teLen;

    // 7. FAQ: the camera flies straight into the tooth, a flash, and it is gone
    [s, d] = enter(fq.t, vh * 0.9);
    tl.to(S, { sx: 0, sy: 0, dist: 8.5, fov: 34, roll: 0.08, rotY: '+=1.2', ease: io, duration: d * 0.9 }, s)
      .to(S, { diss: 1, spread: 3.6, flash: 0, duration: d * 0.45 }, s + d * 0.55)
      .to(S, { scale: 0.0001, duration: d * 0.05 }, s + d * 1.0);

    tl.to({}, { duration: 1 }, Math.max(cursor, maxScroll));
    tl.time(0);
  }

  /* ---------- Frame ---------- */
  let smooth = window.scrollY;
  let lastStep = -1, lastShade = -1, idle = 0, frameCount = 0, introRunning = !reduceMotion, lastTrackP = -1;
  const hud = $('.hud-target');
  const xlabels = tooth ? [['crown', tooth.crown, 0.55], ['abutment', tooth.abutment, 0.2], ['screw', tooth.screw, -1.0]]
    .map(([k, obj, dy]) => ({ el: document.querySelector(`.xlabel--${k}`), obj, dy })).filter(L => L.el) : [];
  const topbar = $('.topbar'), bar = $('.progress span'), track = $('.track'), trackBar = $('.track__bar span');
  const v3 = new THREE.Vector3(), q = new THREE.Quaternion(), n = new THREE.Vector3();

  function frame(time, dtMs) {
    const y = window.scrollY;
    const k = reduceMotion ? 1 : 1 - Math.exp(-(Math.min(dtMs || 16, 250) / 1000) * 16);
    smooth += (y - smooth) * k;
    if (Math.abs(y - smooth) < 0.1) smooth = y;
    if (tl) tl.time(Math.min(smooth, tl.duration()));

    // DOM bits tied to scroll (transform/opacity only)
    topbar?.classList.toggle('is-scrolled', y > 40);
    if (bar && marks.maxScroll) bar.style.transform = `scaleX(${Math.min(1, y / marks.maxScroll)})`;
    if (track && marks.sv && marks.travel) {
      const p = clamp01((smooth - marks.sv.t) / Math.max(1, marks.sv.h - window.innerHeight));
      if (Math.abs(p - lastTrackP) > 0.0005) {
        lastTrackP = p;
        const tx = -p * marks.travel;
        track.style.transform = `translate3d(${tx}px,0,0)`;
        if (trackBar) trackBar.style.transform = `scaleX(${p})`;
        // Coverflow: cards turn and recede the further they are from the centre
        const half = window.innerWidth / 2;
        for (const c of cards) {
          const dd = Math.max(-1.6, Math.min(1.6, (c.c + tx - half) / half));
          const a = Math.abs(dd);
          const tr = `perspective(1100px) translateZ(${(-a * 140).toFixed(1)}px) rotateY(${(-dd * 22).toFixed(2)}deg) scale(${(1 - a * 0.05).toFixed(3)})`;
          if (tr !== c.last) { c.el.style.transform = tr; c.el.style.opacity = (1 - Math.min(1, a) * 0.45).toFixed(3); c.last = tr; }
        }
      }
    }
    if (marks.story) {
      const p = (smooth - marks.story.s0) / marks.story.len;
      const step = p < 0.14 ? 0 : p < 0.39 ? 1 : p < 0.55 ? 2 : p < 0.7 ? 3 : p < 0.88 ? 4 : 5;
      if (step !== lastStep) { lastStep = step; onStep?.(step); }
    }
    const shade = Math.round(clamp01(S.white) * 6);
    if (shade !== lastShade) { lastShade = shade; onShade?.(shade); }

    if (!renderer) return;

    // Measure real frame time and step quality down if the device can't keep up
    const now = performance.now();
    if (dtMs && now > quality.settleAt && quality.level < 3 && !document.hidden) {
      quality.samples.push(dtMs);
      if (quality.samples.length >= 45) {
        const s = [...quality.samples].sort((a, b) => a - b);
        if (s[Math.floor(s.length / 2)] > 24) degrade(); else quality.samples = [];
      }
    }

    // Nothing visible is moving: skip or halve the GPU work
    const moving = Math.abs(y - smooth) > 0.5 || Math.abs(target.x - pointer.x) > 0.002 || Math.abs(target.y - pointer.y) > 0.002;
    if (marks.filmCover > 0 && smooth < marks.filmCover) return; // the film covers the 3D scene
    if (marks.cover && smooth > marks.cover[0] && smooth < marks.cover[1]) { // a full-bleed section covers the 3D scene
      if (hud) hud.style.opacity = '0';
      for (const L of xlabels) L.el.style.opacity = '0';
      return;
    }
    if (!moving && !introRunning && !(tooth.pivot.visible || particles.visible)) return;
    if (!moving && !introRunning && S.sparkle < 0.05 && (frameCount++ & 1)) return;

    pointer.x += (target.x - pointer.x) * k * 0.45;
    pointer.y += (target.y - pointer.y) * k * 0.45;
    if (!reduceMotion) idle += 0.005;

    /* Tooth */
    const t = tooth;
    const sc = Math.max(0.0001, S.scale * I.scale);
    t.pivot.scale.setScalar(sc);
    t.pivot.visible = sc > 0.01;
    t.pivot.rotation.set(S.tiltX + pointer.y * 0.12, S.rotY + I.rot + pointer.x * 0.3 + Math.sin(idle) * 0.15, 0);
    t.model.position.y = S.modelY + Math.sin(idle * 1.7) * 0.04;
    t.screw.position.y = S.screwY + I.screw;
    t.screw.rotation.y = S.spin;
    t.abutment.position.y = S.abutY + I.screw * 0.6;
    t.crown.position.y = S.crownY + I.crown;
    t.setParts(S.parts);
    ice.set(Math.max(S.ice, I.ice));
    debris.material.uniforms.uTime.value = idle * 4;
    debris.material.uniforms.uAmt.value = S.drill;
    debris.material.uniforms.uPR.value = quality.dpr;
    debris.visible = S.drill > 0.01;
    wave.set(S.wave);
    terrain.material.transparent = S.ground < 0.999;
    D.uDiss.value = Math.max(S.diss, I.diss);
    D.uSpread.value = S.spread + I.diss * 1.3;
    D.uTime.value = idle * 20;
    cloud.visible = D.uDiss.value > 0.002;
    cloud.material.uniforms.uPR.value = quality.dpr;
    terrain.visible = shadow.visible = S.ground > 0.01;
    terrain.material.opacity = S.ground;
    shadow.material.opacity = S.ground * (1 - D.uDiss.value) * clamp01(S.parts + S.jaw);
    shadow.scale.setScalar(3.2 * sc);
    t.setJaw(S.jaw, S.glow);
    t.enamel.color.lerpColors(YELLOW, WHITE, clamp01(S.white));
    t.enamel.emissiveIntensity = Math.max(0, S.white - 0.85) * 0.5 * (S.parts < 0.5 ? 1 : 0);
    sparkles.visible = S.sparkle > 0.01;
    if (sparkles.visible) {
      sparkles.rotation.y = idle * 2.2;
      sparkles.material.opacity = S.sparkle * (0.55 + 0.45 * Math.sin(idle * 14));
      sparkles.material.size = 0.07 + 0.03 * Math.sin(idle * 9 + 1);
    }

    /* Camera: orbit around the tooth, aim, roll, then frame it on screen with a view offset */
    const W = window.innerWidth, H = window.innerHeight;
    const dist = Math.max(0.6, S.dist + I.dist);
    const orb = S.orbit + pointer.x * 0.08;
    const pit = S.pitch + pointer.y * 0.05;
    const look = S.lookY * sc;
    const jx = S.shake ? (Math.random() - 0.5) * 0.12 * S.shake : 0;
    const jy = S.shake ? (Math.random() - 0.5) * 0.12 * S.shake : 0;
    camera.position.set(Math.sin(orb) * Math.cos(pit) * dist + jx, look + Math.sin(pit) * dist + jy, Math.cos(orb) * Math.cos(pit) * dist);
    camera.lookAt(0, look, 0);
    camera.rotateZ(S.roll + I.roll);
    camera.fov = S.fov + I.fov;
    const cx = S.sx * I.center, cy = S.sy;
    camera.setViewOffset(W, H, -cx * W, cy * H, W, H);
    camera.updateProjectionMatrix();
    scene.fog.near = Math.max(6, dist + 7);
    scene.fog.far = dist + 30;
    sky.position.copy(camera.position);
    if (hud) {
      // HUD brackets follow the implant on screen
      t.crown.getWorldPosition(v3); v3.y -= 0.6 * sc; v3.project(camera);
      const hx = (v3.x * 0.5 + 0.5) * W, hy = (-v3.y * 0.5 + 0.5) * H;
      const show = t.pivot.visible && D.uDiss.value < 0.95 && v3.z < 1 && marks.story && smooth < marks.story.s0 + marks.story.len;
      hud.style.opacity = show ? '1' : '0';
      hud.style.transform = `translate3d(${hx.toFixed(1)}px, ${hy.toFixed(1)}px, 0)`;
    }
    if (bloom.enabled) bloom.strength = quality.bloom + S.flash * 1.1;

    /* Scanner clipping planes, computed in world space from the crown's frame */
    t.pivot.updateMatrixWorld(true);
    t.crown.getWorldQuaternion(q);
    n.set(0, 1, 0).applyQuaternion(q);
    t.crown.localToWorld(v3.set(0, S.scan, 0));
    t.planeSolid.setFromNormalAndCoplanarPoint(n.clone().negate(), v3);
    t.planeWire.setFromNormalAndCoplanarPoint(n, v3);
    t.wireMat.opacity = 0.6 * clamp01(1.4 - S.scan) * (1 - D.uDiss.value);
    t.scanner.position.y = S.scan;
    t.scanner.visible = S.scanOn > 0.01 && S.scan > -0.2 && S.scan < 1.4;
    t.scannerMat.opacity = 0.35 * S.scanOn;
    t.scanRingMat.opacity = 0.9 * S.scanOn;

    particles.material.uniforms.uTime.value = idle * 6;
    particles.material.uniforms.uScroll.value = smooth * 0.004;
    particles.material.uniforms.uPR.value = quality.dpr;
    particles.position.set(camera.position.x * 0.5, 0, camera.position.z * 0.5);
    // lens: chromatic aberration + squeeze that grow with scroll speed
    const v = Math.min(1, Math.abs(smooth - lastSmooth) / Math.max(1, (dtMs || 16)) / 4);
    lastSmooth = smooth;
    vel += (v - vel) * 0.12;
    lens.uniforms.uVel.value = reduceMotion ? 0 : vel;
    lens.uniforms.uTime.value = idle * 10;
    lens.uniforms.uAspect.value = W / H;
    // exploded-view labels on the parts
    if (xlabels.length) {
      const on = S.labels > 0.01 && t.pivot.visible;
      for (const L of xlabels) {
        if (!on) { if (L.el.style.opacity !== '0') L.el.style.opacity = '0'; continue; }
        L.obj.getWorldPosition(v3); v3.y += L.dy * sc; v3.project(camera);
        L.el.style.opacity = S.labels.toFixed(3);
        L.el.style.transform = `translate3d(${((v3.x * 0.5 + 0.5) * W).toFixed(1)}px, ${((-v3.y * 0.5 + 0.5) * H).toFixed(1)}px, 0)`;
      }
    }

    composer.render();
  }
  gsap.ticker.add(frame);
  cleanups.push(() => gsap.ticker.remove(frame));

  /* ---------- Events ---------- */
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    const pm = e => { target.x = (e.clientX / window.innerWidth) * 2 - 1; target.y = (e.clientY / window.innerHeight) * 2 - 1; };
    window.addEventListener('pointermove', pm, { passive: true });
    cleanups.push(() => window.removeEventListener('pointermove', pm));
  }

  let rebuildTimer;
  const rebuild = () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      if (renderer) {
        renderer.setSize(window.innerWidth, window.innerHeight);
        sizeComposer();
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      }
      build();
      lastTrackP = -1;
      ScrollTrigger.refresh();
    }, 120);
  };
  let lastW = window.innerWidth;
  const onResize = () => {
    // Ignore mobile URL-bar height changes; rebuild on width changes
    if (window.innerWidth !== lastW || !isMobile()) { lastW = window.innerWidth; rebuild(); }
  };
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize));
  let lastH = 0;
  const ro = new ResizeObserver(([e]) => { const h = e.contentRect.height; if (Math.abs(h - lastH) > 2) { lastH = h; rebuild(); } });
  ro.observe(document.querySelector('main'));
  cleanups.push(() => ro.disconnect());

  build();

  /* ---------- Intro: macro close-up on the crown, then the camera pulls back ---------- */
  const html = document.documentElement;
  const heroIn = () => {
    onIntroDone?.();
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(I, { scale: 1, duration: 1.6 }, 0)
      .to(I, { dist: 0, fov: 0, roll: 0, duration: 3 }, 0)
      .to(I, { rot: 0, duration: 2.8 }, 0)
      .to(I, { center: 1, duration: 2.6, ease: 'power3.inOut' }, 0.4)
      .to(I, { diss: 0, duration: 2.6, ease: 'power2.inOut' }, 0.2)
      .to(I, { ice: 0, duration: 2.2, ease: 'power3.out' }, 0.9)
      .from('.hero2__title span', { yPercent: 105, autoAlpha: 0, duration: 1.4, stagger: 0.12, ease: 'expo.out' }, 0.55)
      .from('.hero2__lead, .hero2__actions, .topbar', { autoAlpha: 0, y: 18, duration: 1.2, stagger: 0.08 }, 0.9)
      .add(() => { introRunning = false; quality.settleAt = performance.now() + 500; });
  };

  if (html.classList.contains('has-loader')) {
    lenis?.stop();
    const count = { v: 0 };
    const counter = $('.loader__count span');
    gsap.timeline({ defaults: { ease: 'power2.inOut' } })
      .to('.loader__tooth path', { strokeDashoffset: 0, duration: 2 }, 0)
      .to(count, { v: 100, duration: 2, onUpdate: () => { if (counter) counter.textContent = Math.round(count.v); } }, 0)
      .from('.loader__name', { autoAlpha: 0, y: 12, duration: 0.8 }, 0.5)
      .to('.loader__tooth', { fill: 'rgba(242,238,228,1)', duration: 0.5 }, 1.9)
      .to('.loader__center', { autoAlpha: 0, scale: 1.6, duration: 0.7, ease: 'power3.in' }, 2.4)
      .to('.loader__half--top', { yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, 2.8)
      .to('.loader__half--bot', { yPercent: 100, duration: 1.2, ease: 'expo.inOut' }, 2.8)
      .add(() => heroIn(), 2.9)
      .add(() => {
        html.classList.remove('has-loader');
        try { sessionStorage.setItem('ml-intro', '1'); } catch {}
        lenis?.start();
      }, 4.0);
  } else {
    heroIn();
  }

  return {
    scrollToShade(i) {
      if (!marks.whiteRange) return;
      scrollTo(marks.whiteRange.start + (i / 6) * marks.whiteRange.len);
    },
    destroy() { cleanups.forEach(f => f()); tl?.kill(); renderer?.dispose(); }
  };
}

function clamp01(v) { return Math.min(1, Math.max(0, v)); }

function dotTexture(inner = 'rgba(190,235,245,.5)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const grd = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, inner);
  grd.addColorStop(1, 'rgba(190,235,245,0)');
  x.fillStyle = grd;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function makeParticles(count) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // A tall ring around the tooth so the orbiting camera always has depth around it
    const a = Math.random() * TAU, r = 3.5 + Math.random() * 12;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = 9 - Math.random() * 42;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    size: 0.06, map: dotTexture('rgba(255,255,255,.6)'), transparent: true, opacity: 0.55,
    depthWrite: false, color: 0x7e98a3
  });
  return new THREE.Points(g, m);
}

function makeSparkles(count) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU, h = Math.random() * 1.4 - 0.1, r = 0.75 + Math.random() * 0.45;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = h;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    size: 0.08, map: dotTexture('rgba(255,250,235,.7)'), transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfffaf0
  });
  const p = new THREE.Points(g, m);
  p.visible = false;
  return p;
}
