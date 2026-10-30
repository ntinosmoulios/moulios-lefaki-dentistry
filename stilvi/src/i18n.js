// Greek / English. The choice comes from ?lang=, then the saved choice, then the
// browser language (tourists get English). Switching reloads the page so every
// scroll animation is rebuilt around the new text.
const saved = (() => { try { return localStorage.getItem('stilvi-lang') } catch { return null } })()
const param = new URLSearchParams(location.search).get('lang')
export const lang = param === 'en' || param === 'el' ? param
  : saved === 'en' || saved === 'el' ? saved
  : (navigator.language || 'el').toLowerCase().startsWith('el') ? 'el' : 'en'
export const isEn = lang === 'en'
export const t = (el, en) => (isEn ? en : el)

const setLang = (l) => {
  try { localStorage.setItem('stilvi-lang', l) } catch {}
  const u = new URL(location.href)
  u.searchParams.set('lang', l)
  location.replace(u.toString())
}

// Dishes and wines, keyed by their Greek name in menu-data.js
const dishes = {
  'Ντάκος κρητικός': ['Cretan dakos', 'Barley rusk with marinated cherry tomatoes, capers and aromatic myzithra cheese'],
  'Φέτα Π.Ο.Π. σε φύλλο': ['Feta P.D.O. in filo', 'With honey and black sesame'],
  'Φάβα Σαντορίνης': ['Santorini fava', 'Yellow split pea purée with caramelised onion'],
  'Φλογέρες': ['Flogeres', 'Filo rolls with smoked cheese and Lefkada salami'],
  'Χειροποίητη κοπανιστή Μυκόνου': ['Homemade Mykonos kopanisti', 'Spicy cheese spread with crispy pitas'],
  'Ταλαγάνι ψητό': ['Grilled talagani cheese', 'With mango purée, citrus fillets and caramelised hazelnuts'],
  'Κεφτεδάκια κοτόπουλου': ['Chicken meatballs', 'With mustard sauce'],
  'Πατάτα baby': ['Baby potatoes', 'With cheddar and bacon'],
  'Μανιτάρια πλευρώτους στη σχάρα': ['Grilled oyster mushrooms', 'With balsamic and honey dressing'],
  'Πατάτες τηγανητές φρέσκιες': ['Fresh hand-cut fries', ''],
  'Σαλάτα «Στίλβη»': ['«Stilvi» salad', 'Grilled marinated vegetables, lettuce, feta pâté and crispy tortilla'],
  'Σαλάτα «Caesar»': ['Caesar salad', 'With chicken, crunchy croutons and parmesan'],
  'Αγροτική σαλάτα': ['Farmer\'s salad', 'With Mykonos xinotyri cheese, sun-dried tomato and balsamic-honey dressing'],
  'Χωριάτικη σαλάτα': ['Greek salad', 'With Cretan barley rusk and feta P.D.O.'],
  'Σαλάτα Mesclun': ['Mesclun salad', 'With crispy chicken and remoulade sauce'],
  'Δροσερή σαλάτα': ['Fresh green salad', 'With crispy bacon and yoghurt dressing'],
  'Καλοκαιρινή σαλάτα': ['Summer salad', 'With grilled manouri cheese, corn, croutons and lime dressing'],
  'Λιγκουίνι καρμπονάρα': ['Linguine carbonara', ''],
  'Λιγκουίνι με κοτόπουλο': ['Linguine with chicken', 'Courgette and white truffle oil'],
  'Λιγκουίνι με μανιτάρια': ['Linguine with mushrooms', 'Cherry tomatoes, thyme and grilled manouri cheese'],
  'Λιγκουίνι με γαρίδες': ['Linguine with shrimps', ''],
  'Πέννες alla Boscaiola': ['Penne alla Boscaiola', 'Chicken, bacon, peppers, cream'],
  'Πέννες alla Caprese': ['Penne alla Caprese', 'Tomato confit, mozzarella, basil'],
  'Ρύζι Basmati με μανιτάρια': ['Basmati rice with mushrooms', 'Parmesan and rocket'],
  'Φρέσκο ραβιόλι γεμιστό': ['Fresh filled ravioli', 'With ricotta, black truffle paste and cream'],
  'Μπιφτέκι γεμιστό': ['Stuffed beef patty', 'With Cretan graviera cheese and tomato'],
  'Μπιφτέκι με σάλτσα φέτας': ['Beef patty with feta sauce', ''],
  'American Burger': ['American burger', 'Beef patty, cheddar, bacon, sauce'],
  'Chicken Burger': ['Chicken burger', 'Chicken patty, sweet mayonnaise, parmesan, tomato, iceberg'],
  'Φιλέτο κοτόπουλο': ['Chicken fillet', 'With lemon and basil sauce'],
  'Φιλέτο κοτόπουλο 4 τυριά': ['Chicken fillet, four cheeses', 'With four-cheese sauce'],
  'Ψαρονέφρι μαυροδάφνης': ['Pork tenderloin with Mavrodaphne', 'Mavrodaphne wine sauce and mushrooms'],
  'Ταλιάτα Striploin': ['Striploin tagliata', 'With mushroom and Marsala wine sauce'],
  'Πανσετάκια χοιρινά': ['Pork belly bites', 'With sweet chilli sauce and pitas'],
  'Κεμπάπ': ['Kebab', 'With yoghurt sauce and chilli'],
  'Φιλετίνια χοιρινά': ['Sweet & sour pork', 'Tri-colour peppers, ginger, cashews and fragrant rice'],
  'Σταβλίσια μπριζόλα μόσχου': ['Farm-raised beef steak', ''],
  'Ψαρονέφρι': ['Pork tenderloin', ''],
  'Χοιρινή μπριζόλα': ['Pork chop', ''],
  'Μπιφτέκι κοτόπουλο': ['Chicken patty', ''],
  'Μπιφτέκι': ['Beef patty', ''],
  'Κοτόπουλο φιλέτο': ['Chicken fillet', ''],
  'Γαρίδες σαγανάκι': ['Shrimps saganaki', ''],
  'Καλαμάρι τηγανητό': ['Fried calamari', ''],
  'Χταπόδι σχάρας': ['Grilled octopus', ''],
  'Γαρίδες ψητές': ['Grilled shrimps', ''],
  'Γαρίδες τηγανητές': ['Fried shrimps', ''],
  'Μύδια σωτέ': ['Sautéed mussels', ''],
  'Μυδοπίλαφο': ['Mussel pilaf', ''],
  'Γαύρος τηγανητός': ['Fried anchovies', ''],
  'Σαρδέλα ψητή': ['Grilled sardines', ''],
  'Θράψαλο σχάρας': ['Grilled flying squid', ''],
  'Πρώτα ψάρια': ['Fresh fish', 'Ask for the catch of the day'],
  'Σοκολατόπιτα με παγωτό': ['Chocolate pie with ice cream', ''],
  'Πορτοκαλόπιτα με παγωτό': ['Orange pie with ice cream', ''],
  'Τραγανά φύλλα': ['Crispy filo', 'With millefeuille cream, caramelised hazelnuts and salted butterscotch'],
}
const words = {
  'Βαρδαλή Δομοκού': 'Vardali, Domokos', 'Καλλίδρομος Φθιώτιδας': 'Kallidromo, Fthiotida', 'Καβάλα': 'Kavala',
  'Μακεδονία': 'Macedonia', 'Αχινός Φθιώτιδας': 'Achinos, Fthiotida', 'Μώλος Φθιώτιδας': 'Molos, Fthiotida',
  'Μαλαγουζιά': 'Malagouzia', 'Ασύρτικο': 'Assyrtiko', 'Αγιωργίτικο': 'Agiorgitiko', 'Γλυκό': 'Sweet',
  'Κτήμα': 'Estate', 'Μπλε Τρακτέρ': 'Blue Tractor', 'κιλό': 'kg',
}
const swap = (s) => Object.entries(words).reduce((acc, [g, e]) => acc.split(g).join(e), s)

