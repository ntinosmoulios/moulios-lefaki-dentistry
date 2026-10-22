// The "frost" world: a soft gradient sky, a snow-white porcelain terrain, a contact shadow,
// a dissolve shader that eats solid meshes away along a noise field with a glowing edge,
// and a point cloud sampled from the same meshes that takes over where they dissolve.
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

const NOISE = /* glsl */`
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm3(vec3 p) { return 0.55 * n3(p) + 0.3 * n3(p * 2.1) + 0.15 * n3(p * 4.3); }
`;

export function makeSky() {
  const geo = new THREE.SphereGeometry(60, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#f6f9fa') }, mid: { value: new THREE.Color('#e3eaee') }, bot: { value: new THREE.Color('#cdd8de') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, bot; varying vec3 vP;
      void main(){ float h = normalize(vP).y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, h)) : mix(mid, bot, smoothstep(0.0, 0.5, -h)); gl_FragColor = vec4(c, 1.0); }`
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = -10;
  m.frustumCulled = false;
  return m;
}

// Wind-carved porcelain/snow ground with a flat clearing in the middle
export function makeTerrain() {
  const size = 70, seg = 220;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return (hash(xi, yi) * (1 - u) + hash(xi + 1, yi) * u) * (1 - v) + (hash(xi, yi + 1) * (1 - u) + hash(xi + 1, yi + 1) * u) * v;
  };
  const fbm = (x, y) => { let a = 0.5, f = 1, s = 0; for (let i = 0; i < 5; i++) { s += a * noise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const r = Math.hypot(x, z * 1.2);
    const clearing = THREE.MathUtils.smoothstep(r, 13, 24);   // wide flat clearing: the camera never ends up inside a hill
    const ridge = Math.pow(Math.abs(fbm(x * 0.09 + 3, z * 0.09) - 0.5) * 2, 1.6);
    const sastrugi = Math.sin(x * 1.1 + z * 0.35 + fbm(x * 0.3, z * 0.3) * 6.0) * 0.11 * (0.4 + fbm(x * 0.5, z * 0.5));
    const h = (fbm(x * 0.16, z * 0.16) * 3.0 + ridge * 6.0) * clearing + fbm(x * 0.9, z * 0.9) * 0.22 + sastrugi + fbm(x * 2.6, z * 2.6) * 0.05;
    p.setY(i, h);
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    // wind-blown snow: faces turned away from the light pick up a cold blue-grey
    const lit = Math.pow(Math.max(0, nrm.getY(i)), 6) * 0.6 + 0.4 * Math.max(0, nrm.getX(i) * 0.6 + nrm.getY(i) * 0.8);
    const grain = 0.94 + 0.06 * fbm(x * 0.7 + 9, z * 0.7);
    const k = (0.72 + 0.28 * lit) * grain;
    col[i * 3] = k * 0.93; col[i * 3 + 1] = k * 0.965; col[i * 3 + 2] = k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95, metalness: 0, transparent: true, opacity: 1 });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = -5;
  return m;
}

export function makeContactShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(40,60,70,.42)'); grd.addColorStop(0.45, 'rgba(40,60,70,.16)'); grd.addColorStop(1, 'rgba(40,60,70,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// Patch standard/physical materials so that uDiss (0 = solid, 1 = gone) eats them away
export function addDissolve(materials, uniforms) {
  for (const mat of materials) {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uDiss = uniforms.uDiss;
      sh.uniforms.uEdge = uniforms.uEdge;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vDP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDP = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vDP;\nuniform float uDiss;\nuniform vec3 uEdge;\n${NOISE}`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
          float dn = fbm3(vDP * 3.2 + vec3(0.0, vDP.y * 0.6, 0.0));
          float th = uDiss * 1.15 - 0.05;
          if (dn < th) discard;
          float edge = 1.0 - smoothstep(0.0, 0.06, dn - th);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uEdge * 1.6, edge * step(0.001, uDiss));`);
    };
    mat.needsUpdate = true;
  }
}

// A point cloud sampled from the surfaces of `meshes` (in `space`'s coordinates). It shows
// where the meshes have dissolved and drifts outwards with uSpread.
export function makeCloud(meshes, space, count, uniforms) {
  const pos = new Float32Array(count * 3), rnd = new Float32Array(count * 4), nrm = new Float32Array(count * 3);
  const per = meshes.map(m => {
    let area = 0; const g = m.geometry; const p = g.attributes.position; const idx = g.index;
    const tri = (a, b, c) => { const A = new THREE.Vector3().fromBufferAttribute(p, a), B = new THREE.Vector3().fromBufferAttribute(p, b), C = new THREE.Vector3().fromBufferAttribute(p, c); return new THREE.Triangle(A, B, C).getArea(); };
    const n = idx ? idx.count / 3 : p.count / 3;
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 400))) area += idx ? tri(idx.getX(i * 3), idx.getX(i * 3 + 1), idx.getX(i * 3 + 2)) : tri(i * 3, i * 3 + 1, i * 3 + 2);
    return Math.max(1e-4, area);
  });
  const total = per.reduce((a, b) => a + b, 0);
  const v = new THREE.Vector3(), nn = new THREE.Vector3();
  let k = 0;
  space.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(space.matrixWorld).invert();
  meshes.forEach((m, mi) => {
    const sampler = new MeshSurfaceSampler(m).build();
    const n = mi === meshes.length - 1 ? count - k : Math.round(count * per[mi] / total);
    const mtx = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    const nm = new THREE.Matrix3().getNormalMatrix(mtx);
    for (let i = 0; i < n && k < count; i++, k++) {
      sampler.sample(v, nn);
      v.applyMatrix4(mtx); nn.applyMatrix3(nm).normalize();
      pos.set([v.x, v.y, v.z], k * 3); nrm.set([nn.x, nn.y, nn.z], k * 3);
      rnd.set([Math.random(), Math.random(), Math.random(), Math.random()], k * 4);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aNormal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { ...uniforms, uColor: { value: new THREE.Color('#5d7c88') }, uSize: { value: 2.2 }, uPR: { value: 1 } },
    vertexShader: `${NOISE}
      attribute vec3 aNormal; attribute vec4 aRnd;
      uniform float uDiss, uSpread, uTime, uSize, uPR;
      varying float vA;
      void main() {
        // appear where the surface has dissolved (same field as the mesh), then drift away
        float dn = fbm3(position * 3.2 + vec3(0.0, position.y * 0.6, 0.0));
        float th = uDiss * 1.15 - 0.05;
        float shown = smoothstep(dn - 0.02, dn + 0.08, th);
        vec3 drift = aNormal * (0.15 + aRnd.x * 0.9) + vec3(aRnd.y - 0.5, aRnd.z * 0.6, aRnd.w - 0.5) * 1.6;
        float s = uSpread * (0.4 + aRnd.x);
        vec3 p = position + drift * s;
        p += vec3(sin(uTime * 0.7 + aRnd.y * 40.0), cos(uTime * 0.6 + aRnd.z * 40.0), sin(uTime * 0.5 + aRnd.w * 40.0)) * 0.04 * (shown + s);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPR * (0.6 + aRnd.w * 0.8) * (6.0 / -mv.z);
        vA = shown * (1.0 - smoothstep(1.2, 3.0, s));
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
      void main() { vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25 || vA < 0.01) discard; gl_FragColor = vec4(uColor, vA * (1.0 - d * 3.2)); }`
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}
