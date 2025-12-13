import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import {
  revalidateLeadCaches,
  revalidateContactCaches,
  revalidateAccountCaches,
  revalidateTaskCaches,
  revalidateOpportunityCaches,
  revalidateTicketCaches,
  revalidateHealthCaches,
  revalidatePlaybookCaches,
  revalidateCampaignCaches,
  revalidateSegmentCaches,
  revalidateFormCaches,
  revalidateCustomModuleCaches,
} from "@/lib/cache-utils";
// Native integrations
import { createGmailClient, createCalendarClient, hasGoogleConnection } from "@/lib/integrations/google";
import { createSlackClient, hasSlackConnection } from "@/lib/integrations/slack";
