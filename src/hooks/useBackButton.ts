import { useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type CloseHandler = () => boolean;

// Global registry of close handlers (modals, sheets, etc.)
const closeHandlers = new Map<string, CloseHandler>();

export const registerCloseHandler = (id: string, handler: CloseHandler) => {
  closeHandlers.set(id, handler);
  return () => closeHandlers.delete(id);
};

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
    
    return false;
  }, [onBack, location.pathname, navigate]);

  useEffect(() => {
    // Push a state to history when component mounts
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
        // Re-push state so back button works again
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
