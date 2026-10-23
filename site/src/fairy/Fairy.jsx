import { useEffect, useRef, useState } from 'react';
import { answer, byId, SUGGESTIONS } from './brain.js';
import './fairy.css';

// An original little character: a tooth with wings, a wand and a glow
export function FairyMark({ className = '' }) {
  return (
    <svg className={`fairy-mark ${className}`} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="fg" cx="50%" cy="45%" r="55%"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#e8f4f8" /></radialGradient>
        <linearGradient id="fw" x1="0" x2="1"><stop offset="0" stopColor="#bfe9f5" stopOpacity=".95" /><stop offset="1" stopColor="#8fd6ea" stopOpacity=".55" /></linearGradient>
      </defs>
      <g className="fairy-mark__wings">
        <path d="M22 26c-9-12-20-10-19-2 1 7 10 9 19 6z" fill="url(#fw)" />
        <path d="M22 31c-8 2-14 8-10 12 4 3 9-3 11-9z" fill="url(#fw)" />
        <path d="M42 26c9-12 20-10 19-2-1 7-10 9-19 6z" fill="url(#fw)" />
        <path d="M42 31c8 2 14 8 10 12-4 3-9-3-11-9z" fill="url(#fw)" />
      </g>
      <path className="fairy-mark__tooth" d="M24 16c-5 0-8 4-8 9 0 4 2 7 3 10 1 3 1.5 7 2.4 11 .5 2 1.6 3.2 2.9 3.2 1.8 0 2.4-1.8 2.9-4.5.6-3.3 1.2-7.3 3.2-7.3s2.6 4 3.2 7.3c.5 2.7 1.1 4.5 2.9 4.5 1.3 0 2.4-1.2 2.9-3.2.9-4 1.4-8 2.4-11 1-3 3-6 3-10 0-5-3-9-8-9-3 0-4.4 1.6-7.4 1.6S27 16 24 16z" fill="url(#fg)" stroke="#0e1a1f" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="28" cy="27" r="1.6" fill="#0e1a1f" /><circle cx="36" cy="27" r="1.6" fill="#0e1a1f" />
      <path d="M29 31.5q3 2.6 6 0" fill="none" stroke="#0e1a1f" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="25.5" cy="30.5" r="1.6" fill="#f4b3b8" opacity=".8" /><circle cx="38.5" cy="30.5" r="1.6" fill="#f4b3b8" opacity=".8" />
      <g className="fairy-mark__wand">
        <path d="M46 40l9-11" stroke="#0e1a1f" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M56 22l1.4 3.2 3.4.4-2.5 2.3.7 3.4-3-1.7-3 1.7.7-3.4-2.5-2.3 3.4-.4z" fill="#ffd66b" stroke="#0e1a1f" strokeWidth="1" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

let uid = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));

