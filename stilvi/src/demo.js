import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/600.css'
import '@fontsource/jetbrains-mono/400.css'
import Lenis from 'lenis'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// Three scroll-driven product shots in the "watch landing page" style:
// one fixed WebGL canvas, one object per section, each turning and changing
// state as its section is scrolled (glass fills, lantern lights, coals heat).

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const canvas = document.querySelector('.stage')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
const scene = new THREE.Scene()
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.7
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
camera.position.set(0, 0.4, 7.5)
camera.lookAt(0, 0, 0)
scene.add(new THREE.AmbientLight(0xffffff, 0.25))
const key = new THREE.DirectionalLight(0xfff1e0, 2.2)
key.position.set(3, 4, 5)
scene.add(key)
const rim = new THREE.DirectionalLight(0x8fb4ff, 1.4)
rim.position.set(-4, 2, -3)
scene.add(rim)

const smooth = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t) }

/* ── 1. Ribbed rosé tumbler ─────────────────────────── */

const glass = new THREE.Group()
{
  const profile = [[0, 0], [0.7, 0], [0.73, 0.05], [0.86, 2.2], [0.81, 2.2], [0.68, 0.2], [0, 0.2]].map(([x, y]) => new THREE.Vector2(x, y))
  const geo = new THREE.LatheGeometry(profile, 128)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const r = Math.hypot(x, z)
    if (r < 0.1) continue
    const a = Math.atan2(z, x)
    const k = 1 + 0.03 * Math.pow(Math.abs(Math.cos(a * 14)), 0.7)
    pos.setX(i, x * k); pos.setZ(i, z * k)
  }
  geo.computeVertexNormals()
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffd0d8, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.4, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
  const cup = new THREE.Mesh(geo, glassMat)
  cup.renderOrder = 2
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.79, 0.67, 1, 96),
    new THREE.MeshStandardMaterial({ color: 0xf06a82, emissive: 0x5a1020, emissiveIntensity: 0.6, roughness: 0.15, transparent: true, opacity: 0.85 }),
  )
  // bubbles rising through the wine
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd9e0, transparent: true, opacity: 0.7 }), 60)
  const bubbleSeeds = Array.from({ length: 60 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random() * 0.55, y: Math.random(), v: 0.15 + Math.random() * 0.3 }))
  glass.add(cup, liquid, bubbles)
  glass.position.y = -0.85
  glass.userData.size = 0.78
  glass.userData.update = (s, t, dt) => {
    const level = 0.06 + smooth(0.12, 0.7, s) * 1.6
    liquid.scale.y = level
    liquid.position.y = 0.21 + level / 2
    const m = new THREE.Matrix4()
    bubbleSeeds.forEach((b, i) => {
      b.y += b.v * dt
      if (b.y > 1) b.y = 0
      const show = level > 0.2
      m.makeTranslation(Math.cos(b.a) * b.r, 0.25 + b.y * (level - 0.08), Math.sin(b.a) * b.r)
      if (!show) m.makeScale(0, 0, 0)
      bubbles.setMatrixAt(i, m)
    })
    bubbles.instanceMatrix.needsUpdate = true
    glass.rotation.y = s * Math.PI * 1.4 + Math.sin(t * 0.4) * 0.08
    glass.rotation.x = 0.18 + Math.sin(t * 0.7) * 0.02
  }
}

/* ── 2. Rattan lantern ──────────────────────────────── */

