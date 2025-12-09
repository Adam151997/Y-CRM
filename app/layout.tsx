import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Y CRM - AI-Powered CRM for SMBs",
    template: "%s | Y CRM",
  },
  description:
    "The intelligent CRM platform with AI assistants, voice commands, and automated workflows. Built for Sales, Customer Success, and Marketing teams.",
  keywords: [
    "CRM",
    "AI CRM",
    "Customer Relationship Management",
    "Sales Management",
    "Customer Success",
    "Marketing Automation",
    "Lead Management",
    "Pipeline Management",
    "SMB CRM",
  ],
  authors: [{ name: "Y CRM" }],
  creator: "Y CRM",
  publisher: "Y CRM",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://y-crm.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Y CRM",
    title: "Y CRM - AI-Powered CRM for SMBs",
    description:
      "The intelligent CRM platform with AI assistants, voice commands, and automated workflows.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Y CRM - AI-Powered CRM for SMBs",
    description:
      "The intelligent CRM platform with AI assistants, voice commands, and automated workflows.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
