/**
 * Single source of truth for the three care plans.
 * The API validates against this list, and the UI renders from it, so adding a
 * fourth plan later is a one file change.
 */
export const PROGRAMS = [
  {
    key: 'plus',
    name: 'ProHealth Plus',
    service: 'ProHealth Plus',
    tagline: 'Stay proactive and healthy',
    desc: 'Maintain your health momentum with diagnostics, Internal Medicine consults, dietitian consults, and fitness sessions for proactive care.',
    duration: '6 months',
    mrp: '₹3998',
    mrpValue: 3998,
    price: '₹1999',
    priceValue: 1999,
    chips: [
      'Lab Panel (HbA1c, FBS, Lipid) x3',
      'IM Consults x3',
      'Dietitian Consults x2',
      'Live Fitness Sessions',
    ],
    accent: 'var(--plus)',
    soft: 'var(--plus-soft)',
    icon: 'M12 21s-7-4.35-9.33-9.02C1.06 8.9 2.7 5.5 6.1 5.5c2 0 3.2 1.1 3.9 2.2C10.7 6.6 11.9 5.5 13.9 5.5c3.4 0 5.04 3.4 3.43 6.48C19 16.65 12 21 12 21Z',
    previews: ['/flyers/plus-1.jpg', '/flyers/plus-2.jpg'],
    // Card banner crop: a text- and logo-free region of the flyer art. Each
    // flyer lays its imagery out differently, so scale/origin are per plan.
    // Plus: photo card sits centre, above its purple caption overlay.
    banner: { ratio: 2.2, scale: 1.7, origin: '32% 30%' },
    pdfFile: 'prohealth-plus.pdf',
    downloadName: 'ProHealth_Plus_Flyer.pdf',
  },
  {
    key: 'diet',
    name: 'ProHealth Diet',
    service: 'ProHealth Diet',
    tagline: 'Eat Smart. Live Better.',
    desc: 'A premium, on-demand nutrition program with personalized diet plans and expert tele-consultations, helping you eat smarter and live healthier.',
    duration: '6 months',
    mrp: '₹3000',
    mrpValue: 3000,
    price: '₹1199',
    priceValue: 1199,
    chips: ['Dietitian Consultation x6', 'Virtual (Tele-Consult)', 'Live Fitness Sessions'],
    accent: 'var(--diet)',
    soft: 'var(--diet-soft)',
    icon: 'M12 2C9 6 6 8 6 13a6 6 0 0 0 12 0c0-5-3-7-6-11Z',
    previews: ['/flyers/diet-1.jpg', '/flyers/diet-2.jpg'],
    // Diet: model and produce occupy the right; copy block is on the left.
    banner: { ratio: 2.2, scale: 2.2, origin: '100% 38%' },
    pdfFile: 'prohealth-diet.pdf',
    downloadName: 'ProHealth_Diet_Flyer.pdf',
  },
  {
    key: 'lab',
    name: 'ProHealth Lab',
    service: 'ProHealth Lab',
    tagline: 'Your health on track',
    desc: 'Track sugar and cholesterol levels while engaging in Care Plan fitness sessions to maintain balance, energy, and long-term health outcomes.',
    duration: '6 months',
    mrp: '₹3198',
    mrpValue: 3198,
    price: '₹1599',
    priceValue: 1599,
    chips: ['Lab Panel (HbA1c, FBS, Lipid) x3', 'Live Fitness Sessions'],
    accent: 'var(--lab)',
    soft: 'var(--lab-soft)',
    icon: 'M9 2h6M10 2v6.5L5.5 17A3 3 0 0 0 8 21.5h8a3 3 0 0 0 2.5-4.5L14 8.5V2',
    previews: ['/flyers/lab-1.jpg', '/flyers/lab-2.jpg'],
    // Lab: model on the right; yellow copy block on the left.
    banner: { ratio: 2.2, scale: 2.3, origin: '100% 34%' },
    pdfFile: 'prohealth-lab.pdf',
    downloadName: 'ProHealth_Lab_Flyer.pdf',
  },
];

export const SERVICE_TO_KEY = PROGRAMS.reduce((acc, p) => {
  acc[p.service] = p.key;
  return acc;
}, {});

export const SERVICES = PROGRAMS.map((p) => p.service);

export function getProgramByKey(key) {
  return PROGRAMS.find((p) => p.key === key) || null;
}

export function getProgramByService(service) {
  return PROGRAMS.find((p) => p.service === service) || null;
}
