import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createPipelineStageSchema } from "@/lib/validation/schemas";

// GET /api/settings/pipeline-stages - List pipeline stages
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module");

    const where: Record<string, unknown> = { orgId: auth.orgId };
    if (module) {
      where.module = module;
    }

    const stages = await prisma.pipelineStage.findMany({
      where,
      orderBy: [{ module: "asc" }, { order: "asc" }],
      include: {
        _count: {
          select: { leads: true, opportunities: true },
        },
      },
    });

    return NextResponse.json(stages);
  } catch (error) {
    console.error("Error fetching pipeline stages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline stages" },
      { status: 500 }
    );
  }
}

// POST /api/settings/pipeline-stages - Create a pipeline stage
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate
    const validationResult = createPipelineStageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for duplicate name in the same module
    const existing = await prisma.pipelineStage.findFirst({
      where: {
        orgId: auth.orgId,
        module: data.module,
        name: data.name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A stage with this name already exists in this pipeline" },
        { status: 400 }
      );
    }

    // Get the max order for the module
    const maxOrder = await prisma.pipelineStage.aggregate({
      where: { orgId: auth.orgId, module: data.module },
      _max: { order: true },
    });

    // Create pipeline stage
    const stage = await prisma.pipelineStage.create({
      data: {
        orgId: auth.orgId,
        name: data.name,
        module: data.module,
        order: (maxOrder._max.order ?? -1) + 1,
        color: data.color,
        probability: data.probability,
        isWon: data.isWon,
        isLost: data.isLost,
      },
    });

    return NextResponse.json(stage, { status: 201 });
  } catch (error) {
    console.error("Error creating pipeline stage:", error);
    return NextResponse.json(
      { error: "Failed to create pipeline stage" },
      { status: 500 }
    );
  }
}
