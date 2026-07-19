import { navigationItems } from "./navigation";

export const permissions = Object.fromEntries(
  navigationItems.map((item) => [item.permission, { pageId: item.id, route: item.route }]),
) as Record<string, { pageId: string; route: string }>;
