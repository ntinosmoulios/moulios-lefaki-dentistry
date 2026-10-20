import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.innerWidth < 700;

/* ---------- Small page behaviours ---------- */
document.getElementById('year').textContent = new Date().getFullYear();

const topbar = document.querySelector('.topbar');
const onScrollHeader = () => topbar.classList.toggle('is-scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

// Shade guide
const tabs = document.querySelectorAll('.tab');
const shadeNow = document.querySelector('.shade__now');
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => x.classList.remove('is-on'));
  t.classList.add('is-on');
  shadeNow.textContent = t.dataset.name;
}));

// Map only on consent (GDPR-friendly: no Google request until clicked)
document.getElementById('loadMap').addEventListener('click', () => {
  const map = document.getElementById('map');
  map.innerHTML = '<iframe title="Χάρτης: Οδοντιατρείο Μούλιος – Λεφάκη, Μώλος" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=38.80736,22.64763&z=16&output=embed"></iframe>';
});

/* ---------- Smooth scroll ---------- */
let lenis = null;
if (!reduceMotion && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.1 });
  lenis.on('scroll', window.ScrollTrigger.update);
  window.gsap.ticker.add(t => lenis.raf(t * 1000));
  window.gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el, { offset: id === '#top' ? 0 : -70 });
  }));
}
window.gsap.registerPlugin(window.ScrollTrigger);
const { gsap, ScrollTrigger } = window;

