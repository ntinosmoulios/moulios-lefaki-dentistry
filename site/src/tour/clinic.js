// Procedural 3D model of the clinic. Units are metres.
// Floor plan (top view, +z towards the street):
//
//   z=6  ┌──────── entrance ────┬───────────────────┐
//        │  Υποδοχή / αναμονή   │  Ιατρείο 1 (μπλε) │ window x=5
//        │  (reception)        door  Μούλιος        │
//   z=0  ├──────────────────────┼──door─────────────┤
//        │  Χειρουργείο         door Ιατρείο 2      │ window x=5
//        │  εμφυτευμάτων        │  (πράσινο) Λεφάκη  │
//   z=-5 └──── window ──────────┴───────────────────┘
//       x=-6                   x=0                 x=5
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const H = 2.7; // wall height

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...o });
const MAT = {
  white: mat(0xf4f5f1),
  offwhite: mat(0xe9ebe6),
  counter: mat(0xf7f7f4, { roughness: 0.3 }),
  cream: mat(0xefe9dc, { roughness: 0.45 }),
  chrome: mat(0xc8d0d4, { metalness: 1, roughness: 0.25 }),
  dark: mat(0x1d2326, { roughness: 0.4 }),
  screen: mat(0x0d1418, { roughness: 0.2, emissive: 0x16303a, emissiveIntensity: 0.6 }),
  screenOn: mat(0x0d1418, { roughness: 0.2, emissive: 0x6fb6c8, emissiveIntensity: 0.9 }),
  blue: mat(0x3d6fa8, { roughness: 0.45 }),
  teal: mat(0x3f8c86, { roughness: 0.45 }),
  mintUph: mat(0xb9e3b0, { roughness: 0.5 }),
  creamUph: mat(0xf1ead6, { roughness: 0.5 }),
  wood: mat(0xc7a57c, { roughness: 0.7 }),
  oak: mat(0xd8c1a0, { roughness: 0.75 }),
  vinyl: mat(0xbfc7c5, { roughness: 0.8 }),
  vinylWarm: mat(0xc9c4ba, { roughness: 0.8 }),
  brand: mat(0x15302f, { roughness: 0.55 }),
  plant: mat(0x3f7a4a, { roughness: 0.8, flatShading: true }),
  pot: mat(0xd9d2c4, { roughness: 0.6 }),
  sofa: mat(0x2f5d63, { roughness: 0.85 }),
  skin: mat(0xe2b69a, { roughness: 0.7 }),
  hair: mat(0x3a2a20, { roughness: 0.8 }),
  scrubs: mat(0xe9f1f1, { roughness: 0.75 }),
  scrubsAccent: mat(0x3f8c86, { roughness: 0.75 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xbfe6ee, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.25 }),
  daylight: new THREE.MeshBasicMaterial({ color: 0xf6fbff }),
  led: new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
  ledCool: new THREE.MeshBasicMaterial({ color: 0xeaf6ff }),
  green: mat(0x6fbf73, { roughness: 0.5 }),
  rubber: mat(0x2a2f33, { roughness: 0.9 })
};

// Rounded box. Small parts get a plain box and no shadow: they cost triangles, not looks.
function rbox(w, h, d, m, r = 0.03) {
  const small = Math.max(w, h, d) < 0.3;
  const geo = small ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
  const mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = !small;
  mesh.receiveShadow = true;
  return mesh;
}
function at(mesh, x, y, z, parent, ry = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  parent.add(mesh);
  return mesh;
}
function cyl(rt, rb, h, m, seg = 24) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  c.castShadow = true; c.receiveShadow = true;
  return c;
}

/* ---------- Building blocks ---------- */

// A wall from (x1,z1) to (x2,z2) with optional openings [{from, to, top}] along its length
function wall(walls, x1, z1, x2, z2, m, openings = [], t = 0.12) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const ang = Math.atan2(z2 - z1, x2 - x1);
  const g = new THREE.Group();
  g.position.set(x1, 0, z1);
  g.rotation.y = -ang;
  const cuts = [...openings].sort((a, b) => a.from - b.from);
  let pos = 0;
  const seg = (a, b, y0 = 0, y1 = H) => {
    if (b - a < 0.01) return;
    const w = new THREE.Mesh(new THREE.BoxGeometry(b - a, y1 - y0, t), m);
    w.position.set((a + b) / 2, (y0 + y1) / 2, 0);
    w.castShadow = true; w.receiveShadow = true;
    g.add(w);
  };
  for (const c of cuts) {
    seg(pos, c.from);
    if (c.top) seg(c.from, c.to, c.top, H);        // lintel above a door
    if (c.sill) seg(c.from, c.to, 0, c.sill);       // wall under a window
    pos = c.to;
  }
  seg(pos, len);
  walls.add(g);
  return g;
}

// Daylight window with vertical blinds (as in both treatment-room photos)
function windowBlinds(parent, x, z, width, ry, sill = 0.9, top = 2.45) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  const light = new THREE.Mesh(new THREE.PlaneGeometry(width, top - sill), MAT.daylight);
  light.position.set(0, (sill + top) / 2, -0.07);
  g.add(light);
  const n = Math.round(width / 0.09);
  const slat = new THREE.BoxGeometry(0.085, top - sill + 0.12, 0.006);
  const slats = new THREE.InstancedMesh(slat, mat(0xf3f4f2, { roughness: 0.9, transparent: true, opacity: 0.93 }), n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    o.position.set(-width / 2 + (i + 0.5) * (width / n), (sill + top) / 2, 0);
    o.rotation.y = 0.55;
    o.updateMatrix();
    slats.setMatrixAt(i, o.matrix);
  }
  g.add(slats);
  parent.add(g);
  return g;
}

// Lower cabinet run with coloured drawer fronts and a white worktop
function cabinets(parent, x, z, length, ry, drawerMat, { sink = false } = {}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  at(rbox(length, 0.82, 0.58, MAT.white, 0.02), 0, 0.41, 0, g);
  at(rbox(length + 0.04, 0.05, 0.64, MAT.counter, 0.015), 0, 0.845, 0.02, g);
  const cols = Math.max(2, Math.round(length / 0.6));
  const w = length / cols;
  for (let i = 0; i < cols; i++) {
    for (let r = 0; r < 3; r++) {
      const d = rbox(w - 0.04, 0.22, 0.02, drawerMat, 0.01);
      at(d, -length / 2 + w * (i + 0.5), 0.15 + r * 0.25, 0.3, g);
      const h = rbox(w * 0.45, 0.018, 0.02, MAT.chrome, 0.008);
      at(h, -length / 2 + w * (i + 0.5), 0.22 + r * 0.25, 0.32, g);
    }
  }
  if (sink) {
    const s = rbox(0.5, 0.04, 0.38, MAT.chrome, 0.02);
    at(s, length / 2 - 0.45, 0.85, 0.02, g);
    const tap = cyl(0.015, 0.015, 0.28, MAT.chrome, 12);
    at(tap, length / 2 - 0.45, 1.0, -0.18, g);
  }
  parent.add(g);
  return g;
}

