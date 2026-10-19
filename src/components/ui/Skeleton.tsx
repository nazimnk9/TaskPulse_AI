import React from "react";

export function TaskCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 animate-pulse flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 bg-slate-700/60 rounded" />
        <div className="h-4 w-12 bg-slate-700/60 rounded" />
      </div>
      <div className="h-4 w-5/6 bg-slate-700 rounded" />
      <div className="h-3 w-3/4 bg-slate-700/50 rounded" />
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <div className="h-4 w-20 bg-slate-700/50 rounded" />
        <div className="h-6 w-6 rounded-full bg-slate-700" />
      </div>
    </div>
  );
}

export function KanbanColumnSkeleton() {
  return (
    <div className="flex-1 min-w-[300px] bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="h-5 w-24 bg-slate-700/60 rounded" />
        <div className="h-5 w-8 bg-slate-700/40 rounded-full" />
      </div>
      <div className="flex flex-col gap-3 mt-1">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 bg-slate-700 rounded" />
        <div className="h-5 w-12 bg-slate-700/60 rounded" />
      </div>
      <div className="h-4 w-full bg-slate-700/50 rounded" />
      <div className="h-4 w-4/5 bg-slate-700/40 rounded" />
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <div className="h-4 w-24 bg-slate-700/60 rounded" />
        <div className="h-8 w-20 bg-slate-700/80 rounded-lg" />
      </div>
    </div>
  );
}
