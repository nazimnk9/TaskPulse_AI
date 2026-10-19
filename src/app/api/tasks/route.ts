import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { CreateTaskSchema } from "@/lib/validations";
import { calculateTaskRisk } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");
    const search = searchParams.get("q");

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Query parameter 'projectId' is required" },
        { status: 400 }
      );
    }

    // Verify user has access to project
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const isMember =
      project.ownerId === user.id ||
      project.members.some((m) => m.userId === user.id);

    if (!isMember) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Not a project member" },
        { status: 403 }
      );
    }

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { projectId };
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assigneeId) whereClause.assigneeId = assigneeId;
    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { taskKey: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const tasks = await db.task.findMany({
      where: whereClause,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        subtasks: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { comments: true, subtasks: true },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    // Enrich tasks with calculated business risk metrics
    const enrichedTasks = tasks.map((t) => {
      const risk = calculateTaskRisk(
        t.status,
        t.priority,
        t.dueDate,
        t.subtasks
      );
      return {
        ...t,
        riskMetrics: risk,
      };
    });

    return NextResponse.json({
      success: true,
      tasks: enrichedTasks,
    });
  } catch (error) {
    console.error("Fetch tasks error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      projectId,
      title,
      description,
      status,
      priority,
      storyPoints,
      dueDate,
      assigneeId,
      aiGenerated,
      aiMetadata,
      subtasks,
    } = parsed.data;

    // Check project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Generate atomic next task key, e.g. PRJ-1, PRJ-2
    const totalExisting = await db.task.count({
      where: { projectId },
    });
    const taskKey = `${project.key}-${totalExisting + 1}`;

    const createdTask = await db.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          projectId,
          taskKey,
          title,
          description,
          status,
          priority,
          storyPoints,
          dueDate: dueDate ? new Date(dueDate) : null,
          creatorId: user.id,
          assigneeId,
          aiGenerated: !!aiGenerated,
          aiMetadata,
        },
      });

      // Insert subtasks if provided
      if (subtasks && subtasks.length > 0) {
        await tx.subtask.createMany({
          data: subtasks.map((st, index) => ({
            taskId: task.id,
            title: st.title,
            order: index,
            isCompleted: false,
          })),
        });
      }

      // Record audit log
      await tx.activityLog.create({
        data: {
          taskId: task.id,
          actorId: user.id,
          action: "TASK_CREATED",
          details: `Task created by ${user.name}${aiGenerated ? " with AI assistant" : ""}`,
        },
      });

      return task;
    });

    const fullTask = await db.task.findUnique({
      where: { id: createdTask.id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        subtasks: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Task created successfully",
        task: fullTask,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
