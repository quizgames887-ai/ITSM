"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

interface IconUploadSectionProps {
  title: string;
  description: string;
  iconId: Id<"_storage"> | null | undefined;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  generateUploadUrl: (() => Promise<string>) | undefined;
  getIconUrl: any;
  defaultIcon: React.ReactNode;
}

function IconUploadSection({
  title,
  description,
  iconId,
  onUpload,
  onRemove,
  generateUploadUrl,
  getIconUrl,
  defaultIcon,
}: IconUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconUrl = useQuery(
    iconId && getIconUrl ? getIconUrl : "skip",
    iconId && getIconUrl ? { storageId: iconId } : "skip"
  );

  // Add cache-busting parameter to force browser to reload image when iconId changes
  const iconUrlWithCacheBust = iconUrl && iconId 
    ? `${iconUrl}${iconUrl.includes('?') ? '&' : '?'}v=${iconId}`
    : iconUrl;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        await onUpload(file);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove();
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
            {iconUrlWithCacheBust ? (
              <img
                key={iconId || 'no-icon'}
                src={iconUrlWithCacheBust}
                alt={title}
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="text-slate-400">{defaultIcon}</div>
            )}
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !generateUploadUrl}
              loading={uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            {iconId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={removing}
                loading={removing}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrandingSettingsPage() {
  // Handle case where branding API might not be synced yet
  const brandingApi = (api as any).branding;
  const brandingSettings = useQuery(
    brandingApi?.getSettings || "skip",
    brandingApi?.getSettings ? {} : "skip"
  );
  const updateSettings = useMutation(brandingApi?.updateSettings);
  const generateUploadUrl = useMutation(brandingApi?.generateUploadUrl);
  const logoUrl = useQuery(
    brandingApi?.getLogoUrl || "skip",
    brandingSettings?.logoId && brandingApi?.getLogoUrl
      ? { storageId: brandingSettings.logoId }
      : "skip"
  );
  
  const { success, error: showError } = useToastContext();
  
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Branding settings state
  const [enabled, setEnabled] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [primaryColorHover, setPrimaryColorHover] = useState("#4338ca");
  const [secondaryColor, setSecondaryColor] = useState("#6366f1");
  const [appName, setAppName] = useState("Palmware");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Load existing branding settings
  useEffect(() => {
    if (brandingSettings) {
      setEnabled(brandingSettings.enabled ?? true);
      setPrimaryColor(brandingSettings.primaryColor || "#4f46e5");
      setPrimaryColorHover(brandingSettings.primaryColorHover || "#4338ca");
      setSecondaryColor(brandingSettings.secondaryColor || "#6366f1");
      setAppName(brandingSettings.appName || "Palmware");
    }
  }, [brandingSettings]);
  
  // Update logo preview when URL is available
  useEffect(() => {
    if (logoUrl && brandingSettings?.logoId) {
      // Add cache-busting parameter to force browser to reload image when logoId changes
      const logoUrlWithCacheBust = `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}v=${brandingSettings.logoId}`;
      setLogoPreview(logoUrlWithCacheBust);
    } else if (!brandingSettings?.logoId) {
      // Clear preview if logo is removed
      setLogoPreview(null);
    }
  }, [logoUrl, brandingSettings?.logoId]);
  
  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showError("Please upload an image file");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showError("Image size must be less than 5MB");
      return;
    }

    if (!generateUploadUrl || !updateSettings) {
      showError("Branding API not available. Please ensure Convex is running.");
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
      
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();
      if (!uploadUrl || typeof uploadUrl !== "string") {
        throw new Error("Failed to generate upload URL");
      }

      // Upload file to Convex storage
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResult.ok) {
        const errorText = await uploadResult.text();
        throw new Error(`Failed to upload logo: ${errorText || uploadResult.statusText}`);
      }

      // Get storage ID from the response
      const responseText = await uploadResult.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new Error(`Invalid response format: ${responseText.substring(0, 200)}`);
      }

      const storageId = responseData?.storageId;
      if (!storageId) {
        throw new Error("Failed to get storage ID from upload response");
      }

      // Save settings with new logo
      const userId = localStorage.getItem("userId");
      if (!userId) {
        throw new Error("Not authenticated");
      }

      await updateSettings({
        logoId: storageId as Id<"_storage">,
        primaryColor,
        primaryColorHover,
        secondaryColor: secondaryColor || undefined,
        appName: appName || undefined,
        enabled,
        createdBy: userId as Id<"users">,
      });

      success("Logo uploaded successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to upload logo");
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleIconUpload = async (file: File): Promise<Id<"_storage"> | null> => {
    if (!file.type.startsWith("image/")) {
      showError("Please upload an image file");
      return null;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showError("Image size must be less than 5MB");
      return null;
    }

    if (!generateUploadUrl) {
      showError("Branding API not available. Please ensure Convex is running.");
      return null;
    }

    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();
      if (!uploadUrl || typeof uploadUrl !== "string") {
        throw new Error("Failed to generate upload URL");
      }

      // Upload file to Convex storage
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResult.ok) {
        const errorText = await uploadResult.text();
        throw new Error(`Failed to upload icon: ${errorText || uploadResult.statusText}`);
      }

      // Get storage ID from the response
      const responseText = await uploadResult.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new Error(`Invalid response format: ${responseText.substring(0, 200)}`);
      }

      const storageId = responseData?.storageId;
      if (!storageId) {
        throw new Error("Failed to get storage ID from upload response");
      }

      success("Icon uploaded successfully!");
      return storageId as Id<"_storage">;
    } catch (err: any) {
      showError(err.message || "Failed to upload icon");
      return null;
    }
  };

  const handleSave = async () => {
    if (!updateSettings) {
      showError("Branding API not available. Please ensure Convex is running.");
      return;
    }

    setLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        throw new Error("Not authenticated");
      }

      await updateSettings({
        logoId: brandingSettings?.logoId ?? null,
        primaryColor,
        primaryColorHover: primaryColorHover || undefined,
        secondaryColor: secondaryColor || undefined,
        appName: appName || undefined,
        chatIconId: brandingSettings?.chatIconId ?? null,
        userIconId: brandingSettings?.userIconId ?? null,
        resetPasswordIconId: brandingSettings?.resetPasswordIconId ?? null,
        notificationIconId: brandingSettings?.notificationIconId ?? null,
        searchIconId: brandingSettings?.searchIconId ?? null,
        enabled,
        createdBy: userId as Id<"users">,
      });

      success("Branding settings saved successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to save branding settings");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!updateSettings) {
      showError("Branding API not available. Please ensure Convex is running.");
      return;
    }

    setLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        throw new Error("Not authenticated");
      }

      await updateSettings({
        logoId: null,
        primaryColor,
        primaryColorHover: primaryColorHover || undefined,
        secondaryColor: secondaryColor || undefined,
        appName: appName || undefined,
        chatIconId: brandingSettings?.chatIconId ?? null,
        userIconId: brandingSettings?.userIconId ?? null,
        resetPasswordIconId: brandingSettings?.resetPasswordIconId ?? null,
        notificationIconId: brandingSettings?.notificationIconId ?? null,
        searchIconId: brandingSettings?.searchIconId ?? null,
        enabled,
        createdBy: userId as Id<"users">,
      });

      setLogoPreview(null);
      success("Logo removed successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to remove logo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branding Settings</h1>
          <p className="text-slate-600 mt-1">Customize your application logo and color theme</p>
        </div>
        <Link href="/settings">
          <Button variant="outline">Back to Settings</Button>
        </Link>
      </div>

      <Card padding="lg">
        <div className="space-y-8">
          {/* Logo Section */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Application Logo</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-6">
                {/* Logo Preview */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                    {logoPreview ? (
                      <img
                        key={brandingSettings?.logoId || 'no-logo'}
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs text-slate-500">No logo</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Upload Controls */}
                <div className="flex-1 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleLogoUpload(file);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      loading={uploadingLogo}
                    >
                      {uploadingLogo ? "Uploading..." : logoPreview ? "Change Logo" : "Upload Logo"}
                    </Button>
                    {logoPreview && (
                      <Button
                        variant="outline"
                        onClick={handleRemoveLogo}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove Logo
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Recommended: PNG or SVG format, max 5MB. Logo will be displayed in the header and navigation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Color Theme Section */}
          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Color Theme</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-16 h-10 rounded border border-slate-300 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#4f46e5"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Main brand color used for buttons, links, and accents
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Primary Color (Hover)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColorHover}
                    onChange={(e) => setPrimaryColorHover(e.target.value)}
                    className="w-16 h-10 rounded border border-slate-300 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={primaryColorHover}
                    onChange={(e) => setPrimaryColorHover(e.target.value)}
                    placeholder="#4338ca"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Color shown when hovering over primary elements
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Secondary Color (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-16 h-10 rounded border border-slate-300 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Secondary brand color for gradients and accents
                </p>
              </div>
            </div>
          </div>

          {/* Application Name Section */}
          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Application Name</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Application Name
              </label>
              <Input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Palmware"
                className="max-w-md"
              />
              <p className="text-xs text-slate-500 mt-1">
                Custom name displayed in navigation and header (defaults to "Palmware")
              </p>
            </div>
          </div>

          {/* System Icons Section */}
          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">System Icons</h2>
            <p className="text-sm text-slate-600 mb-6">
              Customize system icons used throughout the application. Recommended: SVG format for best quality.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Chat Icon */}
              <IconUploadSection
                title="Chat Icon"
                description="Icon used for chat functionality"
                iconId={brandingSettings?.chatIconId}
                onUpload={async (file) => {
                  const storageId = await handleIconUpload(file);
                  if (storageId) {
                    await updateSettings({
                      logoId: brandingSettings?.logoId ?? null,
                      primaryColor,
                      primaryColorHover: primaryColorHover || undefined,
                      secondaryColor: secondaryColor || undefined,
                      appName: appName || undefined,
                      chatIconId: storageId,
                      userIconId: brandingSettings?.userIconId ?? null,
                      resetPasswordIconId: brandingSettings?.resetPasswordIconId ?? null,
                      notificationIconId: brandingSettings?.notificationIconId ?? null,
                      searchIconId: brandingSettings?.searchIconId ?? null,
                      enabled,
                      createdBy: localStorage.getItem("userId") as Id<"users">,
                    });
                  }
                }}
                onRemove={async () => {
                  await updateSettings({
                    logoId: brandingSettings?.logoId ?? null,
                    primaryColor,
                    primaryColorHover: primaryColorHover || undefined,
                    secondaryColor: secondaryColor || undefined,
                    appName: appName || undefined,
                    chatIconId: null,
                    userIconId: brandingSettings?.userIconId ?? null,
                    resetPasswordIconId: brandingSettings?.resetPasswordIconId ?? null,
                    notificationIconId: brandingSettings?.notificationIconId ?? null,
                    searchIconId: brandingSettings?.searchIconId ?? null,
                    enabled,
                    createdBy: localStorage.getItem("userId") as Id<"users">,
                  });
                }}
                generateUploadUrl={generateUploadUrl}
                getIconUrl={brandingApi?.getLogoUrl}
                defaultIcon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.894 7.553a2 2 0 00-1.447-1.447L13.5 4.5l-1.5-3h-4l-1.5 3-5.947 1.606A2 2 0 003 6.947V19a2 2 0 002 2h14a2 2 0 002-2V6.947a2 2 0 00-.106-1.394z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16h6" />
                  </svg>
                }
              />

              {/* User Icon */}
              <IconUploadSection
                title="User Icon"
                description="Icon used for user/profile menu"
                iconId={brandingSettings?.userIconId}
                onUpload={async (file) => {
                  const storageId = await handleIconUpload(file);
                  if (storageId) {
                    await updateSettings({
                      logoId: brandingSettings?.logoId ?? null,
                      primaryColor,
                      primaryColorHover: primaryColorHover || undefined,
                      secondaryColor: secondaryColor || undefined,
                      appName: appName || undefined,
                      chatIconId: brandingSettings?.chatIconId ?? null,
                      userIconId: storageId,
                      resetPasswordIconId: brandingSettings?.resetPasswordIconId ?? null,
                      notificationIconId: brandingSettings?.notificationIconId ?? null,
                      searchIconId: brandingSettings?.searchIconId ?? null,
                      enabled,
                      createdBy: localStorage.getItem("userId") as Id<"users">,
                    });
                  }
                }}
                onRemove={async () => {
                  await updateSettings({
                    logoId: brandingSettings?.logoId ?? null,
                    primaryColor,
                    primaryColorHover: primaryColorHover || undefined,
                    secondaryColor: secondaryColor || undefined,
                    appName: appName || undefined,
                    chatIconId: brandingSettings?.chatIconId ?? null,
                    userIconId: null,
                    resetPasswordIconId: brandingSettings?.resetPasswordIconId ?? null,
                    notificationIconId: brandingSettings?.notificationIconId ?? null,
                    searchIconId: brandingSettings?.searchIconId ?? null,
                    enabled,
                    createdBy: localStorage.getItem("userId") as Id<"users">,
                  });
                }}
                generateUploadUrl={generateUploadUrl}
                getIconUrl={brandingApi?.getLogoUrl}
                defaultIcon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />

              {/* Reset Password Icon */}
              <IconUploadSection
                title="Reset Password Icon"
                description="Icon used for password reset functionality"
                iconId={brandingSettings?.resetPasswordIconId}
                onUpload={async (file) => {
                  const storageId = await handleIconUpload(file);
                  if (storageId) {
                    await updateSettings({
                      logoId: brandingSettings?.logoId ?? null,
                      primaryColor,
                      primaryColorHover: primaryColorHover || undefined,
                      secondaryColor: secondaryColor || undefined,
                      appName: appName || undefined,
                      chatIconId: brandingSettings?.chatIconId ?? null,
                      userIconId: brandingSettings?.userIconId ?? null,
                      resetPasswordIconId: storageId,
                      notificationIconId: brandingSettings?.notificationIconId ?? null,
                      searchIconId: brandingSettings?.searchIconId ?? null,
                      enabled,
                      createdBy: localStorage.getItem("userId") as Id<"users">,
                    });
                  }
                }}
                onRemove={async () => {
                  await updateSettings({
                    logoId: brandingSettings?.logoId ?? null,
                    primaryColor,
                    primaryColorHover: primaryColorHover || undefined,
                    secondaryColor: secondaryColor || undefined,
                    appName: appName || undefined,
                    chatIconId: brandingSettings?.chatIconId ?? null,
                    userIconId: brandingSettings?.userIconId ?? null,
                    resetPasswordIconId: null,
                    notificationIconId: brandingSettings?.notificationIconId ?? null,
                    searchIconId: brandingSettings?.searchIconId ?? null,
                    enabled,
                    createdBy: localStorage.getItem("userId") as Id<"users">,
                  });
                }}
                generateUploadUrl={generateUploadUrl}
                getIconUrl={brandingApi?.getLogoUrl}
                defaultIcon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                }
              />

              {/* Notification Icon */}
              <IconUploadSection
                title="Notification Icon"
                description="Icon used for notifications"
                iconId={brandingSettings?.notificationIconId}
                onUpload={async (file) => {
                  const storageId = await handleIconUpload(file);
                  if (storageId) {
                    await updateSettings({
                      logoId: brandingSettings?.logoId ?? null,
                      primaryColor,
                      primaryColorHover: primaryColorHover || undefined,
                      secondaryColor: secondaryColor || undefined,
                      appName: appName || undefined,
                      chatIconId: brandingSettings?.chatIconId ?? null,
                      userIconId: brandingSettings?.userIconId ?? null,
                      resetPasswordIconId: brandingSettings?.resetPasswordIconId ?? null,
                      notificationIconId: storageId,
                      searchIconId: brandingSettings?.searchIconId ?? null,
                      enabled,
                      createdBy: localStorage.getItem("userId") as Id<"users">,
                    });
                  }
                }}
                onRemove={async () => {
                  await updateSettings({
                    logoId: brandingSettings?.logoId ?? null,
                    primaryColor,
                    primaryColorHover: primaryColorHover || undefined,
                    secondaryColor: secondaryColor || undefined,
                    appName: appName || undefined,
                    chatIconId: brandingSettings?.chatIconId ?? null,
                    userIconId: brandingSettings?.userIconId ?? null,
                    resetPasswordIconId: brandingSettings?.resetPasswordIconId ?? null,
                    notificationIconId: null,
                    searchIconId: brandingSettings?.searchIconId ?? null,
                    enabled,
                    createdBy: localStorage.getItem("userId") as Id<"users">,
                  });
                }}
                generateUploadUrl={generateUploadUrl}
                getIconUrl={brandingApi?.getLogoUrl}
                defaultIcon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                }
              />

              {/* Search Icon */}
              <IconUploadSection
                title="Search Icon"
                description="Icon used for search functionality"
                iconId={brandingSettings?.searchIconId}
                onUpload={async (file) => {
                  const storageId = await handleIconUpload(file);
                  if (storageId) {
                    await updateSettings({
                      logoId: brandingSettings?.logoId ?? null,
                      primaryColor,
                      primaryColorHover: primaryColorHover || undefined,
                      secondaryColor: secondaryColor || undefined,
                      appName: appName || undefined,
                      chatIconId: brandingSettings?.chatIconId ?? null,
                      userIconId: brandingSettings?.userIconId ?? null,
                      resetPasswordIconId: brandingSettings?.resetPasswordIconId ?? null,
                      notificationIconId: brandingSettings?.notificationIconId ?? null,
                      searchIconId: storageId,
                      enabled,
                      createdBy: localStorage.getItem("userId") as Id<"users">,
                    });
                  }
                }}
                onRemove={async () => {
                  await updateSettings({
                    logoId: brandingSettings?.logoId ?? null,
                    primaryColor,
                    primaryColorHover: primaryColorHover || undefined,
                    secondaryColor: secondaryColor || undefined,
                    appName: appName || undefined,
                    chatIconId: brandingSettings?.chatIconId ?? null,
                    userIconId: brandingSettings?.userIconId ?? null,
                    resetPasswordIconId: brandingSettings?.resetPasswordIconId ?? null,
                    notificationIconId: brandingSettings?.notificationIconId ?? null,
                    searchIconId: null,
                    enabled,
                    createdBy: localStorage.getItem("userId") as Id<"users">,
                  });
                }}
                generateUploadUrl={generateUploadUrl}
                getIconUrl={brandingApi?.getLogoUrl}
                defaultIcon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Enable/Disable Section */}
          <div className="border-t border-slate-200 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Enable Branding</h3>
                <p className="text-xs text-slate-500 mt-1">
                  When enabled, custom logo and colors will be applied throughout the application
                </p>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Preview</h2>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <div className="flex items-center gap-4 mb-4">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-10 object-contain"
                  />
                ) : (
                  <div className="h-10 w-32 bg-slate-200 rounded flex items-center justify-center">
                    <span className="text-xs text-slate-500">{appName}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <button
                  style={{
                    backgroundColor: primaryColor,
                    color: "white",
                  }}
                  className="px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                  onMouseEnter={(e) => {
                    if (primaryColorHover) {
                      e.currentTarget.style.backgroundColor = primaryColorHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = primaryColor;
                  }}
                >
                  Primary Button
                </button>
                <div className="flex items-center gap-2">
                  <a
                    href="#"
                    style={{ color: primaryColor }}
                    className="font-medium hover:underline"
                  >
                    Primary Link
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="border-t border-slate-200 pt-6">
            <Button
              variant="gradient"
              onClick={handleSave}
              disabled={loading}
              loading={loading}
              className="w-full md:w-auto"
            >
              {loading ? "Saving..." : "Save Branding Settings"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