// Dental chair with upholstery colour, operating light, assistant arm and optional monitor/TV
function dentalChair(parent, x, z, ry, uph, { tray = 'cream', monitor = false, led = 'warm', mirror = false, base = null } = {}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  if (mirror) g.scale.x = -1;   // left-handed setup: delivery unit on the other side
  // base and column
  at(rbox(0.7, 0.08, 1.0, MAT.cream, 0.04), 0, 0.04, 0, g);
  at(rbox(0.36, 0.42, 0.42, MAT.cream, 0.08), 0, 0.29, 0.05, g);
  // seat, backrest, headrest, legrest
  const seat = at(rbox(0.6, 0.12, 0.62, uph, 0.06), 0, 0.56, 0.05, g);
  const back = rbox(0.58, 0.12, 0.8, uph, 0.06);
  back.rotation.x = -0.45;
  at(back, 0, 0.78, -0.55, g);
  const head = rbox(0.3, 0.1, 0.26, uph, 0.05);
  head.rotation.x = -0.25;
  at(head, 0, 1.0, -1.02, g);
  const legs = rbox(0.5, 0.1, 0.74, uph, 0.05);
  legs.rotation.x = 0.25;
  at(legs, 0, 0.5, 0.68, g);
  // armrests
  for (const s of [-1, 1]) at(rbox(0.06, 0.06, 0.42, MAT.cream, 0.03), s * 0.33, 0.7, -0.05, g);
  // doctor's delivery unit on an arm (handpieces in a holder)
  const arm = at(rbox(0.06, 0.06, 0.7, MAT.cream, 0.03), 0.62, 0.95, 0.15, g);
  arm.rotation.y = 0.5;
  const trayBody = at(rbox(0.5, 0.08, 0.32, tray === 'green' ? MAT.mintUph : MAT.cream, 0.03), 0.78, 0.98, 0.55, g);
  trayBody.rotation.y = 0.3;
  for (let i = 0; i < 4; i++) {
    const hp = cyl(0.014, 0.012, 0.26, MAT.chrome, 10);
    hp.rotation.z = 0.25;
    at(hp, 0.6 + i * 0.1, 1.12, 0.48 + i * 0.05, g);
  }
  // assistant side: spittoon unit
  at(rbox(0.22, 0.75, 0.22, MAT.cream, 0.05), -0.55, 0.38, -0.4, g);
  at(cyl(0.12, 0.09, 0.08, MAT.white), -0.55, 0.8, -0.4, g);
  // operating light on a pole + jointed arm
  const pole = at(cyl(0.035, 0.035, 1.55, MAT.cream, 12), -0.45, 1.5, -0.8, g);
  const arm1 = at(rbox(0.06, 0.06, 0.75, MAT.cream, 0.03), -0.3, 2.26, -0.45, g);
  arm1.rotation.y = -0.6;
  const lamp = new THREE.Group();
  at(lamp, -0.05, 2.1, -0.1, g);
  lamp.rotation.x = 0.6;
  lamp.add(rbox(0.42, 0.07, 0.2, MAT.white, 0.035));
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), led === 'warm' ? MAT.led : MAT.ledCool);
    l.rotation.x = Math.PI / 2;
    l.position.set(-0.15 + i * 0.06, -0.037, 0);
    lamp.add(l);
  }
  // monitor on an arm (Moulios room photo)
  if (monitor) {
    const mon = at(rbox(0.62, 0.38, 0.04, MAT.dark, 0.015), -0.85, 1.55, -0.2, g);
    mon.rotation.y = 0.9;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.34), MAT.screenOn);
    scr.position.z = 0.022;
    mon.add(scr);
    at(cyl(0.02, 0.02, 1.2, MAT.cream, 10), -0.85, 0.9, -0.3, g);
  }
  parent.add(g);
  return g;
}

function deskMonitor(parent, x, y, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  const m = at(rbox(0.56, 0.34, 0.03, MAT.dark, 0.01), 0, 0.3, 0, g);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.3), MAT.screenOn);
  s.position.z = 0.017;
  m.add(s);
  at(rbox(0.06, 0.12, 0.04, MAT.dark, 0.01), 0, 0.08, -0.02, g);
  at(rbox(0.2, 0.015, 0.14, MAT.dark, 0.005), 0, 0.01, -0.02, g);
  parent.add(g);
  return g;
}

function plant(parent, x, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  at(cyl(0.2, 0.16, 0.42, MAT.pot), 0, 0.21, 0, g);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 - i * 0.015, 0), MAT.plant);
    leaf.castShadow = true;
    const a = i * 1.9;
    leaf.position.set(Math.cos(a) * 0.14, 0.6 + i * 0.15, Math.sin(a) * 0.14);
    leaf.scale.set(1, 1.4, 1);
    g.add(leaf);
  }
  parent.add(g);
  return g;
}

function signTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#15302f'; x.fillRect(0, 0, 1024, 512);
  x.strokeStyle = '#BFF4FF'; x.lineWidth = 7; x.lineJoin = 'round';
  // tooth outline (same path as the logo, scaled)
  x.save(); x.translate(432, 70); x.scale(5, 5);
  x.stroke(new Path2D('M9 4c-3.4 0-6 2.8-6 6.6 0 3.2 1.4 5.3 2.4 7.6.9 2.2 1.1 5.4 1.8 8.3.4 1.6 1.2 2.5 2.2 2.5 1.3 0 1.8-1.4 2.2-3.4.5-2.5.9-5.6 2.4-5.6s1.9 3.1 2.4 5.6c.4 2 .9 3.4 2.2 3.4 1 0 1.8-.9 2.2-2.5.7-2.9.9-6.1 1.8-8.3 1-2.3 2.4-4.4 2.4-7.6C26 6.8 23.4 4 20 4c-2.3 0-3.3 1.2-5.5 1.2S11.3 4 9 4z'));
  x.restore();
  x.fillStyle = '#F2EEE4';
  x.textAlign = 'center';
  x.font = '400 78px "Noto Serif Display", serif';
  x.fillText('Μούλιος & Λεφάκη', 512, 330);
  x.font = '500 34px "Commissioner", sans-serif';
  x.fillStyle = '#9DB1B0';
  x.fillText('Χειρουργοί Οδοντίατροι', 512, 395);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Stylised receptionist: friendly, simple shapes, animated in tour.js
