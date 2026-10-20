import './tour.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { buildClinic } from './clinic.js';
import { STOPS, GO_POINTS, INFO, CHAT } from './content.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.innerWidth < 760;
const $ = s => document.querySelector(s);

/* ---------- Renderer & scene ---------- */
const canvas = $('#tour');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1c1f);
scene.fog = new THREE.Fog(0x0f1c1f, 22, 48);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(mobile ? 62 : 52, window.innerWidth / window.innerHeight, 0.05, 120);

scene.add(new THREE.HemisphereLight(0xeaf6ff, 0xd8c8b0, 0.85));
const sun = new THREE.DirectionalLight(0xfff4e6, 2.1);
sun.position.set(9, 14, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);

const clinic = buildClinic();
scene.add(clinic.root);

// dust motes in the light
const motes = (() => {
  const n = mobile ? 120 : 260, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = -6 + Math.random() * 11; pos[i * 3 + 1] = Math.random() * 2.6; pos[i * 3 + 2] = -5 + Math.random() * 11; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.018, color: 0xfff6e0, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(p);
  return p;
})();

/* ---------- Camera rig ---------- */
const rig = { pos: new THREE.Vector3(-0.6, 32, 28), look: new THREE.Vector3(-0.5, 0, 0.3) };
const view = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, orbit: true, auto: 0 };
let current = 'overview';
let flying = false;

function applyCamera(dt) {
  view.yaw += (view.tYaw - view.yaw) * Math.min(1, dt * 6);
  view.pitch += (view.tPitch - view.pitch) * Math.min(1, dt * 6);
  if (view.orbit) {
    if (!flying && !reduceMotion) view.auto += dt * 0.05;
    const off = rig.pos.clone().sub(rig.look);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), view.yaw + view.auto);
    camera.position.copy(rig.look).add(off);
    camera.lookAt(rig.look);
  } else {
    camera.position.copy(rig.pos);
    const dir = rig.look.clone().sub(rig.pos);
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), view.yaw);
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
    dir.applyAxisAngle(right, view.pitch);
    camera.lookAt(rig.pos.clone().add(dir));
  }
}

