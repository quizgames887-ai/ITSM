"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { KanbanBoard } from "@/components/todos/KanbanBoard";
import { useToastContext } from "@/contexts/ToastContext";

export default function TodosPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<any>(null);
  const [todoForm, setTodoForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high",
  });
  const { error: showError, success } = useToastContext();

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) setUserId(id);
  }, []);

  // Fetch all todos
  const todos = useQuery(
    (api as any).todos?.list,
    userId ? { userId: userId as Id<"users"> } : "skip"
  ) as any[] | undefined;

  // Mutations
  const createTodo = useMutation((api as any).todos?.create);
  const updateTodo = useMutation((api as any).todos?.update);
  const deleteTodoMutation = useMutation((api as any).todos?.remove);
  const toggleTodoComplete = useMutation((api as any).todos?.toggleComplete);

  const handleAddTodo = () => {
    setTodoForm({
      title: "",
      description: "",
      dueDate: "",
      priority: "medium",
    });
    setEditingTodo(null);
    setShowTodoForm(true);
  };

  const handleEditTodo = (todo: any) => {
    const dueDate = new Date(todo.dueDate);
    setTodoForm({
      title: todo.title,
      description: todo.description || "",
      dueDate: dueDate.toISOString().split("T")[0],
      priority: todo.priority,
    });
    setEditingTodo(todo);
    setShowTodoForm(true);
  };

  const handleDeleteTodo = async (todoId: Id<"todos">) => {
    if (!confirm("Are you sure you want to delete this todo?")) return;

    if (!userId) {
      showError("You must be logged in to delete todos");
      return;
    }

    try {
      await deleteTodoMutation({ id: todoId, userId: userId as Id<"users"> });
      success("Todo deleted successfully");
    } catch (err: any) {
      showError(err.message || "Failed to delete todo");
    }
  };

  const handleToggleComplete = async (todo: any) => {
    if (!userId) {
      showError("You must be logged in to update todos");
      return;
    }

    try {
      await toggleTodoComplete({
        id: todo._id,
        userId: userId as Id<"users">,
      });
      success(todo.status === "completed" ? "Todo marked as incomplete" : "Todo marked as complete");
    } catch (err: any) {
      showError(err.message || "Failed to update todo");
    }
  };

  const handleStatusChange = async (todoId: Id<"todos">, newStatus: "pending" | "in_progress" | "completed" | "overdue") => {
    if (!userId) {
      showError("You must be logged in to update todos");
      return;
    }

    try {
      await updateTodo({
        id: todoId,
        status: newStatus,
        userId: userId as Id<"users">,
      });
      success("Todo status updated");
    } catch (err: any) {
      showError(err.message || "Failed to update todo status");
    }
  };

  const handleTodoSubmit = async () => {
    if (!todoForm.title.trim()) {
      showError("Todo title is required");
      return;
    }

    if (!todoForm.dueDate) {
      showError("Due date is required");
      return;
    }

    if (!userId) {
      showError("You must be logged in to create todos");
      return;
    }

    try {
      const dueDateTimestamp = new Date(todoForm.dueDate).getTime();

      if (editingTodo) {
        await updateTodo({
          id: editingTodo._id,
          title: todoForm.title.trim(),
          description: todoForm.description.trim() || undefined,
          dueDate: dueDateTimestamp,
          priority: todoForm.priority,
          userId: userId as Id<"users">,
        });
        success("Todo updated successfully");
      } else {
        await createTodo({
          title: todoForm.title.trim(),
          description: todoForm.description.trim() || undefined,
          dueDate: dueDateTimestamp,
          priority: todoForm.priority,
          createdBy: userId as Id<"users">,
        });
        success("Todo created successfully");
      }

      setShowTodoForm(false);
      setEditingTodo(null);
      setTodoForm({
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
      });
    } catch (err: any) {
      showError(err.message || "Failed to save todo");
    }
  };

  const formatDueDate = (timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return `Overdue ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}`;
    } else if (days === 0) {
      return "Due today";
    } else if (days === 1) {
      return "Due tomorrow";
    } else {
      return `Due in ${days} days`;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const badges = {
      low: { label: "Low", color: "bg-green-100 text-green-700" },
      medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700" },
      high: { label: "High", color: "bg-red-100 text-red-700" },
    };
    return badges[priority as keyof typeof badges] || badges.medium;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { label: "Pending", color: "bg-slate-100 text-slate-700" },
      in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
      completed: { label: "Completed", color: "bg-green-100 text-green-700" },
      overdue: { label: "Overdue", color: "bg-red-100 text-red-700" },
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getTodoPriorityColor = (priority: string, status: string) => {
    if (status === "completed") return "bg-slate-300";
    if (status === "overdue") return "bg-red-500";
    const colors = {
      low: "bg-green-500",
      medium: "bg-yellow-500",
      high: "bg-red-500",
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Todos</h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage your tasks and track progress
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-4 py-2 text-sm font-semibold rounded transition-all duration-200 ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 text-sm font-semibold rounded transition-all duration-200 ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              List
            </button>
          </div>
          <Button 
            variant="gradient" 
            onClick={handleAddTodo}
            className="shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 px-4 py-2.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-semibold">Add Todo</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "kanban" ? (
        <KanbanBoard
          todos={todos || []}
          onStatusChange={handleStatusChange}
          onEdit={handleEditTodo}
          onDelete={handleDeleteTodo}
          onToggleComplete={handleToggleComplete}
          userId={userId as Id<"users"> | null}
        />
      ) : (
        <Card padding="md">
          <div className="space-y-3">
            {todos && todos.length > 0 ? (
              todos.map((todo) => {
                const priorityBadge = getPriorityBadge(todo.priority);
                const statusBadge = getStatusBadge(todo.status);
                const isOverdue = todo.status !== "completed" && todo.dueDate < Date.now();

                return (
                  <div
                    key={todo._id}
                    className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg hover:shadow-md transition-all group"
                  >
                    {/* Priority indicator bar */}
                    <div
                      className={`w-[3px] h-full min-h-[60px] ${getTodoPriorityColor(todo.priority, todo.status)} rounded-full flex-shrink-0`}
                    ></div>

                    {/* Todo content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`font-semibold text-slate-900 mb-1 ${
                              todo.status === "completed" ? "line-through text-slate-400" : ""
                            }`}
                          >
                            {todo.title}
                          </h3>
                          {todo.description && (
                            <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                              {todo.description}
                            </p>
                          )}
                        </div>

                        {/* Options */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditTodo(todo)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTodo(todo._id)}
                            className="p-1.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-600"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityBadge.color}`}>
                          {priorityBadge.label}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        <span className={`text-xs text-slate-500 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                          {formatDueDate(todo.dueDate)}
                        </span>
                      </div>

                      {todo.status !== "completed" && (
                        <button
                          onClick={() => handleToggleComplete(todo)}
                          className="mt-3 text-xs py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded transition-colors"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm mb-2">No todos yet</p>
                <Button variant="outline" size="sm" onClick={handleAddTodo}>
                  Create your first todo
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Todo Form Modal */}
      {showTodoForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowTodoForm(false);
            setEditingTodo(null);
            setTodoForm({
              title: "",
              description: "",
              dueDate: "",
              priority: "medium",
            });
          }}
        >
          <Card
            className="max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTodo ? "Edit Todo" : "Add Todo"}
              </h2>
              <button
                onClick={() => {
                  setShowTodoForm(false);
                  setEditingTodo(null);
                  setTodoForm({
                    title: "",
                    description: "",
                    dueDate: "",
                    priority: "medium",
                  });
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Todo Title"
                value={todoForm.title}
                onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
                placeholder="Enter todo title"
                required
              />

              <Textarea
                label="Description (Optional)"
                value={todoForm.description}
                onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
                placeholder="Enter todo description (optional)"
                rows={3}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={todoForm.dueDate}
                    onChange={(e) => setTodoForm({ ...todoForm, dueDate: e.target.value })}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                <Select
                  label="Priority"
                  value={todoForm.priority}
                  onChange={(e) => setTodoForm({ ...todoForm, priority: e.target.value as any })}
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTodoForm(false);
                    setEditingTodo(null);
                    setTodoForm({
                      title: "",
                      description: "",
                      dueDate: "",
                      priority: "medium",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleTodoSubmit}>
                  {editingTodo ? "Update Todo" : "Create Todo"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
