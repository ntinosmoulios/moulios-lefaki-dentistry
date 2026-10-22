import { useEffect, useRef, useState } from 'react';
import { startEngine } from './scene/engine.js';

// React Bits components (MIT + Commons Clause, see src/reactbits/LICENSE.md)
import SplitText from './reactbits/SplitText.jsx';
import ScrollReveal from './reactbits/ScrollReveal.jsx';
import ScrollFloat from './reactbits/ScrollFloat.jsx';
import ShinyText from './reactbits/ShinyText.jsx';
import ScrollVelocity from './reactbits/ScrollVelocity.jsx';
import CountUp from './reactbits/CountUp.jsx';
import Magnet from './reactbits/Magnet.jsx';
import ClickSpark from './reactbits/ClickSpark.jsx';
import StarBorder from './reactbits/StarBorder.jsx';
import SpotlightCard from './reactbits/SpotlightCard.jsx';
import TiltedCard from './reactbits/TiltedCard.jsx';

const PHONE = '22350 51834';
const TEL = 'tel:+302235051834';

const SERVICES = [
  ['Εμφυτεύματα', 'Αντικατάσταση ενός, περισσότερων ή όλων των δοντιών. Άμεση τοποθέτηση μετά από εξαγωγή και γέφυρες πάνω σε τέσσερα εμφυτεύματα.'],
  ['Αισθητική οδοντιατρική', 'Πορσελάνινες όψεις, όψεις ρητίνης, bonding και λευκά σφραγίσματα που ταιριάζουν στο χρώμα των δοντιών σας.'],
  ['Λεύκανση', 'Στο ιατρείο, με το σύστημα Beyond Polus.'],
  ['Προσθετική', 'Στεφάνες, γέφυρες και οδοντοστοιχίες, με ψηφιακό αποτύπωμα.'],
  ['Θεραπείες', 'Σφραγίσματα, απονευρώσεις, εξαγωγές, θεραπεία ουλίτιδας και περιοδοντίτιδας, εφαρμογές laser.'],
  ['Ορθοδοντική', 'Διόρθωση της θέσης των δοντιών και της σύγκλεισης.'],
  ['Παιδιά', 'Καθαρισμός, φθορίωση, προληπτικές εμφράξεις και έλεγχος κάθε έξι μήνες.'],
  ['Πρόληψη', 'Έλεγχος και καθαρισμός δύο φορές τον χρόνο, και οδηγίες για βουρτσάκια, νήμα και στοματικά διαλύματα.']
];

// Photos: put the files in site/public/images/doctors/ and set the paths here
const DOCTORS = [
  { ini: 'ΜΜ', name: 'Μιχάλης Μούλιος', photo: './images/doctors/moulios.webp', focus: 'Μικροχειρουργική και εμφυτευματολογία.',
    bio: 'Εξειδίκευση στη μικροχειρουργική και την εμφυτευματολογία στο Πανεπιστήμιο της Κολωνίας. Μέλος της Ευρωπαϊκής Ένωσης Εμφυτευματολογίας (BDIZ EDI).' },
  { ini: 'ΜΛ', name: 'Μαρία Λεφάκη', photo: './images/doctors/lefaki.webp', focus: 'Αισθητική οδοντιατρική: όψεις, bonding, λευκά σφραγίσματα και λεύκανση.',
    bio: 'Μεταπτυχιακές σπουδές στην αισθητική οδοντιατρική: όψεις, λευκά σφραγίσματα, bonding και λεύκανση.' }
];

const SHADES = [['A4', '#D9C9A3'], ['A3.5', '#E2D3B0'], ['A3', '#E8DCBE'], ['A2', '#EEE4CC'], ['A1', '#F2EBD8'], ['B1', '#F6F1E4'], ['BL2', '#FAF8F0']];

