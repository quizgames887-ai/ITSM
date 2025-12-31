"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TicketCard } from "@/components/tickets/TicketCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

export default function TicketsPage() {
  const tickets = useQuery(api.tickets.list, {});

  if (tickets === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-10 bg-slate-200 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-slate-200 rounded w-1/3 mb-8"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              Tickets
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              Manage and track all your support tickets
            </p>
          </div>
          <Link href="/tickets/new" className="w-full sm:w-auto">
            <Button variant="gradient" size="lg" className="w-full sm:w-auto">
              <span className="mr-2">+</span>
              <span className="hidden sm:inline">Create New Ticket</span>
              <span className="sm:hidden">New Ticket</span>
            </Button>
          </Link>
        </div>

        {tickets.length === 0 ? (
          <Card hover padding="lg">
            <EmptyState
              icon={
                <svg
                  className="w-12 h-12 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
              title="No tickets found"
              description="You haven't created any tickets yet. Start by creating your first support ticket to track issues and requests."
              action={{
                label: "Create your first ticket",
                href: "/tickets/new",
              }}
            />
          </Card>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket, index) => (
              <div
                key={ticket._id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TicketCard ticket={ticket} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
