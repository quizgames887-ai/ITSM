"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";

export default function VotingPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showVoteForm, setShowVoteForm] = useState(false);
  const [editingVote, setEditingVote] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedVoteId, setExpandedVoteId] = useState<Id<"votes"> | null>(null);
  const [voteForm, setVoteForm] = useState({
    question: "",
    options: ["", "", ""],
  });

  const { success, error: showError } = useToastContext();

  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (id) setCurrentUserId(id);
  }, []);

  // Get current user to check admin status
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );

  // Get all votes
  const votes = useQuery((api as any).votes?.list, {}) as any[] | undefined;

  // Get all users for display
  const users = useQuery(api.users.list, {});

  // Get detailed vote information when expanded
  const voteDetails = useQuery(
    (api as any).votes?.getVoteDetails,
    expandedVoteId ? { voteId: expandedVoteId } : "skip"
  ) as any;

  // Mutations
  const createVote = useMutation((api as any).votes?.create);
  const updateVote = useMutation((api as any).votes?.update);
  const deleteVote = useMutation((api as any).votes?.remove);

  const isAdmin = currentUser?.role === "admin";

  const getUserName = (userId: Id<"users">) => {
    return users?.find((u) => u._id === userId)?.name || "Unknown User";
  };

  const handleAddVote = () => {
    setVoteForm({
      question: "",
      options: ["", "", ""],
    });
    setEditingVote(null);
    setShowVoteForm(true);
  };

  const handleEditVote = (vote: any) => {
    setVoteForm({
      question: vote.question,
      options: vote.options.length > 0 ? vote.options : ["", "", ""],
    });
    setEditingVote(vote);
    setShowVoteForm(true);
  };

  const handleDeleteVote = async (voteId: Id<"votes">) => {
    if (!confirm("Are you sure you want to delete this vote? All voting data will be lost.")) {
      return;
    }

    if (!currentUserId) {
      showError("You must be logged in to delete votes");
      return;
    }

    try {
      await deleteVote({ id: voteId, userId: currentUserId as Id<"users"> });
      success("Vote deleted successfully");
    } catch (err: any) {
      showError(err.message || "Failed to delete vote");
    }
  };

  const handleVoteSubmit = async () => {
    if (!voteForm.question.trim()) {
      showError("Question is required");
      return;
    }

    const validOptions = voteForm.options.filter((opt) => opt.trim() !== "");
    if (validOptions.length < 2) {
      showError("At least 2 options are required");
      return;
    }

    if (!currentUserId) {
      showError("You must be logged in to create votes");
      return;
    }

    try {
      if (editingVote) {
        await updateVote({
          id: editingVote._id,
          question: voteForm.question.trim(),
          options: validOptions.map((opt) => opt.trim()),
          userId: currentUserId as Id<"users">,
        });
        success("Vote updated successfully");
      } else {
        await createVote({
          question: voteForm.question.trim(),
          options: validOptions.map((opt) => opt.trim()),
          createdBy: currentUserId as Id<"users">,
        });
        success("Vote created successfully");
      }
      setShowVoteForm(false);
      setEditingVote(null);
      setVoteForm({
        question: "",
        options: ["", "", ""],
      });
    } catch (err: any) {
      showError(err.message || "Failed to save vote");
    }
  };

  const handleToggleActive = async (vote: any) => {
    if (!currentUserId) {
      showError("You must be logged in to update votes");
      return;
    }

    try {
      await updateVote({
        id: vote._id,
        isActive: !vote.isActive,
        userId: currentUserId as Id<"users">,
      });
      success(vote.isActive ? "Vote deactivated" : "Vote activated");
    } catch (err: any) {
      showError(err.message || "Failed to update vote");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatVoteDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr} at ${timeStr}`;
  };

  if (votes === undefined || (currentUserId && currentUser === undefined)) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (!isAdmin && currentUser !== undefined) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">🔒</span>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">You need admin privileges to access this page.</p>
          <Link href="/dashboard">
            <Button variant="gradient">Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const activeVotes = votes?.filter((v) => v.isActive) || [];
  const historyVotes = votes?.filter((v) => !v.isActive || showHistory) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Voting Management</h1>
          <p className="text-sm text-slate-600 mt-1">Create and manage voting polls</p>
        </div>
        <Button variant="gradient" onClick={handleAddVote}>
          + Create Vote
        </Button>
      </div>

      {/* Active Votes */}
      {activeVotes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Active Votes ({activeVotes.length})
          </h2>
          {activeVotes.map((activeVote) => (
            <Card key={activeVote._id} padding="md" className="border-2 border-blue-200 bg-blue-50/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Active Vote</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Created on {formatDate(activeVote.createdAt)} · {activeVote.totalVotes || 0} total votes
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(activeVote)}
                >
                  Deactivate
                </Button>
              </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">{activeVote.question}</p>
            <div className="space-y-2">
              {activeVote.options.map((option: string, index: number) => {
                const count = activeVote.voteCounts?.[option] || 0;
                const percentage = activeVote.totalVotes > 0 
                  ? Math.round((count / activeVote.totalVotes) * 100) 
                  : 0;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{option}</span>
                      <span className="text-slate-500">{count} votes ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => setExpandedVoteId(expandedVoteId === activeVote._id ? null : activeVote._id)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                {expandedVoteId === activeVote._id ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Hide Voter Details
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    View Voter Details
                  </>
                )}
              </button>
              {expandedVoteId === activeVote._id && voteDetails && (
                <div className="mt-3 space-y-2">
                  {voteDetails.voters && voteDetails.voters.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 mb-2">Voter Information:</div>
                      {voteDetails.voters.map((voter: any) => (
                        <div key={voter._id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{voter.userName}</div>
                            {voter.userEmail && (
                              <div className="text-slate-500 text-[10px]">{voter.userEmail}</div>
                            )}
                            <div className="text-slate-400 text-[10px] mt-0.5">
                              {formatVoteDate(voter.votedAt)}
                            </div>
                          </div>
                          <div className="ml-4 px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                            {voter.option}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-2">No votes yet</div>
                  )}
                </div>
              )}
            </div>
          </div>
            </Card>
          ))}
        </div>
      )}

      {/* Votes List */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {showHistory ? "All Votes" : "Inactive Votes"}
          </h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showHistory ? "Hide History" : "Show History"}
          </button>
        </div>
        <div className="space-y-4">
          {historyVotes.length > 0 ? (
            historyVotes.map((vote) => (
              <div
                key={vote._id}
                className="flex items-start justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-slate-900">{vote.question}</h3>
                    {vote.isActive && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 mb-2">
                    {vote.options.map((option: string, index: number) => {
                      const count = vote.voteCounts?.[option] || 0;
                      const percentage = vote.totalVotes > 0 
                        ? Math.round((count / vote.totalVotes) * 100) 
                        : 0;
                      return (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-slate-600 w-32 truncate">{option}</span>
                          <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-500 w-16 text-right">
                            {count} ({percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Total: {vote.totalVotes || 0} votes</span>
                    <span>Created: {formatDate(vote.createdAt)}</span>
                    <span>By: {getUserName(vote.createdBy)}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <button
                      onClick={() => setExpandedVoteId(expandedVoteId === vote._id ? null : vote._id)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      {expandedVoteId === vote._id ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          Hide Voter Details
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          View Voter Details
                        </>
                      )}
                    </button>
                    {expandedVoteId === vote._id && voteDetails && voteDetails.vote?._id === vote._id && (
                      <div className="mt-3 space-y-2">
                        {voteDetails.voters && voteDetails.voters.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-700 mb-2">Voter Information:</div>
                            {voteDetails.voters.map((voter: any) => (
                              <div key={voter._id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                                <div className="flex-1">
                                  <div className="font-medium text-slate-900">{voter.userName}</div>
                                  {voter.userEmail && (
                                    <div className="text-slate-500 text-[10px]">{voter.userEmail}</div>
                                  )}
                                  <div className="text-slate-400 text-[10px] mt-0.5">
                                    {formatVoteDate(voter.votedAt)}
                                  </div>
                                </div>
                                <div className="ml-4 px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                                  {voter.option}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 py-2">No votes yet</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!vote.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(vote)}
                    >
                      Activate
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditVote(vote)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteVote(vote._id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <span className="text-4xl mb-3 block">📊</span>
              <p className="text-sm">No votes found</p>
              <Button
                variant="outline"
                onClick={handleAddVote}
                className="mt-4"
              >
                Create Your First Vote
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Vote Form Modal */}
      {showVoteForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowVoteForm(false);
            setEditingVote(null);
            setVoteForm({
              question: "",
              options: ["", "", ""],
            });
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingVote ? "Edit Vote" : "Create Vote"}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {editingVote ? "Update the voting poll" : "Create a new voting poll"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVoteForm(false);
                  setEditingVote(null);
                  setVoteForm({
                    question: "",
                    options: ["", "", ""],
                  });
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <Textarea
                  label="Question"
                  value={voteForm.question}
                  onChange={(e) => setVoteForm({ ...voteForm, question: e.target.value })}
                  placeholder="What do you think of the new portals system?"
                  rows={2}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Options <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {voteForm.options.map((option, index) => (
                      <Input
                        key={index}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...voteForm.options];
                          newOptions[index] = e.target.value;
                          setVoteForm({ ...voteForm, options: newOptions });
                        }}
                        placeholder={`Option ${index + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVoteForm({
                        ...voteForm,
                        options: [...voteForm.options, ""],
                      });
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Option
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVoteForm(false);
                  setEditingVote(null);
                  setVoteForm({
                    question: "",
                    options: ["", "", ""],
                  });
                }}
              >
                Cancel
              </Button>
              <Button variant="gradient" onClick={handleVoteSubmit}>
                {editingVote ? "Update Vote" : "Create Vote"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