const lantern = new THREE.Group()
{
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  g.clearRect(0, 0, 256, 256)
  // a basket weave: horizontal strands over and under vertical ribs, with gaps
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const over = (row + col) % 2 === 0
      const x = col * 32, y = row * 32
      const grad = g.createLinearGradient(x, y, over ? x + 32 : x, over ? y : y + 32)
      grad.addColorStop(0, '#8a5a2b'); grad.addColorStop(0.5, '#e0aa66'); grad.addColorStop(1, '#8a5a2b')
      g.fillStyle = grad
      if (over) g.fillRect(x + 1, y + 6, 30, 20)
      else g.fillRect(x + 7, y + 1, 18, 30)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(14, 7)
  tex.anisotropy = 8
  const profile = [[0.06, 2.0], [0.3, 1.97], [0.62, 1.78], [0.86, 1.4], [1.0, 0.9], [1.04, 0.4], [0.98, 0]].map(([x, y]) => new THREE.Vector2(x, y))
  const shellMat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, emissive: 0xff9440, emissiveMap: tex, emissiveIntensity: 0 })
  const shell = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), shellMat)
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x7a4d24, roughness: 0.8 })
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.035, 12, 96), rimMat)
  rimRing.rotation.x = Math.PI / 2
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 3, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }))
  cord.position.y = 3.5
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 24), new THREE.MeshBasicMaterial({ color: 0x332211 }))
  bulb.position.y = 1.2
  const light = new THREE.PointLight(0xffa04a, 0, 8, 1.6)
  light.position.y = 1.1
  // warm bokeh of string lights around the lantern
  const N = 70
  const bokehGeo = new THREE.BufferGeometry()
  const bp = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) { bp[i * 3] = (Math.random() - 0.5) * 9; bp[i * 3 + 1] = Math.random() * 5 - 1; bp[i * 3 + 2] = -2 - Math.random() * 4 }
  bokehGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3))
  const dot = document.createElement('canvas'); dot.width = dot.height = 64
  const dg = dot.getContext('2d'); const rg = dg.createRadialGradient(32, 32, 0, 32, 32, 32)
  rg.addColorStop(0, 'rgba(255,200,130,1)'); rg.addColorStop(0.4, 'rgba(255,160,80,.5)'); rg.addColorStop(1, 'rgba(255,140,60,0)')
  dg.fillStyle = rg; dg.fillRect(0, 0, 64, 64)
  const bokeh = new THREE.Points(bokehGeo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dot), size: 0.35, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }))
  const swing = new THREE.Group()
  swing.add(shell, rimRing, cord, bulb, light)
  swing.position.y = -1.0
  lantern.add(swing, bokeh)
  lantern.userData.update = (s, t) => {
    const on = smooth(0.18, 0.55, s)
    const flick = 1 + Math.sin(t * 9) * 0.04 + Math.sin(t * 23) * 0.025
    shellMat.emissiveIntensity = on * 0.9 * flick
    light.intensity = on * 14 * flick
    bulb.material.color.setRGB(0.2 + on * 1.0, 0.13 + on * 0.75, 0.07 + on * 0.35)
    bokeh.material.opacity = on * 0.9
    swing.rotation.z = Math.sin(t * 0.9) * 0.05
    swing.rotation.y = s * Math.PI * 1.2 + t * 0.05
  }
}

/* ── 3. Grill with coals, steak and embers ──────────── */

