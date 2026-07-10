import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Phone, Mail, MapPin, Users, Plus, Check, ShieldCheck,
  Bell, Camera, Mic, Sparkles, Radio, FileLock2, ShieldAlert, Circle,
  Pencil, Trash2, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { MobileShell } from "@/components/safesphere/mobile-shell";
import { dataService, getErrorMessage, type Profile, type GuardianContact } from "@/lib/data-service";
import {
  safetyPreferences, permissionStatuses,
  availabilityMeta, shieldPermissions,
  type SafetyPreference,
} from "@/lib/app-data";
import { getCachedPermissions } from "@/lib/permission-service";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — SafeSphere" }] }),
  component: ProfileScreen,
});

const permIcon = { location: MapPin, camera: Camera, microphone: Mic, notifications: Bell } as const;
const shieldIcon = { location: MapPin, audio: Radio, evidence: FileLock2, alerts: ShieldAlert } as const;
const availabilityDot = { safe: "bg-safe", caution: "bg-caution", muted: "bg-muted-foreground" } as const;

const emptyProfile: Profile = { fullName: "", phone: "", email: "", address: "" };

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "SS";
}

function ProfileScreen() {
  const qc = useQueryClient();

  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: dataService.getProfile });
  const guardiansQuery = useQuery({ queryKey: ["guardians"], queryFn: dataService.getGuardianContacts });

  const circle = guardiansQuery.data ?? [];

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", relation: "", phone: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  // Smart Defaults: recommended safety settings enabled automatically.
  const [prefs, setPrefs] = useState<Record<SafetyPreference["key"], boolean>>({
    autoGuardian: true,
    locationSharing: true,
    evidenceBackup: true,
    emergencyAlerts: true,
  });

  // Editable personal-info form, hydrated from the profiles table.
  const [profileForm, setProfileForm] = useState<Profile>(emptyProfile);
  useEffect(() => {
    if (profileQuery.data) setProfileForm(profileQuery.data);
  }, [profileQuery.data]);

  const resetForm = () => {
    setForm({ name: "", relation: "", phone: "" });
    setAdding(false);
    setEditingId(null);
  };

  const saveProfile = useMutation({
    mutationFn: () => dataService.updateProfile(profileForm),
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => {
      console.error("[Profile] Save failed", error);
      toast.error(`Couldn't save your profile: ${getErrorMessage(error)}`);
    },
  });

  const addMutation = useMutation({
    mutationFn: () =>
      dataService.addGuardianContact({
        name: form.name.trim(),
        role: form.relation.trim() || "Trusted Guardian",
        phone: form.phone.trim(),
      }),
    onSuccess: () => {
      toast.success("Guardian added to your network");
      qc.invalidateQueries({ queryKey: ["guardians"] });
      resetForm();
    },
    onError: () => toast.error("Couldn't add guardian. Please try again."),
  });

  const editMutation = useMutation({
    mutationFn: () =>
      dataService.updateGuardianContact(editingId!, {
        name: form.name.trim(),
        role: form.relation.trim() || "Trusted Guardian",
        phone: form.phone.trim(),
      }),
    onSuccess: () => {
      toast.success("Guardian updated");
      qc.invalidateQueries({ queryKey: ["guardians"] });
      resetForm();
    },
    onError: () => toast.error("Couldn't update guardian. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dataService.deleteGuardianContact(id),
    // Optimistically drop the guardian from the cached list so the card
    // disappears instantly and the count updates without a refresh.
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["guardians"] });
      const previous = qc.getQueryData<GuardianContact[]>(["guardians"]);
      qc.setQueryData<GuardianContact[]>(["guardians"], (old) =>
        (old ?? []).filter((g) => g.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      // Roll back the optimistic removal if the delete failed.
      if (context?.previous) qc.setQueryData(["guardians"], context.previous);
      toast.error("Couldn't remove guardian. Please try again.");
    },
    onSuccess: () => {
      toast.success("Guardian removed");
    },
    // Re-sync with Supabase after success or failure.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["guardians"] });
    },
  });

  const submitGuardian = () => {
    if (!form.name.trim()) return;
    if (editingId) editMutation.mutate();
    else {
      if (!form.phone.trim()) return;
      addMutation.mutate();
    }
  };

  const savingGuardian = addMutation.isPending || editMutation.isPending;

  if (profileQuery.isLoading) {
    return (
      <MobileShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Loading your profile…</p>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="pt-9">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
            {initialsOf(profileForm.fullName)}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold leading-tight">{profileForm.fullName || "Your profile"}</h1>
            <p className="truncate text-sm text-muted-foreground">{profileForm.email}</p>
          </div>
        </div>
      </header>

      {/* Safety profile completion — calculated dynamically from real data */}
      {(() => {
        const profile = profileQuery.data;
        const perms = getCachedPermissions();
        const allItems = [
          {
            key: "profile",
            label: "Profile details",
            done: !!(profile?.fullName && profile?.phone && profile?.email),
          },
          {
            key: "guardians",
            label: "Trusted Guardians",
            done: circle.length > 0,
          },
          {
            key: "location",
            label: "Location Access",
            done: perms.location === "granted",
          },
          {
            key: "microphone",
            label: "Microphone Access",
            done: perms.microphone === "granted",
          },
        ];
        const done = allItems.filter((i) => i.done);
        const missing = allItems.filter((i) => !i.done);
        const pct = Math.round((done.length / allItems.length) * 100);
        return (
          <div className="bg-card border border-border shadow-[var(--shadow-soft)] mt-5 rounded-[1.6rem] p-5">
            <div className="mb-1.5 flex items-center justify-between text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" /> Safety profile completion
              </span>
              <span className="text-foreground">{pct}% Protected</span>
            </div>
            <Progress value={pct} className="h-2.5" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {done.map((i) => (
                <span key={i.key} className="inline-flex items-center gap-1 rounded-full bg-safe/15 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  <Check className="h-3 w-3 text-safe" strokeWidth={3} /> {i.label}
                </span>
              ))}
            </div>
            {missing.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  To reach 100%
                </p>
                <ul className="space-y-1.5">
                  {missing.map((i) => (
                    <li key={i.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Circle className="h-3 w-3 shrink-0 text-muted-foreground/60" /> {i.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })()}

      {/* Personal Information */}
      <SectionTitle>Personal information</SectionTitle>
      <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-[1.6rem] p-4 space-y-4">
        <Field icon={User} id="fullName" label="Full name" value={profileForm.fullName} onChange={(v) => setProfileForm((p) => ({ ...p, fullName: v }))} />
        <Field icon={Phone} id="phone" label="Phone number" value={profileForm.phone} onChange={(v) => setProfileForm((p) => ({ ...p, phone: v }))} />
        <Field icon={Mail} id="email" label="Email" value={profileForm.email} onChange={(v) => setProfileForm((p) => ({ ...p, email: v }))} />
        <Field icon={MapPin} id="address" label="Address" value={profileForm.address} onChange={(v) => setProfileForm((p) => ({ ...p, address: v }))} />
        <Button variant="hero" size="pill" className="w-full" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
          {saveProfile.isPending ? (<><Loader2 className="h-5 w-5 animate-spin" /> Saving…</>) : "Save profile"}
        </Button>
      </div>

      {/* Guardian Network — IKEA effect */}
      <div className="mb-2 mt-6 flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> My Guardian Network
        </p>
        <span className="text-[11px] font-semibold text-primary">{circle.length} guardians</span>
      </div>
      {guardiansQuery.isLoading ? (
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] flex items-center justify-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading guardians…
        </div>
      ) : circle.length === 0 ? (
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] flex flex-col items-center justify-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground text-center">
          <Users className="h-8 w-8 text-muted/30 mb-2" />
          <p>Your Guardian Network is empty.</p>
          <p className="text-xs">Add a trusted contact to start protection.</p>
        </div>
      ) : (
      <div className="space-y-2">
        {circle.map((c) => {
          const meta = availabilityMeta[c.availability];
          const isDeleting = deleteMutation.isPending && deleteMutation.variables === c.id;
          return (
            <div key={c.id} className="bg-card border border-border shadow-[var(--shadow-soft)] flex items-center gap-3 rounded-2xl p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {c.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{c.name}</p>
                <p className="truncate text-xs font-semibold text-primary">{c.role}</p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${availabilityDot[meta.token]}`} />
                  {meta.label}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingId(c.id);
                    setForm({ name: c.name, relation: c.role, phone: c.phone || "" });
                    setAdding(true);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label={`Edit ${c.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  disabled={isDeleting}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  aria-label={`Remove ${c.name}`}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      <AnimatePresence initial={false} mode="wait">
        {adding ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border shadow-[var(--shadow-soft)] mt-2 space-y-3 rounded-2xl p-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Priya" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-rel">Guardian role</Label>
              <Input id="c-rel" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} placeholder="e.g. Primary Guardian" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone number</Label>
              <Input id="c-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 90000 00000" className="h-11 rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Button variant="hero" size="pill" className="flex-1" onClick={submitGuardian} disabled={savingGuardian}>
                {savingGuardian ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>) : editingId ? "Save changes" : "Add guardian"}
              </Button>
              <Button variant="ghost" size="pill" onClick={resetForm}>Cancel</Button>
            </div>
          </motion.div>
        ) : (
          <button
            key="add"
            onClick={() => setAdding(true)}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-dashed border-border p-3 text-left transition-colors hover:border-primary hover:bg-accent/40"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold">Add a trusted guardian</p>
              <p className="text-xs text-muted-foreground">Grow your personal Guardian Network</p>
            </div>
          </button>
        )}
      </AnimatePresence>

      {/* Guardian Shield Permissions */}
      <SectionTitle>Guardian Shield permissions</SectionTitle>
      <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-[1.6rem] p-4 space-y-2.5">
        {shieldPermissions.map((p) => {
          const Icon = shieldIcon[p.key];
          return (
            <div key={p.key} className="flex items-center gap-3 rounded-2xl bg-card/70 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{p.label}</p>
                <p className="truncate text-xs text-muted-foreground">{p.desc}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-safe/15 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-safe" /> Enabled
              </span>
            </div>
          );
        })}
      </div>

      {/* Safety Preferences — smart defaults */}
      <SectionTitle>Safety preferences</SectionTitle>
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground">
        <Sparkles className="h-3 w-3" /> Recommended settings enabled for you
      </div>
      <div className="space-y-2.5">
        {safetyPreferences.map((p) => (
          <div key={p.key} className="bg-card border border-border shadow-[var(--shadow-soft)] flex items-center gap-3 rounded-2xl p-3.5">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-bold">
                {p.title}
                {p.recommended && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-foreground">
                    Recommended
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">{p.desc}</p>
            </div>
            <Switch checked={prefs[p.key]} onCheckedChange={(v) => setPrefs({ ...prefs, [p.key]: v })} />
          </div>
        ))}
      </div>

      {/* Permissions Status */}
      <SectionTitle>Permissions status</SectionTitle>
      <div className="bg-card border border-border shadow-[var(--shadow-soft)] grid grid-cols-2 gap-2.5 rounded-[1.6rem] p-4">
        {permissionStatuses.map((perm) => {
          const Icon = permIcon[perm.key];
          const perms = getCachedPermissions();
          const isGranted = perms[perm.key as keyof typeof perms] === "granted";
          return (
            <div key={perm.key} className="flex items-center gap-2.5 rounded-2xl bg-card/70 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm font-semibold">{perm.label}</span>
              {isGranted ? (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-safe text-safe-foreground">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </MobileShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}

function Field({ icon: Icon, id, label, value, onChange }: { icon: typeof User; id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-xl pl-10" />
      </div>
    </div>
  );
}
