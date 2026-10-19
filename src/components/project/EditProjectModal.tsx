"use client";

import React, { useState, useEffect } from "react";
import { Settings, Loader2, Check, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface EditProjectModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated: () => void;
  onProjectDeleted?: () => void;
}

export function EditProjectModal({
  projectId,
  isOpen,
  onClose,
  onProjectUpdated,
  onProjectDeleted,
}: EditProjectModalProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen || !projectId) return;

    async function loadProject() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setName(data.project.name || "");
          setKey(data.project.key || "");
          setDescription(data.project.description || "");
          setStatus(data.project.status || "ACTIVE");
        }
      } catch {
        toast.error("Failed to load project details");
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [isOpen, projectId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning("Project name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          status,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Project updated successfully!");
        onProjectUpdated();
        onClose();
      } else {
        toast.error("Failed to update project", data.error);
      }
    } catch {
      toast.error("Network error updating project");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? All associated tasks, subtasks, and comments will be permanently deleted.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Project deleted successfully");
        onClose();
        if (onProjectDeleted) {
          onProjectDeleted();
        }
      } else {
        toast.error(data.error || "Failed to delete project");
      }
    } catch {
      toast.error("Network error deleting project");
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Settings"
      subtitle={`Edit project metadata for ${key || "Project"}`}
      maxWidth="md"
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-xs">Loading project settings...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-300">Project Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-300">Project Key Prefix</label>
            <input
              type="text"
              disabled
              value={key}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 font-mono cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Project keys are immutable to maintain task URL integrity.
            </span>
          </div>

          <div>
            <label className="font-semibold text-slate-300">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project scope and mission..."
              className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Project
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
