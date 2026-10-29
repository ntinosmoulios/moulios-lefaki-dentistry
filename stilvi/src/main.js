import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/eb-garamond/500.css'
import '@fontsource/eb-garamond/500-italic.css'
import '@fontsource/manrope/300.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import { createHeroScene } from './hero-scene.js'
import { menu, wines, findItem, dishCount, wineCount } from './menu-data.js'

gsap.registerPlugin(ScrollTrigger, SplitText)

const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => [...el.querySelectorAll(s)]
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

/* ── Content ─────────────────────────────────────────── */

const pageItems = (names) => names.map((n) => {
  const it = findItem(n)
  return `<li class="pg__item"><span class="pg__name">${esc(it.name)}${it.frozen ? '*' : ''}</span><span class="pg__price">${it.price}</span>${it.desc ? `<span class="pg__desc">${esc(it.desc)}</span>` : ''}</li>`
}).join('')

const pageFoot = (n) => `<div class="pg__foot"><span>στίλβη</span><span>${n}</span></div>`

const pages = {
  welcome: `
    <p class="pg__kicker">Καλώς ήρθατε</p>
    <h3 class="pg__title">Στο τραπέζι,<br/><em>δίπλα στο κύμα</em></h3>
    <p class="pg__welcome">Μαγειρεύουμε με ό,τι φέρνει η θάλασσα και η εποχή, ψήνουμε στα κάρβουνα και διαλέγουμε κρασιά από τη Φθιώτιδα και όλη την Ελλάδα.</p>
    <figure class="pg__photo"><img src="/img/menu-sunset.webp" alt="" loading="lazy" /></figure>
    ${pageFoot('01')}`,
  orektika: `
    <p class="pg__kicker">Για αρχή</p>
    <h3 class="pg__title">Ορεκτικά &amp; <em>Σαλάτες</em></h3>
    <ul class="pg__list">${pageItems(['Ντάκος κρητικός', 'Φέτα Π.Ο.Π. σε φύλλο', 'Ταλαγάνι ψητό', 'Μανιτάρια πλευρώτους στη σχάρα', 'Σαλάτα «Στίλβη»', 'Χωριάτικη σαλάτα'])}</ul>
    ${pageFoot('02')}`,
  thalassa: `
    <p class="pg__kicker">Από τον Ευβοϊκό</p>
    <h3 class="pg__title">Από τη <em>Θάλασσα</em></h3>
    <ul class="pg__list">${pageItems(['Καλαμάρι τηγανητό', 'Χταπόδι σχάρας', 'Γαρίδες σαγανάκι', 'Μυδοπίλαφο', 'Σαρδέλα ψητή', 'Πρώτα ψάρια'])}</ul>
    ${pageFoot('03')}`,
  sxara: `
    <p class="pg__kicker">Στα κάρβουνα</p>
    <h3 class="pg__title">Από τη <em>Σχάρα</em></h3>
    <ul class="pg__list">${pageItems(['Σταβλίσια μπριζόλα μόσχου', 'Ταλιάτα Striploin', 'Ψαρονέφρι', 'Χοιρινή μπριζόλα', 'Μπιφτέκι'])}</ul>
    ${pageFoot('04')}`,
  kyriws: `
    <p class="pg__kicker">Της κουζίνας</p>
    <h3 class="pg__title">Κυρίως <em>Πιάτα</em></h3>
    <ul class="pg__list">${pageItems(['Ψαρονέφρι μαυροδάφνης', 'Φιλετίνια χοιρινά', 'Μπιφτέκι γεμιστό', 'Φιλέτο κοτόπουλο', 'Φρέσκο ραβιόλι γεμιστό'])}</ul>
    ${pageFoot('05')}`,
  base: `
    <p class="pg__kicker">Για το τέλος</p>
    <h3 class="pg__title"><em>Γλυκά</em></h3>
    <ul class="pg__list">${pageItems(['Σοκολατόπιτα με παγωτό', 'Πορτοκαλόπιτα με παγωτό', 'Τραγανά φύλλα'])}</ul>
    <div class="pg__seal"><div><span>στίλβη</span><small>Τα λέμε στο τραπέζι</small></div></div>
    ${pageFoot('06')}`,
}
$$('[data-page]').forEach((el) => { el.innerHTML = pages[el.dataset.page] })

