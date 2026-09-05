"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CrudPanel from "@/components/hub/CrudPanel";

export default function ModuleWorkspace({ channels }) {
  const [active, setActive] = useState(channels[0].id);
  const searchParams = useSearchParams();
  const requestedChannel = searchParams.get("channel");

  useEffect(() => {
    if (channels.some(({ id }) => id === requestedChannel)) setActive(requestedChannel);
  }, [channels, requestedChannel]);

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
      {channel.sections ? (
        <div className="hub-crud-sections">
          {channel.sections.map((section) => <CrudPanel key={section.id} {...section} />)}
        </div>
      ) : <CrudPanel {...channel} />}
    </>
  );
}
