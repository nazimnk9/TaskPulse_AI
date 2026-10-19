import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { TransitionStatusSchema } from "@/lib/validations";
import { validateStatusTransition, TaskStatus } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const task = await db.task.findUnique({
      where: { id },
      include: {
        subtasks: true,
        project: { include: { members: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = TransitionStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid status value", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const targetStatus = parsed.data.status as TaskStatus;
    const currentStatus = task.status as TaskStatus;

    // Strict Business Logic & Workflow Engine Validation
    const validation = validateStatusTransition(
      currentStatus,
      targetStatus,
      task.subtasks
    );

    if (!validation.allowed) {
      // Record blocked attempt in activity log for auditability
      await db.activityLog.create({
        data: {
          taskId: task.id,
          actorId: user.id,
          action: "BLOCKED_TRANSITION",
          details: `Attempted to transition from ${currentStatus} to ${targetStatus}: ${validation.reason}`,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: "Business rule violation",
          reason: validation.reason,
          blockingSubtasks: validation.blockingSubtasks || [],
        },
        { status: 422 }
      );
    }

    // Apply valid status transition in a transaction
    const updated = await db.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id },
        data: {
          status: targetStatus,
        },
        include: {
          subtasks: true,
          assignee: { select: { id: true, name: true, email: true } },
        },
      });

      // Record successful status transition in audit log
      await tx.activityLog.create({
        data: {
          taskId: task.id,
          actorId: user.id,
          action: "STATUS_CHANGED",
          details: `Moved task status from ${currentStatus} to ${targetStatus}`,
        },
      });

      return updatedTask;
    });

    return NextResponse.json({
      success: true,
      message: `Task moved to ${targetStatus}`,
      task: updated,
    });
  } catch (error) {
    console.error("Status transition error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