// The implant story, beat by beat; the 3D scene behind does the same thing at the same time
const BEATS = [
  ['ΤΟ ΚΕΝΟ.', 'Λείπει ένα δόντι. Στο οστό, κάτω από το ούλο, ετοιμάζεται μια μικρή υποδοχή.'],
  ['Η ΒΙΔΑ.', <>Μια βίδα τιτανίου μπαίνει στο οστό, στον αποστειρωμένο χειρουργικό χώρο του ιατρείου. Για ένα δόντι, συνήθως <CountUp from={0} to={20} duration={1.2} /> έως <CountUp from={0} to={40} duration={1.6} /> λεπτά.</>],
  ['ΔΕΝΕΙ.', 'Τις επόμενες εβδομάδες το οστό «δένει» με τον τιτάνιο. Η βίδα γίνεται σταθερή ρίζα.'],
  ['ΤΟ ΚΟΛΟΒΩΜΑ.', 'Πάνω στη ρίζα στερεώνεται το κολόβωμα, η βάση για το νέο δόντι.'],
  ['Η ΣΤΕΦΑΝΗ.', 'Το καινούργιο δόντι, φτιαγμένο από ψηφιακό αποτύπωμα του στόματός σας, μπαίνει στη θέση του.'],
  ['ΕΜΦΥΤΕΥΜΑ.', 'Σταθερό, φυσικό, και μασάει όπως ένα δικό σας δόντι. Σε κάποιες περιπτώσεις τοποθετείται την ίδια μέρα με την εξαγωγή.']
];

const FAQ = [
  ['Κάθε πότε πρέπει να έρχομαι για έλεγχο;', 'Αν δεν έχετε κάποιο πρόβλημα, κάθε έξι μήνες. Αν νιώσετε ενόχληση, μην περιμένετε τον επόμενο έλεγχο και καλέστε μας.'],
  ['Το δόντι μου πρήστηκε. Αν πάρω αντιβίωση, θα περάσει;', 'Η αντιβίωση ανακουφίζει προσωρινά το πρήξιμο, αλλά δεν λύνει το πρόβλημα. Συνήθως χρειάζεται απονεύρωση, για να καθαριστεί το μολυσμένο νεύρο.'],
  ['Η λεύκανση χαλάει το σμάλτο;', 'Όχι. Τα σύγχρονα υλικά και οι τεχνικές λεύκανσης δεν βλάπτουν την επιφάνεια του δοντιού.'],
  ['Τα λευκά σφραγίσματα αντέχουν όσο τα μαύρα;', 'Κανένα σφράγισμα δεν κρατά για πάντα. Τα σύγχρονα λευκά υλικά έχουν βελτιωθεί πολύ και προτιμώνται όλο και περισσότερο, επειδή δεν φαίνονται.'],
  ['Μπορεί ένα σφραγισμένο δόντι να χαλάσει ξανά;', 'Ναι, και μάλιστα πιο εύκολα από ένα υγιές. Γι\' αυτό ελέγχουμε τα σφραγίσματα τακτικά και τα αλλάζουμε όταν φθαρούν.'],
  ['Αφού τα νεογιλά δόντια θα αλλάξουν, τι πειράζει αν χαλάσουν;', 'Τα νεογιλά οδηγούν τα μόνιμα δόντια στη σωστή θέση. Αν χαθούν νωρίς, μπορεί να χρειαστεί αργότερα ορθοδοντική θεραπεία, και να επηρεαστεί η μάσηση και η ομιλία.'],
  ['Γιατί ματώνουν τα ούλα μου όταν βουρτσίζω;', 'Συνήθως είναι σημάδι φλεγμονής (ουλίτιδας). Κλείστε ένα ραντεβού για να το δούμε έγκαιρα.'],
  ['Ποιος είναι κατάλληλος για εμφύτευμα;', 'Γενικά οι υγιείς ενήλικες με αρκετό οστό στη γνάθο. Ορισμένες καταστάσεις, όπως ο αρρύθμιστος διαβήτης, μπορεί να δυσκολέψουν την επούλωση. Αυτό το εκτιμούμε μαζί στην εξέταση.']
];

