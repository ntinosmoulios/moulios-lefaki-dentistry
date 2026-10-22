// Scroll-film: the opening "walk into the clinic" sequence.
// Each scene is a real photo of the clinic. Scrolling pushes the camera into the photo
// and "through" a focus point (the door glass, a doorway, a screen) into the next one,
// with a zoom blur in the fast part. Big type is driven by the same progress.
// Swap `scenes[i].src` for frames of a real walk-through video later; nothing else changes.

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = v => Math.min(1, Math.max(0, v));

export function startFilm({ section, canvas, overlays, scenes }) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d', { alpha: false });
  const mk = src => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; };
  // a scene is either one photo (src) or a frame sequence cut from a real video (frames),
  // which is scrubbed by the scroll. Only the first frame loads up front; the rest load
  // when the viewer gets close to that scene.
  const frameSrc = (s, k) => `${s.frames.base}${String(k + 1).padStart(2, '0')}.webp`;
  const seqs = scenes.map(s => (s.frames ? Array.from({ length: s.frames.count }, () => null) : null));
  const imgs = scenes.map((s, i) => { if (!s.frames) return mk(s.src); const f = mk(frameSrc(s, 0)); seqs[i][0] = f; return f; });
  function warm(i) {
    const q = seqs[i];
    if (!q || q.warm) return;
    q.warm = true;
    for (let k = 1; k < q.length; k++) { const f = mk(frameSrc(scenes[i], k)); f.onload = () => { last = -1; }; q[k] = f; }
  }
  // the frame for scene i at scene-time u (0..1), falling back to the nearest loaded one
  function pick(i, u) {
    const q = seqs[i];
    if (!q) return imgs[i];
    let k = Math.round(clamp01(u) * (q.length - 1));
    for (; k > 0; k--) if (q[k] && q[k].complete && q[k].naturalWidth) return q[k];
    return q[0];
  }
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    last = -1;
  };

  // Draw an image "cover"-fitted, scaled by z around its focus point (fx, fy)
  function draw(img, z, fx, fy, alpha = 1) {
    if (!img.complete || !img.naturalWidth || alpha <= 0.002) return;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const base = Math.max(W / iw, H / ih);
    const s = base * z;
    const dw = iw * s, dh = ih * s;
    // keep the focus point heading towards the screen centre as we zoom in
    // on portrait screens a landscape image is cropped hard, so aim at the subject from the start
    const k = W < H ? 1 : clamp01((z - 1) / 2.5);
    let x = W / 2 - fx * dw + (fx - 0.5) * iw * base * (1 - k);
    let y = H / 2 - fy * dh + (fy - 0.5) * ih * base * (1 - k);
    // never show the edges of the photo
    x = Math.min(0, Math.max(W - dw, x));
    y = Math.min(0, Math.max(H - dh, y));
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x * dpr, y * dpr, dw * dpr, dh * dpr);
  }

  // Film grain: a small noise tile, drawn at a random offset each frame. It hides
  // compression and upscaling artefacts and makes the photos read as footage.
  const grain = document.createElement('canvas');
  grain.width = grain.height = 192;
  {
    const g = grain.getContext('2d'), d = g.createImageData(192, 192);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
  }
  let grainPattern = null;
  const THROUGH_FOR = sc => (sc.reverse ? 0.8 : 0.68);
  const N = scenes.length;
  let target = 0, smooth = 0, last = -1;

  function render(p) {
    const seg = p * N;
    const i = Math.min(N - 1, Math.floor(seg));
    const t = seg - i;
    const sc = scenes[i], next = scenes[i + 1];
    for (let j = Math.max(0, i - 1); j <= Math.min(N - 1, i + 2); j++) warm(j);
    const cur = pick(i, t / THROUGH_FOR(sc));
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0F1C1F';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const THROUGH = 0.68; // when the camera starts diving through to the next photo
    const [z0, z1] = sc.zoom || [1.04, 1.35];
    if (sc.reverse) {
      // pull back: start close on the focus and reveal the whole frame
      const z = 2.3 - 1.28 * ease(clamp01(t / 0.8));
      draw(cur, Math.max(1.02, z), sc.fx, sc.fy);
    } else if (t < THROUGH || !next) {
      const z = z0 + (z1 - z0) * ease(clamp01(t / THROUGH));
      draw(cur, z, sc.fx, sc.fy);
    } else {
      const u = (t - THROUGH) / (1 - THROUGH);          // 0..1 through phase
      const e = u * u * (3 - 2 * u);
      // the next room grows out of the hole we're diving into
      const [n0] = next.zoom || [1.04];
      draw(pick(i + 1, 0), 0.75 + (n0 - 0.75) * e, next.fx, next.fy, clamp01(e * 1.6));
      const z = z1 * (1 + e * 3.2);
      const a = 1 - clamp01((u - 0.25) / 0.75);
      draw(cur, z, sc.fx, sc.fy, a);
      // zoom blur: ghosted copies while moving fast
      if (u > 0.1 && u < 0.9) { draw(cur, z * 1.06, sc.fx, sc.fy, a * 0.3); draw(cur, z * 1.13, sc.fx, sc.fy, a * 0.15); }
    }
    // cinematic grade: vignette and a dark fade at the very end of the film
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.3, canvas.width / 2, canvas.height / 2, canvas.height * 0.95);
    g.addColorStop(0, 'rgba(8,16,18,0)');
    g.addColorStop(1, 'rgba(8,16,18,.7)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(8,16,18,.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // overlays: each has a scene index and [in, out] window in that scene's local time
    for (const o of overlays) {
      const local = seg - o.scene;
      const vin = clamp01((local - o.in[0]) / Math.max(0.001, o.in[1] - o.in[0]));
      const vout = clamp01((local - o.out[0]) / Math.max(0.001, o.out[1] - o.out[0]));
      const v = o.scene === 0 && o.in[0] <= 0 ? 1 - vout : vin * (1 - vout);
      if (v <= 0.001) { if (o.el.style.visibility !== 'hidden') o.el.style.visibility = 'hidden'; continue; }
      o.el.style.visibility = 'visible';
      const ein = ease(vin), eo = ease(vout);
      const dx = (o.from?.x ?? 0) * (1 - ein) + (o.to?.x ?? 0) * eo;
      const dy = (o.from?.y ?? 40) * (1 - ein) + (o.to?.y ?? -40) * eo;
      const sc2 = 1 + (o.to?.scale ?? 0.15) * eo;
      o.el.style.opacity = (o.scene === 0 && o.in[0] <= 0 ? 1 - eo : Math.min(ein, 1 - eo)).toFixed(3);
      o.el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${sc2.toFixed(3)})`;
    }
    if (!grainPattern) grainPattern = ctx.createPattern(grain, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.translate((Math.random() * 192) | 0, (Math.random() * 192) | 0);
    ctx.fillStyle = grainPattern;
    ctx.fillRect(-192, -192, canvas.width + 192, canvas.height + 192);
    ctx.restore();
    // fade the whole film out at the end, revealing the 3D scene behind
    const endFade = clamp01((p - 0.965) / 0.035);
    canvas.style.opacity = (1 - endFade).toFixed(3);
  }

  function progress() {
    const r = section.getBoundingClientRect();
    return clamp01(-r.top / Math.max(1, r.height - window.innerHeight));
  }

  let raf;
  const loop = () => {
    target = progress();
    smooth += (target - smooth) * (reduce ? 1 : 0.14);
    if (Math.abs(target - smooth) < 0.0002) smooth = target;
    if (Math.abs(smooth - last) > 0.00005) { render(smooth); last = smooth; }
    raf = requestAnimationFrame(loop);
  };
  resize();
  window.addEventListener('resize', resize);
  Promise.all(imgs.map(i => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()))).then(() => { last = -1; });
  imgs.forEach(i => { i.onload = () => { last = -1; }; });
  loop();

  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
}
