"use client";

import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface BrandingSettings {
  logoId: string | null;
  logoUrl: string | null;
  primaryColor: string;
  primaryColorHover: string;
  secondaryColor: string | null;
  appName: string;
  enabled: boolean;
  // System Icons
  chatIconUrl: string | null;
  userIconUrl: string | null;
  resetPasswordIconUrl: string | null;
  notificationIconUrl: string | null;
  searchIconUrl: string | null;
}

interface BrandingContextType {
  branding: BrandingSettings | null;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: null,
  isLoading: true,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  // Handle case where branding API might not be synced yet
  const brandingApi = (api as any).branding;
  const brandingSettings = useQuery(
    brandingApi?.getSettings || "skip",
    brandingApi?.getSettings ? {} : "skip"
  );
  const logoUrl = useQuery(
    brandingApi?.getLogoUrl || "skip",
    brandingSettings?.logoId && brandingApi?.getLogoUrl
      ? { storageId: brandingSettings.logoId }
      : "skip"
  );

  const chatIconUrl = useQuery(
    brandingApi?.getLogoUrl || "skip",
    brandingSettings?.chatIconId && brandingApi?.getLogoUrl
      ? { storageId: brandingSettings.chatIconId }
      : "skip"
  );

  const userIconUrl = useQuery(
    brandingApi?.getLogoUrl || "skip",
    brandingSettings?.userIconId && brandingApi?.getLogoUrl
      ? { storageId: brandingSettings.userIconId }
      : "skip"
  );

  const resetPasswordIconUrl = useQuery(
    brandingApi?.getLogoUrl || "skip",
    brandingSettings?.resetPasswordIconId && brandingApi?.getLogoUrl
      ? { storageId: brandingSettings.resetPasswordIconId }
      : "skip"
  );

  const notificationIconUrl = useQuery(
    brandingApi?.getLogoUrl || "skip",
    brandingSettings?.notificationIconId && brandingApi?.getLogoUrl
      ? { storageId: brandingSettings.notificationIconId }
      : "skip"
  );

  const searchIconUrl = useQuery(
    brandingApi?.getLogoUrl || "skip",
    brandingSettings?.searchIconId && brandingApi?.getLogoUrl
      ? { storageId: brandingSettings.searchIconId }
      : "skip"
  );

  const branding: BrandingSettings | null = brandingSettings
    ? {
        logoId: brandingSettings.logoId || null,
        logoUrl: logoUrl || null,
        primaryColor: brandingSettings.enabled ? brandingSettings.primaryColor : "#4f46e5",
        primaryColorHover: brandingSettings.enabled && brandingSettings.primaryColorHover
          ? brandingSettings.primaryColorHover
          : "#4338ca",
        secondaryColor: brandingSettings.enabled && brandingSettings.secondaryColor
          ? brandingSettings.secondaryColor
          : null,
        appName: brandingSettings.enabled && brandingSettings.appName
          ? brandingSettings.appName
          : "Palmware",
        enabled: brandingSettings.enabled,
        chatIconUrl: brandingSettings.enabled && chatIconUrl ? chatIconUrl : null,
        userIconUrl: brandingSettings.enabled && userIconUrl ? userIconUrl : null,
        resetPasswordIconUrl: brandingSettings.enabled && resetPasswordIconUrl ? resetPasswordIconUrl : null,
        notificationIconUrl: brandingSettings.enabled && notificationIconUrl ? notificationIconUrl : null,
        searchIconUrl: brandingSettings.enabled && searchIconUrl ? searchIconUrl : null,
      }
    : null;
  
  // #region agent log
  if (typeof window !== 'undefined' && brandingSettings) {
    fetch('http://127.0.0.1:7243/ingest/b4baa00f-0fc1-4b1d-a100-728c6955253f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BrandingContext.tsx:102',message:'BrandingContext computed branding',data:{enabled:brandingSettings.enabled,chatIconId:brandingSettings.chatIconId,chatIconUrl:chatIconUrl,computedChatIconUrl:branding?.chatIconUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,D'})}).catch(()=>{});
  }
  // #endregion

  return (
    <BrandingContext.Provider value={{ branding, isLoading: brandingSettings === undefined }}>
      {children}
      {/* Apply CSS variables for colors */}
      {branding && branding.enabled && (
        <style jsx global>{`
          :root {
            --primary: ${branding.primaryColor};
            --primary-hover: ${branding.primaryColorHover};
            ${branding.secondaryColor ? `--secondary: ${branding.secondaryColor};` : ""}
          }
        `}</style>
      )}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
