import { Download, X, RefreshCw } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Button } from "@/components/ui/button";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";

const UpdateNotification = () => {
  const {
    updateAvailable,
    latestVersion,
    currentVersion,
    releaseNotes,
    downloadUrl,
    isLoading,
    dismissUpdate,
    isDismissed,
    checkForUpdates,
  } = useUpdateCheck();

  const handleDownload = async () => {
    if (!downloadUrl) return;

    const isNative = Capacitor.isNativePlatform();
    const baseUrl = isNative ? "https://ndomog.lovable.app" : window.location.origin;
    const fullUrl = baseUrl + downloadUrl;

    if (isNative) {
      await Browser.open({ url: fullUrl });
    } else {
      window.open(fullUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Don't show if no update or dismissed
  if (!updateAvailable || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-popover border border-border rounded-lg shadow-xl p-4 animate-in slide-in-from-bottom-4">
      <button
        onClick={dismissUpdate}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss update notification"
      >
        <X size={16} />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <RefreshCw className="text-blue-500" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Update Available</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            v{currentVersion} → v{latestVersion}
          </p>
          {releaseNotes && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {releaseNotes}
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleDownload}
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              <Download size={16} className="mr-2" />
              Update
            </Button>
            <Button
              onClick={() => checkForUpdates()}
              size="sm"
              variant="outline"
              disabled={isLoading}
              className="px-3"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
