import fs from "node:fs";
import path from "node:path";
import {
  Anchor,
  Badge,
  Box,
  Button,
  Code,
  Divider,
  Grid,
  Group,
  NavLink,
  Paper,
  ScrollArea,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconBook, IconPrinter } from "@tabler/icons-react";
import type { GetStaticProps } from "next";
import { useLocale, useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface Props {
  contentId: string;
  contentEn: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split("\n");
  const toc: TocItem[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{2,3})\s+(.+?)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`]/g, "").trim();
      toc.push({ id: slugify(text), text, level });
    }
  }
  return toc;
}

const HelpPage: NextPageWithLayout<Props> = function HelpPage({
  contentId,
  contentEn,
}: Props) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const content = locale === "en" ? contentEn : contentId;
  const toc = useMemo(() => extractToc(content), [content]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const headings = toc
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );

    for (const el of headings) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [toc]);

  const handleTocClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveId(id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <PageHeader title={t("help")} description={t("helpDescription")} />

      <Group justify="flex-end" mb="md" className="help-print-btn">
        <Button
          variant="light"
          leftSection={<IconPrinter size={18} />}
          onClick={handlePrint}
        >
          {t("print")}
        </Button>
      </Group>

      <Grid gutter="lg">
        {/* TOC Sidebar */}
        <Grid.Col span={{ base: 12, md: 3 }} className="help-toc">
          <Box
            style={{
              position: "sticky",
              top: 76,
            }}
          >
            <Paper withBorder p="sm">
              <ScrollArea h="calc(100vh - 180px)" type="auto">
                <nav>
                  {toc.map((item) => (
                    <NavLink
                      key={item.id}
                      label={item.text}
                      active={activeId === item.id}
                      onClick={() => handleTocClick(item.id)}
                      pl={item.level === 3 ? 24 : 12}
                      styles={{
                        label: {
                          fontSize: item.level === 3 ? 13 : 14,
                          fontWeight: item.level === 2 ? 500 : 400,
                        },
                      }}
                    />
                  ))}
                </nav>
              </ScrollArea>
            </Paper>
          </Box>
        </Grid.Col>

        {/* Content */}
        <Grid.Col span={{ base: 12, md: 9 }} className="help-content-col">
          <Paper withBorder p="xl" className="help-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <Title order={2} mb="md">
                    {children}
                  </Title>
                ),
                h2: ({ children }) => {
                  const text = String(children);
                  const id = slugify(text);
                  return (
                    <Title
                      order={3}
                      id={id}
                      mt="xl"
                      mb="md"
                      style={{ scrollMarginTop: 80 }}
                    >
                      {children}
                    </Title>
                  );
                },
                h3: ({ children }) => {
                  const text = String(children);
                  const id = slugify(text);
                  return (
                    <Title
                      order={4}
                      id={id}
                      mt="lg"
                      mb="sm"
                      style={{ scrollMarginTop: 80 }}
                    >
                      {children}
                    </Title>
                  );
                },
                h4: ({ children }) => (
                  <Title order={5} mt="md" mb="xs">
                    {children}
                  </Title>
                ),
                p: ({ children }) => (
                  <Text mb="sm" style={{ lineHeight: 1.7 }}>
                    {children}
                  </Text>
                ),
                a: ({ href, children }) => {
                  const isExternal = href?.startsWith("http");
                  return (
                    <Anchor
                      href={href}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      onClick={(e) => {
                        if (href?.startsWith("#")) {
                          e.preventDefault();
                          handleTocClick(href.slice(1));
                        }
                      }}
                    >
                      {children}
                    </Anchor>
                  );
                },
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return <Code>{children}</Code>;
                  }
                  return (
                    <Code block mb="sm">
                      {children}
                    </Code>
                  );
                },
                pre: ({ children }) => <Box mb="sm">{children}</Box>,
                ul: ({ children }) => (
                  <Box
                    component="ul"
                    mb="sm"
                    style={{ paddingLeft: 24, lineHeight: 1.8 }}
                  >
                    {children}
                  </Box>
                ),
                ol: ({ children }) => (
                  <Box
                    component="ol"
                    mb="sm"
                    style={{ paddingLeft: 24, lineHeight: 1.8 }}
                  >
                    {children}
                  </Box>
                ),
                li: ({ children }) => (
                  <Box component="li" mb={4}>
                    {children}
                  </Box>
                ),
                strong: ({ children }) => (
                  <Text component="strong" fw={700}>
                    {children}
                  </Text>
                ),
                em: ({ children }) => (
                  <Text component="em" fs="italic">
                    {children}
                  </Text>
                ),
                hr: () => <Divider my="xl" />,
                blockquote: ({ children }) => (
                  <Paper
                    withBorder
                    p="md"
                    my="sm"
                    bg="gray.0"
                    style={{
                      borderLeft: "4px solid var(--mantine-color-blue-6)",
                    }}
                  >
                    {children}
                  </Paper>
                ),
                table: ({ children }) => (
                  <Table.ScrollContainer minWidth={500} mb="md">
                    <Table withTableBorder striped>
                      {children}
                    </Table>
                  </Table.ScrollContainer>
                ),
                thead: ({ children }) => <Table.Thead>{children}</Table.Thead>,
                tbody: ({ children }) => <Table.Tbody>{children}</Table.Tbody>,
                tr: ({ children }) => <Table.Tr>{children}</Table.Tr>,
                th: ({ children }) => <Table.Th>{children}</Table.Th>,
                td: ({ children }) => <Table.Td>{children}</Table.Td>,
              }}
            >
              {content}
            </ReactMarkdown>

            <Divider my="xl" />

            <Box ta="center" className="help-version">
              <Badge
                leftSection={<IconBook size={14} />}
                color="gray"
                variant="light"
              >
                v{process.env.APP_VERSION}
              </Badge>
            </Box>
          </Paper>
        </Grid.Col>
      </Grid>
    </>
  );
};

HelpPage.getLayout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>;

export const getStaticProps: GetStaticProps<Props> = async () => {
  const docsDir = path.join(process.cwd(), "docs");
  const contentId = fs.readFileSync(
    path.join(docsDir, "USER-GUIDE-ID.md"),
    "utf-8",
  );
  const contentEn = fs.readFileSync(
    path.join(docsDir, "USER-GUIDE-EN.md"),
    "utf-8",
  );
  return { props: { contentId, contentEn } };
};

export default HelpPage;
