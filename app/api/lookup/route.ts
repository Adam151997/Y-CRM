import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/lookup?module=accounts&search=acme
// Generic lookup endpoint for relationship fields
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module");
    const search = searchParams.get("search") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    if (!module) {
      return NextResponse.json(
        { error: "Module parameter is required" },
        { status: 400 }
      );
    }

    // Built-in modules
    const builtInModules: Record<string, { 
      model: string; 
      labelFields: string[]; 
      searchFields: string[];
    }> = {
      accounts: {
        model: "account",
        labelFields: ["name"],
        searchFields: ["name"],
      },
      contacts: {
        model: "contact",
        labelFields: ["firstName", "lastName"],
        searchFields: ["firstName", "lastName", "email"],
      },
      leads: {
        model: "lead",
        labelFields: ["firstName", "lastName"],
        searchFields: ["firstName", "lastName", "email", "company"],
      },
      opportunities: {
        model: "opportunity",
        labelFields: ["name"],
        searchFields: ["name"],
      },
    };

    let results: Array<{ id: string; label: string; sublabel?: string }> = [];

    // Check if it's a built-in module
    if (builtInModules[module.toLowerCase()]) {
      const config = builtInModules[module.toLowerCase()];

      // Build search conditions
      const searchConditions = search
        ? config.searchFields.map((field) => ({
            [field]: { contains: search, mode: "insensitive" as const },
          }))
        : [];

      // Query the appropriate model
      switch (config.model) {
        case "account": {
          const accounts = await prisma.account.findMany({
            where: {
              orgId: auth.orgId,
              ...(searchConditions.length > 0 && { OR: searchConditions }),
            },
            select: { id: true, name: true, industry: true },
            take: limit,
            orderBy: { name: "asc" },
          });
          results = accounts.map((a) => ({
            id: a.id,
            label: a.name,
            sublabel: a.industry || undefined,
          }));
          break;
        }

        case "contact": {
          const contacts = await prisma.contact.findMany({
            where: {
              orgId: auth.orgId,
              ...(searchConditions.length > 0 && { OR: searchConditions }),
            },
            select: { id: true, firstName: true, lastName: true, email: true },
            take: limit,
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          });
          results = contacts.map((c) => ({
            id: c.id,
            label: `${c.firstName} ${c.lastName}`,
            sublabel: c.email || undefined,
          }));
          break;
        }

        case "lead": {
          const leads = await prisma.lead.findMany({
            where: {
              orgId: auth.orgId,
              ...(searchConditions.length > 0 && { OR: searchConditions }),
            },
            select: { id: true, firstName: true, lastName: true, company: true },
            take: limit,
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          });
          results = leads.map((l) => ({
            id: l.id,
            label: `${l.firstName} ${l.lastName}`,
            sublabel: l.company || undefined,
          }));
          break;
        }

        case "opportunity": {
          const opportunities = await prisma.opportunity.findMany({
            where: {
              orgId: auth.orgId,
              ...(searchConditions.length > 0 && { OR: searchConditions }),
            },
            select: { id: true, name: true, value: true },
            take: limit,
            orderBy: { name: "asc" },
          });
          results = opportunities.map((o) => ({
            id: o.id,
            label: o.name,
            sublabel: o.value ? `$${Number(o.value).toLocaleString()}` : undefined,
          }));
          break;
        }
      }
    } else {
      // It's a custom module - lookup by slug
      const customModule = await prisma.customModule.findFirst({
        where: {
          orgId: auth.orgId,
          slug: module.toLowerCase(),
        },
        select: { id: true, labelField: true },
      });

      if (!customModule) {
        return NextResponse.json(
          { error: "Module not found" },
          { status: 404 }
        );
      }

      // Get records from custom module
      const records = await prisma.customModuleRecord.findMany({
        where: {
          orgId: auth.orgId,
          moduleId: customModule.id,
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      // Filter by search if provided (search in the labelField)
      const filteredRecords = search
        ? records.filter((r) => {
            const data = r.data as Record<string, unknown>;
            const labelValue = String(data[customModule.labelField] || "");
            return labelValue.toLowerCase().includes(search.toLowerCase());
          })
        : records;

      results = filteredRecords.map((r) => {
        const data = r.data as Record<string, unknown>;
        return {
          id: r.id,
          label: String(data[customModule.labelField] || "Untitled"),
        };
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error in lookup:", error);
    return NextResponse.json(
      { error: "Failed to perform lookup" },
      { status: 500 }
    );
  }
}

// POST /api/lookup - Resolve IDs to labels for display
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { module, ids } = body;

    if (!module || !ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: "Module and ids array are required" },
        { status: 400 }
      );
    }

    const builtInModules: Record<string, string> = {
      accounts: "account",
      contacts: "contact",
      leads: "lead",
      opportunities: "opportunity",
    };

    const resolved: Record<string, { label: string; sublabel?: string }> = {};

    if (builtInModules[module.toLowerCase()]) {
      const modelName = builtInModules[module.toLowerCase()];

      switch (modelName) {
        case "account": {
          const accounts = await prisma.account.findMany({
            where: { id: { in: ids }, orgId: auth.orgId },
            select: { id: true, name: true, industry: true },
          });
          accounts.forEach((a) => {
            resolved[a.id] = { label: a.name, sublabel: a.industry || undefined };
          });
          break;
        }

        case "contact": {
          const contacts = await prisma.contact.findMany({
            where: { id: { in: ids }, orgId: auth.orgId },
            select: { id: true, firstName: true, lastName: true, email: true },
          });
          contacts.forEach((c) => {
            resolved[c.id] = {
              label: `${c.firstName} ${c.lastName}`,
              sublabel: c.email || undefined,
            };
          });
          break;
        }

        case "lead": {
          const leads = await prisma.lead.findMany({
            where: { id: { in: ids }, orgId: auth.orgId },
            select: { id: true, firstName: true, lastName: true, company: true },
          });
          leads.forEach((l) => {
            resolved[l.id] = {
              label: `${l.firstName} ${l.lastName}`,
              sublabel: l.company || undefined,
            };
          });
          break;
        }

        case "opportunity": {
          const opportunities = await prisma.opportunity.findMany({
            where: { id: { in: ids }, orgId: auth.orgId },
            select: { id: true, name: true, value: true },
          });
          opportunities.forEach((o) => {
            resolved[o.id] = {
              label: o.name,
              sublabel: o.value ? `$${Number(o.value).toLocaleString()}` : undefined,
            };
          });
          break;
        }
      }
    } else {
      // Custom module
      const customModule = await prisma.customModule.findFirst({
        where: {
          orgId: auth.orgId,
          slug: module.toLowerCase(),
        },
        select: { id: true, labelField: true },
      });

      if (customModule) {
        const records = await prisma.customModuleRecord.findMany({
          where: {
            id: { in: ids },
            orgId: auth.orgId,
            moduleId: customModule.id,
          },
        });

        records.forEach((r) => {
          const data = r.data as Record<string, unknown>;
          resolved[r.id] = {
            label: String(data[customModule.labelField] || "Untitled"),
          };
        });
      }
    }

    return NextResponse.json({ resolved });
  } catch (error) {
    console.error("Error resolving lookup:", error);
    return NextResponse.json(
      { error: "Failed to resolve lookup" },
      { status: 500 }
    );
  }
}
