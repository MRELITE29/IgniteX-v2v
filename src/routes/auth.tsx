import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ShieldCheck, Mail, Lock, User, ArrowRight, Loader2, MailCheck, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneFrame } from "@/components/safesphere/phone-frame";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Get Started — SafeSphere" }] }),
  component: AuthScreen,
});

type View = "form" | "verify" | "forgot" | "forgot-sent";

function AuthScreen() {
  const navigate = useNavigate();
  const { signUp, signIn, user, loading, resendVerification, resetPassword } = useAuth();
  const [view, setView] = useState<View>("form");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Already signed in → skip the auth screen.
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  // Cooldown ticker for the resend button.
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    if (mode === "signup") {
      const { error, needsConfirmation } = await signUp(email.trim(), password, name.trim());
      setSubmitting(false);
      if (error) return setError(error);
      if (needsConfirmation) {
        setPassword("");
        setCooldown(60);
        setView("verify");
        return;
      }
      toast.success("Welcome to SafeSphere 🛡️");
      navigate({ to: "/setup" });
    } else {
      const { error } = await signIn(email.trim(), password);
      setSubmitting(false);
      if (error) return setError(error);
      toast.success("Welcome back 💚");
      navigate({ to: "/dashboard" });
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    const { error } = await resendVerification(email.trim());
    setResending(false);
    if (error) return toast.error(error);
    toast.success("Verification email sent");
    setCooldown(60);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!forgotEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    const { error } = await resetPassword(forgotEmail.trim());
    setSubmitting(false);
    if (error) return setError(error);
    toast.success("Password reset link sent");
    setView("forgot-sent");
  };

  // ── Verification screen ─────────────────────────────────────────────────
  if (view === "verify") {
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col px-6 pb-8 pt-10">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold">SafeSphere</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 16 }}
            className="flex flex-1 flex-col"
          >
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary shadow-[var(--shadow-soft)]">
              <MailCheck className="h-8 w-8" />
            </span>
            <h1 className="mt-6 font-display text-3xl font-extrabold">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a secure verification link to your email address.
            </p>

            <div className="mt-6 rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-semibold">{email}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                <span className="h-2 w-2 animate-pulse rounded-full bg-caution" />
                <span className="text-xs font-medium text-muted-foreground">Awaiting verification</span>
              </div>
            </div>

            <Button
              type="button"
              variant="hero"
              size="pill"
              className="mt-6 w-full"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
            >
              {resending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Sending…
                </>
              ) : cooldown > 0 ? (
                `Resend available in ${cooldown} seconds`
              ) : (
                "Resend verification email"
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setView("form");
                setMode("login");
                setError(null);
              }}
              className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to log in
            </button>
          </motion.div>
        </div>
      </PhoneFrame>
    );
  }

  // ── Forgot password: enter email ────────────────────────────────────────
  if (view === "forgot") {
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col px-6 pb-8 pt-10">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold">SafeSphere</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 16 }}
          >
            <h1 className="font-display text-3xl font-extrabold">Forgot password?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we'll send you a secure reset link.
            </p>
          </motion.div>

          <form onSubmit={handleForgot} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="forgot-email" type="email" autoComplete="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" className="h-12 rounded-xl pl-10" />
              </div>
            </div>
            {error && (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>
            )}
            <Button type="submit" variant="hero" size="pill" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  Send reset link <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setView("form");
              setMode("login");
              setError(null);
            }}
            className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to log in
          </button>
        </div>
      </PhoneFrame>
    );
  }

  // ── Forgot password: link sent ──────────────────────────────────────────
  if (view === "forgot-sent") {
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col px-6 pb-8 pt-10">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold">SafeSphere</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 16 }}
            className="flex flex-1 flex-col"
          >
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary shadow-[var(--shadow-soft)]">
              <MailCheck className="h-8 w-8" />
            </span>
            <h1 className="mt-6 font-display text-3xl font-extrabold">Password reset link sent</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Check your inbox for the reset link. Open it to set a new password.
            </p>

            <div className="mt-6 rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-semibold">{forgotEmail}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setView("form");
                setMode("login");
                setError(null);
              }}
              className="mt-6 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to log in
            </button>
          </motion.div>
        </div>
      </PhoneFrame>
    );
  }

  // ── Sign up / log in form ───────────────────────────────────────────────
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col px-6 pb-8 pt-10">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-extrabold">SafeSphere</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 16 }}
        >
          <h1 className="font-display text-3xl font-extrabold">
            {mode === "signup" ? "Create your safe space" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "A few quick steps to activate your personal guardian."
              : "Your guardian is ready when you are."}
          </p>
        </motion.div>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
          {(["signup", "login"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${
                mode === m ? "bg-card text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground"
              }`}
            >
              {m === "signup" ? "Sign up" : "Log in"}
            </button>
          ))}
        </div>

        <form onSubmit={handleContinue} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aisha Verma" className="h-12 rounded-xl pl-10" />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-12 rounded-xl pl-10" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 rounded-xl pl-10 pr-10" />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>
          )}
          {mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email.trim());
                setError(null);
                setView("forgot");
              }}
              className="block w-full text-right text-xs font-semibold text-primary transition-opacity hover:opacity-80"
            >
              Forgot password?
            </button>
          )}
          <Button type="submit" variant="hero" size="pill" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Please wait…
              </>
            ) : (
              <>
                Continue <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-auto pt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          By continuing you agree to SafeSphere's Terms & Privacy. Your data is encrypted end-to-end.
        </p>
      </div>
    </PhoneFrame>
  );
}