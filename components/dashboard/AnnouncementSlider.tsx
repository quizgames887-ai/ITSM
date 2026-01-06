"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
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

  const handleShowMore = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailsModal(true);
    setIsPaused(true); // Pause auto-play when modal is open
  };

  // Helper function to check if content should show "More" button
  // Always show if content exists (we're applying line-clamp-3 to all content)
  const isContentTruncated = (content: string) => {
    // Always show "More" button if content exists and is not empty
    // Since we're applying line-clamp-3, users can always see more details
    return content && content.trim().length > 0;
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
          <p className="text-xs lg:text-sm text-teal-100 mb-4 leading-relaxed line-clamp-3">
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
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 lg:p-6 h-full relative overflow-visible min-h-[200px]">
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
          <div className="mb-4 flex-1 min-h-0">
            <p 
              className="text-xs lg:text-sm text-teal-100 leading-relaxed"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {announcement.content}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-4">
            <button 
              onClick={() => handleShowMore(announcement)}
              className="px-4 py-2.5 bg-white text-teal-600 hover:bg-teal-50 text-sm font-bold rounded-lg transition-colors shadow-xl z-30 relative border-2 border-teal-300"
              style={{ minWidth: '80px' }}
            >
              More...
            </button>
            {announcement.buttonText && (
              <button 
                onClick={() => handleButtonClick(announcement)}
                className="px-3 lg:px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-xs lg:text-sm font-medium rounded-lg transition-colors"
              >
                {announcement.buttonText}
              </button>
            )}
          </div>
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
    <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 lg:p-6 h-full relative overflow-visible min-h-[200px]">
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
      <div className="relative z-10 h-full flex flex-col pl-10 pr-10 pb-12">
        <span className="text-xs text-teal-200 font-medium">Announcement</span>
        <h3 className="text-lg lg:text-xl font-bold text-white mt-2 mb-3">
          {currentAnnouncement.title}
        </h3>
        <div className="mb-4 flex-1 min-h-0">
          <p 
            className="text-xs lg:text-sm text-teal-100 leading-relaxed"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentAnnouncement.content}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-4 mb-2">
          <button 
            onClick={() => handleShowMore(currentAnnouncement)}
            className="px-4 py-2.5 bg-white text-teal-600 hover:bg-teal-50 text-sm font-bold rounded-lg transition-colors shadow-xl z-30 relative border-2 border-teal-300"
            style={{ minWidth: '80px' }}
          >
            More...
          </button>
          {currentAnnouncement.buttonText && (
            <button 
              onClick={() => handleButtonClick(currentAnnouncement)}
              className="px-3 lg:px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-xs lg:text-sm font-medium rounded-lg transition-colors"
            >
              {currentAnnouncement.buttonText}
            </button>
          )}
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
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

      {/* Details Modal */}
      {showDetailsModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 sm:p-6 -m-4 sm:-m-6 mb-4 sm:mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {selectedAnnouncement.title}
                </h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedAnnouncement(null);
                    setIsPaused(false); // Resume auto-play
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Image if available */}
              {selectedAnnouncement.imageUrl && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={selectedAnnouncement.imageUrl}
                    alt={selectedAnnouncement.title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}

              {/* Full Content */}
              <div>
                <p className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedAnnouncement.content}
                </p>
              </div>

              {/* Action Button */}
              {selectedAnnouncement.buttonText && (
                <div className="pt-4 border-t border-slate-200">
                  <Button
                    variant="gradient"
                    onClick={() => {
                      handleButtonClick(selectedAnnouncement);
                      setShowDetailsModal(false);
                      setSelectedAnnouncement(null);
                      setIsPaused(false);
                    }}
                    className="w-full sm:w-auto"
                  >
                    {selectedAnnouncement.buttonText}
                  </Button>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedAnnouncement(null);
                    setIsPaused(false);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
