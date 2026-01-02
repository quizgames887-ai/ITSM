"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

const COLOR_OPTIONS = [
  { value: "bg-blue-100", label: "Blue" },
  { value: "bg-red-100", label: "Red/Pink" },
  { value: "bg-amber-100", label: "Amber/Yellow" },
  { value: "bg-green-100", label: "Green" },
  { value: "bg-purple-100", label: "Purple" },
  { value: "bg-orange-100", label: "Orange" },
  { value: "bg-yellow-100", label: "Yellow" },
  { value: "bg-cyan-100", label: "Cyan" },
  { value: "bg-indigo-100", label: "Indigo" },
  { value: "bg-pink-100", label: "Pink" },
  { value: "bg-teal-100", label: "Teal" },
  { value: "bg-slate-100", label: "Slate/Gray" },
];

// Helper to normalize logoId (handle cases where it might be a string)
function normalizeLogoId(logoId: any): Id<"_storage"> | null {
  if (!logoId) return null;
  if (typeof logoId === "string") {
    try {
      // Try to parse if it's a JSON string
      const parsed = JSON.parse(logoId);
      if (typeof parsed === "object" && parsed.storageId) {
        return parsed.storageId as Id<"_storage">;
      }
      return parsed as Id<"_storage">;
    } catch {
      // If not JSON, treat as direct storage ID
      return logoId as Id<"_storage">;
    }
  }
  return logoId as Id<"_storage">;
}

// Component to handle service logo display with storage URL
function ServiceLogo({ service }: { service: any }) {
  const normalizedLogoId = normalizeLogoId(service.logoId);
  const logoUrl = useQuery(
    api.serviceCatalog.getStorageUrl,
    normalizedLogoId ? { storageId: normalizedLogoId } : "skip"
  );

  return (
    <div className={`w-12 h-12 ${service.color} rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden`}>
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={service.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{service.icon}</span>
      )}
    </div>
  );
}

// Component to load logo preview for form
function LogoPreviewLoader({ logoId, onLoad }: { logoId: Id<"_storage"> | null; onLoad: (url: string | null) => void }) {
  const normalizedLogoId = normalizeLogoId(logoId);
  const logoUrl = useQuery(
    api.serviceCatalog.getStorageUrl,
    normalizedLogoId ? { storageId: normalizedLogoId } : "skip"
  );

  useEffect(() => {
    if (logoUrl !== undefined) {
      onLoad(logoUrl);
    }
  }, [logoUrl, onLoad]);

  return null;
}

