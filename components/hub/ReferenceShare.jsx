"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import ShareLinkPanel from "@/components/hub/ShareLinkPanel";

export default function ReferenceShare() {
  const [open, setOpen] = useState(false);
  return (
    <div className="hub-reference-share">
      <button type="button" className="hub-question-tool-button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Share2 size={14} /> Bagikan referensi
      </button>
      {open && <ShareLinkPanel kind="reference_library" title="referensi" hint="Semua kartu obat dan nilai referensi kamu ikut terbagi. Tamu hanya membaca dan mencari. Link memuat domain situs ini." />}
    </div>
  );
}
