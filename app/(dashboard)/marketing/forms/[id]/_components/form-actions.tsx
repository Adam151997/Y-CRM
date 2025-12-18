"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Copy, 
  Power, 
  PowerOff, 
  Loader2, 
  Code, 
  Check, 
  ExternalLink,
  Plus,
  X,
  GripVertical,
} from "lucide-react";

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface Form {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  isActive: boolean;
  createLead: boolean;
  leadSource: string;
  fields: unknown; // JsonValue from Prisma
}

interface FormActionsProps {
  form: Form;
}

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Text Area" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkbox" },
];

const LEAD_SOURCES = [
  "WEBSITE",
  "FORM",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "ADVERTISEMENT",
  "COLD_CALL",
  "EVENT",
  "OTHER",
];

export function FormActions({ form }: FormActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: form.name,
    description: form.description || "",
    slug: form.slug || "",
    createLead: form.createLead,
    leadSource: form.leadSource,
    fields: (Array.isArray(form.fields) ? form.fields : []) as FormField[],
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (showEditDialog) {
      setEditForm({
        name: form.name,
        description: form.description || "",
        slug: form.slug || "",
        createLead: form.createLead,
        leadSource: form.leadSource,
        fields: (Array.isArray(form.fields) ? form.fields : []) as FormField[],
      });
    }
  }, [showEditDialog, form]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const formUrl = form.slug ? `${baseUrl}/f/${form.slug}` : null;

  const iframeCode = formUrl
    ? `<iframe 
  src="${formUrl}" 
  width="100%" 
  height="600" 
  frameborder="0" 
  style="border: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
</iframe>`
    : "";

  const linkCode = formUrl
    ? `<a 
  href="${formUrl}" 
  target="_blank" 
  rel="noopener noreferrer"
  style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
  ${form.name}
</a>`
    : "";

  const directLink = formUrl || "";

  const toggleActive = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/marketing/forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !form.isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update form");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating form:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/marketing/forms/${form.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete form");
      }

      router.push("/marketing/forms");
    } catch (error) {
      console.error("Error deleting form:", error);
      setIsDeleting(false);
    }
  };

  const handleEdit = async () => {
    if (!editForm.name.trim()) {
      alert("Form name is required");
      return;
    }

    if (editForm.fields.length === 0) {
      alert("At least one field is required");
      return;
    }

    // Validate all fields have labels
    const invalidFields = editForm.fields.filter(f => !f.label.trim());
    if (invalidFields.length > 0) {
      alert("All fields must have a label");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/marketing/forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || null,
          slug: editForm.slug || null,
          createLead: editForm.createLead,
          leadSource: editForm.leadSource,
          fields: editForm.fields,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update form");
      }

      setShowEditDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating form:", error);
      alert(error instanceof Error ? error.message : "Failed to update form. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (code: string, type: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(type);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Field management functions
  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "",
      required: false,
      placeholder: "",
    };
    setEditForm({ ...editForm, fields: [...editForm.fields, newField] });
  };

  const removeField = (index: number) => {
    setEditForm({
      ...editForm,
      fields: editForm.fields.filter((_, i) => i !== index),
    });
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setEditForm({
      ...editForm,
      fields: editForm.fields.map((field, i) =>
        i === index ? { ...field, ...updates } : field
      ),
    });
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newFields = [...editForm.fields];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newFields.length) return;
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setEditForm({ ...editForm, fields: newFields });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={toggleActive} disabled={isUpdating}>
          {isUpdating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : form.isActive ? (
            <PowerOff className="h-4 w-4 mr-2" />
          ) : (
            <Power className="h-4 w-4 mr-2" />
          )}
          {form.isActive ? "Deactivate" : "Activate"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Form
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowEmbedDialog(true)}>
              <Code className="h-4 w-4 mr-2" />
              Get Embed Code
            </DropdownMenuItem>
            {formUrl && (
              <DropdownMenuItem asChild>
                <a href={formUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Form
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Form
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Form</DialogTitle>
            <DialogDescription>
              Update form settings and fields
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="settings" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="fields">Fields ({editForm.fields.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Form Name *</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="e.g., Contact Form"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-slug">URL Slug</Label>
                  <Input
                    id="edit-slug"
                    value={editForm.slug}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    placeholder="e.g., contact-form"
                  />
                  <p className="text-xs text-muted-foreground">
                    Form will be accessible at /f/{editForm.slug || "your-slug"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Brief description of this form..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="create-lead">Create Lead on Submission</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create a lead when form is submitted
                  </p>
                </div>
                <Switch
                  id="create-lead"
                  checked={editForm.createLead}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, createLead: checked })}
                />
              </div>

              {editForm.createLead && (
                <div className="space-y-2">
                  <Label htmlFor="lead-source">Lead Source</Label>
                  <Select
                    value={editForm.leadSource}
                    onValueChange={(value) => setEditForm({ ...editForm, leadSource: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            <TabsContent value="fields" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Define the fields for your form
                </p>
                <Button type="button" variant="outline" size="sm" onClick={addField}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>

              {editForm.fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No fields defined. Add fields to build your form.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {editForm.fields.map((field, index) => (
                    <div key={field.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Field {index + 1}</span>
                        <div className="flex-1" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveField(index, "up")}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveField(index, "down")}
                          disabled={index === editForm.fields.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Label *</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(index, { label: e.target.value })}
                            placeholder="e.g., Email Address"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) => updateField(index, { type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Placeholder</Label>
                          <Input
                            value={field.placeholder || ""}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                            placeholder="e.g., you@example.com"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-6">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(index, { required: checked })}
                          />
                          <Label>Required field</Label>
                        </div>
                      </div>

                      {["select", "radio"].includes(field.type) && (
                        <div className="space-y-2">
                          <Label>Options (one per line)</Label>
                          <Textarea
                            value={(field.options || []).join("\n")}
                            onChange={(e) => updateField(index, { 
                              options: e.target.value.split("\n").filter(o => o.trim()) 
                            })}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{form.name}&quot;? This will also delete all submissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Embed Code Dialog */}
      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embed Form</DialogTitle>
            <DialogDescription>
              Choose how you want to add this form to your website
            </DialogDescription>
          </DialogHeader>

          {!formUrl ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>This form doesn&apos;t have a public URL yet.</p>
              <p className="text-sm mt-1">Add a slug in the edit dialog to enable embedding.</p>
            </div>
          ) : (
            <Tabs defaultValue="iframe" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="iframe">Iframe</TabsTrigger>
                <TabsTrigger value="link">Button Link</TabsTrigger>
                <TabsTrigger value="direct">Direct URL</TabsTrigger>
              </TabsList>

              <TabsContent value="iframe" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Embed the form directly on your page using an iframe.
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                    {iframeCode}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(iframeCode, "iframe")}
                  >
                    {copiedCode === "iframe" ? (
                      <><Check className="h-3 w-3 mr-1" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3 mr-1" /> Copy</>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="link" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add a styled button that opens the form in a new tab.
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                    {linkCode}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(linkCode, "link")}
                  >
                    {copiedCode === "link" ? (
                      <><Check className="h-3 w-3 mr-1" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3 mr-1" /> Copy</>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="direct" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share this direct link to your form.
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    {directLink}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(directLink, "direct")}
                  >
                    {copiedCode === "direct" ? (
                      <><Check className="h-3 w-3 mr-1" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3 mr-1" /> Copy</>
                    )}
                  </Button>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a href={formUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Form in New Tab
                  </a>
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
