import { WebGLRenderer, Scene, OrthographicCamera, Mesh, PlaneGeometry, ShaderMaterial, Vector2, TextureLoader, SRGBColorSpace, LinearFilter } from 'three'

// The night photo of the deck, brought to life in a fragment shader: the sea
// below the horizon ripples (stronger close to the shore), the moon path
// glitters, the lanterns flicker and a few stars twinkle. `zoom` dollies in
// as the hero is scrolled. Image-space coordinates below are measured from
// the top-left of the 1536×864 render.
const frag = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uImgAspect;
uniform float uTime;
uniform float uZoom;
uniform float uFocalX;
uniform vec2 uMouse;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

const float HORIZON = 0.497;

float waterMask(vec2 q){
  float shore = 0.631 + (q.x - 0.3125) * 0.334;   // pebble line
  float rail = 0.579 + (q.x - 0.13) * 0.66;        // top of the railing
  float edge = min(shore, rail - 0.012);
  return smoothstep(HORIZON + .002, HORIZON + .014, q.y) * smoothstep(edge, edge - .018, q.y) * smoothstep(.14, .18, q.x);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float sa = uRes.x / uRes.y;
  vec2 span = sa > uImgAspect ? vec2(1., uImgAspect / sa) : vec2(sa / uImgAspect, 1.);
  float z = 1.06 + uZoom * 0.2;
  span /= z;
  vec2 focal = vec2(uFocalX, .5) + uMouse * vec2(.012, .008);
  focal = clamp(focal, span * .5, 1. - span * .5);
  vec2 t = focal + (uv - .5) * span;           // texture uv, y up
  vec2 q = vec2(t.x, 1. - t.y);                // image coords, y down

  float m = waterMask(q);
  float d = max(q.y - HORIZON, 0.);
  float phase = 2.6 / (d + .025);
  float time = uTime;
  vec2 off = vec2(
    sin(phase - time * 1.4 + q.x * 9.) * .55 + sin(phase * 1.7 + time * 1.05 - q.x * 5.) * .45,
    cos(phase * 1.3 - time * .9)
  ) * vec2(.0024, .0011) * m * (.35 + d * 3.2);
  vec3 col = texture2D(uTex, t + vec2(off.x, -off.y)).rgb;

  // glitter on bright water (moon path, lantern reflections)
  float lum = dot(col, vec3(.299, .587, .114));
  float g = step(.93, hash(floor(gl_FragCoord.xy / 2.) + floor(time * 9.)));
  col += vec3(1., .96, .88) * g * smoothstep(.45, .85, lum) * m * .55;

  // lantern flicker (warm, bright pixels in the trees and on the tables)
  float warm = smoothstep(.5, .9, col.r) * step(col.b * 1.35, col.r) * (1. - m);
  float fl = .055 * sin(time * 7.3 + q.x * 11.) + .035 * sin(time * 12.7 + q.y * 17.) + .025 * sin(time * 3.1);
  col *= 1. + warm * fl;

  // stars in the open sky
  vec2 sc = q * vec2(480., 270.);
  vec2 sid = floor(sc);
  float sky = smoothstep(.45, .3, q.y) * smoothstep(.38, .5, q.x) * smoothstep(.2, .02, lum);
  float star = step(.992, hash(sid)) * smoothstep(.35, .0, length(fract(sc) - .5));
  col += vec3(.9, .93, 1.) * star * sky * (.35 + .65 * (.5 + .5 * sin(time * 2.3 + hash(sid + 7.) * 40.)));

  // grade: gentle vignette, keep the centre readable
  vec2 v = uv - .5;
  col *= 1. - dot(v, v) * .55;
  col += (hash(gl_FragCoord.xy + fract(time) * 50.) - .5) * .018;
  gl_FragColor = vec4(col, 1.);
}
`

const vert = /* glsl */ `
void main(){ gl_Position = vec4(position.xy, 0., 1.); }
`

export function createHeroScene(canvas, img) {
  let renderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
  } catch {
    return { tick() {}, setZoom() {} }
  }
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const uniforms = {
    uTex: { value: null },
    uRes: { value: new Vector2() },
    uImgAspect: { value: 16 / 9 },
    uTime: { value: 0 },
    uZoom: { value: 0 },
    uFocalX: { value: 0.56 },
    uMouse: { value: new Vector2() },
  }
  scene.add(new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms })))

  let ready = false
  new TextureLoader().load(img.currentSrc || img.src, (tex) => {
    tex.colorSpace = SRGBColorSpace
    tex.minFilter = LinearFilter
    tex.generateMipmaps = false
    uniforms.uTex.value = tex
    uniforms.uImgAspect.value = tex.image.width / tex.image.height
    ready = true
    canvas.classList.add('is-ready')
  })

  const mouse = new Vector2()
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    const dpr = Math.min(window.devicePixelRatio, w < 800 ? 1.5 : 1.75)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    uniforms.uRes.value.set(w * dpr, h * dpr)
    // portrait screens frame the lanterns and tables instead of the open sea
    uniforms.uFocalX.value = w / h < 1 ? 0.3 : 0.56
  }
  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
  })

  let visible = true
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }).observe(canvas)

  const start = performance.now()
  return {
    tick() {
      if (!visible || !ready) return
      uniforms.uTime.value = (performance.now() - start) / 1000
      uniforms.uMouse.value.lerp(mouse, 0.04)
      renderer.render(scene, camera)
    },
    setZoom(z) { uniforms.uZoom.value = z },
  }
}
