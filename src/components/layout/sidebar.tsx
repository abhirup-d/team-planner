"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  Shield,
  Building2,
  ListTodo,
  Sparkles,
  Settings,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useData } from "@/hooks/use-data";

const navItems = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/weekly", label: "Weekly Utilisation", icon: Calendar },
  { href: "/manager", label: "Manager Dashboard", icon: Shield },
  { href: "/clients", label: "Client Dashboard", icon: Building2 },
  { href: "/tasks", label: "Task View", icon: ListTodo },
  // { href: "/insights", label: "AI Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lastUpdated, source } = useData();

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-card border"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border/50 flex flex-col transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight">Team Analytics</h1>
              <p className="text-[11px] text-muted-foreground">Resource Planner</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mx-3 mb-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <p className="font-medium text-foreground/70">Oren Consulting</p>
          <p className="mt-0.5">5 team members</p>
          {lastUpdated && (
            <p className="mt-1.5 text-[10px] text-muted-foreground/70">
              Last updated: {new Date(lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}{" "}
              {new Date(lastUpdated).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {source && (
            <p className={cn("mt-1 text-[10px] flex items-center gap-1", source === "slack" ? "text-green-500" : "text-orange-400")}>
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full", source === "slack" ? "bg-green-500" : "bg-orange-400")} />
              {source === "slack" ? "Live from Slack" : "CSV fallback"}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