export const trItem = (it) => {
  if (!isEn) return it
  const d = dishes[it.name]
  return { ...it, name: d ? d[0] : swap(it.name), desc: d ? d[1] : swap(it.desc || ''), price: swap(it.price) }
}
export const trWine = (w) => (isEn ? { ...w, name: swap(w.name), origin: swap(w.origin), grape: swap(w.grape) } : w)
export const catTitles = {
  orektika: 'Starters', salates: 'Salads', zymarika: 'Pasta & Rice', kyriws: 'Main Courses',
  sxara: 'From the Grill', thalassa: 'From the Sea', glyka: 'Desserts',
}
export const wineTitles = { 'Λευκά': 'White', 'Ροζέ': 'Rosé', 'Κόκκινα': 'Red' }

// Static page text: [selector, English HTML]
const page = [
  ['.nav__brand', null, 'aria-label', 'Stilvi, back to top'],
  ['.nav__links a[href="#akti"]', '<span class="mono">01</span> The Beach'],
  ['.nav__links a[href="#menou"]', '<span class="mono">02</span> Menu'],
  ['.nav__links a[href="#ypografes"]', '<span class="mono">03</span> Signatures'],
  ['.nav__links a[href="#katalogos"]', '<span class="mono">04</span> Full Menu'],
  ['.nav__links a[href="#kratisi"]', '<span class="mono">05</span> Bookings'],
  ['.hero__img', null, 'alt', 'Stilvi\'s seaside terrace at night, lanterns in the pines and the moon over Evia'],
  ['.hero__phase', 'Bookings · +30 22350 42080'],
  ['.hero__eyebrow', 'Kammena Vourla · Greece'],
  ['.hero__night', 'When the sun goes down, the lanterns come on.<br />Seafood, steaks and wine, right by the waves.'],
  ['.hero__ctas .btn--gold', 'Book · +30 22350 42080'],
  ['.hero__ctas .btn--ghost', 'See the menu'],
  ['.hero__cue', 'Scroll <span></span>'],
  ['.akti .kicker', '// 01. THE BEACH'],
  ['.akti .display', 'Tables on the water. Dishes with&nbsp;character.'],
  ['.akti__img--a img', null, 'alt', 'A Stilvi table facing the sea at sunset'],
  ['.akti__text .lead', 'On the beach of Kammena Vourla, a few steps from the water, Stilvi sets its tables under the pine trees, looking out over the gulf to the mountains of Evia.'],
  ['.akti__text > p:not(.lead)', 'Fresh seafood, farm-raised steaks from the charcoal grill, creative salads and wines from Fthiotida and all over Greece. Lunch in the blue of the gulf, dinner under the lanterns.'],
  ['.akti__img--b img', null, 'alt', 'The beach seen from Stilvi\'s terrace by day'],
  ['.stats', null, 'aria-label', 'Stilvi in numbers'],
  ['.stat:nth-child(1) .stat__unit', 'm'],
  ['.stat:nth-child(1) p', 'From the waves'],
  ['.stat:nth-child(2) p', 'Dishes on the menu'],
  ['.stat:nth-child(3) p', 'Wine labels'],
  ['.stat:nth-child(4) p', 'Sunset, every evening'],
  ['.menu3d .kicker', '// 02. THE MENU'],
  ['.menu3d__hint', 'Scroll to turn the pages'],
  ['.book', null, 'aria-label', 'Stilvi\'s menu as a book'],
  ['.sig .kicker', '// 03. OUR SIGNATURES'],
  ['.sig .display', 'From the sea and the&nbsp;grill.'],
  ['.glass', null, 'aria-label', 'Rosé on the terrace'],
  ['.glass__frame img', null, 'alt', 'Rosé wine on the terrace by the sea'],
  ['.glass__caption', '<b>In the glass</b><i> · </i>rosé from Fthiotida, looking out over the gulf'],
  ['.katalogos .kicker', '// 04. THE FULL MENU'],
  ['.katalogos .display', 'The whole menu, at a&nbsp;glance.'],
  ['.tabs', null, 'aria-label', 'Menu categories'],
  ['.katalogos .note', '* Frozen · Prices in euros, subject to change. Please tell us about any allergies.'],
  ['.kratisi .kratisi__info .kicker', '// 05. BOOKINGS'],
  ['.kratisi .display', 'Book your table by the&nbsp;waves.'],
  ['.kratisi__info .lead', 'Bookings are by phone only. For the front-row tables at sunset, call us early.'],
  ['.info li:nth-child(1) .mono', 'Phone'],
  ['.info li:nth-child(1) a', '+30 22350 42080'],
  ['.info li:nth-child(2)', '<span class="mono">Location</span>Kammena Vourla beach, Fthiotida, Greece'],
  ['.info li:nth-child(3)', '<span class="mono">Hours</span>Lunch &amp; dinner'],
  ['.info li:nth-child(4) .mono', 'Directions'],
  ['.info li:nth-child(4) a', 'Open in Google Maps ↗'],
  ['.kratisi__img img', null, 'alt', 'Stilvi\'s deck by the waves at dusk'],
  ['.call .kicker', 'Bookings by phone only'],
  ['.call__label', 'Call us on'],
  ['.call__num a', '+30&nbsp;22350&nbsp;42080'],
  ['.call__text', 'Tell us the day, the time and how many you are. If you\'d like a table by the water or under the lanterns, just ask when you book.'],
  ['.call__actions .btn--gold', 'Call'],
  ['#copy-phone', 'Copy number'],
  ['.footer__tag', 'See you at the table.'],
  ['.footer__row span:first-child', 'Seaside Restaurant · Kammena Vourla, Greece'],
  ['.scrubber__name', 'Start'],
]
const labels = { akti: 'The Beach', menou: 'Menu', ypografes: 'Signatures', katalogos: 'Full Menu', kratisi: 'Bookings' }