function assistant(parent, x, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  const body = new THREE.Group();
  g.add(body);
  at(cyl(0.16, 0.2, 0.55, MAT.scrubs), 0, 1.0, 0, body);            // torso
  at(cyl(0.2, 0.22, 0.45, MAT.scrubs), 0, 0.55, 0, body);           // hips/legs (behind desk)
  const collar = at(cyl(0.165, 0.165, 0.04, MAT.scrubsAccent), 0, 1.27, 0, body);
  collar.scale.set(1, 1, 0.8);
  const neck = at(cyl(0.05, 0.055, 0.1, MAT.skin), 0, 1.33, 0, body);
  const head = new THREE.Group();
  at(head, 0, 1.5, 0, body);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 24), MAT.skin);
  skull.scale.set(0.92, 1.05, 0.95);
  head.add(skull);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.137, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55), MAT.hair);
  hairCap.rotation.x = -0.35;
  hairCap.position.set(0, 0.012, -0.012);
  head.add(hairCap);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 16), MAT.hair);
  bun.position.set(0, 0.08, -0.12);
  head.add(bun);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), MAT.dark);
    eye.position.set(s * 0.045, 0.01, 0.118);
    head.add(eye);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16, Math.PI), mat(0xb5655a));
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.045, 0.118);
  head.add(smile);
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.2, 1.22, 0);
    body.add(shoulder);
    const upper = cyl(0.045, 0.04, 0.32, MAT.scrubs, 12);
    upper.position.y = -0.16;
    shoulder.add(upper);
    const fore = new THREE.Group();
    fore.position.y = -0.32;
    shoulder.add(fore);
    const lower = cyl(0.036, 0.032, 0.28, MAT.skin, 12);
    lower.position.y = -0.14;
    fore.add(lower);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), MAT.skin);
    hand.position.y = -0.3;
    fore.add(hand);
    shoulder.rotation.z = s * 0.12;
    shoulder.rotation.x = -0.35;
    fore.rotation.x = -0.9;
    arms.push({ shoulder, fore, side: s });
  }
  parent.add(g);
  return { group: g, body, head, arms };
}

/* ---------- Textures drawn on canvas ---------- */
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  return t;
}
// Square floor tiles with grout and gentle per-tile variation; optional marble veining
function tiles(base, grout, { n = 4, marble = false, vary = 10, seed = 1 } = {}) {
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  return canvasTex(512, 512, (x, w) => {
    const s = w / n;
    x.fillStyle = grout; x.fillRect(0, 0, w, w);
    const [R, G, B] = base;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const d = (rnd() - 0.5) * vary;
      x.fillStyle = `rgb(${R + d},${G + d * 0.9},${B + d * 0.8})`;
      x.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      if (marble) {
        x.strokeStyle = `rgba(255,240,220,${0.05 + rnd() * 0.06})`;
        x.lineWidth = 1 + rnd() * 2;
        for (let k = 0; k < 3; k++) {
          x.beginPath();
          x.moveTo(i * s + rnd() * s, j * s);
          x.bezierCurveTo(i * s + rnd() * s, j * s + s * 0.3, i * s + rnd() * s, j * s + s * 0.7, i * s + rnd() * s, j * s + s);
          x.stroke();
        }
        x.fillStyle = `rgba(60,35,20,${0.05 + rnd() * 0.06})`;
        x.beginPath(); x.ellipse(i * s + rnd() * s, j * s + rnd() * s, s * 0.3, s * 0.12, rnd() * 3, 0, 7); x.fill();
      }
    }
  });
}
// Outdoor porch tiles with circular ornaments, as in the entrance photo
function porchTiles() {
  return canvasTex(512, 512, (x, w) => {
    x.fillStyle = '#c9ccc8'; x.fillRect(0, 0, w, w);
    const s = w / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      x.fillStyle = (i + j) % 2 ? '#bfc4c1' : '#d1d3cf';
      x.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
      x.strokeStyle = 'rgba(70,110,140,.45)'; x.lineWidth = 6;
      x.beginPath(); x.arc(i * s + s / 2, j * s + s / 2, s * 0.32, 0, 7); x.stroke();
      x.strokeStyle = 'rgba(160,110,80,.35)'; x.lineWidth = 3;
      x.beginPath(); x.arc(i * s + s / 2, j * s + s / 2, s * 0.18, 0, 7); x.stroke();
    }
  });
}
// The light striped wood veneer on the reception counter
function stripedWood() {
  return canvasTex(512, 256, (x, w, h) => {
    for (let i = 0; i < w; i += 3) {
      const t = Math.sin(i * 0.37) * 0.5 + Math.sin(i * 0.11) * 0.5;
      const v = 168 + t * 22 + Math.random() * 10;
      x.fillStyle = `rgb(${v},${v - 8},${v - 18})`;
      x.fillRect(i, 0, 3, h);
    }
  });
}
function screenTex(draw) {
  return canvasTex(512, 320, draw);
}