const signatures = [
  { img: 'calamari', tag: 'Από τη θάλασσα', item: 'Καλαμάρι τηγανητό', desc: 'Τραγανό, χρυσαφένιο, με μισό λεμόνι. Το πιάτο που παραγγέλνει όλη η παραλία.' },
  { img: 'steak', tag: 'Από τη σχάρα', item: 'Σταβλίσια μπριζόλα μόσχου', desc: 'Ψημένη στα κάρβουνα, με φρέσκες τηγανητές πατάτες και ρόκα.' },
  { img: 'greek-salad-rose', tag: 'Σαλάτες', item: 'Χωριάτικη σαλάτα', desc: 'Με κρητικό κρίθινο παξιμάδι, φέτα Π.Ο.Π. και ρίγανη. Καλύτερη με ένα δροσερό ροζέ.' },
  { img: 'salad-ham', tag: 'Σαλάτες', item: 'Δροσερή σαλάτα', desc: 'Τραγανό μπέικον στη σχάρα πάνω σε δροσερά φύλλα με dressing γιαουρτιού.' },
  { img: 'salad-stilvi', tag: 'Σαλάτες', name: 'Σαλάτες εποχής', price: 'από 9,50', desc: 'Επτά δημιουργικές σαλάτες, από την Αγροτική με ξινότυρο Μυκόνου ως τη Mesclun με τραγανό κοτόπουλο.' },
]
$('.sig__track').innerHTML = signatures.map((s) => {
  const it = s.item ? findItem(s.item) : { name: s.name, price: s.price }
  return `<article class="dish">
    <div class="dish__img">
      <span class="dish__tag mono">${s.tag}</span>
      <img src="/img/${s.img}.webp" alt="${esc(it.name)}" loading="lazy" />
      <div class="dish__meta"><h3 class="dish__name">${esc(it.name)}${it.frozen ? '*' : ''}</h3><span class="dish__price">${it.price} €</span></div>
    </div>
    <p class="dish__desc">${esc(s.desc)}</p>
  </article>`
}).join('')

// full menu tabs
const tabs = [...menu.map((c) => ({ id: c.id, title: c.title })), { id: 'krasia', title: 'Κρασιά' }]
$('.tabs').innerHTML = tabs.map((t, i) => `<button class="tab" role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${t.title}</button>`).join('')
const menuRow = (it) => `<div class="mi"><span class="mi__name">${esc(it.name)}${it.frozen ? '<sup>*</sup>' : ''}</span><span class="mi__price">${it.price} €</span>${it.desc ? `<span class="mi__desc">${esc(it.desc)}</span>` : ''}</div>`
$('.tabpanels').innerHTML =
  menu.map((c, i) => `<div class="tabpanel" role="tabpanel" id="panel-${c.id}" aria-labelledby="tab-${c.id}" ${i ? 'hidden' : ''}>${c.items.map(menuRow).join('')}</div>`).join('') +
  `<div class="tabpanel" role="tabpanel" id="panel-krasia" aria-labelledby="tab-krasia" hidden>${wines.map((g) => `<p class="wine-group">${g.title}</p>${g.items.map((w) => menuRow({ name: w.name, price: w.price, desc: `${w.origin} · ${w.grape}` })).join('')}`).join('')}</div>`

const tabEls = $$('.tab')
const selectTab = (tab, focus) => {
  tabEls.forEach((t) => {
    const on = t === tab
    t.setAttribute('aria-selected', on)
    t.tabIndex = on ? 0 : -1
    const panel = document.getElementById(t.getAttribute('aria-controls'))
    panel.hidden = !on
    if (on && !reduceMotion) gsap.from(panel.children, { y: 18, opacity: 0, duration: 0.6, stagger: 0.03, ease: 'power3.out' })
  })
  if (focus) tab.focus()
  ScrollTrigger.refresh()
}
tabEls.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t))
  t.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (d) selectTab(tabEls[(i + d + tabEls.length) % tabEls.length], true)
  })
})

$$('.stat__num[data-count="56"]').forEach((el) => { el.dataset.count = dishCount })
$$('.stat__num[data-count="10"]').forEach((el) => { el.dataset.count = wineCount })
$('.year').textContent = new Date().getFullYear()

/* ── Smooth scroll ───────────────────────────────────── */

const lenis = reduceMotion ? null : new Lenis({ anchors: { offset: 0 }, lerp: 0.085, wheelMultiplier: 0.95 })
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  lenis.stop()
}

