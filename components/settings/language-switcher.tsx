"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Check } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n/config";
import { setLocale } from "@/lib/actions/locale";

export function LanguageSwitcher() {
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={currentLocale}
          onValueChange={handleLocaleChange}
          disabled={isPending}
          className="grid gap-3"
        >
          {locales.map((locale) => (
            <div key={locale} className="relative">
              <RadioGroupItem
                value={locale}
                id={`lang-${locale}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`lang-${locale}`}
                className="flex items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{localeFlags[locale]}</span>
                  <div>
                    <p className="font-medium">{localeNames[locale]}</p>
                    <p className="text-sm text-muted-foreground">
                      {locale === "en" && "English"}
                      {locale === "ar" && "Arabic"}
                      {locale === "de" && "German"}
                      {locale === "es" && "Spanish"}
                      {locale === "fr" && "French"}
                    </p>
                  </div>
                </div>
                {currentLocale === locale && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {isPending && (
          <p className="mt-4 text-sm text-muted-foreground animate-pulse">
            {t("switchSuccess")}...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
