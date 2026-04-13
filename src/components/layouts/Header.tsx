"use client";

import {
  Avatar,
  Burger,
  Button,
  Group,
  Menu,
  Modal,
  PasswordInput,
  Skeleton,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconKey, IconLogout, IconUser } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useAuth, useChangePassword } from "@/hooks/useAuth";

interface HeaderProps {
  mobileOpened: boolean;
  desktopOpened: boolean;
  toggleMobile: () => void;
  toggleDesktop: () => void;
}

export default function Header({
  mobileOpened,
  desktopOpened,
  toggleMobile,
  toggleDesktop,
}: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  const { user, logout, isLoading } = useAuth();
  const [
    passwordModalOpened,
    { open: openPasswordModal, close: closePasswordModal },
  ] = useDisclosure(false);
  const [
    profileModalOpened,
    { open: openProfileModal, close: closeProfileModal },
  ] = useDisclosure(false);
  const changePassword = useChangePassword();
  const t = useTranslations();

  const form = useForm({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      currentPassword: (value) =>
        value.length < 1 ? t("auth.passwordRequired") : null,
      newPassword: (value) =>
        value.length < 6 ? t("auth.newPasswordMinChars") : null,
      confirmPassword: (value, values) =>
        value !== values.newPassword ? t("auth.passwordsDoNotMatch") : null,
    },
  });

  const handleChangePassword = (values: typeof form.values) => {
    changePassword.mutate(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          notifications.show({
            title: t("common.confirm"),
            message: t("auth.passwordChanged"),
            color: "green",
            icon: <IconCheck size={16} />,
          });
          form.reset();
          closePasswordModal();
        },
        onError: (error) => {
          notifications.show({
            title: t("common.error"),
            message:
              error instanceof Error
                ? error.message
                : t("auth.passwordChangeError"),
            color: "red",
          });
        },
      },
    );
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group>
        <Burger
          opened={mobileOpened}
          onClick={toggleMobile}
          hiddenFrom="sm"
          size="sm"
        />
        <Burger
          opened={desktopOpened}
          onClick={toggleDesktop}
          visibleFrom="sm"
          size="sm"
        />
        <Title order={3}>{t("header.title")}</Title>
      </Group>

      <Group gap="sm">
        <LanguageSwitcher variant="light" color="gray" />
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <UnstyledButton>
              <Group gap="xs">
                {!mounted || isLoading ? (
                  <>
                    <Skeleton circle height={30} width={30} />
                    <div>
                      <Skeleton height={14} width={80} mb={4} />
                      <Skeleton height={10} width={50} />
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar size="sm" radius="xl" color="blue">
                      {user?.name?.charAt(0).toUpperCase() || "?"}
                    </Avatar>
                    <div>
                      <Text size="sm" fw={500}>
                        {user?.name || "User"}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {user?.role || "Guest"}
                      </Text>
                    </div>
                  </>
                )}
              </Group>
            </UnstyledButton>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconUser size={14} />}
              onClick={openProfileModal}
            >
              {t("auth.profile")}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconKey size={14} />}
              onClick={openPasswordModal}
            >
              {t("auth.changePassword")}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={14} />}
              onClick={logout}
            >
              {t("auth.logout")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Profile Modal */}
      <Modal
        opened={profileModalOpened}
        onClose={closeProfileModal}
        title={t("auth.profile")}
      >
        <Stack gap="md">
          <Group justify="center">
            <Avatar size="xl" radius="xl" color="blue">
              {user?.name?.charAt(0).toUpperCase() || "?"}
            </Avatar>
          </Group>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {t("common.name")}
              </Text>
              <Text size="sm" fw={500}>
                {user?.name || "-"}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {t("auth.email")}
              </Text>
              <Text size="sm" fw={500}>
                {user?.email || "-"}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {t("employee.role")}
              </Text>
              <Text size="sm" fw={500}>
                {user?.role || "-"}
              </Text>
            </Group>
          </Stack>
        </Stack>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        opened={passwordModalOpened}
        onClose={closePasswordModal}
        title={t("auth.changePassword")}
      >
        <form onSubmit={form.onSubmit(handleChangePassword)}>
          <Stack gap="md">
            <PasswordInput
              label={t("auth.currentPassword")}
              placeholder={t("auth.currentPassword")}
              required
              {...form.getInputProps("currentPassword")}
            />
            <PasswordInput
              label={t("auth.newPassword")}
              placeholder={t("auth.newPassword")}
              required
              {...form.getInputProps("newPassword")}
            />
            <PasswordInput
              label={t("auth.confirmPassword")}
              placeholder={t("auth.confirmPassword")}
              required
              {...form.getInputProps("confirmPassword")}
            />
            <Group justify="flex-end">
              <Button variant="outline" onClick={closePasswordModal}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={changePassword.isPending}>
                {t("auth.changePassword")}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Group>
  );
}