// Drag to look around (or orbit in the overview)
let drag = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: view.tYaw, pitch: view.tPitch }; canvas.setPointerCapture(e.pointerId); $('.t-hint').classList.add('is-gone'); });
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const k = view.orbit ? 0.006 : 0.004;
  view.tYaw = drag.yaw + (e.clientX - drag.x) * k * (view.orbit ? -1 : 1);
  view.tPitch = Math.max(-0.35, Math.min(0.35, drag.pitch + (e.clientY - drag.y) * 0.003));
  if (!view.orbit) view.tYaw = Math.max(-1.1, Math.min(1.1, view.tYaw));
});
const endDrag = () => { drag = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

/* ---------- Flights between stops ---------- */
function flyTo(id, { instant = false } = {}) {
  const stop = STOPS[id];
  if (!stop) return;
  const from = current;
  current = id;
  history.replaceState(null, '', id === 'overview' ? location.pathname : `#${id}`);
  updateNav();
  closePanel();
  const endPos = new THREE.Vector3(...stop.cam), endLook = new THREE.Vector3(...stop.look);
  if (mobile && id === 'overview') endPos.sub(endLook).multiplyScalar(1.45).add(endLook);
  const startPos = camera.position.clone();
  // the camera starts the flight from where it actually is (orbit/look offsets baked in)
  const startLook = new THREE.Vector3(); camera.getWorldDirection(startLook); startLook.multiplyScalar(4).add(startPos);
  rig.pos.copy(startPos); rig.look.copy(startLook);
  view.yaw = view.tYaw = view.pitch = view.tPitch = view.auto = 0;
  view.orbit = !!stop.orbit;

  const insideToInside = from !== 'overview' && id !== 'overview';
  // crane over the walls when moving room to room, dive in from above otherwise
  const mid = startPos.clone().lerp(endPos, 0.5);
  mid.y = Math.max(startPos.y, endPos.y) + (insideToInside ? 2.6 : 1.5);
  const curve = new THREE.QuadraticBezierCurve3(startPos, mid, endPos);
  const s = { t: 0, w: clinic.walls.scale.y };
  flying = true;
  const dur = instant || reduceMotion ? 0.01 : insideToInside ? 2.4 : 2.8;
  const tl = gsap.timeline({ onComplete: () => { flying = false; arrive(id); } });
  tl.to(s, {
    t: 1, duration: dur, ease: 'power3.inOut',
    onUpdate: () => { curve.getPoint(s.t, rig.pos); rig.look.lerpVectors(startLook, endLook, gsap.parseEase('power2.inOut')(s.t)); }
  }, 0);
  if (insideToInside) {
    tl.to(clinic.walls.scale, { y: 0.55, duration: dur * 0.45, ease: 'power2.inOut' }, 0)
      .to(clinic.walls.scale, { y: 1, duration: dur * 0.45, ease: 'power2.inOut' }, dur * 0.55);
  } else {
    tl.to(clinic.walls.scale, { y: stop.walls, duration: dur * 0.8, ease: 'power2.inOut' }, id === 'overview' ? 0 : dur * 0.25);
  }
}

function arrive(id) {
  const stop = STOPS[id];
  showPanel({ title: stop.title, text: stop.text, photo: stop.photo });
  if (id === 'reception') { greet(); openChat(); }
}

/* ---------- Hotspots ---------- */
const layer = $('.t-hotspots');
const hsEls = {};
const LABELS = {
  assistant: 'Μιλήστε με τη βοηθό', waiting: 'Αναμονή', sign: 'Το ιατρείο', chair1: 'Έδρα', tv: 'Τηλεόραση',
  chair2: 'Αισθητική', whitening: 'Λεύκανση', surgery: 'Χειρουργείο', prp: 'PRP', autoclave: 'Αποστείρωση', scanner: 'Σαρωτής'
};
function makeHotspot(key) {
  const isGo = key.startsWith('go:');
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `hs${isGo ? ' hs--go' : ''} is-hidden`;
  const label = isGo ? STOPS[key.slice(3)].label : LABELS[key];
  b.innerHTML = `<span class="hs__dot" aria-hidden="true">${isGo ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F1C1F" stroke-width="3"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' : ''}</span><span>${label}</span>`;
  b.addEventListener('click', () => {
    if (isGo) return flyTo(key.slice(3));
    if (key === 'assistant') { greet(); return openChat(true); }
    const info = INFO[key];
    showPanel({ title: info.title, text: info.text });
  });
  layer.appendChild(b);
  return b;
}
const tmp = new THREE.Vector3();
function hotspotWorld(key) {
  if (key.startsWith('go:')) {
    const g = GO_POINTS[key.slice(3)];
    return tmp.set(...(current === 'overview' ? g.overview : g.inside));
  }
  return tmp.copy(clinic.hotspots[key]);
}
function updateHotspots() {
  const active = new Set(flying ? [] : STOPS[current].hotspots.filter(k => k !== `go:${current}`));
  const W = window.innerWidth, H = window.innerHeight;
  for (const key of Object.keys(hsEls)) {
    const el = hsEls[key];
    if (!active.has(key)) { el.classList.add('is-hidden'); continue; }
    const p = hotspotWorld(key).project(camera);
    const vis = p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05;
    el.classList.toggle('is-hidden', !vis);
    if (vis) el.style.transform = `translate3d(${((p.x + 1) / 2 * W - 11).toFixed(1)}px, ${((1 - p.y) / 2 * H - 11).toFixed(1)}px, 0)`;
  }
}
for (const s of Object.values(STOPS)) for (const k of s.hotspots) if (!hsEls[k]) hsEls[k] = makeHotspot(k);

/* ---------- Panel & chat ---------- */
const panel = $('.t-panel'), pTitle = $('.t-panel__title'), pText = $('.t-panel__text'), pPhoto = $('.t-panel__photo');
const chat = $('.t-chat'), log = $('.t-chat__log'), opts = $('.t-chat__options');
function showPanel({ title, text, photo }) {
  pTitle.textContent = title;
  pText.textContent = text;
  pText.hidden = !text;
  if (photo) { pPhoto.src = photo; pPhoto.alt = title; pPhoto.hidden = false; } else pPhoto.hidden = true;
  chat.hidden = true;
  panel.classList.add('is-open');
}
function closePanel() { panel.classList.remove('is-open'); }
$('.t-panel__close').addEventListener('click', closePanel);

let chatStarted = false;
function addMsg(who, html) {
  const m = document.createElement('div');
  m.className = `msg msg--${who}`;
  m.innerHTML = html;
  log.appendChild(m);
  panel.scrollTop = panel.scrollHeight;
  return m;
}
function herSays(text, action) {
  const m = addMsg('her', '<span class="typing"><i></i><i></i><i></i></span>');
  talking = 1;
  setTimeout(() => {
    m.textContent = text;
    if (action) {
      const a = document.createElement('a');
      a.className = 'btn-inline';
      a.href = action.href;
      a.textContent = action.label;
      if (action.external) { a.target = '_blank'; a.rel = 'noopener'; }
      m.appendChild(document.createElement('br'));
      m.appendChild(a);
    }
    panel.scrollTop = panel.scrollHeight;
    setTimeout(() => { talking = 0; }, 900);
  }, reduceMotion ? 0 : 650);
}
function openChat(force) {
  pTitle.textContent = 'Υποδοχή';
  pText.hidden = true;
  pPhoto.hidden = true;
  chat.hidden = false;
  panel.classList.add('is-open');
  if (!chatStarted) {
    chatStarted = true;
    herSays(CHAT.greeting);
    opts.innerHTML = '';
    for (const o of CHAT.options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.q;
      b.addEventListener('click', () => {
        addMsg('me', o.q);
        herSays(o.a, o.action);
        if (o.go) setTimeout(() => flyTo(o.go), 1600);
      });
      opts.appendChild(b);
    }
  } else if (force) {
    panel.scrollTop = panel.scrollHeight;
  }
}

/* ---------- Receptionist animation ---------- */
const rec = clinic.receptionist;
let waveT = 0, talking = 0;
function greet() { waveT = 2.2; }
const headTarget = new THREE.Vector3();
function animateReceptionist(t, dt) {
  rec.body.scale.y = 1 + Math.sin(t * 2.1) * 0.006;
  // head turns towards the visitor (the camera)
  headTarget.copy(camera.position);
  rec.group.worldToLocal(headTarget);
  const yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(headTarget.x, headTarget.z)));
  rec.head.rotation.y += (yaw - rec.head.rotation.y) * Math.min(1, dt * 4);
  rec.head.rotation.x = talking ? Math.sin(t * 9) * 0.05 : Math.sin(t * 0.8) * 0.02;
  const right = rec.arms[1], left = rec.arms[0];
  if (waveT > 0) {
    waveT -= dt;
    const k = Math.min(1, waveT * 2, (2.2 - waveT) * 3);
    right.shoulder.rotation.z = THREE.MathUtils.lerp(0.12, 2.5, k);
    right.shoulder.rotation.x = THREE.MathUtils.lerp(-0.35, 0, k);
    right.fore.rotation.x = THREE.MathUtils.lerp(-0.9, -0.2, k);
    right.fore.rotation.z = Math.sin(t * 10) * 0.45 * k;
  } else {
    right.shoulder.rotation.z = 0.12 + (talking ? Math.sin(t * 4) * 0.08 : 0);
    right.shoulder.rotation.x = -0.35;
    right.fore.rotation.x = -0.9 + (talking ? Math.sin(t * 5) * 0.15 : 0);
    right.fore.rotation.z = 0;
  }
  left.fore.rotation.x = -0.9 + Math.sin(t * 1.3) * 0.03;
}

