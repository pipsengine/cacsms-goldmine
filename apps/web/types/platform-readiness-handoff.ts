export type StartCheckStatus = "passed" | "warning" | "blocked";

export type StartCheckEvidence = {
  id: string;
  label: string;
  required: boolean;
  status: StartCheckStatus;
  evidenceSource: "production-adapter" | "unavailable";
};

export type StartAssessmentRequest = {
  cycleNumber: number;
  checks: StartCheckEvidence[];
};

export type StageInputState = "verified" | "unavailable";

export type StartInitializeHandoff = {
  schemaVersion: "start-initialize/v1";
  handoffId: string;
  correlationId: string;
  sequence: number;
  sourceStage: "START";
  targetStage: "INITIALIZE";
  decision: "AUTHORIZED" | "HOLD";
  issuedAt: string;
  expiresAt: string;
  inputs: {
    operatingMode: {
      value: "production" | null;
      state: StageInputState;
      source: "platform-readiness.start.operating-mode";
    };
    tradingProfile: {
      symbol: "XAUUSD" | null;
      sessionPolicy: string | null;
      strategyPolicy: string | null;
      state: StageInputState;
      source: "platform-readiness.start.trading-profile";
    };
    riskProfile: {
      profile: "Conservative";
      configuredRiskPerTrade: "0.50%";
      effectiveMultiplier: "0.00x" | "1.00x";
      state: StageInputState;
      source: "platform-readiness.start.risk-profile";
    };
    checklist: {
      cycleNumber: number;
      total: number;
      required: number;
      passed: number;
      blocked: number;
      warning: number;
      checks: StartCheckEvidence[];
    };
  };
  evidence: {
    auditIdentity: "audit.platform-readiness.start.handoff";
    allRequiredPassed: boolean;
    productionEvidenceComplete: boolean;
    reasons: string[];
  };
  integrity: {
    algorithm: "sha256";
    digest: string;
  };
};

export type StartInitializeHandoffResponse = {
  status: "available" | "absent";
  handoff: StartInitializeHandoff | null;
};