export default function ServiceCatalogPage() {
  const services = useQuery(api.serviceCatalog.list, { activeOnly: false });
  
  const createService = useMutation(api.serviceCatalog.create);
  const updateService = useMutation(api.serviceCatalog.update);
  const removeService = useMutation(api.serviceCatalog.remove);
  const toggleActive = useMutation(api.serviceCatalog.toggleActive);
  const generateUploadUrl = useMutation(api.serviceCatalog.generateUploadUrl);
  
  const { success, error: showError } = useToastContext();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"serviceCatalog"> | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    icon: "💻",
    color: "bg-blue-100",
    rating: 4.0,
    description: "",
    isActive: true,
    order: 1,
    logoId: null as Id<"_storage"> | null,
  });

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  const isAdmin = currentUser?.role === "admin";

  const resetForm = () => {
    setFormData({
      name: "",
      icon: "💻",
      color: "bg-blue-100",
      rating: 4.0,
      description: "",
      isActive: true,
      order: (services?.length || 0) + 1,
      logoId: null,
    });
    setEditingId(null);
    setShowForm(false);
    setLogoPreview(null);
    setLogoFile(null);
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showError("Please upload an image file");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showError("Image size must be less than 5MB");
      return;
    }

    setUploadingLogo(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      setLogoFile(file);
      
      // Generate upload URL and upload
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const storageId = await result.text();
      
      setFormData({ ...formData, logoId: storageId as Id<"_storage"> });
      success("Logo uploaded successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to upload logo");
      setLogoPreview(null);
      setLogoFile(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      showError("Service name is required");
      return;
    }
    if (!currentUserId) {
      showError("You must be logged in");
      return;
    }

    try {
      await createService({
        name: formData.name.trim(),
        icon: formData.icon,
        logoId: formData.logoId,
        color: formData.color,
        rating: formData.rating,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        order: formData.order,
        createdBy: currentUserId as Id<"users">,
      });

      success("Service created successfully!");
      resetForm();
    } catch (err: any) {
      showError(err.message || "Failed to create service");
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    
    if (!formData.name.trim()) {
      showError("Service name is required");
      return;
    }

    try {
      await updateService({
        id: editingId,
        name: formData.name.trim(),
        icon: formData.icon,
        logoId: formData.logoId,
        color: formData.color,
        rating: formData.rating,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        order: formData.order,
      });

      success("Service updated successfully!");
      resetForm();
    } catch (err: any) {
      showError(err.message || "Failed to update service");
    }
  };

  const handleDelete = async (id: Id<"serviceCatalog">) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    
    try {
      await removeService({ id });
      success("Service deleted!");
    } catch (err: any) {
      showError(err.message || "Failed to delete service");
    }
  };

  const handleEdit = (service: any) => {
    setEditingId(service._id);
    setFormData({
      name: service.name,
      icon: service.icon,
      color: service.color,
      rating: service.rating,
      description: service.description || "",
      isActive: service.isActive,
      order: service.order,
      logoId: service.logoId || null,
    });
    // Set logo preview if logo exists - will be loaded via query
    setLogoPreview(null);
    setLogoFile(null);
    setShowForm(true);
  };

  const handleToggleActive = async (id: Id<"serviceCatalog">) => {
    try {
      await toggleActive({ id });
      success("Service status updated!");
    } catch (err: any) {
      showError(err.message || "Failed to update service");
    }
  };

  if (services === undefined || currentUser === undefined) {
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
          <p className="text-slate-600 mb-4">You need admin privileges to manage service catalog.</p>
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
          <h1 className="text-2xl font-bold text-slate-900">Service Catalog</h1>
          <p className="text-sm text-slate-600">
            Manage services displayed on the dashboard
          </p>
        </div>
      </div>

      {!showForm && (
        <div className="flex justify-end">
          <Button variant="gradient" onClick={() => setShowForm(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Service
          </Button>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <Card padding="lg" className="border-2 border-blue-200 bg-blue-50/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-lg">
              {editingId ? "Edit Service" : "Create New Service"}
            </h3>
            <button
              onClick={resetForm}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <Input
              label="Service Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., IT Support"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Icon (Emoji)
                </label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="💻"
                  maxLength={2}
                />
                <p className="text-xs text-slate-500 mt-1">Enter an emoji or icon</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Background Color
                </label>
                <select
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {COLOR_OPTIONS.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Logo (Image)
              </label>
              {editingId && formData.logoId && (
                <LogoPreviewLoader 
                  logoId={formData.logoId} 
                  onLoad={(url) => {
                    if (url && !logoPreview) {
                      setLogoPreview(url);
                    }
                  }}
                />
              )}
              <div className="space-y-2">
                {logoPreview ? (
                  <div className="relative inline-block">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview(null);
                        setLogoFile(null);
                        setFormData({ ...formData, logoId: null });
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-2">
                      <svg className="w-6 h-6 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-slate-500">Click to upload</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                      disabled={uploadingLogo}
                    />
                  </label>
                )}
                {uploadingLogo && (
                  <p className="text-xs text-slate-500">Uploading...</p>
                )}
                <p className="text-xs text-slate-500">Upload a logo image (max 5MB). Logo will be used instead of emoji if provided.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Rating (0-5)"
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
              />
              
              <Input
                label="Display Order"
                type="number"
                min={1}
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
              />
            </div>

            <Textarea
              label="Description (Optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the service..."
              rows={2}
            />

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

            <div className="flex gap-2 pt-2">
              <Button 
                variant="gradient" 
                onClick={editingId ? handleUpdate : handleCreate}
              >
                {editingId ? "Update Service" : "Create Service"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Services List */}
      {services && services.length > 0 ? (
        <div className="space-y-3">
          {services.map((service) => (
            <Card key={service._id} padding="none" className={`overflow-hidden ${!service.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-4 p-4">
                <div className={`w-2 h-full min-h-[80px] rounded-full ${
                  service.isActive ? "bg-green-500" : "bg-slate-300"
                }`} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ServiceLogo service={service} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900">{service.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          service.isActive 
                            ? "bg-green-100 text-green-700" 
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {service.isActive ? "Active" : "Inactive"}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500 text-xs">⭐</span>
                          <span className="text-xs text-slate-600">{service.rating}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          Order: {service.order}
                        </span>
                        <span className="text-xs text-slate-500">
                          Requests: {service.requestCount}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {service.description && (
                    <p className="text-sm text-slate-600 mt-2">{service.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(service._id)}
                    className={`p-2 rounded-lg transition-colors ${
                      service.isActive
                        ? "text-green-600 hover:bg-green-50"
                        : "text-slate-400 hover:bg-slate-100"
                    }`}
                    title={service.isActive ? "Deactivate" : "Activate"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(service._id)}
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
            <span className="text-4xl mb-3 block">📋</span>
            <p className="text-slate-600">No services yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first service to display on the dashboard</p>
          </div>
        </Card>
      )}
    </div>
  );
}
