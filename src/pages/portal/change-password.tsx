import {
  Alert,
  Button,
  Card,
  PasswordInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import PortalLayout from "@/components/layouts/PortalLayout";
import type { NextPageWithLayout } from "@/lib/page-types";

const ChangePasswordPage: NextPageWithLayout = function ChangePasswordPage() {
  const t = useTranslations();
  const searchParams = new URLSearchParams(
    useRouter().asPath.split("?")[1] || "",
  );
  const isFirst = searchParams.get("first") === "true";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("auth.passwordMinLength"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/student-auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error?.message || t("auth.passwordChangeError"));
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="lg">
      <Title order={3}>{t("auth.changePassword")}</Title>

      {isFirst && !success && (
        <Alert icon={<IconAlertCircle size={18} />} color="yellow">
          {t("auth.defaultPasswordWarning")}
        </Alert>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={18} />} color="red" variant="light">
          {error}
        </Alert>
      )}

      {success && (
        <Alert icon={<IconCheck size={18} />} color="green">
          {t("auth.passwordChanged")}
        </Alert>
      )}

      <Card withBorder p="lg">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <PasswordInput
              label={t("auth.currentPassword")}
              placeholder={t("auth.currentPasswordPlaceholder")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.currentTarget.value)}
              required
            />

            <PasswordInput
              label={t("auth.newPassword")}
              placeholder={t("auth.newPasswordPlaceholder")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.currentTarget.value)}
              required
            />

            <PasswordInput
              label={t("auth.confirmPassword")}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              required
            />

            <Button type="submit" loading={loading}>
              {t("auth.changePassword")}
            </Button>

            <Text size="xs" c="dimmed">
              {t("auth.passwordRequirements")}
            </Text>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
};
ChangePasswordPage.getLayout = (page: ReactElement) => (
  <PortalLayout>{page}</PortalLayout>
);

export default ChangePasswordPage;