const grill = new THREE.Group()
{
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.9, roughness: 0.45 })
  for (let i = -6; i <= 6; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, 0.05), steel)
    bar.position.z = i * 0.2
    grill.add(bar)
  }
  for (const z of [-1.3, 1.3]) { const f = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.1, 0.1), steel); f.position.z = z; grill.add(f) }

  const coalGeo = new THREE.IcosahedronGeometry(0.17, 0)
  const COALS = 90
  const coals = new THREE.InstancedMesh(coalGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), COALS)
  const coalSeeds = []
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
  for (let i = 0; i < COALS; i++) {
    const p = new THREE.Vector3((Math.random() - 0.5) * 3.2, -0.45 - Math.random() * 0.2, (Math.random() - 0.5) * 2.2)
    const sc = 0.6 + Math.random() * 0.8
    q.setFromEuler(e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3))
    m.compose(p, q, new THREE.Vector3(sc, sc * 0.8, sc))
    coals.setMatrixAt(i, m)
    coalSeeds.push({ heat: Math.random(), ph: Math.random() * 10 })
  }
  coals.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COALS * 3), 3)

  // glow under the grate
  const glowC = document.createElement('canvas'); glowC.width = glowC.height = 128
  const gg = glowC.getContext('2d'); const gr = gg.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,140,50,1)'); gr.addColorStop(1, 'rgba(255,80,20,0)')
  gg.fillStyle = gr; gg.fillRect(0, 0, 128, 128)
  const glowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowC), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.6), glowMat)
  glow.rotation.x = -Math.PI / 2
  glow.position.y = -0.3

  // steak: an extruded bone-in shape with seared grill marks
  // bone-in rib-eye: rounded eye with a tapering tail and a bone along one edge
  const sh = new THREE.Shape()
  sh.moveTo(-1.05, 0.05)
  sh.bezierCurveTo(-1.1, 0.5, -0.55, 0.7, -0.05, 0.62)
  sh.bezierCurveTo(0.45, 0.56, 0.8, 0.42, 1.0, 0.18)
  sh.bezierCurveTo(1.15, 0.0, 1.05, -0.28, 0.75, -0.35)
  sh.bezierCurveTo(0.4, -0.42, 0.15, -0.62, -0.25, -0.62)
  sh.bezierCurveTo(-0.7, -0.62, -1.0, -0.35, -1.05, 0.05)
  const steakGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 5, curveSegments: 48 })
  const sc = document.createElement('canvas'); sc.width = sc.height = 512
  const sg = sc.getContext('2d')
  const steakTex = new THREE.CanvasTexture(sc); steakTex.colorSpace = THREE.SRGBColorSpace
  const drawSteak = (sear) => {
    const base = sg.createRadialGradient(256, 256, 40, 256, 256, 300)
    base.addColorStop(0, `rgb(${128 - sear * 48},${62 - sear * 26},${38 - sear * 18})`); base.addColorStop(0.7, `rgb(${104 - sear * 40},${48 - sear * 20},${28 - sear * 14})`); base.addColorStop(1, `rgb(${70 - sear * 25},${32 - sear * 12},${20 - sear * 8})`)
    sg.fillStyle = base; sg.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 2200; i++) { sg.fillStyle = Math.random() < 0.5 ? `rgba(255,230,190,${Math.random() * 0.07})` : `rgba(30,12,6,${Math.random() * 0.12})`; sg.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 4, 1 + Math.random() * 2) }
    // fat cap along the edge
    sg.strokeStyle = 'rgba(235,205,160,.35)'; sg.lineWidth = 22; sg.beginPath(); sg.ellipse(256, 256, 236, 200, 0, 0, Math.PI * 2); sg.stroke()
    sg.save(); sg.translate(256, 256); sg.rotate(-0.6)
    sg.strokeStyle = `rgba(20,8,4,${0.25 + sear * 0.7})`; sg.lineWidth = 14
    for (let k = -4; k <= 4; k++) { sg.beginPath(); sg.moveTo(-400, k * 64); sg.lineTo(400, k * 64); sg.stroke() }
    sg.restore()
    steakTex.needsUpdate = true
  }
  drawSteak(0)
  const uv = steakGeo.attributes.uv
  const sp = steakGeo.attributes.position
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (sp.getX(i) + 1) / 2, (sp.getY(i) + 1) / 2)
  const steak = new THREE.Mesh(steakGeo, [new THREE.MeshStandardMaterial({ map: steakTex, roughness: 0.45 }), new THREE.MeshStandardMaterial({ color: 0x4a2414, roughness: 0.7 })])
  const bone = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.2, 6, 16), new THREE.MeshStandardMaterial({ color: 0xe9dcc4, roughness: 0.6 }))
  bone.rotation.z = Math.PI / 2 + 0.25
  bone.position.set(-0.05, -0.62, 0.1)
  steak.add(bone)
  steak.rotation.x = -Math.PI / 2
  steak.position.set(0, 0.06, 0)
  steak.scale.setScalar(0.85)

  // embers
  const E = 260
  const eg = new THREE.BufferGeometry()
  const ep = new Float32Array(E * 3)
  const ev = Array.from({ length: E }, () => ({ v: 0.4 + Math.random() * 1.1, w: Math.random() * 6 }))
  for (let i = 0; i < E; i++) { ep[i * 3] = (Math.random() - 0.5) * 3.2; ep[i * 3 + 1] = Math.random() * 4 - 0.4; ep[i * 3 + 2] = (Math.random() - 0.5) * 2.2 }
  eg.setAttribute('position', new THREE.BufferAttribute(ep, 3))
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ map: glowMat.map, color: 0xffa050, size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }))
  const fire = new THREE.PointLight(0xff6a20, 0, 6, 1.4)
  fire.position.y = 0.2

  grill.add(coals, glow, steak, embers, fire)
  grill.rotation.x = 0.55
  grill.position.y = -0.2
  let lastSear = -1
  const col = new THREE.Color()
  grill.userData.update = (s, t, dt) => {
    const heat = smooth(0.1, 0.6, s)
    coalSeeds.forEach((c, i) => {
      const f = heat * (0.55 + 0.45 * Math.sin(t * (1.5 + c.heat * 2) + c.ph)) * (0.5 + c.heat * 0.5)
      col.setRGB(0.08 + f * 1.4, 0.05 + f * 0.45, 0.04 + f * 0.08)
      coals.setColorAt(i, col)
    })
    coals.instanceColor.needsUpdate = true
    glowMat.opacity = heat * 0.85
    fire.intensity = heat * (10 + Math.sin(t * 13) * 1.5)
    embers.material.opacity = heat
    for (let i = 0; i < E; i++) {
      ep[i * 3 + 1] += ev[i].v * dt * (0.4 + heat)
      ep[i * 3] += Math.sin(t * 2 + ev[i].w) * dt * 0.15
      if (ep[i * 3 + 1] > 3.6) { ep[i * 3 + 1] = -0.3; ep[i * 3] = (Math.random() - 0.5) * 3.2 }
    }
    eg.attributes.position.needsUpdate = true
    const sear = Math.round(smooth(0.35, 0.85, s) * 20) / 20
    if (sear !== lastSear) { drawSteak(sear); lastSear = sear }
    grill.rotation.y = -0.4 + s * 0.9
  }
}

