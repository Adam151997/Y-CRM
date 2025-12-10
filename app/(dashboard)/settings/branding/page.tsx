"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Building2, Upload, X, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function BrandingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch current branding
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch("/api/organization/branding");
        if (response.ok) {
          const data = await response.json();
          setBrandName(data.brandName || "");
          setBrandLogo(data.brandLogo || null);
        }
      } catch (error) {
        console.error("Failed to fetch branding:", error);
        toast.error("Failed to load branding settings");
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setBrandLogo(data.file.url);
      toast.success("Logo uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  // Remove logo
  const removeLogo = () => {
    setBrandLogo(null);
  };

  // Save branding
  const saveBranding = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/organization/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim() || "Y CRM",
          brandLogo,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      // Dispatch event to update sidebar
      window.dispatchEvent(new CustomEvent("branding-updated"));
      
      toast.success("Branding updated successfully");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription>
            Customize how your CRM appears to your team. Add your company name and logo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Brand Name */}
          <div className="space-y-2">
            <Label htmlFor="brandName">Company Name</Label>
            <Input
              id="brandName"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Your Company Name"
              className="max-w-md"
            />
            <p className="text-sm text-muted-foreground">
              This will be displayed in the sidebar and throughout the CRM.
            </p>
          </div>

          {/* Brand Logo */}
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-start gap-4">
              {/* Current Logo Preview */}
              <div className="w-20 h-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                {brandLogo ? (
                  <img
                    src={brandLogo}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Logo size={40} />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    asChild
                  >
                    <label className="cursor-pointer">
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploading ? "Uploading..." : "Upload Logo"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </Button>
                  {brandLogo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeLogo}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Recommended: Square image, at least 128×128px. Max 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2 pt-4 border-t">
            <Label>Preview</Label>
            <div className="p-4 rounded-lg border bg-card max-w-xs">
              <div className="flex items-center gap-2">
                {brandLogo ? (
                  <img
                    src={brandLogo}
                    alt="Logo preview"
                    className="h-8 w-8 object-contain rounded"
                  />
                ) : (
                  <Logo size={28} />
                )}
                <span className="font-semibold text-lg">
                  {brandName || "Y CRM"}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This is how your branding will appear in the sidebar.
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <Button onClick={saveBranding} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
