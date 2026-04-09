"use client";

import { Box, Stack, Text } from "@mantine/core";
import Lottie from "lottie-react";
import { useEffect, useState } from "react";

type AnimationType = "loading" | "success" | "waiting" | "empty";

interface LottieAnimationProps {
  type: AnimationType;
  size?: number;
  message?: string;
  loop?: boolean;
}

export function LottieAnimation({
  type,
  size = 360,
  message,
  loop = true,
}: LottieAnimationProps) {
  const [data, setData] = useState(null);
  const pathname = `/lotties/${type}.json`;
  useEffect(() => {
    fetch(pathname)
      .then((res) => res.json())
      .then(setData);
  }, [pathname]);

  if (!data) return null;

  return (
    <Stack align="center" gap="md" py="xl">
      <Box style={{ width: size, height: size }}>
        <Lottie
          animationData={data}
          loop={type === "success" ? false : loop}
          style={{ width: "100%", height: "100%" }}
        />
      </Box>
      {message && (
        <Text size="sm" c="dimmed" ta="center">
          {message}
        </Text>
      )}
    </Stack>
  );
}

export function LoadingAnimation() {
  return <LottieAnimation type="loading" />;
}

export function SuccessAnimation({
  message = "Berhasil!",
}: {
  message?: string;
}) {
  return <LottieAnimation type="success" message={message} loop={false} />;
}

export function WaitingAnimation({
  message = "Menunggu...",
}: {
  message?: string;
}) {
  return <LottieAnimation type="waiting" message={message} />;
}

export function EmptyAnimation({
  message = "Tidak ada data",
}: {
  message?: string;
}) {
  return <LottieAnimation type="empty" message={message} loop={false} />;
}
