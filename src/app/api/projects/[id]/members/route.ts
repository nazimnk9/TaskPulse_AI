import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AddMemberSchema = z.object({
  emailOrUserId: z.string().min(1, "User ID or email is required"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});

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
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Get all registered users to allow easily selecting candidates to add
    const existingMemberUserIds = project.members.map((m) => m.userId);
    const availableUsers = await db.user.findMany({
      where: {
        id: { notIn: existingMemberUserIds },
      },
      select: { id: true, name: true, email: true },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      ownerId: project.ownerId,
      members: project.members,
      availableUsers,
    });
  } catch (error) {
    console.error("Get project members error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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
      include: { members: true },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Verify user is project owner or admin
    const callerMember = project.members.find((m) => m.userId === user.id);
    const isOwner = project.ownerId === user.id;
    const isAdmin = callerMember?.role === "ADMIN" || user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only project owners and admins can add members" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = AddMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { emailOrUserId, role } = parsed.data;

    // Find the user by ID or email
    const targetUser = await db.user.findFirst({
      where: {
        OR: [{ id: emailOrUserId }, { email: emailOrUserId.toLowerCase() }],
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: `No registered user found with email/ID "${emailOrUserId}"` },
        { status: 404 }
      );
    }

    // Check if already a member
    const existing = await db.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUser.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `${targetUser.name} is already a member of this project` },
        { status: 409 }
      );
    }

    const newMember = await db.projectMember.create({
      data: {
        projectId,
        userId: targetUser.id,
        role: role as any,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `${targetUser.name} added to project`,
        member: newMember,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add project member error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: "Query param 'userId' is required" }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    if (project.ownerId === targetUserId) {
      return NextResponse.json(
        { success: false, error: "Cannot remove the project owner" },
        { status: 400 }
      );
    }

    if (project.ownerId !== user.id && user.role !== "ADMIN" && user.id !== targetUserId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only owner/admin or self can remove membership" },
        { status: 403 }
      );
    }

    await db.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    // Unassign any tasks assigned to this user in this project
    await db.task.updateMany({
      where: { projectId, assigneeId: targetUserId },
      data: { assigneeId: null },
    });

    return NextResponse.json({ success: true, message: "Member removed from project" });
  } catch (error) {
    console.error("Delete project member error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
