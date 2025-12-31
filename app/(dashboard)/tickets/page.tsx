"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TicketCard } from "@/components/tickets/TicketCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function TicketsPage() {
  const tickets = useQuery(api.tickets.list, {});

  if (tickets === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading tickets...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Tickets</h1>
            <p className="text-slate-600">
              Manage and track all your support tickets
            </p>
          </div>
          <Link href="/tickets/new">
            <Button>Create New Ticket</Button>
          </Link>
        </div>

        {tickets.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-slate-600 mb-4">No tickets found</p>
              <Link href="/tickets/new">
                <Button>Create your first ticket</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
              <TicketCard key={ticket._id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
