import { useTranslations } from "next-intl";
import type { SelectOption } from "@opal/components";
import { usePermissionAuthority } from "@/lib/permissions/hooks";
import { useSettings } from "@/lib/settings/hooks";
import { PluginPublishingPolicy } from "@/lib/settings/types";
import { Permission } from "@/lib/types";
import {
  INHERIT,
  INSTALLATION_POLICIES,
  type InheritOption,
} from "@/lib/skills/installationPolicy";
import type { SkillInstallationPolicy } from "@/lib/skills/types";

export type PublishAction = "publish" | "review" | "off";

/** What publishing a skill does for the current user. */
export function usePublishAction(): PublishAction {
  const { isGlobalHolder } = usePermissionAuthority(Permission.MANAGE_PLUGINS);
  const { plugin_publishing: policy } = useSettings();
  if (isGlobalHolder) return "publish";
  if (policy === PluginPublishingPolicy.REQUIRES_REVIEW) return "review";
  if (policy === PluginPublishingPolicy.OFF) return "off";
  return "publish";
}

/** The one set of level labels and help text. */
export function useInstallationPolicyCopy() {
  const t = useTranslations("skills.installationPolicy");
  return {
    label: (policy: SkillInstallationPolicy) => t(`${policy}.label`),
    description: (policy: SkillInstallationPolicy) =>
      t(`${policy}.description`),
  };
}

interface PolicyOptionsConfig {
  levels?: readonly SkillInstallationPolicy[];
  inherit?: InheritOption;
}

/** The select options of an install setting, with an optional "no own
 * setting" option first. */
export function usePolicyOptions({
  levels = INSTALLATION_POLICIES,
  inherit,
}: PolicyOptionsConfig = {}): SelectOption[] {
  const t = useTranslations("skills.installationPolicy.inherit");
  const copy = useInstallationPolicyCopy();
  const options: SelectOption[] = levels.map((policy) => ({
    value: policy,
    title: copy.label(policy),
    description: copy.description(policy),
  }));
  if (!inherit) return options;
  return [
    {
      value: INHERIT,
      title:
        inherit.policy === null
          ? t("label", { scope: inherit.scope })
          : t("labelWithPolicy", {
              scope: inherit.scope,
              policy: copy.label(inherit.policy),
            }),
      description: t("description", { scope: inherit.scope }),
    },
    ...options,
  ];
}
