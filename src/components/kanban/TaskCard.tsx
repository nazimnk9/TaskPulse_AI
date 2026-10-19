import React from "react";
import { MessageSquare, CheckSquare, Calendar, ChevronRight, GripVertical } from "lucide-react";
import { PriorityBadge, RiskBadge, AiBadge } from "@/components/ui/Badge";

export interface TaskItem {
  id: string;
  taskKey: string;
  title: string;
  description?: string | null;
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  storyPoints?: number | null;
  dueDate?: string | null;
  aiGenerated: boolean;
  aiMetadata?: string | null;
  order: number;
  creator: { id: string; name: string; email: string };
  assignee?: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
  subtasks: { id: string; title: string; isCompleted: boolean; order: number }[];
  _count?: { comments: number; subtasks: number };
  riskMetrics?: {
    riskLevel: "ON_TRACK" | "MODERATE" | "AT_RISK" | "OVERDUE";
    completionRate: number;
    daysRemaining: number | null;
    scoreDescription: string;
  };
}

interface TaskCardProps {
  task: TaskItem;
  onClick: () => void;
  onQuickMove?: (targetStatus: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE") => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}

export function TaskCard({
  task,
  onClick,
  onQuickMove,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const completedSubtasks = task.subtasks.filter((s) => s.isCompleted).length;
  const totalSubtasks = task.subtasks.length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const nextStatusMap: Record<string, "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | null> = {
    BACKLOG: "TODO",
    TODO: "IN_PROGRESS",
    IN_PROGRESS: "IN_REVIEW",
    IN_REVIEW: "DONE",
    DONE: null,
  };

  const nextStatus = nextStatusMap[task.status];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(e);
      }}
      onDragEnd={(e) => {
        onDragEnd?.(e);
      }}
      onClick={onClick}
      className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col gap-3 select-none ${
        isDragging
          ? "opacity-35 scale-95 border-blue-500 bg-blue-950/40 shadow-none ring-2 ring-blue-500/50"
          : "border-slate-800 bg-slate-900/80 hover:bg-slate-850 hover:border-slate-700 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5"
      }`}
    >
      {/* Header: Key, Badges, Story Points */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
          <span className="font-mono text-xs font-semibold text-slate-400 group-hover:text-blue-400 transition-colors">
            {task.taskKey}
          </span>
          <PriorityBadge priority={task.priority} />
          {task.aiGenerated && <AiBadge />}
        </div>
        {task.storyPoints !== null && task.storyPoints !== undefined && (
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            {task.storyPoints} pts
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-slate-100 group-hover:text-white line-clamp-2 leading-snug">
        {task.title}
      </h4>

      {/* Subtasks Progress Bar */}
      {totalSubtasks > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-slate-400" />
              Checklist
            </span>
            <span className={completedSubtasks === totalSubtasks ? "text-emerald-400 font-medium" : ""}>
              {completedSubtasks}/{totalSubtasks} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                completedSubtasks === totalSubtasks
                  ? "bg-emerald-500"
                  : progressPercent > 50
                  ? "bg-blue-500"
                  : "bg-indigo-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: Due date / Risk, Assignee, Comments count, Quick Move */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {task.riskMetrics && task.dueDate && (
            <RiskBadge
              riskLevel={task.riskMetrics.riskLevel}
              daysRemaining={task.riskMetrics.daysRemaining}
            />
          )}

          {task._count && task._count.comments > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <MessageSquare className="w-3 h-3" />
              {task._count.comments}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {task.assignee ? (
            <div
              title={`Assigned to ${task.assignee.name}`}
              className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold border border-white/20"
            >
              {task.assignee.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Unassigned</span>
          )}

          {nextStatus && onQuickMove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickMove(nextStatus);
              }}
              title={`Advance to ${nextStatus}`}
              className="p-1 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
