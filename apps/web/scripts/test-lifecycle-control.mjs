import assert from "node:assert/strict";

const baseUrl = process.env.LIFECYCLE_TEST_BASE_URL ?? "http://localhost:3002";
const endpoint = `${baseUrl}/api/lifecycle-control`;

async function command(value) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ command: value }),
  });
  return { response, payload: await response.json() };
}

const invalid = await command("RESTART");
assert.equal(invalid.response.status, 400, "Unknown commands must be rejected");

await command("STOP");
const stopped = await fetch(endpoint, { cache: "no-store" }).then((response) => response.json());
assert.equal(stopped.runtime.status, "stopped");
assert.equal(stopped.runtime.currentStage, "stop");

const gatedRoute = `${baseUrl}/platform-readiness/initialize/engine-initialization`;
const gatedResponse = await fetch(gatedRoute);
const gatedHtml = await gatedResponse.text();
assert.equal(gatedResponse.status, 200);
assert.ok(gatedHtml.includes("Validating START handoff"), "STOP must render the INITIALIZE control boundary");
assert.ok(!gatedHtml.includes("ENGINE BUS / INITIALIZATION CHANNEL"), "STOP must prevent Stage 2 workspace mounting");

const started = await command("START");
assert.equal(started.response.status, 200);
assert.ok(["held", "running"].includes(started.payload.runtime.status), "START must activate or safely hold the lifecycle");
assert.equal(started.payload.runtime.currentStage, started.payload.runtime.status === "running" ? "initialize" : "start");

const repeatedStart = await command("START");
assert.equal(repeatedStart.payload.runtime.commandId, started.payload.runtime.commandId, "Repeated START must be idempotent while active");
assert.equal(repeatedStart.payload.runtime.commandSequence, started.payload.runtime.commandSequence);

const commandCentre = await fetch(`${baseUrl}/api/executive/lifecycle-command-centre`, { cache: "no-store" }).then((response) => response.json());
assert.equal(commandCentre.currentStageKey, started.payload.runtime.status === "running" ? "initialize" : "start");
assert.equal(commandCentre.stages.find((stage) => stage.key === "start")?.status, started.payload.runtime.status === "running" ? "completed" : "blocked");

const finalStop = await command("STOP");
assert.equal(finalStop.payload.runtime.status, "stopped");
assert.equal(finalStop.payload.runtime.currentStage, "stop");
assert.ok(finalStop.payload.runtime.commandSequence > started.payload.runtime.commandSequence);

const stoppedSnapshot = await fetch(`${baseUrl}/api/executive/lifecycle-command-centre`, { cache: "no-store" }).then((response) => response.json());
assert.equal(stoppedSnapshot.currentStageKey, "stop");
assert.equal(stoppedSnapshot.stages.find((stage) => stage.key === "stop")?.status, "completed");

console.log(JSON.stringify({
  result: "pass",
  endpoint,
  cases: ["invalid-rejected", "stopped-state", "stage-2-gated", "start-accepted", "start-idempotent", "command-centre-synchronized", "final-stop"],
  startOutcome: started.payload.runtime.status,
  finalStatus: finalStop.payload.runtime.status,
  finalStage: finalStop.payload.runtime.currentStage,
}, null, 2));
