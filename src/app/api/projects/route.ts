import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { CreateProjectSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const projects = await db.project.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Fetch projects error:", error);
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
    const parsed = CreateProjectSchema.safeParse(body);

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

    const { name, key, description } = parsed.data;

    // Check key uniqueness
    const existing = await db.project.findUnique({
      where: { key: key.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Project key "${key.toUpperCase()}" is already in use. Please choose another prefix.`,
        },
        { status: 409 }
      );
    }

    // Create project and assign creator as ADMIN and all existing team members as MEMBERS
    const project = await db.$transaction(async (tx) => {
      const newProj = await tx.project.create({
        data: {
          name,
          key: key.toUpperCase(),
          description,
          ownerId: user.id,
        },
      });

      // Fetch all registered workspace users to automatically include team members
      const allUsers = await tx.user.findMany({
        select: { id: true },
      });

      const membersToCreate =
        allUsers.length > 0
          ? allUsers.map((u) => ({
              projectId: newProj.id,
              userId: u.id,
              role: (u.id === user.id ? "ADMIN" : "MEMBER") as "ADMIN" | "MEMBER",
            }))
          : [
              {
                projectId: newProj.id,
                userId: user.id,
                role: "ADMIN" as const,
              },
            ];

      await tx.projectMember.createMany({
        data: membersToCreate,
      });

      return newProj;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Project created successfully",
        project,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
