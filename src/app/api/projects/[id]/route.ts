import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { UpdateProjectSchema } from "@/lib/validations";

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

    const project = await db.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Check membership or ownership
    const isMember =
      project.ownerId === user.id ||
      project.members.some((m) => m.userId === user.id);

    if (!isMember) {
      return NextResponse.json(
        { success: false, error: "You do not have access to this project" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Get project detail error:", error);
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

    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    if (project.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Only the project owner can edit project settings" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = UpdateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const newKey = parsed.data.key ? parsed.data.key.toUpperCase() : undefined;
    const oldKey = project.key;

    if (newKey && newKey !== oldKey) {
      const existingKey = await db.project.findUnique({
        where: { key: newKey },
      });
      if (existingKey && existingKey.id !== id) {
        return NextResponse.json(
          { success: false, error: `Project key "${newKey}" is already in use. Please choose another prefix.` },
          { status: 409 }
        );
      }
    }

    const updated = await db.$transaction(async (tx) => {
      // If key is changing, update all task keys for this project
      if (newKey && newKey !== oldKey) {
        const projectTasks = await tx.task.findMany({
          where: { projectId: id },
          select: { id: true, taskKey: true },
        });

        for (const t of projectTasks) {
          const parts = t.taskKey.split("-");
          const taskNum = parts.length > 1 ? parts[parts.length - 1] : t.taskKey;
          const updatedTaskKey = `${newKey}-${taskNum}`;
          await tx.task.update({
            where: { id: t.id },
            data: { taskKey: updatedTaskKey },
          });
        }
      }

      return await tx.project.update({
        where: { id },
        data: {
          ...parsed.data,
          key: newKey || undefined,
        },
      });
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("Update project error:", error);
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

    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    if (project.ownerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Only the project owner or system admin can delete this project" },
        { status: 403 }
      );
    }

    await db.project.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
