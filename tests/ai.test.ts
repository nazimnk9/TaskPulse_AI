import { describe, it, expect } from "vitest";
import { generateTaskBreakdown } from "../src/lib/ai";

describe("AI Task Decomposition Engine", () => {
  it("decomposes a user story with structured subtasks, acceptance criteria, and points", async () => {
    const prompt = "Build a password reset feature with secure email verification tokens";
    const result = await generateTaskBreakdown(prompt);

    expect(result).toBeDefined();
    expect(result.title).toBeTruthy();
    expect(["LOW", "MEDIUM", "HIGH", "URGENT"]).toContain(result.priority);
    expect([1, 2, 3, 5, 8]).toContain(result.storyPoints);
    expect(result.subtasks.length).toBeGreaterThanOrEqual(2);
    expect(result.acceptanceCriteria.length).toBeGreaterThanOrEqual(2);
    expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(1);
    expect(result.metadata.limitations.length).toBeGreaterThan(0);
  });

  it("assigns URGENT priority to prompt containing severe production failure keywords", async () => {
    const prompt = "Critical security vulnerability causing crash and potential data loss in database connection pool";
    const result = await generateTaskBreakdown(prompt);

    expect(result.priority).toBe("URGENT");
  });
});
