import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/app.js";
import { Store } from "../src/store.js";
const token = "local-test-only-token";
function fixture() {
  const store = new Store();
  return { store, app: createApp(store, token) };
}
test("health and seed flags", async () => {
  const { app } = fixture();
  assert.equal((await request(app).get("/api/health")).status, 200);
  assert.equal((await request(app).get("/api/flags")).body.length, 3);
});
test("evaluate validates context", async () => {
  const { app } = fixture();
  assert.equal(
    (
      await request(app)
        .post("/api/evaluate/smart-search")
        .send({ subject: "x" })
    ).status,
    400,
  );
});
test("unknown evaluation fails closed", async () => {
  const { app } = fixture();
  const r = await request(app)
    .post("/api/evaluate/missing")
    .send({ subject: "x", plan: "pro" });
  assert.equal(r.body.value, false);
  assert.equal(r.body.reason, "flag_not_found");
});
test("mutation requires exact token", async () => {
  const { app, store } = fixture();
  for (const supplied of ["", "Bearer wrong", "Bearer " + token + "extra"]) {
    const r = await request(app)
      .put("/api/flags/smart-search")
      .set("Authorization", supplied)
      .send(store.get("smart-search"));
    assert.equal(r.status, 401);
  }
});
test("save advances version and audit", async () => {
  const { app, store } = fixture();
  const r = await request(app)
    .put("/api/flags/smart-search")
    .set("Authorization", "Bearer " + token)
    .send({ ...store.get("smart-search"), rollout: 50 });
  assert.equal(r.status, 200);
  assert.equal(r.body.version, 2);
  assert.equal(store.audit()[0].rollout, 50);
});
test("stale writes cannot overwrite saved state", async () => {
  const { app, store } = fixture();
  const original = store.get("smart-search")!;
  store.update(original.key, { ...original, rollout: 20 });
  const r = await request(app)
    .put("/api/flags/smart-search")
    .set("Authorization", "Bearer " + token)
    .send({ ...original, rollout: 90 });
  assert.equal(r.status, 409);
  assert.equal(store.get(original.key)!.rollout, 20);
});
test("key mismatch and malformed flag are rejected", async () => {
  const { app, store } = fixture();
  const r = await request(app)
    .put("/api/flags/other")
    .set("Authorization", "Bearer " + token)
    .send(store.get("smart-search"));
  assert.equal(r.status, 400);
  assert.equal(
    (
      await request(app)
        .put("/api/flags/smart-search")
        .set("Authorization", "Bearer " + token)
        .send({})
    ).status,
    400,
  );
});
test("unknown update gives 404", async () => {
  const { app, store } = fixture();
  const r = await request(app)
    .put("/api/flags/new-flag")
    .set("Authorization", "Bearer " + token)
    .send({ ...store.get("smart-search"), key: "new-flag" });
  assert.equal(r.status, 404);
});
test("malformed JSON gives 400 without stack", async () => {
  const { app } = fixture();
  const r = await request(app)
    .post("/api/evaluate/x")
    .set("Content-Type", "application/json")
    .send("{");
  assert.equal(r.status, 400);
  assert.equal(r.body.error, "Invalid JSON");
});
test("defensive copies cannot mutate store", () => {
  const { store } = fixture();
  store.list()[0].rollout = 99;
  assert.equal(store.get("smart-search")!.rollout, 35);
});
test("saved state and audit survive restart", () => {
  const dir = mkdtempSync(join(tmpdir(), "flag-test-"));
  try {
    const path = join(dir, "state.json");
    const a = new Store(path);
    const f = a.get("smart-search")!;
    a.update(f.key, { ...f, rollout: 70 });
    const b = new Store(path);
    assert.equal(b.get(f.key)!.rollout, 70);
    assert.equal(b.audit().length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
