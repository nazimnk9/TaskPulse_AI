import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { UpdateTaskSchema } from "@/lib/validations";
import { calculateTaskRisk } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export async function GET(
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
        project: {
          select: {
            id: true,
            name: true,
            key: true,
            ownerId: true,
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
              },
            },
          },
        },
        creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        subtasks: { orderBy: { order: "asc" } },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        activityLogs: {
          include: {
            actor: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    const risk = calculateTaskRisk(task.status, task.priority, task.dueDate, task.subtasks);

    return NextResponse.json({
      success: true,
      task: {
        ...task,
        riskMetrics: risk,
      },
    });
  } catch (error) {
    console.error("Get task detail error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

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
      include: { subtasks: true },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = UpdateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const updated = await db.$transaction(async (tx) => {
      // If assignee is assigned, ensure they are a member of the project
      if (data.assigneeId) {
        const existingMember = await tx.projectMember.findUnique({
          where: {
            projectId_userId: { projectId: task.projectId, userId: data.assigneeId },
          },
        });
        if (!existingMember) {
          await tx.projectMember.create({
            data: {
              projectId: task.projectId,
              userId: data.assigneeId,
              role: "MEMBER",
            },
          });
        }
      }

      const taskUpdated = await tx.task.update({
        where: { id },
        data: {
          ...data,
          dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
        },
        include: {
          subtasks: true,
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      // If assignee changed, log it in activity log
      if (data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) {
        let details = "Unassigned task";
        if (data.assigneeId) {
          const assigneeUser = await tx.user.findUnique({
            where: { id: data.assigneeId },
            select: { name: true },
          });
          details = `Assigned task to ${assigneeUser?.name || "team member"}`;
        }
        await tx.activityLog.create({
          data: {
            taskId: task.id,
            actorId: user.id,
            action: "ASSIGNEE_CHANGED",
            details,
          },
        });
      }

      return taskUpdated;
    });

    return NextResponse.json({
      success: true,
      message: "Task updated",
      task: updated,
    });
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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
      include: { project: true },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    // Must be creator or project owner
    if (task.creatorId !== user.id && task.project.ownerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only task creator or project owner can delete" },
        { status: 403 }
      );
    }

    await db.task.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
