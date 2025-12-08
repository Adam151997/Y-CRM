import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomFieldsList } from "./_components/custom-fields-list";
import { AddCustomFieldButton } from "./_components/add-custom-field-button";
import { Box } from "lucide-react";

// Built-in modules
const builtInModules = ["LEAD", "CONTACT", "ACCOUNT", "OPPORTUNITY"] as const;

const moduleLabels: Record<string, string> = {
  LEAD: "Leads",
  CONTACT: "Contacts",
  ACCOUNT: "Accounts",
  OPPORTUNITY: "Opportunities",
};

export default async function CustomFieldsSettingsPage() {
  const auth = await getAuthContext();
  const orgId = auth.orgId;

  // Fetch custom fields and custom modules in parallel
  const [customFields, customModules] = await Promise.all([
    prisma.customFieldDefinition.findMany({
      where: { orgId },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.customModule.findMany({
      where: { orgId, isActive: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  // Group fields by built-in module
  const fieldsByBuiltInModule: Record<string, typeof customFields> = {};
  for (const module of builtInModules) {
    fieldsByBuiltInModule[module] = customFields.filter(
      (f) => f.module === module && !f.customModuleId
    );
  }

  // Group fields by custom module ID
  const fieldsByCustomModule: Record<string, typeof customFields> = {};
  for (const module of customModules) {
    fieldsByCustomModule[module.id] = customFields.filter(
      (f) => f.customModuleId === module.id
    );
  }

  // Prepare custom modules data for the client component
  const customModulesForClient = customModules.map((m) => ({
    id: m.id,
    name: m.name,
    pluralName: m.pluralName,
    slug: m.slug,
    icon: m.icon,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Custom Fields</CardTitle>
            <CardDescription>
              Define custom fields for each module to capture additional data
            </CardDescription>
          </div>
          <AddCustomFieldButton customModules={customModulesForClient} />
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="LEAD">
            {/* Tab triggers */}
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full">
                {/* Built-in modules */}
                {builtInModules.map((module) => (
                  <TabsTrigger key={module} value={module} className="whitespace-nowrap">
                    {moduleLabels[module]}
                    <Badge variant="secondary" className="ml-2">
                      {fieldsByBuiltInModule[module]?.length || 0}
                    </Badge>
                  </TabsTrigger>
                ))}
                {/* Custom modules */}
                {customModules.map((module) => (
                  <TabsTrigger 
                    key={module.id} 
                    value={`custom_${module.id}`}
                    className="whitespace-nowrap"
                  >
                    <Box className="h-3.5 w-3.5 mr-1.5" />
                    {module.pluralName}
                    <Badge variant="secondary" className="ml-2">
                      {fieldsByCustomModule[module.id]?.length || 0}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Built-in module contents */}
            {builtInModules.map((module) => (
              <TabsContent key={module} value={module} className="mt-4">
                <CustomFieldsList
                  fields={fieldsByBuiltInModule[module] || []}
                  moduleType="builtin"
                  moduleIdentifier={module}
                />
              </TabsContent>
            ))}

            {/* Custom module contents */}
            {customModules.map((module) => (
              <TabsContent key={module.id} value={`custom_${module.id}`} className="mt-4">
                <CustomFieldsList
                  fields={fieldsByCustomModule[module.id] || []}
                  moduleType="custom"
                  moduleIdentifier={module.id}
                  moduleName={module.pluralName}
                />
              </TabsContent>
            ))}
          </Tabs>

          {/* Info about custom modules */}
          {customModules.length === 0 && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> You can create custom modules in{" "}
                <a href="/settings/modules" className="text-primary hover:underline">
                  Settings → Custom Modules
                </a>{" "}
                and then define custom fields for them here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
