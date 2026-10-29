// Μενού από τους καταλόγους του εστιατορίου (φωτογραφίες 2025–2026).
// "frozen: true" = κατεψυγμένο (σημειώνεται με * όπως στον κατάλογο).
export const menu = [
  {
    id: 'orektika',
    title: 'Ορεκτικά',
    items: [
      { name: 'Ντάκος κρητικός', desc: 'Με μαριναρισμένα ντοματίνια, κάπαρη και αρωματική μυζήθρα', price: '8,50' },
      { name: 'Φέτα Π.Ο.Π. σε φύλλο', desc: 'Με μέλι και μαύρο σουσάμι', price: '7,00' },
      { name: 'Φάβα Σαντορίνης', desc: 'Με καραμελωμένο κρεμμύδι', price: '6,50' },
      { name: 'Φλογέρες', desc: 'Με καπνιστό τυρί και σαλάμι Λευκάδος', price: '7,00' },
      { name: 'Χειροποίητη κοπανιστή Μυκόνου', desc: 'Με τραγανές πιτούλες', price: '6,00' },
      { name: 'Ταλαγάνι ψητό', desc: 'Με πουρέ μάνγκο, φιλέτα εσπεριδοειδών και καραμελωμένα φουντούκια', price: '7,50' },
      { name: 'Κεφτεδάκια κοτόπουλου', desc: 'Με σάλτσα μουστάρδας', price: '8,50' },
      { name: 'Πατάτα baby', desc: 'Με τσένταρ και μπέικον', price: '8,00' },
      { name: 'Μανιτάρια πλευρώτους στη σχάρα', desc: 'Με dressing βαλσάμικου και μέλι', price: '8,50' },
      { name: 'Πατάτες τηγανητές φρέσκιες', desc: '', price: '4,50' },
    ],
  },
  {
    id: 'salates',
    title: 'Σαλάτες',
    items: [
      { name: 'Σαλάτα «Στίλβη»', desc: 'Ψητά μαριναρισμένα λαχανικά, μαρούλι, πατέ φέτας και τραγανή τορτίγια', price: '10,00' },
      { name: 'Σαλάτα «Caesar»', desc: 'Με κοτόπουλο, τραγανό κρουτόν και πούδρα παρμεζάνας', price: '10,00' },
      { name: 'Αγροτική σαλάτα', desc: 'Με ξινότυρο Μυκόνου, λιαστή ντομάτα και dressing βαλσάμικου με μέλι', price: '9,50' },
      { name: 'Χωριάτικη σαλάτα', desc: 'Με κρητικό κρίθινο παξιμάδι και φέτα Π.Ο.Π.', price: '11,00' },
      { name: 'Σαλάτα Mesclun', desc: 'Με τραγανό κοτόπουλο και σάλτσα ρεμουλάν', price: '12,50' },
      { name: 'Δροσερή σαλάτα', desc: 'Με τραγανό μπέικον και dressing γιαουρτιού', price: '9,50' },
      { name: 'Καλοκαιρινή σαλάτα', desc: 'Με ψητό μανούρι, καλαμπόκι, κρουτόν και dressing από lime', price: '11,00' },
    ],
  },
  {
    id: 'zymarika',
    title: 'Ζυμαρικά – Ρύζι',
    items: [
      { name: 'Λιγκουίνι καρμπονάρα', desc: '', price: '9,00' },
      { name: 'Λιγκουίνι με κοτόπουλο', desc: 'Κολοκύθι και λάδι άσπρης τρούφας', price: '11,00' },
      { name: 'Λιγκουίνι με μανιτάρια', desc: 'Ντοματίνια, θυμάρι και ψητό μανούρι', price: '10,50' },
      { name: 'Λιγκουίνι με γαρίδες', desc: '', price: '15,00' },
      { name: 'Πέννες alla Boscaiola', desc: 'Κοτόπουλο, μπέικον, πιπεριές, κρέμα γάλακτος', price: '10,50' },
      { name: 'Πέννες alla Caprese', desc: 'Ντομάτα κονφί, μοτσαρέλα, βασιλικός', price: '10,00' },
      { name: 'Ρύζι Basmati με μανιτάρια', desc: 'Παρμεζάνα και ρόκα', price: '10,50' },
      { name: 'Φρέσκο ραβιόλι γεμιστό', desc: 'Με ρικότα, πάστα μαύρης τρούφας και κρέμα γάλακτος', price: '13,00' },
    ],
  },
  {
    id: 'kyriws',
    title: 'Κυρίως Πιάτα',
    items: [
      { name: 'Μπιφτέκι γεμιστό', desc: 'Με γραβιέρα Κρήτης και ντομάτα', price: '12,00' },
      { name: 'Μπιφτέκι με σάλτσα φέτας', desc: '', price: '12,00' },
      { name: 'American Burger', desc: 'Μπιφτέκι, τσένταρ, μπέικον, σως', price: '9,50' },
      { name: 'Chicken Burger', desc: 'Μπιφτέκι κοτόπουλο, γλυκιά μαγιονέζα, παρμεζάνα, ντομάτα, iceberg', price: '9,50' },
      { name: 'Φιλέτο κοτόπουλο', desc: 'Με σάλτσα λεμονιού και βασιλικό', price: '11,00' },
      { name: 'Φιλέτο κοτόπουλο 4 τυριά', desc: 'Με σάλτσα τεσσάρων τυριών', price: '12,00' },
      { name: 'Ψαρονέφρι μαυροδάφνης', desc: 'Με σάλτσα μαυροδάφνης και μανιτάρια', price: '15,00' },
      { name: 'Ταλιάτα Striploin', desc: 'Με σάλτσα μανιταριών και κρασί Μαρσάλα', price: '23,00' },
      { name: 'Πανσετάκια χοιρινά', desc: 'Με sweet chilli sauce και πιτούλες', price: '11,00' },
      { name: 'Κεμπάπ', desc: 'Με σάλτσα γιαούρτι και τσίλι', price: '12,00' },
      { name: 'Φιλετίνια χοιρινά', desc: 'Γλυκόξινα με τρίχρωμη πιπεριά, ginger, κάσιους και αρωματικό ρύζι', price: '16,00' },
    ],
  },
  {
    id: 'sxara',
    title: 'Από τη Σχάρα',
    items: [
      { name: 'Σταβλίσια μπριζόλα μόσχου', desc: '', price: '25,00' },
      { name: 'Ψαρονέφρι', desc: '', price: '12,50' },
      { name: 'Χοιρινή μπριζόλα', desc: '', price: '11,00' },
      { name: 'Μπιφτέκι κοτόπουλο', desc: '', price: '10,50' },
      { name: 'Μπιφτέκι', desc: '', price: '10,00' },
      { name: 'Κοτόπουλο φιλέτο', desc: '', price: '10,00' },
    ],
  },
  {
    id: 'thalassa',
    title: 'Από τη Θάλασσα',
    items: [
      { name: 'Γαρίδες σαγανάκι', desc: '', price: '15,00', frozen: true },
      { name: 'Καλαμάρι τηγανητό', desc: '', price: '10,00', frozen: true },
      { name: 'Χταπόδι σχάρας', desc: '', price: '15,00', frozen: true },
      { name: 'Γαρίδες ψητές', desc: '', price: '12,50', frozen: true },
      { name: 'Γαρίδες τηγανητές', desc: '', price: '12,50', frozen: true },
      { name: 'Μύδια σωτέ', desc: '', price: '12,50', frozen: true },
      { name: 'Μυδοπίλαφο', desc: '', price: '12,50', frozen: true },
      { name: 'Γαύρος τηγανητός', desc: '', price: '9,00' },
      { name: 'Σαρδέλα ψητή', desc: '', price: '10,00' },
      { name: 'Θράψαλο σχάρας', desc: '', price: '24,00 / κιλό', frozen: true },
      { name: 'Πρώτα ψάρια', desc: 'Ρωτήστε για την ψαριά της ημέρας', price: '55,00 / κιλό' },
    ],
  },
  {
    id: 'glyka',
    title: 'Γλυκά',
    items: [
      { name: 'Σοκολατόπιτα με παγωτό', desc: '', price: '7,00' },
      { name: 'Πορτοκαλόπιτα με παγωτό', desc: '', price: '7,00' },
      { name: 'Τραγανά φύλλα', desc: 'Με κρέμα μιλφέιγ, καραμελωμένα φουντούκια και αλατισμένη butterscotch', price: '7,00' },
    ],
  },
]

