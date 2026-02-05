import React, { useRef, useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface VideoBackgroundProps {
  videoSrc: string;
  posterSrc?: string;
  overlayClassName?: string;
  children: React.ReactNode;
  className?: string;
}

function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return prefersReduced;
}

function useSlowConnection() {
  const [isSlow, setIsSlow] = useState(false);
  useEffect(() => {
    const conn = (navigator as any).connection;
    if (conn) {
      const check = () => {
        const type = conn.effectiveType;
        setIsSlow(type === '2g' || type === 'slow-2g');
      };
      check();
      conn.addEventListener?.('change', check);
      return () => conn.removeEventListener?.('change', check);
    }
  }, []);
  return isSlow;
}

export default function VideoBackground({
  videoSrc,
  posterSrc,
  overlayClassName = 'from-primary/50 via-background/40 to-background',
  children,
  className = '',
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const isMobile = useIsMobile();
  const prefersReduced = useReducedMotion();
  const isSlow = useSlowConnection();

  const showVideo = !isMobile && !prefersReduced && !isSlow && !videoError;

  useEffect(() => {
    if (showVideo && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked — fall back gracefully
        setVideoError(true);
      });
    }
  }, [showVideo]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Video layer */}
      {showVideo && (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="auto"
          poster={posterSrc}
          onCanPlayThrough={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000 ${
            videoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Animated gradient fallback (always rendered behind video) */}
      <div
        className="absolute inset-0 z-0 hero-gradient-fallback"
        aria-hidden="true"
      />

      {/* Brand overlay gradient */}
      <div
        className={`absolute inset-0 z-10 bg-gradient-to-b ${overlayClassName}`}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-20">{children}</div>
    </div>
  );
}
