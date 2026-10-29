import { WebGLRenderer, Scene, OrthographicCamera, Mesh, PlaneGeometry, ShaderMaterial, Vector2, TextureLoader, SRGBColorSpace, LinearMipmapLinearFilter } from 'three'

// Cinematic kitchen shots that melt into one another as you scroll. The
// transition front follows a slow-moving noise field and leaves a thin gold
// glint where the two images meet; each shot pushes in gently while it is on
// screen, and the foreground drifts with the pointer for a bit of depth.
const frag = /* glsl */ `
precision highp float;
uniform sampler2D uA;
uniform sampler2D uB;
uniform vec2 uRes;
uniform float uImgAspect;
uniform float uMix;
uniform float uZoomA;
uniform float uZoomB;
uniform float uTime;
uniform vec2 uMouse;
uniform float uFocalX;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1., 0.)), c = hash(i + vec2(0., 1.)), d = hash(i + vec2(1., 1.));
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= .5; } return v; }

vec2 cover(vec2 uv, float zoom){
  float sa = uRes.x / uRes.y;
  vec2 span = sa > uImgAspect ? vec2(1., uImgAspect / sa) : vec2(sa / uImgAspect, 1.);
  span /= zoom;
  vec2 focal = clamp(vec2(uFocalX, .5) + uMouse * vec2(.01, .006), span * .5, 1. - span * .5);
  return focal + (uv - .5) * span;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float t = uMix;
  float n = fbm(uv * vec2(1.8, 1.3) + vec2(uTime * .03, -uTime * .02));
  float wave = sin(t * 3.14159);

  // closer things (lower in frame) shift more with the pointer
  vec2 depth = uMouse * .008 * (1.1 - uv.y);
  vec2 warp = (n - .5) * .09 * wave * vec2(1., -.6);
  vec3 a = texture2D(uA, cover(uv, uZoomA) + depth + warp).rgb;
  vec3 b = texture2D(uB, cover(uv, uZoomB) + depth - warp).rgb;

  float th = t * 1.45 - .25 + uv.y * .12;
  float m = 1. - smoothstep(th, th + .2, n);
  vec3 col = mix(a, b, m);
  float rim = smoothstep(th - .035, th, n) - smoothstep(th, th + .035, n);
  col += vec3(1., .76, .42) * rim * .9 * wave;

  vec2 v = uv - .5;
  col *= 1. - dot(v, v) * .6;
  col *= .9;
  col += (hash(gl_FragCoord.xy + fract(uTime) * 40.) - .5) * .02;
  gl_FragColor = vec4(col, 1.);
}
`

const vert = /* glsl */ `
void main(){ gl_Position = vec4(position.xy, 0., 1.); }
`

export function createKitchenScene(canvas, imgs) {
  let renderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const uniforms = {
    uA: { value: null },
    uB: { value: null },
    uRes: { value: new Vector2() },
    uImgAspect: { value: 16 / 9 },
    uMix: { value: 0 },
    uZoomA: { value: 1.04 },
    uZoomB: { value: 1.04 },
    uTime: { value: 0 },
    uMouse: { value: new Vector2() },
    uFocalX: { value: 0.5 },
  }
  scene.add(new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms })))

  const textures = []
  let loaded = 0
  const loader = new TextureLoader()
  imgs.forEach((img, i) => {
    loader.load(img.currentSrc || img.src, (tex) => {
      tex.colorSpace = SRGBColorSpace
      tex.minFilter = LinearMipmapLinearFilter
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
      textures[i] = tex
      uniforms.uImgAspect.value = tex.image.width / tex.image.height
      if (++loaded === imgs.length) canvas.classList.add('is-ready')
    })
  })

  const mouse = new Vector2()
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    const dpr = Math.min(window.devicePixelRatio, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    uniforms.uRes.value.set(w * dpr, h * dpr)
    // on portrait screens keep the plate, glass and grill in frame
    uniforms.uFocalX.value = w / h < 1 ? 0.4 : 0.5
  }
  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
  })

  let visible = false
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }).observe(canvas)

  // `shot` runs from 0 (first image) to imgs.length - 1 (last image)
  let shot = 0
  const start = performance.now()
  return {
    setShot(s) { shot = s },
    tick() {
      if (!visible || loaded < imgs.length) return
      const last = imgs.length - 1
      const i = Math.min(Math.floor(shot), last - 1)
      const t = Math.min(Math.max(shot - i, 0), 1)
      uniforms.uA.value = textures[i]
      uniforms.uB.value = textures[i + 1]
      uniforms.uMix.value = t
      // each shot pushes in while it is on screen, from one transition to the next
      uniforms.uZoomA.value = 1.04 + 0.1 * Math.min(Math.max((shot - i + 1) / 2, 0), 1)
      uniforms.uZoomB.value = 1.04 + 0.1 * Math.min(Math.max((shot - i) / 2, 0), 1)
      uniforms.uTime.value = (performance.now() - start) / 1000
      uniforms.uMouse.value.lerp(mouse, 0.05)
      renderer.render(scene, camera)
    },
  }
}
