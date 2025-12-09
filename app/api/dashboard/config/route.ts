import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { DEFAULT_LAYOUTS } from "@/lib/dashboard/widget-registry";
import { WorkspaceType } from "@/lib/workspace";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// GET /api/dashboard/config - Get user's dashboard config
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { searchParams } = new URL(request.url);
    const workspace = (searchParams.get("workspace") || "sales") as WorkspaceType;

    let config = await prisma.dashboardConfig.findUnique({
      where: {
        orgId_userId_workspace: {
          orgId,
          userId,
          workspace,
        },
      },
    });

    // If no config exists, return default layout
    if (!config) {
      const defaultLayout = DEFAULT_LAYOUTS[workspace] || DEFAULT_LAYOUTS.sales;
      return NextResponse.json({
        layout: defaultLayout,
        widgets: defaultLayout.map((item) => ({
          id: item.i,
          type: item.i,
          settings: {},
        })),
        isDefault: true,
      });
    }

    return NextResponse.json({
      layout: config.layout,
      widgets: config.widgets,
      isDefault: false,
    });
  } catch (error) {
    console.error("Error fetching dashboard config:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard config" }, { status: 500 });
  }
}

// Layout item schema
const layoutItemSchema = z.object({
  i: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
  maxW: z.number().optional(),
  maxH: z.number().optional(),
});

// Widget config schema
const widgetConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  settings: z.record(z.unknown()).optional(),
});

// Update schema
const updateConfigSchema = z.object({
  workspace: z.enum(["sales", "cs", "marketing"]),
  layout: z.array(layoutItemSchema),
  widgets: z.array(widgetConfigSchema),
});

// PUT /api/dashboard/config - Save user's dashboard config
export async function PUT(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext();
    const body = await request.json();

    // Validate request body
    const validationResult = updateConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { workspace, layout, widgets } = validationResult.data;

    // Upsert config
    const config = await prisma.dashboardConfig.upsert({
      where: {
        orgId_userId_workspace: {
          orgId,
          userId,
          workspace,
        },
      },
      update: {
        layout: layout as Prisma.InputJsonValue,
        widgets: widgets as Prisma.InputJsonValue,
      },
      create: {
        orgId,
        userId,
        workspace,
        layout: layout as Prisma.InputJsonValue,
        widgets: widgets as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      layout: config.layout,
      widgets: config.widgets,
    });
  } catch (error) {
    console.error("Error saving dashboard config:", error);
    return NextResponse.json({ error: "Failed to save dashboard config" }, { status: 500 });
  }
}

// DELETE /api/dashboard/config - Reset to default layout
export async function DELETE(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { searchParams } = new URL(request.url);
    const workspace = (searchParams.get("workspace") || "sales") as WorkspaceType;

    await prisma.dashboardConfig.delete({
      where: {
        orgId_userId_workspace: {
          orgId,
          userId,
          workspace,
        },
      },
    }).catch(() => {
      // Ignore if doesn't exist
    });

    const defaultLayout = DEFAULT_LAYOUTS[workspace] || DEFAULT_LAYOUTS.sales;

    return NextResponse.json({
      layout: defaultLayout,
      widgets: defaultLayout.map((item) => ({
        id: item.i,
        type: item.i,
        settings: {},
      })),
      isDefault: true,
    });
  } catch (error) {
    console.error("Error resetting dashboard config:", error);
    return NextResponse.json({ error: "Failed to reset dashboard config" }, { status: 500 });
  }
}
