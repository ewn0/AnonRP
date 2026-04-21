"use client";

import { useEffect } from "react";

// Intervalle entre deux heartbeats (60s)
const INTERVAL_MS = 60_000;

export function HeartbeatProvider() {
  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (cancelled || document.visibilityState === "hidden") return;
      try {
        await fetch("/api/heartbeat", { method: "POST" });
      } catch {
        // Silencieux : pas de souci si un heartbeat échoue
      }
    }

    // Premier ping immédiat
    ping();

    const interval = setInterval(ping, INTERVAL_MS);

    // Ping aussi au retour de l'onglet
    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