/* ---------- More furniture from the photos ---------- */
function sofaPiece(parent, x, z, ry, m, len = 1.9) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = ry;
  at(rbox(len, 0.24, 0.86, m, 0.06), 0, 0.2, 0, g);
  for (const sx of [-1, 1]) at(rbox(len / 2 - 0.04, 0.16, 0.66, m, 0.07), sx * (len / 4), 0.4, 0.06, g);   // seat cushions
  at(rbox(len, 0.5, 0.22, m, 0.08), 0, 0.6, -0.34, g);                                                       // back
  for (const sx of [-1, 1]) at(rbox(0.2, 0.42, 0.86, m, 0.08), sx * (len / 2 + 0.06), 0.37, 0, g);          // arms
  for (const sx of [-0.55, 0.15]) { const p = at(rbox(0.42, 0.38, 0.12, m, 0.06), sx * len * 0.5, 0.66, -0.18, g); p.rotation.x = -0.2; }
  parent.add(g);
  return g;
}
function glassTable(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfeff0, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.35 });
  at(cyl(0.45, 0.45, 0.025, glass, 40), 0, 0.46, 0, g);
  at(cyl(0.4, 0.4, 0.02, glass, 40), 0, 0.16, 0, g);
  for (let k = 0; k < 3; k++) { const a = k * 2.1; at(cyl(0.025, 0.025, 0.46, MAT.dark, 8), Math.cos(a) * 0.3, 0.23, Math.sin(a) * 0.3, g); }
  at(rbox(0.3, 0.03, 0.22, mat(0x6fb6c8), 0.005), 0.05, 0.18, 0.05, g);   // magazines
  at(rbox(0.28, 0.02, 0.2, mat(0xe39a91), 0.005), -0.05, 0.2, -0.05, g);
  // bonsai in a striped bowl
  at(cyl(0.16, 0.1, 0.12, mat(0xe8e2d4)), 0, 0.53, 0, g);
  at(cyl(0.02, 0.03, 0.22, mat(0x5a4632), 8), 0, 0.68, 0, g);
  for (let k = 0; k < 5; k++) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), MAT.plant);
    leaf.position.set(Math.cos(k * 1.3) * 0.1, 0.78 + (k % 2) * 0.08, Math.sin(k * 1.3) * 0.12);
    leaf.scale.set(1.2, 0.7, 1.2);
    g.add(leaf);
  }
  parent.add(g);
  return g;
}
function zebraBlind(parent, x, z, width, ry, sill = 0.9, top = 2.45) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = ry;
  const light = new THREE.Mesh(new THREE.PlaneGeometry(width, top - sill), MAT.daylight);
  light.position.set(0, (sill + top) / 2, -0.07);
  g.add(light);
  const tex = canvasTex(64, 256, (c, w, h) => { for (let y = 0; y < h; y += 16) { c.fillStyle = '#f4f3ef'; c.fillRect(0, y, w, 9); c.fillStyle = 'rgba(244,243,239,.25)'; c.fillRect(0, y + 9, w, 7); } }, [1, (top - sill) * 3]);
  const blind = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.05, top - sill - 0.05), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 }));
  blind.position.set(0, (sill + top) / 2, -0.02);
  g.add(blind);
  at(rbox(width, 0.08, 0.1, MAT.white, 0.02), 0, top + 0.02, 0, g);
  parent.add(g);
  return g;
}
function doorLeaf(parent, x, z, ry, { frame = 0x4a3226, leaf = 0x4a3226, open = 1.2, w = 0.95 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = ry;
  const fm = mat(frame, { roughness: 0.5 });
  for (const sx of [0, w]) at(rbox(0.07, 2.12, 0.16, fm, 0.01), sx, 1.06, 0, g);
  at(rbox(w + 0.07, 0.07, 0.16, fm, 0.01), w / 2, 2.12, 0, g);
  const hinge = new THREE.Group();
  hinge.position.set(0.04, 0, 0);
  hinge.rotation.y = -open;
  g.add(hinge);
  at(rbox(w - 0.06, 2.06, 0.04, mat(leaf, { roughness: 0.45 }), 0.01), (w - 0.06) / 2, 1.04, 0, hinge);
  at(cyl(0.015, 0.015, 0.12, MAT.chrome, 8), w - 0.16, 1.02, 0.05, hinge).rotation.x = Math.PI / 2;
  parent.add(g);
  return g;
}
function xray(parent, x, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = ry;
  at(rbox(0.3, 0.22, 0.12, MAT.white, 0.03), 0, 1.75, 0.06, g);
  const a1 = at(rbox(0.07, 0.07, 0.6, MAT.white, 0.03), 0.1, 1.8, 0.4, g); a1.rotation.y = 0.3;
  const a2 = at(rbox(0.07, 0.07, 0.5, MAT.white, 0.03), 0.3, 1.7, 0.8, g); a2.rotation.y = -0.4;
  const head = at(rbox(0.22, 0.2, 0.24, MAT.white, 0.05), 0.4, 1.55, 1.05, g);
  at(cyl(0.05, 0.06, 0.22, MAT.cream, 16), 0.4, 1.55, 1.25, g).rotation.x = Math.PI / 2;
  head.rotation.y = 0.5;
  parent.add(g);
  return g;
}
function sconce(parent, x, y, z, ry) {
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 24, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 0.5, roughness: 0.4 }));
  s.position.set(x, y, z); s.rotation.y = ry;
  parent.add(s);
  return s;
}
function waterCooler(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  at(rbox(0.32, 0.95, 0.32, MAT.white, 0.03), 0, 0.48, 0, g);
  at(rbox(0.33, 0.06, 0.2, MAT.dark, 0.01), 0, 0.7, 0.08, g);
  const bottle = cyl(0.14, 0.14, 0.42, new THREE.MeshPhysicalMaterial({ color: 0x9fd8f2, roughness: 0.05, transparent: true, opacity: 0.55 }), 24);
  at(bottle, 0, 1.17, 0, g);
  parent.add(g);
  return g;
}
function armchair(parent, x, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = ry;
  const leather = mat(0x1e2124, { roughness: 0.35 });
  at(rbox(0.7, 0.2, 0.7, leather, 0.06), 0, 0.42, 0, g);
  const back = at(rbox(0.66, 0.75, 0.16, leather, 0.07), 0, 0.85, -0.3, g); back.rotation.x = -0.12;
  for (const sx of [-1, 1]) at(rbox(0.1, 0.06, 0.55, leather, 0.03), sx * 0.34, 0.66, 0, g);
  at(cyl(0.03, 0.03, 0.32, MAT.chrome, 8), 0, 0.18, 0, g);
  at(cyl(0.3, 0.3, 0.03, MAT.chrome, 5), 0, 0.03, 0, g);
  parent.add(g);
  return g;
}
function coatStand(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  at(cyl(0.02, 0.02, 1.8, MAT.chrome, 8), 0, 0.9, 0, g);
  at(cyl(0.2, 0.22, 0.03, MAT.chrome, 16), 0, 0.02, 0, g);
  for (let k = 0; k < 6; k++) { const h = cyl(0.008, 0.008, 0.16, MAT.chrome, 6); h.rotation.z = Math.PI / 2; h.rotation.y = k; at(h, Math.cos(k) * 0.06, 0.9 + k * 0.15, Math.sin(k) * 0.06, g); }
  parent.add(g);
  return g;
}
function tallPlanter(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  at(rbox(0.36, 0.8, 0.36, mat(0x2d3033, { roughness: 0.6 }), 0.03), 0, 0.4, 0, g);
  at(cyl(0.02, 0.025, 0.9, mat(0x5a4632), 8), 0, 1.2, 0, g);
  const rubber = mat(0x24452e, { roughness: 0.4, flatShading: true });
  for (let k = 0; k < 14; k++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), rubber);
    leaf.scale.set(1, 0.25, 1.9);
    const a = k * 2.4;
    leaf.position.set(Math.cos(a) * 0.17, 0.95 + k * 0.07, Math.sin(a) * 0.17);
    leaf.rotation.y = -a; leaf.rotation.x = 0.4;
    leaf.castShadow = true;
    g.add(leaf);
  }
  parent.add(g);
  return g;
}
// Beyond Polus whitening unit: white tower with blue trim, display and an articulated arm
function polus(parent, x, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = ry;
  const body = at(rbox(0.42, 1.0, 0.36, MAT.white, 0.12), 0, 0.52, 0, g);
  for (const sx of [-1, 1]) at(rbox(0.03, 0.9, 0.3, mat(0x2a55b8, { roughness: 0.4 }), 0.015), sx * 0.21, 0.52, 0, g);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.16), new THREE.MeshBasicMaterial({ map: screenTex((c, w, h) => {
    c.fillStyle = '#cfe9f2'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d4f64'; c.font = 'bold 120px sans-serif'; c.textAlign = 'center'; c.fillText('00:37', w / 2, h / 2 + 40);
  }) }));
  disp.position.set(0, 0.9, 0.185); disp.rotation.x = -0.35;
  g.add(disp);
  for (const sx of [-1, 1]) at(rbox(0.04, 0.2, 0.06, MAT.white, 0.02), sx * 0.24, 0.85, 0, g);   // handles
  const j1 = at(cyl(0.07, 0.07, 0.08, MAT.white, 20), 0, 1.07, 0, g);
  const arm1 = at(rbox(0.07, 0.07, 0.5, MAT.white, 0.03), 0, 1.25, 0.2, g); arm1.rotation.x = -0.7;
  at(cyl(0.06, 0.06, 0.08, MAT.white, 20), 0, 1.42, 0.42, g).rotation.z = Math.PI / 2;
  const arm2 = at(rbox(0.06, 0.06, 0.45, MAT.white, 0.03), 0, 1.4, 0.64, g); arm2.rotation.x = 0.2;
  const head = new THREE.Group();
  head.position.set(0, 1.32, 0.9); head.rotation.x = 0.9;
  g.add(head);
  head.add(rbox(0.32, 0.08, 0.22, MAT.white, 0.04));
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.08, 32), new THREE.MeshBasicMaterial({ color: 0xffa640 }));
  glow.rotation.x = Math.PI / 2; glow.position.set(-0.05, -0.045, 0);
  head.add(glow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.105, 32), new THREE.MeshBasicMaterial({ color: 0xffc070, side: THREE.DoubleSide }));
  ring.rotation.x = Math.PI / 2; ring.position.set(-0.05, -0.046, 0);
  head.add(ring);
  parent.add(g);
  return { group: g, glow };
}
// LD-9800 centrifuge: box with a sloped lid and a black control panel with red digits
function centrifuge(parent, x, y, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = ry;
  at(rbox(0.46, 0.26, 0.42, MAT.white, 0.03), 0, 0.13, 0, g);
  const lid = at(rbox(0.48, 0.04, 0.36, MAT.white, 0.015), 0, 0.29, -0.03, g); lid.rotation.x = -0.08;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.16), new THREE.MeshBasicMaterial({ map: screenTex((c, w, h) => {
    c.fillStyle = '#1b1e21'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff3a2a'; c.font = 'bold 70px monospace'; c.fillText('3', 30, 90); c.fillText('00:00', 260, 90);
    c.fillStyle = '#ffa020'; c.beginPath(); c.arc(400, 170, 14, 0, 7); c.fill();
    c.fillStyle = '#2bbf55'; c.beginPath(); c.arc(450, 170, 14, 0, 7); c.fill();
    c.fillStyle = '#e83a3a'; c.beginPath(); c.arc(450, 250, 16, 0, 7); c.fill();
    c.fillStyle = '#3a3f44'; for (let i = 0; i < 6; i++) c.fillRect(40 + i * 60, 150 + (i % 2) * 70, 44, 36);
  }) }));
  panel.position.set(0.04, 0.14, 0.212);
  g.add(panel);
  parent.add(g);
  return g;
}
// Launca-style intraoral scanner cart with a large touchscreen showing a scanned arch
function scannerCart(parent, x, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = ry;
  at(rbox(0.5, 0.75, 0.42, MAT.white, 0.08), 0, 0.42, 0, g);
  at(rbox(0.36, 0.08, 0.06, MAT.white, 0.03), 0, 0.7, 0.24, g);   // handle
  at(rbox(0.5, 0.05, 0.42, MAT.dark, 0.02), 0, 0.06, 0, g);
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), new THREE.MeshBasicMaterial({ color: 0x5ab8ff }));
  led.position.set(0, 0.2, 0.212); g.add(led);
  at(rbox(0.16, 0.42, 0.12, MAT.white, 0.05), 0, 1.0, -0.06, g);  // neck
  at(rbox(0.32, 0.04, 0.12, MAT.dark, 0.015), 0, 1.0, 0.1, g);    // wand holder
  const wand = cyl(0.018, 0.024, 0.24, MAT.white, 12); wand.rotation.z = Math.PI / 2; at(wand, 0.02, 1.04, 0.12, g);
  const mon = at(rbox(0.66, 0.42, 0.04, MAT.dark, 0.02), 0, 1.42, 0, g);
  mon.rotation.x = -0.12;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), new THREE.MeshBasicMaterial({ map: screenTex((c, w, h) => {
    c.fillStyle = '#eef3f6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2f8fd8'; c.fillRect(0, 0, w, 26);
    c.fillStyle = '#f07b3f'; c.beginPath(); c.arc(40, 70, 22, 0, 7); c.fill();
    c.fillStyle = '#2f8fd8'; c.beginPath(); c.arc(40, 125, 22, 0, 7); c.fill();
    // scanned dental arch: horseshoe of pink gum with white teeth
    c.save(); c.translate(w / 2 + 20, h / 2 + 40);
    c.strokeStyle = '#d98f95'; c.lineWidth = 60; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, 95, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    c.fillStyle = '#f7f1e6';
    for (let i = 0; i < 14; i++) { const a = Math.PI * (1.08 + i * 0.06); c.beginPath(); c.ellipse(Math.cos(a) * 95, Math.sin(a) * 95, 13, 16, a, 0, 7); c.fill(); }
    c.restore();
  }) }));
  scr.position.z = 0.022;
  mon.add(scr);
  parent.add(g);
  return g;
}
function entranceDoor(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const frame = mat(0xf3f4f3, { roughness: 0.35, metalness: 0.2 });
  for (const sx of [-0.55, 0.55]) at(rbox(0.07, 2.25, 0.1, frame, 0.01), sx, 1.12, 0, g);
  at(rbox(1.17, 0.07, 0.1, frame, 0.01), 0, 2.25, 0, g);
  at(rbox(1.04, 0.06, 0.08, frame, 0.01), 0, 1.05, 0, g);
  const lower = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.0), mat(0x8e9590, { roughness: 0.5 }));
  lower.position.set(0, 0.52, 0.01); g.add(lower);
  const lower2 = lower.clone(); lower2.rotation.y = Math.PI; lower2.position.z = -0.01; g.add(lower2);
  const glassTop = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.12), new THREE.MeshPhysicalMaterial({ color: 0xcfe6ea, roughness: 0.1, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  glassTop.position.set(0, 1.64, 0); g.add(glassTop);
  const decal = new THREE.Mesh(new THREE.CircleGeometry(0.34, 48), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, map: canvasTex(256, 256, (c, w) => {
    c.fillStyle = 'rgba(205,210,212,.92)'; c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 2, 0, 7); c.fill();
    c.strokeStyle = '#5c6366'; c.lineWidth = 6; c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 6, 0, 7); c.stroke();
    c.save(); c.translate(w / 2 - 54, 36); c.scale(4.6, 4.6); c.lineWidth = 1.4; c.strokeStyle = '#4a5154';
    c.stroke(new Path2D('M9 4c-3.4 0-6 2.8-6 6.6 0 3.2 1.4 5.3 2.4 7.6.9 2.2 1.1 5.4 1.8 8.3.4 1.6 1.2 2.5 2.2 2.5 1.3 0 1.8-1.4 2.2-3.4.5-2.5.9-5.6 2.4-5.6s1.9 3.1 2.4 5.6c.4 2 .9 3.4 2.2 3.4 1 0 1.8-.9 2.2-2.5.7-2.9.9-6.1 1.8-8.3 1-2.3 2.4-4.4 2.4-7.6C26 6.8 23.4 4 20 4c-2.3 0-3.3 1.2-5.5 1.2S11.3 4 9 4z'));
    c.restore();
  }) }));
  decal.position.set(0, 1.7, 0.015); g.add(decal);
  at(cyl(0.025, 0.025, 0.1, MAT.chrome, 10), 0.42, 1.05, 0.07, g).rotation.x = Math.PI / 2;
  parent.add(g);
  return g;
}

