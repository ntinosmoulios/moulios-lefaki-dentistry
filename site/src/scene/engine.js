// The scroll engine: Lenis smooth scroll + one GSAP master timeline whose time
// is the (smoothed) scroll position in pixels, driving a single Three.js scene
// that follows the visitor through the whole page.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { buildTooth } from './tooth.js';

gsap.registerPlugin(ScrollTrigger);

const BG = 0x0f1c1f;
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
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
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

  const S = {};
  const base = () => {
    const P = poses();
    return {
      ...P.hero, modelY: 0.4, tiltX: 0.25, rotY: -0.5,
      screwY: 0, abutY: 0.04, crownY: 0.38, spin: 0,
      jaw: 0, glow: 0, parts: 1, white: 1, scan: 5, scanOn: 0, wire: 0
    };
  };
  function poses() {
    const m = isMobile();
    return {
      hero: m ? { x: 0, y: 1.7, scale: 0.6 } : { x: 2.35, y: 0.15, scale: 1.25 },
      story: m ? { x: 0, y: 0.95, scale: 0.5 } : { x: 2.1, y: 0.3, scale: 0.95 },
      about: m ? { x: 0.9, y: 2.6, scale: 0.0001 } : { x: 2.75, y: -0.1, scale: 0.72 },
      services: m ? { x: 0, y: 1.95, scale: 0.42 } : { x: 0, y: -0.2, scale: 1.15 },
      white: m ? { x: 0, y: 2.1, scale: 1.0 } : { x: 2.3, y: 0.95, scale: 1.65 },
      tech: m ? { x: 0, y: 2.0, scale: 0.95 } : { x: 2.3, y: 1.0, scale: 1.6 }
    };
  }
  Object.assign(S, base());

  // Intro overlay values (applied on top of the scroll state)
  const I = { scale: reduceMotion ? 1 : 0, rot: reduceMotion ? 0 : -2.4, crown: reduceMotion ? 0 : 1.4, screw: reduceMotion ? 0 : -1 };

  let tooth, composer, bloom, scene, camera, particles;
  const pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 };

  if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    renderer.localClippingEnabled = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(BG, 9, 22);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;

    camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 60);
    camera.position.set(0, 0.4, 11);

    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(4, 6, 5);
    const rim = new THREE.DirectionalLight(0x8fd6ea, 3.2);
    rim.position.set(-5, 3, -4);
    const rim2 = new THREE.DirectionalLight(0xffe2c4, 1.4);
    rim2.position.set(5, -2, -3);
    scene.add(key, rim, rim2);

    tooth = buildTooth();
    scene.add(tooth.pivot);

    particles = makeParticles(isMobile() ? 380 : 900);
    scene.add(particles);

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), isMobile() ? 0.28 : 0.34, 0.45, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  /* ---------- Master timeline: time = scroll px ---------- */
  let tl = null;
  let marks = {};
  const top = el => el.getBoundingClientRect().top + window.scrollY;

  function build() {
    const vh = window.innerHeight;
    const svc = $('.services'), track = $('.track');
    if (svc && track && !reduceMotion) {
      const travel = Math.max(0, track.scrollWidth - window.innerWidth);
      svc.style.height = `${travel + vh}px`;
      marks.travel = travel;
    }
    const maxScroll = document.documentElement.scrollHeight - vh;
    const sec = id => { const el = $(id); return el ? { t: top(el), h: el.offsetHeight } : { t: 0, h: 0 }; };
    const imp = sec('.implant'), ab = sec('.about'), sv = sec('.services'), wh = sec('.whitening'), te = sec('.tech'), fq = sec('.faq');
    marks = { ...marks, imp, ab, sv, wh, te, fq, maxScroll };

    if (tl) tl.kill();
    Object.assign(S, base());
    if (reduceMotion) return;
    const P = poses();
    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    let cursor = 0;
    const enter = (t, d = vh) => { const s = Math.max(cursor, t - d); const dur = Math.max(1, t - s); cursor = t; return [s, dur]; };

    // Hero → implant: move aside and explode the parts above the jaw
    tl.to(S, { ...P.story, tiltX: 0.12, rotY: -0.35, modelY: 0.15, duration: imp.t }, 0)
      .to(S, { jaw: 1, screwY: 2.7, abutY: 2.85, crownY: 3.35, ease: 'power1.inOut', duration: imp.t }, 0);
    cursor = imp.t;

    // Implant story (sticky section)
    const len = Math.max(1, imp.h - vh), u = len / 3, s0 = imp.t;
    tl.to(S, { screwY: 0, spin: TAU * 4, modelY: 0.55, ease: 'power1.inOut', duration: u }, s0)
      .to(S, { abutY: 1.3, crownY: 2.1, duration: u }, s0)
      .to(S, { glow: 1, duration: 0.45 * u }, s0 + 1.05 * u)
      .to(S, { glow: 0.2, duration: 0.45 * u }, s0 + 1.55 * u)
      .to(S, { rotY: 0.6, duration: u }, s0 + u)
      .to(S, { abutY: 0.04, ease: 'power2.in', duration: 0.45 * u }, s0 + 2.05 * u)
      .to(S, { crownY: 0.38, ease: 'power3.in', duration: 0.55 * u }, s0 + 2.35 * u)
      .to(S, { rotY: -0.3, tiltX: 0.2, duration: 0.6 * u }, s0 + 2.2 * u);
    cursor = s0 + len;
    marks.story = { s0, len };

    // About: the finished implant drifts to the side, turning, jaw dissolves
    let [s, d] = enter(ab.t + vh * 0.2, vh * 1.1);
    tl.to(S, { ...P.about, jaw: 0, glow: 0, rotY: TAU - 0.4, tiltX: 0.35, modelY: 0.3, ease: 'power2.inOut', duration: d }, s);

    // Services: comes to the centre behind the glass cards and spins with the track
    [s, d] = enter(sv.t);
    tl.to(S, { ...P.services, tiltX: 0.15, rotY: TAU + 0.2, ease: 'power2.inOut', duration: d }, s);
    const svLen = Math.max(1, sv.h - vh);
    tl.to(S, { rotY: TAU * 3 + 0.2, duration: svLen }, sv.t);
    cursor = sv.t + svLen;

    // Whitening: only the crown remains, and turns white as you scroll
    [s, d] = enter(wh.t);
    tl.to(S, { ...P.white, parts: 0, modelY: -0.85, tiltX: 0.45, rotY: TAU * 3 - 0.5, white: 0, ease: 'power2.inOut', duration: d }, s);
    const whLen = Math.max(1, wh.h - vh);
    tl.to(S, { white: 1, duration: whLen * 0.85, ease: 'power1.inOut' }, wh.t)
      .to(S, { rotY: TAU * 3 + 0.5, duration: whLen }, wh.t);
    cursor = wh.t + whLen;
    marks.whiteRange = { start: wh.t, len: whLen * 0.85 };

    // Tech: the intraoral scanner sweeps over the crown and digitises it
    [s, d] = enter(te.t);
    tl.to(S, { ...P.tech, tiltX: 0.55, rotY: TAU * 3 - 0.2, scan: 1.35, ease: 'power2.inOut', duration: d }, s);
    const teLen = Math.max(1, te.h - vh);
    tl.to(S, { scanOn: 1, duration: teLen * 0.08 }, te.t)
      .to(S, { scan: -0.12, ease: 'power1.inOut', duration: teLen * 0.8 }, te.t)
      .to(S, { rotY: TAU * 3 + 0.9, duration: teLen }, te.t)
      .to(S, { scanOn: 0, duration: teLen * 0.12 }, te.t + teLen * 0.82);
    cursor = te.t + teLen;

    // FAQ: the tooth leaves
    [s, d] = enter(fq.t, vh * 0.9);
    tl.to(S, { scale: 0.0001, y: '+=1.2', rotY: '+=' + Math.PI, ease: 'power2.in', duration: d }, s);

    tl.to({}, { duration: 1 }, Math.max(cursor, maxScroll));
    tl.time(0);
  }

  /* ---------- Frame ---------- */
  let smooth = window.scrollY;
  let lastStep = -1, lastShade = -1, idle = 0;
  const topbar = $('.topbar'), bar = $('.progress span'), track = $('.track'), trackBar = $('.track__bar span');
  const v3 = new THREE.Vector3(), q = new THREE.Quaternion(), n = new THREE.Vector3();

  function frame(time, dtMs) {
    const y = window.scrollY;
    const k = reduceMotion ? 1 : 1 - Math.exp(-(Math.min(dtMs || 16, 250) / 1000) * 7);
    smooth += (y - smooth) * k;
    if (Math.abs(y - smooth) < 0.1) smooth = y;
    if (tl) tl.time(Math.min(smooth, tl.duration()));

    // DOM bits tied to scroll
    topbar?.classList.toggle('is-scrolled', y > 40);
    if (bar && marks.maxScroll) bar.style.transform = `scaleX(${Math.min(1, y / marks.maxScroll)})`;
    if (track && marks.sv && marks.travel) {
      const p = clamp01((smooth - marks.sv.t) / Math.max(1, marks.sv.h - window.innerHeight));
      track.style.transform = `translate3d(${-p * marks.travel}px,0,0)`;
      if (trackBar) trackBar.style.transform = `scaleX(${p})`;
    }
    if (marks.story) {
      const p = (smooth - marks.story.s0) / marks.story.len;
      const step = p < 0.36 ? 0 : p < 0.68 ? 1 : 2;
      if (step !== lastStep) { lastStep = step; onStep?.(step); }
    }
    const shade = Math.round(clamp01(S.white) * 6);
    if (shade !== lastShade) { lastShade = shade; onShade?.(shade); }

    if (!renderer) return;
    pointer.x += (target.x - pointer.x) * k * 0.45;
    pointer.y += (target.y - pointer.y) * k * 0.45;
    if (!reduceMotion) idle += 0.005;

    const t = tooth;
    t.pivot.position.set(S.x, S.y, 0);
    t.pivot.scale.setScalar(Math.max(0.0001, S.scale * I.scale));
    t.pivot.visible = S.scale * I.scale > 0.01;
    t.pivot.rotation.set(S.tiltX + pointer.y * 0.12, S.rotY + I.rot + pointer.x * 0.3 + Math.sin(idle) * 0.15, 0);
    t.model.position.y = S.modelY + Math.sin(idle * 1.7) * 0.04;
    t.screw.position.y = S.screwY + I.screw;
    t.screw.rotation.y = S.spin;
    t.abutment.position.y = S.abutY + I.screw * 0.6;
    t.crown.position.y = S.crownY + I.crown;
    t.setParts(S.parts);
    t.setJaw(S.jaw, S.glow);
    t.enamel.color.lerpColors(YELLOW, WHITE, clamp01(S.white));
    t.enamel.emissiveIntensity = Math.max(0, S.white - 0.85) * 0.5 * (S.parts < 0.5 ? 1 : 0);

    // Scanner clipping planes, computed in world space from the crown's frame
    t.pivot.updateMatrixWorld(true);
    t.crown.getWorldQuaternion(q);
    n.set(0, 1, 0).applyQuaternion(q);
    t.crown.localToWorld(v3.set(0, S.scan, 0));
    t.planeSolid.setFromNormalAndCoplanarPoint(n.clone().negate(), v3);
    t.planeWire.setFromNormalAndCoplanarPoint(n, v3);
    t.wireMat.opacity = 0.6 * clamp01(1.4 - S.scan);
    t.scanner.position.y = S.scan;
    t.scanner.visible = S.scanOn > 0.01 && S.scan > -0.2 && S.scan < 1.4;
    t.scannerMat.opacity = 0.35 * S.scanOn;
    t.scanRingMat.opacity = 0.9 * S.scanOn;

    particles.rotation.y = idle * 0.25 + smooth * 0.00008;
    particles.position.y = smooth * 0.0012 + pointer.y * -0.15;
    particles.position.x = pointer.x * -0.2;

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
        composer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      }
      build();
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
  const ro = new ResizeObserver(rebuild);
  ro.observe(document.querySelector('main'));
  cleanups.push(() => ro.disconnect());

  build();

  /* ---------- Intro ---------- */
  const html = document.documentElement;
  const heroIn = () => {
    onIntroDone?.();
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(I, { scale: 1, duration: 2 }, 0)
      .to(I, { rot: 0, duration: 2.4 }, 0)
      .to(I, { crown: 0, screw: 0, duration: 1.8, ease: 'power3.out' }, 0.5)
      .from('.hero__kicker, .hero__lead, .hero__actions, .topbar', { autoAlpha: 0, y: 18, duration: 1.2, stagger: 0.08 }, 0.6);
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
      .to('.loader__center', { autoAlpha: 0, scale: 0.94, duration: 0.6 }, 2.5)
      .to('.loader__half--top', { yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, 2.8)
      .to('.loader__half--bot', { yPercent: 100, duration: 1.2, ease: 'expo.inOut' }, 2.8)
      .add(() => heroIn(), 3.1)
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

function makeParticles(count) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = 9 - Math.random() * 42;
    pos[i * 3 + 2] = -Math.random() * 12 + 3;
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const grd = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(190,235,245,.5)');
  grd.addColorStop(1, 'rgba(190,235,245,0)');
  x.fillStyle = grd;
  x.fillRect(0, 0, 64, 64);
  const m = new THREE.PointsMaterial({
    size: 0.09, map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.75,
    depthWrite: false, blending: THREE.AdditiveBlending, color: 0xa9dcea
  });
  return new THREE.Points(g, m);
}
