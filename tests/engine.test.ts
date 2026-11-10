import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bucket,
  evaluate,
  FlagSchema,
  ContextSchema,
  seed,
} from "../src/engine.js";
const ctx = { subject: "synthetic-42", plan: "pro" as const };
const flag = seed[0];
test("bucket is stable and bounded", () => {
  const n = bucket("flag", "person");
  assert.equal(n, bucket("flag", "person"));
  assert.ok(n >= 0 && n < 10000);
});
test("tuple encoding prevents key/subject concatenation collisions", () =>
  assert.notEqual(bucket("ab", "c"), bucket("a", "bc")));
test("unknown flags fail closed", () =>
  assert.equal(evaluate(undefined, ctx).reason, "flag_not_found"));
test("disabled overrides full rollout", () =>
  assert.equal(
    evaluate({ ...flag, enabled: false, rollout: 100 }, ctx).value,
    false,
  ));
test("non-targeted plans are rejected", () =>
  assert.equal(
    evaluate(flag, { ...ctx, plan: "free" }).reason,
    "plan_not_targeted",
  ));
test("empty plan list means all", () =>
  assert.equal(
    evaluate({ ...flag, plans: [], rollout: 100 }, { ...ctx, plan: "free" })
      .value,
    true,
  ));
test("zero rollout rejects everyone", () => {
  for (let i = 0; i < 100; i++)
    assert.equal(
      evaluate({ ...flag, rollout: 0 }, { ...ctx, subject: String(i) }).value,
      false,
    );
});
test("full rollout includes everyone targeted", () => {
  for (let i = 0; i < 100; i++)
    assert.equal(
      evaluate({ ...flag, rollout: 100 }, { ...ctx, subject: String(i) }).value,
      true,
    );
});
test("rollout is monotonic for fixed subject", () => {
  let seen = false;
  for (let r = 0; r <= 100; r++) {
    const on = evaluate({ ...flag, rollout: r }, ctx).value;
    if (seen) assert.equal(on, true);
    seen = on;
  }
});
test("rollout returns both outcomes over fixture cohort", () => {
  const values = new Set(
    Array.from(
      { length: 100 },
      (_, i) => evaluate(flag, { ...ctx, subject: "u" + i }).value,
    ),
  );
  assert.equal(values.size, 2);
});
test("negative/fractional/oversize percentages invalid", () => {
  for (const rollout of [-1, 1.5, 101])
    assert.equal(FlagSchema.safeParse({ ...flag, rollout }).success, false);
});
test("unknown fields and plans invalid", () => {
  assert.equal(FlagSchema.safeParse({ ...flag, secret: "no" }).success, false);
  assert.equal(
    ContextSchema.safeParse({ ...ctx, plan: "admin" }).success,
    false,
  );
});
test("evaluation never returns subject", () =>
  assert.ok(!JSON.stringify(evaluate(flag, ctx)).includes(ctx.subject)));
