import { navigationItems } from "./navigation";

export const routeMetadata = Object.fromEntries(
  navigationItems.map((item) => [
    item.route,
    {
      id: item.id,
      label: item.label,
      permission: item.permission,
      statusSource: item.statusSource,
      alertSource: item.alertSource,
      auditIdentity: `audit.${item.id}`,
      lifecycleStage: item.lifecycleStage,
      administrationPhase: item.administrationPhase,
    },
  ]),
) as Record<
  string,
  {
    id: string;
    label: string;
    permission: string;
    statusSource: string;
    alertSource: string;
    auditIdentity: string;
    lifecycleStage: string;
    administrationPhase: string;
  }
>;