export const wines = [
  {
    title: 'Λευκά',
    items: [
      { name: 'Κτήμα Γκανή · ARX', origin: 'Βαρδαλή Δομοκού', grape: 'Μαλαγουζιά / Gewürztraminer', price: '24,00' },
      { name: 'Ερίβωλος Φθία · Ελεάνα', origin: 'Καλλίδρομος Φθιώτιδας', grape: 'Μαλαγουζιά', price: '24,00' },
      { name: 'Μαύρο Πρόβατο', origin: 'Nico Lazaridi', grape: 'Sauvignon Blanc / Semillon', price: '28,00' },
      { name: 'Βιβλία Χώρα', origin: 'Καβάλα', grape: 'Sauvignon Blanc / Ασύρτικο', price: '35,00' },
      { name: 'Κτήμα Γεροβασιλείου', origin: 'Μακεδονία', grape: 'Ασύρτικο / Μαλαγουζιά', price: '32,00' },
      { name: 'Moscato d’Ifestia', origin: '200 ml', grape: 'Γλυκό', price: '8,00' },
    ],
  },
  {
    title: 'Ροζέ',
    items: [
      { name: 'La Tour Melas · Idylle', origin: 'Αχινός Φθιώτιδας', grape: 'Αγιωργίτικο / Grenache / Syrah', price: '33,00' },
      { name: 'Κτήμα Κυρ-Γιάννη', origin: 'Μπλε Τρακτέρ', grape: 'Merlot', price: '28,00' },
    ],
  },
  {
    title: 'Κόκκινα',
    items: [
      { name: 'Κτήμα Γκανή · ARX', origin: 'Βαρδαλή Δομοκού', grape: 'Αγιωργίτικο / Cabernet Sauvignon', price: '24,00' },
      { name: 'Κτήμα Παντρά', origin: 'Μώλος Φθιώτιδας', grape: 'Merlot / Syrah', price: '19,00' },
    ],
  },
]

export const findItem = (name) => {
  for (const cat of menu) {
    const it = cat.items.find((i) => i.name === name)
    if (it) return it
  }
  throw new Error(`Menu item not found: ${name}`)
}

export const dishCount = menu.reduce((n, c) => n + c.items.length, 0)
export const wineCount = wines.reduce((n, c) => n + c.items.length, 0)
