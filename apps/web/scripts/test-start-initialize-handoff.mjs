import assert from "node:assert/strict";

const baseUrl = process.env.HANDOFF_TEST_BASE_URL ?? "http://localhost:3002";
const endpoint = `${baseUrl}/api/platform-readiness/handoff/start-initialize`;
const internalToken = process.env.HANDOFF_TEST_INTERNAL_TOKEN;
const ids = ["database", "messaging", "agents", "operating-mode", "trading-profile", "risk-profile", "broker", "symbol", "market-data", "account", "news", "emergency"];

function checks(status, evidenceSource) {
  return ids.map((id) => ({ id, label: id, required: id !== "news", status, evidenceSource }));
}

async function publish(body, trusted = false) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (trusted && internalToken) headers["x-platform-readiness-attestation"] = internalToken;
  const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
  return { response, payload: await response.json() };
}

const malformed = await publish({ cycleNumber: 1 });
assert.equal(malformed.response.status, 400, "Malformed assessment must be rejected");

const incomplete = await publish({ cycleNumber: 2, checks: checks("passed", "production-adapter").slice(0, 3) });
assert.equal(incomplete.response.status, 201);
assert.equal(incomplete.payload.handoff.decision, "HOLD", "Incomplete evidence must fail closed");
assert.ok(incomplete.payload.handoff.evidence.reasons.some((reason) => reason.includes("Incomplete checklist")));

const forged = await publish({ cycleNumber: 3, checks: checks("passed", "production-adapter") });
assert.equal(forged.payload.handoff.decision, "HOLD", "Unattested browser evidence must never authorize INITIALIZE");

let authorized = null;
if (internalToken) {
  authorized = await publish({ cycleNumber: 3, checks: checks("passed", "production-adapter") }, true);
  assert.equal(authorized.payload.handoff.decision, "AUTHORIZED", "Attested complete production evidence must authorize the handoff");
  assert.equal(authorized.payload.handoff.inputs.operatingMode.state, "verified");
  assert.equal(authorized.payload.handoff.inputs.tradingProfile.state, "verified");
  assert.equal(authorized.payload.handoff.inputs.riskProfile.state, "verified");
  assert.equal(authorized.payload.handoff.integrity.digest.length, 64);

  const authorizedRead = await fetch(endpoint, { cache: "no-store" }).then((response) => response.json());
  assert.equal(authorizedRead.handoff.handoffId, authorized.payload.handoff.handoffId, "GET must return the published envelope");
}

const held = await publish({ cycleNumber: 4, checks: checks("blocked", "unavailable") });
assert.equal(held.payload.handoff.decision, "HOLD", "Unavailable production adapters must restore HOLD");
assert.equal(held.payload.handoff.inputs.operatingMode.state, "unavailable");
assert.equal(held.payload.handoff.inputs.tradingProfile.state, "unavailable");
assert.equal(held.payload.handoff.inputs.riskProfile.state, "unavailable");
assert.equal(held.payload.handoff.inputs.checklist.blocked, ids.length);

const childRoutes = [
  ["/platform-readiness/initialize/engine-initialization", "ENGINE BUS / INITIALIZATION CHANNEL"],
  ["/platform-readiness/initialize/ai-agent-initialization", "Authority &amp; Agent Fabric"],
  ["/platform-readiness/initialize/service-initialization", "Production Infrastructure Map"],
  ["/platform-readiness/initialize/dependency-monitor", "Runtime Dependency Graph"],
  ["/platform-readiness/initialize/configuration-loading", "Manifest Vault"],
  ["/platform-readiness/initialize/initialization-logs", "Initialization Event Stream"],
];

for (const [route, childMarker] of childRoutes) {
  const response = await fetch(`${baseUrl}${route}`);
  const html = await response.text();
  assert.equal(response.status, 200, `${route} must remain reachable`);
  assert.ok(html.includes("Validating START handoff"), `${route} must render the route boundary before authorization`);
  assert.ok(!html.includes(childMarker), `${route} must not mount its Stage 2 workspace while START is HOLD`);
}

const finalRead = await fetch(endpoint, { cache: "no-store" }).then((response) => response.json());
assert.equal(finalRead.handoff.handoffId, held.payload.handoff.handoffId);
assert.equal(finalRead.handoff.decision, "HOLD");

console.log(JSON.stringify({
  result: "pass",
  endpoint,
  cases: ["malformed-rejected", "incomplete-held", "unattested-forgery-held", ...(internalToken ? ["attested-authorized", "get-roundtrip"] : []), "blocked-restored", "child-routes-gated"],
  finalDecision: finalRead.handoff.decision,
  finalCorrelationId: finalRead.handoff.correlationId,
  gatedChildRoutes: childRoutes.length,
}, null, 2));
