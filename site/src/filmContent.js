// The opening film: real photos of the clinic, in the order you walk through it.
// fx/fy: the point the camera dives into (fraction of the photo).
export const SCENES = [
  { frames: { base: './images/film/entrance/', count: 36 }, fx: 0.5, fy: 0.36, zoom: [1.0, 1.12] },  // walking up to the door with the tooth
  { frames: { base: './images/film/salon/', count: 32 }, fx: 0.5, fy: 0.45, zoom: [1.0, 1.12] },     // the salon: sofas, armchairs, TV
  { src: './images/clinic/room-moulios.webp', fx: 0.44, fy: 0.42, zoom: [1.06, 1.4] }, // chair monitor
  // real video, scrubbed by the scroll: a slow pan across the surgical room
  { frames: { base: './images/film/surgery/', count: 32 }, fx: 0.5, fy: 0.6, zoom: [1.0, 1.1] },
  { frames: { base: './images/film/lefaki/', count: 28 }, fx: 0.5, fy: 0.64, zoom: [1.0, 1.12] },    // Dr Lefaki's room, the turquoise chair
  { src: './images/clinic/whitening.webp', fx: 0.4, fy: 0.42, zoom: [1.04, 1.35] },    // the lamp's glow
  { frames: { base: './images/film/scanner/', count: 24 }, fx: 0.5, fy: 0.42, zoom: [1.0, 1.12] }, // the Launca scanner, real video
  { frames: { base: './images/film/centrifuge/', count: 28 }, fx: 0.5, fy: 0.5, zoom: [1.0, 1.1] },  // pushing in on the PRP centrifuge
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
  { scene: 3, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['ΧΕΙΡΟΥΡΓΕΙΟ.'], pos: 'right' },
  { scene: 3, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Ξεχωριστή αίθουσα για την τοποθέτηση εμφυτευμάτων, με αποστειρωμένο εξοπλισμό.', pos: 'bottom-left' },
  { scene: 4, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['ΑΙΣΘΗΤΙΚΗ'], pos: 'right' },
  { scene: 4, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Μαρία Λεφάκη. Όψεις, bonding και λευκά σφραγίσματα.', pos: 'bottom-right' },
  { scene: 5, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['ΛΕΥΚΑΝΣΗ'], pos: 'center' },
  { scene: 5, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Λεύκανση στο ιατρείο με το σύστημα Beyond Polus.', pos: 'bottom-left' },
  { scene: 6, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['ΧΩΡΙΣ', 'ΠΑΣΤΑ.'], pos: 'left' },
  { scene: 6, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Ψηφιακό αποτύπωμα με ενδοστοματικό σαρωτή.', pos: 'bottom-right' },
  { scene: 7, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['PRP'], pos: 'right' },
  { scene: 7, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Πλάσμα πλούσιο σε αιμοπετάλια, για να βοηθά την επούλωση.', pos: 'bottom-left' },
  { scene: 8, in: [0.45, 0.65], out: [0.92, 1.0], kind: 'mega', lines: ['ΥΓΙΕΣ', 'ΧΑΜΟΓΕΛΟ,', 'ΥΓΙΗΣ ΖΩΗ.'], pos: 'left' },
  { scene: 8, in: [0.55, 0.72], out: [0.92, 1.0], kind: 'cta', text: 'Κλείστε ραντεβού: 22350 51834', pos: 'bottom-left' }
];
