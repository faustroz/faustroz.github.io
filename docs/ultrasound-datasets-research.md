# Ultrasound Asset Library — Dataset Research Report

> Research phase for expanding the POCUS Lab into a Multi-Organ Ultrasound Learning Lab.
> Scope: publicly accessible **real** ultrasound recordings (no synthetic/AI-generated visuals).
> Date: 2026-11-04. No datasets downloaded yet; no application code modified.

## Summary table

| # | Source | Organ | Media | Annotations | License | Redistribution | Size |
|---|--------|-------|-------|-------------|---------|----------------|------|
| 1 | CAMUS | Cardiac (2CH/4CH) | Image sequences | LV endo/myo/LA masks, EF, quality tiers | CC BY-NC-SA 4.0 + mandatory citation | Allowed (NC + SA + credit) | ~3.8 GB |
| 2 | Edus2 Ultrasounds | Cardiac + Abdominal/FAST + Lung (hemothorax) | Videos | Diagnosis labels in filenames | CC BY-NC-SA 3.0 | Allowed (NC + SA + credit) | ~120 MB |
| 3 | POCUS dataset (covid19_ultrasound) | Lung | Videos + images | Diagnosis, B-lines/A-lines/consolidation flags, LUS severity | Mixed (per-source, see §Lung) | Per-source; some unlicensed | ~2–4 GB |
| 4 | COVIDx-US | Lung | Videos + images | Unified LUS score per video | Code AGPL-3.0; data mixed, some unlicensed | Risky (unlicensed sources) | ~5 GB+ |
| 5 | Open POCUS (Stanford AIMI) | Lung | Video clips | Normal / B-lines / consolidation labels | Stanford research agreement | **No redistribution** | ~GB-scale |
| 6 | EchoNet-Dynamic (Stanford AIMI) | Cardiac (A4C) | Videos | EF, ESV/EDV, LV tracings | Stanford research agreement | **No redistribution** | ~7 GB |
| 7 | HMC-QU | Cardiac (A4C/A2C) | Videos | MI labels, LV masks (109 A4C) | CC BY-NC-SA 3.0 IGO | Allowed (NC + SA + credit), email request | ~171 MB |
| 8 | GBCU (Gallbladder cancer) | Abdominal (gallbladder) | Images | Cancer / non-cancer class | CC BY-NC-SA 4.0 | Allowed (NC + SA + credit) | ~100 MB scale |
| 9 | Gallbladder Diseases Dataset | Abdominal (gallbladder) | Images | 9 disease classes by landmark | **CC BY 4.0** | Allowed with credit | 1.9 GB |
| 10 | Open Kidney Ultrasound (kidneyUS) | Abdominal (kidney) | Images | Quality classes, segmentation | CC BY-NC-SA | Conditional, registration form | ~GB-scale |
| 11 | UKUID (Zenodo) | Abdominal (kidney) | Images | 91 annotated, 183 unlabeled | CC BY 4.0 | Allowed with credit | ~100 MB scale |
| 12 | The POCUS Atlas | Cardiac + Lung + Abdominal | Clips + images | Curated captions, contributor credit | CC BY-NC 4.0 | Allowed (NC + credit) | Ad-hoc per clip |

---

## 1. Cardiac ultrasound

### 1.1 CAMUS (CREATIS, University of Lyon)
- **URL:** https://www.creatis.insa-lyon.fr/Challenge/camus/ — data portal: https://humanheart-project.creatis.insa-lyon.fr/database/
- **Organs / views:** Apical 2-chamber (2CH) and apical 4-chamber (4CH) transthoracic echo, 500 patients.
- **Media:** 2D image sequences (cine frames, NIfTI/mhd) + annotated ED/ES frames. Not packaged as video files.
- **Annotations:** Per-frame pixel masks for LV endocardium, LV myocardium, left atrium; EF values; image-quality tiers (Good/Medium/Poor); ED/ES frame indices.
- **License:** CC BY-NC-SA 4.0. Two extra upstream terms: non-commercial scientific research only; citation of Leclerc et al., IEEE TMI 2019 mandatory. ShareAlike binds derivatives.
- **Redistribution:** Allowed with attribution + same license (fits a non-commercial educational hub).
- **Download:** Direct download from the CREATIS Girder collection (collection id `6373703d73e9f0047faa1bc8`). ~3.83 GB gzipped NIfTI.
- **Notes:** Beware defective third-party mirrors (HuggingFace notes swapped labels / wrong splits in some conversions); use the official CREATIS release.

