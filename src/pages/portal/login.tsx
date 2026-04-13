import {
  Alert,
  Button,
  Card,
  Center,
  Container,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconSchool, IconUser } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import PortalLayout from "@/components/layouts/PortalLayout";
import type { NextPageWithLayout } from "@/lib/page-types";

const StudentLoginPage: NextPageWithLayout = function StudentLoginPage() {
  const t = useTranslations();
  const [nis, setNis] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/student-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nis, password }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.data.mustChangePassword) {
          router.push("/portal/change-password?first=true");
        } else {
          router.push("/portal");
        }
      } else {
        setError(data.error?.message || t("auth.loginError"));
      }
    } catch {
      setError(t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" py="xl">
      <Center mb="xl">
        <Stack align="center" gap="xs">
          <IconSchool size={48} />
          <Title order={2}>{t("portal.loginTitle")}</Title>
          <Text c="dimmed" size="sm">
            {t("portal.loginSubtitle")}
          </Text>
        </Stack>
      </Center>

      <Card withBorder p="xl">
        <form onSubmit={handleLogin}>
          <Stack gap="md">
            {error && (
              <Alert
                icon={<IconAlertCircle size={18} />}
                color="red"
                variant="light"
              >
                {error}
              </Alert>
            )}

            <TextInput
              label={t("portal.nisLabel")}
              placeholder={t("portal.nisPlaceholder")}
              leftSection={<IconUser size={18} />}
              value={nis}
              onChange={(e) => setNis(e.currentTarget.value)}
              required
            />

            <PasswordInput
              label={t("auth.password")}
              placeholder={t("portal.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
            />

            <Button type="submit" loading={loading} fullWidth>
              {t("auth.login")}
            </Button>

            <Text
              size="xs"
              c="dimmed"
              ta="center"
              style={{ whiteSpace: "pre-line" }}
            >
              {t("portal.defaultPasswordHelp")}
            </Text>
          </Stack>
        </form>
      </Card>
    </Container>
  );
};
StudentLoginPage.getLayout = (page: ReactElement) => (
  <PortalLayout>{page}</PortalLayout>
);

export default StudentLoginPage;
