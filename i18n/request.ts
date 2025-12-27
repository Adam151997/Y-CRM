import { getRequestConfig } from 'next-intl/server';
import { auth } from '@clerk/nextjs/server';
import { defaultLocale, locales, type Locale } from './config';
import prisma from '@/lib/db';

export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale;

  try {
    // Get organization ID from Clerk auth
    const { orgId, userId } = await auth();

    if (userId) {
      // Use effective org ID (same logic as getAuthContext)
      const effectiveOrgId = orgId || `user_${userId}`;

      // Fetch organization's language from database
      const org = await prisma.organization.findUnique({
        where: { id: effectiveOrgId },
        select: { language: true },
      });

      // Validate and use the organization's language
      if (org?.language && locales.includes(org.language as Locale)) {
        locale = org.language as Locale;
      }
    }
  } catch {
    // If auth fails or database query fails, use default locale
    // This handles unauthenticated pages gracefully
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
