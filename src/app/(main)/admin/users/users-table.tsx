"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  emailVerified: Date | null;
  isBanned: boolean;
  banReason: string | null;
  role: "MEMBER" | "MODERATOR" | "ADMIN";
  level: number;
  coins: number;
  premiumTier: string | null;
  createdAt: Date;
  lastSeenAt: Date;
}

export function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function doAction(userId: string, body: any, successMsg?: string) {
    setProcessingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...body }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur");
        return;
      }
      if (successMsg) {
        // Petite confirmation visuelle
      }
      router.refresh();
    } finally {
      setProcessingId(null);
    }
  }

  async function verifyEmail(u: User) {
    await doAction(u.id, { action: "verify_email" }, "Email vérifié");
  }

  async function toggleBan(u: User) {
    if (u.isBanned) {
      if (!confirm(`Débannir @${u.username} ?`)) return;
      await doAction(u.id, { action: "unban" });
    } else {
      const reason = prompt(`Raison du bannissement de @${u.username} ?`);
      if (!reason) return;
      await doAction(u.id, { action: "ban", reason });
    }
  }

  async function changeRole(u: User) {
    const newRole = prompt(
      `Nouveau rôle pour @${u.username}?\n\nTape : MEMBER, MODERATOR, ou ADMIN`,
      u.role
    )?.trim().toUpperCase();
    if (!newRole || !["MEMBER", "MODERATOR", "ADMIN"].includes(newRole)) return;
    if (newRole === u.role) return;
    await doAction(u.id, { action: "set_role", role: newRole });
  }

  async function adjustCoins(u: User) {
    const amountStr = prompt(`Ajuster les coins de @${u.username} (solde actuel : ${u.coins})\n\nEntre un montant (négatif pour retirer) :`);
    const amount = parseInt(amountStr ?? "", 10);
    if (isNaN(amount) || amount === 0) return;
    const reason = prompt("Raison :") || "Ajustement admin";
    await doAction(u.id, { action: "adjust_coins", amount, reason });
  }

  if (users.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-border rounded-lg">
        Aucun utilisateur ne correspond.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30">
          <tr className="text-left">
            <th className="p-3 font-medium">Utilisateur</th>
            <th className="p-3 font-medium">Statut</th>
            <th className="p-3 font-medium">Niveau</th>
            <th className="p-3 font-medium">Coins</th>
            <th className="p-3 font-medium">Créé</th>
            <th className="p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            const processing = processingId === u.id;

            return (
              <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                <td className="p-3">
                  <div className="font-semibold">
                    <Link href={`/u/${u.username}`} className="hover:text-primary">
                      @{u.username}
                    </Link>
                    {isSelf && <span className="text-xs text-primary ml-2">(toi)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    {u.role !== "MEMBER" && (
                      <span className={`text-xs px-1.5 py-0.5 rounded w-fit ${u.role === "ADMIN" ? "bg-destructive/20 text-destructive" : "bg-blue-500/20 text-blue-400"}`}>
                        {u.role}
                      </span>
                    )}
                    {!u.emailVerified && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 w-fit">
                        ⚠️ Non vérifié
                      </span>
                    )}
                    {u.isBanned && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/20 text-destructive w-fit" title={u.banReason || ""}>
                        🚫 Banni
                      </span>
                    )}
                    {u.premiumTier && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 w-fit">
                        ⭐ {u.premiumTier}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">{u.level}</td>
                <td className="p-3">{u.coins.toLocaleString()}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {!u.emailVerified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyEmail(u)}
                        disabled={processing}
                        title="Vérifier l'email manuellement"
                      >
                        ✓ Vérif
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => adjustCoins(u)}
                      disabled={processing}
                    >
                      💰
                    </Button>
                    {!isSelf && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => changeRole(u)}
                        disabled={processing}
                      >
                        👤
                      </Button>
                    )}
                    {!isSelf && (
                      <Button
                        size="sm"
                        variant={u.isBanned ? "outline" : "destructive"}
                        onClick={() => toggleBan(u)}
                        disabled={processing}
                      >
                        {u.isBanned ? "Déban" : "🚫"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