/* ---------- 3D scene ---------- */
const canvas = document.getElementById('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}

if (renderer) initScene();

function initScene() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.4, 11);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe3ef, 1.2);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  /* Materials */
  const enamel = new THREE.MeshPhysicalMaterial({
    color: 0xf7f4ea, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12,
    sheen: 0.4, sheenColor: new THREE.Color(0xe8f2f4)
  });
  const titanium = new THREE.MeshStandardMaterial({ color: 0xb9c3c9, metalness: 1, roughness: 0.26 });
  const titaniumDark = new THREE.MeshStandardMaterial({ color: 0x8f9aa1, metalness: 1, roughness: 0.32 });
  const boneMat = new THREE.MeshPhysicalMaterial({
    color: 0xefe5d3, roughness: 0.75, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide
  });
  const gumMat = new THREE.MeshPhysicalMaterial({
    color: 0xe39a91, roughness: 0.45, clearcoat: 0.6, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide
  });

  /* Crown: a molar built from a lathe profile, then shaped with four cusps */
  const crownProfile = [
    [0.0, 0.0], [0.38, 0.0], [0.44, 0.08], [0.56, 0.32], [0.63, 0.55], [0.62, 0.78],
    [0.55, 0.95], [0.42, 1.05], [0.25, 1.08], [0.1, 1.02], [0.0, 1.0]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const crownGeo = new THREE.LatheGeometry(new THREE.SplineCurve(crownProfile).getPoints(90), 128);
  {
    const p = crownGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const r = Math.hypot(v.x, v.z);
      const th = Math.atan2(v.z, v.x);
      const square = 1 + 0.07 * Math.cos(4 * th);           // molar is boxier than round
      v.x *= square; v.z *= square;
      if (v.y > 0.7) {
        const t = Math.min(1, (v.y - 0.7) / 0.38), k = t * t * (3 - 2 * t);
        const cusp = 0.5 + 0.5 * Math.cos(4 * th + Math.PI / 4); // four cusps
        const fissure = Math.exp(-((r - 0.0) ** 2) / 0.03);       // central groove
        v.y += k * (0.13 * cusp * Math.min(1, r / 0.35) - 0.1 * fissure);
      }
      p.setXYZ(i, v.x, v.y, v.z);
    }
    crownGeo.computeVertexNormals();
  }
  const crown = new THREE.Mesh(crownGeo, enamel);

  /* Abutment */
  const abutment = new THREE.Group();
  const ab1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.42, 6, 1), titanium);
  ab1.position.y = 0.21;
  const ab2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 48), titaniumDark);
  ab2.position.y = 0.0;
  abutment.add(ab1, ab2);

  /* Implant screw: tapered core plus a helical thread */
  const screw = new THREE.Group();
  const L = 2.0, rTop = 0.3, rBot = 0.2;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, L, 48, 1), titanium);
  core.position.y = -L / 2;
  const apex = new THREE.Mesh(new THREE.SphereGeometry(rBot, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), titanium);
  apex.position.y = -L;
  class Helix extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const turns = 9.5, y = -0.12 - t * (L - 0.25);
      const r = rTop + (rBot - rTop) * ((-y) / L) + 0.055;
      const a = t * turns * Math.PI * 2;
      return target.set(Math.cos(a) * r, y, Math.sin(a) * r);
    }
  }
  const thread = new THREE.Mesh(new THREE.TubeGeometry(new Helix(), 600, 0.05, 8, false), titanium);
  screw.add(core, apex, thread);

  /* Jaw block: bone with a gum layer on top, shown as a translucent cut-away */
  function roundedRect(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  }
  const extrude = (shape, depth) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4, curveSegments: 12 });
    g.translate(0, 0, -depth / 2);
    return g;
  };
  const jaw = new THREE.Group();
  const bone = new THREE.Mesh(extrude(roundedRect(2.6, 2.5, 0.5), 1.5), boneMat);
  bone.position.y = -1.35;
  const gum = new THREE.Mesh(extrude(roundedRect(2.7, 0.42, 0.2), 1.62), gumMat);
  gum.position.y = 0.02;
  jaw.add(bone, gum);

  // Osseointegration glow: a soft ring that appears around the screw in step 2
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x7cc4d8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.36, 2.0, 48, 1, true), glowMat);
  glow.position.y = -1.05;
  jaw.add(glow);

  /* Assembly. Final positions: screw top at y=0 (bone crest), abutment above, crown on top */
  const model = new THREE.Group();
  model.add(jaw, screw, abutment, crown);
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);

  // State driven by scroll; all values are tweened by GSAP and read every frame
  const S = {
    screwY: 0, abutY: 0.04, crownY: 0.38, crownScale: 1,
    jaw: 0, glow: 0, spin: 0,
    x: 0, y: 0, scale: 0.0, tiltX: 0.25, rotY: -0.5, modelY: 0.4
  };

  function layout() {
    const m = isMobile();
    return {
      hero: m ? { x: 0, y: 1.75, scale: 0.6 } : { x: 2.35, y: 0.15, scale: 1.25 },
      story: m ? { x: 0, y: 0.95, scale: 0.5 } : { x: 2.1, y: 0.3, scale: 0.95 }
    };
  }
  let L0 = layout();
  Object.assign(S, { x: L0.hero.x, y: L0.hero.y });

  function apply() {
    pivot.position.set(S.x, S.y, 0);
    pivot.scale.setScalar(S.scale);
    pivot.rotation.x = S.tiltX + pointer.y * 0.12;
    pivot.rotation.y = S.rotY + pointer.x * 0.25;
    model.position.y = S.modelY;
    screw.position.y = S.screwY;
    screw.rotation.y = S.spin;
    abutment.position.y = S.abutY;
    crown.position.y = S.crownY;
    crown.scale.setScalar(S.crownScale);
    boneMat.opacity = 0.32 * S.jaw;
    gumMat.opacity = 0.55 * S.jaw;
    glowMat.opacity = 0.35 * S.glow;
    jaw.visible = S.jaw > 0.01;
    glow.visible = S.glow > 0.01;
  }

  /* Pointer parallax */
  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', e => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* Render loop (paused when the 3D isn't on screen) */
  let visible = true;
  let idle = 0;
  function frame() {
    pointer.x += (target.x - pointer.x) * 0.05;
    pointer.y += (target.y - pointer.y) * 0.05;
    if (!reduceMotion) idle += 0.004;
    apply();
    pivot.rotation.y += Math.sin(idle) * 0.15;
    renderer.render(scene, camera);
  }
  gsap.ticker.add(() => { if (visible) frame(); });

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    L0 = layout();
  }
  window.addEventListener('resize', resize);

  if (reduceMotion) {
    // Static, assembled tooth in the hero; canvas scrolls away with the page
    Object.assign(S, { scale: L0.hero.scale });
    canvas.style.position = 'absolute';
    frame();
    visible = false;
    return;
  }

  /* Intro: the one orchestrated page-load moment */
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro
    .from('.hero__title .line > span', { yPercent: 110, duration: 1.4, stagger: 0.12 }, 0.1)
    .from(['.hero__kicker', '.hero__lead', '.hero__actions'], { autoAlpha: 0, y: 16, duration: 1, stagger: 0.08 }, 0.5)
    .to(S, { scale: () => L0.hero.scale, duration: 1.8 }, 0)
    .fromTo(S, { rotY: -2.6 }, { rotY: -0.5, duration: 2.2 }, 0)
    .fromTo(S, { crownY: 1.6, screwY: -0.9 }, { crownY: 0.38, screwY: 0, duration: 1.6, ease: 'power3.out' }, 0.5);

  /* Scroll story: hero → implant section */
  const steps = [...document.querySelectorAll('.step')];
  const setStep = i => steps.forEach((s, k) => s.classList.toggle('is-active', k === i));

  // Move from hero pose to story pose, exploding the parts above the jaw
  gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1, invalidateOnRefresh: true }
  })
    .to(S, { x: () => L0.story.x, y: () => L0.story.y, scale: () => L0.story.scale, tiltX: 0.12, rotY: -0.35, modelY: 0.15, ease: 'none' }, 0)
    .to(S, { jaw: 1, screwY: 2.7, abutY: 2.85, crownY: 3.35, ease: 'power1.inOut' }, 0);

  // Pinned story inside the implant section
  const story = gsap.timeline({
    scrollTrigger: {
      trigger: '.implant', start: 'top top', end: 'bottom bottom', scrub: 1,
      onUpdate: self => setStep(self.progress < 0.36 ? 0 : self.progress < 0.68 ? 1 : 2)
    }
  });
  story
    // 1. screw drills into the bone, turning as it goes
    .to(S, { screwY: 0, spin: Math.PI * 2 * 4, modelY: 0.55, ease: 'power1.inOut', duration: 1 }, 0)
    .to(S, { abutY: 1.3, crownY: 2.1, duration: 1 }, 0)
    // 2. bone integrates
    .to(S, { glow: 1, duration: 0.45 }, 1.05)
    .to(S, { glow: 0.25, duration: 0.45 }, 1.55)
    .to(S, { rotY: 0.6, duration: 1 }, 1.0)
    // 3. abutment then crown
    .to(S, { abutY: 0.04, duration: 0.45, ease: 'power2.in' }, 2.05)
    .to(S, { crownY: 0.38, duration: 0.55, ease: 'power3.in' }, 2.35)
    .to(S, { crownScale: 1.04, duration: 0.08, yoyo: true, repeat: 1 }, 2.9)
    .to(S, { rotY: -0.3, tiltX: 0.2, duration: 0.9 }, 2.2);

  // Stop rendering once the page has scrolled past the implant story
  ScrollTrigger.create({
    trigger: '.implant', start: 'top bottom', end: 'bottom top',
    onLeave: () => { visible = false; canvas.style.visibility = 'hidden'; },
    onEnterBack: () => { visible = true; canvas.style.visibility = 'visible'; }
  });
}
