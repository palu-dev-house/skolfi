"use client";

import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Switch,
  Text,
  Textarea,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import {
  usePaymentSettings,
  useUpdatePaymentSettings,
} from "@/hooks/api/useAdminOnlinePayments";

export default function PaymentSettingsPage() {
  const t = useTranslations();
  const { data: settings, isLoading } = usePaymentSettings();
  const updateSettings = useUpdatePaymentSettings();

  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (settings) {
      setEnabled(settings.onlinePaymentEnabled);
      setMessage(settings.maintenanceMessage || "");
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      onlinePaymentEnabled: enabled,
      maintenanceMessage: message.trim() || null,
    });
  };

  const hasChanges =
    settings &&
    (enabled !== settings.onlinePaymentEnabled ||
      (message.trim() || null) !== (settings.maintenanceMessage || null));

  if (isLoading) {
    return (
      <Stack align="center" py="xl">
        <Loader />
      </Stack>
    );
  }

  return (
    <>
      <PageHeader
        title={t("paymentSettings.title")}
        description={t("paymentSettings.description")}
      />

      <Card withBorder p="lg">
        <Stack gap="lg">
          <Group justify="space-between">
            <Stack gap={2}>
              <Text fw={500}>{t("paymentSettings.enableOnlinePayment")}</Text>
              <Text size="sm" c="dimmed">
                {t("paymentSettings.enableDescription")}
              </Text>
            </Stack>
            <Switch
              checked={enabled}
              onChange={(e) => setEnabled(e.currentTarget.checked)}
              size="lg"
            />
          </Group>

          {!enabled && (
            <Textarea
              label={t("paymentSettings.maintenanceMessage")}
              description={t("paymentSettings.maintenanceDescription")}
              placeholder={t("paymentSettings.maintenancePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.currentTarget.value)}
              minRows={3}
            />
          )}

          {updateSettings.isSuccess && (
            <Alert icon={<IconCheck size={16} />} color="green" variant="light">
              {t("common.saved")}
            </Alert>
          )}

          {updateSettings.isError && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
            >
              {updateSettings.error instanceof Error
                ? updateSettings.error.message
                : t("common.error")}
            </Alert>
          )}

          <Button
            onClick={handleSave}
            loading={updateSettings.isPending}
            disabled={!hasChanges}
          >
            {t("common.save")}
          </Button>
        </Stack>
      </Card>
    </>
  );
}
