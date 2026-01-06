"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";

interface Todo {
  _id: Id<"todos">;
  title: string;
  description?: string;
  dueDate: number;
  status: "pending" | "in_progress" | "completed" | "overdue";
  priority: "low" | "medium" | "high";
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
}

interface KanbanBoardProps {
  todos: Todo[];
  onStatusChange: (todoId: Id<"todos">, newStatus: Todo["status"]) => Promise<void>;
  onEdit: (todo: Todo) => void;
  onDelete: (todoId: Id<"todos">) => void;
  onToggleComplete: (todo: Todo) => void;
  userId: Id<"users"> | null;
}

const statusConfig = {
  pending: {
    label: "To Do",
    color: "bg-slate-100",
    textColor: "text-slate-700",
    borderColor: "border-slate-300",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100",
    textColor: "text-blue-700",
    borderColor: "border-blue-300",
  },
  completed: {
    label: "Done",
    color: "bg-green-100",
    textColor: "text-green-700",
    borderColor: "border-green-300",
  },
  overdue: {
    label: "Overdue",
    color: "bg-red-100",
    textColor: "text-red-700",
    borderColor: "border-red-300",
  },
};

const priorityColors = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

const priorityConfig = {
  low: {
    dot: "bg-green-500",
    label: "Low",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  medium: {
    dot: "bg-yellow-500",
    label: "Medium",
    badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  high: {
    dot: "bg-red-500",
    label: "High",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
};

export function KanbanBoard({
  todos,
  onStatusChange,
  onEdit,
  onDelete,
  onToggleComplete,
  userId,
}: KanbanBoardProps) {
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

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

  const handleDragStart = (e: React.DragEvent, todo: Todo) => {
    setDraggedTodo(todo);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", todo._id);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedTodo(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: Todo["status"]) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Todo["status"]) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTodo && draggedTodo.status !== targetStatus) {
      await onStatusChange(draggedTodo._id, targetStatus);
    }

    setDraggedTodo(null);
  };

  const getTodosByStatus = (status: Todo["status"]) => {
    return todos.filter((todo) => todo.status === status);
  };

  const columns: Array<{ status: Todo["status"]; config: typeof statusConfig.pending }> = [
    { status: "pending", config: statusConfig.pending },
    { status: "in_progress", config: statusConfig.in_progress },
    { status: "completed", config: statusConfig.completed },
    { status: "overdue", config: statusConfig.overdue },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 pb-4">
      {columns.map(({ status, config }) => {
        const columnTodos = getTodosByStatus(status);
        const isDragOver = dragOverColumn === status;

        return (
          <div
            key={status}
            className={`flex flex-col h-full min-h-[400px] transition-all ${
              isDragOver 
                ? "ring-2 ring-blue-500 ring-offset-2 bg-blue-50/30 rounded-lg" 
                : ""
            }`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <Card
              padding="md"
              className={`h-full flex flex-col ${config.borderColor} border-2 shadow-sm hover:shadow-md transition-shadow`}
            >
              {/* Column Header */}
              <div className={`${config.color} ${config.textColor} px-4 py-3 rounded-lg mb-4 flex items-center justify-between shadow-sm`}>
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  {config.label}
                </h3>
                <span className="text-xs font-bold bg-white/70 px-2.5 py-1 rounded-full border border-white/50">
                  {columnTodos.length}
                </span>
              </div>

              {/* Todo Cards */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
                {columnTodos.map((todo) => {
                  const isOverdue = todo.status !== "completed" && todo.dueDate < Date.now();
                  const priorityInfo = priorityConfig[todo.priority];
                  
                  // For completed todos, show completion date instead of due date
                  const showCompletionInfo = todo.status === "completed" && todo.completedAt;
                  
                  return (
                    <div
                      key={todo._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, todo)}
                      onDragEnd={handleDragEnd}
                      className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:shadow-lg hover:border-slate-300 transition-all cursor-move group"
                    >
                      {/* Priority indicator and actions */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {/* Priority dot - only show for non-completed tasks */}
                          {todo.status !== "completed" && (
                            <div className={`w-3 h-3 rounded-full ${priorityInfo.dot} shadow-sm`} title={`${priorityInfo.label} Priority`}></div>
                          )}
                          {/* Completed indicator */}
                          {todo.status === "completed" && (
                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm flex items-center justify-center" title="Completed">
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          {/* Priority badge for overdue tasks */}
                          {todo.status === "overdue" && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${priorityInfo.badge}`}>
                              {priorityInfo.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(todo)}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onDelete(todo._id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Todo Title */}
                      <h4
                        className={`font-semibold text-sm text-slate-900 mb-2 ${
                          todo.status === "completed" ? "line-through text-slate-400" : ""
                        }`}
                      >
                        {todo.title}
                      </h4>

                      {/* Description */}
                      {todo.description && (
                        <p className={`text-xs mb-3 line-clamp-2 ${
                          todo.status === "completed" ? "text-slate-400" : "text-slate-600"
                        }`}>
                          {todo.description}
                        </p>
                      )}

                      {/* Due Date / Completion Date */}
                      <div className={`flex items-center gap-1.5 text-xs mb-3 ${
                        todo.status === "completed" ? "text-slate-400" : isOverdue ? "text-red-600" : "text-slate-500"
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {showCompletionInfo ? (
                          <span className="font-medium">
                            Completed {new Date(todo.completedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className={isOverdue ? "font-semibold" : ""}>
                            {formatDueDate(todo.dueDate)}
                          </span>
                        )}
                      </div>

                      {/* Contextual Actions */}
                      {todo.status === "completed" ? (
                        <button
                          onClick={() => onToggleComplete(todo)}
                          className="w-full text-xs py-2 px-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors font-medium border border-green-200"
                        >
                          Mark Incomplete
                        </button>
                      ) : todo.status === "overdue" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onToggleComplete(todo)}
                            className="flex-1 text-xs py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors font-medium border border-red-200"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => onEdit(todo)}
                            className="px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200"
                            title="Update due date"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onToggleComplete(todo)}
                          className="w-full text-xs py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors font-medium border border-slate-200"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  );
                })}

                {columnTodos.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium">No tasks</p>
                    <p className="text-xs mt-1 opacity-75">Drag tasks here or create a new one</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
