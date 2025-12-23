import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, RefreshCw, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

type AuthMode = "login" | "signup" | "forgot" | "reset";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showResendOption, setShowResendOption] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Check if this is a password reset callback
    const checkForRecovery = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const type = searchParams.get("type");
      
      if (type === "recovery" || (session && window.location.hash.includes("type=recovery"))) {
        setMode("reset");
      }
    };
    
    checkForRecovery();

    // Listen for auth state changes (for recovery flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }

    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      toast({
        title: "Verification email sent!",
        description: "Please check your inbox and spam folder.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      if (error) throw error;
      toast({
        title: "Check your email!",
        description: "We've sent you a password reset link. Check your inbox and spam folder.",
      });
      setMode("login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({
        title: "Password updated!",
        description: "Your password has been reset successfully.",
      });
      await supabase.auth.signOut();
      setMode("login");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResendOption(false);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            setShowResendOption(true);
          }
          throw error;
        }
        navigate("/");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) {
          if (error.message.includes("Maximum of 5 users")) {
            throw new Error("Maximum of 5 users allowed. Contact an administrator.");
          }
          throw error;
        }
        toast({
          title: "Check your email!",
          description: "We've sent you a verification link. Please check your inbox and spam folder.",
        });
        setMode("login");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "forgot":
        return "Reset Password";
      case "reset":
        return "Set New Password";
      case "signup":
        return "Create your account";
      default:
        return "Sign in to access your inventory";
    }
  };

  // Forgot password form
  if (mode === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="flex flex-col items-center space-y-4">
            <Logo size="lg" />
            <h1 className="text-3xl font-bold text-foreground">Ndomog Investment</h1>
            <p className="text-muted-foreground">{getTitle()}</p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode("login")}
            className="flex items-center justify-center w-full text-primary hover:underline font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // Reset password form (after clicking email link)
  if (mode === "reset") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="flex flex-col items-center space-y-4">
            <Logo size="lg" />
            <h1 className="text-3xl font-bold text-foreground">Ndomog Investment</h1>
            <p className="text-muted-foreground">{getTitle()}</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Login/Signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="flex flex-col items-center space-y-4">
          <Logo size="lg" />
          <h1 className="text-3xl font-bold text-foreground">Ndomog Investment</h1>
          <p className="text-muted-foreground">{getTitle()}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-secondary border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-secondary border-border"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? "Loading..." : mode === "login" ? "Sign In" : "Sign Up"}
          </Button>

          {showResendOption && mode === "login" && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendVerification}
              disabled={resendingEmail}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${resendingEmail ? 'animate-spin' : ''}`} />
              {resendingEmail ? "Sending..." : "Resend verification email"}
            </Button>
          )}
        </form>

        <p className="text-center text-muted-foreground">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-primary hover:underline font-medium"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;