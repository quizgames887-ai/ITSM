"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { useToastContext } from "@/contexts/ToastContext";

export default function TranslationsPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingLanguage, setEditingLanguage] = useState<"en" | "ar">("en");
  const [editForm, setEditForm] = useState({
    key: "",
    en: "",
    ar: "",
    category: "",
  });
  const [newTranslation, setNewTranslation] = useState({
    key: "",
    en: "",
    ar: "",
    category: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  // Get all translations
  const translations = useQuery(api.translations.list, {}) as any[] | undefined;

  // Mutations
  const upsertTranslation = useMutation(api.translations.upsert);
  const deleteTranslation = useMutation(api.translations.remove);
  const bulkImport = useMutation(api.translations.bulkImport);

  const isAdmin = currentUser?.role === "admin";

  // Debug info (remove in production) - MUST be before any early returns
  useEffect(() => {
    console.log("Translations Page Debug:", {
      currentUserId,
      isAdmin,
      currentUser: currentUser ? { id: currentUser._id, role: currentUser.role, email: currentUser.email } : null,
      showAddForm,
      translationsCount: translations?.length || 0,
    });
  }, [currentUserId, isAdmin, currentUser, showAddForm, translations]);

  // Filter translations
  const filteredTranslations = translations?.filter((t) => {
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (searchQuery && !t.key.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !t.en?.value?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.ar?.value?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  // Get unique categories
  const categories = Array.from(
    new Set(translations?.map((t) => t.category).filter(Boolean) || [])
  ).sort();

  const handleEdit = (translation: any) => {
    setEditingKey(translation.key);
    setEditForm({
      key: translation.key,
      en: translation.en?.value || "",
      ar: translation.ar?.value || "",
      category: translation.category || "",
    });
    setEditingLanguage("en");
  };

  const handleSaveEdit = async (language: "en" | "ar") => {
    if (!currentUserId) {
      showError("You must be logged in");
      return;
    }

    if (!editForm.key.trim()) {
      showError("Translation key is required");
      return;
    }

    const value = language === "en" ? editForm.en : editForm.ar;
    if (!value.trim()) {
      showError(`${language === "en" ? "English" : "Arabic"} translation is required`);
      return;
    }

    try {
      await upsertTranslation({
        key: editForm.key,
        language,
        value: value.trim(),
        category: editForm.category.trim() || undefined,
        userId: currentUserId as Id<"users">,
      });
      success(`${language === "en" ? "English" : "Arabic"} translation saved successfully`);
    } catch (err: any) {
      showError(err.message || "Failed to save translation");
    }
  };

  const handleAdd = async () => {
    console.log("handleAdd called", { currentUserId, isAdmin, newTranslation });
    
    if (!currentUserId) {
      showError("You must be logged in. Please refresh the page.");
      return;
    }

    if (!isAdmin) {
      showError("Only admins can add translations. Your role: " + (currentUser?.role || "unknown"));
      return;
    }

    if (!newTranslation.key.trim()) {
      showError("Translation key is required");
      return;
    }

    if (!newTranslation.en.trim() || !newTranslation.ar.trim()) {
      showError("Both English and Arabic translations are required");
      return;
    }

    try {
      console.log("Attempting to save English translation...");
      // Save English translation
      await upsertTranslation({
        key: newTranslation.key.trim(),
        language: "en",
        value: newTranslation.en.trim(),
        category: newTranslation.category.trim() || undefined,
        userId: currentUserId as Id<"users">,
      });

      console.log("English translation saved, saving Arabic...");
      // Save Arabic translation
      await upsertTranslation({
        key: newTranslation.key.trim(),
        language: "ar",
        value: newTranslation.ar.trim(),
        category: newTranslation.category.trim() || undefined,
        userId: currentUserId as Id<"users">,
      });

      console.log("Both translations saved successfully");
      success("Translation added successfully");
      setNewTranslation({ key: "", en: "", ar: "", category: "" });
      setShowAddForm(false);
    } catch (err: any) {
      console.error("Error adding translation:", err);
      showError(err.message || "Failed to add translation. Check console for details.");
    }
  };

  const handleDelete = async (translationId: Id<"translations">) => {
    if (!confirm("Are you sure you want to delete this translation?")) {
      return;
    }

    if (!currentUserId) {
      showError("You must be logged in");
      return;
    }

    try {
      await deleteTranslation({
        id: translationId,
        userId: currentUserId as Id<"users">,
      });
      success("Translation deleted successfully");
    } catch (err: any) {
      showError(err.message || "Failed to delete translation");
    }
  };

  const handleBulkImport = async () => {
    if (!currentUserId) {
      showError("You must be logged in");
      return;
    }

    // Import from the initialization script
    const arabicTranslations = [
      // Common
      { key: "common.save", en: "Save", ar: "حفظ", category: "common" },
      { key: "common.cancel", en: "Cancel", ar: "إلغاء", category: "common" },
      { key: "common.delete", en: "Delete", ar: "حذف", category: "common" },
      { key: "common.edit", en: "Edit", ar: "تعديل", category: "common" },
      { key: "common.close", en: "Close", ar: "إغلاق", category: "common" },
      { key: "common.submit", en: "Submit", ar: "إرسال", category: "common" },
      { key: "common.search", en: "Search", ar: "بحث", category: "common" },
      { key: "common.loading", en: "Loading...", ar: "جاري التحميل...", category: "common" },
      { key: "common.error", en: "Error", ar: "خطأ", category: "common" },
      { key: "common.success", en: "Success", ar: "نجاح", category: "common" },
      { key: "common.confirm", en: "Confirm", ar: "تأكيد", category: "common" },
      { key: "common.yes", en: "Yes", ar: "نعم", category: "common" },
      { key: "common.no", en: "No", ar: "لا", category: "common" },
      
      // Dashboard
      { key: "dashboard.title", en: "My Workspace", ar: "مساحتي", category: "dashboard" },
      { key: "dashboard.welcome", en: "Welcome", ar: "مرحباً", category: "dashboard" },
      { key: "dashboard.mostServicesRequest", en: "Most Services Request", ar: "الخدمات الأكثر طلباً", category: "dashboard" },
      { key: "dashboard.showMore", en: "Show More", ar: "عرض المزيد", category: "dashboard" },
      { key: "dashboard.manage", en: "Manage", ar: "إدارة", category: "dashboard" },
      { key: "dashboard.lastUpdate", en: "Last update", ar: "آخر تحديث", category: "dashboard" },
      { key: "dashboard.calendarEvents", en: "Calendar Events", ar: "أحداث التقويم", category: "dashboard" },
      { key: "dashboard.voting", en: "Voting", ar: "التصويت", category: "dashboard" },
      { key: "dashboard.suggesting", en: "Suggesting", ar: "الاقتراحات", category: "dashboard" },
      { key: "dashboard.todo", en: "Todo", ar: "المهام", category: "dashboard" },
      { key: "dashboard.myFavorites", en: "My Favorites", ar: "مفضلاتي", category: "dashboard" },
      { key: "dashboard.noEvents", en: "No events for this date", ar: "لا توجد أحداث في هذا التاريخ", category: "dashboard" },
      { key: "dashboard.addFirstEvent", en: "Add your first event", ar: "أضف أول حدث لك", category: "dashboard" },
      { key: "dashboard.noActiveVote", en: "No active vote", ar: "لا يوجد تصويت نشط", category: "dashboard" },
      { key: "dashboard.createVote", en: "Create a vote", ar: "إنشاء تصويت", category: "dashboard" },
      { key: "dashboard.undo", en: "Undo", ar: "تراجع", category: "dashboard" },
      { key: "dashboard.showHistory", en: "Show History", ar: "عرض السجل", category: "dashboard" },
      { key: "dashboard.thanksForSuggestion", en: "Thanks for your suggestion", ar: "شكراً لاقتراحك", category: "dashboard" },
      { key: "dashboard.noServices", en: "No services available", ar: "لا توجد خدمات متاحة", category: "dashboard" },
      { key: "dashboard.createFirstService", en: "Create your first service", ar: "أنشئ خدمتك الأولى", category: "dashboard" },
      
      // Profile
      { key: "profile.title", en: "Profile", ar: "الملف الشخصي", category: "profile" },
      { key: "profile.personalInformation", en: "Personal Information", ar: "المعلومات الشخصية", category: "profile" },
      { key: "profile.editProfile", en: "Edit Profile", ar: "تعديل الملف الشخصي", category: "profile" },
      { key: "profile.name", en: "Name", ar: "الاسم", category: "profile" },
      { key: "profile.email", en: "Email", ar: "البريد الإلكتروني", category: "profile" },
      { key: "profile.role", en: "Role", ar: "الدور", category: "profile" },
      { key: "profile.passwordReset", en: "Password Reset", ar: "إعادة تعيين كلمة المرور", category: "profile" },
      { key: "profile.changePassword", en: "Change Password", ar: "تغيير كلمة المرور", category: "profile" },
      { key: "profile.currentPassword", en: "Current Password", ar: "كلمة المرور الحالية", category: "profile" },
      { key: "profile.newPassword", en: "New Password", ar: "كلمة المرور الجديدة", category: "profile" },
      { key: "profile.confirmPassword", en: "Confirm New Password", ar: "تأكيد كلمة المرور الجديدة", category: "profile" },
      { key: "profile.accountDetails", en: "Account Details", ar: "تفاصيل الحساب", category: "profile" },
      { key: "profile.accountCreated", en: "Account Created", ar: "تاريخ إنشاء الحساب", category: "profile" },
      { key: "profile.lastUpdated", en: "Last Updated", ar: "آخر تحديث", category: "profile" },
      { key: "profile.onboardingStatus", en: "Onboarding Status", ar: "حالة الإعداد", category: "profile" },
      { key: "profile.completed", en: "Completed", ar: "مكتمل", category: "profile" },
      { key: "profile.pending", en: "Pending", ar: "قيد الانتظار", category: "profile" },
      { key: "profile.languagePreference", en: "Language Preference", ar: "تفضيل اللغة", category: "profile" },
      { key: "profile.languageDescription", en: "The interface will be displayed from {direction}", ar: "سيتم عرض الواجهة من {direction}", category: "profile" },
      { key: "profile.leftToRight", en: "left to right", ar: "من اليسار إلى اليمين", category: "profile" },
      { key: "profile.rightToLeft", en: "right to left", ar: "من اليمين إلى اليسار", category: "profile" },
      
      // Navigation
      { key: "nav.dashboard", en: "Dashboard", ar: "لوحة التحكم", category: "navigation" },
      { key: "nav.tickets", en: "Tickets", ar: "التذاكر", category: "navigation" },
      { key: "nav.serviceCatalog", en: "Service Catalog", ar: "كتالوج الخدمات", category: "navigation" },
      { key: "nav.forms", en: "Forms", ar: "النماذج", category: "navigation" },
      { key: "nav.users", en: "Users", ar: "المستخدمون", category: "navigation" },
      { key: "nav.notifications", en: "Notification Management", ar: "إدارة الإشعارات", category: "navigation" },
      { key: "nav.announcements", en: "Announcements", ar: "الإعلانات", category: "navigation" },
      { key: "nav.roles", en: "Auto-Assignment Rules", ar: "قواعد التعيين التلقائي", category: "navigation" },
      { key: "nav.sla", en: "SLA & Escalation", ar: "اتفاقية مستوى الخدمة والتكليف", category: "navigation" },
      { key: "nav.events", en: "Event Management", ar: "إدارة الأحداث", category: "navigation" },
      { key: "nav.voting", en: "Voting", ar: "التصويت", category: "navigation" },
      { key: "nav.suggestions", en: "Suggestions", ar: "الاقتراحات", category: "navigation" },
      { key: "nav.profile", en: "Profile", ar: "الملف الشخصي", category: "navigation" },
      
      // Buttons
      { key: "button.create", en: "Create", ar: "إنشاء", category: "buttons" },
      { key: "button.update", en: "Update", ar: "تحديث", category: "buttons" },
      { key: "button.save", en: "Save", ar: "حفظ", category: "buttons" },
      { key: "button.cancel", en: "Cancel", ar: "إلغاء", category: "buttons" },
      { key: "button.delete", en: "Delete", ar: "حذف", category: "buttons" },
      { key: "button.edit", en: "Edit", ar: "تعديل", category: "buttons" },
      { key: "button.view", en: "View", ar: "عرض", category: "buttons" },
      { key: "button.close", en: "Close", ar: "إغلاق", category: "buttons" },
      { key: "button.submit", en: "Submit", ar: "إرسال", category: "buttons" },
      { key: "button.back", en: "Back", ar: "رجوع", category: "buttons" },
      { key: "button.ok", en: "OK", ar: "موافق", category: "buttons" },
      
      // Forms
      { key: "form.required", en: "Required", ar: "مطلوب", category: "forms" },
      { key: "form.invalid", en: "Invalid", ar: "غير صالح", category: "forms" },
      
      // Messages
      { key: "message.success", en: "Operation completed successfully", ar: "تمت العملية بنجاح", category: "messages" },
      { key: "message.error", en: "An error occurred", ar: "حدث خطأ", category: "messages" },
      { key: "message.confirmDelete", en: "Are you sure you want to delete this item?", ar: "هل أنت متأكد من حذف هذا العنصر؟", category: "messages" },
      { key: "message.suggestionSubmitted", en: "Suggestion submitted successfully!", ar: "تم إرسال الاقتراح بنجاح!", category: "messages" },
      { key: "message.voteSubmitted", en: "Vote submitted successfully!", ar: "تم إرسال التصويت بنجاح!", category: "messages" },
      
      // Events
      { key: "events.title", en: "Event Management", ar: "إدارة الأحداث", category: "events" },
      { key: "events.createEvent", en: "Create Event", ar: "إنشاء حدث", category: "events" },
      { key: "events.eventTitle", en: "Event Title", ar: "عنوان الحدث", category: "events" },
      { key: "events.description", en: "Description", ar: "الوصف", category: "events" },
      { key: "events.date", en: "Date", ar: "التاريخ", category: "events" },
      { key: "events.startTime", en: "Start Time", ar: "وقت البدء", category: "events" },
      { key: "events.endTime", en: "End Time", ar: "وقت الانتهاء", category: "events" },
      { key: "events.noEvents", en: "No events found", ar: "لا توجد أحداث", category: "events" },
      
      // Voting
      { key: "voting.title", en: "Voting Management", ar: "إدارة التصويت", category: "voting" },
      { key: "voting.createVote", en: "Create Vote", ar: "إنشاء تصويت", category: "voting" },
      { key: "voting.question", en: "Question", ar: "السؤال", category: "voting" },
      { key: "voting.options", en: "Options", ar: "الخيارات", category: "voting" },
      { key: "voting.activeVote", en: "Active Vote", ar: "تصويت نشط", category: "voting" },
      { key: "voting.inactiveVotes", en: "Inactive Votes", ar: "التصويتات غير النشطة", category: "voting" },
      { key: "voting.totalVotes", en: "total votes", ar: "إجمالي الأصوات", category: "voting" },
      { key: "voting.votes", en: "votes", ar: "أصوات", category: "voting" },
      { key: "voting.voterDetails", en: "Voter Details", ar: "تفاصيل الناخبين", category: "voting" },
      { key: "voting.hideDetails", en: "Hide Voter Details", ar: "إخفاء تفاصيل الناخبين", category: "voting" },
      { key: "voting.viewDetails", en: "View Voter Details", ar: "عرض تفاصيل الناخبين", category: "voting" },
      
      // Suggestions
      { key: "suggestions.title", en: "Suggestions Management", ar: "إدارة الاقتراحات", category: "suggestions" },
      { key: "suggestions.category", en: "Category", ar: "الفئة", category: "suggestions" },
      { key: "suggestions.content", en: "Content", ar: "المحتوى", category: "suggestions" },
      { key: "suggestions.submit", en: "Submit", ar: "إرسال", category: "suggestions" },
      
      // Todos
      { key: "todos.title", en: "Todo", ar: "المهام", category: "todos" },
      { key: "todos.add", en: "Add", ar: "إضافة", category: "todos" },
      { key: "todos.taskTitle", en: "Task Title", ar: "عنوان المهمة", category: "todos" },
      { key: "todos.description", en: "Description", ar: "الوصف", category: "todos" },
      { key: "todos.dueDate", en: "Due Date", ar: "تاريخ الاستحقاق", category: "todos" },
      { key: "todos.priority", en: "Priority", ar: "الأولوية", category: "todos" },
      { key: "todos.priorityLow", en: "Low", ar: "منخفضة", category: "todos" },
      { key: "todos.priorityMedium", en: "Medium", ar: "متوسطة", category: "todos" },
      { key: "todos.priorityHigh", en: "High", ar: "عالية", category: "todos" },
      { key: "todos.status", en: "Status", ar: "الحالة", category: "todos" },
      { key: "todos.statusPending", en: "Pending", ar: "قيد الانتظار", category: "todos" },
      { key: "todos.statusInProgress", en: "In Progress", ar: "قيد التنفيذ", category: "todos" },
      { key: "todos.statusCompleted", en: "Completed", ar: "مكتمل", category: "todos" },
      { key: "todos.statusOverdue", en: "Overdue", ar: "متأخر", category: "todos" },
      
      // Services
      { key: "services.title", en: "Service Catalog", ar: "كتالوج الخدمات", category: "services" },
      { key: "services.name", en: "Service Name", ar: "اسم الخدمة", category: "services" },
      { key: "services.description", en: "Description", ar: "الوصف", category: "services" },
      { key: "services.rating", en: "Rating", ar: "التقييم", category: "services" },
      { key: "services.duration", en: "Duration", ar: "المدة", category: "services" },
      { key: "services.requests", en: "requests", ar: "طلبات", category: "services" },
      { key: "services.allServices", en: "All Services", ar: "جميع الخدمات", category: "services" },
      
      // Tickets
      { key: "tickets.title", en: "Tickets", ar: "التذاكر", category: "tickets" },
      { key: "tickets.createTicket", en: "Create Ticket", ar: "إنشاء تذكرة", category: "tickets" },
      { key: "tickets.ticketTitle", en: "Ticket Title", ar: "عنوان التذكرة", category: "tickets" },
      { key: "tickets.status", en: "Status", ar: "الحالة", category: "tickets" },
      { key: "tickets.priority", en: "Priority", ar: "الأولوية", category: "tickets" },
      { key: "tickets.assignedTo", en: "Assigned To", ar: "مخصص لـ", category: "tickets" },
      { key: "tickets.noTickets", en: "No tickets yet", ar: "لا توجد تذاكر بعد", category: "tickets" },
      
      // Users
      { key: "users.title", en: "User Management", ar: "إدارة المستخدمين", category: "users" },
      { key: "users.name", en: "Name", ar: "الاسم", category: "users" },
      { key: "users.email", en: "Email", ar: "البريد الإلكتروني", category: "users" },
      { key: "users.role", en: "Role", ar: "الدور", category: "users" },
      { key: "users.admin", en: "Admin", ar: "مدير", category: "users" },
      { key: "users.agent", en: "Agent", ar: "وكيل", category: "users" },
      { key: "users.user", en: "User", ar: "مستخدم", category: "users" },
      
      // Calendar
      { key: "calendar.weekView", en: "Week View", ar: "عرض أسبوعي", category: "calendar" },
      { key: "calendar.monthView", en: "Month View", ar: "عرض شهري", category: "calendar" },
      { key: "calendar.today", en: "Today", ar: "اليوم", category: "calendar" },
      { key: "calendar.previousWeek", en: "Previous Week", ar: "الأسبوع السابق", category: "calendar" },
      { key: "calendar.nextWeek", en: "Next Week", ar: "الأسبوع القادم", category: "calendar" },
      { key: "calendar.previousMonth", en: "Previous Month", ar: "الشهر السابق", category: "calendar" },
      { key: "calendar.nextMonth", en: "Next Month", ar: "الشهر القادم", category: "calendar" },
    ];

    try {
      await bulkImport({
        translations: arabicTranslations,
        userId: currentUserId as Id<"users">,
      });
      success("Translations imported successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to import translations");
    }
  };

  if (translations === undefined || (currentUserId && currentUser === undefined)) {
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
          <p className="text-slate-600 mb-4">You need admin privileges to manage translations.</p>
          <p className="text-sm text-slate-500 mb-4">
            Your current role: <strong>{currentUser?.role || "unknown"}</strong>
          </p>
          <Link href="/dashboard">
            <Button variant="gradient">Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Status Banner - Remove in production */}
      {currentUser && (
        <Card padding="sm" className="bg-blue-50 border-blue-200">
          <div className="text-xs text-slate-600">
            <strong>Status:</strong> User ID: {currentUserId ? "✓" : "✗"} | 
            Admin: {isAdmin ? "✓ Yes" : "✗ No"} | 
            Role: {currentUser.role || "unknown"} |
            Translations loaded: {translations ? translations.length : "loading..."}
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Translation Management</h1>
          <p className="text-sm text-slate-600 mt-1">Manage application translations for English and Arabic</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBulkImport}>
            Import Default Translations
          </Button>
          <Button variant="gradient" onClick={() => setShowAddForm(true)}>
            + Add Translation
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by key or translation..."
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: "all", label: "All Categories" },
                ...categories.map((cat) => ({ value: cat, label: cat })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Add Translation Form */}
      {showAddForm && (
        <Card padding="md" className="border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Add New Translation</h2>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewTranslation({ key: "", en: "", ar: "", category: "" });
              }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <Input
              label="Translation Key"
              value={newTranslation.key}
              onChange={(e) => setNewTranslation({ ...newTranslation, key: e.target.value })}
              placeholder="e.g., dashboard.title"
            />
            <Input
              label="Category"
              value={newTranslation.category}
              onChange={(e) => setNewTranslation({ ...newTranslation, category: e.target.value })}
              placeholder="e.g., dashboard, common, forms"
            />
            <Textarea
              label="English Translation"
              value={newTranslation.en}
              onChange={(e) => setNewTranslation({ ...newTranslation, en: e.target.value })}
              placeholder="English text..."
              rows={2}
            />
            <Textarea
              label="Arabic Translation"
              value={newTranslation.ar}
              onChange={(e) => setNewTranslation({ ...newTranslation, ar: e.target.value })}
              placeholder="النص العربي..."
              rows={2}
            />
            <div className="flex gap-3">
              <Button 
                variant="gradient" 
                onClick={handleAdd}
                disabled={!isAdmin || !currentUserId}
              >
                Add Translation
              </Button>
              <Button variant="outline" onClick={() => {
                setShowAddForm(false);
                setNewTranslation({ key: "", en: "", ar: "", category: "" });
              }}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Translations List */}
      <Card padding="md">
        <div className="space-y-4">
          {filteredTranslations.length > 0 ? (
            filteredTranslations.map((translation) => (
              <div
                key={translation.key}
                className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{translation.key}</h3>
                      {translation.category && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                          {translation.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(translation)}
                  >
                    Edit
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* English */}
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600 uppercase">English</span>
                      {translation.en && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(translation.en._id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                    {editingKey === translation.key && editingLanguage === "en" ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editForm.en}
                          onChange={(e) => setEditForm({ ...editForm, en: e.target.value })}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit("en")}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingKey(null);
                              setEditingLanguage("en");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-900">
                        {translation.en?.value || <span className="text-slate-400 italic">Not translated</span>}
                      </p>
                    )}
                  </div>

                  {/* Arabic */}
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600 uppercase">Arabic</span>
                      {translation.ar && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(translation.ar._id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                    {editingKey === translation.key && editingLanguage === "ar" ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editForm.ar}
                          onChange={(e) => setEditForm({ ...editForm, ar: e.target.value })}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit("ar")}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingKey(null);
                              setEditingLanguage("ar");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-900" dir="rtl">
                        {translation.ar?.value || <span className="text-slate-400 italic">Not translated</span>}
                      </p>
                    )}
                  </div>
                </div>

                {editingKey === translation.key && (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingLanguage("en");
                        setEditForm({
                          key: translation.key,
                          en: translation.en?.value || "",
                          ar: translation.ar?.value || "",
                          category: translation.category || "",
                        });
                      }}
                    >
                      Edit English
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingLanguage("ar");
                        setEditForm({
                          key: translation.key,
                          en: translation.en?.value || "",
                          ar: translation.ar?.value || "",
                          category: translation.category || "",
                        });
                      }}
                    >
                      Edit Arabic
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingKey(null);
                        setEditingLanguage("en");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <span className="text-4xl mb-3 block">🌐</span>
              <p className="text-sm">No translations found</p>
              <Button
                variant="outline"
                onClick={handleBulkImport}
                className="mt-4"
              >
                Import Default Translations
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
