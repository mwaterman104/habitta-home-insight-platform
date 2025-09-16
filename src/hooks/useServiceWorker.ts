import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const useServiceWorker = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if service workers are supported
    if ("serviceWorker" in navigator) {
      setIsSupported(true);
      registerServiceWorker();
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      toast({
        title: "App Installed!",
        description: "Habitta has been installed on your device.",
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [toast]);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      
      // Check if there's a waiting service worker
      if (registration.waiting) {
        setUpdateAvailable(true);
      }

      // Listen for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        }
      });

      console.log("Service Worker registered:", registration);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  };

  const installApp = async () => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error("App installation failed:", error);
      return false;
    }
  };

  const updateApp = () => {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  };

  const isInstallable = !!deferredPrompt;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  return {
    isSupported,
    isInstalled: isInstalled || isStandalone,
    isInstallable,
    updateAvailable,
    installApp,
    updateApp,
  };
};