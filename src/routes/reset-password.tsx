import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ShieldCheck, Lock, Loader2, CheckCircle2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneFrame } from "@/components/safesphere/phone-frame";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — SafeSphere" }] }),
  component: ResetPasswordScreen,
});

function ResetPasswordScreen() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Redirect to login after a successful update.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => navigate({ to: "/auth" }), 2200);
    return () => clearTimeout(t);
  }, [done, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) return setError(error);
    toast.success("Password updated successfully");
    setDone(true);
  };

  if (done) {
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
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <h1 className="mt-6 font-display text-3xl font-extrabold">Password updated successfully</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been changed. Redirecting you to log in…
            </p>
            <Button variant="hero" size="pill" className="mt-6 w-full" onClick={() => navigate({ to: "/auth" })}>
              Continue to log in <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </PhoneFrame>
    );
  }

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
          <h1 className="font-display text-3xl font-extrabold">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a strong password to keep your safe space secure.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 rounded-xl pl-10 pr-10" />
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
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="confirm-password" type={showConfirm ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="h-12 rounded-xl pl-10 pr-10" />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>
          )}
          <Button type="submit" variant="hero" size="pill" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Updating…
              </>
            ) : (
              <>
                Update password <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </PhoneFrame>
  );
}
