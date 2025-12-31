"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "incident" as "incident" | "service_request" | "inquiry",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    urgency: "medium" as "low" | "medium" | "high",
    category: "",
  });

  const createTicket = useMutation(api.tickets.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Get current user ID from localStorage (in production, use proper auth)
      const userId = localStorage.getItem("userId");
      if (!userId) {
        throw new Error("Not authenticated");
      }

      const ticketId = await createTicket({
        ...formData,
        createdBy: userId as any,
      });

      router.push(`/tickets/${ticketId}`);
    } catch (err: any) {
      setError(err.message || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">
          Create New Ticket
        </h1>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="Title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              placeholder="Brief description of the issue"
            />

            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              placeholder="Detailed description of the issue..."
              rows={6}
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as any,
                  })
                }
                options={[
                  { value: "incident", label: "Incident" },
                  { value: "service_request", label: "Service Request" },
                  { value: "inquiry", label: "Inquiry" },
                ]}
              />

              <Select
                label="Priority"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as any,
                  })
                }
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                  { value: "critical", label: "Critical" },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Urgency"
                value={formData.urgency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    urgency: e.target.value as any,
                  })
                }
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
              />

              <Input
                label="Category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                required
                placeholder="e.g., Technical, Billing"
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create Ticket"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
