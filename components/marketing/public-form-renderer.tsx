"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface Branding {
  orgName?: string;
  showPoweredBy?: boolean;
}

interface PublicFormRendererProps {
  formId: string;
  slug: string;
  name: string;
  description?: string;
  fields: FormField[];
  branding?: Branding;
}

export function PublicFormRenderer({
  formId,
  slug,
  name,
  description,
  fields,
  branding,
}: PublicFormRendererProps) {
  const [formData, setFormData] = useState<Record<string, string | boolean | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const handleFieldChange = (fieldId: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error when field is edited
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch(`/api/public/forms/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: formData,
          honeypot, // Send honeypot value
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          setErrors(result.errors);
        }
        throw new Error(result.error || "Submission failed");
      }

      // Handle redirect
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }

      // Show success
      setSubmitStatus("success");
      setConfirmationMessage(result.confirmationMessage || "Thank you for your submission!");
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Branding header component
  const BrandingHeader = () => {
    if (!branding?.orgName) return null;
    
    return (
      <div className="flex items-center justify-center gap-2 mb-6 pb-4 border-b border-border">
        <span className="font-semibold text-foreground">{branding.orgName}</span>
      </div>
    );
  };

  // Powered by footer component
  const PoweredByFooter = () => {
    if (branding?.showPoweredBy === false) return null;
    
    return (
      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          Powered by{" "}
          <a 
            href="https://y-crm.vercel.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Y-CRM
          </a>
        </p>
      </div>
    );
  };

  // Success state
  if (submitStatus === "success") {
    return (
      <div className="text-center py-12">
        <BrandingHeader />
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Submitted Successfully!</h2>
        <p className="text-muted-foreground">{confirmationMessage}</p>
        <PoweredByFooter />
      </div>
    );
  }

  // Error state
  if (submitStatus === "error") {
    return (
      <div className="text-center py-12">
        <BrandingHeader />
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">Please try again later.</p>
        <Button onClick={() => setSubmitStatus("idle")}>Try Again</Button>
        <PoweredByFooter />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Branding Header */}
      <BrandingHeader />

      {/* Form Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">{name}</h1>
        {description && <p className="text-muted-foreground mt-2">{description}</p>}
      </div>

      {/* Honeypot field - hidden from humans, visible to bots */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {/* Form Fields */}
      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id} className="text-foreground">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {/* Text Input */}
          {field.type === "text" && (
            <Input
              id={field.id}
              type="text"
              placeholder={field.placeholder}
              value={(formData[field.id] as string) || ""}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={errors[field.id] ? "border-destructive" : ""}
            />
          )}

          {/* Email Input */}
          {field.type === "email" && (
            <Input
              id={field.id}
              type="email"
              placeholder={field.placeholder || "you@example.com"}
              value={(formData[field.id] as string) || ""}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={errors[field.id] ? "border-destructive" : ""}
            />
          )}

          {/* Phone Input */}
          {field.type === "phone" && (
            <Input
              id={field.id}
              type="tel"
              placeholder={field.placeholder || "(123) 456-7890"}
              value={(formData[field.id] as string) || ""}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={errors[field.id] ? "border-destructive" : ""}
            />
          )}

          {/* Number Input */}
          {field.type === "number" && (
            <Input
              id={field.id}
              type="number"
              placeholder={field.placeholder}
              value={(formData[field.id] as string) || ""}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={errors[field.id] ? "border-destructive" : ""}
            />
          )}

          {/* Date Input */}
          {field.type === "date" && (
            <Input
              id={field.id}
              type="date"
              value={(formData[field.id] as string) || ""}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={errors[field.id] ? "border-destructive" : ""}
            />
          )}

          {/* Textarea */}
          {field.type === "textarea" && (
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              rows={4}
              value={(formData[field.id] as string) || ""}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={errors[field.id] ? "border-destructive" : ""}
            />
          )}

          {/* Select Dropdown */}
          {field.type === "select" && field.options && (
            <Select
              value={(formData[field.id] as string) || ""}
              onValueChange={(value) => handleFieldChange(field.id, value)}
            >
              <SelectTrigger className={errors[field.id] ? "border-destructive" : ""}>
                <SelectValue placeholder={field.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Radio Group - Native Implementation */}
          {field.type === "radio" && field.options && (
            <div className="space-y-2">
              {field.options.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${field.id}-${option}`}
                    name={field.id}
                    value={option}
                    checked={(formData[field.id] as string) === option}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    className="h-4 w-4 border-border text-primary focus:ring-primary"
                  />
                  <Label htmlFor={`${field.id}-${option}`} className="font-normal text-foreground">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {/* Checkbox */}
          {field.type === "checkbox" && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={field.id}
                checked={(formData[field.id] as boolean) || false}
                onCheckedChange={(checked) => handleFieldChange(field.id, checked as boolean)}
              />
              <Label htmlFor={field.id} className="font-normal text-foreground">
                {field.placeholder || field.label}
              </Label>
            </div>
          )}

          {/* Error Message */}
          {errors[field.id] && (
            <p className="text-sm text-destructive">{errors[field.id]}</p>
          )}
        </div>
      ))}

      {/* Submit Button */}
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit"
        )}
      </Button>

      {/* Privacy Notice */}
      <p className="text-xs text-muted-foreground text-center">
        By submitting this form, you agree to our privacy policy.
      </p>

      {/* Powered By Footer */}
      <PoweredByFooter />
    </form>
  );
}
