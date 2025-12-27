"use server";

import { revalidatePath } from "next/cache";
import { locales, type Locale, defaultLocale } from "@/i18n/config";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * Set the organization's language preference
 * This updates the organization record in the database
 */
export async function setLocale(locale: Locale) {
  // Validate the locale
  if (!locales.includes(locale)) {
    throw new Error(`Invalid locale: ${locale}`);
  }

  // Get the current organization
  const { orgId } = await getAuthContext();

  // Update the organization's language in the database
  await prisma.organization.update({
    where: { id: orgId },
    data: { language: locale },
  });

  // Revalidate all paths to reflect the new locale
  revalidatePath("/", "layout");
}

/**
 * Get the organization's stored language preference
 */
export async function getStoredLocale(): Promise<Locale> {
  try {
    const { orgId } = await getAuthContext();

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { language: true },
    });

    if (org?.language && locales.includes(org.language as Locale)) {
      return org.language as Locale;
    }
  } catch {
    // If auth fails or org not found, return default
  }

  return defaultLocale;
}

/**
 * Get organization language for server-side rendering
 * Falls back to default if not authenticated
 */
export async function getOrganizationLocale(): Promise<Locale> {
  try {
    const { orgId } = await getAuthContext();

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { language: true },
    });

    if (org?.language && locales.includes(org.language as Locale)) {
      return org.language as Locale;
    }
  } catch {
    // Not authenticated or org not found
  }

  return defaultLocale;
}
