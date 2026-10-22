// Extra spectacle for the frost world:
//  - a final lens pass: chromatic aberration, barrel squeeze and grain that react to scroll speed
//  - snowfall
//  - an "igloo" of ice bricks around the implant that assembles in the intro and shatters on scroll
//  - bone debris while the screw drills in, and a shock ring when the crown lands
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const LensShader = {
  uniforms: { tDiffuse: { value: null }, uVel: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uVel, uTime, uAspect; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      vec2 ca2 = c * vec2(uAspect, 1.0);
      float r2 = dot(ca2, ca2);
      vec2 uv = 0.5 + c * (1.0 - uVel * 0.05 * r2);
      float ca = (0.0012 + uVel * 0.014) * (0.25 + r2 * 2.0);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ca * 1.2).b;
      col *= 1.0 - r2 * 0.16;
      col = mix(col, col * vec3(0.97, 0.99, 1.02), clamp(r2 * 1.5, 0.0, 1.0));
      col += (hash(vUv * 1024.0 + fract(uTime) * 61.0) - 0.5) * 0.028;
      gl_FragColor = vec4(col, 1.0);
    }`
};

export function makeSnow(count) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), rnd = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 1] = Math.random() * 18;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 34;
    rnd[i * 2] = Math.random(); rnd[i * 2 + 1] = Math.random();
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 2));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 }, uScroll: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: `attribute vec2 aRnd; uniform float uTime, uPR, uScroll; varying float vA;
      void main() {
        vec3 p = position;
        float sp = 0.25 + aRnd.x * 0.5;
        p.y = mod(p.y - uTime * sp - uScroll * (0.6 + aRnd.y), 18.0) - 5.0;
        p.x += sin(uTime * 0.6 + aRnd.y * 30.0) * 0.5;
        p.z += cos(uTime * 0.5 + aRnd.x * 30.0) * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float big = step(0.985, aRnd.y);
        gl_PointSize = min(uPR * (2.0 + aRnd.x * 3.0 + big * 9.0) * (10.0 / -mv.z), 26.0 * uPR);
        vA = (0.3 + 0.35 * aRnd.x) * (1.0 - big * 0.75) * smoothstep(2.0, 6.0, -mv.z);
      }`,
    fragmentShader: `uniform float uOpacity; varying float vA;
      void main() { vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
        gl_FragColor = vec4(vec3(0.56, 0.66, 0.71), vA * uOpacity * smoothstep(0.5, 0.0, d)); }`
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
}

// Ice bricks stacked around the implant. `cheap` skips real refraction (phones).
export function makeIce(cheap) {
  const mat = cheap
    ? new THREE.MeshPhysicalMaterial({ color: 0xe9f6fb, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.15, transparent: true, opacity: 0.32, depthWrite: false })
    : new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.16, metalness: 0, transmission: 1, thickness: 0.9, ior: 1.31, attenuationColor: new THREE.Color(0xbfe6f2), attenuationDistance: 2.2, clearcoat: 1, clearcoatRoughness: 0.12, transparent: true, specularIntensity: 1 });
  const group = new THREE.Group();
  const bricks = [];
  const bw = 0.84, bh = 0.9, gap = 0.05;
  const geo = new RoundedBoxGeometry(bw, bh, bw, 3, 0.12);
  for (let ix = 0; ix < 2; ix++) for (let iy = 0; iy < 3; iy++) for (let iz = 0; iz < 2; iz++) {
    const m = new THREE.Mesh(geo, mat);
    // stagger rows like brickwork
    const off = iy % 2 ? 0.08 : -0.08;
    const home = new THREE.Vector3((ix - 0.5) * (bw + gap) + off, -1.85 + iy * (bh + gap), (iz - 0.5) * (bw + gap) - off);
    m.position.copy(home);
    const dir = home.clone().setY(home.y * 0.4 + 0.6).normalize();
    bricks.push({
      m, home, dir,
      spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(5),
      k: 0.6 + Math.random() * 0.8, delay: (2 - iy) * 0.14 + Math.random() * 0.1
    });
    group.add(m);
  }
  return {
    group, mat,
    // e: 0 = assembled igloo, 1 = blown apart
    set(e) {
      group.visible = e < 0.995;
      if (!group.visible) return;
      for (const b of bricks) {
        const t = Math.min(1, Math.max(0, (e - b.delay * 0.5) / (1 - b.delay * 0.5)));
        const f = t * t * (3 - 2 * t);
        b.m.position.copy(b.home).addScaledVector(b.dir, f * 7 * b.k);
        b.m.position.y += f * f * -1.5 + f * 2.2 * b.k;
        b.m.rotation.set(b.spin.x * f, b.spin.y * f, b.spin.z * f);
        b.m.scale.setScalar(1 - f * 0.35);
      }
      mat.opacity = (cheap ? 0.32 : 1) * (1 - Math.max(0, e - 0.55) / 0.45);
    }
  };
}

// Bone chips spraying out of the socket while the screw turns
export function makeDebris(count) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), rnd = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) rnd.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uPR: { value: 1 } },
    vertexShader: `attribute vec4 aRnd; uniform float uTime, uAmt, uPR; varying float vA;
      void main() {
        float t = fract(uTime * (0.9 + aRnd.w * 0.6) + aRnd.x);
        float a = aRnd.y * 6.2832;
        vec3 v = vec3(cos(a) * (0.6 + aRnd.z * 1.4), 1.6 + aRnd.w * 1.8, sin(a) * (0.6 + aRnd.z * 1.4));
        vec3 p = vec3(cos(a) * 0.3, 0.3, sin(a) * 0.3) + v * t + vec3(0.0, -3.2, 0.0) * t * t;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPR * (3.0 + aRnd.z * 5.0) * (9.0 / -mv.z);
        vA = uAmt * (1.0 - t);
      }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; if (dot(c,c) > 0.25 || vA < 0.01) discard; gl_FragColor = vec4(0.62, 0.53, 0.40, vA); }`
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}

export function makeWave() {
  const mat = new THREE.MeshBasicMaterial({ color: 0x3f97b2, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 96), mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.3;
  return {
    mesh: ring,
    set(w) {
      ring.visible = w > 0.001 && w < 0.999;
      const s = 0.4 + w * 3.4;
      ring.scale.set(s, s, s);
      mat.opacity = Math.sin(Math.PI * w) * 0.7;
    }
  };
}
