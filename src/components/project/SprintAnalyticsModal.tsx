"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Loader2,
  Lightbulb,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface AnalyticsData {
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  inReviewTasks: number;
  todoTasks: number;
  backlogTasks: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  completionRate: number;
  overdueCount: number;
  atRiskCount: number;
  sprintHealth: "HEALTHY" | "NEEDS_ATTENTION" | "CRITICAL";
  recommendations: string[];
}

interface SprintAnalyticsModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SprintAnalyticsModal({
  projectId,
  projectName,
  isOpen,
  onClose,
}: SprintAnalyticsModalProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !projectId) return;

    async function fetchAnalytics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/sprint-summary`);
        if (res.ok) {
          const json = await res.json();
          setData(json.analytics);
        }
      } catch (err) {
        console.error("Failed to load sprint analytics", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [projectId, isOpen]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sprint Intelligence & Velocity Analytics"
      subtitle={`Live project execution metrics for ${projectName}`}
      maxWidth="xl"
    >
      {loading || !data ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">Calculating sprint velocity & risk...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Health Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              data.sprintHealth === "HEALTHY"
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                : data.sprintHealth === "NEEDS_ATTENTION"
                ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                : "bg-rose-950/30 border-rose-500/40 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {data.sprintHealth === "HEALTHY" && (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              )}
              {data.sprintHealth === "NEEDS_ATTENTION" && (
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              )}
              {data.sprintHealth === "CRITICAL" && (
                <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
              )}
              <div>
                <h4 className="text-sm font-bold capitalize">Sprint Status: {data.sprintHealth.replace("_", " ")}</h4>
                <p className="text-xs opacity-90 mt-0.5">
                  {data.completionRate}% of planned tasks delivered
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono">
                {data.completedStoryPoints}/{data.totalStoryPoints}
              </span>
              <p className="text-[11px] opacity-75">Story Points</p>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400">Total Tasks</span>
              <p className="text-xl font-bold text-white mt-1">{data.totalTasks}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-emerald-400">Completed</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">{data.doneTasks}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-sky-400">In Progress</span>
              <p className="text-xl font-bold text-sky-400 mt-1">{data.inProgressTasks}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-rose-400">Overdue / At Risk</span>
              <p className="text-xl font-bold text-rose-400 mt-1">
                {data.overdueCount + data.atRiskCount}
              </p>
            </div>
          </div>

          {/* Recommendations from AI / Business engine */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5">
            <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Automated Sprint Recommendations:
            </h5>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="leading-relaxed">
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
