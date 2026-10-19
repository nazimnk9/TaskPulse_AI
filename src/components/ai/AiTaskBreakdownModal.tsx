"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Plus,
  AlertTriangle,
  Lightbulb,
  CheckSquare,
  ArrowRight,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PriorityBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface AiBreakdownResult {
  title: string;
  summary: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  storyPoints: number;
  acceptanceCriteria: string[];
  subtasks: { title: string; estimatedHours: number }[];
  riskAnalysis: {
    complexityScore: number;
    potentialBlockers: string[];
    technicalConsiderations: string;
  };
  metadata: {
    engine: string;
    processingTimeMs: number;
  };
}

interface AiTaskBreakdownModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

const SAMPLE_PROMPTS = [
  "Implement OAuth2 Google & GitHub Single Sign-On with session revocation",
  "Design rate-limiting middleware for API routes to prevent brute-force attacks",
  "Fix memory leak and connection exhaustion in background worker queue",
  "Add Stripe webhook handling for recurring subscription upgrades and invoice failures",
];

export function AiTaskBreakdownModal({
  projectId,
  isOpen,
  onClose,
  onTaskCreated,
}: AiTaskBreakdownModalProps) {
  const toast = useToast();
  const [prompt, setPrompt] = useState("");
  const [projectContext, setProjectContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AiBreakdownResult | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.trim().length < 5) {
      toast.warning("Prompt too short", "Please enter at least 5 characters describing the feature or bug.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          projectContext: projectContext.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data.data);
        toast.success("AI Breakdown generated", `Engine: ${data.data.metadata.engine}`);
      } else {
        toast.error("Generation failed", data.error || "Could not analyze prompt");
      }
    } catch {
      toast.error("Network error during AI analysis");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTaskFromAi = async () => {
    if (!result) return;

    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: result.title,
          description: `${result.summary}\n\nTechnical Architecture Notes:\n${result.riskAnalysis.technicalConsiderations}`,
          priority: result.priority,
          storyPoints: result.storyPoints,
          status: "TODO",
          aiGenerated: true,
          aiMetadata: JSON.stringify({
            acceptanceCriteria: result.acceptanceCriteria,
            riskAnalysis: result.riskAnalysis,
            engine: result.metadata.engine,
          }),
          subtasks: result.subtasks.map((st) => ({
            title: `${st.title} (~${st.estimatedHours}h)`,
          })),
        }),
      });

      if (res.ok) {
        toast.success("Task created from AI breakdown!");
        onTaskCreated();
        onClose();
        setResult(null);
        setPrompt("");
      } else {
        const err = await res.json();
        toast.error("Failed to create task", err.error);
      }
    } catch {
      toast.error("Network error creating task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Task Architect & Risk Analyzer"
      subtitle="Transform high-level feature ideas or bug reports into structured, estimable Agile tickets"
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-5">
        {/* Input Section */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300">
            What do you want to build or fix?
          </label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Implement multi-factor authentication with authenticator apps and emergency recovery codes..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />

          {/* Quick sample chips */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-400" />
              Presets:
            </span>
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(sample)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-left"
              >
                {sample.slice(0, 32)}...
              </button>
            ))}
          </div>
        </div>

        {/* Generate Action Button */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-400">
            Uses Google Gemini 1.5 Flash (or built-in heuristic fallback)
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/25 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Architecture...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-violet-200" />
                Analyze & Decompose
              </>
            )}
          </button>
        </div>

        {/* Results Card */}
        {result && (
          <div className="p-4 rounded-xl bg-slate-950 border border-violet-500/30 flex flex-col gap-4 animate-fade-in shadow-xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">
                  Proposed Ticket
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">{result.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{result.summary}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <PriorityBadge priority={result.priority} />
                <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {result.storyPoints} Story Points
                </span>
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <h5 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                Decomposed Checklist Items ({result.subtasks.length}):
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.subtasks.map((st, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-xs flex items-center justify-between gap-2"
                  >
                    <span className="text-slate-200">{st.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      ~{st.estimatedHours}h
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div>
              <h5 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Acceptance Criteria (Given-When-Then):
              </h5>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                {result.acceptanceCriteria.map((ac, i) => (
                  <li key={i} className="leading-relaxed">
                    {ac}
                  </li>
                ))}
              </ul>
            </div>

            {/* Risk & Complexity */}
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Complexity Score: </span>
                <span className="font-bold text-amber-400">
                  {result.riskAnalysis.complexityScore} / 10
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Engine: <span className="font-mono text-violet-400">{result.metadata.engine}</span> ({result.metadata.processingTimeMs}ms)
              </div>
            </div>

            {/* Confirm & Create Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleCreateTaskFromAi}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Project Task...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Create Ticket
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
