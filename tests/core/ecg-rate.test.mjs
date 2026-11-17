import assert from "node:assert/strict";
import test from "node:test";
import { buildRateQuestion, generateRateStrip, BIG_BOX_SEC } from "../../lib/hub/ecg-rate.mjs";

test("every question has one correct rate among four distinct options", () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    for (const method of ["all", "big", "small"]) {
      const q = buildRateQuestion(seed, method);
      assert.equal(q.options.length, 4, `seed ${seed} ${method}`);
      assert.equal(new Set(q.options).size, 4);
      assert.ok(q.options.includes(q.rate));
      assert.equal(q.rate, Math.round((q.method === "big" ? 300 : 1500) / q.boxes));
      if (method !== "all") assert.equal(q.method, method);
    }
  }
});

test("rate matches the R-R interval drawn on 25 mm/s paper", () => {
  const big = buildRateQuestion(3, "big");
  assert.equal(big.rrSec, big.boxes * 0.2);
  assert.equal(Math.round(60 / big.rrSec), big.rate);
  const small = buildRateQuestion(4, "small");
  assert.ok(Math.abs(small.rrSec - small.boxes * 0.04) < 1e-9);
  assert.ok(Math.abs(60 / small.rrSec - 1500 / small.boxes) < 1e-9);
});

test("generated strip has R waves exactly one R-R apart, R1 on a bold grid line", () => {
  for (const [seed, method] of [[1, "big"], [2, "small"], [9, "big"], [11, "small"]]) {
    const q = buildRateQuestion(seed, method);
    const { gen, startSec, r1Sec, r2Sec } = generateRateStrip(q);
    assert.ok(Math.abs(r2Sec - r1Sec - q.rrSec) < 1e-9);
    assert.ok(Math.abs((r1Sec - startSec) / BIG_BOX_SEC - 2) < 1e-9);
    const r2Index = Math.round(r2Sec * gen.fs);
    const window = Array.from(gen.leads.II.slice(r2Index - 25, r2Index + 25));
    // Baseline noise can move the sampled maximum by a sample or two (< 1 px on screen).
    assert.ok(Math.abs(window.indexOf(Math.max(...window)) - 25) <= 3, "R2 is the local peak");
  }
});
