import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { User, Users, MapPin, Bell, Mic, Check, Plus, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { PhoneFrame } from "@/components/safesphere/phone-frame";
import { type Contact } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({ meta: [{ title: "Safety Setup — SafeSphere" }] }),
  component: SetupScreen,
});

// Goal-gradient: start the user at 30% so setup feels almost done.
const STEP_PROGRESS = [30, 55, 80, 100];

function SetupScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [circle, setCircle] = useState<Contact[]>([]);
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [perms, setPerms] = useState({ location: true, notify: true, mic: true, motion: false });

  const addContact = (c: Contact) => {
    setCircle((prev) => [...prev, c]);
    setSuggestions((prev) => prev.filter((s) => s.id !== c.id));
  };

  const next = () => (step < 2 ? setStep(step + 1) : navigate({ to: "/dashboard" }));

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col px-6 pb-8 pt-9">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="font-display font-bold">Safety Setup</span>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Protection setup</span>
            <span className="text-foreground">{STEP_PROGRESS[step]}%</span>
          </div>
          <Progress value={STEP_PROGRESS[step]} className="h-2.5" />
        </div>

        <div className="mt-7 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
            >
              {step === 0 && (
                <div>
                  <StepHead icon={User} title="Tell us about you" sub="This is who your guardians protect." />
                  <div className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullname">Full name</Label>
                      <Input id="fullname" defaultValue="" placeholder="e.g. Aditi Sharma" className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="home">Home address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="home" defaultValue="" placeholder="e.g. 12th Main, Indiranagar" className="h-12 rounded-xl pl-10" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <StepHead icon={Users} title="Build your safety circle" sub="These people are alerted in an emergency." />
                  <div className="mt-5 space-y-2">
                    {circle.map((c) => (
                      <div key={c.id} className="bg-card border border-border shadow-[var(--shadow-soft)] flex items-center gap-3 rounded-2xl p-3">
                        <Avatar initials={c.initials} active />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.relation} · {c.phone}</p>
                        </div>
                        <Check className="h-5 w-5 text-safe" />
                      </div>
                    ))}
                  </div>
                  {suggestions.length > 0 && (
                    <>
                      <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Suggested
                      </p>
                      <div className="space-y-2">
                        {suggestions.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => addContact(c)}
                            className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border p-3 text-left transition-colors hover:border-primary hover:bg-accent/40"
                          >
                            <Avatar initials={c.initials} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold">{c.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{c.relation}</p>
                            </div>
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
                              <Plus className="h-4 w-4" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 2 && (
                <div>
                  <StepHead icon={Bell} title="Enable protection" sub="Recommended settings are already on for you." />
                  <div className="mt-5 space-y-2.5">
                    <PermRow icon={MapPin} title="Live location" desc="Continuous journey tracking" checked={perms.location} onChange={(v) => setPerms({ ...perms, location: v })} />
                    <PermRow icon={Bell} title="Emergency alerts" desc="Notify guardians instantly" checked={perms.notify} onChange={(v) => setPerms({ ...perms, notify: v })} />
                    <PermRow icon={Mic} title="Evidence capture" desc="Auto-record audio in SOS" checked={perms.mic} onChange={(v) => setPerms({ ...perms, mic: v })} />
                    <PermRow icon={ShieldCheck} title="Motion detection" desc="Detect sudden falls or struggle" checked={perms.motion} onChange={(v) => setPerms({ ...perms, motion: v })} />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-3 pt-6">
          <Button variant="hero" size="pill" className="w-full" onClick={next}>
            {step === 2 ? "Activate SafeSphere" : "Continue"} <ArrowRight className="h-5 w-5" />
          </Button>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="w-full text-center text-sm font-semibold text-muted-foreground">
              Back
            </button>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

function StepHead({ icon: Icon, title, sub }: { icon: typeof User; title: string; sub: string }) {
  return (
    <div>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="mt-3 font-display text-2xl font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function Avatar({ initials, active }: { initials: string; active?: boolean }) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}
    >
      {initials}
    </span>
  );
}

function PermRow({
  icon: Icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="bg-card border border-border shadow-[var(--shadow-soft)] flex items-center gap-3 rounded-2xl p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}