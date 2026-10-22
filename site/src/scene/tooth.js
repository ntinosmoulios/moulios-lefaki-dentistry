// Procedural dental implant: molar crown, abutment, threaded titanium screw,
// and a translucent bone + gum block. No external 3D files needed.
import * as THREE from 'three';

export function buildTooth() {
  const planeSolid = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);
  const planeWire = new THREE.Plane(new THREE.Vector3(0, 1, 0), -100);

  const enamel = new THREE.MeshPhysicalMaterial({
    color: 0xf8f6ee, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.1,
    emissive: new THREE.Color(0xffffff), emissiveIntensity: 0,
    clippingPlanes: [planeSolid]
  });
  const titanium = new THREE.MeshStandardMaterial({ color: 0xa9b3ba, metalness: 1, roughness: 0.26, transparent: true });
  const titaniumDark = new THREE.MeshStandardMaterial({ color: 0x6f7a81, metalness: 1, roughness: 0.32, transparent: true });

  /* Crown */
  const profile = [
    [0.0, 0.0], [0.38, 0.0], [0.44, 0.08], [0.56, 0.32], [0.63, 0.55], [0.62, 0.78],
    [0.55, 0.95], [0.42, 1.05], [0.25, 1.08], [0.1, 1.02], [0.0, 1.0]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const crownGeo = new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(64), 96);
  {
    const p = crownGeo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const r = Math.hypot(v.x, v.z), th = Math.atan2(v.z, v.x);
      const sq = 1 + 0.07 * Math.cos(4 * th);
      v.x *= sq; v.z *= sq;
      if (v.y > 0.7) {
        const t = Math.min(1, (v.y - 0.7) / 0.38), k = t * t * (3 - 2 * t);
        const cusp = 0.5 + 0.5 * Math.cos(4 * th + Math.PI / 4);
        const fissure = Math.exp(-(r * r) / 0.03);
        v.y += k * (0.13 * cusp * Math.min(1, r / 0.35) - 0.1 * fissure);
      }
      p.setXYZ(i, v.x, v.y, v.z);
    }
    crownGeo.computeVertexNormals();
  }
  const crown = new THREE.Mesh(crownGeo, enamel);

  // Digital "scanned" version of the crown, shown above the scan line
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x7fe3ff, wireframe: true, transparent: true, opacity: 0.6,
    depthWrite: false, blending: THREE.AdditiveBlending, clippingPlanes: [planeWire]
  });
  const wire = new THREE.Mesh(crownGeo, wireMat);
  wire.scale.setScalar(1.004);
  crown.add(wire);

  // Scanner beam: a glowing disc + ring that moves along the crown
  const scanner = new THREE.Group();
  const scannerMat = new THREE.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 64), scannerMat);
  disc.rotation.x = -Math.PI / 2;
  const scanRingMat = new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 0.98, 96), scanRingMat);
  ring.rotation.x = -Math.PI / 2;
  scanner.add(disc, ring);
  scanner.visible = false;
  crown.add(scanner);

  /* Abutment */
  const abutment = new THREE.Group();
  const ab1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.42, 6, 1), titanium);
  ab1.position.y = 0.21;
  const ab2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 48), titaniumDark);
  abutment.add(ab1, ab2);

  /* Screw */
  const screw = new THREE.Group();
  const L = 2.0, rTop = 0.3, rBot = 0.2;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, L, 48, 1), titanium);
  core.position.y = -L / 2;
  const apex = new THREE.Mesh(new THREE.SphereGeometry(rBot, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), titanium);
  apex.position.y = -L;
  class Helix extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const y = -0.12 - t * (L - 0.25);
      const r = rTop + (rBot - rTop) * (-y / L) + 0.055;
      const a = t * 9.5 * Math.PI * 2;
      return target.set(Math.cos(a) * r, y, Math.sin(a) * r);
    }
  }
  const thread = new THREE.Mesh(new THREE.TubeGeometry(new Helix(), 380, 0.05, 6, false), titanium);
  screw.add(core, apex, thread);

  /* Jaw: a cut-away section, like the models dentists use to explain implants.
     The front face (z = 0) is the cut: spongy bone inside, the socket channel, gum on top. */
  const poreTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#d2bd98'; g.fillRect(0, 0, 512, 512);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 900; i++) {
      const x = rnd() * 512, y = rnd() * 512, r = 2 + rnd() * 9;
      g.fillStyle = `rgba(${120 + rnd() * 40 | 0},${84 + rnd() * 30 | 0},${58 + rnd() * 20 | 0},${0.35 + rnd() * 0.4})`;
      g.beginPath(); g.ellipse(x, y, r, r * (0.5 + rnd() * 0.6), rnd() * 3, 0, 7); g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.55, 0.55);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const fade = m => Object.assign(m, { transparent: true, opacity: 0 });
  const boneCut = fade(new THREE.MeshStandardMaterial({ map: poreTex, roughness: 0.85 }));
  const boneSide = fade(new THREE.MeshPhysicalMaterial({ color: 0xd8c7a6, roughness: 0.55, clearcoat: 0.25 }));
  const gumCut = fade(new THREE.MeshStandardMaterial({ color: 0xa8414e, roughness: 0.6 }));
  const gumSide = fade(new THREE.MeshPhysicalMaterial({ color: 0xd56a74, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.2, sheen: 1, sheenColor: new THREE.Color(0xffc4c4) }));
  const jawMats = [boneCut, boneSide, gumCut, gumSide];

  const boneShape = new THREE.Shape();
  boneShape.moveTo(-1.5, -2.75);
  boneShape.lineTo(1.5, -2.75);
  boneShape.lineTo(1.32, -0.55);
  boneShape.quadraticCurveTo(1.25, -0.05, 0.31, -0.05);
  boneShape.lineTo(0.21, -2.18);
  boneShape.quadraticCurveTo(0, -2.36, -0.21, -2.18);   // the drilled socket
  boneShape.lineTo(-0.31, -0.05);
  boneShape.quadraticCurveTo(-1.25, -0.05, -1.32, -0.55);
  boneShape.closePath();
  const gumShape = side => {
    const s = new THREE.Shape(), k = side;
    s.moveTo(1.43 * k, -0.85);
    s.quadraticCurveTo(1.4 * k, 0.28, 0.34 * k, 0.28);
    s.lineTo(0.32 * k, -0.05);
    s.quadraticCurveTo(1.25 * k, -0.05, 1.32 * k, -0.55);
    s.lineTo(1.345 * k, -0.85);
    s.closePath();
    return s;
  };
  const section = (shape, depth) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 24 });
    g.translate(0, 0, -depth);
    return g;
  };
  const jaw = new THREE.Group();
  const bone = new THREE.Mesh(section(boneShape, 2.2), [boneCut, boneSide]);
  const gumL = new THREE.Mesh(section(gumShape(-1), 2.24), [gumCut, gumSide]);
  const gumR = new THREE.Mesh(section(gumShape(1), 2.24), [gumCut, gumSide]);
  gumL.position.z = gumR.position.z = 0.02;
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x4aa6c2, transparent: true, opacity: 0, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.36, 2.0, 48, 1, true), glowMat);
  glow.position.y = -1.05;
  jaw.add(bone, gumL, gumR, glow);

  const model = new THREE.Group();
  model.add(jaw, screw, abutment, crown);
  const pivot = new THREE.Group();
  pivot.add(model);

  return {
    pivot, model, crown, screw, abutment, jaw, enamel, wireMat, scanner, scannerMat, scanRingMat,
    dissolveMats: [enamel, titanium, titaniumDark], cloudMeshes: [crown, core, apex, thread, ab1, ab2],
    planeSolid, planeWire,
    setParts(v) {
      titanium.opacity = titaniumDark.opacity = v;
      titanium.transparent = titaniumDark.transparent = v < 0.999;   // opaque when solid, so ice can refract it
      const vis = v > 0.02;
      screw.visible = abutment.visible = vis;
      titanium.depthWrite = titaniumDark.depthWrite = v > 0.95;
    },
    setJaw(v, g) {
      for (const m of jawMats) { m.opacity = v; m.depthWrite = v > 0.97; }
      glowMat.opacity = 0.32 * g;
      jaw.visible = v > 0.01;
      glow.visible = g > 0.01;
    }
  };
}
