import { useState, useEffect, useRef } from "react";
import { Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { showLocalNotification, initializeLocalNotifications } from "@/services/localNotificationService";

interface Notification {
  id: string;
  user_id: string | null;
  action_user_email: string;
  action: string;
  item_name: string;
  details: string | null;
  is_read: boolean;
  created_at: string;
}

interface UserProfile {
  id: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
}

const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodHfvHFMXYqy2vGwb0M8YIGWq62xvMjc8/z0287BxMvY4e/0+f/84s62ppSKfXByeIGHi4uIe3RwdYSXqLvJ2O35/PXm1r+nlIB0eH6Bjop+bV9bboGVqLnG1eX2/Pns2rqjjnlub3V/hYeBdGpka3qHkpulr7rE0d/t+f/+8+DCq5R/b2hsdn+JlaCpsLnCzdnm8fj8+/Xr4NTHvLSvq6uusbW5vsXM1d3l7PP3+fv7+Pb18/Dv7u7v7/Dw8fHy8/P09fX29/f4+Pn5+fr6+vr6+vr6+vr6+fn5+Pj39/b29fX09PPz8vLx8fDw8O/v7u7t7ezr6+rp6ejn5uXk4+Lg397d3NvZ2NbV09LQzszKyMbEwL68uri1s7CuqqellpCHf3ZtY1lRSUA3MC0qKCcmJygrLjM5QEhRWmRtdn+HkJqjrLO5vsLGycvMzMvJyMbEwr+9uri1sq+sqKSgm5aRjIeCfnh0cG1qaGZlZGVmaWxwdHl9goeKjpGTlpeYmZqam5ucnJ2dnZycm5uampqZmJiXlpWUk5KRkI+OjYyLiomIh4aFhIOCgYCAf359fHt6eXl4eHh4eHh4eHl5enp7fH1+f4CCg4SFhoeIiYqLjI2OkJGSlJWXmJmam5ydnp+goaKjpKWmp6ipqqutr7CxsrO0tba3uLm6u7y9vsDBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8=";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;

    // Correctly await initialization
    const setup = async () => {
      await initializeLocalNotifications();
      await fetchProfiles();
      await fetchNotifications();
    };
    
    setup();
    const unsubscribe = subscribeToNotifications();

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (open && unreadCount > 0) {
      markAllAsRead();
    }
  }, [open]);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.log("In-app sound suppressed:", err);
      });
    }
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email, avatar_url");

    if (!error && data) {
      const profileMap = new Map<string, UserProfile>();
      data.forEach((profile) => {
        profileMap.set(profile.email, profile);
      });
      setUserProfiles(profileMap);
    }
  };

  const getDisplayName = (email: string): string => {
    const profile = userProfiles.get(email);
    if (profile?.username) return profile.username;
    return email.split("@")[0] || "User";
  };

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        async (payload) => {
          const { data: { user } } = await supabase.auth.getUser();
          const newNotification = payload.new as Notification;
          
          if (user && newNotification.user_id === user.id) {
            setNotifications((prev) => [newNotification, ...prev].slice(0, 20));
            setUnreadCount((prev) => prev + 1);
            playNotificationSound();
            
            // Fetch username directly if not in cache to ensure native notification title is correct
            let senderName = getDisplayName(newNotification.action_user_email);
            if (senderName === newNotification.action_user_email.split("@")[0]) {
               const { data: profile } = await supabase
                 .from("profiles")
                 .select("username")
                 .eq("email", newNotification.action_user_email)
                 .maybeSingle();
               if (profile?.username) senderName = profile.username;
            }

            const title = `${senderName} ${newNotification.action} ${newNotification.item_name}`;
            const body = newNotification.details || `Inventory update: ${newNotification.item_name}`;
            
            console.log("Triggering local notification:", { title, body, notificationId: newNotification.id });
            
            // Trigger local notification for Android notification bar
            await showLocalNotification(title, body, {
              type: "notification",
              notificationId: newNotification.id,
            }).catch(err => {
              console.error('Error showing local notification:', err);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    }
  };

  const clearAllNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
    if (!error) {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover border-border" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-foreground">Notifications</h4>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive h-7 px-2" onClick={clearAllNotifications}>
              Clear all
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">No notifications yet</div>
          ) : (
            notifications.map((notification) => {
              const displayName = getDisplayName(notification.action_user_email);
              return (
                <div key={notification.id} className={`p-3 border-b border-border last:border-0 group relative ${!notification.is_read ? "bg-secondary/50" : ""}`}>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => deleteNotification(notification.id)}>
                    <Trash2 size={14} />
                  </Button>
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {displayName[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{displayName}</span>{" "}
                        <span className={notification.action === "added" ? "text-success" : notification.action === "removed" ? "text-destructive" : "text-primary"}>
                          {notification.action}
                        </span>{" "}
                        <span className="font-medium">{notification.item_name}</span>
                      </p>
                      {notification.details && <p className="text-xs text-muted-foreground mt-1">{notification.details}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
