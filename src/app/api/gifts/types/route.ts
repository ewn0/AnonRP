// GET /api/gifts/types
// Liste des types de cadeaux disponibles (pour la modale)

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const types = await db.giftType.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      iconUrl: true,
      costCoins: true,
      xpBoostPercent: true,
    },
  });

  return NextResponse.json({ types });
}
