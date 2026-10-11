export interface BodyPartTarget {
  id: string;
  name: string;
  emoji: string;
  categoryHint: string;
  description: string;
  colorClass: string;
  bgClass: string;
}

export const BODY_PARTS: BodyPartTarget[] = [
  {
    id: 'ear',
    name: 'Ear',
    emoji: '👂',
    categoryHint: 'ENT / Ear Drops',
    description: 'Ear infections, otitis, wax removal, hearing care',
    colorClass: 'text-amber-700 border-amber-300',
    bgClass: 'bg-amber-50',
  },
  {
    id: 'eye',
    name: 'Eye',
    emoji: '👁️',
    categoryHint: 'Ophthalmic Care',
    description: 'Eye drops, conjunctivitis, dryness, irritation, cataract',
    colorClass: 'text-sky-700 border-sky-300',
    bgClass: 'bg-sky-50',
  },
  {
    id: 'nose',
    name: 'Nose & Sinus',
    emoji: '👃',
    categoryHint: 'Nasal Care',
    description: 'Nasal congestion, sprays, sinusitis, allergic rhinitis',
    colorClass: 'text-indigo-700 border-indigo-300',
    bgClass: 'bg-indigo-50',
  },
  {
    id: 'throat',
    name: 'Throat & Mouth',
    emoji: '🗣️',
    categoryHint: 'Oral & Throat',
    description: 'Sore throat, lozenges, cough syrups, oral gargle, dental',
    colorClass: 'text-teal-700 border-teal-300',
    bgClass: 'bg-teal-50',
  },
  {
    id: 'head',
    name: 'Head & Brain',
    emoji: '🧠',
    categoryHint: 'Neurology / Migraine',
    description: 'Headache, migraine, neural support, sleep, cognitive',
    colorClass: 'text-purple-700 border-purple-300',
    bgClass: 'bg-purple-50',
  },
  {
    id: 'heart',
    name: 'Heart & BP',
    emoji: '🫀',
    categoryHint: 'Cardiovascular',
    description: 'Hypertension, blood pressure, cholesterol, cardiac support',
    colorClass: 'text-rose-700 border-rose-300',
    bgClass: 'bg-rose-50',
  },
  {
    id: 'lungs',
    name: 'Lungs & Respiratory',
    emoji: '🫁',
    categoryHint: 'Respiratory / Asthma',
    description: 'Asthma inhalers, bronchitis, cough, wheezing, COPD',
    colorClass: 'text-cyan-700 border-cyan-300',
    bgClass: 'bg-cyan-50',
  },
  {
    id: 'stomach',
    name: 'Stomach & Digestion',
    emoji: '🫄',
    categoryHint: 'Gastrointestinal',
    description: 'Antacids, acid reflux, acidity, PPI, nausea, digestion, laxative',
    colorClass: 'text-orange-700 border-orange-300',
    bgClass: 'bg-orange-50',
  },
  {
    id: 'liver',
    name: 'Liver & Detox',
    emoji: '🥩',
    categoryHint: 'Hepatic Care',
    description: 'Hepatoprotective, jaundice, digestive enzymes, fatty liver',
    colorClass: 'text-red-700 border-red-300',
    bgClass: 'bg-red-50',
  },
  {
    id: 'kidney',
    name: 'Kidney & Urinary',
    emoji: '🫘',
    categoryHint: 'Renal & Urology',
    description: 'Kidney stones, UTI, diuretic, prostate, urinary bladder',
    colorClass: 'text-amber-800 border-amber-300',
    bgClass: 'bg-amber-50',
  },
  {
    id: 'skin',
    name: 'Skin & Dermatology',
    emoji: '🧴',
    categoryHint: 'Dermatology',
    description: 'Topical creams, ointments, antifungal, rash, eczema, acne',
    colorClass: 'text-emerald-700 border-emerald-300',
    bgClass: 'bg-emerald-50',
  },
  {
    id: 'bone',
    name: 'Bones & Joints',
    emoji: '🦴',
    categoryHint: 'Orthopedic',
    description: 'Joint pain, arthritis, calcium, spine, fractures, cartilage',
    colorClass: 'text-stone-700 border-stone-300',
    bgClass: 'bg-stone-50',
  },
  {
    id: 'fever',
    name: 'Fever & Infection',
    emoji: '🌡️',
    categoryHint: 'Antipyretics / Antibiotics',
    description: 'Paracetamol, viral fevers, antibiotics, body ache, chills',
    colorClass: 'text-rose-700 border-rose-300',
    bgClass: 'bg-rose-50',
  },
  {
    id: 'immunity',
    name: 'Immunity & Nutrition',
    emoji: '💪',
    categoryHint: 'Vitamins & Minerals',
    description: 'Multivitamins, zinc, vitamin C & D3, immunity enhancers',
    colorClass: 'text-lime-700 border-lime-300',
    bgClass: 'bg-lime-50',
  },
  {
    id: 'diabetes',
    name: 'Endocrine & Diabetes',
    emoji: '🩸',
    categoryHint: 'Diabetic & Hormonal',
    description: 'Insulin, metformin, blood sugar control, thyroid care',
    colorClass: 'text-blue-700 border-blue-300',
    bgClass: 'bg-blue-50',
  },
  {
    id: 'general',
    name: 'Full Body / General',
    emoji: '👤',
    categoryHint: 'General Medicine',
    description: 'Systemic care, first aid, emergency medicine, general tonic',
    colorClass: 'text-slate-700 border-slate-300',
    bgClass: 'bg-slate-50',
  },
];

