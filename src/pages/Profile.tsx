import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowLeft, Check, Loader2, LogOut, Shield, Fingerprint, Pencil, Eye, Type, Sun, Moon, Contrast, RefreshCw, FolderOpen, Download, History, Settings, Bell } from "lucide-react";
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
import AppVersion from "@/components/AppVersion";
import { useBackButton } from "@/hooks/useBackButton";
import { biometricService, BiometryType } from "@/services/biometricService";
import { useTextSize, TextSize } from "@/hooks/useTextSize";
import { useTheme } from "@/hooks/useTheme";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";
import { testLocalNotification } from "@/services/localNotificationService";

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

  // Update check
  const { 
    updateAvailable, 
    latestVersion, 
    currentVersion, 
    releaseNotes, 
    downloadUrl, 
    isLoading: checkingUpdate, 
    checkForUpdates 
  } = useUpdateCheck();

  // Admin check
  const [isAdmin, setIsAdmin] = useState(false);

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
      checkAdminStatus(session.user.id);
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

  const checkAdminStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!error && !!data);
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
    // Use local scope to only sign out this device, not all devices
    await supabase.auth.signOut({ scope: 'local' });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-bold text-lg text-white">Profile Settings</h1>
      </header>

      <main className="container max-w-2xl mx-auto p-4 space-y-4">
        {/* Profile Card with Avatar, Username, and Email */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              {/* Clickable Avatar with dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative focus:outline-none group" disabled={uploadingAvatar}>
                    <Avatar className="h-24 w-24 border-4 border-amber-400 cursor-pointer transition-opacity group-hover:opacity-80 shadow-lg">
                      <AvatarImage src={avatarUrl || undefined} alt={username || "User"} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 font-bold">
                        {username ? username[0].toUpperCase() : userEmail?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {uploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-full">
                        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 rounded-full p-2 shadow-lg">
                      <Pencil size={14} className="font-bold" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="bg-slate-800 border-slate-700">
                  {avatarUrl && (
                    <DropdownMenuItem onClick={() => setShowPhotoViewer(true)} className="text-white">
                      <Eye className="mr-2" size={16} />
                      View Photo
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="text-white">
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
                        className="bg-slate-800 border-slate-700 text-white text-center placeholder-slate-500"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelEditingUsername}
                        disabled={loadingUsername}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </Button>
                      <Button
                        size="icon"
                        onClick={handleUpdateUsername}
                        disabled={loadingUsername || !newUsername.trim()}
                        className="bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 hover:from-amber-300 hover:to-amber-400"
                      >
                        {loadingUsername ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {usernameError && (
                      <p className="text-sm text-red-400 text-center">{usernameError}</p>
                    )}
                    <p className="text-xs text-slate-400 text-center">
                      3-20 characters, letters, numbers, underscores
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold text-white">
                      {username ? `@${username}` : <span className="text-slate-500 italic text-lg">No username</span>}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-amber-400"
                      onClick={startEditingUsername}
                    >
                      <Pencil size={14} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Email display */}
              <div className="flex items-center gap-2 text-slate-400">
                <Mail size={16} />
                <span className="text-sm">{userEmail}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Section - Only visible to admins */}
        {isAdmin && (
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Settings className="text-amber-400" size={18} />
                Admin Tools
              </CardTitle>
              <CardDescription className="text-slate-400">Manage app settings and releases</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="secondary"
                className="w-full justify-start bg-slate-800 hover:bg-slate-700 text-white"
                onClick={() => navigate("/admin/releases")}
              >
                <Download className="mr-2" size={16} />
                Manage App Releases
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Account Security - Email & Password combined */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Lock className="text-amber-400" size={18} />
              Account Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email Change */}
            {showEmailChange ? (
              <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg">
                <Label htmlFor="newEmail" className="text-sm text-white">New Email Address</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="Enter new email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                />
                <p className="text-xs text-slate-400">
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
                    className="bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdateEmail}
                    disabled={loadingEmail}
                    className="bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 hover:from-amber-300 hover:to-amber-400"
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
                className="w-full justify-start bg-slate-800 hover:bg-slate-700 text-white"
                onClick={() => setShowEmailChange(true)}
              >
                <Mail className="mr-2" size={16} />
                Change Email Address
              </Button>
            )}

            {/* Password Change */}
            {showPasswordChange ? (
              <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm text-white">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm text-white">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
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
                    className="bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdatePassword}
                    disabled={loadingPassword}
                    className="bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 hover:from-amber-300 hover:to-amber-400"
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
                className="w-full justify-start bg-slate-800 hover:bg-slate-700 text-white"
                onClick={() => setShowPasswordChange(true)}
              >
                <Lock className="mr-2" size={16} />
                Change Password
              </Button>
            )}
          </CardContent>
        </Card>

        {/* PIN Lock Settings */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Shield className="text-amber-400" size={18} />
              PIN Lock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Enable PIN Lock</p>
                <p className="text-xs text-slate-400">
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
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                >
                  <Lock className="mr-2" size={16} />
                  Change PIN
                </Button>

                {/* Biometric Option */}
                {biometricAvailable && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                    <div>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Fingerprint size={16} className="text-amber-400" />
                        {biometricService.getBiometryTypeName(biometryType)}
                      </p>
                      <p className="text-xs text-slate-400">
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
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Type className="text-amber-400" size={18} />
              Accessibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {themeMode === "dark" ? (
                  <Moon size={16} className="text-amber-400" />
                ) : (
                  <Sun size={16} className="text-amber-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-white">Dark Mode</p>
                  <p className="text-xs text-slate-400">
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
            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <Contrast size={16} className="text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-white">High Contrast</p>
                  <p className="text-xs text-slate-400">
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
            <div className="space-y-3 pt-2 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Text Size</p>
                <span className="text-sm text-slate-400">{textSizeLabels[textSize]}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">A</span>
                <Slider
                  value={[textSizeIndex]}
                  min={0}
                  max={3}
                  step={1}
                  onValueChange={(value) => setTextSize(textSizeOptions[value[0]])}
                  className="flex-1"
                />
                <span className="text-lg font-medium text-slate-400">A</span>
              </div>
              <p className="text-xs text-slate-400">
                Adjust text size for better readability
              </p>
            </div>
          </CardContent>
        </Card>

        {/* App Management */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <FolderOpen className="text-amber-400" size={18} />
              App Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Category Management Link */}
            <Button
              variant="secondary"
              onClick={() => navigate("/categories")}
              className="w-full justify-start bg-slate-800 hover:bg-slate-700 text-white"
            >
              <FolderOpen className="mr-2" size={16} />
              Manage Categories
            </Button>

            {/* User Management (Admin only) */}
            {isAdmin && (
              <Button
                variant="secondary"
                onClick={() => navigate("/admin/users")}
                className="w-full justify-start bg-slate-800 hover:bg-slate-700 text-white"
              >
                <Bell className="mr-2" size={16} />
                Manage Users
              </Button>
            )}

            {/* Check for Updates */}
            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  checkForUpdates();
                  toast({
                    title: checkingUpdate ? "Checking..." : "Update Check",
                    description: checkingUpdate 
                      ? "Checking for updates..." 
                      : updateAvailable 
                        ? `New version ${latestVersion} available!` 
                        : "You're on the latest version",
                  });
                }}
                className="w-full justify-start"
                disabled={checkingUpdate}
              >
                <RefreshCw className={`mr-2 ${checkingUpdate ? "animate-spin" : ""}`} size={16} />
                Check for Updates
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Current version: {currentVersion}
                {updateAvailable && latestVersion && (
                  <span className="text-primary ml-2">→ {latestVersion} available</span>
                )}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/versions")}
                className="w-full justify-start mt-2 text-muted-foreground"
              >
                <History className="mr-2" size={14} />
                View All Versions
              </Button>
            </div>

            {/* Download Link if update available */}
            {updateAvailable && downloadUrl && (
              <Button
                variant="default"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  link.download = "Ndomog.apk";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="w-full"
              >
                <Download className="mr-2" size={16} />
                Download Update
              </Button>
            )}

            {/* Test Notification Button */}
            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={async () => {
                  await testLocalNotification();
                  toast({
                    title: "Test Notification Sent",
                    description: "Check your notification bar for the test notification",
                  });
                }}
                className="w-full justify-start"
              >
                <Bell className="mr-2" size={16} />
                Test Notification
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Send a test notification to verify Android notification bar display
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="border-red-900/30 bg-slate-900/60">
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="mr-2" size={16} />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-slate-500 text-center">
          Note: Only 5 email accounts can access this inventory.
        </p>

        <AppVersion className="mt-4 pb-4" />
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
