import {
  editedGroupRows,
  groupAccessRows,
  groupSettingChanges,
  type GroupAccessRow,
} from "@/lib/skills/sharing";
import { INHERIT } from "@/lib/skills/installationPolicy";

describe("groupAccessRows", () => {
  const ops = {
    group_id: 4,
    group_name: "Ops",
    permission: null,
    choice: "NOT_AVAILABLE" as const,
  };

  it("takes each share from the draft and clears Not available on a new share", () => {
    const rows = groupAccessRows(
      [ops],
      [
        { group_id: 4, group_name: "Ops", permission: "VIEWER" },
        { group_id: 5, group_name: "Sales", permission: "EDITOR" },
      ]
    );

    expect(rows).toEqual([
      { ...ops, permission: "VIEWER", choice: INHERIT },
      {
        group_id: 5,
        group_name: "Sales",
        permission: "EDITOR",
        choice: INHERIT,
      },
    ]);
    expect(groupSettingChanges([ops], rows)).toEqual([
      { group_id: 4, installation_policy: null },
    ]);
  });

  it("shows a group whose share the draft removed as a setting-only row", () => {
    const shared = {
      ...ops,
      permission: "VIEWER" as const,
      choice: "DEFAULT" as const,
    };

    expect(groupAccessRows([shared], [])).toEqual([
      { ...shared, permission: null },
    ]);
  });
});

describe("editedGroupRows", () => {
  it("keeps a stored Not available that the view showed as cleared", () => {
    const stored: GroupAccessRow[] = [
      {
        group_id: 4,
        group_name: "Ops",
        permission: null,
        choice: "NOT_AVAILABLE" as const,
      },
      { group_id: 5, group_name: "Sales", permission: null, choice: INHERIT },
    ];
    const shown = groupAccessRows(stored, [
      { group_id: 4, group_name: "Ops", permission: "VIEWER" },
    ]);
    const next = shown.map((row) =>
      row.group_id === 5 ? { ...row, choice: "DEFAULT" as const } : row
    );

    const rows = editedGroupRows(next, shown, stored);

    expect(rows.map((row) => [row.group_id, row.choice])).toEqual([
      [4, "NOT_AVAILABLE"],
      [5, "DEFAULT"],
    ]);
  });
});
