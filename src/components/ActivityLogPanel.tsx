import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email: string;
  action: string;
  item_name: string;
  details: string | null;
  created_at: string;
  username?: string;
}

interface ActivityLogPanelProps {
  logs: ActivityLog[];
  userProfiles: Map<string, string>; // user_id -> username, avatar_<user_id> -> avatar_url
}

const ActivityLogPanel = ({ logs, userProfiles }: ActivityLogPanelProps) => {
  const getDisplayName = (log: ActivityLog) => {
    // Try to get username from profiles map using user_id
    if (log.user_id && userProfiles.has(log.user_id)) {
      return userProfiles.get(log.user_id)!;
    }
    // Fallback to email prefix
    return log.user_email.split("@")[0];
  };

  const getAvatarUrl = (log: ActivityLog) => {
    if (log.user_id) {
      return userProfiles.get(`avatar_${log.user_id}`) || null;
    }
    return null;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "added":
        return "text-success";
      case "removed":
        return "text-destructive";
      case "updated":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="stat-card mb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="text-muted-foreground" size={18} />
        <h2 className="font-semibold text-foreground">Activity Log</h2>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Clock className="w-12 h-12 text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {logs.map((log, index) => {
            const displayName = getDisplayName(log);
            const avatarUrl = getAvatarUrl(log);
            
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 text-sm animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {displayName[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground">
                    <span className="font-medium">{displayName}</span>
                    <span className={`mx-1 ${getActionColor(log.action)}`}>{log.action}</span>
                    <span className="font-medium">{log.item_name}</span>
                    {log.details && (
                      <span className="text-muted-foreground"> - {log.details}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityLogPanel;
