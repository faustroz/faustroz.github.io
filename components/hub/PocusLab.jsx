"use client";

import { useMemo, useState } from "react";
import { EDUS2_CLIPS, EDUS2_GROUPS, EDUS2_SOURCE, getEdus2ClipsByGroup } from "@/lib/hub/pocus-library.mjs";

const FINDING_LABELS = { positive: "POS", negative: "NEG", normal: "NORMAL", unspecified: "STUDY" };

function RealClipCard({ clip }) {
  return (
    <article className="hub-pocus-clip">
      <div className="hub-pocus-clip-head">
        <span className="hub-pocus-clip-badge">REAL RECORDING</span>
        <span className={"hub-pocus-clip-finding is-" + clip.finding}>{FINDING_LABELS[clip.finding]}</span>
      </div>
      <video className="hub-pocus-clip-video" controls preload="metadata" poster={clip.poster} src={clip.src} aria-label={`Real ultrasound recording, ${clip.title}`} />
      <h3 className="hub-pocus-clip-title">{clip.title}</h3>
      <p className="hub-pocus-clip-detail">{clip.detail}</p>
      <p className="hub-pocus-clip-file">{clip.file}</p>
    </article>
  );
}

export default function PocusLab() {
  const [libraryGroup, setLibraryGroup] = useState("all");
  const libraryClips = useMemo(() => getEdus2ClipsByGroup(libraryGroup), [libraryGroup]);

  return (
    <div className="hub-pocus-lab">
      <section className="hub-pocus-library" aria-label="Real ultrasound recording library">
        <div className="hub-pocus-library-head">
          <div className="hub-pocus-library-title">
            <span className="hub-pocus-label">REAL ULTRASOUND LIBRARY</span>
            <p className="hub-pocus-library-note">Real patient recordings from the Edus2 collection — actual ultrasound video, not simulation.</p>
          </div>
          <div className="hub-pocus-library-filters" role="group" aria-label="Filter recordings by region">
            <button type="button" className="hub-pocus-preset" aria-pressed={libraryGroup === "all"} onClick={() => setLibraryGroup("all")}>ALL {EDUS2_CLIPS.length}</button>
            {EDUS2_GROUPS.map((group) => {
              const count = getEdus2ClipsByGroup(group.id).length;
              return (
                <button key={group.id} type="button" className="hub-pocus-preset" aria-pressed={libraryGroup === group.id} title={group.blurb} onClick={() => setLibraryGroup(group.id)}>{group.label} {count}</button>
              );
            })}
          </div>
        </div>
        <div className="hub-pocus-library-grid">
          {libraryClips.map((clip) => <RealClipCard key={clip.id} clip={clip} />)}
        </div>
        <footer className="hub-pocus-library-source">
          <p><strong>{EDUS2_SOURCE.title}</strong> by {EDUS2_SOURCE.authors}, licensed <a href={EDUS2_SOURCE.licenseUrl} target="_blank" rel="noreferrer noopener">{EDUS2_SOURCE.license}</a> — non-commercial educational use, share-alike applies. Source: <a href={EDUS2_SOURCE.sourceUrl} target="_blank" rel="noreferrer noopener">theSimTech</a> · <a href={EDUS2_SOURCE.torrentUrl} target="_blank" rel="noreferrer noopener">Academic Torrents</a>. Findings reflect the source filenames only; no clinical annotations are provided.</p>
        </footer>
      </section>
    </div>
  );
}
