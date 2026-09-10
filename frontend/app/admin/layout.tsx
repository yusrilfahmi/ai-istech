"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (
      !loading &&
      (!user || (user.role !== "admin" && user.role !== "master"))
    ) {
      router.replace("/chat");
    }
  }, [user, loading, router]);

  if (loading || !user || (user.role !== "admin" && user.role !== "master")) {
    return (
      <div
        className="flex flex-1 items-center justify-center h-screen"
        style={{ background: "var(--background)" }}
      >
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const navItems = [
    { href: "/admin", label: "Overview", icon: "👤" },
    { href: "/admin/sop", label: "SOP Management", icon: "📄" },
    { href: "/admin/datasets", label: "ML Datasets", icon: "📁" },
    ...(user.role === "admin"
      ? [{ href: "/admin/users", label: "User Management", icon: "👥" }]
      : []),
    { href: "/admin/audit", label: "Audit Logs", icon: "📋" },
    { href: "/admin/compressor", label: "Compressor Telemetry", icon: "🔧" },
    { href: "/admin/dashboard-data", label: "Dashboard Data", icon: "📊" },
  ];

  return (
    <div
      className="flex flex-1 min-h-screen"
      style={{ background: "var(--background)" }}
    >
      {/* Admin Sidebar */}
      <aside
        className="w-64 border-r flex flex-col p-4 shrink-0"
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="flex items-center gap-3 px-2 py-3 mb-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            A
          </div>
          <div>
            <h2
              className="font-semibold text-sm"
              style={{ color: "var(--foreground)" }}
            >
              ISE Admin
            </h2>
            <p className="text-xs uppercase tracking-wider font-mono text-indigo-400">
              {user.role} mode
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive ? "font-medium" : "hover:bg-white/[0.04]"
                }`}
                style={{
                  background: isActive ? "var(--sidebar-hover)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--foreground)",
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <Link
            href="/chat"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-white/[0.04] transition-colors"
            style={{ color: "var(--muted)" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Chat
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
