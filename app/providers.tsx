"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ToastProvider } from "@/contexts/ToastContext";
import { TranslationProvider } from "@/contexts/TranslationContext";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

const convex = new ConvexReactClient(convexUrl);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <TranslationProvider>
        <ToastProvider>{children}</ToastProvider>
      </TranslationProvider>
    </ConvexProvider>
  );
}
