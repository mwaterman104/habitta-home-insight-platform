import { useEffect, useState, ReactNode } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const isMobile = useIsMobile();

  const threshold = 80;
  const maxPull = 120;

  const handleTouchStart = (e: TouchEvent) => {
    if (!isMobile || isRefreshing || window.scrollY > 0) return;
    setStartY(e.touches[0].clientY);
    setIsPulling(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling || !isMobile || window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, Math.min(maxPull, currentY - startY));
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || !isMobile) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  };

  useEffect(() => {
    if (!isMobile) return;

    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isPulling, pullDistance, isRefreshing, isMobile]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Pull to refresh indicator */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur transition-all duration-300 ${
          pullDistance > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
          transform: `translateY(${isRefreshing ? 0 : -20}px)`,
        }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          {isRefreshing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Refreshing...</span>
            </>
          ) : (
            <>
              <RotateCcw 
                className={`h-5 w-5 transition-transform duration-200 ${
                  shouldTrigger ? 'rotate-180 text-primary' : ''
                }`}
                style={{
                  transform: `rotate(${pullProgress * 180}deg)`,
                }}
              />
              <span className="text-sm font-medium">
                {shouldTrigger ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};