export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface SubtaskItem {
  id?: string;
  title: string;
  isCompleted: boolean;
}

export interface TransitionValidationResult {
  allowed: boolean;
  reason?: string;
  blockingSubtasks?: SubtaskItem[];
}

export interface RiskAssessment {
  riskLevel: "ON_TRACK" | "MODERATE" | "AT_RISK" | "OVERDUE";
  completionRate: number; // 0 to 100
  daysRemaining: number | null;
  scoreDescription: string;
}

/**
 * Valid transitions graph for Agile Kanban workflow
 */
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  BACKLOG: ["TODO", "IN_PROGRESS"],
  TODO: ["BACKLOG", "IN_PROGRESS"],
  IN_PROGRESS: ["TODO", "IN_REVIEW", "BACKLOG"],
  IN_REVIEW: ["IN_PROGRESS", "DONE", "TODO"],
  DONE: ["IN_REVIEW", "IN_PROGRESS", "TODO", "BACKLOG"],
};

/**
 * Validates whether a task status transition is permitted according to
 * Agile state-machine rules and business invariants.
 */
export function validateStatusTransition(
  currentStatus: TaskStatus,
  targetStatus: TaskStatus,
  subtasks: SubtaskItem[] = []
): TransitionValidationResult {
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  // 1. Check graph path
  const validNextStates = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!validNextStates.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Direct transition from ${currentStatus} to ${targetStatus} is not permitted. Follow standard agile workflow progression.`,
    };
  }

  // 2. Strict Business Invariant: Cannot complete task if incomplete subtasks exist
  if (targetStatus === "DONE") {
    const incompleteSubtasks = subtasks.filter((s) => !s.isCompleted);
    if (incompleteSubtasks.length > 0) {
      return {
        allowed: false,
        reason: `Cannot mark task as DONE because ${incompleteSubtasks.length} subtask(s) are still incomplete. Complete all checklist items first.`,
        blockingSubtasks: incompleteSubtasks,
      };
    }
  }

  return { allowed: true };
}

/**
 * Business calculation: Calculates deadline risk and completion health score
 */
export function calculateTaskRisk(
  status: TaskStatus,
  priority: Priority,
  dueDate: Date | string | null | undefined,
  subtasks: SubtaskItem[] = []
): RiskAssessment {
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s) => s.isCompleted).length;
  const completionRate =
    totalSubtasks === 0
      ? status === "DONE"
        ? 100
        : 0
      : Math.round((completedSubtasks / totalSubtasks) * 100);

  if (status === "DONE") {
    return {
      riskLevel: "ON_TRACK",
      completionRate: 100,
      daysRemaining: null,
      scoreDescription: "Completed successfully",
    };
  }

  if (!dueDate) {
    return {
      riskLevel: priority === "URGENT" ? "MODERATE" : "ON_TRACK",
      completionRate,
      daysRemaining: null,
      scoreDescription: "No due date specified",
    };
  }

  const targetDate = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      riskLevel: "OVERDUE",
      completionRate,
      daysRemaining,
      scoreDescription: `Task is ${Math.abs(daysRemaining)} day(s) overdue! Immediate attention required.`,
    };
  }

  if (daysRemaining <= 2 && completionRate < 80) {
    return {
      riskLevel: "AT_RISK",
      completionRate,
      daysRemaining,
      scoreDescription: `Due in ${daysRemaining} day(s) with ${100 - completionRate}% remaining work.`,
    };
  }

  if (daysRemaining <= 5 && priority === "URGENT") {
    return {
      riskLevel: "MODERATE",
      completionRate,
      daysRemaining,
      scoreDescription: `High priority deadline approaching in ${daysRemaining} day(s).`,
    };
  }

  return {
    riskLevel: "ON_TRACK",
    completionRate,
    daysRemaining,
    scoreDescription: `On track (${daysRemaining} days remaining).`,
  };
}
