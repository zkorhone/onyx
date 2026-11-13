import type {
  CustomSkill,
  SkillGroupShare,
  SkillSharePermission,
} from "@/lib/skills/types";
import type {
  SkillGroupSettingPayload,
  SkillShareUpdatePayload,
} from "@/lib/skills/api";
import {
  INHERIT,
  fromPolicyChoice,
  type PolicyChoice,
} from "@/lib/skills/installationPolicy";

export type SkillSharingDraft = Pick<
  CustomSkill,
  | "name"
  | "owner"
  | "ownership_vacant"
  | "user_permission"
  | "user_shares"
  | "group_shares"
  | "public_permission"
  | "installation_policy"
> & {
  external_app: Pick<NonNullable<CustomSkill["external_app"]>, "name"> | null;
};

/** The author, or an organization-wide skill manager, changes organization
 * access: publish, and publish an update. An editor only saves versions. */
export function canChangeOrganizationAccess(
  skill: Pick<CustomSkill, "user_permission">,
  isOrganizationManager: boolean
): boolean {
  return (
    skill.user_permission === "OWNER" ||
    (isOrganizationManager && skill.user_permission === "EDITOR")
  );
}

/** A published skill whose current version the organization does not run. */
export function hasUnpublishedChanges(
  skill: Pick<
    CustomSkill,
    "current_version_number" | "published_version_number"
  >
): boolean {
  return (
    skill.published_version_number !== null &&
    skill.current_version_number !== null &&
    skill.current_version_number > skill.published_version_number
  );
}

export function emptySkillSharingDraft(
  name: string,
  owner: SkillSharingDraft["owner"]
): SkillSharingDraft {
  return {
    name,
    owner,
    ownership_vacant: false,
    user_permission: "OWNER",
    user_shares: [],
    group_shares: [],
    public_permission: null,
    installation_policy: null,
    external_app: null,
  };
}

export function serializeSkillSharing(
  draft: SkillSharingDraft,
  isAdmin: boolean,
  isOrganizationManager: boolean
): SkillShareUpdatePayload {
  return {
    installation_policy: isAdmin ? draft.installation_policy : undefined,
    public_permission:
      !draft.external_app &&
      canChangeOrganizationAccess(draft, isOrganizationManager)
        ? draft.public_permission
        : undefined,
    user_shares: draft.user_shares
      .filter((share) => share.user.id !== draft.owner?.id)
      .map((share) => ({
        user_id: share.user.id,
        permission: share.permission,
      })),
    group_shares: draft.group_shares.map((share) => ({
      group_id: share.group_id,
      permission: share.permission,
    })),
  };
}

/** One row of the Group Access editor. */
export interface GroupAccessRow {
  group_id: number;
  group_name: string;
  /** Null for a group with no share. */
  permission: SkillSharePermission | null;
  choice: PolicyChoice;
}

/** The group settings to send: a changed row, a new row with a setting, and
 * null for a removed row that had one. */
export function groupSettingChanges(
  initial: readonly GroupAccessRow[],
  current: readonly GroupAccessRow[]
): SkillGroupSettingPayload[] {
  const before = new Map(initial.map((row) => [row.group_id, row.choice]));
  const changes: SkillGroupSettingPayload[] = current
    .filter((row) => row.choice !== (before.get(row.group_id) ?? INHERIT))
    .map((row) => ({
      group_id: row.group_id,
      installation_policy: fromPolicyChoice(row.choice),
    }));
  const kept = new Set(current.map((row) => row.group_id));
  for (const row of initial) {
    if (!kept.has(row.group_id) && row.choice !== INHERIT) {
      changes.push({ group_id: row.group_id, installation_policy: null });
    }
  }
  return changes;
}

/** The Group Access rows to show: each settings row with its share from the
 * share draft, then each shared group with no settings row. A group with a
 * share cannot be Not available, so a new share clears that choice. */
export function groupAccessRows(
  rows: readonly GroupAccessRow[],
  shares: readonly SkillGroupShare[]
): GroupAccessRow[] {
  const permissionOf = new Map(
    shares.map((share) => [share.group_id, share.permission])
  );
  const shown: GroupAccessRow[] = rows.map((row) => {
    const permission = permissionOf.get(row.group_id) ?? null;
    const choice =
      permission !== null && row.choice === "NOT_AVAILABLE"
        ? INHERIT
        : row.choice;
    return { ...row, permission, choice };
  });
  const present = new Set(shown.map((row) => row.group_id));
  for (const share of shares) {
    if (present.has(share.group_id)) continue;
    shown.push({
      group_id: share.group_id,
      group_name: share.group_name,
      permission: share.permission,
      choice: INHERIT,
    });
  }
  return shown;
}

/** The settings rows to store after an edit of the shown rows. A row whose
 * choice the user did not change keeps its stored choice, so the shown
 * "Not available" clearing of a staged share is not saved. */
export function editedGroupRows(
  next: readonly GroupAccessRow[],
  shown: readonly GroupAccessRow[],
  stored: readonly GroupAccessRow[]
): GroupAccessRow[] {
  const shownChoice = new Map(shown.map((row) => [row.group_id, row.choice]));
  const storedRow = new Map(stored.map((row) => [row.group_id, row]));
  return next.map((row) => {
    const before = storedRow.get(row.group_id);
    return before && row.choice === shownChoice.get(row.group_id)
      ? { ...row, choice: before.choice }
      : row;
  });
}
