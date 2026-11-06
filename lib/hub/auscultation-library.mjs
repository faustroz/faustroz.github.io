export const HLS_CMDS_SOURCE = {
  title: "HLS-CMDS: Heart and Lung Sounds Dataset Recorded from a Clinical Manikin using Digital Stethoscope",
  authors: "Yasaman Torabi, Shahram Shirani and James P. Reilly (McMaster University)",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  sourceUrl: "https://zenodo.org/records/15376628",
  doiUrl: "https://doi.org/10.1109/IEEEDATA.2025.3566012",
  citation: "Y. Torabi, S. Shirani and J. P. Reilly, “Descriptor: Heart and Lung Sounds Dataset Recorded from a Clinical Manikin using Digital Stethoscope (HLS-CMDS),” IEEE Data Descriptions, 2025.",
  capture: "3M Littmann Core digital stethoscope on a CAE Juno clinical manikin. The published 15-second takes are 4 kHz mono WAV; here they are resampled to 8 kHz mono FLAC and peak-normalised to −1 dBFS per file, because the originals peak between −48 and −14 dBFS and are close to inaudible at normal volume. Normalisation is a single gain factor per file, so it changes loudness only — never the shape, timing or relative dynamics within a recording. Loudness is therefore not comparable between recordings.",
  note: "Manikin-generated sounds, not patient recordings. Labels come from the dataset's own metadata, so they are the ground truth of what the manikin was asked to produce — not a clinical diagnosis.",
};

export const AUSCULTATION_SYSTEMS = [
  { id: "heart", label: "Heart", blurb: "Precordial sites: apex, sternal borders and costal margins." },
  { id: "lung", label: "Lung", blurb: "Anterior chest fields: upper, mid and lower, left and right." },
];

const TYPES = [
  {
    code: "N", system: "heart", label: "Normal", abnormal: false,
    teaching: "S1 then S2, no added sounds. Systole (S1→S2) is shorter than diastole (S2→S1); use that asymmetry to tell the two apart before you call anything a murmur.",
  },
  {
    code: "ESM", system: "heart", label: "Early systolic murmur", abnormal: true,
    teaching: "Starts with S1 and fades before S2. Seen with small muscular VSDs, acute mitral regurgitation and tricuspid regurgitation without pulmonary hypertension.",
  },
  {
    code: "MSM", system: "heart", label: "Mid systolic murmur", abnormal: true,
    teaching: "Crescendo–decrescendo, peaking mid-systole with a gap before S2. The ejection pattern of aortic stenosis, pulmonic stenosis and benign flow murmurs.",
  },
  {
    code: "LSM", system: "heart", label: "Late systolic murmur", abnormal: true,
    teaching: "Begins well after S1 and runs into S2, classically after a mid-systolic click in mitral valve prolapse.",
  },
  {
    code: "LDM", system: "heart", label: "Late diastolic murmur", abnormal: true,
    teaching: "Low-pitched rumble late in diastole, accentuated by atrial contraction — the presystolic accentuation of mitral stenosis. Listen at the apex with the bell.",
  },
  {
    code: "S3", system: "heart", label: "Third heart sound", abnormal: true,
    teaching: "Low-pitched sound just after S2 in early diastole, from rapid ventricular filling. Physiological in children and young adults; in older patients it suggests volume overload or heart failure.",
  },
  {
    code: "S4", system: "heart", label: "Fourth heart sound", abnormal: true,
    teaching: "Low-pitched sound just before S1, from atrial contraction against a stiff ventricle. Implies a sinus rhythm — it cannot exist in atrial fibrillation.",
  },
  {
    code: "AF", system: "heart", label: "Atrial fibrillation", abnormal: true,
    teaching: "Irregularly irregular rhythm with no discernible pattern and varying S1 intensity, because diastolic filling time differs from beat to beat.",
  },
  {
    code: "T", system: "heart", label: "Tachycardia", abnormal: true,
    teaching: "Rate above 100/min. As the rate climbs, diastole shortens faster than systole until the two intervals look equal — the point where timing a murmur needs a pulse, not the ear alone.",
  },
  {
    code: "AVB", system: "heart", label: "Atrioventricular block", abnormal: true,
    teaching: "Dropped beats and varying S1 intensity. In complete block, atria and ventricles are dissociated and an occasional 'cannon' sound appears when they coincide.",
  },
  {
    code: "N", system: "lung", label: "Normal vesicular", abnormal: false,
    teaching: "Soft, low-pitched, inspiration longer than expiration with no pause between them. The baseline you compare every adventitious sound against.",
  },
  {
    code: "W", system: "lung", label: "Wheezing", abnormal: true,
    teaching: "Continuous, high-pitched, musical, mostly expiratory. Narrowed small airways — asthma, COPD. Monophonic and fixed suggests a single obstructed airway instead.",
  },
  {
    code: "FC", system: "lung", label: "Fine crackles", abnormal: true,
    teaching: "Discontinuous, short, high-pitched popping late in inspiration, like rolling hair between your fingers. Pulmonary oedema, pneumonia, interstitial fibrosis. Not cleared by coughing.",
  },
  {
    code: "CC", system: "lung", label: "Coarse crackles", abnormal: true,
    teaching: "Louder, lower-pitched and longer than fine crackles, starting early in inspiration and often continuing into expiration. Secretions in larger airways; may change or clear after a cough.",
  },
  {
    code: "R", system: "lung", label: "Rhonchi", abnormal: true,
    teaching: "Continuous, low-pitched snoring quality from secretions or narrowing in the large airways. Like coarse crackles, it often shifts after the patient coughs.",
  },
  {
    code: "PR", system: "lung", label: "Pleural rub", abnormal: true,
    teaching: "Creaking, leathery, grating sound in both inspiration and expiration, localised to one spot and unchanged by coughing. Inflamed pleural surfaces rubbing — pleurisy, pulmonary infarction.",
  },
];

