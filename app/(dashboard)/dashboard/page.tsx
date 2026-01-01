"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

// Service icons for the grid
const services = [
  { name: "Service Name", icon: "📊", rating: 4.4, color: "bg-blue-100" },
  { name: "Service Name", icon: "✖️", rating: 4.7, color: "bg-red-100" },
  { name: "Service Name", icon: "📋", rating: 4.3, color: "bg-amber-100" },
  { name: "Service Name", icon: "📁", rating: 3.8, color: "bg-green-100" },
  { name: "Service Name", icon: "📊", rating: 4.2, color: "bg-purple-100" },
  { name: "Service Name", icon: "🛠️", rating: 4.3, color: "bg-orange-100" },
  { name: "Service Name", icon: "💡", rating: 4.5, color: "bg-yellow-100" },
  { name: "Service Name", icon: "📈", rating: 4.3, color: "bg-cyan-100" },
];

const favoriteLinks = [
  { name: "Get Help & Support", icon: "❓" },
  { name: "My Requests / All Requests", icon: "💜" },
  { name: "Profile Settings", icon: "💚" },
  { name: "Get Help & Support", icon: "💙" },
  { name: "Services User Guide", icon: "💛" },
];

const todoItems = [
  { title: "Create Services Logo", due: "Due in 2 Days", completed: false },
  { title: "Create palmware Logo", due: "Due in 3 Days", completed: false },
  { title: "Create event's for Emp", due: "Due in 3 Days", completed: false },
  { title: "Create design homepage", due: "Due in 2 Days", completed: false },
  { title: "Create ui ux dashboard", due: "Due in 3 Days", completed: false },
];

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
        ))}
      </div>
      <div className="h-48 bg-slate-200 rounded-xl"></div>
    </div>
  );
}

export default function DashboardPage() {
  const tickets = useQuery(api.tickets.list, {});
  const [votingSelection, setVotingSelection] = useState<string | null>(null);
  const [suggestionCategory, setSuggestionCategory] = useState("");
  const [suggestionText, setSuggestionText] = useState("");

  if (tickets === undefined) {
    return <LoadingSkeleton />;
  }

  const recentUpdates = tickets
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4)
    .map((t) => ({
      title: "Suggest a Change",
      id: `#RM-${t._id.slice(-8)}`,
      assignee: "Mohamed Ali",
      dueIn: "1 day",
    }));

  // Calendar days
  const today = new Date();
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const currentDay = today.getDay();
  const calendarDays = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    calendarDays.push({
      day: days[d.getDay()],
      date: d.getDate(),
      isToday: i === 0,
    });
  }

  const events = [
    { time: "10:00 - 11:00 AM", title: "Project Estimation Meeting" },
    { time: "10:20 - 11:00 AM", title: "Project Estimation Meeting" },
    { time: "10:20 - 11:00 AM", title: "Project Estimation Meeting" },
    { time: "10:20 - 11:00 AM", title: "Project Estimation Meeting" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Row - Services Grid & Announcement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Services Request */}
        <div className="lg:col-span-2">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Most Services Request</h2>
                <p className="text-xs text-slate-500">Top 8 services</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Show More
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center p-4 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className={`w-12 h-12 ${service.color} rounded-xl flex items-center justify-center text-xl mb-2 group-hover:scale-110 transition-transform`}>
                    {service.icon}
                  </div>
                  <p className="text-sm font-medium text-slate-700 text-center">{service.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-xs text-slate-500">{service.rating}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">0 day</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Announcement */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-6 h-full relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-xs text-teal-200 font-medium">Announcement</span>
              <h3 className="text-xl font-bold text-white mt-2 mb-2">Create CRM Reports</h3>
              <p className="text-sm text-teal-100 mb-4 leading-relaxed">
                Outlines keep you and honest indulging in the poorly driving keep structure you honest great opportunity.
              </p>
              <button className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition-colors">
                Create Report
              </button>
            </div>
            {/* Decorative illustration */}
            <div className="absolute right-0 bottom-0 w-32 h-32 opacity-20">
              <div className="w-full h-full bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full transform translate-x-8 translate-y-8"></div>
            </div>
            <div className="absolute right-8 top-8 w-16 h-16 opacity-30">
              <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row - Last Update, Calendar, My Favorite */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Last Update */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Last update</h2>
              <p className="text-xs text-slate-500">Top 4 records</p>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show More
            </button>
          </div>
          <div className="space-y-3">
            {recentUpdates.length > 0 ? (
              recentUpdates.map((update, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-sm">📋</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{update.title}</p>
                      <p className="text-xs text-slate-500">{update.id}</p>
                      <p className="text-xs text-slate-400">
                        Due in {update.dueIn} · <span className="text-blue-600">{update.assignee}</span>
                      </p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No recent updates</p>
              </div>
            )}
          </div>
        </Card>

        {/* Calendar Events */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Calendar <span className="text-slate-400 font-normal">Events</span></h2>
              <p className="text-xs text-slate-500">Top 4 records</p>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show More
            </button>
          </div>
          
          {/* Calendar Week */}
          <div className="flex justify-between mb-4">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`flex flex-col items-center p-2 rounded-xl ${
                  day.isToday
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                } transition-colors cursor-pointer`}
              >
                <span className="text-xs font-medium">{day.day}</span>
                <span className={`text-lg font-semibold ${day.isToday ? "text-white" : "text-slate-900"}`}>
                  {day.date}
                </span>
              </div>
            ))}
          </div>

          {/* Events List */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {events.map((event, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-xs text-slate-500">{event.time}</p>
                  <p className="text-sm text-slate-700">{event.title}</p>
                </div>
                <button className="text-xs text-blue-600 hover:text-blue-700">View</button>
              </div>
            ))}
          </div>
        </Card>

        {/* My Favorite */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">My Favorite</h2>
              <p className="text-xs text-slate-500">Top 5 records</p>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show More
            </button>
          </div>
          <div className="space-y-2">
            {favoriteLinks.map((link, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{link.icon}</span>
                  <span className="text-sm text-slate-700">{link.name}</span>
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Row - Voting, Suggesting, Todo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Voting */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Voting</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show History
            </button>
          </div>
          <p className="text-sm text-slate-600 mb-4">What do you think of the new portals system.?</p>
          <div className="space-y-2">
            {["Great", "Good", "Acceptable"].map((option) => (
              <button
                key={option}
                onClick={() => setVotingSelection(option)}
                className={`w-full py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                  votingSelection === option
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>

        {/* Suggesting */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Suggesting</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show History
            </button>
          </div>
          <p className="text-sm text-slate-600 mb-4">how we can improve your experience</p>
          <div className="space-y-3">
            <select
              value={suggestionCategory}
              onChange={(e) => setSuggestionCategory(e.target.value)}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Select category</option>
              <option value="ui">UI/UX</option>
              <option value="features">Features</option>
              <option value="performance">Performance</option>
              <option value="other">Other</option>
            </select>
            <textarea
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder="Type your suggestion here..."
              rows={3}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
            <Button variant="gradient" className="w-full">
              Submit
            </Button>
          </div>
        </Card>

        {/* Todo */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Todo</h2>
              <p className="text-xs text-slate-500">Top 5 records</p>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Show More
            </button>
          </div>
          <div className="space-y-2">
            {todoItems.map((todo, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{todo.title}</p>
                  <p className="text-xs text-slate-500">{todo.due}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
