"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Lock, Mail, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    const loginEmail = customEmail || email;
    const loginPassword = customPassword || password;

    if (!loginEmail || !loginPassword) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Welcome back!", `Logged in as ${data.user.name}`);
        router.push("/dashboard");
        router.refresh();
      } else {
        setErrorMessage(data.error || "Invalid credentials");
        toast.error("Login failed", data.error);
      }
    } catch {
      setErrorMessage("Network connection error");
      toast.error("Network error connecting to auth server");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    handleLogin(undefined, demoEmail, "password123");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-xl shadow-blue-500/25 mb-3">
            <Layers className="w-6 h-6 text-white" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Sign In to TaskPulse
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Agile Sprint Platform with AI Task Decomposition
          </p>
        </div>

        {/* Demo Fast Login Box */}
        <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 text-blue-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Quick Demo Access (One-Click Sign In):
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => fillDemo("admin@devsprint.io")}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 text-left text-xs text-slate-200 hover:text-white flex items-center justify-between transition-colors group cursor-pointer"
            >
              <div>
                <span className="font-semibold text-blue-400">Lead Architect</span>
                <span className="text-slate-400 text-[11px] block">admin@devsprint.io</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => fillDemo("sarah@devsprint.io")}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 text-left text-xs text-slate-200 hover:text-white flex items-center justify-between transition-colors group cursor-pointer"
            >
              <div>
                <span className="font-semibold text-indigo-400">Full-Stack Engineer</span>
                <span className="text-slate-400 text-[11px] block">sarah@devsprint.io</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* Login Card */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-sm">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300">Email Address</label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-300">Password</label>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In to Workspace"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            Don't have an account?{" "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
