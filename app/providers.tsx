"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ToastProvider } from "@/contexts/ToastContext";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

const convex = new ConvexReactClient(convexUrl);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ToastProvider>{children}</ToastProvider>
    </ConvexProvider>
  );
}
