"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const updateOnboarding = useMutation(api.auth.updateOnboardingStatus);

  const steps = [
    {
      title: "Welcome to the Ticketing System",
      description:
        "Efficiently log, track, prioritize, and resolve requests with AI-powered assistance.",
      features: [
        "Create and manage tickets",
        "Track status in real-time",
        "AI-powered categorization",
        "SLA management",
      ],
    },
    {
      title: "Ticket Management",
      description: "Create tickets, assign them, and track their progress.",
      features: [
        "Submit new tickets with details",
        "Filter and search tickets",
        "Real-time status updates",
        "Comment and collaborate on tickets",
      ],
    },
    {
      title: "AI-Powered Features",
      description:
        "Let AI help you categorize, prioritize, and find solutions faster.",
      features: [
        "Automatic category suggestions",
        "Priority recommendations",
        "Knowledge base matching",
        "Resolution suggestions",
      ],
    },
    {
      title: "Analytics & Reporting",
      description: "Monitor performance and track key metrics.",
      features: [
        "Dashboard with ticket overview",
        "Response time tracking",
        "Resolution metrics",
        "SLA compliance monitoring",
      ],
    },
  ];

  const handleComplete = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      if (userId) {
        await updateOnboarding({ userId: userId as any, completed: true });
        router.push("/workplace");
      } else {
        router.push("/login");
      }
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="mb-4">
            {steps.map((_, index) => (
              <span
                key={index}
                className={`inline-block w-3 h-3 rounded-full mx-1 ${
                  index === currentStep
                    ? "bg-slate-900"
                    : index < currentStep
                    ? "bg-slate-400"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {currentStepData.title}
          </h1>
          <p className="text-slate-600 text-lg">{currentStepData.description}</p>
        </div>

        <div className="space-y-4 mb-8">
          {currentStepData.features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg"
            >
              <svg
                className="w-5 h-5 text-slate-900 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-slate-700">{feature}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          {currentStep > 0 ? (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Previous
            </Button>
          ) : (
            <div />
          )}

          {currentStep < steps.length - 1 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Next
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={loading}>
              {loading ? "Getting started..." : "Get Started"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
