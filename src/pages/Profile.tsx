import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowLeft, Check, Loader2, LogOut, Shield, Fingerprint, Pencil, Eye, Type, Sun, Moon, Contrast } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import PinSetupModal from "@/components/PinSetupModal";
import PhotoViewerModal from "@/components/PhotoViewerModal";
import { useBackButton } from "@/hooks/useBackButton";
import { biometricService, BiometryType } from "@/services/biometricService";
import { useTextSize, TextSize } from "@/hooks/useTextSize";
import { useTheme } from "@/hooks/useTheme";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  
  // PIN settings
  const [hasPinEnabled, setHasPinEnabled] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [loadingPin, setLoadingPin] = useState(true);

  // Biometric settings
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryType>(BiometryType.NONE);

  // Text size accessibility
  const { textSize, setTextSize, textSizeLabels } = useTextSize();
  const textSizeOptions: TextSize[] = ["small", "normal", "large", "extra-large"];
  const textSizeIndex = textSizeOptions.indexOf(textSize);

  // Theme settings
  const { themeMode, toggleThemeMode, highContrast, toggleHighContrast } = useTheme();

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
      fetchProfile(session.user.id);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      if (data.username) setUsername(data.username);
      if (data.avatar_url) setAvatarUrl(data.avatar_url);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Add cache buster
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCacheBuster })
        .eq("id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBuster);
      toast({
        title: "Success",
        description: "Profile picture updated",
      });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
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
      setEditingUsername(false);
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

  const startEditingUsername = () => {
    setNewUsername(username || "");
    setEditingUsername(true);
    setUsernameError("");
  };

  const cancelEditingUsername = () => {
    setEditingUsername(false);
    setNewUsername("");
    setUsernameError("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-semibold text-lg text-foreground">Profile Settings</h1>
      </header>

      <main className="container max-w-2xl mx-auto p-4 space-y-4">
        {/* Profile Card with Avatar, Username, and Email */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              {/* Clickable Avatar with dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative focus:outline-none group" disabled={uploadingAvatar}>
                    <Avatar className="h-24 w-24 border-2 border-border cursor-pointer transition-opacity group-hover:opacity-80">
                      <AvatarImage src={avatarUrl || undefined} alt={username || "User"} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {username ? username[0].toUpperCase() : userEmail?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {uploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
                      <Pencil size={12} />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {avatarUrl && (
                    <DropdownMenuItem onClick={() => setShowPhotoViewer(true)}>
                      <Eye className="mr-2" size={16} />
                      View Photo
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Pencil className="mr-2" size={16} />
                    {avatarUrl ? "Change Photo" : "Upload Photo"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />

              {/* Username with inline edit */}
              <div className="w-full">
                {editingUsername ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Enter username"
                        value={newUsername}
                        onChange={(e) => {
                          setNewUsername(e.target.value);
                          setUsernameError("");
                        }}
                        className="bg-secondary border-border text-center"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelEditingUsername}
                        disabled={loadingUsername}
                      >
                        ✕
                      </Button>
                      <Button
                        size="icon"
                        onClick={handleUpdateUsername}
                        disabled={loadingUsername || !newUsername.trim()}
                      >
                        {loadingUsername ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {usernameError && (
                      <p className="text-sm text-destructive text-center">{usernameError}</p>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      3-20 characters, letters, numbers, underscores
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg font-medium text-foreground">
                      {username ? `@${username}` : <span className="text-muted-foreground italic">No username</span>}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={startEditingUsername}
                    >
                      <Pencil size={14} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Email display */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail size={16} />
                <span className="text-sm">{userEmail}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Security - Email & Password combined */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="text-primary" size={18} />
              Account Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email Change */}
            {showEmailChange ? (
              <div className="space-y-3 p-3 bg-secondary/50 rounded-lg">
                <Label htmlFor="newEmail" className="text-sm">New Email Address</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="Enter new email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  A verification email will be sent to your new address.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowEmailChange(false);
                      setNewEmail("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdateEmail}
                    disabled={loadingEmail}
                  >
                    {loadingEmail ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Update
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => setShowEmailChange(true)}
              >
                <Mail className="mr-2" size={16} />
                Change Email Address
              </Button>
            )}

            {/* Password Change */}
            {showPasswordChange ? (
              <div className="space-y-3 p-3 bg-secondary/50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-background border-border"
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-background border-border"
                    minLength={6}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdatePassword}
                    disabled={loadingPassword}
                  >
                    {loadingPassword ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Update
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="w-full justify-start"
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
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="text-primary" size={18} />
              PIN Lock
            </CardTitle>
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

        {/* Accessibility Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Type className="text-primary" size={18} />
              Accessibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {themeMode === "dark" ? (
                  <Moon size={16} className="text-primary" />
                ) : (
                  <Sun size={16} className="text-primary" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">
                    {themeMode === "dark" ? "Currently using dark theme" : "Currently using light theme"}
                  </p>
                </div>
              </div>
              <Switch
                checked={themeMode === "dark"}
                onCheckedChange={toggleThemeMode}
              />
            </div>

            {/* High Contrast Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Contrast size={16} className="text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">High Contrast</p>
                  <p className="text-xs text-muted-foreground">
                    Increase color contrast for visibility
                  </p>
                </div>
              </div>
              <Switch
                checked={highContrast}
                onCheckedChange={toggleHighContrast}
              />
            </div>

            {/* Text Size Slider */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Text Size</p>
                <span className="text-sm text-muted-foreground">{textSizeLabels[textSize]}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">A</span>
                <Slider
                  value={[textSizeIndex]}
                  min={0}
                  max={3}
                  step={1}
                  onValueChange={(value) => setTextSize(textSizeOptions[value[0]])}
                  className="flex-1"
                />
                <span className="text-lg font-medium text-muted-foreground">A</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Adjust text size for better readability
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="border-destructive/30">
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="mr-2" size={16} />
              Sign Out
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

      {avatarUrl && (
        <PhotoViewerModal
          open={showPhotoViewer}
          onClose={() => setShowPhotoViewer(false)}
          photoUrl={avatarUrl}
          itemName={username || "Profile Photo"}
        />
      )}
    </div>
  );
};

export default Profile;
