import { useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

type CloseHandler = () => boolean;
type NavigateFunction = (path: string) => void;

// Global registry of close handlers (modals, sheets, etc.)
const closeHandlers = new Map<string, CloseHandler>();

// Store the navigate function globally so the Capacitor listener can use React Router
let globalNavigate: NavigateFunction | null = null;
let currentPathname = "/";

export const registerCloseHandler = (id: string, handler: CloseHandler) => {
  closeHandlers.set(id, handler);
  return () => closeHandlers.delete(id);
};

// Initialize Capacitor back button handler once
let capacitorListenerRegistered = false;

export const useBackButton = (onBack?: () => void) => {
  const location = useLocation();
  const navigate = useNavigate();
  const onBackRef = useRef(onBack);
  
  // Keep ref updated - do this synchronously, not in useEffect
  onBackRef.current = onBack;

  // Update global state for Capacitor listener - combine into single effect
  useEffect(() => {
    globalNavigate = navigate;
    currentPathname = location.pathname;
    
    // Only register Capacitor back button handler on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    if (!capacitorListenerRegistered) {
      capacitorListenerRegistered = true;
      
      App.addListener("backButton", () => {
        // Try to close any open modal first
        for (const [, handler] of closeHandlers) {
          if (handler()) {
            return; // Modal was closed, don't exit app
          }
        }
        
        // Use React Router navigate instead of window.location to avoid full page reload
        if (currentPathname !== "/" && globalNavigate) {
          globalNavigate("/");
        } else if (currentPathname === "/") {
          // Exit the app if on home page with no modals open
          App.exitApp();
        }
      });
    }
  }, [navigate, location.pathname]);

  const handleBack = useCallback(() => {
    // Try to close any open modal first
    for (const [, handler] of closeHandlers) {
      if (handler()) {
        return true; // Modal was closed
      }
    }
    
    // No modal was open, execute custom back action
    if (onBackRef.current) {
      onBackRef.current();
      return true;
    }
    
    // If not on home page, navigate to home
    if (location.pathname !== "/") {
      navigate("/");
      return true;
    }
    
    return false;
  }, [location.pathname, navigate]);

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

