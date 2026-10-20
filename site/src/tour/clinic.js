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

function rbox(w, h, d, m, r = 0.03) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), m);
  mesh.castShadow = true;
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
function dentalChair(parent, x, z, ry, uph, { tray = 'cream', monitor = false, led = 'warm' } = {}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
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

/* ---------- The clinic ---------- */
export function buildClinic() {
  const root = new THREE.Group();
  const walls = new THREE.Group();
  root.add(walls);
  const hotspots = {};

  // Floors
  const floor = (x1, z1, x2, z2, m) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, 0.08, z2 - z1), m);
    f.position.set((x1 + x2) / 2, -0.04, (z1 + z2) / 2);
    f.receiveShadow = true;
    root.add(f);
  };
  floor(-6, 0, 0, 6, MAT.oak);
  floor(0, 0, 5, 6, MAT.vinyl);
  floor(0, -5, 5, 0, MAT.vinyl);
  floor(-6, -5, 0, 0, MAT.vinylWarm);
  // plinth under the whole plan, so the "model" reads as an object in the dark
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(11.6, 0.5, 11.6, 4, 0.12), mat(0x1b2c30, { roughness: 0.9 }));
  plinth.position.set(-0.5, -0.33, 0.5);
  plinth.receiveShadow = true;
  root.add(plinth);

  // Wall colours from the photos
  const wReception = mat(0xf1f2ee);
  const wBlue = mat(0xcfe0ee);    // Dr Moulios' room: light blue
  const wMint = mat(0xd9efe6);    // Dr Lefaki's room: mint
  const wSurgery = mat(0xeef2f2);
  const door = (from) => ({ from, to: from + 0.95, top: 2.1 });
  const win = (from, to) => ({ from, to, sill: 0.9, top: 2.45 });

  // Outer walls
  wall(walls, -6, 6, 5, 6, wReception, [{ from: 3.3, to: 4.8, top: 2.3 }, win(7.2, 10.4)]);       // street side (entrance)
  wall(walls, 5, 6, 5, -5, wBlue, [win(1.4, 4.6), win(6.6, 9.8)]);                                   // window wall of both rooms
  wall(walls, 5, -5, -6, -5, wSurgery, [win(7.4, 9.8)]);                                              // back
  wall(walls, -6, -5, -6, 6, wReception, []);                                                         // left
  // Inner walls
  wall(walls, 0, 6, 0, 0, wBlue, [door(1.4)]);           // reception | room 1
  wall(walls, -6, 0, 0, 0, wReception, []);              // reception | surgery (logo wall)
  wall(walls, 0, 0, 5, 0, wMint, [door(0.4)]);           // room 1 | room 2
  wall(walls, 0, 0, 0, -5, wSurgery, [door(0.4)]);       // room 2 | surgery

  // Window light + blinds
  windowBlinds(walls, 4.93, 3.0, 3.0, -Math.PI / 2);
  windowBlinds(walls, 4.93, -2.2, 3.0, -Math.PI / 2);
  windowBlinds(walls, -3.4, -4.93, 2.4, 0);
  windowBlinds(walls, 2.8, 5.93, 3.0, Math.PI);
  // glass entrance door
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.3), MAT.glass);
  glass.position.set(-2.05, 1.15, 5.95);
  walls.add(glass);

  /* Reception & waiting */
  const R = new THREE.Group();
  root.add(R);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.5 }));
  sign.position.set(-3.4, 1.75, 0.08);
  R.add(sign);
  const accent = new THREE.Mesh(new THREE.BoxGeometry(3.4, H, 0.04), MAT.brand);
  accent.position.set(-3.4, H / 2, 0.06);
  R.add(accent);
  sign.position.z = 0.09;
  // curved reception desk
  const desk = new THREE.Group();
  desk.position.set(-3.4, 0, 1.75);
  R.add(desk);
  const deskShape = new THREE.Shape();
  deskShape.absarc(0, 0, 1.25, Math.PI * 0.08, Math.PI * 0.92, false);
  deskShape.absarc(0, 0, 0.85, Math.PI * 0.92, Math.PI * 0.08, true);
  const deskGeo = new THREE.ExtrudeGeometry(deskShape, { depth: 1.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 40 });
  deskGeo.rotateX(Math.PI / 2);
  deskGeo.translate(0, 1.05, 0);
  const deskMesh = new THREE.Mesh(deskGeo, MAT.white);
  deskMesh.castShadow = true; deskMesh.receiveShadow = true;
  deskMesh.rotation.y = Math.PI;
  deskMesh.scale.set(1, 1, -1);
  desk.add(deskMesh);
  const topShape = new THREE.Shape();
  topShape.absarc(0, 0, 1.32, Math.PI * 0.06, Math.PI * 0.94, false);
  topShape.absarc(0, 0, 0.8, Math.PI * 0.94, Math.PI * 0.06, true);
  const topGeo = new THREE.ExtrudeGeometry(topShape, { depth: 0.04, bevelEnabled: false, curveSegments: 40 });
  topGeo.rotateX(Math.PI / 2);
  topGeo.translate(0, 1.1, 0);
  const deskTop = new THREE.Mesh(topGeo, MAT.wood);
  deskTop.rotation.y = Math.PI;
  deskTop.scale.set(1, 1, -1);
  deskTop.castShadow = true;
  desk.add(deskTop);
  const ledStrip = new THREE.Mesh(new THREE.TorusGeometry(1.255, 0.01, 6, 64, Math.PI * 0.84), new THREE.MeshBasicMaterial({ color: 0x7fe3ff }));
  ledStrip.rotation.x = Math.PI / 2;
  ledStrip.rotation.z = Math.PI * 0.08;
  ledStrip.position.y = 0.12;
  ledStrip.scale.set(1, -1, 1);
  desk.add(ledStrip);
  deskMonitor(R, -2.55, 1.12, 2.35, Math.PI * 0.78);
  const rec = assistant(R, -3.4, 2.0, 0);
  // waiting area: sofa, chairs, coffee table, plants
  const sofa = new THREE.Group();
  sofa.position.set(-5.35, 0, 3.9);
  sofa.rotation.y = Math.PI / 2;
  R.add(sofa);
  at(rbox(2.0, 0.42, 0.8, MAT.sofa, 0.08), 0, 0.25, 0, sofa);
  at(rbox(2.0, 0.55, 0.2, MAT.sofa, 0.08), 0, 0.6, -0.32, sofa);
  for (const s of [-1, 1]) at(rbox(0.18, 0.55, 0.8, MAT.sofa, 0.08), s * 0.95, 0.38, 0, sofa);
  at(rbox(0.9, 0.06, 0.55, MAT.wood, 0.02), -4.3, 0.42, 3.9, R);
  for (const s of [-1, 1]) at(cyl(0.02, 0.02, 0.4, MAT.dark, 8), -4.3 + s * 0.38, 0.2, 3.9, R);
  at(rbox(0.28, 0.02, 0.2, mat(0x8fd6ea), 0.005), -4.3, 0.46, 3.85, R); // magazine
  plant(R, -5.5, 5.5, 1.1);
  plant(R, -0.5, 0.5, 0.9);
  plant(R, -5.5, 0.6, 0.8);
  // framed pictures
  for (const [zz, c] of [[2.6, 0x8fd6ea], [5.0, 0xe39a91]]) {
    const frame = at(rbox(0.04, 0.7, 0.9, MAT.dark, 0.01), -5.93, 1.65, zz, R);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), mat(c, { roughness: 0.9 }));
    art.rotation.y = Math.PI / 2;
    art.position.set(0.025, 0, 0);
    frame.add(art);
  }
  hotspots.assistant = new THREE.Vector3(-3.4, 1.98, 2.0);
  hotspots.waiting = new THREE.Vector3(-5.2, 1.1, 3.9);
  hotspots.sign = new THREE.Vector3(-3.4, 2.55, 0.1);

  /* Room 1: Dr Moulios, light blue with blue drawers (photo) */
  const R1 = new THREE.Group();
  root.add(R1);
  cabinets(R1, 2.9, 0.4, 3.6, 0, MAT.blue, { sink: true });
  deskMonitor(R1, 3.9, 0.87, 0.35, 0);
  at(rbox(0.22, 0.3, 0.2, MAT.dark, 0.02), 4.45, 1.02, 0.35, R1); // speaker
  at(rbox(0.32, 0.12, 0.26, MAT.white, 0.02), 2.0, 0.93, 0.35, R1); // small device on counter
  dentalChair(R1, 2.8, 3.5, -Math.PI / 2, MAT.creamUph, { monitor: true, led: 'warm' });
  // TV above the chair (mentioned in patients' reviews)
  const tv = at(rbox(0.9, 0.52, 0.05, MAT.dark, 0.015), 2.45, 2.3, 3.5, R1);
  tv.rotation.set(-0.55, -Math.PI / 2, 0, 'YXZ');
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.47), MAT.screenOn);
  tvScreen.position.z = 0.028;
  tv.add(tvScreen);
  at(cyl(0.015, 0.015, 0.45, MAT.chrome, 8), 2.45, 2.55, 3.5, R1);
  // doctor's stool
  at(cyl(0.2, 0.2, 0.1, MAT.blue), 2.0, 0.55, 2.7, R1);
  at(cyl(0.03, 0.03, 0.45, MAT.chrome, 8), 2.0, 0.28, 2.7, R1);
  at(cyl(0.25, 0.25, 0.03, MAT.dark, 5), 2.0, 0.04, 2.7, R1);
  hotspots.chair1 = new THREE.Vector3(2.8, 1.2, 3.5);
  hotspots.tv = new THREE.Vector3(2.45, 2.75, 3.5);
  hotspots.doc1 = new THREE.Vector3(3.9, 1.65, 0.35);

  /* Room 2: Dr Lefaki, mint with teal drawers, green upholstery (photo) */
  const R2 = new THREE.Group();
  root.add(R2);
  cabinets(R2, 2.6, -4.6, 4.0, 0, MAT.teal, { sink: true });
  deskMonitor(R2, 1.4, 0.87, -4.65, 0);
  // jars and containers on the worktop, like in the photo
  for (let i = 0; i < 5; i++) at(cyl(0.05, 0.05, 0.16 + (i % 2) * 0.08, i === 2 ? MAT.green : MAT.white, 14), 2.3 + i * 0.16, 0.95, -4.62, R2);
  dentalChair(R2, 2.8, -2.2, -Math.PI / 2, MAT.mintUph, { tray: 'green', led: 'cool' });
  // whitening lamp (Beyond Polus) on a stand
  const wl = new THREE.Group();
  wl.position.set(4.2, 0, -1.0);
  R2.add(wl);
  at(cyl(0.22, 0.25, 0.05, MAT.white), 0, 0.03, 0, wl);
  at(cyl(0.025, 0.025, 1.4, MAT.white, 10), 0, 0.73, 0, wl);
  const wlArm = at(rbox(0.06, 0.06, 0.55, MAT.white, 0.03), 0, 1.45, -0.25, wl);
  wlArm.rotation.x = 0.4;
  const wlHead = at(rbox(0.22, 0.1, 0.16, MAT.white, 0.04), 0, 1.35, -0.55, wl);
  const wlGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0x9fdcff }));
  wlGlow.rotation.x = Math.PI / 2;
  wlGlow.position.y = -0.052;
  wlHead.add(wlGlow);
  hotspots.chair2 = new THREE.Vector3(2.8, 1.2, -2.2);
  hotspots.whitening = new THREE.Vector3(4.2, 1.75, -1.4);
  hotspots.doc2 = new THREE.Vector3(1.4, 1.65, -4.6);

  /* Surgery: sterile white room for implants */
  const RS = new THREE.Group();
  root.add(RS);
  dentalChair(RS, -3.0, -2.4, -Math.PI / 2, mat(0x9fb9c2, { roughness: 0.5 }), { led: 'cool' });
  // large double-headed surgical light from the ceiling
  const sl = new THREE.Group();
  sl.position.set(-3.0, 0, -2.4);
  RS.add(sl);
  at(cyl(0.03, 0.03, 0.5, MAT.chrome, 8), 0, 2.45, 0, sl);
  for (const s of [-1, 1]) {
    const headL = new THREE.Group();
    headL.position.set(s * 0.45, 2.05, s * 0.2);
    sl.add(headL);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), MAT.white);
    dome.castShadow = true;
    headL.add(dome);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), MAT.ledCool);
    face.rotation.x = Math.PI / 2;
    face.position.y = 0.03;
    headL.add(face);
    const arm2 = rbox(0.05, 0.05, 0.55, MAT.chrome, 0.02);
    arm2.position.set(-s * 0.22, 0.3, -s * 0.1);
    arm2.rotation.y = Math.PI / 2;
    headL.add(arm2);
  }
  cabinets(RS, -5.6, -2.0, 4.0, Math.PI / 2, mat(0xdfe6e8), {});
  // PRP centrifuge on the worktop
  const cf = new THREE.Group();
  cf.position.set(-5.55, 0.87, -3.2);
  RS.add(cf);
  at(cyl(0.2, 0.22, 0.24, MAT.white), 0, 0.12, 0, cf);
  at(cyl(0.18, 0.18, 0.03, mat(0x8fd6ea, { roughness: 0.2 })), 0, 0.255, 0, cf);
  // autoclave
  const ac = at(rbox(0.5, 0.42, 0.5, MAT.white, 0.03), -5.55, 1.08, -1.2, RS);
  const acDoor = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), MAT.chrome);
  acDoor.rotation.y = Math.PI / 2;
  acDoor.position.set(0.255, 0, 0);
  ac.add(acDoor);
  // intraoral scanner cart
  const sc = new THREE.Group();
  sc.position.set(-1.2, 0, -3.8);
  RS.add(sc);
  at(cyl(0.25, 0.25, 0.04, MAT.white, 5), 0, 0.06, 0, sc);
  at(cyl(0.03, 0.03, 1.1, MAT.white, 10), 0, 0.6, 0, sc);
  const scScreen = at(rbox(0.46, 0.3, 0.04, MAT.dark, 0.015), 0, 1.3, 0.05, sc);
  scScreen.rotation.x = -0.2;
  const scS = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.26), MAT.screenOn);
  scS.position.z = 0.022;
  scScreen.add(scS);
  const wand = cyl(0.02, 0.028, 0.26, MAT.white, 12);
  wand.rotation.z = 0.6;
  at(wand, 0.22, 1.1, 0.05, sc);
  hotspots.surgery = new THREE.Vector3(-3.0, 2.6, -2.4);
  hotspots.prp = new THREE.Vector3(-5.55, 1.5, -3.2);
  hotspots.autoclave = new THREE.Vector3(-5.55, 1.6, -1.2);
  hotspots.scanner = new THREE.Vector3(-1.2, 1.75, -3.8);

  // Ceilings: planes facing down, so they are seen from inside a room but vanish from above
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf6f7f4, roughness: 0.9 });
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xfffdf6 });
  for (const [x1, z1, x2, z2] of [[-6, 0, 0, 6], [0, 0, 5, 6], [0, -5, 5, 0], [-6, -5, 0, 0]]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), ceilMat);
    c.rotation.x = Math.PI / 2;
    c.position.set((x1 + x2) / 2, H - 0.01, (z1 + z2) / 2);
    root.add(c);
    for (const dx of [-0.25, 0.25]) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), panelMat);
      l.rotation.x = Math.PI / 2;
      l.position.set((x1 + x2) / 2 + dx * (x2 - x1), H - 0.02, (z1 + z2) / 2);
      root.add(l);
    }
  }

  return { root, walls, hotspots, receptionist: rec, wlGlow };
}
