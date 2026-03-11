import { useState, useEffect, useRef } from "react";

interface UseBackgroundScrapingOptions {
  onStatusChange?: (
    status: "IDLE" | "PENDING" | "COMPLETED" | "FAILED",
  ) => void;
  onProgress?: (progress: number) => void;
  pollingInterval?: number;
}

export const useBackgroundScraping = ({
  onStatusChange,
  onProgress,
  pollingInterval = 3000,
}: UseBackgroundScrapingOptions = {}) => {
  const [isTabActive, setIsTabActive] = useState(true);
  const [lastPollTime, setLastPollTime] = useState(Date.now());
  const pollingRef = useRef<number | null>(null);
  const visibilityRef = useRef<number | null>(null);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isActive = !document.hidden;
      setIsTabActive(isActive);

      if (isActive) {
        // Tab became active - resume polling immediately
        console.log("[BackgroundScraping] Tab activated - resuming polling");
        setLastPollTime(Date.now());
      } else {
        // Tab became inactive - set up backup polling
        console.log(
          "[BackgroundScraping] Tab deactivated - enabling backup polling",
        );
      }
    };

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also listen for page focus events
    window.addEventListener("focus", handleVisibilityChange);
    window.addEventListener("blur", () => setIsTabActive(false));

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("blur", () => setIsTabActive(false));
    };
  }, []);

  // Enhanced polling with tab switching awareness
  const startPolling = (
    listingId: string,
    onComplete: (result: any) => void,
  ) => {
    let pollCount = 0;
    const maxPolls = 60; // Maximum 3 minutes (60 * 3s)

    const poll = async () => {
      try {
        pollCount++;

        // Always poll, but log tab status
        console.log(
          `[BackgroundScraping] Poll #${pollCount} (Tab active: ${isTabActive})`,
        );

        const response = await fetch(`/api/products/track/${listingId}/status`);
        const data = await response.json();

        // Update progress
        const progress = Math.min((pollCount / 20) * 100, 75); // Cap at 75% until completion
        onProgress?.(progress);

        if (data.status === "COMPLETED") {
          onStatusChange?.("COMPLETED");
          onComplete(data);
          stopPolling();
        } else if (data.status === "FAILED") {
          onStatusChange?.("FAILED");
          stopPolling();
        } else if (pollCount >= maxPolls) {
          // Timeout
          onStatusChange?.("FAILED");
          stopPolling();
        }

        setLastPollTime(Date.now());
      } catch (error) {
        console.error("[BackgroundScraping] Polling error:", error);
        // Continue polling even on error
      }
    };

    // Start immediate poll
    poll();

    // Set up regular polling
    pollingRef.current = window.setInterval(poll, pollingInterval);

    // Set up backup polling for inactive tabs (longer interval)
    if (!isTabActive) {
      visibilityRef.current = window.setInterval(poll, pollingInterval * 2);
    }
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (visibilityRef.current) {
      clearInterval(visibilityRef.current);
      visibilityRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    isTabActive,
    startPolling,
    stopPolling,
    lastPollTime,
  };
};
