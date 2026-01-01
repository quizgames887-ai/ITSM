"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

const TICKET_CATEGORIES = ["IT Support", "HR", "Finance", "Facilities", "Security", "Other"];
const TICKET_PRIORITIES = ["low", "medium", "high", "critical"];
const TICKET_TYPES = ["incident", "service_request", "inquiry"];

type AssignToType = 
  | { type: "agent"; agentId: Id<"users"> }
  | { type: "team"; teamId: Id<"teams"> }
  | { type: "round_robin"; teamId: Id<"teams"> };

export default function RolesPage() {
  const rules = useQuery(api.assignmentRules.list, {});
  const stats = useQuery(api.assignmentRules.getStats, {});
  const teams = useQuery(api.teams.list, {});
  const users = useQuery(api.users.list, {});
  
  const createRule = useMutation(api.assignmentRules.create);
  const updateRule = useMutation(api.assignmentRules.update);
  const removeRule = useMutation(api.assignmentRules.remove);
  const toggleActive = useMutation(api.assignmentRules.toggleActive);
  
  const { success, error: showError } = useToastContext();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Id<"assignmentRules"> | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    priority: 1,
    conditions: {
      categories: [] as string[],
      priorities: [] as string[],
      types: [] as string[],
    },
    assignToType: "agent" as "agent" | "team" | "round_robin",
    assignToId: "" as string,
  });

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  const isAdmin = currentUser?.role === "admin";
  const agents = users?.filter((u) => u.role === "agent") || [];

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      isActive: true,
      priority: (rules?.length || 0) + 1,
      conditions: {
        categories: [],
        priorities: [],
        types: [],
      },
      assignToType: "agent",
      assignToId: "",
    });
    setEditingRule(null);
    setShowCreateForm(false);
  };

  const handleCreateRule = async () => {
    if (!formData.name.trim()) {
      showError("Rule name is required");
      return;
    }
    
    if (!formData.assignToId) {
      showError("Please select an assignment target");
      return;
    }

    try {
      let assignTo: AssignToType;
      
      if (formData.assignToType === "agent") {
        assignTo = { type: "agent", agentId: formData.assignToId as Id<"users"> };
      } else {
        assignTo = { type: formData.assignToType, teamId: formData.assignToId as Id<"teams"> };
      }

      await createRule({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        priority: formData.priority,
        conditions: formData.conditions,
        assignTo,
        createdBy: currentUserId as Id<"users">,
      });

      success("Assignment rule created successfully!");
      resetForm();
    } catch (err: any) {
      showError(err.message || "Failed to create rule");
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;
    
    if (!formData.name.trim()) {
      showError("Rule name is required");
      return;
    }
    
    if (!formData.assignToId) {
      showError("Please select an assignment target");
      return;
    }

    try {
      let assignTo: AssignToType;
      
      if (formData.assignToType === "agent") {
        assignTo = { type: "agent", agentId: formData.assignToId as Id<"users"> };
      } else {
        assignTo = { type: formData.assignToType, teamId: formData.assignToId as Id<"teams"> };
      }

      await updateRule({
        id: editingRule,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        isActive: formData.isActive,
        priority: formData.priority,
        conditions: formData.conditions,
        assignTo,
      });

      success("Assignment rule updated successfully!");
      resetForm();
    } catch (err: any) {
      showError(err.message || "Failed to update rule");
    }
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule._id);
    setFormData({
      name: rule.name,
      description: rule.description || "",
      isActive: rule.isActive,
      priority: rule.priority,
      conditions: {
        categories: rule.conditions.categories || [],
        priorities: rule.conditions.priorities || [],
        types: rule.conditions.types || [],
      },
      assignToType: rule.assignTo.type,
      assignToId: rule.assignTo.type === "agent" ? rule.assignTo.agentId : rule.assignTo.teamId,
    });
    setShowCreateForm(true);
  };

  const handleDeleteRule = async (ruleId: Id<"assignmentRules">) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    
    try {
      await removeRule({ id: ruleId });
      success("Rule deleted successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to delete rule");
    }
  };

  const handleToggleActive = async (ruleId: Id<"assignmentRules">) => {
    try {
      await toggleActive({ id: ruleId });
      success("Rule status updated!");
    } catch (err: any) {
      showError(err.message || "Failed to update rule");
    }
  };

  const toggleCondition = (type: "categories" | "priorities" | "types", value: string) => {
    setFormData((prev) => {
      const current = prev.conditions[type];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      
      return {
        ...prev,
        conditions: {
          ...prev.conditions,
          [type]: updated,
        },
      };
    });
  };

  if (rules === undefined || currentUser === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">🔒</span>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">You need admin privileges to manage assignment rules.</p>
          <Link href="/dashboard">
            <Button variant="gradient">Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Auto-Assignment Rules</h1>
          <p className="text-sm text-slate-600">Configure automatic ticket assignment workflow</p>
        </div>
        {!showCreateForm && (
          <Button variant="gradient" onClick={() => setShowCreateForm(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Rule
          </Button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-slate-900">{stats?.total || 0}</div>
          <div className="text-xs text-slate-600">Total Rules</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
          <div className="text-xs text-slate-600">Active</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-slate-400">{stats?.inactive || 0}</div>
          <div className="text-xs text-slate-600">Inactive</div>
        </Card>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card padding="lg" className="border-2 border-blue-200 bg-blue-50/30">
          <h3 className="font-semibold text-slate-900 mb-4">
            {editingRule ? "Edit Assignment Rule" : "Create New Assignment Rule"}
          </h3>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Rule Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Critical Issues to Senior Team"
              />
              <Input
                label="Priority (lower = evaluated first)"
                type="number"
                min={1}
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
              />
            </div>
            
            <Input
              label="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this rule does..."
            />

            {/* Conditions */}
            <div className="space-y-4 p-4 bg-white rounded-lg border border-slate-200">
              <h4 className="font-medium text-slate-700 text-sm">Conditions (match any)</h4>
              
              {/* Categories */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Match Categories</label>
                <div className="flex flex-wrap gap-2">
                  {TICKET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCondition("categories", cat)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        formData.conditions.categories.includes(cat)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priorities */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Match Priorities</label>
                <div className="flex flex-wrap gap-2">
                  {TICKET_PRIORITIES.map((pri) => (
                    <button
                      key={pri}
                      onClick={() => toggleCondition("priorities", pri)}
                      className={`px-3 py-1.5 text-xs rounded-full border capitalize transition-colors ${
                        formData.conditions.priorities.includes(pri)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                      }`}
                    >
                      {pri}
                    </button>
                  ))}
                </div>
              </div>

              {/* Types */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Match Types</label>
                <div className="flex flex-wrap gap-2">
                  {TICKET_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleCondition("types", type)}
                      className={`px-3 py-1.5 text-xs rounded-full border capitalize transition-colors ${
                        formData.conditions.types.includes(type)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                      }`}
                    >
                      {type.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
              
              {formData.conditions.categories.length === 0 &&
                formData.conditions.priorities.length === 0 &&
                formData.conditions.types.length === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    No conditions = matches ALL tickets
                  </p>
                )}
            </div>

            {/* Assignment Target */}
            <div className="space-y-4 p-4 bg-white rounded-lg border border-slate-200">
              <h4 className="font-medium text-slate-700 text-sm">Assign To</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Assignment Type"
                  value={formData.assignToType}
                  onChange={(e) => setFormData({ ...formData, assignToType: e.target.value as any, assignToId: "" })}
                  options={[
                    { value: "agent", label: "Specific Agent" },
                    { value: "team", label: "Team (Leader First)" },
                    { value: "round_robin", label: "Team (Round Robin)" },
                  ]}
                />
                
                {formData.assignToType === "agent" ? (
                  <Select
                    label="Select Agent"
                    value={formData.assignToId}
                    onChange={(e) => setFormData({ ...formData, assignToId: e.target.value })}
                    options={[
                      { value: "", label: "Select an agent..." },
                      ...agents.map((a) => ({ value: a._id, label: `${a.name} (${a.email})` })),
                    ]}
                  />
                ) : (
                  <Select
                    label="Select Team"
                    value={formData.assignToId}
                    onChange={(e) => setFormData({ ...formData, assignToId: e.target.value })}
                    options={[
                      { value: "", label: "Select a team..." },
                      ...(teams?.map((t) => ({ value: t._id, label: `${t.name} (${t.memberCount} members)` })) || []),
                    ]}
                  />
                )}
              </div>
              
              {formData.assignToType === "round_robin" && (
                <p className="text-xs text-slate-500">
                  Round Robin assigns tickets to the team member with the fewest open tickets
                </p>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.isActive ? "bg-green-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    formData.isActive ? "left-7" : "left-1"
                  }`}
                />
              </button>
              <span className="text-sm text-slate-700">
                {formData.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="gradient" 
                onClick={editingRule ? handleUpdateRule : handleCreateRule}
              >
                {editingRule ? "Update Rule" : "Create Rule"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Rules List */}
      {rules && rules.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">
            Rules are evaluated in priority order (lowest first)
          </h3>
          
          {rules.map((rule, index) => (
            <Card key={rule._id} padding="none" className={`overflow-hidden ${!rule.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-4 p-4">
                {/* Priority Badge */}
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                  {rule.priority}
                </div>
                
                {/* Rule Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900">{rule.name}</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      rule.isActive 
                        ? "bg-green-100 text-green-700" 
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  
                  {rule.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{rule.description}</p>
                  )}
                  
                  {/* Conditions Summary */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {rule.conditions.categories?.map((cat: string) => (
                      <span key={cat} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                        {cat}
                      </span>
                    ))}
                    {rule.conditions.priorities?.map((pri: string) => (
                      <span key={pri} className="px-2 py-0.5 text-xs bg-orange-50 text-orange-700 rounded capitalize">
                        {pri}
                      </span>
                    ))}
                    {rule.conditions.types?.map((type: string) => (
                      <span key={type} className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded capitalize">
                        {type.replace("_", " ")}
                      </span>
                    ))}
                    {(!rule.conditions.categories?.length && 
                      !rule.conditions.priorities?.length && 
                      !rule.conditions.types?.length) && (
                      <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded">
                        All tickets
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignment Target */}
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    {rule.assignTo.type === "agent" && (
                      <span className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-lg">
                        👤 {rule.targetName}
                      </span>
                    )}
                    {rule.assignTo.type === "team" && (
                      <span className={`px-2 py-1 text-xs text-white rounded-lg ${rule.targetDetails?.teamColor || "bg-blue-500"}`}>
                        👥 {rule.targetName}
                      </span>
                    )}
                    {rule.assignTo.type === "round_robin" && (
                      <span className={`px-2 py-1 text-xs text-white rounded-lg ${rule.targetDetails?.teamColor || "bg-teal-500"}`}>
                        🔄 {rule.targetName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {rule.assignTo.type === "agent" && "Direct assignment"}
                    {rule.assignTo.type === "team" && "Team leader first"}
                    {rule.assignTo.type === "round_robin" && "Round robin"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(rule._id)}
                    className={`p-2 rounded-lg transition-colors ${
                      rule.isActive
                        ? "text-green-600 hover:bg-green-50"
                        : "text-slate-400 hover:bg-slate-100"
                    }`}
                    title={rule.isActive ? "Deactivate" : "Activate"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEditRule(rule)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule._id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg">
          <div className="text-center py-8">
            <span className="text-4xl mb-3 block">⚙️</span>
            <p className="text-slate-600">No assignment rules yet</p>
            <p className="text-sm text-slate-400 mt-1">Create rules to automatically assign tickets to agents or teams</p>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card padding="md" className="bg-slate-50">
        <h4 className="font-medium text-slate-700 mb-2">How Auto-Assignment Works</h4>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• Rules are evaluated in priority order (lowest number first)</li>
          <li>• The first matching rule assigns the ticket</li>
          <li>• "Round Robin" distributes tickets to team members with the fewest open tickets</li>
          <li>• Rules with no conditions will match all tickets</li>
        </ul>
      </Card>
    </div>
  );
}
