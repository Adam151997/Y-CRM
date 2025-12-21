import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { createActivity } from "@/lib/activity";
import { updateOpportunitySchema, closeOpportunitySchema } from "@/lib/validation/schemas";
import { validateCustomFields } from "@/lib/validation/custom-fields";
import { cleanupOrphanedRelationships } from "@/lib/relationships";
import { checkRoutePermission } from "@/lib/api-permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/opportunities/[id] - Get a single opportunity
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "opportunities", "view");
    if (permissionError) return permissionError;

    const { id } = await params;

    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            industry: true,
            website: true,
          },
        },
        stage: true,
        notes: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        tasks: {
          orderBy: { dueDate: "asc" },
          where: {
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
          take: 5,
        },
        _count: {
          select: {
            notes: true,
            tasks: true,
          },
        },
      },
    });

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    return NextResponse.json(opportunity);
  } catch (error) {
    console.error("Error fetching opportunity:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunity" },
      { status: 500 }
    );
  }
}

// PUT /api/opportunities/[id] - Update an opportunity
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "opportunities", "edit");
    if (permissionError) return permissionError;

    const { id } = await params;
    const body = await request.json();

    // Get existing opportunity
    const existingOpportunity = await prisma.opportunity.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: { stage: true, account: { select: { name: true } } },
    });

    if (!existingOpportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    // Check if this is a close operation
    if (body.closedWon !== undefined) {
      const closeResult = closeOpportunitySchema.safeParse(body);
      if (!closeResult.success) {
        return NextResponse.json(
          { error: "Validation failed", details: closeResult.error.format() },
          { status: 400 }
        );
      }

      const closeData = closeResult.data;

      // Find the appropriate stage (Closed Won or Closed Lost)
      const closeStage = await prisma.pipelineStage.findFirst({
        where: {
          orgId: auth.orgId,
          module: "OPPORTUNITY",
          ...(closeData.closedWon ? { isWon: true } : { isLost: true }),
        },
      });

      const updatedOpportunity = await prisma.opportunity.update({
        where: { id },
        data: {
          closedWon: closeData.closedWon,
          actualCloseDate: closeData.actualCloseDate,
          lostReason: closeData.lostReason,
          probability: closeData.closedWon ? 100 : 0,
          stageId: closeStage?.id || existingOpportunity.stageId,
        },
        include: {
          account: { select: { id: true, name: true } },
          stage: true,
        },
      });

      // Audit log
      await createAuditLog({
        orgId: auth.orgId,
        action: "UPDATE",
        module: "OPPORTUNITY",
        recordId: id,
        actorType: "USER",
        actorId: auth.userId,
        previousState: existingOpportunity as unknown as Record<string, unknown>,
        newState: updatedOpportunity as unknown as Record<string, unknown>,
        metadata: {
          action: closeData.closedWon ? "CLOSED_WON" : "CLOSED_LOST",
        },
      });

      // Create notification for opportunity won/lost
      const formattedValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: updatedOpportunity.currency,
        maximumFractionDigits: 0,
      }).format(Number(updatedOpportunity.value));

      await createNotification({
        orgId: auth.orgId,
        userId: auth.userId,
        type: closeData.closedWon ? "OPPORTUNITY_WON" : "OPPORTUNITY_LOST",
        title: closeData.closedWon 
          ? `🎉 Opportunity won: ${updatedOpportunity.name}`
          : `Opportunity lost: ${updatedOpportunity.name}`,
        message: `Value: ${formattedValue} | Account: ${updatedOpportunity.account.name}`,
        entityType: "OPPORTUNITY",
        entityId: updatedOpportunity.id,
      });

      // Create activity for timeline
      await createActivity({
        orgId: auth.orgId,
        type: closeData.closedWon ? "OPPORTUNITY_WON" : "OPPORTUNITY_LOST",
        subject: closeData.closedWon 
          ? `🎉 Opportunity won: ${updatedOpportunity.name}`
          : `Opportunity lost: ${updatedOpportunity.name}`,
        description: `Value: ${formattedValue} | Account: ${updatedOpportunity.account.name}${closeData.lostReason ? ` | Reason: ${closeData.lostReason}` : ""}`,
        accountId: updatedOpportunity.accountId,
        performedById: auth.userId,
        performedByType: "USER",
      });

      return NextResponse.json(updatedOpportunity);
    }

    // Regular update
    const validationResult = updateOpportunitySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify account if being changed
    if (data.accountId && data.accountId !== existingOpportunity.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: data.accountId, orgId: auth.orgId },
      });
      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
    }

    // Track stage change for notification
    const isStageChanging = data.stageId && data.stageId !== existingOpportunity.stageId;
    let newStage = null;

    // Verify stage if being changed
    if (isStageChanging) {
      newStage = await prisma.pipelineStage.findFirst({
        where: { id: data.stageId, orgId: auth.orgId, module: "OPPORTUNITY" },
      });
      if (!newStage) {
        return NextResponse.json({ error: "Pipeline stage not found" }, { status: 404 });
      }
      // Update probability based on stage
      if (newStage.probability !== null) {
        data.probability = newStage.probability;
      }
      
      // Auto-set closedWon and actualCloseDate when moving to Won/Lost stage
      if (newStage.isWon && existingOpportunity.closedWon !== true) {
        (data as Record<string, unknown>).closedWon = true;
        (data as Record<string, unknown>).actualCloseDate = new Date();
        data.probability = 100;
      } else if (newStage.isLost && existingOpportunity.closedWon !== false) {
        (data as Record<string, unknown>).closedWon = false;
        (data as Record<string, unknown>).actualCloseDate = new Date();
        (data as Record<string, unknown>).lostReason = (data as Record<string, unknown>).lostReason || null;
        data.probability = 0;
      }
    }

    // Validate custom fields if present
    if (data.customFields && Object.keys(data.customFields).length > 0) {
      const customFieldValidation = await validateCustomFields(
        auth.orgId,
        "OPPORTUNITY",
        data.customFields
      );
      if (!customFieldValidation.success) {
        return NextResponse.json(
          { error: "Custom field validation failed", details: customFieldValidation.errors },
          { status: 400 }
        );
      }
      data.customFields = customFieldValidation.data;
    }

    // Build update data with proper JSON handling
    const updateData: Prisma.OpportunityUpdateInput = {
      name: data.name,
      value: data.value,
      currency: data.currency,
      probability: data.probability,
      expectedCloseDate: data.expectedCloseDate,
      assignedToId: data.assignedToId,
    };

    // Handle closedWon and actualCloseDate (set when stage changes to Won/Lost)
    const extendedData = data as Record<string, unknown>;
    if (extendedData.closedWon !== undefined) {
      updateData.closedWon = extendedData.closedWon as boolean;
    }
    if (extendedData.actualCloseDate !== undefined) {
      updateData.actualCloseDate = extendedData.actualCloseDate as Date;
    }
    if (extendedData.lostReason !== undefined) {
      updateData.lostReason = extendedData.lostReason as string | null;
    }

    // Handle accountId relation
    if (data.accountId !== undefined) {
      updateData.account = { connect: { id: data.accountId } };
    }

    // Handle stageId relation
    if (data.stageId !== undefined) {
      updateData.stage = { connect: { id: data.stageId } };
    }

    // Handle customFields JSON field
    if (data.customFields) {
      updateData.customFields = {
        ...(existingOpportunity.customFields as object),
        ...data.customFields,
      } as Prisma.InputJsonValue;
    }

    // Update opportunity
    const updatedOpportunity = await prisma.opportunity.update({
      where: { id },
      data: updateData,
      include: {
        account: { select: { id: true, name: true } },
        stage: true,
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "UPDATE",
      module: "OPPORTUNITY",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingOpportunity as unknown as Record<string, unknown>,
      newState: updatedOpportunity as unknown as Record<string, unknown>,
    });

    // Create notification for pipeline stage change
    if (isStageChanging) {
      // Check if this was an auto-close via stage change
      if (newStage?.isWon && existingOpportunity.closedWon !== true) {
        // Create notification for opportunity won
        const formattedValue = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: updatedOpportunity.currency,
          maximumFractionDigits: 0,
        }).format(Number(updatedOpportunity.value));

        await createNotification({
          orgId: auth.orgId,
          userId: auth.userId,
          type: "OPPORTUNITY_WON",
          title: `🎉 Opportunity won: ${updatedOpportunity.name}`,
          message: `Value: ${formattedValue} | Account: ${updatedOpportunity.account.name}`,
          entityType: "OPPORTUNITY",
          entityId: updatedOpportunity.id,
        });

        await createActivity({
          orgId: auth.orgId,
          type: "OPPORTUNITY_WON",
          subject: `🎉 Opportunity won: ${updatedOpportunity.name}`,
          description: `Value: ${formattedValue} | Account: ${updatedOpportunity.account.name}`,
          accountId: updatedOpportunity.accountId,
          performedById: auth.userId,
          performedByType: "USER",
        });
      } else if (newStage?.isLost && existingOpportunity.closedWon !== false) {
        // Create notification for opportunity lost
        const formattedValue = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: updatedOpportunity.currency,
          maximumFractionDigits: 0,
        }).format(Number(updatedOpportunity.value));

        await createNotification({
          orgId: auth.orgId,
          userId: auth.userId,
          type: "OPPORTUNITY_LOST",
          title: `Opportunity lost: ${updatedOpportunity.name}`,
          message: `Value: ${formattedValue} | Account: ${updatedOpportunity.account.name}`,
          entityType: "OPPORTUNITY",
          entityId: updatedOpportunity.id,
        });

        await createActivity({
          orgId: auth.orgId,
          type: "OPPORTUNITY_LOST",
          subject: `Opportunity lost: ${updatedOpportunity.name}`,
          description: `Value: ${formattedValue} | Account: ${updatedOpportunity.account.name}`,
          accountId: updatedOpportunity.accountId,
          performedById: auth.userId,
          performedByType: "USER",
        });
      } else {
        // Regular stage change notification
        await createNotification({
          orgId: auth.orgId,
          userId: auth.userId,
          type: "PIPELINE_MOVED",
          title: `Pipeline updated: ${updatedOpportunity.name}`,
          message: `Moved to: ${updatedOpportunity.stage.name}`,
          entityType: "OPPORTUNITY",
          entityId: updatedOpportunity.id,
        });
      }
    }

    return NextResponse.json(updatedOpportunity);
  } catch (error) {
    console.error("Error updating opportunity:", error);
    return NextResponse.json(
      { error: "Failed to update opportunity" },
      { status: 500 }
    );
  }
}

// DELETE /api/opportunities/[id] - Delete an opportunity
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "opportunities", "delete");
    if (permissionError) return permissionError;

    const { id } = await params;

    // Get existing opportunity
    const existingOpportunity = await prisma.opportunity.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingOpportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    // Delete opportunity
    await prisma.opportunity.delete({
      where: { id },
    });

    // Clean up orphaned relationships in other modules
    const cleanupResult = await cleanupOrphanedRelationships(
      auth.orgId,
      "opportunities",
      id
    );

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "DELETE",
      module: "OPPORTUNITY",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingOpportunity as unknown as Record<string, unknown>,
      metadata: {
        relationshipsCleanedUp: cleanupResult.cleaned,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting opportunity:", error);
    return NextResponse.json(
      { error: "Failed to delete opportunity" },
      { status: 500 }
    );
  }
}
