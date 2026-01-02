"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface UserAvatarProps {
  userId?: Id<"users"> | string | null;
  profilePictureId?: Id<"_storage"> | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showRing?: boolean;
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-xl",
};

const textSizeClasses = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

export function UserAvatar({
  userId,
  profilePictureId,
  name,
  size = "md",
  className = "",
  showRing = false,
}: UserAvatarProps) {
  // Get user data if userId is provided (to get profilePictureId)
  const user = useQuery(
    api.users.get,
    userId ? { id: userId as Id<"users"> } : "skip"
  );

  // Use profilePictureId from props or from user data
  const actualProfilePictureId = profilePictureId ?? user?.profilePictureId;
  
  // Get URL for the actual profile picture
  const finalProfilePictureUrl = useQuery(
    api.users.getProfilePictureUrl,
    actualProfilePictureId ? { storageId: actualProfilePictureId } : "skip"
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClass = sizeClasses[size];
  const ringClass = showRing ? "ring-2 ring-white ring-offset-2 ring-offset-slate-100" : "";

  if (finalProfilePictureUrl) {
    return (
      <div className={`${sizeClass} ${ringClass} rounded-full overflow-hidden flex-shrink-0 bg-slate-200 ${className}`}>
        <img
          src={finalProfilePictureUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `<span class="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-bold ${textSizeClasses[size]}">${getInitials(name)}</span>`;
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${ringClass} rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
