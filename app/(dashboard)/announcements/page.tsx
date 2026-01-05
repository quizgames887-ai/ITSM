"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

export default function AnnouncementsPage() {
  const announcements = useQuery(api.announcements.list, {});
  const stats = useQuery(api.announcements.getStats, {});
  
  const createAnnouncement = useMutation(api.announcements.create);
  const updateAnnouncement = useMutation(api.announcements.update);
  const removeAnnouncement = useMutation(api.announcements.remove);
  const toggleActive = useMutation(api.announcements.toggleActive);
  const generateUploadUrl = useMutation(api.announcements.generateUploadUrl);
  
  const { success, error: showError } = useToastContext();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"announcements"> | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    buttonText: "",
    buttonLink: "",
    imageId: null as Id<"_storage"> | null,
    isActive: true,
    priority: 1,
    expiresAt: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get image URL for preview when editing (must be after formData is declared)
  const previewImageUrl = useQuery(
    api.announcements.getImageUrl,
    formData.imageId ? { storageId: formData.imageId } : "skip"
  );

  const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );
  
  const isAdmin = currentUser?.role === "admin";

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      buttonText: "",
      buttonLink: "",
      imageId: null,
      isActive: true,
      priority: 1,
      expiresAt: "",
    });
    setImagePreview(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleImageUpload called", event.target.files);
    if (!event.target.files || event.target.files.length === 0) {
      console.log("No files selected");
      return;
    }

    const file = event.target.files[0];
    console.log("Selected file:", file.name, file.type, file.size);
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      showError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError("Image size must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    setImagePreview(null);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Generate upload URL
      console.log("Generating upload URL...");
      const uploadUrl = await generateUploadUrl();
      console.log("Upload URL generated:", uploadUrl ? "Success" : "Failed");
      
      if (!uploadUrl || typeof uploadUrl !== "string") {
        throw new Error("Failed to generate upload URL: Invalid response");
      }

      // Upload file to Convex storage
      console.log("Uploading file to:", uploadUrl.substring(0, 50) + "...");
      console.log("File size:", file.size, "bytes, File type:", file.type);
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      console.log("Upload response status:", uploadResult.status, uploadResult.statusText);

      if (!uploadResult.ok) {
        let errorText = "";
        try {
          errorText = await uploadResult.text();
        } catch {
          errorText = uploadResult.statusText;
        }
        throw new Error(`Failed to upload image (${uploadResult.status}): ${errorText || uploadResult.statusText}`);
      }

      // Get storage ID from the response (Convex returns JSON with storageId)
      // Read the response as text first, then parse JSON
      // This allows us to see the raw response if parsing fails
      const responseText = await uploadResult.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse upload response as JSON:", responseText);
        throw new Error(`Invalid response format from server: ${responseText.substring(0, 200)}`);
      }
      
      const storageId = responseData?.storageId;
      console.log("Extracted storageId:", storageId);
      
      if (!storageId) {
        console.error("Upload response data:", responseData);
        throw new Error("Failed to get storage ID from upload response. Response: " + JSON.stringify(responseData));
      }

      console.log("Setting imageId in formData:", storageId);
      setFormData({ ...formData, imageId: storageId as Id<"_storage"> });
      success("Image uploaded successfully!");
      console.log("Image upload completed successfully");
      
      // Clear the file input so the same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      console.error("Image upload error:", err);
      showError(err.message || "Failed to upload image");
      setImagePreview(null);
      
      // Clear the file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, imageId: null });
    setImagePreview(null);
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      showError("Title is required");
      return;
    }
    if (!formData.content.trim()) {
      showError("Content is required");
      return;
    }

    try {
      await createAnnouncement({
        title: formData.title.trim(),
        content: formData.content.trim(),
        buttonText: formData.buttonText.trim() || undefined,
        buttonLink: formData.buttonLink.trim() || undefined,
        imageId: formData.imageId || undefined,
        isActive: formData.isActive,
        priority: formData.priority,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).getTime() : undefined,
        createdBy: currentUserId as Id<"users">,
      });

      success("Announcement created successfully!");
      resetForm();
    } catch (err: any) {
      showError(err.message || "Failed to create announcement");
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    
    if (!formData.title.trim()) {
      showError("Title is required");
      return;
    }
    if (!formData.content.trim()) {
      showError("Content is required");
      return;
    }

    try {
      await updateAnnouncement({
        id: editingId,
        title: formData.title.trim(),
        content: formData.content.trim(),
        buttonText: formData.buttonText.trim() || null,
        buttonLink: formData.buttonLink.trim() || null,
        imageId: formData.imageId || null,
        isActive: formData.isActive,
        priority: formData.priority,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).getTime() : null,
      });

      success("Announcement updated successfully!");
      resetForm();
    } catch (err: any) {
      showError(err.message || "Failed to update announcement");
    }
  };

  const handleEdit = (announcement: any) => {
    setEditingId(announcement._id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      buttonText: announcement.buttonText || "",
      buttonLink: announcement.buttonLink || "",
      imageId: announcement.imageId || null,
      isActive: announcement.isActive,
      priority: announcement.priority,
      expiresAt: announcement.expiresAt 
        ? new Date(announcement.expiresAt).toISOString().split("T")[0] 
        : "",
    });
    // Set preview if image exists
    if (announcement.imageId) {
      // We'll fetch the URL in the component
      setImagePreview(null); // Will be set by the query
    } else {
      setImagePreview(null);
    }
    setShowForm(true);
  };

  const handleDelete = async (id: Id<"announcements">) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    
    try {
      await removeAnnouncement({ id });
      success("Announcement deleted!");
    } catch (err: any) {
      showError(err.message || "Failed to delete announcement");
    }
  };

  const handleToggle = async (id: Id<"announcements">) => {
    try {
      await toggleActive({ id });
      success("Status updated!");
    } catch (err: any) {
      showError(err.message || "Failed to update status");
    }
  };

  if (announcements === undefined || currentUser === undefined) {
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
          <p className="text-slate-600 mb-4">You need admin privileges to manage announcements.</p>
          <Link href="/workplace">
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
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-sm text-slate-600">Manage dashboard announcements</p>
        </div>
        {!showForm && (
          <Button variant="gradient" onClick={() => setShowForm(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Announcement
          </Button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-slate-900">{stats?.total || 0}</div>
          <div className="text-xs text-slate-600">Total</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
          <div className="text-xs text-slate-600">Active</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-slate-400">{stats?.inactive || 0}</div>
          <div className="text-xs text-slate-600">Inactive</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-amber-600">{stats?.expired || 0}</div>
          <div className="text-xs text-slate-600">Expired</div>
        </Card>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card padding="lg" className="border-2 border-teal-200 bg-teal-50/30">
          <h3 className="font-semibold text-slate-900 mb-4">
            {editingId ? "Edit Announcement" : "Create New Announcement"}
          </h3>
          
          <div className="space-y-4">
            <Input
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., New Feature Release"
            />
            
            <Textarea
              label="Content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Announcement content..."
              rows={3}
            />
            
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Photo (Optional)
              </label>
              <div className="space-y-3">
                {(imagePreview || previewImageUrl) && (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview || previewImageUrl || ""}
                      alt="Preview"
                      className="h-32 w-auto rounded-lg border border-slate-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer"
                  >
                    {uploadingImage ? "Uploading..." : imagePreview || previewImageUrl ? "Change Photo" : "Upload Photo"}
                  </Button>
                  {formData.imageId && !imagePreview && !previewImageUrl && (
                    <span className="text-xs text-slate-500">Image uploaded</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Button Text (optional)"
                value={formData.buttonText}
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                placeholder="e.g., Learn More"
              />
              <Input
                label="Button Link (optional)"
                value={formData.buttonLink}
                onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                placeholder="e.g., /docs/new-feature"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Priority (higher = shown first)"
                type="number"
                min={1}
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
              />
              <Input
                label="Expiration Date (optional)"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
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

            {/* Preview */}
            <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
              <label className="block text-xs font-medium text-slate-600 mb-2">Preview</label>
              <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 relative overflow-hidden">
                {/* Image if available */}
                {(imagePreview || previewImageUrl) && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview || previewImageUrl || ""}
                      alt="Announcement"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
                <div className="relative z-10">
                  <span className="text-xs text-teal-200 font-medium">Announcement</span>
                  <h3 className="text-lg font-bold text-white mt-1 mb-2">
                    {formData.title || "Title Preview"}
                  </h3>
                  <p className="text-sm text-teal-100 mb-3 line-clamp-2">
                    {formData.content || "Content preview..."}
                  </p>
                  {formData.buttonText && (
                    <button className="px-3 py-1.5 bg-teal-500 text-white text-xs font-medium rounded-lg">
                      {formData.buttonText}
                    </button>
                  )}
                </div>
                {!(imagePreview || previewImageUrl) && (
                  <div className="absolute right-0 bottom-0 w-20 h-20 opacity-20">
                    <div className="w-full h-full bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full transform translate-x-6 translate-y-6"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="gradient" 
                onClick={editingId ? handleUpdate : handleCreate}
              >
                {editingId ? "Update Announcement" : "Create Announcement"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Announcements List */}
      {announcements && announcements.length > 0 ? (
        <div className="space-y-3">
          {announcements.map((announcement) => {
            const isExpired = announcement.expiresAt && announcement.expiresAt < Date.now();
            
            return (
              <Card 
                key={announcement._id} 
                padding="none" 
                className={`overflow-hidden ${!announcement.isActive || isExpired ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Color indicator */}
                  <div className={`w-2 h-full min-h-[80px] rounded-full ${
                    isExpired ? "bg-amber-400" : announcement.isActive ? "bg-green-500" : "bg-slate-300"
                  }`} />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      {/* Image thumbnail if available */}
                      {announcement.imageUrl && (
                        <div className="flex-shrink-0">
                          <img
                            src={announcement.imageUrl}
                            alt={announcement.title}
                            className="w-20 h-20 rounded-lg object-cover border border-slate-200"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-900">{announcement.title}</h4>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            isExpired 
                              ? "bg-amber-100 text-amber-700"
                              : announcement.isActive 
                                ? "bg-green-100 text-green-700" 
                                : "bg-slate-100 text-slate-500"
                          }`}>
                            {isExpired ? "Expired" : announcement.isActive ? "Active" : "Inactive"}
                          </span>
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            Priority: {announcement.priority}
                          </span>
                          {announcement.imageUrl && (
                            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                              📷 Has Photo
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{announcement.content}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>By {announcement.creatorName}</span>
                      <span>Created {new Date(announcement.createdAt).toLocaleDateString()}</span>
                      {announcement.expiresAt && (
                        <span className={isExpired ? "text-amber-600" : ""}>
                          {isExpired ? "Expired" : "Expires"} {new Date(announcement.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                      {announcement.buttonText && (
                        <span className="text-blue-600">Button: "{announcement.buttonText}"</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(announcement._id)}
                      className={`p-2 rounded-lg transition-colors ${
                        announcement.isActive
                          ? "text-green-600 hover:bg-green-50"
                          : "text-slate-400 hover:bg-slate-100"
                      }`}
                      title={announcement.isActive ? "Deactivate" : "Activate"}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(announcement._id)}
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
            );
          })}
        </div>
      ) : (
        <Card padding="lg">
          <div className="text-center py-8">
            <span className="text-4xl mb-3 block">📢</span>
            <p className="text-slate-600">No announcements yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first announcement to display on the dashboard</p>
          </div>
        </Card>
      )}
    </div>
  );
}