export const getBodyPartInfo = (nameOrId?: string): BodyPartTarget => {
  if (!nameOrId) {
    return BODY_PARTS.find((b) => b.id === 'general')!;
  }
  const query = nameOrId.toLowerCase().trim();
  const match = BODY_PARTS.find(
    (b) => b.id.toLowerCase() === query || b.name.toLowerCase().includes(query) || query.includes(b.id.toLowerCase())
  );
  return match || {
    id: 'custom',
    name: nameOrId,
    emoji: '💊',
    categoryHint: 'Medicines',
    description: 'Therapeutic medicine',
    colorClass: 'text-slate-700 border-slate-300',
    bgClass: 'bg-slate-50',
  };
};

export const initialCategoriesData = [
  {
    id: 'cat-ent',
    name: 'Ear, Nose & Eye Care',
    description: 'Otological ear drops, ophthalmic solutions, and nasal sprays',
    icon: '👂',
    defaultBodyPart: 'Ear',
    color: 'amber',
  },
  {
    id: 'cat-gastro',
    name: 'Gastrointestinal & Antacids',
    description: 'PPI capsules, antacids, digestive enzymes, and laxatives',
    icon: '🫄',
    defaultBodyPart: 'Stomach & Digestion',
    color: 'orange',
  },
  {
    id: 'cat-pain-fever',
    name: 'Pain Relief & Fever',
    description: 'Analgesics, antipyretics (paracetamol), and anti-inflammatory NSAIDs',
    icon: '🌡️',
    defaultBodyPart: 'Fever & Infection',
    color: 'rose',
  },
  {
    id: 'cat-respiratory',
    name: 'Respiratory & Cold Care',
    description: 'Cough syrups, asthma inhalers, bronchodilators, and anti-allergics',
    icon: '🫁',
    defaultBodyPart: 'Lungs & Respiratory',
    color: 'cyan',
  },
  {
    id: 'cat-cardiac',
    name: 'Cardiovascular & Diabetes',
    description: 'Anti-hypertensives, cholesterol statins, blood thinners, and insulin',
    icon: '🫀',
    defaultBodyPart: 'Heart & BP',
    color: 'red',
  },
  {
    id: 'cat-derma',
    name: 'Dermatology & Skin Care',
    description: 'Topical antifungal, antibacterial ointments, eczema lotions, and sunscreens',
    icon: '🧴',
    defaultBodyPart: 'Skin & Dermatology',
    color: 'emerald',
  },
  {
    id: 'cat-ortho',
    name: 'Orthopedic & Joint Care',
    description: 'Calcium supplements, vitamin D3, pain relief sprays, and cartilage support',
    icon: '🦴',
    defaultBodyPart: 'Bones & Joints',
    color: 'stone',
  },
  {
    id: 'cat-antibiotics',
    name: 'Antibiotics & Anti-Infectives',
    description: 'Broad-spectrum antibiotics, antivirals, and antifungal capsules',
    icon: '💊',
    defaultBodyPart: 'Full Body / General',
    color: 'blue',
  },
  {
    id: 'cat-neuro',
    name: 'Neurology & Mental Health',
    description: 'Migraine relief, neuropathic vitamins, sleep support, and anxiolytics',
    icon: '🧠',
    defaultBodyPart: 'Head & Brain',
    color: 'purple',
  },
  {
    id: 'cat-vitamins',
    name: 'Vitamins & Health Supplements',
    description: 'Multivitamin complexes, immunity boosters, iron tonics, and zinc',
    icon: '💪',
    defaultBodyPart: 'Immunity & Nutrition',
    color: 'lime',
  },
  {
    id: 'cat-personal',
    name: 'Personal & Baby Care',
    description: 'Oral hygiene, baby nutrition, disinfectants, and sanitizers',
    icon: '🧼',
    defaultBodyPart: 'Full Body / General',
    color: 'teal',
  },
  {
    id: 'cat-firstaid',
    name: 'Surgical & First Aid',
    description: 'Bandages, antiseptic solutions, cotton, thermometers, and medical devices',
    icon: '🩹',
    defaultBodyPart: 'Full Body / General',
    color: 'slate',
  },
];
