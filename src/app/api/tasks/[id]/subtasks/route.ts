import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { CreateSubtaskSchema, UpdateSubtaskSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await context.params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { subtasks: true },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = CreateSubtaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const nextOrder = task.subtasks.length;
    const subtask = await db.$transaction(async (tx) => {
      const created = await tx.subtask.create({
        data: {
          taskId,
          title: parsed.data.title,
          order: nextOrder,
        },
      });

      await tx.activityLog.create({
        data: {
          taskId,
          actorId: user.id,
          action: "SUBTASK_ADDED",
          details: `Added subtask: "${parsed.data.title}"`,
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, subtask }, { status: 201 });
  } catch (error) {
    console.error("Add subtask error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await context.params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subtaskId, ...rest } = body;

    if (!subtaskId) {
      return NextResponse.json({ success: false, error: "Missing subtaskId" }, { status: 400 });
    }

    const parsed = UpdateSubtaskSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await db.subtask.update({
      where: { id: subtaskId, taskId },
      data: parsed.data,
    });

    if (parsed.data.isCompleted !== undefined) {
      await db.activityLog.create({
        data: {
          taskId,
          actorId: user.id,
          action: "SUBTASK_TOGGLED",
          details: `${parsed.data.isCompleted ? "Completed" : "Re-opened"} subtask: "${updated.title}"`,
        },
      });
    }

    return NextResponse.json({ success: true, subtask: updated });
  } catch (error) {
    console.error("Update subtask error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await context.params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subtaskId = searchParams.get("subtaskId");

    if (!subtaskId) {
      return NextResponse.json({ success: false, error: "Missing subtaskId query parameter" }, { status: 400 });
    }

    await db.subtask.delete({
      where: { id: subtaskId, taskId },
    });

    return NextResponse.json({ success: true, message: "Subtask deleted" });
  } catch (error) {
    console.error("Delete subtask error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
