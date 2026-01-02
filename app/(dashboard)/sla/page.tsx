"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

const TICKET_PRIORITIES = ["low", "medium", "high", "critical"];
const TICKET_STATUSES = ["new", "in_progress", "on_hold", "resolved", "closed"];

export default function SLAPage() {
  const [activeTab, setActiveTab] = useState<"policies" | "escalations">("policies");
  
  const slaPolicies = useQuery(api.sla.getAll, {});
  const escalationRules = useQuery(api.sla.listEscalations, {});
  const teams = useQuery(api.teams.list, {});
  const users = useQuery(api.users.list, {});
  
  const createPolicy = useMutation(api.sla.create);
  const updatePolicy = useMutation(api.sla.update);
  const removePolicy = useMutation(api.sla.remove);
  const createEscalation = useMutation(api.sla.createEscalation);
  const updateEscalation = useMutation(api.sla.updateEscalation);
  const removeEscalation = useMutation(api.sla.removeEscalation);
  const toggleEscalationActive = useMutation(api.sla.toggleEscalationActive);
  
  const { success, error: showError } = useToastContext();
  
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<Id<"slaPolicies"> | null>(null);
  const [editingEscalationId, setEditingEscalationId] = useState<Id<"escalationRules"> | null>(null);
  
  const [policyFormData, setPolicyFormData] = useState({
    name: "",
    priority: "medium",
    responseTime: 60, // minutes
    resolutionTime: 240, // minutes
    enabled: true,
  });

  const [escalationFormData, setEscalationFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    priority: 1,
    conditions: {
      priorities: [] as string[],
      statuses: [] as string[],
      overdueBy: undefined as number | undefined,
    },
    actions: {
      notifyUsers: [] as string[],
      notifyTeams: [] as string[],
      reassignTo: { type: "none" as "agent" | "team" | "none" },
      reassignToId: "",
      changePriority: "",
      addComment: "",
    },
  });

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  const isAdmin = currentUser?.role === "admin";
  const agents = users?.filter((u) => u.role === "agent") || [];

  const resetPolicyForm = () => {
    setPolicyFormData({
      name: "",
      priority: "medium",
      responseTime: 60,
      resolutionTime: 240,
      enabled: true,
    });
    setEditingPolicyId(null);
    setShowPolicyForm(false);
  };

  const resetEscalationForm = () => {
    setEscalationFormData({
      name: "",
      description: "",
      isActive: true,
      priority: (escalationRules?.length || 0) + 1,
      conditions: {
        priorities: [],
        statuses: [],
        overdueBy: undefined,
      },
      actions: {
        notifyUsers: [],
        notifyTeams: [],
        reassignTo: { type: "none" },
        reassignToId: "",
        changePriority: "",
        addComment: "",
      },
    });
    setEditingEscalationId(null);
    setShowEscalationForm(false);
  };

  const handleCreatePolicy = async () => {
    if (!policyFormData.name.trim()) {
      showError("Policy name is required");
      return;
    }

    try {
      await createPolicy({
        name: policyFormData.name.trim(),
        priority: policyFormData.priority,
        responseTime: policyFormData.responseTime,
        resolutionTime: policyFormData.resolutionTime,
      });
      success("SLA policy created successfully!");
      resetPolicyForm();
    } catch (err: any) {
      showError(err.message || "Failed to create SLA policy");
    }
  };

  const handleUpdatePolicy = async () => {
    if (!editingPolicyId) return;
    if (!policyFormData.name.trim()) {
      showError("Policy name is required");
      return;
    }

    try {
      await updatePolicy({
        id: editingPolicyId,
        name: policyFormData.name.trim(),
        priority: policyFormData.priority,
        responseTime: policyFormData.responseTime,
        resolutionTime: policyFormData.resolutionTime,
        enabled: policyFormData.enabled,
      });
      success("SLA policy updated successfully!");
      resetPolicyForm();
    } catch (err: any) {
      showError(err.message || "Failed to update SLA policy");
    }
  };

  const handleDeletePolicy = async (id: Id<"slaPolicies">) => {
    if (!confirm("Are you sure you want to delete this SLA policy?")) return;
    
    try {
      await removePolicy({ id });
      success("SLA policy deleted!");
    } catch (err: any) {
      showError(err.message || "Failed to delete SLA policy");
    }
  };

  const handleEditPolicy = (policy: any) => {
    setEditingPolicyId(policy._id);
    setPolicyFormData({
      name: policy.name,
      priority: policy.priority,
      responseTime: policy.responseTime,
      resolutionTime: policy.resolutionTime,
      enabled: policy.enabled,
    });
    setShowPolicyForm(true);
  };

  const handleCreateEscalation = async () => {
    if (!escalationFormData.name.trim()) {
      showError("Escalation rule name is required");
      return;
    }
    if (!currentUserId) {
      showError("You must be logged in");
      return;
    }

    // Validate reassignment
    if (escalationFormData.actions.reassignTo.type === "agent" && !escalationFormData.actions.reassignToId) {
      showError("Please select an agent for reassignment");
      return;
    }
    if (escalationFormData.actions.reassignTo.type === "team" && !escalationFormData.actions.reassignToId) {
      showError("Please select a team for reassignment");
      return;
    }

    try {
      let reassignTo: any;
      if (escalationFormData.actions.reassignTo.type === "agent") {
        reassignTo = { type: "agent", agentId: escalationFormData.actions.reassignToId as Id<"users"> };
      } else if (escalationFormData.actions.reassignTo.type === "team") {
        reassignTo = { type: "team", teamId: escalationFormData.actions.reassignToId as Id<"teams"> };
      } else {
        reassignTo = { type: "none" };
      }

      await createEscalation({
        name: escalationFormData.name.trim(),
        description: escalationFormData.description.trim() || undefined,
        isActive: escalationFormData.isActive,
        priority: escalationFormData.priority,
        conditions: {
          priorities: escalationFormData.conditions.priorities.length > 0 ? escalationFormData.conditions.priorities : undefined,
          statuses: escalationFormData.conditions.statuses.length > 0 ? escalationFormData.conditions.statuses : undefined,
          overdueBy: escalationFormData.conditions.overdueBy,
        },
        actions: {
          notifyUsers: escalationFormData.actions.notifyUsers.length > 0 ? escalationFormData.actions.notifyUsers.map(id => id as Id<"users">) : undefined,
          notifyTeams: escalationFormData.actions.notifyTeams.length > 0 ? escalationFormData.actions.notifyTeams.map(id => id as Id<"teams">) : undefined,
          reassignTo,
          changePriority: escalationFormData.actions.changePriority || undefined,
          addComment: escalationFormData.actions.addComment || undefined,
        },
        createdBy: currentUserId as Id<"users">,
      });
      success("Escalation rule created successfully!");
      resetEscalationForm();
    } catch (err: any) {
      showError(err.message || "Failed to create escalation rule");
    }
  };

  const handleUpdateEscalation = async () => {
    if (!editingEscalationId) return;
    if (!escalationFormData.name.trim()) {
      showError("Escalation rule name is required");
      return;
    }

    // Validate reassignment
    if (escalationFormData.actions.reassignTo.type === "agent" && !escalationFormData.actions.reassignToId) {
      showError("Please select an agent for reassignment");
      return;
    }
    if (escalationFormData.actions.reassignTo.type === "team" && !escalationFormData.actions.reassignToId) {
      showError("Please select a team for reassignment");
      return;
    }

    try {
      let reassignTo: any;
      if (escalationFormData.actions.reassignTo.type === "agent") {
        reassignTo = { type: "agent", agentId: escalationFormData.actions.reassignToId as Id<"users"> };
      } else if (escalationFormData.actions.reassignTo.type === "team") {
        reassignTo = { type: "team", teamId: escalationFormData.actions.reassignToId as Id<"teams"> };
      } else {
        reassignTo = { type: "none" };
      }

      await updateEscalation({
        id: editingEscalationId,
        name: escalationFormData.name.trim(),
        description: escalationFormData.description.trim() || undefined,
        isActive: escalationFormData.isActive,
        priority: escalationFormData.priority,
        conditions: {
          priorities: escalationFormData.conditions.priorities.length > 0 ? escalationFormData.conditions.priorities : undefined,
          statuses: escalationFormData.conditions.statuses.length > 0 ? escalationFormData.conditions.statuses : undefined,
          overdueBy: escalationFormData.conditions.overdueBy,
        },
        actions: {
          notifyUsers: escalationFormData.actions.notifyUsers.length > 0 ? escalationFormData.actions.notifyUsers.map(id => id as Id<"users">) : undefined,
          notifyTeams: escalationFormData.actions.notifyTeams.length > 0 ? escalationFormData.actions.notifyTeams.map(id => id as Id<"teams">) : undefined,
          reassignTo,
          changePriority: escalationFormData.actions.changePriority || undefined,
          addComment: escalationFormData.actions.addComment || undefined,
        },
      });
      success("Escalation rule updated successfully!");
      resetEscalationForm();
    } catch (err: any) {
      showError(err.message || "Failed to update escalation rule");
    }
  };

  const handleDeleteEscalation = async (id: Id<"escalationRules">) => {
    if (!confirm("Are you sure you want to delete this escalation rule?")) return;
    
    try {
      await removeEscalation({ id });
      success("Escalation rule deleted!");
    } catch (err: any) {
      showError(err.message || "Failed to delete escalation rule");
    }
  };

  const handleEditEscalation = (rule: any) => {
    setEditingEscalationId(rule._id);
    setEscalationFormData({
      name: rule.name,
      description: rule.description || "",
      isActive: rule.isActive,
      priority: rule.priority,
      conditions: {
        priorities: rule.conditions.priorities || [],
        statuses: rule.conditions.statuses || [],
        overdueBy: rule.conditions.overdueBy,
      },
      actions: {
        notifyUsers: rule.actions.notifyUsers?.map((id: Id<"users">) => id) || [],
        notifyTeams: rule.actions.notifyTeams?.map((id: Id<"teams">) => id) || [],
        reassignTo: rule.actions.reassignTo?.type === "agent" 
          ? { type: "agent" as const }
          : rule.actions.reassignTo?.type === "team"
          ? { type: "team" as const }
          : { type: "none" as const },
        reassignToId: rule.actions.reassignTo?.type === "agent"
          ? rule.actions.reassignTo.agentId
          : rule.actions.reassignTo?.type === "team"
          ? rule.actions.reassignTo.teamId
          : "",
        changePriority: rule.actions.changePriority || "",
        addComment: rule.actions.addComment || "",
      },
    });
    setShowEscalationForm(true);
  };

  const handleToggleEscalation = async (id: Id<"escalationRules">) => {
    try {
      await toggleEscalationActive({ id });
      success("Escalation rule status updated!");
    } catch (err: any) {
      showError(err.message || "Failed to update escalation rule");
    }
  };

  // Format time in minutes to human readable
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  if (slaPolicies === undefined || escalationRules === undefined || currentUser === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">🔒</span>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">You need admin privileges to manage SLA configuration.</p>
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
          <h1 className="text-2xl font-bold text-slate-900">SLA Configuration</h1>
          <p className="text-sm text-slate-600">
            Manage Service Level Agreements and Escalation Rules
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("policies")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "policies"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            SLA Policies
          </button>
          <button
            onClick={() => setActiveTab("escalations")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "escalations"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Escalation Rules
          </button>
        </div>
      </div>

      {/* SLA Policies Tab */}
      {activeTab === "policies" && (
        <>
          {!showPolicyForm && (
            <div className="flex justify-end">
              <Button variant="gradient" onClick={() => setShowPolicyForm(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create SLA Policy
              </Button>
            </div>
          )}

          {/* Create/Edit Policy Form */}
          {showPolicyForm && (
            <Card padding="lg" className="border-2 border-blue-200 bg-blue-50/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 text-lg">
                  {editingPolicyId ? "Edit SLA Policy" : "Create New SLA Policy"}
                </h3>
                <button
                  onClick={resetPolicyForm}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <Input
                  label="Policy Name"
                  value={policyFormData.name}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, name: e.target.value })}
                  placeholder="e.g., Standard Support SLA"
                />
                
                <Select
                  label="Priority Level"
                  value={policyFormData.priority}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, priority: e.target.value })}
                  options={TICKET_PRIORITIES.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Response Time (minutes)"
                    type="number"
                    min={1}
                    value={policyFormData.responseTime}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, responseTime: parseInt(e.target.value) || 0 })}
                  />
                  <Input
                    label="Resolution Time (minutes)"
                    type="number"
                    min={1}
                    value={policyFormData.resolutionTime}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, resolutionTime: parseInt(e.target.value) || 0 })}
                  />
                </div>

                {editingPolicyId && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPolicyFormData({ ...policyFormData, enabled: !policyFormData.enabled })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        policyFormData.enabled ? "bg-green-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          policyFormData.enabled ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                    <span className="text-sm text-slate-700">
                      {policyFormData.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="gradient" 
                    onClick={editingPolicyId ? handleUpdatePolicy : handleCreatePolicy}
                  >
                    {editingPolicyId ? "Update Policy" : "Create Policy"}
                  </Button>
                  <Button variant="outline" onClick={resetPolicyForm}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          {/* Policies List */}
          {slaPolicies && slaPolicies.length > 0 ? (
            <div className="space-y-3">
              {slaPolicies.map((policy) => (
                <Card key={policy._id} padding="none" className={`overflow-hidden ${!policy.enabled ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-4 p-4">
                    <div className={`w-2 h-full min-h-[80px] rounded-full ${
                      policy.enabled ? "bg-green-500" : "bg-slate-300"
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900">{policy.name}</h4>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          policy.enabled 
                            ? "bg-green-100 text-green-700" 
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {policy.enabled ? "Active" : "Inactive"}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full capitalize">
                          Priority: {policy.priority}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-slate-500">Response Time</p>
                          <p className="text-sm font-medium text-slate-900">{formatTime(policy.responseTime)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Resolution Time</p>
                          <p className="text-sm font-medium text-slate-900">{formatTime(policy.resolutionTime)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Created</p>
                          <p className="text-sm text-slate-600">
                            {new Date(policy.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditPolicy(policy)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeletePolicy(policy._id)}
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
                <span className="text-4xl mb-3 block">⏱️</span>
                <p className="text-slate-600">No SLA policies yet</p>
                <p className="text-sm text-slate-400 mt-1">Create your first SLA policy to define service level agreements</p>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Escalation Rules Tab */}
      {activeTab === "escalations" && (
        <>
          {!showEscalationForm && (
            <div className="flex justify-end">
              <Button variant="gradient" onClick={() => setShowEscalationForm(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Escalation Rule
              </Button>
            </div>
          )}

          {/* Create/Edit Escalation Form */}
          {showEscalationForm && (
            <Card padding="lg" className="border-2 border-orange-200 bg-orange-50/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 text-lg">
                  {editingEscalationId ? "Edit Escalation Rule" : "Create New Escalation Rule"}
                </h3>
                <button
                  onClick={resetEscalationForm}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <Input
                  label="Rule Name"
                  value={escalationFormData.name}
                  onChange={(e) => setEscalationFormData({ ...escalationFormData, name: e.target.value })}
                  placeholder="e.g., Critical Ticket Escalation"
                />
                
                <Textarea
                  label="Description"
                  value={escalationFormData.description}
                  onChange={(e) => setEscalationFormData({ ...escalationFormData, description: e.target.value })}
                  placeholder="Describe when this rule should trigger..."
                  rows={2}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Priority (lower = higher priority)"
                    type="number"
                    min={1}
                    value={escalationFormData.priority}
                    onChange={(e) => setEscalationFormData({ ...escalationFormData, priority: parseInt(e.target.value) || 1 })}
                  />
                  <div className="flex items-center gap-3 pt-6">
                    <button
                      onClick={() => setEscalationFormData({ ...escalationFormData, isActive: !escalationFormData.isActive })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        escalationFormData.isActive ? "bg-green-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          escalationFormData.isActive ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                    <span className="text-sm text-slate-700">
                      {escalationFormData.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Conditions */}
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="font-medium text-slate-900 mb-3">Conditions</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Priorities (leave empty for all)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TICKET_PRIORITIES.map((priority) => (
                          <label key={priority} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={escalationFormData.conditions.priorities.includes(priority)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEscalationFormData({
                                    ...escalationFormData,
                                    conditions: {
                                      ...escalationFormData.conditions,
                                      priorities: [...escalationFormData.conditions.priorities, priority],
                                    },
                                  });
                                } else {
                                  setEscalationFormData({
                                    ...escalationFormData,
                                    conditions: {
                                      ...escalationFormData.conditions,
                                      priorities: escalationFormData.conditions.priorities.filter(p => p !== priority),
                                    },
                                  });
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700 capitalize">{priority}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Statuses (leave empty for all)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TICKET_STATUSES.map((status) => (
                          <label key={status} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={escalationFormData.conditions.statuses.includes(status)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEscalationFormData({
                                    ...escalationFormData,
                                    conditions: {
                                      ...escalationFormData.conditions,
                                      statuses: [...escalationFormData.conditions.statuses, status],
                                    },
                                  });
                                } else {
                                  setEscalationFormData({
                                    ...escalationFormData,
                                    conditions: {
                                      ...escalationFormData.conditions,
                                      statuses: escalationFormData.conditions.statuses.filter(s => s !== status),
                                    },
                                  });
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700 capitalize">{status.replace("_", " ")}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <Input
                      label="Overdue By (minutes) - Optional"
                      type="number"
                      min={0}
                      value={escalationFormData.conditions.overdueBy || ""}
                      onChange={(e) => setEscalationFormData({
                        ...escalationFormData,
                        conditions: {
                          ...escalationFormData.conditions,
                          overdueBy: e.target.value ? parseInt(e.target.value) : undefined,
                        },
                      })}
                      placeholder="e.g., 60"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="font-medium text-slate-900 mb-3">Actions</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Notify Users
                      </label>
                      <select
                        multiple
                        value={escalationFormData.actions.notifyUsers}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          setEscalationFormData({
                            ...escalationFormData,
                            actions: { ...escalationFormData.actions, notifyUsers: selected },
                          });
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        size={4}
                      >
                        {users?.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Notify Teams
                      </label>
                      <select
                        multiple
                        value={escalationFormData.actions.notifyTeams}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          setEscalationFormData({
                            ...escalationFormData,
                            actions: { ...escalationFormData.actions, notifyTeams: selected },
                          });
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        size={3}
                      >
                        {teams?.map((team) => (
                          <option key={team._id} value={team._id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Reassign To
                      </label>
                      <Select
                        value={escalationFormData.actions.reassignTo.type}
                        onChange={(e) => setEscalationFormData({
                          ...escalationFormData,
                          actions: {
                            ...escalationFormData.actions,
                            reassignTo: { type: e.target.value as "agent" | "team" | "none" },
                            reassignToId: "",
                          },
                        })}
                        options={[
                          { value: "none", label: "Don't Reassign" },
                          { value: "agent", label: "Agent" },
                          { value: "team", label: "Team" },
                        ]}
                      />
                      
                      {escalationFormData.actions.reassignTo.type === "agent" && (
                        <Select
                          label="Select Agent"
                          value={escalationFormData.actions.reassignToId}
                          onChange={(e) => setEscalationFormData({
                            ...escalationFormData,
                            actions: { ...escalationFormData.actions, reassignToId: e.target.value },
                          })}
                          options={agents.map((agent) => ({ value: agent._id, label: agent.name }))}
                        />
                      )}
                      
                      {escalationFormData.actions.reassignTo.type === "team" && (
                        <Select
                          label="Select Team"
                          value={escalationFormData.actions.reassignToId}
                          onChange={(e) => setEscalationFormData({
                            ...escalationFormData,
                            actions: { ...escalationFormData.actions, reassignToId: e.target.value },
                          })}
                          options={teams?.map((team) => ({ value: team._id, label: team.name })) || []}
                        />
                      )}
                    </div>

                    <Select
                      label="Change Priority To (Optional)"
                      value={escalationFormData.actions.changePriority}
                      onChange={(e) => setEscalationFormData({
                        ...escalationFormData,
                        actions: { ...escalationFormData.actions, changePriority: e.target.value },
                      })}
                      options={[
                        { value: "", label: "Don't Change" },
                        ...TICKET_PRIORITIES.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) })),
                      ]}
                    />

                    <Textarea
                      label="Auto Comment (Optional)"
                      value={escalationFormData.actions.addComment}
                      onChange={(e) => setEscalationFormData({
                        ...escalationFormData,
                        actions: { ...escalationFormData.actions, addComment: e.target.value },
                      })}
                      placeholder="Comment to automatically add when rule triggers..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="gradient" 
                    onClick={editingEscalationId ? handleUpdateEscalation : handleCreateEscalation}
                  >
                    {editingEscalationId ? "Update Rule" : "Create Rule"}
                  </Button>
                  <Button variant="outline" onClick={resetEscalationForm}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          {/* Escalation Rules List */}
          {escalationRules && escalationRules.length > 0 ? (
            <div className="space-y-3">
              {escalationRules
                .sort((a, b) => a.priority - b.priority)
                .map((rule) => (
                <Card key={rule._id} padding="none" className={`overflow-hidden ${!rule.isActive ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-4 p-4">
                    <div className={`w-2 h-full min-h-[80px] rounded-full ${
                      rule.isActive ? "bg-orange-500" : "bg-slate-300"
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900">{rule.name}</h4>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          rule.isActive 
                            ? "bg-orange-100 text-orange-700" 
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                          Priority: {rule.priority}
                        </span>
                      </div>
                      
                      {rule.description && (
                        <p className="text-sm text-slate-600 mt-1">{rule.description}</p>
                      )}
                      
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Conditions:</p>
                          <div className="flex flex-wrap gap-2">
                            {rule.conditions.priorities && rule.conditions.priorities.length > 0 && (
                              <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                                Priorities: {rule.conditions.priorities.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}
                              </span>
                            )}
                            {rule.conditions.statuses && rule.conditions.statuses.length > 0 && (
                              <span className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded">
                                Statuses: {rule.conditions.statuses.map(s => s.replace("_", " ")).join(", ")}
                              </span>
                            )}
                            {rule.conditions.overdueBy && (
                              <span className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded">
                                Overdue by: {formatTime(rule.conditions.overdueBy)}
                              </span>
                            )}
                            {(!rule.conditions.priorities || rule.conditions.priorities.length === 0) &&
                             (!rule.conditions.statuses || rule.conditions.statuses.length === 0) &&
                             !rule.conditions.overdueBy && (
                              <span className="text-xs text-slate-400">No specific conditions</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Actions:</p>
                          <div className="flex flex-wrap gap-2">
                            {rule.actions.notifyUsers && rule.actions.notifyUsers.length > 0 && (
                              <span className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded">
                                Notify {rule.actions.notifyUsers.length} user(s)
                              </span>
                            )}
                            {rule.actions.notifyTeams && rule.actions.notifyTeams.length > 0 && (
                              <span className="px-2 py-1 text-xs bg-teal-50 text-teal-700 rounded">
                                Notify {rule.actions.notifyTeams.length} team(s)
                              </span>
                            )}
                            {rule.actions.reassignTo?.type !== "none" && (
                              <span className="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded">
                                Reassign to {rule.actions.reassignTo.type}
                              </span>
                            )}
                            {rule.actions.changePriority && (
                              <span className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded">
                                Change priority to {rule.actions.changePriority}
                              </span>
                            )}
                            {rule.actions.addComment && (
                              <span className="px-2 py-1 text-xs bg-slate-50 text-slate-700 rounded">
                                Add comment
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleEscalation(rule._id)}
                        className={`p-2 rounded-lg transition-colors ${
                          rule.isActive
                            ? "text-orange-600 hover:bg-orange-50"
                            : "text-slate-400 hover:bg-slate-100"
                        }`}
                        title={rule.isActive ? "Deactivate" : "Activate"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditEscalation(rule)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteEscalation(rule._id)}
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
                <span className="text-4xl mb-3 block">🚨</span>
                <p className="text-slate-600">No escalation rules yet</p>
                <p className="text-sm text-slate-400 mt-1">Create your first escalation rule to automate ticket escalation</p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
