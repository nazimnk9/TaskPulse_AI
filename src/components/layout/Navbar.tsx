"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Layers,
  Sparkles,
  LogOut,
  User as UserIcon,
  BookOpen,
  Plus,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function Navbar({ onOpenCreateProject }: { onOpenCreateProject?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        // Not logged in
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Logged out successfully");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Logout failed");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white group-hover:text-blue-400 transition-colors">
                  TaskPulse
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Agile Sprint & Issue Tracker</p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                pathname === "/dashboard"
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Projects
            </Link>
            <Link
              href="/ai-docs"
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                pathname === "/ai-docs"
                  ? "bg-slate-800 text-violet-300"
                  : "text-slate-300 hover:text-violet-300 hover:bg-slate-800/60"
              }`}
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              AI Specs & Health
            </Link>
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {onOpenCreateProject && (
            <button
              onClick={onOpenCreateProject}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all hover:shadow-blue-600/50"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          )}

          {!loading && user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold border border-white/20">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
                  <div className="text-[11px] text-slate-400 leading-tight capitalize">{user.role.toLowerCase()}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
