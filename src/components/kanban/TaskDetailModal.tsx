"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckSquare,
  Square,
  MessageSquare,
  Activity,
  Sparkles,
  Calendar,
  AlertTriangle,
  Plus,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  User,
  Edit3,
  Save,
  XCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PriorityBadge, StatusBadge, RiskBadge, AiBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
}

interface ActivityLog {
  id: string;
  action: string;
  details?: string | null;
  createdAt: string;
  actor: { id: string; name: string };
}

interface TaskDetail {
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
  creator: { id: string; name: string; email: string };
  assignee?: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
  project?: {
    id: string;
    name: string;
    key: string;
    ownerId: string;
    members?: {
      user: { id: string; name: string; email: string; avatarUrl?: string | null };
    }[];
  };
  subtasks: Subtask[];
  comments: Comment[];
  activityLogs: ActivityLog[];
  riskMetrics?: {
    riskLevel: "ON_TRACK" | "MODERATE" | "AT_RISK" | "OVERDUE";
    daysRemaining: number | null;
    scoreDescription: string;
  };
}

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export function TaskDetailModal({
  taskId,
  isOpen,
  onClose,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const toast = useToast();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [assigneeUpdating, setAssigneeUpdating] = useState(false);
  const [projectMembers, setProjectMembers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [workflowError, setWorkflowError] = useState<{ reason: string; blocking?: string[] } | null>(null);

  // Subtask adding
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [subtaskSubmitting, setSubtaskSubmitting] = useState(false);

  // Comment adding
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"details" | "activity" | "ai">("details");

  // Task inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [editStoryPoints, setEditStoryPoints] = useState<string>("");
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const startEditing = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority);
    setEditStoryPoints(task.storyPoints !== null && task.storyPoints !== undefined ? String(task.storyPoints) : "");
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    if (!editTitle.trim() || editTitle.trim().length < 3) {
      toast.warning("Validation Error", "Task title must be at least 3 characters");
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          priority: editPriority,
          storyPoints: editStoryPoints !== "" ? Number(editStoryPoints) : null,
          dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Task updated successfully!");
        setTask((prev) =>
          prev
            ? {
                ...prev,
                title: data.task.title,
                description: data.task.description,
                priority: data.task.priority,
                storyPoints: data.task.storyPoints,
                dueDate: data.task.dueDate,
                riskMetrics: data.task.riskMetrics || prev.riskMetrics,
              }
            : null
        );
        setIsEditing(false);
        onTaskUpdated();
      } else {
        toast.error("Failed to update task", data.error || "Validation error");
      }
    } catch {
      toast.error("Network error updating task");
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    if (!taskId || !isOpen) {
      setTask(null);
      setWorkflowError(null);
      setIsEditing(false);
      return;
    }

    async function loadTask() {
      setLoading(true);
      setWorkflowError(null);
      setIsEditing(false);
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (res.ok) {
          const data = await res.json();
          setTask(data.task);
          if (data.task?.project?.id) {
            fetch(`/api/projects/${data.task.project.id}/members`)
              .then((r) => r.json())
              .then((d) => {
                const list: { id: string; name: string; email: string }[] = [];
                const seen = new Set<string>();
                (d.members || []).forEach((m: any) => {
                  const u = m.user || m;
                  if (u?.id && !seen.has(u.id)) {
                    seen.add(u.id);
                    list.push({ id: u.id, name: u.name, email: u.email });
                  }
                });
                (d.availableUsers || []).forEach((u: any) => {
                  if (u?.id && !seen.has(u.id)) {
                    seen.add(u.id);
                    list.push({ id: u.id, name: u.name, email: u.email });
                  }
                });
                setProjectMembers(list);
              })
              .catch(() => {});
          }
        } else {
          toast.error("Failed to load task details");
        }
      } catch {
        toast.error("Network error loading task");
      } finally {
        setLoading(false);
      }
    }

    loadTask();
  }, [taskId, isOpen, toast]);

  if (!isOpen) return null;

  // Handle status transition
  const handleStatusChange = async (targetStatus: string) => {
    if (!task || targetStatus === task.status) return;

    setStatusUpdating(true);
    setWorkflowError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422) {
          // Business rule violation
          setWorkflowError({
            reason: data.reason || "Business workflow rule violated",
            blocking: data.blockingSubtasks?.map((s: Subtask) => s.title),
          });
          toast.warning("Status Transition Blocked", data.reason);
        } else {
          toast.error("Failed to update status", data.error || "Server error");
        }
        return;
      }

      toast.success(`Task moved to ${targetStatus}`);
      setTask((prev) => (prev ? { ...prev, status: data.task.status } : null));
      onTaskUpdated();
    } catch {
      toast.error("Network error updating status");
    } finally {
      setStatusUpdating(false);
    }
  };

  // Handle assignee change
  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!task) return;
    const targetId = newAssigneeId === "" ? null : newAssigneeId;

    setAssigneeUpdating(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: targetId }),
      });

      const data = await res.json();
      if (res.ok) {
        setTask((prev) => (prev ? { ...prev, assignee: data.task.assignee } : null));
        toast.success(
          data.task.assignee
            ? `Task assigned to ${data.task.assignee.name}`
            : "Task unassigned"
        );
        onTaskUpdated();
      } else {
        toast.error("Failed to update assignee", data.error);
      }
    } catch {
      toast.error("Network error updating assignee");
    } finally {
      setAssigneeUpdating(false);
    }
  };

  // Toggle subtask
  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    if (!task) return;

    // Optimistic update
    setTask((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        subtasks: prev.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, isCompleted: !currentCompleted } : s
        ),
      };
    });

    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtaskId,
          isCompleted: !currentCompleted,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to update subtask");
        // Revert
        onTaskUpdated();
      } else {
        setWorkflowError(null);
        onTaskUpdated();
      }
    } catch {
      toast.error("Network error toggling subtask");
    }
  };

  // Add new subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newSubtaskTitle.trim()) return;

    setSubtaskSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setTask((prev) =>
          prev ? { ...prev, subtasks: [...prev.subtasks, data.subtask] } : null
        );
        setNewSubtaskTitle("");
        toast.success("Subtask added");
        onTaskUpdated();
      } else {
        toast.error("Failed to add subtask");
      }
    } catch {
      toast.error("Network error adding subtask");
    } finally {
      setSubtaskSubmitting(false);
    }
  };

  // Add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;

    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setTask((prev) =>
          prev ? { ...prev, comments: [data.comment, ...prev.comments] } : null
        );
        setNewComment("");
        toast.success("Comment posted");
      } else {
        toast.error("Failed to post comment");
      }
    } catch {
      toast.error("Network error posting comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Delete task
  const handleDeleteTask = async () => {
    if (!task) return;
    if (!confirm(`Are you sure you want to delete ${task.taskKey}?`)) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Task deleted");
        onTaskUpdated();
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete task");
      }
    } catch {
      toast.error("Network error deleting task");
    }
  };

  // Parse AI metadata if available
  let parsedAiMeta: {
    acceptanceCriteria?: string[];
    riskAnalysis?: { complexityScore?: number; technicalConsiderations?: string };
  } | null = null;
  if (task?.aiMetadata) {
    try {
      parsedAiMeta = JSON.parse(task.aiMetadata);
    } catch {
      // not json
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? task.taskKey : "Task Details"}
      subtitle={task?.creator ? `Created by ${task.creator.name}` : undefined}
      maxWidth="2xl"
    >
      {loading || !task ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">Loading task details...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Business Invariant Violation Alert */}
          {workflowError && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-sm flex items-start gap-3 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-semibold text-amber-300">Agile Workflow Rule Blocked Transition:</h5>
                <p className="mt-1 text-xs text-amber-200 leading-relaxed">{workflowError.reason}</p>
                {workflowError.blocking && workflowError.blocking.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-xs text-amber-300/90 font-mono">
                    {workflowError.blocking.map((title, i) => (
                      <li key={i}>{title}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Workflow Status Progression Controller */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-400 uppercase tracking-wider">
                Workflow State Machine
              </span>
              {statusUpdating && (
                <span className="flex items-center gap-1.5 text-blue-400 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Validating transition...
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const).map((st) => {
                const isActive = task.status === st;
                return (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    disabled={statusUpdating}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-center border ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20 font-semibold"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meta Row: Priority, Due Date, Points, Assignee */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-300 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Priority:</span>
              <PriorityBadge priority={task.priority} />
            </div>

            {task.storyPoints && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Estimate:</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                  {task.storyPoints} Story Points
                </span>
              </div>
            )}

            {task.dueDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500">Due:</span>
                <span className="font-medium text-slate-300">
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
                {task.riskMetrics && (
                  <RiskBadge
                    riskLevel={task.riskMetrics.riskLevel}
                    daysRemaining={task.riskMetrics.daysRemaining}
                  />
                )}
              </div>
            )}

            {task.aiGenerated && <AiBadge />}

            {/* Interactive Assignee Selector */}
            <div className="flex items-center gap-1.5 ml-auto">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500">Assignee:</span>
              <div className="relative flex items-center">
                <select
                  value={task.assignee?.id || ""}
                  disabled={assigneeUpdating}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-200 hover:border-blue-500 focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <option value="">Unassigned</option>
                  {(projectMembers.length > 0
                    ? projectMembers
                    : (task.project?.members?.map((m) => m.user) || [])
                  ).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                {assigneeUpdating && (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400 ml-1.5" />
                )}
              </div>
            </div>
          </div>

          {/* Title & Description or Edit Mode */}
          {isEditing ? (
            <form
              onSubmit={handleSaveEdit}
              className="p-4 rounded-2xl bg-slate-900/90 border border-blue-500/40 shadow-xl flex flex-col gap-4 animate-fade-in"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4" />
                  Edit Task Details
                </span>
                <span className="text-[11px] text-slate-500 font-mono">{task.taskKey}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Short description of task..."
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Story Points (1-21)</label>
                  <input
                    type="number"
                    min={1}
                    max={21}
                    value={editStoryPoints}
                    onChange={(e) => setEditStoryPoints(e.target.value)}
                    placeholder="e.g. 3, 5, 8"
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Detailed scope, prerequisites, or implementation plan..."
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSavingEdit}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-bold text-white tracking-tight flex-1">{task.title}</h2>
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all cursor-pointer shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Task
                </button>
              </div>
              {task.description ? (
                <p className="mt-2 text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
                  {task.description}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500 italic">No description provided.</p>
              )}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab("details")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "details"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Checklist & Comments ({task.subtasks.length}/{task.comments.length})
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "activity"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Activity Audit Log ({task.activityLogs.length})
            </button>
            {task.aiGenerated && (
              <button
                onClick={() => setActiveTab("ai")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === "ai"
                    ? "bg-violet-950/50 text-violet-300 border border-violet-800/40"
                    : "text-slate-400 hover:text-violet-300"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                AI Decomposition & Criteria
              </button>
            )}
          </div>

          {/* Tab 1: Checklist & Comments */}
          {activeTab === "details" && (
            <div className="flex flex-col gap-6">
              {/* Subtasks Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-blue-400" />
                    Subtasks & Prerequisites (
                    {task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Required for DONE status
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {task.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      onClick={() => handleToggleSubtask(subtask.id, subtask.isCompleted)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        subtask.isCompleted
                          ? "bg-emerald-950/20 border-emerald-900/40 text-slate-400 line-through"
                          : "bg-slate-900/70 border-slate-800 text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      {subtask.isCompleted ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className="text-xs flex-1">{subtask.title}</span>
                    </div>
                  ))}

                  {task.subtasks.length === 0 && (
                    <p className="text-xs text-slate-500 italic py-2">
                      No subtasks added yet. Add one below or use the AI Assistant.
                    </p>
                  )}
                </div>

                {/* Add Subtask form */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a new subtask or acceptance check..."
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={subtaskSubmitting || !newSubtaskTitle.trim()}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </form>
              </div>

              {/* Comments Section */}
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  Discussion ({task.comments.length})
                </h4>

                {/* Comments List */}
                <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto">
                  {task.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-indigo-300">
                          {comment.author.name}
                        </span>
                        <span className="text-slate-500">
                          {new Date(comment.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))}

                  {task.comments.length === 0 && (
                    <p className="text-xs text-slate-500 italic py-2">
                      No comments yet. Start the conversation.
                    </p>
                  )}
                </div>

                {/* Add Comment form */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={commentSubmitting || !newComment.trim()}
                    className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab 2: Activity Audit Log */}
          {activeTab === "activity" && (
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {task.activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs"
                >
                  <Activity className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">{log.actor.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-0.5">{log.details || log.action}</p>
                  </div>
                </div>
              ))}
              {task.activityLogs.length === 0 && (
                <p className="text-xs text-slate-500 italic py-4">No activity history recorded.</p>
              )}
            </div>
          )}

          {/* Tab 3: AI Decomposition & Criteria */}
          {activeTab === "ai" && parsedAiMeta && (
            <div className="flex flex-col gap-4 text-xs">
              {parsedAiMeta.acceptanceCriteria && parsedAiMeta.acceptanceCriteria.length > 0 && (
                <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-800/40 flex flex-col gap-2">
                  <h5 className="font-semibold text-violet-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    AI-Generated Acceptance Criteria (Given-When-Then):
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {parsedAiMeta.acceptanceCriteria.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {parsedAiMeta.riskAnalysis && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                  <h5 className="font-semibold text-slate-300">Technical Risk & Architecture Notes:</h5>
                  <p className="text-slate-400 leading-relaxed">
                    {parsedAiMeta.riskAnalysis.technicalConsiderations ||
                      "Standard validation, database index considerations, and component boundary isolation apply."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Delete Task Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={handleDeleteTask}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Task
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
