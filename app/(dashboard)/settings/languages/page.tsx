"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Check } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n/config";
import { setLocale } from "@/lib/actions/locale";

export default function LanguagesSettingsPage() {
  const t = useTranslations("settings.language");
  const currentLocale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === currentLocale) return;

    startTransition(async () => {
      try {
        await setLocale(newLocale as Locale);
        toast.success(t("switchSuccess"));
      } catch {
        toast.error(t("switchError"));
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("orgDescription")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("select")}</label>
            <Select
              value={currentLocale}
              onValueChange={handleLocaleChange}
              disabled={isPending}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span>{localeFlags[currentLocale]}</span>
                    <span>{localeNames[currentLocale]}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {locales.map((locale) => (
                  <SelectItem key={locale} value={locale}>
                    <span className="flex items-center gap-2">
                      <span>{localeFlags[locale]}</span>
                      <span>{localeNames[locale]}</span>
                      {currentLocale === locale && (
                        <Check className="h-4 w-4 ml-auto text-primary" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">{t("available")}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {locales.map((locale) => (
                <div
                  key={locale}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    currentLocale === locale
                      ? "border-primary bg-primary/5"
                      : "border-muted"
                  }`}
                >
                  <span className="text-2xl">{localeFlags[locale]}</span>
                  <div>
                    <p className="font-medium">{localeNames[locale]}</p>
                    <p className="text-xs text-muted-foreground">
                      {locale === "en" && "English"}
                      {locale === "ar" && "Arabic"}
                      {locale === "de" && "German"}
                      {locale === "es" && "Spanish"}
                      {locale === "fr" && "French"}
                    </p>
                  </div>
                  {currentLocale === locale && (
                    <Check className="h-4 w-4 ml-auto text-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
