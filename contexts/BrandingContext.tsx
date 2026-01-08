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
      }
    : {
        logoId: null,
        logoUrl: null,
        primaryColor: "#4f46e5",
        primaryColorHover: "#4338ca",
        secondaryColor: null,
        appName: "Palmware",
        enabled: false,
      };

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
