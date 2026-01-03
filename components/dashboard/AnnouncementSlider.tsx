"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Announcement {
  _id: string;
  title: string;
  content: string;
  buttonText?: string | null;
  buttonLink?: string | null;
  imageUrl?: string | null;
}

interface AnnouncementSliderProps {
  announcements: Announcement[];
}

export function AnnouncementSlider({ announcements }: AnnouncementSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Auto-play functionality
  useEffect(() => {
    if (announcements.length <= 1 || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000); // Change slide every 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [announcements.length, isPaused]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsPaused(false), 10000);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  const handleButtonClick = (announcement: Announcement) => {
    if (announcement.buttonLink) {
      if (announcement.buttonLink.startsWith("http")) {
        window.open(announcement.buttonLink, "_blank");
      } else {
        router.push(announcement.buttonLink);
      }
    }
  };

  // If no announcements, show default welcome message
  if (announcements.length === 0) {
    return (
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 lg:p-6 h-full relative overflow-hidden min-h-[200px]">
        <div className="relative z-10 h-full flex flex-col">
          <span className="text-xs text-teal-200 font-medium">Announcement</span>
          <h3 className="text-lg lg:text-xl font-bold text-white mt-2 mb-3">
            Welcome to Palmware
          </h3>
          <p className="text-xs lg:text-sm text-teal-100 mb-4 leading-relaxed line-clamp-3 flex-1">
            Your centralized IT Service Management platform for efficient ticket handling and support.
          </p>
          <Link href="/tickets">
            <button className="px-3 lg:px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-xs lg:text-sm font-medium rounded-lg transition-colors self-start mt-2">
              View Tickets
            </button>
          </Link>
        </div>
        {/* Decorative illustration */}
        <div className="absolute right-0 bottom-0 w-24 lg:w-32 h-24 lg:h-32 opacity-20">
          <div className="w-full h-full bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full transform translate-x-8 translate-y-8"></div>
        </div>
        <div className="absolute right-6 lg:right-8 top-6 lg:top-8 w-12 lg:w-16 h-12 lg:h-16 opacity-30">
          <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-400 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Single announcement - no slider needed
  if (announcements.length === 1) {
    const announcement = announcements[0];
    return (
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 lg:p-6 h-full relative overflow-hidden min-h-[200px]">
        {/* Image if available */}
        {announcement.imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img
              src={announcement.imageUrl}
              alt={announcement.title}
              className="w-full h-48 object-cover"
            />
          </div>
        )}
        <div className="relative z-10 h-full flex flex-col">
          <span className="text-xs text-teal-200 font-medium">Announcement</span>
          <h3 className="text-lg lg:text-xl font-bold text-white mt-2 mb-3">
            {announcement.title}
          </h3>
          <p className="text-xs lg:text-sm text-teal-100 mb-4 leading-relaxed line-clamp-3 flex-1">
            {announcement.content}
          </p>
          {announcement.buttonText && (
            <button 
              onClick={() => handleButtonClick(announcement)}
              className="px-3 lg:px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-xs lg:text-sm font-medium rounded-lg transition-colors self-start mt-2"
            >
              {announcement.buttonText}
            </button>
          )}
        </div>
        {/* Decorative illustration - only show if no image */}
        {!announcement.imageUrl && (
          <>
            <div className="absolute right-0 bottom-0 w-24 lg:w-32 h-24 lg:h-32 opacity-20">
              <div className="w-full h-full bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full transform translate-x-8 translate-y-8"></div>
            </div>
            <div className="absolute right-6 lg:right-8 top-6 lg:top-8 w-12 lg:w-16 h-12 lg:h-16 opacity-30">
              <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-400 rounded-full"></div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Multiple announcements - show slider
  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 lg:p-6 h-full relative overflow-hidden min-h-[200px]">
      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
        aria-label="Previous announcement"
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={goToNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
        aria-label="Next announcement"
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Image if available */}
      {currentAnnouncement.imageUrl && (
        <div className="mb-3 rounded-lg overflow-hidden">
          <img
            src={currentAnnouncement.imageUrl}
            alt={currentAnnouncement.title}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* Slide Content */}
      <div className="relative z-10 h-full flex flex-col pl-10 pr-10">
        <span className="text-xs text-teal-200 font-medium">Announcement</span>
        <h3 className="text-lg lg:text-xl font-bold text-white mt-2 mb-3">
          {currentAnnouncement.title}
        </h3>
        <p className="text-xs lg:text-sm text-teal-100 mb-4 leading-relaxed line-clamp-3 flex-1">
          {currentAnnouncement.content}
        </p>
        {currentAnnouncement.buttonText && (
          <button 
            onClick={() => handleButtonClick(currentAnnouncement)}
            className="px-3 lg:px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-xs lg:text-sm font-medium rounded-lg transition-colors self-start mt-2"
          >
            {currentAnnouncement.buttonText}
          </button>
        )}
      </div>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {announcements.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex
                ? "bg-white w-6"
                : "bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to announcement ${index + 1}`}
          />
        ))}
      </div>

      {/* Decorative illustration - only show if no image */}
      {!currentAnnouncement.imageUrl && (
        <>
          <div className="absolute right-0 bottom-0 w-24 lg:w-32 h-24 lg:h-32 opacity-20">
            <div className="w-full h-full bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full transform translate-x-8 translate-y-8"></div>
          </div>
          <div className="absolute right-6 lg:right-8 top-6 lg:top-8 w-12 lg:w-16 h-12 lg:h-16 opacity-30">
            <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-400 rounded-full"></div>
          </div>
        </>
      )}
    </div>
  );
}
