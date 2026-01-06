"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  width?: string;
}

interface ColumnCustomizerProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  onClose: () => void;
}

export function ColumnCustomizer({
  columns,
  onColumnsChange,
  onClose,
}: ColumnCustomizerProps) {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleToggleVisibility = (columnId: string) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newColumns = [...localColumns];
    const draggedItem = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedItem);

    // Update order values
    const updatedColumns = newColumns.map((col, idx) => ({
      ...col,
      order: idx,
    }));

    setLocalColumns(updatedColumns);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    onColumnsChange(localColumns);
    onClose();
  };

  const handleReset = () => {
    const defaultColumns = columns.map((col, idx) => ({
      ...col,
      visible: true,
      order: idx,
    }));
    setLocalColumns(defaultColumns);
  };

  const sortedColumns = [...localColumns].sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6 p-6 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Customize Columns</h2>
            <p className="text-sm text-slate-600 mt-1">
              Show, hide, and reorder columns to match your workflow
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <div className="space-y-2">
            {sortedColumns.map((column, index) => (
              <div
                key={column.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  draggedIndex === index
                    ? "opacity-50 bg-blue-50 border-blue-300"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                } cursor-move`}
              >
                {/* Drag handle */}
                <div className="flex-shrink-0 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>

                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={() => handleToggleVisibility(column.id)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />

                {/* Label */}
                <label className="flex-1 text-sm font-medium text-slate-700 cursor-pointer">
                  {column.label}
                </label>

                {/* Order indicator */}
                <div className="flex-shrink-0 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSave}>
              Apply Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
