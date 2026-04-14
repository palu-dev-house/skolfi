import {
  Alert,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { NextPageWithLayout } from "@/lib/page-types";

const LoginPage: NextPageWithLayout = function LoginPage() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  usePageTitle(t("auth.login"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper shadow="md" p={30} radius="md" w={420}>
      <Title order={2} ta="center" mb="xs">
        {t("auth.welcomeBack")}
      </Title>
      <Text c="dimmed" size="sm" ta="center" mb="lg">
        {t("auth.enterCredentials")}
      </Text>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          mb="md"
          onClose={() => setError("")}
          withCloseButton
        >
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label={t("auth.username")}
            placeholder={t("auth.username")}
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
          <PasswordInput
            label={t("auth.password")}
            placeholder={t("auth.enterCredentials")}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
          />
          <Button type="submit" fullWidth loading={loading}>
            {t("auth.login")}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
};
LoginPage.getLayout = (page: ReactElement) => (
  <Center mih="100vh" bg="gray.0">
    {page}
  </Center>
);

export default LoginPage;
