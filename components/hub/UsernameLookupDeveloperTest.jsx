"use client";

import { useEffect } from "react";
import { requireSupabase } from "@/lib/supabase/client";

// Temporary authenticated production check. Run this from the browser console
// on any signed-in private Hub page: window.__usernameLookupDeveloperTest()
export default function UsernameLookupDeveloperTest() {
  useEffect(() => {
    const run = async () => {
      const { data, error } = await requireSupabase().functions.invoke("username-lookup", {
        body: { username: "4allx", topSites: 20 },
      });
      const response = error?.context;
      const status = response instanceof Response ? response.status : error ? "FUNCTION_ERROR" : 200;
      let returnedJson = data;

      if (response instanceof Response) {
        try { returnedJson = await response.clone().json(); } catch { returnedJson = null; }
      }

      console.info("username-lookup developer test", { status, json: returnedJson });
      return { status, json: returnedJson };
    };

    window.__usernameLookupDeveloperTest = run;
    return () => { delete window.__usernameLookupDeveloperTest; };
  }, []);

  return null;
}
