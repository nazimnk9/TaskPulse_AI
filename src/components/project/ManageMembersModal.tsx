"use client";

import React, { useState, useEffect } from "react";
import { Users, UserPlus, Trash2, Shield, Loader2, Check, Mail } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface Member {
  id: string;
  userId: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
}

interface ManageMembersModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onMembersChanged: () => void;
}

export function ManageMembersModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  onMembersChanged,
}: ManageMembersModalProps) {
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [ownerId, setOwnerId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Invite form
  const [emailInput, setEmailInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setAvailableUsers(data.availableUsers || []);
        setOwnerId(data.ownerId || "");
      } else {
        toast.error("Failed to load project members");
      }
    } catch {
      toast.error("Network error loading members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchMembers();
    }
  }, [isOpen, projectId]);

  const handleAddMember = async (targetEmailOrId: string) => {
    if (!targetEmailOrId.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOrUserId: targetEmailOrId.trim(),
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Member added successfully");
        setEmailInput("");
        fetchMembers();
        onMembersChanged();
      } else {
        toast.error(data.error || "Failed to add member");
      }
    } catch {
      toast.error("Network error adding member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this project?`)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`${userName} removed from project`);
        fetchMembers();
        onMembersChanged();
      } else {
        toast.error(data.error || "Failed to remove member");
      }
    } catch {
      toast.error("Network error removing member");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Members & Access"
      subtitle={`Manage collaborators for ${projectName}`}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-6 text-xs">
        {/* Add Member Form */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
          <h4 className="font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <UserPlus className="w-3.5 h-3.5 text-blue-400" />
            Add Team Member by Email
          </h4>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddMember(emailInput);
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter user email (e.g. sarah@devsprint.io)..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </select>

            <button
              type="submit"
              disabled={submitting || !emailInput.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Add Member
            </button>
          </form>

          {/* Quick-add suggestions from other registered users */}
          {availableUsers.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
              <span className="text-[11px] text-slate-500">Available registered teammates:</span>
              <div className="flex flex-wrap gap-1.5">
                {availableUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleAddMember(u.email)}
                    disabled={submitting}
                    className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors text-[11px] cursor-pointer"
                  >
                    <span>+ {u.name}</span>
                    <span className="text-slate-500">({u.email})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Existing Members List */}
        <div className="flex flex-col gap-3">
          <h4 className="font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Current Project Collaborators ({members.length})
          </h4>

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span>Loading members...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {members.map((member) => {
                const isProjectOwner = member.userId === ownerId;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold border border-white/20">
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{member.user.name}</span>
                          {isProjectOwner && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Owner
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block">{member.user.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                        {member.role.toLowerCase()}
                      </span>

                      {!isProjectOwner && (
                        <button
                          onClick={() => handleRemoveMember(member.userId, member.user.name)}
                          title="Remove from project"
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
