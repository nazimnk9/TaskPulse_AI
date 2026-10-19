import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword, createAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { RegisterSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

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

    const { email, name, password } = parsed.data;

    // Check duplicate
    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "User with this email already exists",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: "MEMBER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Auto-add new user to existing active projects so they can immediately participate
    try {
      const activeProjects = await db.project.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      if (activeProjects.length > 0) {
        await db.projectMember.createMany({
          data: activeProjects.map((p) => ({
            projectId: p.id,
            userId: user.id,
            role: "MEMBER",
          })),
        });
      }
    } catch (e) {
      console.warn("Auto-adding user to active projects failed:", e);
    }

    // Create session token
    const token = await createAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user,
      },
      { status: 201 }
    );

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
