import { WebGLRenderer, Scene, OrthographicCamera, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three'

// Ray-traced sea at dusk: the camera looks across the gulf, waves are an
// analytic sum of directional sines, and `progress` moves the scene from
// sunset (0) to night (1) as the hero is scrolled.
const frag = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uProg;
uniform vec2 uMouse;
varying vec2 vUv;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float n1(float x){ float i = floor(x), f = fract(x); float a = fract(sin(i * 12.9898) * 43758.5453); float b = fract(sin((i + 1.) * 12.9898) * 43758.5453); return mix(a, b, f * f * (3. - 2. * f)); }
float fbm1(float x){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a * n1(x); x *= 2.07; a *= .5; } return v; }

float night(){ return smoothstep(0.15, 0.95, uProg); }
vec3 sunDir(){ return normalize(vec3(-0.32, mix(0.05, -0.08, smoothstep(0., .75, uProg)), 1.)); }
vec3 moonDir(){ return normalize(vec3(0.3, 0.13, 1.)); }

vec3 horizonCol(){ return mix(vec3(1.0, 0.56, 0.40), vec3(0.11, 0.09, 0.17), night()); }

vec3 sky(vec3 rd, float refl){
  float n = night();
  float h = max(rd.y, 0.);
  vec3 zen = mix(vec3(0.12, 0.15, 0.31), vec3(0.008, 0.014, 0.04), n);
  vec3 mid = mix(vec3(0.58, 0.44, 0.62), vec3(0.04, 0.045, 0.11), n);
  vec3 col = mix(horizonCol(), mid, smoothstep(0., .1, h));
  col = mix(col, zen, smoothstep(.06, .55, h));

  vec3 sd = sunDir();
  float s = max(dot(rd, sd), 0.);
  vec3 sunC = vec3(1., .55, .3);
  col += sunC * pow(s, 5.) * .35 * (1. - n);
  col += sunC * pow(s, 60.) * .7 * (1. - n);
  col += vec3(1., .86, .62) * smoothstep(.99935, .9997, s) * (1. - n) * 2.5;

  vec3 md = moonDir();
  float m = max(dot(rd, md), 0.);
  col += vec3(.75, .8, 1.) * (pow(m, 300.) * .25 + smoothstep(.99975, .99985, m) * 1.4) * n;

  if (refl < .5) {
    vec2 sp = rd.xy / (rd.z + 1.) * 320.;
    vec2 id = floor(sp);
    float r = hash(id);
    float star = step(.986, r) * smoothstep(.45, 0., length(fract(sp) - .5)) * smoothstep(.03, .3, h);
    col += vec3(.9, .92, 1.) * star * n * (.55 + .45 * sin(uTime * 2. + r * 60.));
  }

  // far shore mountains (Evia across the gulf)
  float a = atan(rd.x, rd.z);
  float mh = .008 + .05 * fbm1(a * 3.2 + 2.1) + .018 * fbm1(a * 12. + 7.);
  mh *= .65 + .35 * smoothstep(-.9, .3, a);
  float my = abs(rd.y);
  if (my < mh) {
    vec3 mc = mix(vec3(.33, .27, .40), vec3(.025, .03, .065), n);
    mc = mix(mc, horizonCol(), .45 * (1. - my / mh));
    float edge = smoothstep(mh, mh - .0025, my);
    col = mix(col, mc, edge);
    // village lights along the far shore at night (direct view only)
    float lx = a * 900.;
    if (refl > .5) return col;
    float lights = step(.82, hash(vec2(floor(lx), 3.))) * smoothstep(.5, .0, abs(fract(lx) - .5)) * smoothstep(.0028, .0, my) * smoothstep(.0, .0006, my);
    col += vec3(1., .7, .38) * lights * n * 1.6 * (.8 + .2 * sin(uTime * 3. + floor(lx)));
  }
  return col;
}