const hero = createHeroScene($('.hero__sea'), $('.hero__img'))
gsap.ticker.add(hero.tick)

/* ── Loader ──────────────────────────────────────────── */

document.body.classList.add('is-loading')
const loadState = { p: 0 }
const minDelay = new Promise((r) => setTimeout(r, 1300))
gsap.to(loadState, {
  p: 90, duration: 1.2, ease: 'power2.out',
  onUpdate: () => {
    $('.loader__count').textContent = String(Math.round(loadState.p)).padStart(3, '0')
    $('.loader__bar span').style.width = `${loadState.p}%`
  },
})
Promise.all([document.fonts.ready, minDelay]).then(() => {
  gsap.timeline({ onComplete: () => { $('.loader').remove(); document.body.classList.remove('is-loading'); lenis?.start(); ScrollTrigger.refresh() } })
    .to(loadState, { p: 100, duration: 0.3, onUpdate: () => { $('.loader__count').textContent = String(Math.round(loadState.p)).padStart(3, '0'); $('.loader__bar span').style.width = `${loadState.p}%` } })
    .to('.loader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' })
    .from('.hero__word', { y: 80, opacity: 0, filter: 'blur(14px)', duration: 1.6, ease: 'expo.out' }, '-=0.5')
    .from(['.hero__eyebrow', '.hero__lead', '.hero__ctas', '.hero__meta', '.hud', '.hero__cue'], { y: 20, opacity: 0, duration: 1, stagger: 0.08, ease: 'power3.out' }, '-=1.2')
    .from('.nav', { y: -30, opacity: 0, duration: 1, ease: 'power3.out' }, '<')
  initSplits()
})

/* ── Text + image reveals ───────────────────────────── */

function initSplits() {
  if (reduceMotion) return
  $$('.split').forEach((el) => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 110, duration: 1.2, stagger: 0.09, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      }),
    })
  })
}

if (!reduceMotion) {
  $$('.fade-up').forEach((el) => gsap.from(el, {
    y: 40, opacity: 0, duration: 1.1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%', once: true },
  }))
  $$('.reveal-img').forEach((fig) => {
    const img = $('img', fig)
    gsap.fromTo(fig, { clipPath: 'inset(18% 12% 18% 12% round 4px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 4px)', ease: 'none',
      scrollTrigger: { trigger: fig, start: 'top 95%', end: 'top 35%', scrub: true },
    })
    gsap.fromTo(img, { scale: 1.3, yPercent: -6 }, {
      scale: 1.05, yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true },
    })
  })
}

$$('.stat__num').forEach((el) => {
  const target = Number(el.dataset.count)
  const o = { v: 0 }
  ScrollTrigger.create({
    trigger: el, start: 'top 88%', once: true,
    onEnter: () => gsap.to(o, { v: target, duration: reduceMotion ? 0 : 2, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v) } }),
  })
})

/* ── Hero: dolly into the night scene ─────────────────── */

if (!reduceMotion) {
  const heroState = { z: 0 }
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=110%', pin: true, scrub: 1 } })
    .to(heroState, { z: 1, ease: 'none', duration: 1, onUpdate: () => hero.setZoom(heroState.z) }, 0)
    .to('.hero__img', { scale: 1.2, ease: 'none', duration: 1 }, 0)
    .to('.hero__title', { scale: 0.62, yPercent: -26, ease: 'power1.inOut', duration: 0.7 }, 0)
    .to(['.hero__eyebrow', '.hero__cue'], { opacity: 0, duration: 0.25 }, 0)
    .to('.hero__lead', { yPercent: -160, duration: 0.7, ease: 'power1.inOut' }, 0)
    .to('.hero__night', { opacity: 1, yPercent: -25, duration: 0.4 }, 0.35)
    .to('.hero__ctas', { yPercent: -20, duration: 0.7, ease: 'power1.inOut' }, 0)
}

/* ── 3D menu book ────────────────────────────────────── */