### 1.2 EchoNet-Dynamic (Stanford AIMI)
- **URL:** https://echonet.github.io/dynamic/ — access via https://aimi.stanford.edu/datasets/echonet-dynamic-cardiac-ultrasound (Redivis: stanford.redivis.com/datasets/66s1-2hsmzj5rn)
- **Organs / views:** Apical 4-chamber only, 10,030 videos from routine clinical care.
- **Media:** Videos (112×112, cropped/masked to the scanning sector).
- **Annotations:** EF, ESV, EDV, expert LV tracings at ED/ES. No per-structure anatomical labels.
- **License:** Stanford School of Medicine Research Use Agreement — personal non-commercial research only.
- **Redistribution:** **Explicitly prohibited** ("MAY NOT DISTRIBUTE, PUBLISH, OR REPRODUCE"); download link sharing also prohibited; no derivative works.
- **Download:** Redivis account + accept agreement. ~7 GB.
- **Verdict:** Excellent for private local study, but legally unusable for shipping assets inside a website. Deprioritize for integration.

### 1.3 HMC-QU (Hamad Medical Corp / Tampere / Qatar University)
- **URL:** https://www.kaggle.com/datasets/aysendegerli/hmcqu-dataset (access via e-mail request to mkiranyaz@qu.edu.qa)
- **Organs / views:** A4C (162 recordings) + A2C (160 recordings), 162 patients, MI vs non-MI.
- **Media:** Videos (AVI, 25 fps, 422×636 to 768×1024).
- **Annotations:** Segment-level MI labels; frame-by-frame LV wall segmentation masks for 109 A4C recordings; ED/ES frame indices.
- **License:** CC BY-NC-SA 3.0 IGO.
- **Redistribution:** Allowed under the CC terms, but access itself requires an e-mail request.
- **Download:** Kaggle (after approval). ~171 MB.
- **Notes:** Pathology-heavy (MI) — good for "abnormal" examples, less for teaching normal anatomy.

### 1.4 MITEA (Cardiac Atlas Project) — excluded for now
3D echo, LV myocardium/cavity labels; requires institutional e-mail + Data Distribution Agreement per project. Too much friction for this project. CC BY-NC-SA 4.0 if ever needed.

### 1.5 MIMIC-IV-ECHO (PhysioNet) — excluded
Credentialed access + DUA + HIPAA training; sharing forbidden. Not suitable.

---

## 2. Lung ultrasound

### 2.1 POCUS dataset (`jannisborn/covid19_ultrasound`)
- **URL:** https://github.com/jannisborn/covid19_pocus_ultrasound (repo also at github.com/jannisborn/covid19_ultrasound)
- **Organs / views:** Lung ultrasound (convex + linear probes), standard LUS zones.
- **Media:** 202 videos + 59 images (COVID-19, bacterial pneumonia, viral pneumonia, healthy controls).
- **Annotations:** Per-clip diagnostic label; B-lines / A-lines / consolidations / effusion / pleural-line irregularity flags; lung severity scores for 136 videos (Gare et al. 2022); probe type, framerate, resolution metadata.
- **License:** Mixed, tracked per clip in `dataset_metadata.csv`: The POCUS Atlas CC BY-NC 4.0; LITFL CC BY-NC-SA 4.0; Radiopaedia CC BY-NC-SA 3.0; Butterfly Network / GrepMed / CoreUltrasound / Clarius clips have **no stated license**.
- **Redistribution:** Only the CC-licensed subset; unlicensed-source clips should be excluded or hot-linked with care.
- **Download:** Git clone / direct from GitHub. Estimated 2–4 GB.
- **Notes:** JHU PULSE Lab published segmentation annotations for this dataset (gitlab.com/pulselab/covid19) — usable overlay labels.

### 2.2 COVIDx-US (NRC Canada)
- **URL:** https://github.com/nrc-cnrc/COVID-US/
- **Organs / views:** Lung, multiple views/probes.
- **Media:** 242 videos + 29,651 processed images.
- **Annotations:** Standardized unified LUS score per video; COVID / non-COVID infection / normal / other.
- **License:** Code AGPL-3.0; data curated from sources with mixed licenses — several sources have **no license** (Butterfly, GrepMed, CoreUltrasound, Clarius).
- **Redistribution:** Risky for the unlicensed subset; the CC-sourced subset is fine.
- **Download:** GitHub. Estimated 5 GB+.
- **Verdict:** Larger but legally muddier than §2.1; use only if §2.1 proves insufficient.

### 2.3 Open POCUS (Stanford AIMI)
- **URL:** stanford.redivis.com/datasets/9e5t-a8ppjpsfd
- **Media:** 1,871 lung clips from 226 adults; labels: normal / B-lines / consolidation.
- **License:** Stanford research agreement — **no redistribution**. Same verdict as EchoNet-Dynamic.

---

## 3. Abdominal ultrasound

