import { ImportDialog, ExportDialog } from "@/components/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, Database, FileSpreadsheet, AlertTriangle } from "lucide-react";

export default function DataManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Data Management</h2>
        <p className="text-muted-foreground">
          Import and export your CRM data
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Import Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Data
            </CardTitle>
            <CardDescription>
              Upload CSV files to bulk import records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Supported modules:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Leads (first name, last name, email, etc.)</li>
                <li>Contacts (first name, last name, email, etc.)</li>
                <li>Accounts (name, website, industry, etc.)</li>
                <li>Tasks (title, due date, priority, etc.)</li>
                <li>Inventory (SKU, name, price, quantity, etc.)</li>
                <li>Employees (name, email, department, salary, etc.)</li>
              </ul>
            </div>
            <ImportDialog
              trigger={
                <Button className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Import from CSV
                </Button>
              }
            />
          </CardContent>
        </Card>

        {/* Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Download your CRM data as CSV or JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Exportable modules:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Leads</li>
                <li>Contacts</li>
                <li>Accounts</li>
                <li>Opportunities</li>
                <li>Tasks</li>
                <li>Support Tickets</li>
                <li>Employees</li>
                <li>Leaves</li>
                <li>Payroll</li>
              </ul>
            </div>
            <ExportDialog
              trigger={
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV/JSON
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Quick Export
          </CardTitle>
          <CardDescription>
            Export specific modules directly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <ExportDialog
              module="leads"
              trigger={
                <Button variant="outline" size="sm" className="w-full">
                  Leads
                </Button>
              }
            />
            <ExportDialog
              module="contacts"
              trigger={
                <Button variant="outline" size="sm" className="w-full">
                  Contacts
                </Button>
              }
            />
            <ExportDialog
              module="accounts"
              trigger={
                <Button variant="outline" size="sm" className="w-full">
                  Accounts
                </Button>
              }
            />
            <ExportDialog
              module="opportunities"
              trigger={
                <Button variant="outline" size="sm" className="w-full">
                  Opportunities
                </Button>
              }
            />
            <ExportDialog
              module="tasks"
              trigger={
                <Button variant="outline" size="sm" className="w-full">
                  Tasks
                </Button>
              }
            />
            <ExportDialog
              module="tickets"
              trigger={
                <Button variant="outline" size="sm" className="w-full">
                  Tickets
                </Button>
              }
            />
            <ExportDialog
              module="employees"
              trigger={
                <Button variant="outline" size="sm" className="w-full">
                  Employees
                </Button>
              }
            />
            <ExportDialog
              module="leaves"
              trigger={
                <Button variant="outline" size="sm" className="w-full">
                  Leaves
                </Button>
              }
            />
            <ExportDialog
              module="payroll"
              trigger={
                <Button variant="outline" size="sm" className="w-full">
                  Payroll
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Guidelines Card */}
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            Import Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p>
            <strong>File Format:</strong> CSV files with headers in the first row
          </p>
          <p>
            <strong>Required Fields:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Leads: First Name, Last Name</li>
            <li>Contacts: First Name, Last Name</li>
            <li>Accounts: Name</li>
            <li>Tasks: Title</li>
            <li>Inventory: Name</li>
            <li>Employees: First Name, Last Name, Email</li>
          </ul>
          <p>
            <strong>Tips:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Download a template first to see expected column names</li>
            <li>Dates should be in ISO format (YYYY-MM-DD) or common formats</li>
            <li>Status and source values will be normalized automatically</li>
            <li>Maximum file size: 10MB</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
