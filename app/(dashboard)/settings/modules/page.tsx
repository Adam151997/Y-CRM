"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Box,
  Package,
  Layers,
  Tag,
  Briefcase,
  Users,
  FileText,
  Star,
  ShoppingCart,
  Building2,
  Truck,
  Folder,
  Award,
} from "lucide-react";

// Available icons for modules
const availableIcons = [
  { name: "box", icon: Box, label: "Box" },
  { name: "package", icon: Package, label: "Package" },
  { name: "layers", icon: Layers, label: "Layers" },
  { name: "tag", icon: Tag, label: "Tag" },
  { name: "briefcase", icon: Briefcase, label: "Briefcase" },
  { name: "users", icon: Users, label: "Users" },
  { name: "file-text", icon: FileText, label: "Document" },
  { name: "star", icon: Star, label: "Star" },
  { name: "shopping-cart", icon: ShoppingCart, label: "Cart" },
  { name: "building-2", icon: Building2, label: "Building" },
  { name: "truck", icon: Truck, label: "Truck" },
  { name: "folder", icon: Folder, label: "Folder" },
  { name: "award", icon: Award, label: "Award" },
];

// Map icon name to component
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  box: Box,
  package: Package,
  layers: Layers,
  tag: Tag,
  briefcase: Briefcase,
  users: Users,
  "file-text": FileText,
  star: Star,
  "shopping-cart": ShoppingCart,
  "building-2": Building2,
  truck: Truck,
  folder: Folder,
  award: Award,
};

interface CustomModule {
  id: string;
  name: string;
  pluralName: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string | null;
  labelField: string;
  isActive: boolean;
  showInSidebar: boolean;
  displayOrder: number;
  _count: {
    records: number;
    fields: number;
  };
}

export default function ModulesSettingsPage() {
  const [modules, setModules] = useState<CustomModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CustomModule | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<CustomModule | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    pluralName: "",
    slug: "",
    description: "",
    icon: "box",
    showInSidebar: true,
  });

  // Load modules
  const loadModules = async () => {
    try {
      const response = await fetch("/api/custom-modules?active=false");
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules || []);
      }
    } catch (error) {
      console.error("Failed to load modules:", error);
      toast.error("Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      pluralName: formData.pluralName || name + "s",
    });
  };

  // Open dialog for new module
  const openNewDialog = () => {
    setEditingModule(null);
    setFormData({
      name: "",
      pluralName: "",
      slug: "",
      description: "",
      icon: "box",
      showInSidebar: true,
    });
    setDialogOpen(true);
  };

  // Open dialog for editing
  const openEditDialog = (module: CustomModule) => {
    setEditingModule(module);
    setFormData({
      name: module.name,
      pluralName: module.pluralName,
      slug: module.slug,
      description: module.description || "",
      icon: module.icon,
      showInSidebar: module.showInSidebar,
    });
    setDialogOpen(true);
  };

  // Save module
  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.pluralName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = editingModule
        ? `/api/custom-modules/${editingModule.id}`
        : "/api/custom-modules";
      
      const method = editingModule ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingModule ? "Module updated" : "Module created");
        setDialogOpen(false);
        loadModules();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save module");
      }
    } catch (error) {
      console.error("Failed to save module:", error);
      toast.error("Failed to save module");
    } finally {
      setSaving(false);
    }
  };

  // Delete module
  const handleDelete = async () => {
    if (!moduleToDelete) return;

    try {
      const response = await fetch(`/api/custom-modules/${moduleToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Module deleted");
        setDeleteDialogOpen(false);
        setModuleToDelete(null);
        loadModules();
      } else {
        toast.error("Failed to delete module");
      }
    } catch (error) {
      console.error("Failed to delete module:", error);
      toast.error("Failed to delete module");
    }
  };

  // Toggle module active state
  const toggleActive = async (module: CustomModule) => {
    try {
      const response = await fetch(`/api/custom-modules/${module.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !module.isActive }),
      });

      if (response.ok) {
        toast.success(module.isActive ? "Module disabled" : "Module enabled");
        loadModules();
      }
    } catch (error) {
      console.error("Failed to toggle module:", error);
      toast.error("Failed to update module");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Modules</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Custom Modules</CardTitle>
            <CardDescription>
              Create custom modules to track any type of data in your CRM.
              Custom modules appear in the sidebar and can have their own fields.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New Module
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingModule ? "Edit Module" : "Create New Module"}
                </DialogTitle>
                <DialogDescription>
                  {editingModule
                    ? "Update the module settings."
                    : "Define a new module to track custom data."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Product"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pluralName">Plural Name *</Label>
                    <Input
                      id="pluralName"
                      placeholder="Products"
                      value={formData.pluralName}
                      onChange={(e) =>
                        setFormData({ ...formData, pluralName: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="slug">URL Slug *</Label>
                    <Input
                      id="slug"
                      placeholder="products"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                      }
                      disabled={!!editingModule}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Track products and inventory..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableIcons.map((icon) => {
                      const IconComponent = icon.icon;
                      return (
                        <Button
                          key={icon.name}
                          type="button"
                          variant={formData.icon === icon.name ? "default" : "outline"}
                          size="sm"
                          className="h-10 w-10 p-0"
                          onClick={() => setFormData({ ...formData, icon: icon.name })}
                          title={icon.label}
                        >
                          <IconComponent className="h-5 w-5" />
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show in Sidebar</Label>
                    <p className="text-sm text-muted-foreground">
                      Display this module in the main navigation
                    </p>
                  </div>
                  <Switch
                    checked={formData.showInSidebar}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, showInSidebar: checked })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingModule ? "Save Changes" : "Create Module"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <div className="text-center py-12">
              <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No custom modules</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first custom module to track additional data.
              </p>
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Module
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((module) => {
                const IconComponent = iconMap[module.icon] || Box;
                return (
                  <div
                    key={module.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      !module.isActive ? "opacity-50 bg-muted/30" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{module.pluralName}</h4>
                          {!module.isActive && (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                          {module.showInSidebar && module.isActive && (
                            <Badge variant="outline" className="text-xs">
                              In Sidebar
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          /{module.slug} • {module._count.records} records •{" "}
                          {module._count.fields} fields
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(module)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(module)}>
                          {module.isActive ? "Disable" : "Enable"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setModuleToDelete(module);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{moduleToDelete?.pluralName}&quot;?
              This will permanently delete the module and all{" "}
              {moduleToDelete?._count.records || 0} records. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
