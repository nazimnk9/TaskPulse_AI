"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Settings,
  FolderGit2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KanbanColumnSkeleton } from "@/components/ui/Skeleton";
import { TaskItem } from "@/components/kanban/TaskCard";
import { useToast } from "@/components/ui/Toast";

interface ProjectDetail {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  owner: { id: string; name: string };
  members: { user: { id: string; name: string } }[];
}

export const dynamic = "force-dynamic";

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const router = useRouter();
  const toast = useToast();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      // 1. Fetch project info
      const projRes = await fetch(`/api/projects/${projectId}`);
      if (projRes.status === 401) {
        router.push("/login");
        return;
      }
      if (!projRes.ok) {
        toast.error("Project not found");
        router.push("/dashboard");
        return;
      }
      const projData = await projRes.json();
      setProject(projData.project);

      // 2. Fetch project tasks
      const tasksRes = await fetch(`/api/tasks?projectId=${projectId}`);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks);
      }
    } catch {
      toast.error("Network error loading workspace");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Workspace Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {project?.key || "..."}
                </span>
                <span className="text-xs text-slate-400">/ Sprint Workspace</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                {project ? project.name : "Loading project..."}
              </h1>
            </div>
          </div>

          {/* Right Header Badges & Refresh */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            {project && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>{project.members.length} Members</span>
              </div>
            )}

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              title="Refresh tasks"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Board Content */}
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
            <KanbanColumnSkeleton />
            <KanbanColumnSkeleton />
            <KanbanColumnSkeleton />
            <KanbanColumnSkeleton />
            <KanbanColumnSkeleton />
          </div>
        ) : (
          <KanbanBoard
            projectId={projectId}
            projectName={project?.name || "Project"}
            tasks={tasks}
            loading={loading}
            onRefresh={() => loadData(false)}
          />
        )}
      </main>
    </div>
  );
}