const TOOTH_PATH = 'M9 4c-3.4 0-6 2.8-6 6.6 0 3.2 1.4 5.3 2.4 7.6.9 2.2 1.1 5.4 1.8 8.3.4 1.6 1.2 2.5 2.2 2.5 1.3 0 1.8-1.4 2.2-3.4.5-2.5.9-5.6 2.4-5.6s1.9 3.1 2.4 5.6c.4 2 .9 3.4 2.2 3.4 1 0 1.8-.9 2.2-2.5.7-2.9.9-6.1 1.8-8.3 1-2.3 2.4-4.4 2.4-7.6C26 6.8 23.4 4 20 4c-2.3 0-3.3 1.2-5.5 1.2S11.3 4 9 4z';

function MagnetBtn({ href, children, className = 'btn' }) {
  return (
    <Magnet padding={60} magnetStrength={3} wrapperClassName="magnet">
      <a className={className} href={href}>{children}</a>
    </Magnet>
  );
}

const SCRAMBLE = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ0123456789/—·';
function Scramble({ text }) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setOut(text); return; }
    let f = 0, raf;
    const tick = () => {
      f++;
      const done = Math.floor(f / 2);
      setOut(text.split('').map((c, i) => (i < done || c === ' ' ? c : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0])).join(''));
      if (done < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);
  return <span>{out}</span>;
}

function Kicker({ n, text }) {
  const ref = useRef(null);
  const [shown, setShown] = useState('');
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(`${n} / ${text}`); io.disconnect(); } }, { rootMargin: '0px 0px -15% 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [n, text]);
  return <p className="kicker" ref={ref} aria-hidden="true">{shown ? <Scramble text={shown} /> : '\u00a0'}</p>;
}

const HUD_SECTIONS = [['#top', 'ΑΡΧΗ'], ['#emfytevmata', 'ΕΜΦΥΤΕΥΜΑ'], ['.surgery', 'ΧΕΙΡΟΥΡΓΕΙΟ'], ['#iatreio', 'ΤΟ ΙΑΤΡΕΙΟ'], ['#ypiresies', 'ΥΠΗΡΕΣΙΕΣ'], ['#leukansi', 'ΛΕΥΚΑΝΣΗ'], ['#exoplismos', 'ΕΞΟΠΛΙΣΜΟΣ'], ['#erotiseis', 'ΕΡΩΤΗΣΕΙΣ'], ['#epikoinonia', 'ΕΠΙΚΟΙΝΩΝΙΑ']];
function Hud() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const els = HUD_SECTIONS.map(([id]) => document.querySelector(id));
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { const i = els.indexOf(e.target); if (i >= 0) setSec(i); }
    }, { rootMargin: '-45% 0px -45% 0px' });
    els.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <div className="hud" aria-hidden="true">
      <div className="hud-target"><i /><i /><i /><i /><span>ΕΜΦΥΤΕΥΜΑ / ΤΙΤΑΝΙΟ</span></div>
      <div className="xlabel xlabel--crown"><b>ΣΤΕΦΑΝΗ</b><em>το καινούργιο δόντι</em></div>
      <div className="xlabel xlabel--abutment"><b>ΚΟΛΟΒΩΜΑ</b><em>η βάση της στεφάνης</em></div>
      <div className="xlabel xlabel--screw"><b>ΒΙΔΑ ΤΙΤΑΝΙΟΥ</b><em>η νέα ρίζα</em></div>
      <p className="hud__bl">38.8041° Β · 22.6525° Α<br />ΜΩΛΟΣ ΦΘΙΩΤΙΔΑΣ</p>
      <p className="hud__br"><Scramble text={`${String(sec + 1).padStart(2, '0')} — ${HUD_SECTIONS[sec][1]}`} /></p>
    </div>
  );
}


