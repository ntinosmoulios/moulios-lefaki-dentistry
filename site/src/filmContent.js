// The opening film: real photos of the clinic, in the order you walk through it.
// fx/fy: the point the camera dives into (fraction of the photo).
export const SCENES = [
  { src: './images/clinic/entrance.webp', fx: 0.69, fy: 0.27, zoom: [1.02, 1.3] },     // the glass with the tooth
  { src: './images/clinic/reception.webp', fx: 0.38, fy: 0.45, zoom: [1.08, 1.45] },   // dark door at the back
  { src: './images/clinic/room-moulios.webp', fx: 0.44, fy: 0.42, zoom: [1.06, 1.4] }, // chair monitor
  { src: './images/clinic/room-lefaki.webp', fx: 0.55, fy: 0.42, zoom: [1.06, 1.4] },
  { src: './images/clinic/whitening.webp', fx: 0.4, fy: 0.42, zoom: [1.04, 1.35] },    // the lamp's glow
  { src: './images/clinic/scanner.webp', fx: 0.5, fy: 0.35, zoom: [1.04, 1.3] },       // the screen
  { src: './images/clinic/centrifuge.webp', fx: 0.62, fy: 0.45, zoom: [1.04, 1.3] },
  { src: './images/clinic/moulios-scanner.webp', fx: 0.5, fy: 0.62, reverse: true }     // pull back from the screen to the doctor
];

// in/out are windows in the scene's own time (0 = scene starts, 1 = next scene)
export const OVERLAYS = [
  { scene: 0, in: [0, 0], out: [0.45, 0.68], kind: 'mega', lines: ['ΜΟΥΛΙΟΣ', '& ΛΕΦΑΚΗ'], pos: 'left' },
  { scene: 0, in: [0, 0], out: [0.3, 0.5], kind: 'small', text: 'Χειρουργοί οδοντίατροι στον Μώλο Φθιώτιδας. Κυλήστε για να μπείτε μέσα.', pos: 'bottom-left' },
  { scene: 1, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['ΚΑΛΩΣ', 'ΗΡΘΑΤΕ.'], pos: 'center' },
  { scene: 1, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Με ραντεβού, Δευτέρα έως Παρασκευή, 09:00 με 17:00.', pos: 'bottom-right' },
  { scene: 2, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['ΕΜΦΥΤΕΥΜΑΤΑ'], pos: 'left' },
  { scene: 2, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Μιχάλης Μούλιος. Μικροχειρουργική και εμφυτευματολογία, Πανεπιστήμιο της Κολωνίας.', pos: 'bottom-left' },
  { scene: 3, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['ΑΙΣΘΗΤΙΚΗ'], pos: 'right' },
  { scene: 3, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Μαρία Λεφάκη. Όψεις, bonding και λευκά σφραγίσματα.', pos: 'bottom-right' },
  { scene: 4, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['ΛΕΥΚΑΝΣΗ'], pos: 'center' },
  { scene: 4, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Λεύκανση στο ιατρείο με το σύστημα Beyond Polus.', pos: 'bottom-left' },
  { scene: 5, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['ΧΩΡΙΣ', 'ΠΑΣΤΑ.'], pos: 'left' },
  { scene: 5, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Ψηφιακό αποτύπωμα με ενδοστοματικό σαρωτή.', pos: 'bottom-right' },
  { scene: 6, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['PRP'], pos: 'right' },
  { scene: 6, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Πλάσμα πλούσιο σε αιμοπετάλια, για να βοηθά την επούλωση.', pos: 'bottom-left' },
  { scene: 7, in: [0.45, 0.65], out: [0.92, 1.0], kind: 'mega', lines: ['ΥΓΙΕΣ', 'ΧΑΜΟΓΕΛΟ,', 'ΥΓΙΗΣ ΖΩΗ.'], pos: 'left' },
  { scene: 7, in: [0.55, 0.72], out: [0.92, 1.0], kind: 'cta', text: 'Κλείστε ραντεβού: 22350 51834', pos: 'bottom-left' }
];