const leaves = $$('.leaf')
const leafState = leaves.map(() => ({ a: 0 }))
const applyLeaves = () => {
  const n = leaves.length
  leaves.forEach((leaf, i) => {
    const a = leafState[i].a
    const flipped = a < -90
    const z = flipped ? (i + 1) * 1.2 : (n - i) * 1.2
    const lift = Math.sin((-a / 180) * Math.PI) * 30
    leaf.style.transform = `translateZ(${z + lift}px) rotateY(${a}deg)`
  })
}
applyLeaves()
const chapters = $$('.menu3d__chapters span')
const setChapter = (p) => {
  const idx = p < 0.36 ? 0 : p < 0.56 ? 1 : p < 0.81 ? 2 : 3
  chapters.forEach((c, i) => c.classList.toggle('is-on', i === idx))
}

if (reduceMotion) {
  leafState[0].a = -180
  applyLeaves()
  setChapter(0.4)
} else {
  gsap.set('.book-rig', { rotateX: 58, rotateZ: -14, yPercent: 8, scale: 0.6, xPercent: -25 })
  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: '.menu3d__pin', start: 'top top', end: '+=420%', pin: true, scrub: 1,
      onUpdate: (st) => setChapter(st.progress),
    },
    onUpdate: applyLeaves,
  })
  tl.to('.book-rig', { rotateX: 6, rotateZ: 0, yPercent: 0, scale: 0.92, duration: 1 })
    .to('.plinth', { opacity: 0, y: 80, duration: 0.8 }, 0.2)
    .to('.menu3d__glow', { scale: 1.6, opacity: 0.5, duration: 1 }, 0)
    .to('.book-rig', { rotateX: 0, scale: 1, xPercent: 0, duration: 1 }, 1.1)
    .to(leafState[0], { a: -180, duration: 1 }, 1.1)
    .to(leafState[1], { a: -180, duration: 1 }, 2.4)
    .to(leafState[2], { a: -180, duration: 1 }, 3.7)
    .to('.book-rig', { scale: 0.96, duration: 0.5 }, 4.7)
}

/* ── Signature coverflow ─────────────────────────────── */

const track = $('.sig__track')
const dishes = $$('.dish')
const coverflow = () => {
  const cx = window.innerWidth / 2
  dishes.forEach((d) => {
    const r = d.getBoundingClientRect()
    const off = (r.left + r.width / 2 - cx) / window.innerWidth
    const c = gsap.utils.clamp(-1, 1, off * 1.6)
    d.style.transform = `translateZ(${-Math.abs(c) * 260}px) rotateY(${-c * 38}deg)`
    d.style.opacity = 1 - Math.abs(c) * 0.45
  })
}
if (reduceMotion) {
  $('.sig__viewport').style.overflowX = 'auto'
} else {
  gsap.to(track, {
    x: () => -(track.scrollWidth - window.innerWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: '.sig__pin', start: 'top top', end: () => `+=${track.scrollWidth - window.innerWidth}`,
      pin: true, scrub: 1, invalidateOnRefresh: true,
    },
    onUpdate: coverflow,
  })
  coverflow()
  window.addEventListener('resize', coverflow)
}

/* ── Nav, scrubber, section labels ──────────────────── */

const nav = $('.nav')
ScrollTrigger.create({ start: 40, end: 'max', onToggle: (st) => nav.classList.toggle('is-scrolled', st.isActive) })

const dot = $('.scrubber__dot')
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (st) => { dot.style.left = `${st.progress * 100}%` } })

const idxEl = $('.scrubber__idx')
const nameEl = $('.scrubber__name')
const navLinks = $$('.nav__links a')
$$('[data-label]').forEach((sec, i) => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 55%', end: 'bottom 55%',
    onToggle: (st) => {
      if (!st.isActive) return
      idxEl.textContent = String(i + 1).padStart(2, '0')
      nameEl.textContent = sec.dataset.label
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${sec.id}`))
    },
  })
})
ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom 55%', onEnterBack: () => { idxEl.textContent = '00'; nameEl.textContent = 'Αρχή' } })

/* ── Copy phone number ───────────────────────────────── */

const copyBtn = $('#copy-phone')
copyBtn?.addEventListener('click', async () => {
  const label = copyBtn.textContent
  try {
    await navigator.clipboard.writeText(copyBtn.dataset.phone)
    copyBtn.textContent = 'Αντιγράφηκε'
  } catch {
    const range = document.createRange()
    range.selectNodeContents($('.call__num'))
    getSelection().removeAllRanges()
    getSelection().addRange(range)
    copyBtn.textContent = 'Επιλέχθηκε'
  }
  setTimeout(() => { copyBtn.textContent = label }, 1800)
})

window.addEventListener('load', () => ScrollTrigger.refresh())
