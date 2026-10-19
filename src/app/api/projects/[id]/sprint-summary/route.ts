import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { calculateTaskRisk } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          include: {
            subtasks: true,
            assignee: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const tasks = project.tasks;
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "DONE").length;
    const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const inReviewTasks = tasks.filter((t) => t.status === "IN_REVIEW").length;
    const todoTasks = tasks.filter((t) => t.status === "TODO").length;
    const backlogTasks = tasks.filter((t) => t.status === "BACKLOG").length;

    const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedStoryPoints = tasks
      .filter((t) => t.status === "DONE")
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    // Check risk flags
    let overdueCount = 0;
    let atRiskCount = 0;

    tasks.forEach((t) => {
      const risk = calculateTaskRisk(t.status, t.priority, t.dueDate, t.subtasks);
      if (risk.riskLevel === "OVERDUE") overdueCount++;
      if (risk.riskLevel === "AT_RISK") atRiskCount++;
    });

    // Generate intelligent sprint insight
    let sprintHealth: "HEALTHY" | "NEEDS_ATTENTION" | "CRITICAL" = "HEALTHY";
    const recommendations: string[] = [];

    if (overdueCount > 0) {
      sprintHealth = "CRITICAL";
      recommendations.push(
        `${overdueCount} task(s) are overdue. Reassign or descope to unblock sprint velocity.`
      );
    } else if (atRiskCount > 1 || (totalTasks > 5 && completionRate < 40)) {
      sprintHealth = "NEEDS_ATTENTION";
      recommendations.push(
        "Several tasks have pending due dates with incomplete subtasks. Focus on closing active PRs in review."
      );
    } else {
      recommendations.push(
        "Sprint execution is progressing smoothly within estimated story points."
      );
    }

    if (inReviewTasks >= 3) {
      recommendations.push(
        "Code review bottleneck detected: 3+ tasks in IN_REVIEW state. Prioritize peer reviews."
      );
    }

    return NextResponse.json({
      success: true,
      analytics: {
        totalTasks,
        doneTasks,
        inProgressTasks,
        inReviewTasks,
        todoTasks,
        backlogTasks,
        totalStoryPoints,
        completedStoryPoints,
        completionRate,
        overdueCount,
        atRiskCount,
        sprintHealth,
        recommendations,
      },
    });
  } catch (error) {
    console.error("Sprint summary error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
