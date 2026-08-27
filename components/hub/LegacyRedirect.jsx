"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LEGACY_ROUTES } from "@/lib/hub/navigation.mjs";

export default function LegacyRedirect({ from }) {
  const router = useRouter();
  const destination = LEGACY_ROUTES[from] || "/";

  useEffect(() => {
    router.replace(destination);
  }, [destination, router]);

  return (
    <main className="hub-legacy-redirect">
      <span>ROUTE MIGRATION / 301</span>
      <h1>This module has a new address.</h1>
      <p>Your data and module behavior remain unchanged.</p>
      <Link href={destination}>Continue to {destination}</Link>
    </main>
  );
}
