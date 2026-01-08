"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ToastProvider } from "@/contexts/ToastContext";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { BrandingProvider } from "@/contexts/BrandingContext";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

const convex = new ConvexReactClient(convexUrl);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <TranslationProvider>
        <BrandingProvider>
          <ToastProvider>{children}</ToastProvider>
        </BrandingProvider>
      </TranslationProvider>
    </ConvexProvider>
  );
}
