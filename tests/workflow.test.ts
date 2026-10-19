import { describe, it, expect } from "vitest";
import {
  validateStatusTransition,
  calculateTaskRisk,
  SubtaskItem,
} from "../src/lib/workflow";

describe("Workflow State Machine & Business Invariants", () => {
  it("allows valid forward transitions in the agile lifecycle", () => {
    // BACKLOG -> TODO
    const r1 = validateStatusTransition("BACKLOG", "TODO");
    expect(r1.allowed).toBe(true);

    // TODO -> IN_PROGRESS
    const r2 = validateStatusTransition("TODO", "IN_PROGRESS");
    expect(r2.allowed).toBe(true);

    // IN_PROGRESS -> IN_REVIEW
    const r3 = validateStatusTransition("IN_PROGRESS", "IN_REVIEW");
    expect(r3.allowed).toBe(true);

    // IN_REVIEW -> DONE (with no subtasks)
    const r4 = validateStatusTransition("IN_REVIEW", "DONE", []);
    expect(r4.allowed).toBe(true);
  });

  it("permits moving backward from IN_REVIEW to IN_PROGRESS when changes are requested", () => {
    const result = validateStatusTransition("IN_REVIEW", "IN_PROGRESS");
    expect(result.allowed).toBe(true);
  });

  it("blocks illegal transitions that bypass required workflow phases", () => {
    // BACKLOG directly to DONE is forbidden
    const result = validateStatusTransition("BACKLOG", "DONE");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Direct transition from BACKLOG to DONE is not permitted");
  });

  it("STRICT BUSINESS RULE: Rejects transitioning to DONE if open subtasks exist", () => {
    const subtasks: SubtaskItem[] = [
      { id: "1", title: "Write unit tests", isCompleted: true },
      { id: "2", title: "Run security audit", isCompleted: false }, // blocker!
    ];

    const result = validateStatusTransition("IN_REVIEW", "DONE", subtasks);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("1 subtask(s) are still incomplete");
    expect(result.blockingSubtasks).toHaveLength(1);
    expect(result.blockingSubtasks![0].title).toBe("Run security audit");
  });

  it("STRICT BUSINESS RULE: Allows transition to DONE once all subtasks are checked", () => {
    const subtasks: SubtaskItem[] = [
      { id: "1", title: "Write unit tests", isCompleted: true },
      { id: "2", title: "Run security audit", isCompleted: true },
    ];

    const result = validateStatusTransition("IN_REVIEW", "DONE", subtasks);
    expect(result.allowed).toBe(true);
    expect(result.blockingSubtasks).toBeUndefined();
  });
});

describe("Deadline Risk Calculation Engine", () => {
  it("marks completed tasks as ON_TRACK with 100% completion", () => {
    const risk = calculateTaskRisk("DONE", "HIGH", new Date());
    expect(risk.riskLevel).toBe("ON_TRACK");
    expect(risk.completionRate).toBe(100);
  });

  it("detects overdue tasks and computes negative day offset", () => {
    const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2);
    const risk = calculateTaskRisk("IN_PROGRESS", "URGENT", yesterday, [
      { title: "Subtask 1", isCompleted: false },
    ]);

    expect(risk.riskLevel).toBe("OVERDUE");
    expect(risk.daysRemaining).toBeLessThan(0);
    expect(risk.scoreDescription).toContain("overdue");
  });

  it("flags tasks AT_RISK if due within 2 days and low completion rate", () => {
    const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24 * 1);
    const subtasks: SubtaskItem[] = [
      { title: "Subtask 1", isCompleted: false },
      { title: "Subtask 2", isCompleted: false },
      { title: "Subtask 3", isCompleted: true },
    ];

    const risk = calculateTaskRisk("IN_PROGRESS", "MEDIUM", tomorrow, subtasks);
    expect(risk.riskLevel).toBe("AT_RISK");
    expect(risk.completionRate).toBe(33);
  });
});