/* ---------- The clinic ----------
   Plan (top view, the street is at +z; "left/right" as you walk in):

                 street, entrance at x=0
        ┌──────────────┬───────────────┐ z=6
        │ waiting area │ reception desk│        Reception x[-4,4]
        │  (sofas)     │  (assistant)  │
        └──────────┬─double door─┬─────┘ z=0
   ┌────────┬──────┴──┐  hall  ┌──┴──────────┐
   │Surgery │ Moulios │ x[-1,1]│ Maria Lefaki │
   │ black  │  blue   │        │  teal, left- │
   │ chair  │  chair  │        │ handed chair │
   └────────┴─────────┴────────┴──────────────┘ z=-6
  x=-10    x=-6     x=-1     x=1             x=6
*/
export function buildClinic() {
  const root = new THREE.Group();
  const walls = new THREE.Group();
  root.add(walls);
  const hotspots = {};

  const floor = (x1, z1, x2, z2, tex, tile = 0.6) => {
    tex.repeat.set((x2 - x1) / (tile * 4), (z2 - z1) / (tile * 4));
    const f = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, 0.08, z2 - z1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 }));
    f.position.set((x1 + x2) / 2, -0.04, (z1 + z2) / 2);
    f.receiveShadow = true;
    root.add(f);
  };
  const terracotta = () => tiles([206, 128, 82], '#e9d2bd', { vary: 22, seed: 3 });
  floor(-4, 0, 4, 6, terracotta(), 0.45);
  floor(-1, -6, 1, 0, terracotta(), 0.45);
  floor(-6, -6, -1, 0, tiles([170, 128, 92], '#7a5a42', { marble: true, vary: 16, seed: 7 }), 0.6);
  floor(1, -6, 6, 0, tiles([174, 132, 96], '#7a5a42', { marble: true, vary: 16, seed: 11 }), 0.6);
  floor(-10, -6, -6, 0, tiles([196, 186, 170], '#a49a8a', { marble: true, vary: 10, seed: 5 }), 0.6);
  const porchT = porchTiles(); porchT.repeat.set(8 / 1.6, 2.2 / 1.6);
  const porch = new THREE.Mesh(new THREE.BoxGeometry(8, 0.06, 2.2), new THREE.MeshStandardMaterial({ map: porchT, roughness: 0.6 }));
  porch.position.set(0, -0.05, 7.15); porch.receiveShadow = true;
  root.add(porch);
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(17, 0.5, 15, 4, 0.12), mat(0x1b2c30, { roughness: 0.9 }));
  plinth.position.set(-2, -0.33, 0.8); plinth.receiveShadow = true;
  root.add(plinth);

  const wReception = mat(0xf5f5f1), wBlue = mat(0xc9def2), wMint = mat(0xd3efe6), wSurgery = mat(0xf0f3f3), wHall = mat(0xf2f2ee);
  const wSage = mat(0x9aa79c, { roughness: 0.85 });
  const door = (from, w = 0.95) => ({ from, to: from + w, top: 2.12 });
  const win = (from, to) => ({ from, to, sill: 0.9, top: 2.45 });

  // Reception shell
  const front = [win(0.5, 3.0), { from: 3.45, to: 4.55, top: 2.28 }, win(5.0, 7.5)];
  wall(walls, -4, 6, 4, 6, wReception, front);
  wall(walls, -4, 6.075, 4, 6.075, wSage, front, 0.03);
  wall(walls, -4, 0, -4, 6, wReception, []);                              // left wall
  wall(walls, 4, 6, 4, 0, wReception, [win(0.5, 2.6)]);                   // right wall, window by the desk side
  wall(walls, -6, 0, 6, 0, wReception, [door(5.3, 1.4)]);                 // back wall with the double door (x -0.7..0.7)
  // Hall and rooms
  wall(walls, -1, 0, -1, -6, wHall, [door(0.95)]);                         // door to Dr Moulios (left)
  wall(walls, 1, 0, 1, -6, wHall, [door(0.95)]);                           // door to Dr Lefaki (right)
  wall(walls, -10, -6, 6, -6, wReception, [win(1.2, 3.2), win(5.4, 8.4)]);
  wall(walls, 6, 0, 6, -6, wMint, [win(1.6, 4.4)]);
  wall(walls, -6, 0, -6, -6, wBlue, [door(2.4)]);                          // Moulios -> surgery
  wall(walls, -10, 0, -6, 0, wSurgery, []);
  wall(walls, -10, 0, -10, -6, wSurgery, []);
  const blueSkirt = mat(0x2a55b8), brownSkirt = mat(0x6a4a34);
  const skirt = (x1, z1, x2, z2, m) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x2 - x1, z2 - z1), 0.08, 0.02), m);
    b.position.set((x1 + x2) / 2, 0.04, (z1 + z2) / 2); b.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    walls.add(b);
  };
  skirt(-5.93, -0.07, -1.07, -0.07, blueSkirt); skirt(-5.93, -5.93, -1.07, -5.93, blueSkirt);
  skirt(1.07, -0.07, 5.93, -0.07, brownSkirt); skirt(1.07, -5.93, 5.93, -5.93, brownSkirt);

  // Windows
  const vb = (x, z, w, ry, c) => { const g = windowBlinds(walls, x, z, w, ry); g.children[1].material.color.set(c); };
  vb(-3.1, -5.93, 3.0, 0, 0x9fb6d6);           // Moulios, blue-grey blinds
  vb(5.93, -3.0, 2.8, -Math.PI / 2, 0xb9cdc4); // Lefaki, grey-green blinds
  vb(-7.8, -5.93, 2.0, 0, 0xf3f4f2);             // surgery
  zebraBlind(walls, -2.25, 5.93, 2.5, Math.PI);
  zebraBlind(walls, 2.25, 5.93, 2.5, Math.PI);
  zebraBlind(walls, 3.93, 4.45, 2.1, -Math.PI / 2);

  /* Entrance */
  entranceDoor(walls, 0, 6.0);
  tallPlanter(root, -0.95, 6.55);
  plant(root, -2.6, 6.6, 0.6);
  at(rbox(1.0, 0.02, 0.6, mat(0x33373a, { roughness: 0.95 }), 0.005), 0, 0.0, 6.55, root);
  hotspots.door = new THREE.Vector3(0, 2.6, 6.1);

  /* Reception: waiting area on the left, the assistant's desk on the right, double door ahead */
  const R = new THREE.Group();
  root.add(R);
  const sofaMat = mat(0xe2dccf, { roughness: 0.95 });
  sofaPiece(R, -3.45, 3.3, Math.PI / 2, sofaMat, 2.0);
  sofaPiece(R, -1.05, 3.3, -Math.PI / 2, sofaMat, 1.7);
  glassTable(R, -2.25, 3.3);
  // as in the videos: mint band high on the walls, TV over the sofas, black leather armchairs, a pharmacy display
  const mint = mat(0x8fbfae, { roughness: 0.8 });
  const band = (x, z, w, ry) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, 0.02), mint); b.position.set(x, 2.4, z); b.rotation.y = ry; R.add(b); };
  band(-3.93, 3.0, 5.9, Math.PI / 2);
  band(-2.35, 0.07, 3.2, 0);
  band(2.35, 0.07, 3.2, 0);
  const rtv = at(rbox(1.0, 0.58, 0.05, MAT.dark, 0.015), -3.9, 1.75, 3.3, R); rtv.rotation.y = Math.PI / 2;
  const rtvS = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.52), MAT.screenOn); rtvS.position.z = 0.028; rtv.add(rtvS);
  armchair(R, -3.35, 5.35, Math.PI / 2 + 0.5);
  armchair(R, -3.35, 1.45, Math.PI / 2 - 0.4);
  const vit = at(rbox(0.5, 1.7, 0.4, MAT.glass, 0.02), -3.6, 0.85, 0.5, R);
  at(rbox(0.5, 0.25, 0.4, MAT.dark, 0.02), -3.6, 1.82, 0.5, R);
  coatStand(R, -3.5, 5.5);
  plant(R, -2.9, 0.4, 0.8);
  // assistant's desk on the right: striped-wood front facing the room
  const D = new THREE.Group();
  D.position.set(2.3, 0, 2.6); D.rotation.y = -Math.PI / 2;
  R.add(D);
  const deskWood = new THREE.MeshStandardMaterial({ map: stripedWood(), roughness: 0.6 });
  at(rbox(2.4, 1.08, 0.12, deskWood, 0.01), 0, 0.54, 0.3, D);
  for (const sx of [-1, 1]) at(rbox(0.12, 1.08, 0.7, deskWood, 0.01), sx * 1.14, 0.54, 0, D);
  at(rbox(2.5, 0.05, 0.42, MAT.counter, 0.01), 0, 1.1, 0.24, D);
  at(rbox(2.3, 0.04, 0.55, MAT.white, 0.01), 0, 0.78, -0.05, D);
  deskMonitor(D, 0.5, 1.12, 0.1, Math.PI * 0.9);
  at(rbox(0.2, 0.05, 0.14, MAT.white, 0.01), -0.6, 1.15, 0.2, D);
  plant(D, -0.95, 0.2, 0.35).position.y = 1.12;
  const rec = assistant(R, 3.15, 2.6, -Math.PI / 2);
  const cab = at(rbox(0.3, 0.9, 0.9, MAT.white, 0.02), 3.8, 1.95, 2.0, R);
  const glassScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.0), MAT.glass);
  glassScreen.rotation.y = -Math.PI / 2; glassScreen.position.set(3.7, 1.8, 3.4); R.add(glassScreen);
  waterCooler(R, 3.6, 5.4);
  armchair(R, 3.3, 4.4, -Math.PI / 2 - 0.3);
  plant(R, 3.6, 0.45, 0.8);
  // double door straight ahead: one frame, two dark-wood leaves opened into the hall
  {
    const fm = mat(0x4a3226, { roughness: 0.5 }), lm = mat(0x4a3226, { roughness: 0.45 });
    for (const sx of [-0.7, 0.7]) at(rbox(0.08, 2.14, 0.16, fm, 0.01), sx, 1.07, 0, R);
    at(rbox(1.48, 0.08, 0.16, fm, 0.01), 0, 2.14, 0, R);
    for (const side of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(side * 0.66, 0, -0.06);
      hinge.rotation.y = side * 1.25;          // swung open towards the hall
      R.add(hinge);
      at(rbox(0.64, 2.06, 0.04, lm, 0.01), -side * 0.32, 1.04, 0, hinge);
      at(cyl(0.015, 0.015, 0.12, MAT.chrome, 8), -side * 0.56, 1.02, 0.05, hinge).rotation.x = Math.PI / 2;
    }
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.5 }));
  sign.position.set(-2.3, 1.62, 0.07); R.add(sign);
  hotspots.assistant = new THREE.Vector3(3.15, 1.98, 2.6);
  hotspots.waiting = new THREE.Vector3(-2.25, 1.05, 3.3);
  hotspots.sign = new THREE.Vector3(-2.3, 2.15, 0.1);

  /* Hall */
  plant(root, 0, -5.5, 0.9);
  doorLeaf(root, -1.06, -0.95, Math.PI / 2, { open: 1.2 });
  doorLeaf(root, 1.06, -0.95, Math.PI / 2, { open: -1.2 });

  /* Dr Moulios (left): light blue, royal-blue chair, blue drawers, x-ray, TV over the chair */
  const R1 = new THREE.Group();
  root.add(R1);
  const royal = mat(0x2a55b8, { roughness: 0.45 });
  cabinets(R1, -3.5, -5.6, 3.6, 0, royal, { sink: true });
  deskMonitor(R1, -2.6, 0.87, -5.65, 0);
  at(rbox(0.36, 0.02, 0.26, MAT.dark, 0.005), -4.4, 0.885, -5.6, R1);
  const lap = at(rbox(0.36, 0.24, 0.015, MAT.dark, 0.005), -4.4, 1.0, -5.73, R1); lap.rotation.x = -0.25;
  const lapS = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.21), MAT.screenOn); lapS.position.z = 0.009; lap.add(lapS);
  at(rbox(0.5, 1.0, 0.45, mat(0x1d2c52, { roughness: 0.4 }), 0.04), -1.6, 0.5, -5.5, R1);
  dentalChair(R1, -3.7, -3.4, Math.PI / 2, royal, { monitor: true, led: 'warm' });
  xray(R1, -5.93, -1.2, Math.PI / 2);
  const tv = at(rbox(0.9, 0.52, 0.05, MAT.dark, 0.015), -3.35, 2.3, -3.4, R1);
  tv.rotation.set(-0.55, Math.PI / 2, 0, 'YXZ');
  const tvS = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.47), MAT.screenOn); tvS.position.z = 0.028; tv.add(tvS);
  at(cyl(0.015, 0.015, 0.45, MAT.chrome, 8), -3.35, 2.55, -3.4, R1);
  at(cyl(0.2, 0.2, 0.1, royal), -4.5, 0.55, -2.6, R1);
  at(cyl(0.03, 0.03, 0.45, MAT.chrome, 8), -4.5, 0.28, -2.6, R1);
  at(cyl(0.25, 0.25, 0.03, MAT.dark, 5), -4.5, 0.04, -2.6, R1);
  doorLeaf(R1, -6.06, -2.4, Math.PI / 2, { open: 1.1 });
  hotspots.chair1 = new THREE.Vector3(-3.7, 1.2, -3.4);
  hotspots.tv = new THREE.Vector3(-3.35, 2.75, -3.4);
  hotspots.xray = new THREE.Vector3(-5.6, 2.05, -1.2);

  /* Dr Lefaki (right): mint, teal drawers, turquoise left-handed chair, Beyond Polus */
  const R2 = new THREE.Group();
  root.add(R2);
  const tealD = mat(0x2f9c97, { roughness: 0.45 });
  cabinets(R2, 3.5, -5.6, 3.8, 0, tealD, { sink: true });
  deskMonitor(R2, 2.2, 0.87, -5.65, 0);
  for (let i = 0; i < 5; i++) at(cyl(0.05, 0.05, 0.16 + (i % 2) * 0.08, i === 2 ? MAT.green : i === 4 ? mat(0xf2d27a) : MAT.white, 14), 3.4 + i * 0.16, 0.95, -5.62, R2);
  dentalChair(R2, 3.7, -3.4, -Math.PI / 2, mat(0x3fbfb4, { roughness: 0.45 }), { tray: 'green', led: 'cool', monitor: true, mirror: true });
  at(cyl(0.2, 0.2, 0.1, mat(0x48b8c4, { roughness: 0.5 })), 4.5, 0.55, -2.6, R2);
  at(cyl(0.03, 0.03, 0.45, MAT.chrome, 8), 4.5, 0.28, -2.6, R2);
  at(cyl(0.25, 0.25, 0.03, MAT.chrome, 5), 4.5, 0.04, -2.6, R2);
  xray(R2, 3.0, -0.07, Math.PI);
  const pol = polus(R2, 5.3, -1.0, -Math.PI * 0.75);
  hotspots.chair2 = new THREE.Vector3(3.7, 1.2, -3.4);
  hotspots.whitening = new THREE.Vector3(5.3, 1.75, -1.0);

  /* Surgery (through Dr Moulios' room, further left): black surgical chair */
  const RS = new THREE.Group();
  root.add(RS);
  dentalChair(RS, -8.0, -3.0, Math.PI / 2, mat(0x1c1f22, { roughness: 0.4 }), { led: 'cool' });
  const sl = new THREE.Group();
  sl.position.set(-8.0, 0, -3.0);
  RS.add(sl);
  at(cyl(0.03, 0.03, 0.5, MAT.chrome, 8), 0, 2.45, 0, sl);
  for (const s2 of [-1, 1]) {
    const headL = new THREE.Group();
    headL.position.set(s2 * 0.45, 2.05, s2 * 0.2);
    sl.add(headL);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), MAT.white);
    dome.castShadow = true; headL.add(dome);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), MAT.ledCool);
    face.rotation.x = Math.PI / 2; face.position.y = 0.03; headL.add(face);
  }
  cabinets(RS, -9.6, -3.0, 4.0, Math.PI / 2, mat(0x1e2124, { roughness: 0.4 }), {});
  xray(RS, -9.3, -5.93, 0);
  centrifuge(RS, -9.5, 0.87, -4.2, Math.PI / 2);
  const ac = at(rbox(0.5, 0.42, 0.5, MAT.white, 0.03), -9.55, 1.08, -1.9, RS);
  const acDoor = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), MAT.chrome);
  acDoor.rotation.y = Math.PI / 2; acDoor.position.set(0.255, 0, 0); ac.add(acDoor);
  scannerCart(RS, -7.0, -5.2, -0.4);
  hotspots.surgery = new THREE.Vector3(-8.0, 2.6, -3.0);
  hotspots.prp = new THREE.Vector3(-9.5, 1.45, -4.2);
  hotspots.autoclave = new THREE.Vector3(-9.55, 1.6, -1.9);
  hotspots.scanner = new THREE.Vector3(-7.0, 1.95, -5.2);

  // Ceilings (planes facing down: seen from inside, invisible from above)
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, emissive: 0xf4f4f0, emissiveIntensity: 0.35 });
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xfffdf6 });
  for (const [x1, z1, x2, z2] of [[-4, 0, 4, 6], [-1, -6, 1, 0], [-6, -6, -1, 0], [1, -6, 6, 0], [-10, -6, -6, 0]]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), ceilMat);
    c.rotation.x = Math.PI / 2;
    c.position.set((x1 + x2) / 2, H - 0.01, (z1 + z2) / 2);
    root.add(c);
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.3, Math.min(1.4, (z2 - z1) * 0.4)), panelMat);
    l.rotation.x = Math.PI / 2;
    l.position.set((x1 + x2) / 2, H - 0.02, (z1 + z2) / 2);
    root.add(l);
  }

  return { root, walls, hotspots, receptionist: rec, wlGlow: pol.glow };
}
