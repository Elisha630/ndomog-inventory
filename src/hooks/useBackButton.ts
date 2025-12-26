import { useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

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
    
    return false;
  }, [onBack, location.pathname, navigate]);

  useEffect(() => {
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
        
        // If not on home page, navigate to home
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        } else {
          // Exit the app if on home page with no modals open
          App.exitApp();
        }
      });
    }
  }, []);

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

