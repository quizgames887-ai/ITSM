"use client";

import { useEffect, useState } from "react";

interface ConfettiProps {
  show: boolean;
  duration?: number;
}

export function Confetti({ show, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    left: number;
    delay: number;
    duration: number;
    color: string;
  }>>([]);

  useEffect(() => {
    if (show) {
      const colors = [
        "#3b82f6", // blue
        "#8b5cf6", // purple
        "#10b981", // green
        "#f59e0b", // amber
        "#ef4444", // red
        "#ec4899", // pink
      ];

      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 500,
        duration: 1000 + Math.random() * 1000,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));

      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!show || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${particle.left}%`,
            backgroundColor: particle.color,
            top: "-10px",
            animation: `fall ${particle.duration}ms ease-out ${particle.delay}ms forwards`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
