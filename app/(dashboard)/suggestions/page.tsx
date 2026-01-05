"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";

const SUGGESTION_CATEGORIES = [
  { value: "ui", label: "UI/UX" },
  { value: "features", label: "Features" },
  { value: "performance", label: "Performance" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  { value: "reviewed", label: "Reviewed", color: "bg-blue-100 text-blue-700" },
  { value: "implemented", label: "Implemented", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
];

export default function SuggestionsPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingSuggestion, setReviewingSuggestion] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({
    status: "reviewed" as "pending" | "reviewed" | "implemented" | "rejected",
    reviewNotes: "",
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

  // Get all suggestions - handle case where functions aren't synced yet
  const suggestionsApi = (api as any).suggestions;
  
  // Wait for user to load before determining role
  const isAdmin = currentUser?.role === "admin";
  const userLoaded = currentUserId ? (currentUser !== undefined) : true; // If no userId, we're not logged in, so consider "loaded"
  
  // Determine which function to use based on role
  // Always call useQuery (React hooks rule), but conditionally pass function and args
  // Security: Only admins see all suggestions; end users and agents see only their own
  const suggestionsQuery = userLoaded && isAdmin && suggestionsApi?.list
    ? suggestionsApi.list  // Admins see all suggestions
    : userLoaded && !isAdmin && currentUserId && suggestionsApi?.getByUser
    ? suggestionsApi.getByUser  // End users and agents see only their own suggestions
    : suggestionsApi?.list || suggestionsApi?.getByUser || api.users.list; // Fallback to a valid function
    
  const suggestionsArgs = userLoaded && isAdmin && suggestionsApi?.list
    ? {}  // Admin: no filter, get all
    : userLoaded && !isAdmin && currentUserId && suggestionsApi?.getByUser
    ? { userId: currentUserId as Id<"users"> }  // End users and agents: filter by their own userId
    : "skip";
  
  const allSuggestions = useQuery(suggestionsQuery, suggestionsArgs) as any[] | undefined;

  // Get statistics (admin only)
  const statsQuery = userLoaded && isAdmin && suggestionsApi?.getStats
    ? suggestionsApi.getStats
    : suggestionsApi?.getStats || api.users.list; // Fallback to a valid function
    
  const stats = useQuery(statsQuery, userLoaded && isAdmin && suggestionsApi?.getStats ? {} : "skip") as any;

  // Get all users for display
  const users = useQuery(api.users.list, {});

  // Mutations
  const updateStatus = useMutation((api as any).suggestions?.updateStatus);
  const deleteSuggestion = useMutation((api as any).suggestions?.remove);

  // Filter suggestions
  const filteredSuggestions = allSuggestions?.filter((suggestion) => {
    if (statusFilter !== "all" && suggestion.status !== statusFilter) return false;
    if (categoryFilter !== "all" && suggestion.category !== categoryFilter) return false;
    return true;
  });

  const getUserName = (userId: Id<"users">) => {
    return users?.find((u) => u._id === userId)?.name || "Unknown User";
  };

  const handleReview = (suggestion: any) => {
    setReviewingSuggestion(suggestion);
    setReviewForm({
      status: suggestion.status,
      reviewNotes: suggestion.reviewNotes || "",
    });
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async () => {
    if (!currentUserId || !reviewingSuggestion) return;

    try {
      await updateStatus({
        id: reviewingSuggestion._id,
        status: reviewForm.status,
        reviewNotes: reviewForm.reviewNotes.trim() || undefined,
        reviewedBy: currentUserId as Id<"users">,
      });
      success("Suggestion status updated successfully");
      setShowReviewModal(false);
      setReviewingSuggestion(null);
      setReviewForm({
        status: "reviewed",
        reviewNotes: "",
      });
    } catch (err: any) {
      showError(err.message || "Failed to update suggestion");
    }
  };

  const handleDelete = async (suggestionId: Id<"suggestions">) => {
    if (!confirm("Are you sure you want to delete this suggestion?")) {
      return;
    }

    if (!currentUserId) {
      showError("You must be logged in to delete suggestions");
      return;
    }

    try {
      await deleteSuggestion({
        id: suggestionId,
        userId: currentUserId as Id<"users">,
      });
      success("Suggestion deleted successfully");
    } catch (err: any) {
      showError(err.message || "Failed to delete suggestion");
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

  const getCategoryLabel = (category: string) => {
    return SUGGESTION_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  };

  // Check if Convex functions are available (basic check)
  const hasBasicFunctions = suggestionsApi?.list || suggestionsApi?.getByUser;
    
  if (!hasBasicFunctions) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">⏳</span>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Syncing Functions</h2>
          <p className="text-slate-600 mb-4">
            Convex functions are being synced. Please wait a moment and refresh the page.
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Make sure <code className="bg-slate-100 px-2 py-1 rounded">npx convex dev</code> is running.
          </p>
          <Button variant="gradient" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </Card>
    );
  }

  // Loading check - stats is only required for admins
  const isLoading = allSuggestions === undefined || 
    (currentUserId && currentUser === undefined) ||
    (isAdmin && stats === undefined);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  // No access restriction - users can view their own suggestions

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            {isAdmin ? "Suggestions Management" : "My Suggestions"}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {isAdmin 
              ? "Review and manage user suggestions" 
              : "View your submitted suggestions and their status"}
          </p>
        </div>
      </div>

      {/* Statistics - Admin only */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card padding="sm" className="text-center">
            <div className="text-2xl font-bold text-slate-900">{stats?.total || 0}</div>
            <div className="text-xs text-slate-600">Total</div>
          </Card>
          <Card padding="sm" className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
            <div className="text-xs text-slate-600">Pending</div>
          </Card>
          <Card padding="sm" className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats?.reviewed || 0}</div>
            <div className="text-xs text-slate-600">Reviewed</div>
          </Card>
          <Card padding="sm" className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.implemented || 0}</div>
            <div className="text-xs text-slate-600">Implemented</div>
          </Card>
          <Card padding="sm" className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats?.rejected || 0}</div>
            <div className="text-xs text-slate-600">Rejected</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Filter by Status
            </label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "all", label: "All Statuses" },
                ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
              ]}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Filter by Category
            </label>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: "all", label: "All Categories" },
                ...SUGGESTION_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Suggestions List */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Suggestions ({filteredSuggestions?.length || 0})
          </h2>
        </div>
        <div className="space-y-4">
          {filteredSuggestions && filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((suggestion) => {
              const statusInfo = getStatusInfo(suggestion.status);
              return (
                <div
                  key={suggestion._id}
                  className="flex items-start justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-full">
                        {getCategoryLabel(suggestion.category)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-900 mb-2 whitespace-pre-wrap">
                      {suggestion.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>By: {getUserName(suggestion.createdBy)}</span>
                      <span>Created: {formatDate(suggestion.createdAt)}</span>
                      {suggestion.reviewedBy && (
                        <span>Reviewed by: {getUserName(suggestion.reviewedBy)}</span>
                      )}
                    </div>
                    {suggestion.reviewNotes && (
                      <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-700 mb-1">Review Notes:</p>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap">
                          {suggestion.reviewNotes}
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Action buttons - Admin only */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReview(suggestion)}
                      >
                        Review
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(suggestion._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-500">
              <span className="text-4xl mb-3 block">💡</span>
              <p className="text-sm">No suggestions found</p>
            </div>
          )}
        </div>
      </Card>

      {/* Review Modal */}
      {showReviewModal && reviewingSuggestion && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowReviewModal(false);
            setReviewingSuggestion(null);
            setReviewForm({
              status: "reviewed",
              reviewNotes: "",
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
                <h2 className="text-xl font-bold text-slate-900">Review Suggestion</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Category: {getCategoryLabel(reviewingSuggestion.category)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewingSuggestion(null);
                  setReviewForm({
                    status: "reviewed",
                    reviewNotes: "",
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Suggestion
                  </label>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                    {reviewingSuggestion.content}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={reviewForm.status}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        status: e.target.value as any,
                      })
                    }
                    options={STATUS_OPTIONS.map((s) => ({
                      value: s.value,
                      label: s.label,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Review Notes (Optional)
                  </label>
                  <Textarea
                    value={reviewForm.reviewNotes}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, reviewNotes: e.target.value })
                    }
                    placeholder="Add review notes..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewingSuggestion(null);
                  setReviewForm({
                    status: "reviewed",
                    reviewNotes: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button variant="gradient" onClick={handleReviewSubmit}>
                Update Status
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
