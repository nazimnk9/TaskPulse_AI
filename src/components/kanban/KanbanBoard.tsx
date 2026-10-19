"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  Sparkles,
  TrendingUp,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { TaskCard, TaskItem } from "./TaskCard";
import { TaskDetailModal } from "./TaskDetailModal";
import { AiTaskBreakdownModal } from "@/components/ai/AiTaskBreakdownModal";
import { CreateTaskModal } from "@/components/project/CreateTaskModal";
import { SprintAnalyticsModal } from "@/components/project/SprintAnalyticsModal";
import { useToast } from "@/components/ui/Toast";

interface KanbanBoardProps {
  projectId: string;
  projectName: string;
  tasks: TaskItem[];
  loading: boolean;
  onRefresh: () => void;
}

const COLUMNS: {
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  label: string;
  color: string;
  dotColor: string;
}[] = [
  { status: "BACKLOG", label: "Backlog", color: "border-slate-800", dotColor: "bg-slate-400" },
  { status: "TODO", label: "To Do", color: "border-indigo-900/60", dotColor: "bg-indigo-400" },
  { status: "IN_PROGRESS", label: "In Progress", color: "border-sky-900/60", dotColor: "bg-sky-400" },
  { status: "IN_REVIEW", label: "In Review", color: "border-purple-900/60", dotColor: "bg-purple-400" },
  { status: "DONE", label: "Done", color: "border-emerald-900/60", dotColor: "bg-emerald-400" },
];

export function KanbanBoard({
  projectId,
  projectName,
  tasks,
  loading,
  onRefresh,
}: KanbanBoardProps) {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Modals state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.taskKey.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority =
        priorityFilter === "ALL" || task.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, priorityFilter]);

  // Handle quick move from card
  const handleQuickMove = async (
    taskId: string,
    targetStatus: "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE"
  ) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422) {
          toast.warning("Status Transition Blocked", data.reason);
          // Open detail modal to show the blocker
          setSelectedTaskId(taskId);
        } else {
          toast.error("Failed to advance task", data.error);
        }
        return;
      }

      toast.success(`Moved to ${targetStatus}`);
      onRefresh();
    } catch {
      toast.error("Network error moving task");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-lg backdrop-blur-sm">
        {/* Search & Filter */}
        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or key (e.g. PULSE-1)..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAnalyticsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            Sprint Velocity
          </button>

          <button
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition-all hover:scale-102"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Task Assistant
          </button>

          <button
            onClick={() => setIsCreateTaskOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </button>
        </div>
      </div>

      {/* Kanban Columns Horizontal Board */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 min-h-[580px] items-start">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.status);
          const colStoryPoints = colTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

          return (
            <div
              key={col.status}
              className={`w-72 sm:w-80 shrink-0 rounded-2xl bg-slate-900/50 border ${col.color} p-3.5 flex flex-col gap-3 min-h-[540px]`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    {col.label}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.2 rounded-full border border-slate-700">
                    {colTasks.length}
                  </span>
                </div>

                {colStoryPoints > 0 && (
                  <span className="text-[10px] font-mono font-medium text-slate-400">
                    {colStoryPoints} pts
                  </span>
                )}
              </div>

              {/* Tasks List */}
              <div className="flex flex-col gap-2.5 flex-1">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTaskId(task.id)}
                    onQuickMove={(next) => handleQuickMove(task.id, next)}
                  />
                ))}

                {colTasks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-800/80 rounded-xl text-slate-500 text-xs">
                    <Inbox className="w-6 h-6 mb-1 text-slate-600" />
                    <span>No tasks in {col.label.toLowerCase()}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={onRefresh}
      />

      <AiTaskBreakdownModal
        projectId={projectId}
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onTaskCreated={onRefresh}
      />

      <CreateTaskModal
        projectId={projectId}
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onTaskCreated={onRefresh}
      />

      <SprintAnalyticsModal
        projectId={projectId}
        projectName={projectName}
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />
    </div>
  );
}
