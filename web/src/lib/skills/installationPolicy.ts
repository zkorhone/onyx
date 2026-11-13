import type { SkillInstallationPolicy } from "@/lib/skills/types";

/** Most open first, as Claude lists them. */
export const INSTALLATION_POLICIES: readonly SkillInstallationPolicy[] = [
  "REQUIRED",
  "DEFAULT",
  "AVAILABLE",
  "NOT_AVAILABLE",
];
