"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderGit2,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { CreateProjectModal } from "@/components/project/CreateProjectModal";
import { ProjectCardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  status: string;
  owner: { id: string; name: string; email: string };
  members: { user: { id: string; name: string } }[];
  _count: { tasks: number };
  createdAt: string;
}

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      } else {
        toast.error("Failed to load projects");
      }
    } catch {
      toast.error("Network error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar onOpenCreateProject={() => setIsCreateOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Header Hero */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-slate-800 shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-400" />
                Agile Engineering Workspace
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
              Engineering Projects & Sprints
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Track active development workflows, maintain state transitions, and decompose complex tickets using the AI assistant.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all hover:scale-102 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>

        {/* Projects Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-blue-400" />
              Active Projects ({projects.length})
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <ProjectCardSkeleton />
              <ProjectCardSkeleton />
              <ProjectCardSkeleton />
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 text-center flex flex-col items-center justify-center gap-3">
              <FolderGit2 className="w-10 h-10 text-slate-600" />
              <h3 className="text-base font-semibold text-white">No projects found</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Get started by creating your first agile project or run the seed script to load sample data.
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Create First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((proj) => (
                <Link
                  key={proj.id}
                  href={`/dashboard/projects/${proj.id}`}
                  className="group p-6 rounded-2xl bg-slate-900/70 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 shadow-xl shadow-black/20 flex flex-col justify-between gap-5 transition-all duration-200"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        {proj.key}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {proj.members.length} member{proj.members.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                      {proj.name}
                    </h3>

                    {proj.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium text-slate-300">
                      {proj._count.tasks} total task{proj._count.tasks === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1 text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                      Open Board
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onProjectCreated={(newId) => {
          fetchProjects();
          router.push(`/dashboard/projects/${newId}`);
        }}
      />
    </div>
  );
}
