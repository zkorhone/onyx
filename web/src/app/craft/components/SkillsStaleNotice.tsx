"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, MessageCard } from "@opal/components";
import { SvgRefreshCw } from "@opal/icons";
import { toast } from "@opal/layouts";
import { useBuildSessionStore } from "@/app/craft/hooks/useBuildSessionStore";
import {
  fetchSession,
  reloadSessionSkills,
} from "@/app/craft/services/apiServices";
import type { ApiSessionSkillsState } from "@/app/craft/types/streamingTypes";

interface SkillsStaleNoticeProps {
  sessionId: string;
  turnActive: boolean;
}

export default function SkillsStaleNotice({
  sessionId,
  turnActive,
}: SkillsStaleNoticeProps) {
  const t = useTranslations("craft.skillsStale");
  const [reloading, setReloading] = useState(false);
  const updateSessionData = useBuildSessionStore(
    (state) => state.updateSessionData
  );
  const reload = async () => {
    setReloading(true);
    const revisions = () => {
      const session = useBuildSessionStore.getState().sessions.get(sessionId);
      return [session?.skillsStaleRevision, session?.skillOmissionsRevision];
    };
    const [staleBefore, omissionsBefore] = revisions();
    try {
      let state: ApiSessionSkillsState = await reloadSessionSkills(sessionId);
      const [staleNow, omissionsNow] = revisions();
      if (staleNow !== staleBefore || omissionsNow !== omissionsBefore) {
        // A read landed during the reload and may predate it; read again.
        state = await fetchSession(sessionId, { checkWorkspace: false });
      }
      updateSessionData(sessionId, {
        skillsStale: state.skills_stale,
        skillOmissions: state.skill_omissions,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("toast.reloadFailed")
      );
    } finally {
      setReloading(false);
    }
  };

  if (turnActive) return null;

  return (
    <MessageCard
      variant="info"
      title={t("notice.title")}
      description={t("notice.description")}
      rightChildren={
        <Button icon={SvgRefreshCw} onClick={reload} disabled={reloading}>
          {reloading ? t("reload.inProgress") : t("reload.button")}
        </Button>
      }
    />
  );
}
