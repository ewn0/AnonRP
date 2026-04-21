"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { xpRequiredForLevel } from "@/lib/xp-utils";

interface Props {
  initialLevel: number;
  initialXp: string;
  initialCoins: number;
  username: string;
  initialInvisible: boolean;
  canToggleInvisible: boolean;
}

export function HeaderStats({
  initialLevel,
  initialXp,
  initialCoins,
  username,
  initialInvisible,
  canToggleInvisible,
}: Props) {
  const [isInvisible, setIsInvisible] = useState(initialInvisible);
  const [toggling, setToggling] = useState(false);

  // Poll léger toutes les 30s pour rafraîchir niveau/coins
  const [level, setLevel] = useState(initialLevel);
  const [xp, setXp] = useState(BigInt(initialXp));
  const [coins, setCoins] = useState(initialCoins);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch(`/api/users/${username}/stats`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setLevel(data.level);
        setXp(BigInt(data.xp));
        setCoins(data.coins);
      } catch {}
    }
    const interval = setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [username]);

  // Calcul barre XP
  const xpAtCurrentLevel = xpRequiredForLevel(level);
  const xpAtNextLevel = xpRequiredForLevel(level + 1);
  const xpIntoLevel = xp - xpAtCurrentLevel;
  const xpForThisLevel = xpAtNextLevel - xpAtCurrentLevel;
  const percent =
    xpForThisLevel > BigInt(0)
      ? Number((xpIntoLevel * BigInt(10000)) / xpForThisLevel) / 100
      : 0;
  const clampedPercent = Math.max(0, Math.min(100, percent));

  async function toggleInvisible() {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch("/api/users/me/invisible", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isInvisible: !isInvisible }),
      });
      if (res.ok) {
        setIsInvisible(!isInvisible);
      }
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Niveau + barre XP */}
      <Link
        href={`/u/${username}`}
        className="hidden md:flex items-center gap-2 text-xs hover:opacity-80 transition-opacity"
        title={`Niveau ${level} · ${xpIntoLevel.toString()} / ${xpForThisLevel.toString()} XP`}
      >
        <span className="font-semibold">niv. {level}</span>
        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-purple-400 transition-all"
            style={{ width: `${clampedPercent}%` }}
          />
        </div>
      </Link>

      {/* Coins */}
      <Link
        href="/store"
        className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
        title="AnonCoins"
      >
        <span className="text-amber-400">💰</span>
        <span className="font-semibold">{coins.toLocaleString("fr-FR")}</span>
      </Link>

      {/* Toggle invisible (ADMIN only) */}
      {canToggleInvisible && (
        <button
          type="button"
          onClick={toggleInvisible}
          disabled={toggling}
          title={isInvisible ? "Actuellement invisible — clique pour redevenir visible" : "Clique pour te rendre invisible"}
          className={`p-1.5 rounded-md transition-colors ${
            isInvisible
              ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          {isInvisible ? "👁️‍🗨️" : "👁️"}
        </button>
      )}
    </div>
  );
}
