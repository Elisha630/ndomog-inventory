import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import OfflineIndicator from "./components/OfflineIndicator";
import InstallPrompt from "./components/InstallPrompt";
import UpdateNotification from "./components/UpdateNotification";
import PinLockScreen from "./components/PinLockScreen";
import { initTextSize } from "./hooks/useTextSize";
import { initTheme } from "./hooks/useTheme";
import { initializePushNotifications } from "./services/pushNotificationService";

// Initialize settings on app load
initTextSize();
initTheme();

const queryClient = new QueryClient();

const AppContent = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingPin, setCheckingPin] = useState(true);

  useEffect(() => {
    const checkPinLock = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setCheckingPin(false);
        return;
      }

      setUserId(session.user.id);

      // Check if user has PIN enabled
      const { data } = await supabase
        .from("user_pins")
        .select("is_enabled")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data?.is_enabled) {
        setIsLocked(true);
      }
      setCheckingPin(false);
    };

    checkPinLock();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setUserId(session.user.id);
        // Initialize push notifications on sign in
        initializePushNotifications();
        // Check PIN on sign in
        supabase
          .from("user_pins")
          .select("is_enabled")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.is_enabled) {
              setIsLocked(true);
            }
          });
      } else if (event === "SIGNED_OUT") {
        setIsLocked(false);
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checkingPin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isLocked && userId) {
    return <PinLockScreen onUnlock={() => setIsLocked(false)} userId={userId} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineIndicator />
      <InstallPrompt />
      <UpdateNotification />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
