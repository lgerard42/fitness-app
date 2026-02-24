import {
  DEFAULT_SCORE_POLICY,
  NORMALIZED_POLICY,
  STRICT_POLICY,
  createScorePolicy,
} from "../policy/scorePolicy";

describe("Score Policy", () => {
  it("DEFAULT_SCORE_POLICY has expected values", () => {
    expect(DEFAULT_SCORE_POLICY.clampMin).toBe(0);
    expect(DEFAULT_SCORE_POLICY.clampMax).toBe(5);
    expect(DEFAULT_SCORE_POLICY.normalizeOutput).toBe(false);
    expect(DEFAULT_SCORE_POLICY.missingKeyBehavior).toBe("skip");
    expect(DEFAULT_SCORE_POLICY.outputMode).toBe("raw");
  });

  it("NORMALIZED_POLICY enables normalization", () => {
    expect(NORMALIZED_POLICY.normalizeOutput).toBe(true);
    expect(NORMALIZED_POLICY.outputMode).toBe("normalized");
  });

  it("STRICT_POLICY uses error behavior", () => {
    expect(STRICT_POLICY.missingKeyBehavior).toBe("error");
  });

  it("createScorePolicy merges overrides", () => {
    const custom = createScorePolicy({
      clampMax: 10,
      normalizeOutput: true,
    });
    expect(custom.clampMax).toBe(10);
    expect(custom.normalizeOutput).toBe(true);
    expect(custom.clampMin).toBe(0);
    expect(custom.missingKeyBehavior).toBe("skip");
  });

  it("createScorePolicy with no args returns defaults", () => {
    const policy = createScorePolicy();
    expect(policy).toEqual(DEFAULT_SCORE_POLICY);
  });
});