const objects = [glass, lantern, grill]
objects.forEach((o) => { o.visible = false; scene.add(o) })

/* ── Scroll mapping ─────────────────────────────────── */

const sections = [...document.querySelectorAll('.obj')]
const resize = () => {
  const w = window.innerWidth, h = window.innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
resize()
window.addEventListener('resize', resize)

const lenis = reduceMotion ? null : new Lenis({ lerp: 0.085 })
let last = performance.now()
const frame = (now) => {
  lenis?.raf(now)
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  const t = now / 1000
  const vh = window.innerHeight
  const portrait = window.innerWidth < window.innerHeight
  sections.forEach((sec, i) => {
    const r = sec.getBoundingClientRect()
    const s = reduceMotion ? 0.6 : -r.top / (r.height - vh)
    const presence = smooth(-0.25, 0.02, s) * (1 - smooth(0.98, 1.25, s))
    const o = objects[i]
    o.visible = presence > 0.01
    if (!o.visible) return
    const k = (0.55 + 0.45 * presence) * (portrait ? 0.62 : 1) * (o.userData.size ?? 1)
    o.scale.setScalar(k)
    o.userData.baseY ??= o.position.y
    o.position.y = o.userData.baseY * k + (1 - presence) * (s < 0.5 ? -2.5 : 2.5) + (portrait ? 0.55 : 0)
    o.userData.update(Math.min(Math.max(s, 0), 1), t, dt)
  })
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
