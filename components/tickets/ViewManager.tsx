"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColumnConfig } from "./ColumnCustomizer";

export interface SavedView {
  id: string;
  name: string;
  columns: ColumnConfig[];
  filters: {
    status: string;
    priority: string;
    category?: string;
  };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  createdAt: number;
}

interface ViewManagerProps {
  currentView: SavedView | null;
  onViewSelect: (view: SavedView) => void;
  onViewSave: (view: SavedView) => void;
  onViewDelete: (viewId: string) => void;
  onClose: () => void;
  currentColumns: ColumnConfig[];
  currentFilters: {
    status: string;
    priority: string;
    category?: string;
  };
  currentSort?: {
    by: string;
    order: "asc" | "desc";
  };
}

const STORAGE_KEY = "ticketViews";

export function ViewManager({
  currentView,
  onViewSelect,
  onViewSave,
  onViewDelete,
  onClose,
  currentColumns,
  currentFilters,
  currentSort,
}: ViewManagerProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [viewName, setViewName] = useState("");
  const [editingViewId, setEditingViewId] = useState<string | null>(null);

  useEffect(() => {
    loadViews();
  }, []);

  const loadViews = () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedViews(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load views:", error);
    }
  };

  const saveViews = (views: SavedView[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
      setSavedViews(views);
    } catch (error) {
      console.error("Failed to save views:", error);
    }
  };

  const handleSaveView = () => {
    if (!viewName.trim()) return;

    const newView: SavedView = {
      id: editingViewId || `view-${Date.now()}`,
      name: viewName.trim(),
      columns: currentColumns,
      filters: currentFilters,
      sortBy: currentSort?.by,
      sortOrder: currentSort?.order || "asc",
      createdAt: editingViewId
        ? savedViews.find((v) => v.id === editingViewId)?.createdAt || Date.now()
        : Date.now(),
    };

    let updatedViews: SavedView[];
    if (editingViewId) {
      updatedViews = savedViews.map((v) => (v.id === editingViewId ? newView : v));
    } else {
      updatedViews = [...savedViews, newView];
    }

    saveViews(updatedViews);
    onViewSave(newView);
    setViewName("");
    setShowSaveForm(false);
    setEditingViewId(null);
  };

  const handleDeleteView = (viewId: string) => {
    if (!confirm("Are you sure you want to delete this view?")) return;

    const updatedViews = savedViews.filter((v) => v.id !== viewId);
    saveViews(updatedViews);
    onViewDelete(viewId);

    if (currentView?.id === viewId) {
      onViewSelect({
        id: "default",
        name: "Default View",
        columns: currentColumns,
        filters: { status: "all", priority: "all" },
        createdAt: Date.now(),
      });
    }
  };

  const handleEditView = (view: SavedView) => {
    setViewName(view.name);
    setEditingViewId(view.id);
    setShowSaveForm(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6 p-6 pb-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Manage Views</h2>
              <p className="text-sm text-slate-600 mt-1">
                Save and manage your custom ticket views
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/80 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {showSaveForm ? (
            <div className="space-y-4">
              <Input
                label="View Name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="Enter view name (e.g., 'My Open Tickets')"
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="gradient" onClick={handleSaveView}>
                  {editingViewId ? "Update View" : "Save View"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSaveForm(false);
                    setViewName("");
                    setEditingViewId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                variant="gradient"
                onClick={() => {
                  setViewName("");
                  setEditingViewId(null);
                  setShowSaveForm(true);
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Save Current View
              </Button>

              <div className="space-y-2">
                {savedViews.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p className="text-sm">No saved views yet</p>
                    <p className="text-xs mt-1">Save your current view to get started</p>
                  </div>
                ) : (
                  savedViews.map((view) => (
                    <div
                      key={view.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        currentView?.id === view.id
                          ? "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-400 shadow-md"
                          : "bg-white border-slate-200 hover:border-purple-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded-lg ${
                            currentView?.id === view.id ? "bg-purple-100" : "bg-slate-100"
                          }`}>
                            <svg className={`w-4 h-4 ${
                              currentView?.id === view.id ? "text-purple-600" : "text-slate-600"
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                          </div>
                          <h3 className="font-semibold text-slate-900">{view.name}</h3>
                          {currentView?.id === view.id && (
                            <span className="text-xs px-2 py-1 bg-purple-600 text-white rounded-full font-semibold border-2 border-purple-700">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          {view.filters.status !== "all" && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                              Status: {view.filters.status}
                            </span>
                          )}
                          {view.filters.priority !== "all" && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                              Priority: {view.filters.priority}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-medium">
                            {view.columns.filter((c) => c.visible).length} columns
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onViewSelect(view)}
                          className="p-2 hover:bg-purple-100 rounded-lg text-slate-600 hover:text-purple-700 transition-all"
                          title="Load view"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditView(view)}
                          className="p-2 hover:bg-blue-100 rounded-lg text-slate-600 hover:text-blue-700 transition-all"
                          title="Edit view"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteView(view.id)}
                          className="p-2 hover:bg-red-100 rounded-lg text-slate-600 hover:text-red-600 transition-all"
                          title="Delete view"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
