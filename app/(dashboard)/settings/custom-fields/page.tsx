import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomFieldsList } from "./_components/custom-fields-list";
import { AddCustomFieldButton } from "./_components/add-custom-field-button";

const modules = ["LEAD", "CONTACT", "ACCOUNT", "OPPORTUNITY"] as const;

const moduleLabels: Record<string, string> = {
  LEAD: "Leads",
  CONTACT: "Contacts",
  ACCOUNT: "Accounts",
  OPPORTUNITY: "Opportunities",
};

export default async function CustomFieldsSettingsPage() {
  const { orgId } = await getAuthContext();

  const customFields = await prisma.customFieldDefinition.findMany({
    where: { orgId },
    orderBy: [{ module: "asc" }, { displayOrder: "asc" }],
  });

  // Group by module
  const fieldsByModule = modules.reduce((acc, module) => {
    acc[module] = customFields.filter((f) => f.module === module);
    return acc;
  }, {} as Record<string, typeof customFields>);

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
          <AddCustomFieldButton />
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="LEAD">
            <TabsList className="grid w-full grid-cols-4">
              {modules.map((module) => (
                <TabsTrigger key={module} value={module}>
                  {moduleLabels[module]}
                  <Badge variant="secondary" className="ml-2">
                    {fieldsByModule[module].length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {modules.map((module) => (
              <TabsContent key={module} value={module} className="mt-4">
                <CustomFieldsList
                  fields={fieldsByModule[module]}
                  module={module}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
