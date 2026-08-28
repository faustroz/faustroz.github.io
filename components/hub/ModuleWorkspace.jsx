"use client";

import { useState } from "react";
import CrudPanel from "@/components/hub/CrudPanel";

export default function ModuleWorkspace({ channels }) {
  const [active, setActive] = useState(channels[0].id);
  const channel = channels.find(({ id }) => id === active) || channels[0];

  return (
    <>
      <nav className="hub-channel-tabs" aria-label="Module data channels">
        {channels.map((item, index) => (
          <button key={item.id} type="button" onClick={() => setActive(item.id)} aria-current={active === item.id ? "page" : undefined}>
            <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
          </button>
        ))}
      </nav>
      <CrudPanel {...channel} />
    </>
  );
}