/* ---------- Nav ---------- */
const nav = $('.t-nav');
for (const [id, s] of Object.entries(STOPS)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.id = id;
  b.textContent = s.label;
  b.addEventListener('click', () => flyTo(id));
  nav.appendChild(b);
}
function updateNav() { for (const b of nav.children) b.setAttribute('aria-current', String(b.dataset.id === current)); }

/* ---------- Loop ---------- */
gsap.ticker.lagSmoothing(0);
const clock = new THREE.Timer();
gsap.ticker.add(() => {
  clock.update();
  const dt = Math.min(0.05, clock.getDelta()), t = clock.getElapsed();
  applyCamera(dt);
  animateReceptionist(t, dt);
  clinic.wlGlow.material.color.setHSL(0.55, 0.9, 0.75 + Math.sin(t * 2) * 0.08);
  motes.rotation.y = t * 0.01;
  motes.position.y = Math.sin(t * 0.3) * 0.05;
  renderer.render(scene, camera);
  updateHotspots();
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

/* ---------- Start: descend from the sky onto the model, then walk in ---------- */
clinic.walls.scale.y = STOPS.overview.walls;
const startAt = location.hash.slice(1);
const OV = mobile ? 1.45 : 1;
document.fonts?.ready.then(() => {
  document.body.classList.add('is-ready');
  current = 'overview';
  updateNav();
  if (reduceMotion) { rig.pos.set(...STOPS.overview.cam); flyTo(STOPS[startAt] ? startAt : 'overview', { instant: true }); return; }
  gsap.to(rig.pos, {
    x: STOPS.overview.cam[0] * OV, y: STOPS.overview.cam[1] * OV, z: STOPS.overview.cam[2] * OV, duration: 3, ease: 'power3.out',
    onComplete: () => {
      if (STOPS[startAt] && startAt !== 'overview') flyTo(startAt);
      else { showPanel(STOPS.overview); setTimeout(() => { if (current === 'overview' && !flying) flyTo('reception'); }, 2600); }
    }
  });
});