export const AUSCULTATION_TYPES = TYPES.map((type) => ({ ...type, id: `${type.system}-${type.code.toLowerCase()}` }));

const LOCATIONS = {
  A: { system: "heart", label: "Apex", note: "Mitral area, 5th intercostal space at the midclavicular line." },
  RUSB: { system: "heart", label: "RUSB", note: "Right upper sternal border — aortic area." },
  LUSB: { system: "heart", label: "LUSB", note: "Left upper sternal border — pulmonic area." },
  LLSB: { system: "heart", label: "LLSB", note: "Left lower sternal border — tricuspid area." },
  RC: { system: "heart", label: "RC", note: "Right costal margin." },
  LC: { system: "heart", label: "LC", note: "Left costal margin." },
  RUA: { system: "lung", label: "RUA", note: "Right upper anterior field." },
  RMA: { system: "lung", label: "RMA", note: "Right mid anterior field." },
  RLA: { system: "lung", label: "RLA", note: "Right lower anterior field." },
  LUA: { system: "lung", label: "LUA", note: "Left upper anterior field." },
  LMA: { system: "lung", label: "LMA", note: "Left mid anterior field." },
  LLA: { system: "lung", label: "LLA", note: "Left lower anterior field." },
};

export const AUSCULTATION_LOCATIONS = LOCATIONS;

const HEART_FILES = [
  "F_AF_A", "F_AF_LUSB", "F_ESM_LLSB", "F_ESM_LUSB", "F_ESM_RUSB", "F_LDM_A", "F_LDM_LLSB", "F_LDM_LUSB",
  "F_LSM_A", "F_LSM_LLSB", "F_LSM_LUSB", "F_MSM_A", "F_MSM_LLSB", "F_MSM_LUSB", "F_N_A", "F_N_LC",
  "F_N_LLSB", "F_N_LUSB", "F_N_RC", "F_N_RUSB", "F_S3_A", "F_S3_LC", "F_S3_LLSB", "F_S4_RC",
  "F_T_A", "F_T_RC", "M_AF_LC", "M_AF_RUSB", "M_AVB_A", "M_AVB_LLSB", "M_AVB_RC", "M_ESM_A",
  "M_ESM_LUSB", "M_ESM_RUSB", "M_LDM_LC", "M_LDM_LLSB", "M_LDM_LUSB", "M_LSM_LUSB", "M_LSM_RUSB", "M_MSM_A",
  "M_MSM_LUSB", "M_MSM_RC", "M_MSM_RUSB", "M_N_LC", "M_N_LLSB", "M_N_RUSB", "M_S3_LLSB", "M_S3_LUSB",
  "M_S4_LUSB", "M_T_LUSB",
];

