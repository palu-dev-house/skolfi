"use client";

import { Box, Text } from "@mantine/core";
import { Drawer } from "vaul";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  snapPoints,
}: BottomSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            zIndex: 300,
          }}
        />
        <Drawer.Content
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "white",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            zIndex: 301,
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <Box
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: 8,
              paddingBottom: 8,
            }}
          >
            <Drawer.Handle />
          </Box>

          {title && (
            <Box px="md" pb="sm">
              <Drawer.Title asChild>
                <Text fw={600} size="lg">
                  {title}
                </Text>
              </Drawer.Title>
            </Box>
          )}

          <Box px="md" pb="md" style={{ overflow: "auto", flex: 1 }}>
            {children}
          </Box>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
