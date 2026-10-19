import React from "react";
import { Sparkles, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

export function PriorityBadge({ priority }: { priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" }) {
  const styles = {
    LOW: "bg-slate-800 text-slate-300 border-slate-700",
    MEDIUM: "bg-blue-950/60 text-blue-300 border-blue-800/50",
    HIGH: "bg-amber-950/60 text-amber-300 border-amber-800/50",
    URGENT: "bg-rose-950/70 text-rose-300 border-rose-800/60 font-semibold animate-pulse",
  }[priority];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${styles}`}
    >
      {priority}
    </span>
  );
}

export function StatusBadge({ status }: { status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" }) {
  const styles = {
    BACKLOG: "bg-slate-800 text-slate-400 border-slate-700",
    TODO: "bg-indigo-950/50 text-indigo-300 border-indigo-800/40",
    IN_PROGRESS: "bg-sky-950/60 text-sky-300 border-sky-800/50",
    IN_REVIEW: "bg-purple-950/60 text-purple-300 border-purple-800/50",
    DONE: "bg-emerald-950/60 text-emerald-300 border-emerald-800/50",
  }[status];

  const labels = {
    BACKLOG: "Backlog",
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    DONE: "Done",
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}
    >
      {labels}
    </span>
  );
}

export function RiskBadge({
  riskLevel,
  daysRemaining,
}: {
  riskLevel: "ON_TRACK" | "MODERATE" | "AT_RISK" | "OVERDUE";
  daysRemaining?: number | null;
}) {
  if (riskLevel === "OVERDUE") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
        <AlertCircle className="w-3 h-3 text-rose-400" />
        Overdue {daysRemaining !== undefined && daysRemaining !== null ? `(${Math.abs(daysRemaining)}d)` : ""}
      </span>
    );
  }

  if (riskLevel === "AT_RISK") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40">
        <Clock className="w-3 h-3 text-amber-400" />
        At Risk {daysRemaining !== undefined && daysRemaining !== null ? `(${daysRemaining}d)` : ""}
      </span>
    );
  }

  if (riskLevel === "MODERATE") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
        <Clock className="w-3 h-3 text-blue-400" />
        {daysRemaining !== undefined && daysRemaining !== null ? `${daysRemaining}d left` : "Approaching"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <CheckCircle2 className="w-3 h-3" />
      On Track
    </span>
  );
}

export function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40">
      <Sparkles className="w-3 h-3 text-violet-400" />
      AI Assisted
    </span>
  );
}
