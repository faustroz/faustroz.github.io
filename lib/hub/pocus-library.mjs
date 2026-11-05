export const EDUS2_SOURCE = {
  title: "Edus2 Ultrasounds",
  authors: "Paul Kulyk and Paul Olszynski",
  license: "CC BY-NC-SA 3.0 Unported",
  licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/3.0/",
  sourceUrl: "https://www.thesimtech.org/av-stimuli/ultrasounds/",
  torrentUrl: "https://academictorrents.com/details/e59a4244be98b0123c47f4205c94c95123318935",
  note: "Real ultrasound recordings shared for non-commercial education. Filenames indicate the exam and whether the study is positive or negative; no pixel annotations are provided.",
};

export const EDUS2_GROUPS = [
  { id: "cardiac", label: "Cardiac", blurb: "Apical and parasternal windows, pericardium." },
  { id: "fast", label: "FAST", blurb: "Focused assessment with sonography in trauma views." },
  { id: "aorta", label: "Aorta", blurb: "Abdominal aorta screening views." },
  { id: "renal", label: "Renal", blurb: "Kidney views for hydronephrosis." },
  { id: "biliary", label: "Biliary", blurb: "Right upper quadrant gallbladder views." },
  { id: "thoracic", label: "Thoracic", blurb: "Pleural space views for hemothorax." },
  { id: "obstetric", label: "Obstetric", blurb: "Pelvic views related to intrauterine pregnancy." },
];

const CLIPS = [
  { file: "edus2_cardiac_A4C_normal.mp4", group: "cardiac", title: "A4C, normal", finding: "normal", detail: "Apical four-chamber study labelled normal in the source filename." },
  { file: "edus2_cardiac_PSLV_normal.mp4", group: "cardiac", title: "PSLV, normal", finding: "normal", detail: "Parasternal long-axis style study labelled normal in the source filename." },
  { file: "edus2_PCE.mp4", group: "cardiac", title: "Pericardial effusion", finding: "positive", detail: "Pericardial effusion study (PCE) per the source filename." },
  { file: "edus2_PCE_2.mp4", group: "cardiac", title: "Pericardial effusion II", finding: "positive", detail: "Second pericardial effusion study (PCE) per the source filename." },
  { file: "edus2_PCE_negative.mp4", group: "cardiac", title: "Pericardium, negative", finding: "negative", detail: "Pericardial study labelled negative in the source filename." },
  { file: "edus2_FAST_RUQ_neg.mp4", group: "fast", title: "FAST RUQ, negative", finding: "negative", detail: "Right upper quadrant FAST study labelled negative in the source filename." },
  { file: "edus2_FAST_RUQ_neg_2.mp4", group: "fast", title: "FAST RUQ, negative II", finding: "negative", detail: "Second right upper quadrant FAST study labelled negative in the source filename." },
  { file: "edus2_FAST_RUQ_positive_abdominal_fluid_.mp4", group: "fast", title: "FAST RUQ, abdominal fluid", finding: "positive", detail: "Right upper quadrant FAST study with abdominal fluid per the source filename." },
  { file: "edus2_FAST_RUQ_Positive_Small_Free_Fluid.mp4", group: "fast", title: "FAST RUQ, small free fluid", finding: "positive", detail: "Right upper quadrant FAST study with small free fluid per the source filename." },
  { file: "edus2_FAST_LUQ_positive_free_fluid.mp4", group: "fast", title: "FAST LUQ, free fluid", finding: "positive", detail: "Left upper quadrant FAST study with free fluid per the source filename." },
  { file: "edus2_FAST_pelvis_positive_free_fluid.mp4", group: "fast", title: "FAST pelvis, free fluid", finding: "positive", detail: "Pelvic FAST study with free fluid per the source filename." },
  { file: "edus2_AAA_neg.mp4", group: "aorta", title: "Aorta, negative", finding: "negative", detail: "Abdominal aorta study labelled negative for AAA in the source filename." },
  { file: "edus2_AAA_pos.mp4", group: "aorta", title: "Aorta, positive AAA", finding: "positive", detail: "Abdominal aorta study labelled positive for AAA in the source filename." },
  { file: "edus2_Hydronephrosis_neg_lt.mp4", group: "renal", title: "Hydronephrosis, negative", finding: "negative", detail: "Left kidney study labelled negative for hydronephrosis in the source filename." },
  { file: "edus2_Hydronephrosis_pos_rt.mp4", group: "renal", title: "Hydronephrosis, positive", finding: "positive", detail: "Right kidney study labelled positive for hydronephrosis in the source filename." },
  { file: "edus2_cholecystitis_1.mp4", group: "biliary", title: "Cholecystitis I", finding: "unspecified", detail: "Gallbladder study labelled cholecystitis in the source filename." },
  { file: "edus2_cholecystitis_2.mp4", group: "biliary", title: "Cholecystitis II", finding: "unspecified", detail: "Second gallbladder study labelled cholecystitis in the source filename." },
  { file: "edus2_Hemothorax_left.mp4", group: "thoracic", title: "Hemothorax, left", finding: "positive", detail: "Left pleural space study labelled hemothorax in the source filename." },
  { file: "edus2_Hemothorax_right_positive.mp4", group: "thoracic", title: "Hemothorax, right", finding: "positive", detail: "Right pleural space study labelled positive for hemothorax in the source filename." },
  { file: "edus2_IUP.mp4", group: "obstetric", title: "IUP", finding: "unspecified", detail: "Study labelled intrauterine pregnancy (IUP) in the source filename." },
  { file: "edus2_IUP_2.mp4", group: "obstetric", title: "IUP II", finding: "unspecified", detail: "Second study labelled intrauterine pregnancy (IUP) in the source filename." },
  { file: "edus2_NDIUP_External_Longitudinal.mp4", group: "obstetric", title: "NDIUP, external longitudinal", finding: "unspecified", detail: "External longitudinal pelvic study labelled NDIUP in the source filename." },
  { file: "edus2_NDIUP_External_Transverse.mp4", group: "obstetric", title: "NDIUP, external transverse", finding: "unspecified", detail: "External transverse pelvic study labelled NDIUP in the source filename." },
  { file: "edus2_NDIUP_FF_long.mp4", group: "obstetric", title: "NDIUP, FF longitudinal", finding: "unspecified", detail: "Longitudinal study labelled NDIUP FF in the source filename." },
  { file: "edus2_NDIUP_FF_trans.mp4", group: "obstetric", title: "NDIUP, FF transverse", finding: "unspecified", detail: "Transverse study labelled NDIUP FF in the source filename." },
].map((clip) => ({
  ...clip,
  id: clip.file.replace(/^edus2_|\.mp4$/g, ""),
  src: `/pocus/edus2/${clip.file}`,
  poster: `/pocus/edus2/posters/${clip.file.replace(/\.mp4$/, "")}.jpg`,
}));

export const EDUS2_CLIPS = CLIPS;

export function getEdus2ClipsByGroup(groupId) {
  if (!groupId || groupId === "all") return EDUS2_CLIPS;
  return EDUS2_CLIPS.filter((clip) => clip.group === groupId);
}

export function getEdus2GroupLabel(groupId) {
  const group = EDUS2_GROUPS.find((entry) => entry.id === groupId);
  return group ? group.label : "";
}
