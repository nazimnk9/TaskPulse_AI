import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { AiBreakdownRequestSchema } from "@/lib/validations";
import { generateTaskBreakdown } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = AiBreakdownRequestSchema.safeParse(body);

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

    const { prompt, projectContext } = parsed.data;

    const result = await generateTaskBreakdown(prompt, projectContext);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("AI breakdown API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate AI breakdown" },
      { status: 500 }
    );
  }
}