const LUNG_FILES = [
  "F_CC_LLA", "F_CC_LMA", "F_CC_LUA", "F_CC_RLA", "F_CC_RMA", "F_FC_LUA", "F_FC_RLA", "F_N_LLA",
  "F_N_LMA", "F_N_LUA", "F_N_RLA", "F_N_RMA", "F_N_RUA", "F_PR_LLA", "F_PR_LMA", "F_PR_LUA",
  "F_R_LMA", "F_R_LUA", "F_R_RLA", "F_W_RUA", "M_CC_LLA", "M_CC_LMA", "M_CC_LUA", "M_CC_RLA",
  "M_FC_LUA", "M_FC_RLA", "M_FC_RUA", "M_N_LLA", "M_N_LMA", "M_N_LUA", "M_N_RLA", "M_N_RMA",
  "M_N_RUA", "M_PR_LLA", "M_PR_LMA", "M_PR_LUA", "M_PR_RLA", "M_PR_RMA", "M_PR_RUA", "M_R_LLA",
  "M_R_LMA", "M_R_LUA", "M_R_RLA", "M_R_RUA", "M_W_LLA", "M_W_LMA", "M_W_LUA", "M_W_RLA",
  "M_W_RMA", "M_W_RUA",
];

const GENDERS = { F: "Female body habitus", M: "Male body habitus" };

function findType(system, code) {
  return AUSCULTATION_TYPES.find((type) => type.system === system && type.code === code);
}

function buildClip(stem, system) {
  const [gender, code, locationCode] = stem.split("_");
  const type = findType(system, code);
  const location = LOCATIONS[locationCode];
  if (!type) throw new Error(`Unknown ${system} sound code: ${code}`);
  if (!location || location.system !== system) throw new Error(`Unknown ${system} location: ${locationCode}`);
  return {
    id: `${system}-${stem.toLowerCase()}`,
    file: `${stem}.flac`,
    src: `/auscultation/${system}/${stem}.flac`,
    system,
    typeId: type.id,
    typeCode: code,
    typeLabel: type.label,
    abnormal: type.abnormal,
    teaching: type.teaching,
    locationCode,
    locationLabel: location.label,
    locationNote: location.note,
    gender,
    genderLabel: GENDERS[gender] || "Unspecified",
    title: `${type.label} · ${location.label}`,
  };
}

export const AUSCULTATION_CLIPS = [
  ...HEART_FILES.map((stem) => buildClip(stem, "heart")),
  ...LUNG_FILES.map((stem) => buildClip(stem, "lung")),
];

export function getAuscultationTypes(system) {
  if (!system || system === "all") return AUSCULTATION_TYPES;
  return AUSCULTATION_TYPES.filter((type) => type.system === system);
}

export function getAuscultationClips({ system = "all", typeId = "all" } = {}) {
  return AUSCULTATION_CLIPS.filter((clip) => {
    if (system && system !== "all" && clip.system !== system) return false;
    if (typeId && typeId !== "all" && clip.typeId !== typeId) return false;
    return true;
  });
}

export function countByType(system) {
  return getAuscultationTypes(system).map((type) => ({
    ...type,
    count: AUSCULTATION_CLIPS.filter((clip) => clip.typeId === type.id).length,
  }));
}

/**
 * One identify-the-sound round: a clip to play plus answer choices drawn from
 * the same system, so a lung clip is never offered a cardiac answer.
 */
export function buildTrainerRound(clips, { choiceCount = 4, random = Math.random } = {}) {
  if (!Array.isArray(clips) || clips.length === 0) return null;
  const clip = clips[Math.floor(random() * clips.length) % clips.length];
  const siblings = getAuscultationTypes(clip.system).filter((type) => type.id !== clip.typeId);
  const distractors = [];
  const pool = siblings.slice();
  while (pool.length > 0 && distractors.length < Math.max(0, choiceCount - 1)) {
    const index = Math.floor(random() * pool.length) % pool.length;
    distractors.push(pool.splice(index, 1)[0]);
  }
  const choices = [{ id: clip.typeId, label: clip.typeLabel }, ...distractors.map((type) => ({ id: type.id, label: type.label }))];
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1)) % (index + 1);
    [choices[index], choices[swap]] = [choices[swap], choices[index]];
  }
  return { clip, answerId: clip.typeId, choices };
}

export function scoreTrainerAnswer(round, choiceId) {
  if (!round) return null;
  return { correct: choiceId === round.answerId, answerId: round.answerId, choiceId };
}
