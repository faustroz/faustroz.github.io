"use client";

import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";

export default function PwaBootstrap() {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [updateReady, setUpdateReady] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    let active = true;
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    const register = async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        const nextRegistration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (!active) return;
        setRegistration(nextRegistration);
        if (nextRegistration.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
        nextRegistration.addEventListener("updatefound", () => {
          const worker = nextRegistration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
          });
        });
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      } catch {
        // PWA enhancement is intentionally non-blocking for the private app.
      }
    };
    register();

    return () => {
      active = false;
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const showStatus = pathname !== "/" && !pathname?.startsWith("/finance/portfolio");
  if (!showStatus || (online && !updateReady)) return null;

  const applyUpdate = () => {
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <aside className="hub-pwa-status" role="status" aria-live="polite">
      {updateReady ? <RefreshCw aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
      <span>{updateReady ? "SYSTEM UPDATE READY" : "OFFLINE / PRIVATE DATA UNAVAILABLE"}</span>
      {updateReady && <button type="button" onClick={applyUpdate}>RELOAD</button>}
    </aside>
  );
}
