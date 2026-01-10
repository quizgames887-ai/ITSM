"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const userId = localStorage.getItem("userId");
    if (userId) {
      // User is logged in, they might have navigated to wrong URL
      // Don't auto-redirect, let them see the 404 page
    } else {
      // Not logged in, redirect to login after a moment
      const timer = setTimeout(() => {
        router.push("/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-indigo-600 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Page Not Found</h2>
          <p className="text-slate-600 text-lg mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="gradient"
            onClick={() => {
              const userId = localStorage.getItem("userId");
              if (userId) {
                router.push("/workplace");
              } else {
                router.push("/login");
              }
            }}
          >
            Go to {localStorage.getItem("userId") ? "Dashboard" : "Login"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-500 mb-4">Quick Links:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/workplace" className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline">
              Workplace
            </Link>
            <Link href="/tickets" className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline">
              Tickets
            </Link>
            <Link href="/profile" className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline">
              Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
