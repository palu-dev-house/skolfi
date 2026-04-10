import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Tuition Management System",
  description: "Manage school tuitions, payments, and scholarships",
  manifest: "/manifest.json",
  themeColor: "#000000",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <MantineProvider defaultColorScheme="light">
              <ModalsProvider modalProps={{ centered: true }}>
                <Notifications position="top-right" />
                {children}
              </ModalsProvider>
            </MantineProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
