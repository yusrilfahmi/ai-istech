"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/chat");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );
}