export default function Fairy() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ id: uid++, from: 'f', text: 'Γεια σας! ✨ Είμαι η Νεράιδα των Δοντιών του ιατρείου. Ρωτήστε με για ωράριο, ραντεβού, εμφυτεύματα, λεύκανση ή ό,τι άλλο θέλετε.' }]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [peek, setPeek] = useState(false);
  const [used, setUsed] = useState([]);
  const list = useRef(null), field = useRef(null), btn = useRef(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // a one-time "hello" bubble a few seconds in
  useEffect(() => {
    let seen = false; try { seen = sessionStorage.getItem('fairy-peek') === '1'; } catch (e) { /* private mode */ }
    if (seen) return;
    const t1 = setTimeout(() => setPeek(true), 7000);
    const t2 = setTimeout(() => { setPeek(false); try { sessionStorage.setItem('fairy-peek', '1'); } catch (e) { /* */ } }, 15000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }); }, [msgs, typing, reduce]);
  useEffect(() => {
    if (!open) return;
    setPeek(false);
    const t = setTimeout(() => field.current?.focus({ preventScroll: true }), 350);
    const esc = e => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    window.addEventListener('keydown', esc);
    return () => { clearTimeout(t); window.removeEventListener('keydown', esc); };
  }, [open]);

  async function reply(r) {
    setTyping(true);
    await wait(reduce ? 150 : 550 + Math.min(1100, r.a.length * 6));
    setTyping(false);
    const id = uid++;
    if (reduce) { setMsgs(m => [...m, { id, from: 'f', text: r.a, action: r.action, urgent: r.urgent }]); return; }
    // reveal word by word
    const words = r.a.split(' ');
    setMsgs(m => [...m, { id, from: 'f', text: '', action: null, urgent: r.urgent }]);
    for (let i = 1; i <= words.length; i++) {
      await wait(18);
      const t = words.slice(0, i).join(' ');
      setMsgs(m => m.map(x => (x.id === id ? { ...x, text: t } : x)));
    }
    setMsgs(m => m.map(x => (x.id === id ? { ...x, action: r.action } : x)));
  }
  function ask(text, intentId) {
    const q = text.trim();
    if (!q || typing) return;
    setMsgs(m => [...m, { id: uid++, from: 'u', text: q }]);
    setInput('');
    if (intentId) setUsed(u => [...u, intentId]);
    reply(intentId ? byId(intentId) : answer(q));
  }

  const chips = SUGGESTIONS.filter(([id]) => !used.includes(id)).slice(0, 4);
  return (
    <div className={`fairy${open ? ' is-open' : ''}`}>
      {peek && !open && (
        <button className="fairy__peek" onClick={() => setOpen(true)}>Γεια! Έχετε απορίες; Ρωτήστε με ✨</button>
      )}
      <button ref={btn} className="fairy__btn" aria-expanded={open} aria-controls="fairy-panel" onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Κλείσιμο συνομιλίας' : 'Ρωτήστε τη Νεράιδα των Δοντιών'}>
        <FairyMark />
        <span className="fairy__dust" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      </button>

      <section id="fairy-panel" className="fairy__panel" role="dialog" aria-label="Νεράιδα των Δοντιών" aria-hidden={!open}>
        <header className="fairy__head">
          <FairyMark className="fairy-mark--small" />
          <div>
            <h2>Νεράιδα των Δοντιών</h2>
            <p><i className="fairy__dot" /> Απαντά αμέσως · δεν κάνει διάγνωση</p>
          </div>
          <button className="fairy__x" onClick={() => setOpen(false)} aria-label="Κλείσιμο" tabIndex={open ? 0 : -1}>×</button>
        </header>

        <div className="fairy__list" ref={list} aria-live="polite">
          {msgs.map(m => (
            <div key={m.id} className={`fairy__msg fairy__msg--${m.from}${m.urgent ? ' is-urgent' : ''}`}>
              <p>{m.text}</p>
              {m.action && (
                <a className="fairy__act" href={m.action.href} tabIndex={open ? 0 : -1}
                  {...(m.action.external ? { target: '_blank', rel: 'noopener' } : {})}>{m.action.label}</a>
              )}
            </div>
          ))}
          {typing && <div className="fairy__msg fairy__msg--f fairy__typing" aria-label="Γράφει"><i /><i /><i /></div>}
        </div>

        {chips.length > 0 && (
          <div className="fairy__chips">
            {chips.map(([id, q]) => <button key={id} onClick={() => ask(q, id)} disabled={typing} tabIndex={open ? 0 : -1}>{q}</button>)}
          </div>
        )}
        <form className="fairy__form" onSubmit={e => { e.preventDefault(); ask(input); }}>
          <input ref={field} value={input} onChange={e => setInput(e.target.value)} placeholder="Γράψτε την ερώτησή σας…" aria-label="Η ερώτησή σας" maxLength={300} tabIndex={open ? 0 : -1} />
          <button type="submit" disabled={!input.trim() || typing} aria-label="Αποστολή" tabIndex={open ? 0 : -1}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </form>
        <p className="fairy__fine">Γενικές πληροφορίες, όχι ιατρική συμβουλή. Για το δικό σας στόμα, μιλήστε με τους γιατρούς.</p>
      </section>
    </div>
  );
}
