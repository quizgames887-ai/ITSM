"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/ui/EmptyState";

export default function FormsPage() {
  const router = useRouter();
  const forms = useQuery(api.forms.list, {});
  const services = useQuery(api.serviceCatalog.list, { activeOnly: false });
  const deleteForm = useMutation(api.forms.deleteForm);
  const createTicketForm = useMutation(api.forms.createTicketForm);
  const createServiceRequestForm = useMutation(api.forms.createServiceRequestForm);
  const { success, error: showError } = useToastContext();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creatingTicketForm, setCreatingTicketForm] = useState(false);
  const [creatingServiceRequestForm, setCreatingServiceRequestForm] = useState(false);

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  
  // Fetch current user directly to check admin status
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  // Check if current user is admin or agent
  const isAdmin = currentUser?.role === "admin";
  const isAgentOrAdmin = currentUser?.role === "admin" || currentUser?.role === "agent";

  const handleDelete = async (id: Id<"forms">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this form?")) return;

    setDeletingId(id);
    try {
      await deleteForm({ id });
      success("Form deleted successfully");
    } catch (err: any) {
      showError(err.message || "Failed to delete form");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (id: Id<"forms">, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/forms/${id}/design`);
  };

  const handleCreateTicketForm = async () => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) {
      showError("You must be logged in to create a form");
      return;
    }

    setCreatingTicketForm(true);
    try {
      const formId = await createTicketForm({
        createdBy: userId as Id<"users">,
      });
      success("Ticket form created successfully! 🎉");
      setTimeout(() => {
        router.push(`/forms/${formId}/design`);
      }, 500);
    } catch (err: any) {
      if (err.message.includes("already exists")) {
        showError("Ticket form already exists. Please refresh the page.");
      } else {
        showError(err.message || "Failed to create ticket form");
      }
    } finally {
      setCreatingTicketForm(false);
    }
  };

  const handleCreateServiceRequestForm = async () => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) {
      showError("You must be logged in to create a form");
      return;
    }

    setCreatingServiceRequestForm(true);
    try {
      const formId = await createServiceRequestForm({
        createdBy: userId as Id<"users">,
      });
      success("Service Request form created successfully! 🎉");
      setTimeout(() => {
        router.push(`/forms/${formId}/design`);
      }, 500);
    } catch (err: any) {
      if (err.message.includes("already exists")) {
        showError("Service Request form already exists. Please refresh the page.");
      } else {
        showError(err.message || "Failed to create service request form");
      }
    } finally {
      setCreatingServiceRequestForm(false);
    }
  };

  // Find ticket form (case-insensitive match)
  const ticketForm = forms?.find(
    (form) => form.name.toLowerCase().includes("ticket")
  );

  // Find service request form (case-insensitive match)
  const serviceRequestForm = forms?.find(
    (form) => form.name.toLowerCase().includes("service request")
  );

  // Create a map of formId to service for quick lookup
  const formToServiceMap = useMemo(() => {
    if (!services || !forms) return new Map();
    const map = new Map();
    services.forEach((service) => {
      if (service.formId) {
        map.set(service.formId, service);
      }
    });
    return map;
  }, [services, forms]);

  // Calculate statistics
  const totalForms = forms?.length || 0;
  const activeForms = forms?.filter(f => f.isActive).length || 0;
  const serviceForms = forms?.filter(f => formToServiceMap.has(f._id)).length || 0;
  const customForms = forms?.filter(f => 
    !f.name.toLowerCase().includes("ticket") && 
    !f.name.toLowerCase().includes("service request") &&
    !formToServiceMap.has(f._id)
  ).length || 0;

  // Wait for both queries to load before checking admin status
  if (forms === undefined || services === undefined || (currentUserId && currentUser === undefined)) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Only show access denied if we've confirmed the user is not an admin
  if (!isAdmin && currentUser !== undefined) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Access Denied
              </h2>
              <p className="text-slate-600 mb-4">
                You need admin privileges to access this page.
              </p>
              <Link href="/workplace">
                <Button>Back to Dashboard</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent">
                    Forms Management
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 mt-1">
                    Create, customize, and manage your forms
                  </p>
                </div>
              </div>
            </div>
            {/* Only show Create New Form button to admins and agents */}
            {currentUser && isAgentOrAdmin && (
              <Link href="/forms/new" className="w-full sm:w-auto">
                <Button variant="gradient" size="lg" className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Create New Form</span>
                  <span className="sm:hidden">New Form</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Statistics Cards */}
          {forms && forms.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <Card padding="md" className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Forms</p>
                    <p className="text-2xl font-bold text-slate-900">{totalForms}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </Card>
              <Card padding="md" className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Active Forms</p>
                    <p className="text-2xl font-bold text-slate-900">{activeForms}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>
              <Card padding="md" className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Service Forms</p>
                    <p className="text-2xl font-bold text-slate-900">{serviceForms}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </Card>
              <Card padding="md" className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Custom Forms</p>
                    <p className="text-2xl font-bold text-slate-900">{customForms}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {forms.length === 0 ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4">
                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Get Started with Forms</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Create your first form to start collecting data. Choose from our pre-built templates or create a custom form from scratch.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card hover padding="lg" className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <svg
                      className="w-8 h-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Ticket Form
                  </h3>
                  <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
                    Initialize the default ticket form with standard fields (Title, Description, Type, Priority, Urgency, Category). You can customize it later.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Title</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Description</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Type</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Priority</span>
                  </div>
                  <Button
                    variant="gradient"
                    onClick={handleCreateTicketForm}
                    disabled={creatingTicketForm}
                    size="lg"
                    className="w-full shadow-md hover:shadow-lg transition-shadow"
                  >
                    {creatingTicketForm ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Ticket Form
                      </>
                    )}
                  </Button>
                </div>
              </Card>
              
              <Card hover padding="lg" className="bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Service Request Form
                  </h3>
                  <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
                    Initialize the default service request form with standard fields (Title, Description, Service Type, Priority, Urgency, Requested Date). You can customize it later.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Title</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Service Type</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Priority</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Date</span>
                  </div>
                  <Button
                    variant="gradient"
                    onClick={handleCreateServiceRequestForm}
                    disabled={creatingServiceRequestForm}
                    size="lg"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-shadow"
                  >
                    {creatingServiceRequestForm ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Service Request Form
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
            {/* Only show create custom form option to admins and agents */}
            {currentUser && isAgentOrAdmin && (
              <Card hover padding="lg">
                <EmptyState
                  icon={
                    <svg
                      className="w-12 h-12 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  }
                  title="Or create a custom form"
                  description="Create custom forms to collect data, gather feedback, or build surveys. Design forms with drag-and-drop fields."
                  action={{
                    label: "Create custom form",
                    href: "/forms/new",
                  }}
                />
              </Card>
            )}
          </div>
        ) : !ticketForm ? (
          <>
            <Card hover padding="lg" className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
              <div className="text-center py-6">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Ticket Form Not Found
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Create the default ticket form with standard fields (Title, Description, Type, Priority, Urgency, Category).
                </p>
                <Button
                  variant="gradient"
                  onClick={handleCreateTicketForm}
                  disabled={creatingTicketForm}
                >
                  {creatingTicketForm ? "Creating..." : "Create Ticket Form"}
                </Button>
              </div>
            </Card>
            {!serviceRequestForm && (
              <Card hover padding="lg" className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                <div className="text-center py-6">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Service Request Form Not Found
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Create the default service request form with standard fields (Title, Description, Service Type, Priority, Urgency, Requested Date).
                  </p>
                  <Button
                    variant="gradient"
                    onClick={handleCreateServiceRequestForm}
                    disabled={creatingServiceRequestForm}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    {creatingServiceRequestForm ? "Creating..." : "Create Service Request Form"}
                  </Button>
                </div>
              </Card>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {forms.map((form, index) => {
                const isTicketForm = form.name.toLowerCase().includes("ticket");
                const isServiceRequestForm = form.name.toLowerCase().includes("service request");
                const associatedService = formToServiceMap.get(form._id);
                const isServiceForm = associatedService !== undefined;
                return (
                  <Card
                    key={form._id}
                    hover
                    padding="lg"
                    className={`animate-fade-in cursor-pointer ${
                      isTicketForm ? "ring-2 ring-blue-300" : isServiceRequestForm ? "ring-2 ring-green-300" : isServiceForm ? "ring-2 ring-orange-300" : ""
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => router.push(`/forms/${form._id}/design`)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-xl font-semibold text-slate-900">
                            {form.name}
                          </h3>
                          {isTicketForm && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Ticket
                            </span>
                          )}
                          {isServiceRequestForm && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Service Request
                            </span>
                          )}
                          {isServiceForm && associatedService && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              {associatedService.name}
                            </span>
                          )}
                        </div>
                        {form.description && (
                          <p className="text-sm text-slate-600 mb-3">
                            {form.description}
                          </p>
                        )}
                        {isServiceForm && associatedService && (
                          <div className="flex items-center gap-2 mt-2">
                            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="text-xs text-slate-600">
                              Service: <span className="font-semibold text-orange-600">{associatedService.name}</span>
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => handleEdit(form._id, e)}
                          className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="Edit form"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDelete(form._id, e)}
                          disabled={deletingId === form._id}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Delete form"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          form.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {form.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="text-slate-500">
                        {new Date(form.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Quick access to Ticket Form - Administration Section */}
            {ticketForm && (
              <Card
                padding="lg"
                className="mb-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-200 shadow-lg"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            Ticket Form Administration
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                              Active
                            </span>
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">
                            {ticketForm.description || "Manage ticket creation fields and settings"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="font-medium text-slate-700">Add Fields</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="font-medium text-slate-700">Remove Fields</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          <span className="font-medium text-slate-700">Reorder</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="font-medium text-slate-700">Edit Fields</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="gradient"
                      onClick={() => router.push(`/forms/${ticketForm._id}/design`)}
                      className="w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow"
                      size="lg"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Manage Form
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Quick access to Service Request Form - Administration Section */}
            {serviceRequestForm ? (
              <Card
                padding="lg"
                className="mb-6 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 border-2 border-green-200 shadow-lg"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            Service Request Form Administration
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                              Active
                            </span>
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">
                            {serviceRequestForm.description || "Manage service request creation fields and settings"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="font-medium text-slate-700">Add Fields</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="font-medium text-slate-700">Remove Fields</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          <span className="font-medium text-slate-700">Reorder</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="font-medium text-slate-700">Edit Fields</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="gradient"
                      onClick={() => router.push(`/forms/${serviceRequestForm._id}/design`)}
                      className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-shadow"
                      size="lg"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Manage Form
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card hover padding="lg" className="mb-6 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 border-2 border-green-200 shadow-lg hover:shadow-xl transition-all">
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    Service Request Form Not Found
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Create the default service request form with standard fields (Title, Description, Service Type, Priority, Urgency, Requested Date).
                  </p>
                  <Button
                    variant="gradient"
                    onClick={handleCreateServiceRequestForm}
                    disabled={creatingServiceRequestForm}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg"
                  >
                    {creatingServiceRequestForm ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Service Request Form
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}

            {/* Forms Grid */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  All Forms ({totalForms})
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {forms.map((form, index) => {
                  const isTicketForm = form.name.toLowerCase().includes("ticket");
                  const isServiceRequestForm = form.name.toLowerCase().includes("service request");
                  const associatedService = formToServiceMap.get(form._id);
                  const isServiceForm = associatedService !== undefined;
                  const formTypeColor = isTicketForm 
                    ? "from-blue-500 to-indigo-600" 
                    : isServiceRequestForm 
                    ? "from-green-500 to-emerald-600" 
                    : isServiceForm
                    ? "from-orange-500 to-amber-600"
                    : "from-purple-500 to-pink-600";
                  
                  return (
                    <Card
                      key={form._id}
                      hover
                      padding="lg"
                      className={`animate-fade-in cursor-pointer group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                        isTicketForm ? "ring-2 ring-blue-300 shadow-lg" : isServiceRequestForm ? "ring-2 ring-green-300 shadow-lg" : "shadow-md hover:shadow-lg"
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => router.push(`/forms/${form._id}/design`)}
                    >
                      {/* Gradient Accent Bar */}
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${formTypeColor}`}></div>
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`p-2 bg-gradient-to-br ${formTypeColor} rounded-lg flex-shrink-0`}>
                              <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h3 className="text-lg font-bold text-slate-900 truncate">
                                  {form.name}
                                </h3>
                                {isTicketForm && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                    Ticket
                                  </span>
                                )}
                          {isServiceRequestForm && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                              Service Request
                            </span>
                          )}
                          {isServiceForm && associatedService && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                              {associatedService.name}
                            </span>
                          )}
                        </div>
                              {form.description && (
                                <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                                  {form.description}
                                </p>
                              )}
                              {isServiceForm && associatedService && (
                                <div className="flex items-center gap-2 mt-2">
                                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  <span className="text-xs text-slate-600">
                                    Service: <span className="font-semibold text-orange-600">{associatedService.name}</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          <button
                            onClick={(e) => handleEdit(form._id, e)}
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 group-hover:scale-110"
                            title="Edit form"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDelete(form._id, e)}
                            disabled={deletingId === form._id}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 group-hover:scale-110 disabled:opacity-50"
                            title="Delete form"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              form.isActive
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {form.isActive ? (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Active
                              </span>
                            ) : (
                              "Inactive"
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{new Date(form.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
