import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "../styles/portal.css";
import "../styles/print.css";

import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { AppProps } from "next/app";
import { Plus_Jakarta_Sans } from "next/font/google";
import Head from "next/head";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import type { NextPageWithLayout } from "@/lib/page-types";
import { createAppTheme } from "@/lib/theme";
import en from "@/messages/en.json";
import id from "@/messages/id.json";

dayjs.extend(customParseFormat);

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const messagesMap: Record<string, typeof en> = { en, id };

function getLocaleCookie(): string {
  if (typeof document === "undefined") return "id";
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]*)/);
  return match?.[1] === "en" ? "en" : "id";
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
          },
        },
      }),
  );

  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState("id");

  useEffect(() => {
    setMounted(true);
    setLocale(getLocaleCookie());

    // Watch for locale cookie changes
    const interval = setInterval(() => {
      const current = getLocaleCookie();
      setLocale((prev) => (prev !== current ? current : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);

  return (
    <>
      <Head>
        <ColorSchemeScript />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </Head>
      {mounted ? (
        <div className={plusJakartaSans.className}>
          <NextIntlClientProvider
            locale={locale}
            messages={messagesMap[locale]}
          >
            <QueryClientProvider client={queryClient}>
              <MantineProvider
                defaultColorScheme="light"
                theme={createAppTheme(plusJakartaSans.style.fontFamily)}
              >
                <ModalsProvider modalProps={{ centered: true }}>
                  <Notifications position="top-right" />
                  {getLayout(<Component {...pageProps} />)}
                </ModalsProvider>
              </MantineProvider>
              <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
          </NextIntlClientProvider>
        </div>
      ) : null}
    </>
  );
}
