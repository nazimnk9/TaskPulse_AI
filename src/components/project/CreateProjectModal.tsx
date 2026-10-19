"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (newProjectId: string) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}: CreateProjectModalProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) {
      toast.warning("Missing required fields", "Project name and key are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          key: key.trim().toUpperCase(),
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Project created successfully!");
        onProjectCreated(data.project.id);
        onClose();
        setName("");
        setKey("");
        setDescription("");
      } else {
        toast.error("Failed to create project", data.error);
      }
    } catch {
      toast.error("Network error creating project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
      subtitle="Organize tasks into an agile project with custom prefix"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
        <div>
          <label className="font-semibold text-slate-300">Project Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!key) {
                // Auto-suggest key
                const words = e.target.value.trim().split(/\s+/);
                if (words.length >= 2) {
                  setKey((words[0][0] + words[1][0] + (words[2]?.[0] || "")).toUpperCase());
                } else if (words[0].length >= 3) {
                  setKey(words[0].slice(0, 4).toUpperCase());
                }
              }
            }}
            placeholder="e.g. Mobile Cloud Platform"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-300">Project Key Prefix *</label>
          <input
            type="text"
            required
            maxLength={6}
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="e.g. MCP (2-6 uppercase letters)"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500"
          />
          <span className="text-[10px] text-slate-500 mt-1 block">
            Used as prefix for tasks (e.g. {key || "KEY"}-1, {key || "KEY"}-2)
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
            Create Project
          </button>
        </div>
      </form>
    </Modal>
  );
}
