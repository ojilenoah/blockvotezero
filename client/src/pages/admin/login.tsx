import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Mail, Lock, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/navbar";
import { fadeUp } from "@/lib/motion";

type Mode = "signin" | "signup";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, loading, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, jump straight to the dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/admin/dashboard");
    }
  }, [loading, isAuthenticated, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const fn = mode === "signin" ? signIn : signUp;
      const { data, error } = await fn(email.trim(), password);

      if (error) {
        setError(error.message);
        return;
      }

      // Signup with email confirmation enabled returns a user but no session.
      if (mode === "signup" && !data.session) {
        toast({
          title: "Check your email",
          description:
            "We sent a confirmation link. Open it, then return here to sign in.",
        });
        setMode("signin");
        setPassword("");
        return;
      }

      toast({
        title: mode === "signin" ? "Welcome back" : "Account created",
        description: `Signed in as ${email}`,
      });
      setLocation("/admin/dashboard");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="flex flex-1 items-center justify-center p-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="w-full max-w-md"
        >
          <div className="b-card">
            {/* Header */}
            <div className="flex items-center gap-3 border-b-2 border-border bg-foreground px-6 py-4 text-background">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-background bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-70">
                  // admin
                </div>
                <h1 className="b-display text-xl">Restricted Console</h1>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex border-b-2 border-border">
              <ModeTab
                active={mode === "signin"}
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
              >
                Sign In
              </ModeTab>
              <ModeTab
                active={mode === "signup"}
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
              >
                Sign Up
              </ModeTab>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]"
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={2.5}
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={2.5}
                  />
                  <Input
                    id="password"
                    type="password"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    disabled={submitting}
                  />
                </div>
                {mode === "signup" && (
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Minimum 6 characters.
                  </p>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "signin" ? "Signing in…" : "Creating account…"}
                  </>
                ) : mode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>

              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-center">
                Authenticated via Supabase Auth · no wallet required
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex-1 px-4 py-3
        font-display text-sm font-bold uppercase tracking-wide
        transition-colors
        ${active ? "bg-card text-foreground" : "bg-secondary/40 text-muted-foreground hover:text-foreground"}
      `}
    >
      {children}
      {active && (
        <motion.span
          layoutId="admin-tab-underline"
          className="absolute inset-x-2 -bottom-0.5 h-1 bg-primary"
        />
      )}
    </button>
  );
}