export function applyStatic() {
  document.documentElement.lang = lang
  if (isEn) {
    document.title = 'Stilvi · Seaside Restaurant · Kammena Vourla, Greece'
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Stilvi Seaside Restaurant in Kammena Vourla, Greece. Seafood, charcoal-grilled steaks and Greek wines, at tables right by the waves.')
    for (const [sel, html, attr, val] of page) {
      document.querySelectorAll(sel).forEach((el) => { if (attr) el.setAttribute(attr, val); else el.innerHTML = html })
    }
    document.querySelectorAll('[data-label]').forEach((el) => { if (labels[el.id]) el.dataset.label = labels[el.id] })
    const phone = document.querySelector('#copy-phone'); if (phone) phone.dataset.phone = '+30 22350 42080'
  }
  // EL / EN switch, next to the phone button
  const sw = document.createElement('div')
  sw.className = 'lang mono'
  sw.setAttribute('role', 'group')
  sw.setAttribute('aria-label', t('Γλώσσα', 'Language'))
  sw.innerHTML = ['el', 'en'].map((l) => `<button type="button" lang="${l}" aria-pressed="${l === lang}" ${l === lang ? 'class="is-on"' : ''}>${l.toUpperCase()}</button>`).join('<span aria-hidden="true">/</span>')
  sw.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { if (b.lang !== lang) setLang(b.lang) }))
  document.querySelector('.nav__cta').before(sw)
}