vec3 render(vec2 uv){
  float n = night();
  float camH = mix(1.25, 1.9, uProg);
  vec3 ro = vec3(uMouse.x * .25, camH, uTime * .35);
  float pitch = -.035 + uMouse.y * .02 - uProg * .025;
  vec3 rd = normalize(vec3(uv.x, uv.y + pitch, 1.65));
  if (rd.y > 0.) return sky(rd, 0.);

  float d = -ro.y / rd.y;
  vec3 p = ro + rd * d;

  // analytic wave gradient: h = a sin(k (D.xz) + w t)
  vec2 g = vec2(0.);
  float t = uTime;
  vec2 D[6]; float K[6]; float A[6]; float W[6];
  D[0] = normalize(vec2(1., .3));  K[0] = .55; A[0] = .12;  W[0] = 1.;
  D[1] = normalize(vec2(-.7, 1.)); K[1] = 1.1; A[1] = .06;  W[1] = 1.5;
  D[2] = normalize(vec2(.3, 1.));  K[2] = 2.3; A[2] = .025; W[2] = 2.2;
  D[3] = normalize(vec2(1., -.6)); K[3] = 4.1; A[3] = .012; W[3] = 3.;
  D[4] = normalize(vec2(-.4, .9)); K[4] = 7.3; A[4] = .006; W[4] = 4.;
  D[5] = normalize(vec2(.8, .5));  K[5] = 13.; A[5] = .003; W[5] = 5.5;
  for (int i = 0; i < 6; i++) {
    float fade = exp(-d * K[i] * .015);
    float c = cos(dot(D[i], p.xz) * K[i] + W[i] * t);
    g += A[i] * K[i] * D[i] * c * fade;
  }
  vec3 nrm = normalize(vec3(-g.x, 1., -g.y));
  vec3 rf = reflect(rd, nrm);
  rf.y = abs(rf.y);
  float fres = .04 + .96 * pow(1. - max(dot(-rd, nrm), 0.), 5.);
  vec3 water = mix(vec3(.04, .13, .17), vec3(.008, .02, .04), n);
  vec3 col = mix(water, sky(rf, 1.), fres);

  // sun path + "stilvi" glitter on the water
  vec3 sd = sunDir();
  float sp = max(dot(rf, sd), 0.);
  col += vec3(1., .68, .42) * pow(sp, 380.) * 7. * (1. - n);
  vec2 sc = p.xz * vec2(14., 6.);
  vec2 sid = floor(sc) + floor(t * 6.);
  float sparkle = step(.985, hash(sid)) * smoothstep(.16, .0, length(fract(sc) - .5)) * smoothstep(2., 8., d);
  col += vec3(1., .82, .55) * sparkle * pow(sp, 30.) * 2.5 * (1. - n * .6);

  vec3 md = moonDir();
  float mp = max(dot(rf, md), 0.);
  col += vec3(.75, .82, 1.) * (pow(mp, 260.) * 3. + sparkle * pow(mp, 40.) * 1.6) * n;

  // warm lantern light spilling onto the water close to the deck
  col += vec3(1., .58, .25) * smoothstep(-.12, -.5, rd.y) * .07 * n;

  col = mix(col, sky(vec3(rd.x, .0005, rd.z), 1.), 1. - exp(-d * .011));
  return col;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec3 col = render(uv);
  col = col / (1. + col * .35) * 1.15;
  col = pow(col, vec3(.95));
  vec2 q = gl_FragCoord.xy / uRes;
  col *= .55 + .45 * pow(16. * q.x * q.y * (1. - q.x) * (1. - q.y), .22);
  col += (hash(gl_FragCoord.xy + fract(uTime) * 100.) - .5) * .025;
  gl_FragColor = vec4(col, 1.);
}
`

const vert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`

export function createSea(canvas) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const uniforms = {
    uRes: { value: new Vector2() },
    uTime: { value: 0 },
    uProg: { value: 0 },
    uMouse: { value: new Vector2() },
  }
  scene.add(new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms })))

  const mouse = new Vector2()
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    const dpr = Math.min(window.devicePixelRatio, w < 800 ? 1.25 : 1.5)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    uniforms.uRes.value.set(w * dpr, h * dpr)
  }
  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
  })

  let visible = true
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }).observe(canvas)

  const start = performance.now()
  const tick = () => {
    if (!visible) return
    uniforms.uTime.value = (performance.now() - start) / 1000
    uniforms.uMouse.value.lerp(mouse, 0.04)
    renderer.render(scene, camera)
  }

  return {
    tick,
    setProgress: (p) => { uniforms.uProg.value = p },
  }
}