// Real footage: an orbit around the surgical chair, scrubbed by the scroll inside a portrait "viewfinder"
const SURGERY_FRAMES = 36;
function Surgery() {
  const section = useRef(null), canvas = useRef(null), left = useRef(null), right = useRef(null), tc = useRef(null), panel = useRef(null);
  useEffect(() => {
    const imgs = Array.from({ length: SURGERY_FRAMES }, (_, i) => { const im = new Image(); im.decoding = 'async'; im.src = `./images/surgery/${String(i + 1).padStart(2, '0')}.webp`; return im; });
    const ctx = canvas.current.getContext('2d');
    let raf, last = -1, lastW = 0;
    const draw = k => {
      const c = canvas.current, r = c.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      let im = imgs[k]; for (let j = k; j >= 0 && !(im && im.complete && im.naturalWidth); j--) im = imgs[j];
      if (!im || !im.naturalWidth) return;
      const s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
      ctx.drawImage(im, (w - im.naturalWidth * s) / 2, (h - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
    };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = section.current; if (!el) return;
      const r = el.getBoundingClientRect(), vh = innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
      const k = Math.round(p * (SURGERY_FRAMES - 1));
      if (k !== last || innerWidth !== lastW) { draw(k); last = k; lastW = innerWidth; }
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      left.current.style.transform = `translate3d(${(-30 + e * 34).toFixed(2)}vw, 0, 0)`;
      right.current.style.transform = `translate3d(${(30 - e * 34).toFixed(2)}vw, 0, 0)`;
      panel.current.style.transform = `scale(${(0.86 + 0.14 * Math.sin(Math.PI * Math.min(1, p * 1.2))).toFixed(4)}) rotate(${((0.5 - p) * 3).toFixed(2)}deg)`;
      const secs = p * 5.97;
      tc.current.textContent = `00:00:${String(Math.floor(secs)).padStart(2, '0')}:${String(Math.floor((secs % 1) * 30)).padStart(2, '0')}`;
    };
    imgs[0].onload = () => { last = -1; };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <section className="surgery" ref={section} aria-labelledby="surgery-title">
      <div className="surgery__sticky">
        <h2 id="surgery-title" className="surgery__title">
          <span ref={left} className="surgery__word surgery__word--l">ΧΕΙΡΟΥΡΓΙΚΟΣ</span>
          <span ref={right} className="surgery__word surgery__word--r">ΧΩΡΟΣ.</span>
        </h2>
        <figure className="surgery__panel" ref={panel}>
          <canvas ref={canvas} aria-label="Βίντεο: ο χειρουργικός χώρος του ιατρείου, με τη μαύρη χειρουργική έδρα" role="img" />
          <i /><i /><i /><i />
          <figcaption className="surgery__hud">
            <span className="surgery__rec">● REC</span>
            <span ref={tc}>00:00:00:00</span>
          </figcaption>
          <span className="surgery__hud surgery__hud--b">ΠΡΑΓΜΑΤΙΚΟ ΒΙΝΤΕΟ · ΜΩΛΟΣ</span>
        </figure>
        <p className="surgery__text">Ξεχωριστή αίθουσα για εμφυτεύματα, με αποστειρωμένο εξοπλισμό. Προσωπικό και ασθενείς φορούν ειδικό αποστειρωμένο ρουχισμό.</p>
      </div>
    </section>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [shade, setShade] = useState(6);
  const [introDone, setIntroDone] = useState(false);
  const [mapOn, setMapOn] = useState(false);
  const engine = useRef(null);

  useEffect(() => {
    let alive = true;
    const go = () => {
      if (!alive || engine.current) return;
      engine.current = startEngine({ onStep: setStep, onShade: setShade, onIntroDone: () => setIntroDone(true) });
    };
    (document.fonts?.ready ?? Promise.resolve()).then(go);
    return () => { alive = false; engine.current?.destroy(); engine.current = null; };
  }, []);

  return (
    <ClickSpark sparkColor="#1E6E86" sparkSize={12} sparkRadius={26} sparkCount={10} duration={520} style={{ height: 'auto' }}>
      <div className="loader" aria-hidden="true">
        <div className="loader__half loader__half--top" />
        <div className="loader__half loader__half--bot" />
        <div className="loader__center">
          <svg className="loader__tooth" viewBox="0 0 32 32"><path pathLength="1" d={TOOTH_PATH} /></svg>
          <p className="loader__name">Μούλιος <em>&amp;</em> Λεφάκη</p>
          <p className="loader__count"><span>0</span>%</p>
        </div>
      </div>

      <a className="skip" href="#main">Μετάβαση στο περιεχόμενο</a>

      <header className="topbar">
        <a className="brand" href="#top" aria-label="Μούλιος – Λεφάκη, αρχική">
          <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true"><path d={TOOTH_PATH} /></svg>
          <span>Μούλιος <span className="brand__amp">&amp;</span> Λεφάκη</span>
        </a>
        <nav className="nav" aria-label="Κύρια πλοήγηση">
          <a href="#emfytevmata">Εμφυτεύματα</a>
          <a href="#iatreio">Το ιατρείο</a>
          <a href="./tour.html">3D περιήγηση</a>
          <a href="#ypiresies">Υπηρεσίες</a>
          <a href="#leukansi">Λεύκανση</a>
          <a href="#erotiseis">Ερωτήσεις</a>
          <a href="#epikoinonia">Επικοινωνία</a>
        </nav>
        <MagnetBtn href={TEL} className="btn btn--small">{PHONE}</MagnetBtn>
      </header>

      <canvas id="scene" aria-hidden="true" />
      <Hud />
      <div className="progress" aria-hidden="true"><span /></div>

      <main id="main">
        {/* HERO: big type over the 3D implant */}
        <section className="hero2" id="top" aria-labelledby="hero-title">
          <h1 id="hero-title" className="hero2__title" aria-label="Μούλιος & Λεφάκη, Χειρουργοί Οδοντίατροι">
            <span>ΜΟΥΛΙΟΣ</span><span>&amp; ΛΕΦΑΚΗ</span>
          </h1>
          <div className="hero2__foot">
            <p className="hero2__lead">Χειρουργοί οδοντίατροι στον Μώλο Φθιώτιδας. Εμφυτεύματα, αισθητική οδοντιατρική και λεύκανση.</p>
            <div className="hero2__actions">
              <MagnetBtn href={TEL}>Κλείστε ραντεβού</MagnetBtn>
              <a className="link" href="./tour.html">3D περιήγηση στο ιατρείο</a>
            </div>
          </div>
          <div className="hero__scroll" aria-hidden="true"><span /></div>
        </section>

        {/* IMPLANT STORY */}
        <section className="implant" id="emfytevmata" aria-labelledby="implant-title">
          <div className="implant__sticky">
            <h2 id="implant-title" className="implant__kicker">Πώς γίνεται ένα εμφύτευμα</h2>
            <ol className="beats">
              {BEATS.map(([word, text], i) => (
                <li key={word} className={`beat${i === step ? ' is-active' : ''}${i < step ? ' is-past' : ''}`} aria-current={i === step ? 'step' : undefined}>
                  <span className="beat__n">{String(i + 1).padStart(2, '0')} / 06</span>
                  <p className="beat__word" style={{ '--len': word.length }}>{word}</p>
                  <p className="beat__text">{text}</p>
                </li>
              ))}
            </ol>
            <div className="beats__bar" aria-hidden="true">{BEATS.map((b, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
          </div>
        </section>

        {/* ABOUT */}
        <Surgery />

        <section className="about" id="iatreio" aria-labelledby="about-title">
          <div className="wrap about__inner">
            <Kicker n="03" text="ΤΟ ΙΑΤΡΕΙΟ" />
            <h2 id="about-title" className="h2">
              <SplitText text="Δύο οδοντίατροι, ένα ιατρείο, και χρόνος για να σας εξηγήσουμε τι κάνουμε." tag="span" splitType="words" delay={40} effect="rise" mask textAlign="left" />
            </h2>
            <div className="doctors">
              {DOCTORS.map(({ ini, name, bio, focus, photo }) => (
                <SpotlightCard key={name} className="doctor" theme="dark" spotlightColor="rgba(191,244,255,0.35)" intensity={0.2} spotlightSize={320}>
                  <TiltedCard
                    className="doctor__tilt"
                    imageSrc={photo || undefined}
                    altText={`${name}, χειρουργός οδοντίατρος`}
                    containerWidth="100%" containerHeight="320px" imageWidth="100%" imageHeight="320px"
                    rotateAmplitude={14} scaleOnHover={1.04} radius={18} glare={0.35} shadow={0.6}
                    showTooltip={false} gyroscope
                    backContent={
                      <div className="doctor__back">
                        <p>{focus}</p>
                        <a className="btn btn--small" href={TEL} onClick={e => e.stopPropagation()}>Ραντεβού: {PHONE}</a>
                      </div>
                    }
                  >
                    {!photo && <div className="doctor__photo" role="img" aria-label={`Φωτογραφία: ${name} (σύντομα)`}><span>{ini}</span></div>}
                  </TiltedCard>
                  <div>
                    <h3>{name}</h3>
                    <p className="doctor__role">Χειρουργός οδοντίατρος</p>
                    <p className="doctor__hint">Πατήστε τη φωτογραφία για να γυρίσει</p>
                    <p>{bio}</p>
                  </div>
                </SpotlightCard>
              ))}
            </div>
            <div className="about__body">
              <ScrollReveal baseOpacity={0.14} enableBlur={false} baseRotation={0} textClassName="about__reveal">
                Στόχος μας είναι μια θεραπεία ανώδυνη και ποιοτική, προσαρμοσμένη σε κάθε άνθρωπο. Δεχόμαστε με ραντεβού, και για επείγοντα περιστατικά συνεννοούμαστε τηλεφωνικά για να σας δούμε το συντομότερο.
              </ScrollReveal>
            </div>
          </div>
          <div className="marquee" aria-hidden="true">
            <ScrollVelocity
              texts={['Εμφυτεύματα ✦ Όψεις ✦ Λεύκανση ✦ Bonding ✦ ', 'Παιδιά ✦ Πρόληψη ✦ Ορθοδοντική ✦ Laser ✦ ']}
              velocity={60}
              className="marquee__text"
              skewWithVelocity={6}
              outlineAlternate
            />
          </div>
        </section>

        {/* STATEMENT */}
        <section className="statement" aria-label="Η φιλοσοφία μας">
          <div className="wrap">
            <Kicker n="—" text="Η ΦΙΛΟΣΟΦΙΑ ΜΑΣ" />
            <p className="statement__text">
              <ScrollFloat textClassName="statement__float" animationDuration={1} stagger={0.02}>Ίδια φροντίδα στις 9:00 και στις 17:00.</ScrollFloat>
            </p>
            <p className="statement__sub">Το πρώτο και το τελευταίο ραντεβού της ημέρας παίρνουν τον ίδιο χρόνο και την ίδια προσοχή.</p>
          </div>
        </section>

        {/* 3D TOUR teaser */}
        <section className="tourcta" aria-labelledby="tour-title">
          <div className="wrap tourcta__inner">
            <Kicker n="04" text="3D ΠΕΡΙΗΓΗΣΗ" />
            <h2 id="tour-title" className="h2 h2--xl">
              <ScrollFloat textClassName="float-title" animationDuration={1} stagger={0.03}>Μπείτε στο ιατρείο</ScrollFloat>
            </h2>
            <p className="tourcta__text">Μια 3D περιήγηση από την υποδοχή μέχρι το χειρουργείο εμφυτευμάτων. Η βοηθός μας στην υποδοχή απαντά σε ό,τι θέλετε να ρωτήσετε.</p>
            <Magnet padding={80} magnetStrength={3} wrapperClassName="magnet">
              <StarBorder as="a" href="./tour.html" className="cta" color="#BFF4FF" backgroundColor="#F2EEE4" textColor="#0F1C1F" borderColor="rgba(191,244,255,.35)" radius={999} thickness={2} duration={3} glow={0.9} sparkle>
                Ξεκινήστε την 3D περιήγηση
              </StarBorder>
            </Magnet>
          </div>
        </section>

        {/* SERVICES: horizontal track */}
        <section className="services" id="ypiresies" aria-labelledby="services-title">
          <div className="sticky sticky--h">
            <div className="track">
              <div className="track__intro">
                <Kicker n="05" text="ΥΠΗΡΕΣΙΕΣ" />
                <h2 id="services-title" className="h2 h2--xl">Τι κάνουμε</h2>
                <p className="muted">Συνεχίστε να κυλάτε για όλες τις θεραπείες.</p>
              </div>
              {SERVICES.map(([t, d]) => (
                <SpotlightCard key={t} className="card" theme="dark" spotlightColor="rgba(191,244,255,0.4)" intensity={0.25} spotlightSize={300} ambient>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </SpotlightCard>
              ))}
            </div>
            <div className="track__bar" aria-hidden="true"><span /></div>
          </div>
        </section>

        {/* WHITENING */}
        <section className="whitening" id="leukansi" aria-labelledby="whitening-title">
          <div className="sticky">
            <div className="panel">
              <Kicker n="06" text="ΛΕΥΚΑΝΣΗ" />
              <h2 id="whitening-title" className="h2">
                <SplitText text="Λεύκανση, με μέτρο" tag="span" splitType="chars" delay={35} effect="skew" textAlign="left" />
              </h2>
              <p>Χρησιμοποιούμε το σύστημα Beyond Polus, με δύο υλικά σε διαφορετικές συγκεντρώσεις. Έτσι διαλέγουμε μαζί σας πόσο πιο λευκά θέλετε τα δόντια σας, ώστε να δείχνουν φυσικά.</p>
              <figure className="shade">
                <div className="shade__guide" role="group" aria-label="Χρωματολόγιο δοντιών">
                  {SHADES.map(([name, c], i) => (
                    <button key={name} type="button" className={`tab${i === shade ? ' is-on' : ''}`} style={{ '--c': c }}
                      aria-pressed={i === shade} onClick={() => engine.current?.scrollToShade(i)}>{name}</button>
                  ))}
                </div>
                <figcaption>Κυλήστε ή πατήστε μια απόχρωση: <strong className="shade__now">{SHADES[shade][0]}</strong></figcaption>
              </figure>
              <p className="note">Οι σύγχρονες τεχνικές λεύκανσης δεν καταστρέφουν το σμάλτο.</p>
            </div>
          </div>
        </section>

        {/* TECH */}
        <section className="tech" id="exoplismos" aria-labelledby="tech-title">
          <div className="sticky">
            <div className="panel">
              <Kicker n="07" text="ΕΞΟΠΛΙΣΜΟΣ" />
              <h2 id="tech-title" className="h2">
                <SplitText text="Ο εξοπλισμός του ιατρείου" tag="span" splitType="words" delay={60} effect="blur" textAlign="left" />
              </h2>
              <ul className="tech__list">
                {[
                  ['Ενδοστοματικός σαρωτής', 'Ψηφιακό αποτύπωμα του στόματος, χωρίς πάστα, που στέλνεται κατευθείαν στο οδοντοτεχνικό εργαστήριο.'],
                  ['Χειρουργικός χώρος', 'Ξεχωριστή αίθουσα για εμφυτεύματα, με αποστειρωμένο ρουχισμό για προσωπικό και ασθενείς.'],
                  ['Φυγόκεντρος PRP', 'Για θεραπείες με πλάσμα πλούσιο σε αιμοπετάλια, που βοηθούν την επούλωση.'],
                  ['Αποστείρωση', 'Κλίβανος αποστείρωσης για όλα τα εργαλεία, μετά από κάθε χρήση.']
                ].map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq" id="erotiseis" aria-labelledby="faq-title">
          <div className="wrap faq__grid">
            <div className="faq__head">
              <Kicker n="08" text="ΕΡΩΤΗΣΕΙΣ" />
              <h2 id="faq-title" className="h2">
                <ScrollFloat textClassName="float-title" animationDuration={1} stagger={0.03}>Συχνές ερωτήσεις</ScrollFloat>
              </h2>
            </div>
            <div className="faq__list">
              {FAQ.map(([qq, a]) => (
                <details key={qq}><summary>{qq}</summary><p>{a}</p></details>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="contact" id="epikoinonia" aria-labelledby="contact-title">
          <div className="wrap">
            <Kicker n="09" text="ΕΠΙΚΟΙΝΩΝΙΑ" />
            <h2 id="contact-title" className="h2 h2--xl">
              <ScrollFloat textClassName="float-title" animationDuration={1} stagger={0.03}>Ελάτε να σας δούμε</ScrollFloat>
            </h2>
            <div className="contact__grid">
              <div>
                <address className="contact__addr">Πάροδος Ανδρούτσου, Κόμβος Μώλου<br />350 09 Μώλος Φθιώτιδας</address>
                <ul className="contact__lines">
                  <li><span>Ιατρείο</span><a href={TEL}>{PHONE}</a></li>
                  <li><span>Δεύτερη γραμμή</span><a href="tel:+302235041073">22350 41073</a></li>
                  <li><span>Κινητό</span><a href="tel:+306978361763">697 836 1763</a></li>
                  <li><span>Email</span><a href="mailto:info@moulios-lefaki.gr">info@moulios-lefaki.gr</a></li>
                </ul>
                <table className="hours">
                  <caption>Ωράριο, μόνο με ραντεβού</caption>
                  <tbody>
                    <tr><th scope="row">Δευτέρα – Παρασκευή</th><td>09:00 – 17:00</td></tr>
                    <tr><th scope="row">Σάββατο – Κυριακή</th><td>Κλειστά</td></tr>
                  </tbody>
                </table>
                <p className="muted">Δεχόμαστε όλες τις κάρτες.</p>
                <MagnetBtn href={TEL}>Καλέστε μας: {PHONE}</MagnetBtn>
              </div>
              <div className="map">
                {mapOn ? (
                  <iframe title="Χάρτης: Οδοντιατρείο Μούλιος – Λεφάκη, Μώλος" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                    src="https://www.google.com/maps?q=38.8040618,22.652544&z=17&hl=el&output=embed" />
                ) : (
                  <div className="map__placeholder">
                    <p>Ο χάρτης φορτώνει από το Google Maps μόνο αν το επιλέξετε, ώστε να μη στέλνονται δεδομένα χωρίς τη συγκατάθεσή σας.</p>
                    <button type="button" className="btn btn--ghost" onClick={() => setMapOn(true)}>Εμφάνιση χάρτη</button>
                    <a className="link" href="https://www.google.com/maps/dir/?api=1&destination=38.8040618,22.652544&destination_place_id=ChIJQRUAHRanoBQRosHl4fSzs0Y" target="_blank" rel="noopener">Οδηγίες στο Google Maps</a>
                    <a className="link" href="https://maps.google.com/?cid=5094613467829485986" target="_blank" rel="noopener">Το ιατρείο στο Google Maps</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer__row">
          <p>© {new Date().getFullYear()} Μούλιος Μιχάλης – Λεφάκη Μαρία, Χειρουργοί Οδοντίατροι</p>
          <p>Ο ιστότοπος δεν χρησιμοποιεί cookies.</p>
        </div>
      </footer>
    </ClickSpark>
  );
}
