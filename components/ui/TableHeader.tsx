"use client";

import { useState, useRef, useEffect } from "react";

interface TableHeaderProps {
  label: string;
  columnId: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "select" | "text" | "date";
  filterOptions?: { value: string; label: string }[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filterValue?: string;
  onSort?: (columnId: string) => void;
  onFilter?: (columnId: string, value: string) => void;
  onClearFilter?: (columnId: string) => void;
  align?: "left" | "right" | "center";
  className?: string;
}

export function TableHeader({
  label,
  columnId,
  sortable = false,
  filterable = false,
  filterType = "select",
  filterOptions = [],
  sortBy,
  sortOrder = "asc",
  filterValue,
  onSort,
  onFilter,
  onClearFilter,
  align = "left",
  className = "",
}: TableHeaderProps) {
  const [showFilter, setShowFilter] = useState(false);
  const [tempFilterValue, setTempFilterValue] = useState(filterValue || "");
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false);
      }
    }

    if (showFilter) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showFilter]);

  const isSorted = sortBy === columnId;
  const hasFilter = filterValue && filterValue !== "all" && filterValue !== "";

  const handleSortClick = () => {
    if (sortable && onSort) {
      onSort(columnId);
    }
  };

  const handleFilterChange = (value: string) => {
    setTempFilterValue(value);
    if (onFilter) {
      onFilter(columnId, value);
    }
    setShowFilter(false);
  };

  const handleClearFilter = () => {
    setTempFilterValue("");
    if (onClearFilter) {
      onClearFilter(columnId);
    }
    setShowFilter(false);
  };

  const getSortIcon = () => {
    if (!isSorted) {
      return (
        <svg className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return (
      <svg
        className={`w-3 h-3 text-blue-600 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      </svg>
    );
  };

  return (
    <th
      className={`px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2">
          {sortable ? (
            <button
              onClick={handleSortClick}
              className="flex items-center gap-1.5 hover:text-slate-900 transition-colors group"
            >
              <span>{label}</span>
              {getSortIcon()}
            </button>
          ) : (
            <span>{label}</span>
          )}
          {hasFilter && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              !
            </span>
          )}
        </div>
        {filterable && (
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                hasFilter ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
              title="Filter"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  {filterType === "select" && filterOptions.length > 0 ? (
                    <>
                      <div className="max-h-60 overflow-y-auto">
                        <button
                          onClick={() => handleFilterChange("all")}
                          className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-slate-100 ${
                            tempFilterValue === "all" || !tempFilterValue ? "bg-blue-50 text-blue-700 font-medium" : ""
                          }`}
                        >
                          All
                        </button>
                        {filterOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleFilterChange(option.value)}
                            className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-slate-100 ${
                              tempFilterValue === option.value ? "bg-blue-50 text-blue-700 font-medium" : ""
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {hasFilter && (
                        <button
                          onClick={handleClearFilter}
                          className="w-full mt-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                          Clear Filter
                        </button>
                      )}
                    </>
                  ) : filterType === "text" ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={tempFilterValue}
                        onChange={(e) => setTempFilterValue(e.target.value)}
                        placeholder="Filter..."
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFilterChange(tempFilterValue)}
                          className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Apply
                        </button>
                        {hasFilter && (
                          <button
                            onClick={handleClearFilter}
                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
}
