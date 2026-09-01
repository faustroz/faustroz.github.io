"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Phone } from "lucide-react";
import DigitalFootprintGraph from "@/components/hub/DigitalFootprintGraph";
import OsintCaseWorkspace from "@/components/hub/OsintCaseWorkspace";
import UsernameLookupPanel from "@/components/hub/UsernameLookupPanel";
import UsernameVariationsPanel from "@/components/hub/UsernameVariationsPanel";

export default function OsintWorkspace() {
  const [sessionFindings, setSessionFindings] = useState([]);
  const mergeFindings = (rows) => setSessionFindings((current) => [...current, ...(rows || [])].slice(-60));
  return <div className="hub-osint-workspace">
    <Link className="hub-specialist-link hub-reveal hub-reveal--1" href="/phone-lookup"><Phone aria-hidden="true" /><div><span>OSINT UTILITY</span><h2>Phone Lookup</h2><p>Check one number for its available profile, tags, and provider quota.</p></div><ArrowUpRight aria-hidden="true" /></Link>
    <UsernameLookupPanel onFindings={mergeFindings} />
    <UsernameVariationsPanel onFindings={mergeFindings} />
    <DigitalFootprintGraph findings={sessionFindings} title="Current session" />
    <OsintCaseWorkspace />
  </div>;
}
