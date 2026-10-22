// The opening film: cinematic AI-generated images (illustrative, not photos of the clinic).
// fx/fy: the point the camera dives into (fraction of the photo).
export const SCENES = [
  { src: './images/ai/tooth.webp', fx: 0.7, fy: 0.42, zoom: [1.02, 1.25] },        // a single perfect tooth
  { src: './images/ai/doors.webp', fx: 0.5, fy: 0.42, zoom: [1.04, 1.4] },         // dive through the glass doors
  { src: './images/ai/implant.webp', fx: 0.77, fy: 0.3, zoom: [1.02, 1.3] },       // implant crown
  { src: './images/ai/surgery.webp', fx: 0.25, fy: 0.15, zoom: [1.02, 1.3] },      // into the operating light
  { src: './images/ai/veneer.webp', fx: 0.72, fy: 0.32, zoom: [1.02, 1.3] },
  { src: './images/ai/whitening.webp', fx: 0.5, fy: 0.72, zoom: [1.02, 1.3] },     // the glow
  { src: './images/ai/scanner.webp', fx: 0.6, fy: 0.26, zoom: [1.02, 1.3] },       // the scanner tip
  { src: './images/ai/prp.webp', fx: 0.63, fy: 0.42, zoom: [1.02, 1.3] },
  { src: './images/ai/smile.webp', fx: 0.71, fy: 0.5, reverse: true }              // pull back from the smile
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
  { scene: 3, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Ξεχωριστή αίθουσα για την τοποθέτηση εμφυτευμάτων, με αποστειρωμένο εξοπλισμό.', pos: 'bottom-right' },
  { scene: 4, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['ΑΙΣΘΗΤΙΚΗ'], pos: 'left' },
  { scene: 4, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Μαρία Λεφάκη. Όψεις, bonding και λευκά σφραγίσματα.', pos: 'bottom-left' },
  { scene: 5, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['ΛΕΥΚΑΝΣΗ'], pos: 'center' },
  { scene: 5, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Λεύκανση στο ιατρείο με το σύστημα Beyond Polus.', pos: 'bottom-left' },
  { scene: 6, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['ΧΩΡΙΣ', 'ΠΑΣΤΑ.'], pos: 'left' },
  { scene: 6, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Ψηφιακό αποτύπωμα με ενδοστοματικό σαρωτή.', pos: 'bottom-left' },
  { scene: 7, in: [0.05, 0.3], out: [0.55, 0.72], kind: 'mega', lines: ['PRP'], pos: 'left' },
  { scene: 7, in: [0.15, 0.35], out: [0.5, 0.65], kind: 'small', text: 'Πλάσμα πλούσιο σε αιμοπετάλια, για να βοηθά την επούλωση.', pos: 'bottom-left' },
  { scene: 8, in: [0.45, 0.65], out: [0.92, 1.0], kind: 'mega', lines: ['ΥΓΙΕΣ', 'ΧΑΜΟΓΕΛΟ,', 'ΥΓΙΗΣ ΖΩΗ.'], pos: 'left' },
  { scene: 8, in: [0.55, 0.72], out: [0.92, 1.0], kind: 'cta', text: 'Κλείστε ραντεβού: 22350 51834', pos: 'bottom-left' }
];
