import { useRouter } from "next/router";
import { useEffect } from "react";

export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);
  return null;
}
