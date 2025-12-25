import { useState, useEffect } from "react";
import { Lock, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PinLockScreenProps {
  onUnlock: () => void;
  userId: string;
}

const PinLockScreen = ({ onUnlock, userId }: PinLockScreenProps) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);

  useEffect(() => {
    if (isLocked && lockTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setLockTimeRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (lockTimeRemaining === 0 && isLocked) {
      setIsLocked(false);
      setAttempts(0);
    }
  }, [isLocked, lockTimeRemaining]);

  const handleNumberPress = (num: string) => {
    if (isLocked || pin.length >= 6) return;
    setPin((prev) => prev + num);
    setError("");
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  // Simple hash function for PIN (for demo - in production use bcrypt on server)
  const hashPin = (pin: string): string => {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  };

  const verifyPin = async () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    const pinHash = hashPin(pin);
    
    const { data, error: fetchError } = await supabase
      .from("user_pins")
      .select("pin_hash")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      toast.error("Failed to verify PIN");
      return;
    }

    if (data.pin_hash === pinHash) {
      onUnlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin("");
      
      if (newAttempts >= 5) {
        setIsLocked(true);
        setLockTimeRemaining(30);
        setError("Too many attempts. Please wait 30 seconds.");
      } else {
        setError(`Incorrect PIN. ${5 - newAttempts} attempts remaining.`);
      }
    }
  };

  useEffect(() => {
    if (pin.length === 6) {
      verifyPin();
    }
  }, [pin]);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Enter PIN</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your PIN to unlock the app
          </p>
        </div>

        {/* PIN dots */}
        <div className="flex gap-3 my-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < pin.length
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {isLocked && (
          <p className="text-sm text-warning text-center">
            Try again in {lockTimeRemaining} seconds
          </p>
        )}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <Button
              key={num}
              variant="secondary"
              className="h-14 text-xl font-medium"
              onClick={() => handleNumberPress(num)}
              disabled={isLocked}
            >
              {num}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="h-14 text-muted-foreground"
            onClick={handleClear}
            disabled={isLocked}
          >
            Clear
          </Button>
          <Button
            variant="secondary"
            className="h-14 text-xl font-medium"
            onClick={() => handleNumberPress("0")}
            disabled={isLocked}
          >
            0
          </Button>
          <Button
            variant="ghost"
            className="h-14"
            onClick={handleDelete}
            disabled={isLocked}
          >
            <Delete size={20} />
          </Button>
        </div>

        <Button
          variant="default"
          className="w-full max-w-[280px] mt-4"
          onClick={verifyPin}
          disabled={pin.length < 4 || isLocked}
        >
          Unlock
        </Button>
      </div>
    </div>
  );
};

export default PinLockScreen;
