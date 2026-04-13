import dynamic from "next/dynamic";
import { useEffect } from "react";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  useEffect(() => {
    // Add class to body to disable Mantine styles on this page
    document.body.classList.add("swagger-page");

    return () => {
      document.body.classList.remove("swagger-page");
    };
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-react@5.31.0/swagger-ui.css"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Reset Mantine global styles for Swagger UI page */
            body.swagger-page {
              background: #fafafa !important;
              color: #3b4151 !important;
            }

            body.swagger-page .mantine-Notifications-root,
            body.swagger-page .mantine-Modal-root {
              display: none !important;
            }

            .swagger-container {
              all: initial;
              display: block;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }

            .swagger-container * {
              font-family: inherit;
            }

            .swagger-container .swagger-ui {
              font-family: sans-serif;
            }

            .swagger-container .swagger-ui .info .title {
              font-family: sans-serif;
              color: #3b4151;
            }

            .swagger-container .swagger-ui .opblock-tag {
              font-family: sans-serif;
            }

            .swagger-container .swagger-ui .opblock .opblock-summary-operation-id,
            .swagger-container .swagger-ui .opblock .opblock-summary-path,
            .swagger-container .swagger-ui .opblock .opblock-summary-path__deprecated {
              font-family: monospace;
            }

            .swagger-container .swagger-ui .btn {
              font-family: sans-serif;
            }

            .swagger-container .swagger-ui select,
            .swagger-container .swagger-ui input,
            .swagger-container .swagger-ui textarea {
              font-family: sans-serif;
            }

            .swagger-container .swagger-ui .model-title {
              font-family: sans-serif;
            }
          `,
        }}
      />
      <div
        className="swagger-container"
        style={{ padding: "1rem", minHeight: "100vh", background: "#fafafa" }}
      >
        <SwaggerUI url="/api/swagger" />
      </div>
    </>
  );
}
