import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, ArrowLeft, Check, Loader2, LogOut, Shield, Fingerprint, AtSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import PinSetupModal from "@/components/PinSetupModal";
import { useBackButton } from "@/hooks/useBackButton";
import { biometricService, BiometryType } from "@/services/biometricService";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [showUsernameChange, setShowUsernameChange] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  // PIN settings
  const [hasPinEnabled, setHasPinEnabled] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [loadingPin, setLoadingPin] = useState(true);

  // Biometric settings
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryType>(BiometryType.NONE);

  // Handle back button
  useBackButton(() => navigate("/"));

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      setUserEmail(session.user.email || null);
      checkPinStatus(session.user.id);
      checkBiometricAvailability();
      fetchUsername(session.user.id);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        fetchUsername(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUsername = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data?.username) {
      setUsername(data.username);
    }
  };

  const checkBiometricAvailability = async () => {
    const result = await biometricService.isAvailable();
    setBiometricAvailable(result.isAvailable);
    setBiometryType(result.biometryType);
  };

  const checkPinStatus = async (userId: string) => {
    setLoadingPin(true);
    const { data, error } = await supabase
      .from("user_pins")
      .select("is_enabled, biometric_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setHasPinEnabled(data.is_enabled);
      setBiometricEnabled(data.biometric_enabled || false);
    }
    setLoadingPin(false);
  };

  const handleTogglePin = async () => {
    if (!userId) return;

    if (!hasPinEnabled) {
      // Enable PIN - show setup modal
      setShowPinSetup(true);
    } else {
      // Disable PIN
      const { error } = await supabase
        .from("user_pins")
        .delete()
        .eq("user_id", userId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to disable PIN",
          variant: "destructive",
        });
      } else {
        setHasPinEnabled(false);
        setBiometricEnabled(false);
        toast({
          title: "PIN Disabled",
          description: "Your PIN lock has been removed",
        });
      }
    }
  };

  const handleToggleBiometric = async () => {
    if (!userId || !hasPinEnabled) return;

    const newValue = !biometricEnabled;

    if (newValue) {
      // Test biometric authentication first
      const success = await biometricService.authenticate({
        reason: "Verify your identity to enable biometric unlock",
        title: "Enable Biometrics",
      });

      if (!success) {
        toast({
          title: "Error",
          description: "Biometric authentication failed",
          variant: "destructive",
        });
        return;
      }
    }

    const { error } = await supabase
      .from("user_pins")
      .update({ biometric_enabled: newValue })
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update biometric settings",
        variant: "destructive",
      });
    } else {
      setBiometricEnabled(newValue);
      toast({
        title: newValue ? "Biometrics Enabled" : "Biometrics Disabled",
        description: newValue 
          ? `You can now use ${biometricService.getBiometryTypeName(biometryType)} to unlock` 
          : "Biometric unlock has been disabled",
      });
    }
  };

  const validateUsername = (value: string): string | null => {
    if (value.length < 3) {
      return "Username must be at least 3 characters";
    }
    if (value.length > 20) {
      return "Username must be less than 20 characters";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return "Username can only contain letters, numbers, and underscores";
    }
    return null;
  };

  const handleUpdateUsername = async () => {
    const validationError = validateUsername(newUsername);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }

    if (!userId) return;

    setLoadingUsername(true);
    setUsernameError("");

    try {
      // Check if username is already taken
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", newUsername.toLowerCase())
        .neq("id", userId)
        .maybeSingle();

      if (existing) {
        setUsernameError("Username is already taken");
        setLoadingUsername(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ username: newUsername.toLowerCase() })
        .eq("id", userId);

      if (error) throw error;

      setUsername(newUsername.toLowerCase());
      toast({
        title: "Success",
        description: "Username updated successfully",
      });
      setShowUsernameChange(false);
      setNewUsername("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingUsername(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoadingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;

      toast({
        title: "Verification Email Sent",
        description: "Please check your new email address to confirm the change",
      });
      setShowEmailChange(false);
      setNewEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      setShowPasswordChange(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-semibold text-lg text-foreground">Profile Settings</h1>
      </header>

      <main className="container max-w-2xl mx-auto p-4 space-y-6">
        {/* Current Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="text-primary" size={20} />
              Account Information
            </CardTitle>
            <CardDescription>Your current account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <Mail className="text-muted-foreground" size={18} />
              <span className="text-foreground">{userEmail}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <AtSign className="text-muted-foreground" size={18} />
              <span className="text-foreground">
                {username ? `@${username}` : <span className="text-muted-foreground italic">No username set</span>}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Change Username */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AtSign className="text-primary" size={20} />
              Change Username
            </CardTitle>
            <CardDescription>Update your display name (shown in activity logs)</CardDescription>
          </CardHeader>
          <CardContent>
            {showUsernameChange ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newUsername">New Username</Label>
                  <Input
                    id="newUsername"
                    type="text"
                    placeholder="Enter new username"
                    value={newUsername}
                    onChange={(e) => {
                      setNewUsername(e.target.value);
                      setUsernameError("");
                    }}
                    className="bg-secondary border-border"
                  />
                  {usernameError && (
                    <p className="text-sm text-destructive">{usernameError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    3-20 characters, letters, numbers, and underscores only
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowUsernameChange(false);
                      setNewUsername("");
                      setUsernameError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateUsername}
                    disabled={loadingUsername || !newUsername.trim()}
                  >
                    {loadingUsername ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Update Username
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setShowUsernameChange(true)}
              >
                <AtSign className="mr-2" size={16} />
                {username ? "Change Username" : "Set Username"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Change Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="text-primary" size={20} />
              Change Email
            </CardTitle>
            <CardDescription>Update your email address</CardDescription>
          </CardHeader>
          <CardContent>
            {showEmailChange ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail">New Email Address</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder="Enter new email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  A verification email will be sent to your new address.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowEmailChange(false);
                      setNewEmail("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateEmail}
                    disabled={loadingEmail}
                  >
                    {loadingEmail ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Update Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setShowEmailChange(true)}
              >
                <Mail className="mr-2" size={16} />
                Change Email Address
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="text-primary" size={20} />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            {showPasswordChange ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-secondary border-border"
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-secondary border-border"
                    minLength={6}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdatePassword}
                    disabled={loadingPassword}
                  >
                    {loadingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setShowPasswordChange(true)}
              >
                <Lock className="mr-2" size={16} />
                Change Password
              </Button>
            )}
          </CardContent>
        </Card>

        {/* PIN Lock Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="text-primary" size={20} />
              PIN Lock
            </CardTitle>
            <CardDescription>Protect your account with a PIN code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Enable PIN Lock</p>
                <p className="text-xs text-muted-foreground">
                  Require a PIN to access the app
                </p>
              </div>
              <Switch
                checked={hasPinEnabled}
                onCheckedChange={handleTogglePin}
                disabled={loadingPin}
              />
            </div>
            {hasPinEnabled && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowPinSetup(true)}
                  className="w-full"
                >
                  <Lock className="mr-2" size={16} />
                  Change PIN
                </Button>

                {/* Biometric Option */}
                {biometricAvailable && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Fingerprint size={16} className="text-primary" />
                        {biometricService.getBiometryTypeName(biometryType)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Use biometrics as an alternative to PIN
                      </p>
                    </div>
                    <Switch
                      checked={biometricEnabled}
                      onCheckedChange={handleToggleBiometric}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="text-destructive" size={20} />
              Sign Out
            </CardTitle>
            <CardDescription>Sign out of your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="mr-2" size={16} />
              Logout
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Note: Only 5 email accounts can access this inventory.
        </p>
      </main>

      {userId && (
        <PinSetupModal
          open={showPinSetup}
          onClose={() => {
            setShowPinSetup(false);
            if (userId) checkPinStatus(userId);
          }}
          userId={userId}
          isChangingPin={hasPinEnabled}
        />
      )}
    </div>
  );
};

export default Profile;
