import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showApkDownload, setShowApkDownload] = useState(false);
  const [latestDownloadUrl, setLatestDownloadUrl] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  // Check if running in native app
  const isNativeApp = Capacitor.isNativePlatform();

  // Fetch the latest release URL from database
  useEffect(() => {
    const fetchLatestRelease = async () => {
      const { data, error } = await supabase
        .from("app_releases")
        .select("download_url, version")
        .eq("is_published", true)
        .order("release_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setLatestDownloadUrl(data.download_url);
        setLatestVersion(data.version);
      }
    };

    fetchLatestRelease();
  }, []);

  useEffect(() => {
    // Don't show anything in native app
    if (isNativeApp) return;

    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Always show APK download option after a short delay (don't use dismissal timer)
    setTimeout(() => setShowApkDownload(true), 2000);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isNativeApp]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  const handleApkDismiss = () => {
    setShowApkDownload(false);
    // Don't persist dismissal - banner will reappear on next visit
  };

  const handleApkDownload = () => {
    // Use the latest download URL from database, fallback to static file
    const downloadUrl = latestDownloadUrl || '/downloads/Ndomog.apk';
    const fileName = latestVersion ? `Ndomog-${latestVersion}.apk` : 'Ndomog.apk';
    
    // Create a proper download link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Hide the banner after download starts
    setShowApkDownload(false);
  };

  // Don't show anything in native app
  if (isNativeApp) return null;

  return (
    <>
      {/* APK Download Banner */}
      {showApkDownload && !isInstalled && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-popover border border-border rounded-lg shadow-xl p-4 animate-in slide-in-from-bottom-4">
          <button
            onClick={handleApkDismiss}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Smartphone className="text-green-500" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Get Android App</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Download the native Android app for the best experience
              </p>
              <Button
                onClick={handleApkDownload}
                size="sm"
                className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Download size={16} className="mr-2" />
                Download APK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Prompt */}
      {!isInstalled && showPrompt && deferredPrompt && !showApkDownload && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-popover border border-border rounded-lg shadow-xl p-4 animate-in slide-in-from-bottom-4">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Download className="text-primary" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Install App</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Install Ndomog for quick access and offline use
              </p>
              <Button
                onClick={handleInstall}
                size="sm"
                className="mt-3 w-full bg-primary text-primary-foreground"
              >
                Install Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPrompt;
