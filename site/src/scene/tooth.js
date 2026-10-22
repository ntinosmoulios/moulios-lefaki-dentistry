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
  const titanium = new THREE.MeshStandardMaterial({ color: 0xc3cdd3, metalness: 1, roughness: 0.22, transparent: true });
  const titaniumDark = new THREE.MeshStandardMaterial({ color: 0x8f9aa1, metalness: 1, roughness: 0.3, transparent: true });
  const boneMat = new THREE.MeshBasicMaterial({ color: 0x9fd8e6, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const gumMat = new THREE.MeshBasicMaterial({ color: 0xe0857c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });

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

  /* Jaw block */
  const roundedRect = (w, h, r) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  };
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
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x7cc4d8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.36, 2.0, 48, 1, true), glowMat);
  glow.position.y = -1.05;
  // read as an x-ray: hairline cyan edges over an almost invisible fill
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0, depthWrite: false });
  const gumEdgeMat = new THREE.LineBasicMaterial({ color: 0xf2a79c, transparent: true, opacity: 0, depthWrite: false });
  const boneEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bone.geometry, 25), edgeMat);
  boneEdges.position.copy(bone.position);
  const gumEdges = new THREE.LineSegments(new THREE.EdgesGeometry(gum.geometry, 25), gumEdgeMat);
  gumEdges.position.copy(gum.position);
  jaw.add(bone, gum, glow, boneEdges, gumEdges);

  const model = new THREE.Group();
  model.add(jaw, screw, abutment, crown);
  const pivot = new THREE.Group();
  pivot.add(model);

  return {
    pivot, model, crown, screw, abutment, jaw, enamel, wireMat, scanner, scannerMat, scanRingMat,
    planeSolid, planeWire,
    setParts(v) {
      titanium.opacity = titaniumDark.opacity = v;
      const vis = v > 0.02;
      screw.visible = abutment.visible = vis;
      titanium.depthWrite = titaniumDark.depthWrite = v > 0.95;
    },
    setJaw(v, g) {
      boneMat.opacity = 0.006 * v;
      gumMat.opacity = 0.03 * v;
      edgeMat.opacity = 0.5 * v;
      gumEdgeMat.opacity = 0.6 * v;
      glowMat.opacity = 0.4 * g;
      jaw.visible = v > 0.01;
      glow.visible = g > 0.01;
    }
  };
}