### 3.1 Edus2 Ultrasounds (Kulyk & Olszynski, Univ. of Saskatchewan)
- **URL:** https://www.thesimtech.org/av-stimuli/ultrasounds/ — mirrored on Academic Torrents: https://academictorrents.com/details/e59a4244be98b0123c47f4205c94c95123318935
- **Organs / views:** 29 mp4 clips spanning: cardiac (A4C normal, parasternal long axis, pericardial effusion/tamponade ±), FAST exam (RUQ ± free fluid, LUQ ± free fluid, pelvis ± free fluid), abdominal aorta (AAA ±), hydronephrosis ±, cholecystitis, hemothorax (lung/pleura), pregnancy (IUP).
- **Media:** Videos (mp4, 1–8 MB each).
- **Annotations:** Diagnosis encoded in filename (e.g. `edus2_FAST_RUQ_positive_abdominal_fluid`); no pixel annotations.
- **License:** CC BY-NC-SA 3.0 Unported, stated in the torrent COPYRIGHT file ("Free for non-commercial educational use").
- **Redistribution:** Allowed with attribution + same license.
- **Download:** Academic Torrents torrent or direct from thesimtech.org. ~120 MB total.
- **Verdict:** Highest value-per-megabyte of everything surveyed: real POCUS clips across cardiac, FAST/abdominal, and pleural teaching in one small, clearly licensed package.

### 3.2 GBCU — Gallbladder cancer dataset (IIT Delhi)
- **URL:** https://gbc-iitd.github.io/data/gbcu (paper: CVPR 2022, "Surpassing the Human Accuracy…")
- **Organs / views:** Abdominal ultrasound stills focused on the gallbladder; 1,255 images from 218 patients.
- **Media:** Images.
- **Annotations:** Gallbladder cancer vs benign labels (patch-level via GBCNet crops).
- **License:** CC BY-NC-SA 4.0.
- **Download:** Project page. ~100 MB scale.

### 3.3 Gallbladder Diseases Dataset (Turki, figshare 2025)
- **URL:** https://doi.org/10.6084/m9.figshare.25020821
- **Media:** 1.9 GB of gallbladder ultrasound images, 9 classes organized by anatomical landmarks/disease.
- **Annotations:** Class per image (anatomical landmark-based).
- **License:** **CC BY 4.0** — the most permissive license found (redistribution allowed with credit, no NC/SA clause).
- **Download:** figshare direct download.

### 3.4 Open Kidney Ultrasound Dataset (kidneyUS, UBC)
- **URL:** https://github.com/rsingla92/kidneyUS
- **Media:** Kidney ultrasound images (quality-graded).
- **Annotations:** Good/Bad quality classes; segmentation annotations in the associated paper.
- **License:** CC BY-NC-SA; access requires a registration form (Qualtrics) for manual verification.
- **Download:** After form approval.

### 3.5 UKUID_REV01 (Zenodo, 2025)
- **URL:** https://doi.org/10.5281/zenodo.18918138
- **Media:** 183 unlabeled + 91 expert-annotated kidney ultrasound images (PNG).
- **Annotations:** Segmentation masks for the annotated subset; acquisition metadata included.
- **License:** CC BY 4.0.
- **Download:** Zenodo direct. ~100 MB scale.

### 3.6 Teaching video galleries — use with care
- Emergency Ultrasound Teaching FAST gallery (emergencyultrasoundteaching.com): many normal/abnormal FAST clips; **no explicit license** — do not redistribute.
- JoVE FAST/aorta articles: paywalled, not reusable.

---

## Cross-cutting educational sources

- **The POCUS Atlas** (thepocusatlas.com) — curated, peer-reviewed real POCUS clips across cardiac, lung, abdominal, vascular; **CC BY-NC 4.0**; per-item contributor credit required. Ideal for hand-picked exemplar clips in an educational UI.
- **LITFL echo library** — CC BY-NC-SA 4.0. **Radiopaedia** — CC BY-NC-SA 3.0 (case-based, per-case attribution).

---

## Recommendation: integration order

**Integrate first: Edus2 Ultrasounds (#3.1).**
Rationale:
1. Covers all three target organs in one small package (~120 MB, 29 clips) — cardiac, FAST/abdominal, pleural/lung — matching the multi-organ lab goal immediately.
2. Clean, explicit CC BY-NC-SA 3.0 educational license with redistribution rights; a personal non-commercial educational hub complies with attribution + share-alike.
3. Real recordings, diagnosis-labeled by filename — trivially mappable to the existing POCUS Lab's "view → explanation → structure" pattern.

**Second: CAMUS (#1.1)** for cardiac depth — pixel-annotated 2CH/4CH sequences, clear license, direct download; suits a frame-based cardiac viewer with segmentation overlays.

**Third: POCUS dataset (#2.1)** for lung depth — use only the CC-licensed subset (POCUS Atlas / LITFL / Radiopaedia sources), skipping Butterfly/Clarius-sourced clips.

**Avoid bundling:** EchoNet-Dynamic, Open POCUS (Stanford no-redistribution agreements), MIMIC-IV-ECHO (credentialed), and any clip whose source has no stated license (Butterfly/GrepMed/CoreUltrasound/Clarius subsets of COVIDx-US).

**Compliance notes for the hub:**
- All recommended sources are non-commercial licenses; the hub must stay non-commercial and display attribution (source name + contributor where applicable + license link) next to every asset.
- CC BY-NC-SA assets must be shared under the same license if redistributed — the site's asset pages should state this.
- Keep the existing "educational simulation, not clinical data" disclaimer pattern and extend it to real clips ("real clinical recording, shown for education — not a live diagnostic tool").
