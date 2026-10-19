"use client";

import React, { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface CreateTaskModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export function CreateTaskModal({
  projectId,
  isOpen,
  onClose,
  onTaskCreated,
}: CreateTaskModalProps) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"BACKLOG" | "TODO" | "IN_PROGRESS">("TODO");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [storyPoints, setStoryPoints] = useState<number | "">("");
  const [dueDate, setDueDate] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<{ id: string; user: { id: string; name: string; email: string } }[]>([]);
  const [assigneeId, setAssigneeId] = useState("");

  React.useEffect(() => {
    if (isOpen && projectId) {
      fetch(`/api/projects/${projectId}/members`)
        .then((r) => r.json())
        .then((d) => setMembers(d.members || []))
        .catch(() => {});
    }
  }, [isOpen, projectId]);

  const handleAddSubtask = () => {
    if (newSubtaskInput.trim()) {
      setSubtasks([...subtasks, newSubtaskInput.trim()]);
      setNewSubtaskInput("");
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 3) {
      toast.warning("Title too short", "Task title must be at least 3 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          storyPoints: storyPoints !== "" ? Number(storyPoints) : undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          assigneeId: assigneeId || undefined,
          subtasks: subtasks.map((st) => ({ title: st })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Task created successfully!");
        onTaskCreated();
        onClose();
        // Reset form
        setTitle("");
        setDescription("");
        setStoryPoints("");
        setDueDate("");
        setSubtasks([]);
      } else {
        toast.error("Failed to create task", data.error || "Validation error");
      }
    } catch {
      toast.error("Network error creating task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Task"
      subtitle="Add a new ticket to the active sprint"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
        <div>
          <label className="font-semibold text-slate-300">Task Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement refresh token rotation"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-300">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Technical details, acceptance criteria, or context..."
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-300">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-300">Initial Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="TODO">To Do</option>
              <option value="BACKLOG">Backlog</option>
              <option value="IN_PROGRESS">In Progress</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-300">Story Points (Fibonacci)</label>
            <select
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value ? Number(e.target.value) : "")}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Unestimated</option>
              <option value="1">1 Point</option>
              <option value="2">2 Points</option>
              <option value="3">3 Points</option>
              <option value="5">5 Points</option>
              <option value="8">8 Points</option>
              <option value="13">13 Points</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-300">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-300">Assign Member</label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name} ({m.user.email})
              </option>
            ))}
          </select>
        </div>

        {/* Subtasks */}
        <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
          <label className="font-semibold text-slate-300">Subtask Checklist (Prerequisites)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubtaskInput}
              onChange={(e) => setNewSubtaskInput(e.target.value)}
              placeholder="e.g. Write integration test"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium"
            >
              Add
            </button>
          </div>

          {subtasks.length > 0 && (
            <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
              {subtasks.map((st, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
                >
                  <span>{st}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(i)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Create Task
          </button>
        </div>
      </form>
    </Modal>
  );
}
