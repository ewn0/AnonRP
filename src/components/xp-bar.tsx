import { xpRequiredForLevel } from "@/lib/xp-utils";

interface Props {
  level: number;
  xp: bigint | number | string;
}

export function XpBar({ level, xp }: Props) {
  const currentXp = typeof xp === "bigint" ? xp : BigInt(xp);

  const xpAtCurrentLevel = xpRequiredForLevel(level);
  const xpAtNextLevel = xpRequiredForLevel(level + 1);

  const xpIntoLevel = currentXp - xpAtCurrentLevel;
  const xpForThisLevel = xpAtNextLevel - xpAtCurrentLevel;

  const percent =
    xpForThisLevel > BigInt(0)
      ? Number((xpIntoLevel * BigInt(10000)) / xpForThisLevel) / 100
      : 0;
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline text-xs">
        <span className="font-semibold">Niveau {level}</span>
        <span className="text-muted-foreground">
          {xpIntoLevel.toString()} / {xpForThisLevel.toString()} XP
        </span>
      </div>

      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-purple-400 transition-all duration-500"
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}
