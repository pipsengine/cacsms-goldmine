export const featureFlags = {
  trading_system_enabled: true,
  administration_enabled: false,
  authentication_enabled: false,
  tenant_isolation_enabled: false,
  role_enforcement_enabled: false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;
