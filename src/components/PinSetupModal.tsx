import { useState } from "react";
import { Lock, Delete, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PinSetupModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  isChangingPin?: boolean;
}

const PinSetupModal = ({ open, onClose, userId, isChangingPin = false }: PinSetupModalProps) => {
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNumberPress = (num: string) => {
    if (step === "create" && pin.length < 6) {
      setPin((prev) => prev + num);
      setError("");
    } else if (step === "confirm" && confirmPin.length < 6) {
      setConfirmPin((prev) => prev + num);
      setError("");
    }
  };

  const handleDelete = () => {
    if (step === "create") {
      setPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (step === "create") {
      setPin("");
    } else {
      setConfirmPin("");
    }
  };

  // Simple hash function for PIN
  const hashPin = (pin: string): string => {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  };

  const handleContinue = () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    setStep("confirm");
  };

  const handleSave = async () => {
    if (confirmPin !== pin) {
      setError("PINs do not match");
      setConfirmPin("");
      return;
    }

    setLoading(true);
    const pinHash = hashPin(pin);

    try {
      if (isChangingPin) {
        const { error } = await supabase
          .from("user_pins")
          .update({ pin_hash: pinHash })
          .eq("user_id", userId);

        if (error) throw error;
        toast.success("PIN updated successfully");
      } else {
        const { error } = await supabase
          .from("user_pins")
          .insert({ user_id: userId, pin_hash: pinHash });

        if (error) throw error;
        toast.success("PIN set successfully");
      }
      
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save PIN");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPin("");
    setConfirmPin("");
    setStep("create");
    setError("");
    onClose();
  };

  const currentPin = step === "create" ? pin : confirmPin;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-popover border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Lock className="text-primary" size={20} />
            {isChangingPin ? "Change PIN" : "Set Up PIN"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            {step === "create" 
              ? "Create a 4-6 digit PIN to protect your account"
              : "Confirm your PIN"
            }
          </p>

          {/* PIN dots */}
          <div className="flex gap-3 my-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border-2 transition-all ${
                  i < currentPin.length
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <Button
                key={num}
                variant="secondary"
                className="h-12 text-lg font-medium"
                onClick={() => handleNumberPress(num)}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="ghost"
              className="h-12 text-xs text-muted-foreground"
              onClick={handleClear}
            >
              Clear
            </Button>
            <Button
              variant="secondary"
              className="h-12 text-lg font-medium"
              onClick={() => handleNumberPress("0")}
            >
              0
            </Button>
            <Button
              variant="ghost"
              className="h-12"
              onClick={handleDelete}
            >
              <Delete size={18} />
            </Button>
          </div>

          <div className="flex gap-2 w-full max-w-[240px] mt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleClose}
            >
              <X size={16} className="mr-1" />
              Cancel
            </Button>
            {step === "create" ? (
              <Button
                className="flex-1"
                onClick={handleContinue}
                disabled={pin.length < 4}
              >
                Continue
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={confirmPin.length < 4 || loading}
              >
                <Check size={16} className="mr-1" />
                {loading ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinSetupModal;
