"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToastContext } from "@/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";

export default function EventsPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    date: "",
  });
  const [dateFilter, setDateFilter] = useState<string>("");

  const { success, error: showError } = useToastContext();

  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (id) setCurrentUserId(id);
  }, []);

  // Get current user to check admin status
  const currentUser = useQuery(
    api.users.get,
    currentUserId ? { id: currentUserId as Id<"users"> } : "skip"
  );

  // Get all events (admin only)
  // Using bracket notation to avoid TypeScript errors until Convex syncs
  const events = useQuery(
    (api as any).events?.getAll,
    dateFilter ? { startDate: dateFilter, endDate: dateFilter } : {}
  ) as any[] | undefined;

  // Get all users for display
  const users = useQuery(api.users.list, {});

  // Mutations
  const createEvent = useMutation((api as any).events?.create);
  const updateEvent = useMutation((api as any).events?.update);
  const deleteEvent = useMutation((api as any).events?.remove);

  const isAdmin = currentUser?.role === "admin";

  const getUserName = (userId: Id<"users">) => {
    return users?.find((u) => u._id === userId)?.name || "Unknown User";
  };

  const handleAddEvent = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setEventForm({
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      date: dateStr,
    });
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (event: any) => {
    setEventForm({
      title: event.title,
      description: event.description || "",
      startTime: event.startTime,
      endTime: event.endTime,
      date: event.date,
    });
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleCopyEvent = (event: any) => {
    // Copy event details but don't set editingEvent (so it creates a new event)
    setEventForm({
      title: `${event.title} (Copy)`,
      description: event.description || "",
      startTime: event.startTime,
      endTime: event.endTime,
      date: event.date,
    });
    setEditingEvent(null); // Not editing, creating a copy
    setShowEventForm(true);
  };

  const handleDeleteEvent = async (eventId: Id<"events">) => {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    if (!currentUserId) {
      showError("You must be logged in to delete events");
      return;
    }

    try {
      await deleteEvent({ id: eventId, userId: currentUserId as Id<"users"> });
      success("Event deleted successfully");
    } catch (err: any) {
      showError(err.message || "Failed to delete event");
    }
  };

  const handleEventSubmit = async () => {
    if (!eventForm.title.trim()) {
      showError("Event title is required");
      return;
    }
    if (!eventForm.startTime || !eventForm.endTime) {
      showError("Start time and end time are required");
      return;
    }
    if (!eventForm.date) {
      showError("Date is required");
      return;
    }
    if (!currentUserId) {
      showError("You must be logged in to create events");
      return;
    }

    try {
      if (editingEvent) {
        await updateEvent({
          id: editingEvent._id,
          title: eventForm.title.trim(),
          description: eventForm.description.trim() || undefined,
          startTime: eventForm.startTime,
          endTime: eventForm.endTime,
          date: eventForm.date,
          userId: currentUserId as Id<"users">,
        });
        success("Event updated successfully");
      } else {
        await createEvent({
          title: eventForm.title.trim(),
          description: eventForm.description.trim() || undefined,
          startTime: eventForm.startTime,
          endTime: eventForm.endTime,
          date: eventForm.date,
          createdBy: currentUserId as Id<"users">,
        });
        success("Event created successfully");
      }
      setShowEventForm(false);
      setEditingEvent(null);
      setEventForm({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        date: "",
      });
    } catch (err: any) {
      showError(err.message || "Failed to save event");
    }
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (events === undefined || (currentUserId && currentUser === undefined)) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (!isAdmin && currentUser !== undefined) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">🔒</span>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">You need admin privileges to access this page.</p>
          <Link href="/dashboard">
            <Button variant="gradient">Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Event Management</h1>
          <p className="text-sm text-slate-600 mt-1">Manage all calendar events</p>
        </div>
        <Button variant="gradient" onClick={handleAddEvent}>
          + Add Event
        </Button>
      </div>

      {/* Filters */}
      <Card padding="md">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Filter by Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          {dateFilter && (
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setDateFilter("")}
              >
                Clear Filter
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Events List */}
      <Card padding="md">
        <div className="space-y-4">
          {events && events.length > 0 ? (
            events.map((event) => (
              <div
                key={event._id}
                className="flex items-start justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {formatDate(event.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatEventTime(event.startTime, event.endTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {getUserName(event.createdBy)}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-sm text-slate-600 mt-2">{event.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyEvent(event)}
                    title="Copy Event"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditEvent(event)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteEvent(event._id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <span className="text-4xl mb-3 block">📅</span>
              <p className="text-sm">No events found</p>
              {dateFilter && (
                <Button
                  variant="outline"
                  onClick={() => setDateFilter("")}
                  className="mt-4"
                >
                  Clear Date Filter
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Event Form Modal */}
      {showEventForm && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowEventForm(false);
            setEditingEvent(null);
            setEventForm({
              title: "",
              description: "",
              startTime: "",
              endTime: "",
              date: "",
            });
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingEvent ? "Edit Event" : "Add Event"}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {eventForm.date && formatDate(eventForm.date)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                  setEventForm({
                    title: "",
                    description: "",
                    startTime: "",
                    endTime: "",
                    date: "",
                  });
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <Input
                  label="Event Title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Enter event title"
                  required
                />
                
                <Textarea
                  label="Description (Optional)"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Add event description..."
                  rows={3}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={(() => {
                        if (!eventForm.startTime) return '';
                        const match = eventForm.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                        if (!match) return eventForm.startTime;
                        let hours = parseInt(match[1]);
                        const minutes = match[2];
                        const ampm = match[3].toUpperCase();
                        if (ampm === 'PM' && hours !== 12) hours += 12;
                        if (ampm === 'AM' && hours === 12) hours = 0;
                        return `${String(hours).padStart(2, '0')}:${minutes}`;
                      })()}
                      onChange={(e) => {
                        const time = e.target.value;
                        if (!time) {
                          setEventForm({ ...eventForm, startTime: '' });
                          return;
                        }
                        const [hours, minutes] = time.split(':');
                        const hour24 = parseInt(hours);
                        const hour12 = hour24 === 0 ? 12 : hour24 === 12 ? 12 : hour24 % 12;
                        const ampm = hour24 >= 12 ? 'PM' : 'AM';
                        setEventForm({ ...eventForm, startTime: `${hour12}:${minutes} ${ampm}` });
                      }}
                      className="w-full py-2 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={(() => {
                        if (!eventForm.endTime) return '';
                        const match = eventForm.endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                        if (!match) return eventForm.endTime;
                        let hours = parseInt(match[1]);
                        const minutes = match[2];
                        const ampm = match[3].toUpperCase();
                        if (ampm === 'PM' && hours !== 12) hours += 12;
                        if (ampm === 'AM' && hours === 12) hours = 0;
                        return `${String(hours).padStart(2, '0')}:${minutes}`;
                      })()}
                      onChange={(e) => {
                        const time = e.target.value;
                        if (!time) {
                          setEventForm({ ...eventForm, endTime: '' });
                          return;
                        }
                        const [hours, minutes] = time.split(':');
                        const hour24 = parseInt(hours);
                        const hour12 = hour24 === 0 ? 12 : hour24 === 12 ? 12 : hour24 % 12;
                        const ampm = hour24 >= 12 ? 'PM' : 'AM';
                        setEventForm({ ...eventForm, endTime: `${hour12}:${minutes} ${ampm}` });
                      }}
                      className="w-full py-2 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                  setEventForm({
                    title: "",
                    description: "",
                    startTime: "",
                    endTime: "",
                    date: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                onClick={handleEventSubmit}
              >
                {editingEvent ? "Update Event" : "Create Event"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
