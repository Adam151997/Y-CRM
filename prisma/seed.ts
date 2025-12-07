import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create a demo organization
  const orgId = "demo_org_123";
  
  const org = await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: {
      id: orgId,
      name: "Demo Organization",
      slug: "demo-org",
      plan: "FREE",
      settings: {},
    },
  });

  console.log("✅ Organization created:", org.name);

  // Create Lead Pipeline Stages
  const leadStages = [
    { name: "New", order: 0, color: "#6B7280" },
    { name: "Contacted", order: 1, color: "#3B82F6" },
    { name: "Qualified", order: 2, color: "#8B5CF6" },
    { name: "Converted", order: 3, color: "#10B981" },
    { name: "Lost", order: 4, color: "#EF4444" },
  ];

  for (const stage of leadStages) {
    await prisma.pipelineStage.upsert({
      where: {
        orgId_module_name: {
          orgId,
          module: "LEAD",
          name: stage.name,
        },
      },
      update: {},
      create: {
        orgId,
        module: "LEAD",
        ...stage,
      },
    });
  }

  console.log("✅ Lead pipeline stages created");

  // Create Opportunity Pipeline Stages
  const opportunityStages = [
    { name: "Prospecting", order: 0, color: "#6B7280", probability: 10 },
    { name: "Qualification", order: 1, color: "#3B82F6", probability: 20 },
    { name: "Proposal", order: 2, color: "#8B5CF6", probability: 50 },
    { name: "Negotiation", order: 3, color: "#F59E0B", probability: 75 },
    { name: "Closed Won", order: 4, color: "#10B981", probability: 100, isWon: true },
    { name: "Closed Lost", order: 5, color: "#EF4444", probability: 0, isLost: true },
  ];

  for (const stage of opportunityStages) {
    await prisma.pipelineStage.upsert({
      where: {
        orgId_module_name: {
          orgId,
          module: "OPPORTUNITY",
          name: stage.name,
        },
      },
      update: {},
      create: {
        orgId,
        module: "OPPORTUNITY",
        ...stage,
      },
    });
  }

  console.log("✅ Opportunity pipeline stages created");

  // Get the first lead stage for sample leads
  const firstLeadStage = await prisma.pipelineStage.findFirst({
    where: { orgId, module: "LEAD", order: 0 },
  });

  // Create sample leads
  const sampleLeads = [
    {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+1 (555) 123-4567",
      company: "Acme Corp",
      title: "Marketing Director",
      source: "WEBSITE",
      status: "NEW",
    },
    {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@techstartup.io",
      phone: "+1 (555) 234-5678",
      company: "TechStartup Inc",
      title: "CEO",
      source: "LINKEDIN",
      status: "CONTACTED",
    },
    {
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob.j@enterprise.com",
      phone: "+1 (555) 345-6789",
      company: "Enterprise Solutions",
      title: "VP of Sales",
      source: "REFERRAL",
      status: "QUALIFIED",
    },
    {
      firstName: "Alice",
      lastName: "Williams",
      email: "alice@innovate.co",
      phone: "+1 (555) 456-7890",
      company: "Innovate Co",
      title: "Product Manager",
      source: "TRADE_SHOW",
      status: "NEW",
    },
    {
      firstName: "Charlie",
      lastName: "Brown",
      email: "charlie@startup.io",
      phone: "+1 (555) 567-8901",
      company: "Startup.io",
      title: "CTO",
      source: "COLD_CALL",
      status: "CONTACTED",
    },
  ];

  for (const leadData of sampleLeads) {
    const existingLead = await prisma.lead.findFirst({
      where: { orgId, email: leadData.email },
    });

    if (!existingLead) {
      const lead = await prisma.lead.create({
        data: {
          orgId,
          ...leadData,
          pipelineStageId: firstLeadStage?.id,
          customFields: {},
        },
      });

      // Add a sample note to each lead
      await prisma.note.create({
        data: {
          orgId,
          content: `Initial contact made with ${leadData.firstName}. Showed interest in our product offerings.`,
          leadId: lead.id,
          createdById: "SEED_USER",
          createdByType: "SYSTEM",
        },
      });

      // Add a sample task to each lead
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 7) + 1);

      await prisma.task.create({
        data: {
          orgId,
          title: `Follow up with ${leadData.firstName} ${leadData.lastName}`,
          description: `Reach out to discuss their needs and schedule a demo.`,
          dueDate,
          priority: ["LOW", "MEDIUM", "HIGH"][Math.floor(Math.random() * 3)],
          status: "PENDING",
          taskType: "CALL",
          leadId: lead.id,
          createdById: "SEED_USER",
          createdByType: "SYSTEM",
        },
      });
    }
  }

  console.log("✅ Sample leads with notes and tasks created");

  // Create sample accounts
  const sampleAccounts = [
    {
      name: "Acme Corporation",
      industry: "Technology",
      website: "https://acme.example.com",
      phone: "+1 (555) 100-0001",
      type: "CUSTOMER",
      rating: "HOT",
      annualRevenue: 5000000,
      employeeCount: 250,
    },
    {
      name: "Global Enterprises",
      industry: "Finance",
      website: "https://global.example.com",
      phone: "+1 (555) 100-0002",
      type: "PROSPECT",
      rating: "WARM",
      annualRevenue: 50000000,
      employeeCount: 1000,
    },
    {
      name: "StartupHub",
      industry: "Technology",
      website: "https://startuphub.example.com",
      phone: "+1 (555) 100-0003",
      type: "PROSPECT",
      rating: "WARM",
      annualRevenue: 1000000,
      employeeCount: 50,
    },
  ];

  for (const accountData of sampleAccounts) {
    const existingAccount = await prisma.account.findFirst({
      where: { orgId, name: accountData.name },
    });

    if (!existingAccount) {
      await prisma.account.create({
        data: {
          orgId,
          ...accountData,
          address: {
            street: "123 Business Ave",
            city: "San Francisco",
            state: "CA",
            zip: "94105",
            country: "USA",
          },
          customFields: {},
        },
      });
    }
  }

  console.log("✅ Sample accounts created");

  // Create sample custom field definitions
  const customFields = [
    {
      module: "LEAD",
      fieldName: "Budget",
      fieldKey: "budget",
      fieldType: "SELECT",
      options: ["< $10K", "$10K - $50K", "$50K - $100K", "> $100K"],
      displayOrder: 1,
    },
    {
      module: "LEAD",
      fieldName: "Timeline",
      fieldKey: "timeline",
      fieldType: "SELECT",
      options: ["Immediate", "1-3 months", "3-6 months", "6+ months"],
      displayOrder: 2,
    },
    {
      module: "ACCOUNT",
      fieldName: "Contract Value",
      fieldKey: "contract_value",
      fieldType: "NUMBER",
      displayOrder: 1,
    },
  ];

  for (const fieldData of customFields) {
    await prisma.customFieldDefinition.upsert({
      where: {
        orgId_module_fieldKey: {
          orgId,
          module: fieldData.module,
          fieldKey: fieldData.fieldKey,
        },
      },
      update: {},
      create: {
        orgId,
        ...fieldData,
        required: false,
        isActive: true,
      },
    });
  }

  console.log("✅ Custom field definitions created");

  console.log("\n🎉 Database seed completed successfully!");
  console.log("\nDemo data created:");
  console.log("  - 1 Organization (Demo Organization)");
  console.log("  - 5 Lead pipeline stages");
  console.log("  - 6 Opportunity pipeline stages");
  console.log("  - 5 Sample leads with notes and tasks");
  console.log("  - 3 Sample accounts");
  console.log("  - 3 Custom field definitions");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
