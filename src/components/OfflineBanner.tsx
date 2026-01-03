import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfflineBannerProps {
  isFromCache: boolean;
  pendingActionsCount: number;
  onSync?: () => void;
  isSyncing?: boolean;
}

const OfflineBanner = ({ isFromCache, pendingActionsCount, onSync, isSyncing }: OfflineBannerProps) => {
  if (!isFromCache && pendingActionsCount === 0) return null;

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <WifiOff size={18} className="text-warning" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {isFromCache ? "Viewing offline data" : "Changes pending sync"}
            </p>
            {pendingActionsCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {pendingActionsCount} action{pendingActionsCount !== 1 ? "s" : ""} will sync when online
              </p>
            )}
          </div>
        </div>
        {onSync && navigator.onLine && pendingActionsCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="text-xs"
          >
            <RefreshCw size={14} className={`mr-1 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default OfflineBanner;
