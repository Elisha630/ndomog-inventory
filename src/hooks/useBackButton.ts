import { useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";

type CloseHandler = () => boolean;

// Global registry of close handlers (modals, sheets, etc.)
const closeHandlers = new Map<string, CloseHandler>();

export const registerCloseHandler = (id: string, handler: CloseHandler) => {
  closeHandlers.set(id, handler);
  return () => closeHandlers.delete(id);
};

// Initialize Capacitor back button handler once
let capacitorListenerRegistered = false;

export const useBackButton = (onBack?: () => void) => {
  const hasHandledRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    // Try to close any open modal first
    for (const [, handler] of closeHandlers) {
      if (handler()) {
        return true; // Modal was closed
      }
    }
    
    // No modal was open, execute custom back action
    if (onBack) {
      onBack();
      return true;
    }
    
    // If not on home page, navigate to home
    if (location.pathname !== "/") {
      navigate("/");
      return true;
    }
    
    // Check if we can go back in browser history
    if (window.history.length > 1) {
      window.history.back();
      return true;
    }
    
    return false;
  }, [onBack, location.pathname, navigate]);

  useEffect(() => {
    // Register Capacitor back button handler only once
    if (!capacitorListenerRegistered) {
      capacitorListenerRegistered = true;
      
      App.addListener("backButton", ({ canGoBack }) => {
        // Try to close any open modal first
        for (const [, handler] of closeHandlers) {
          if (handler()) {
            return; // Modal was closed, don't exit app
          }
        }
        
        // Check if we can navigate back
        if (canGoBack) {
          window.history.back();
        } else if (window.location.pathname !== "/") {
          // Navigate to home if not already there
          window.location.href = "/";
        } else {
          // Exit the app if on home page with no modals open
          App.exitApp();
        }
      });
    }
  }, []);

  // Also handle web browser popstate for PWA/web
  useEffect(() => {
    const pushState = () => {
      window.history.pushState({ backHandler: true }, "");
    };

    const handlePopState = (event: PopStateEvent) => {
      if (hasHandledRef.current) {
        hasHandledRef.current = false;
        return;
      }

      const handled = handleBack();
      if (handled) {
        hasHandledRef.current = true;
        pushState();
      }
    };

    pushState();
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [handleBack]);

  return { handleBack };
};

// Hook for modals to register themselves
export const useModalBackHandler = (isOpen: boolean, onClose: () => void, id: string) => {
  useEffect(() => {
    if (isOpen) {
      const unregister = registerCloseHandler(id, () => {
        onClose();
        return true;
      });
      return () => {
        unregister();
      };
    }
  }, [isOpen, onClose, id]);
};
