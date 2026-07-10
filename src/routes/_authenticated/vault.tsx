import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Lock, Mic, Video, ImageIcon, MapPin, FileText, ShieldCheck,
  ScanSearch, ShieldAlert, Siren, FileClock, Sparkles, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MobileShell } from "@/components/safesphere/mobile-shell";
import { RiskBadge } from "@/components/safesphere/risk-badge";
import { dataService, type EvidenceItem } from "@/lib/data-service";
import { storageService } from "@/lib/storage-service";
import { SafetyMap } from "@/components/safesphere/safety-map";
import { simulationStore, useSimulationState } from "@/lib/simulation-service";
import {
  riskMeta, type ReportKind, type ScanResult,
} from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({ meta: [{ title: "Shield Hub — SafeSphere" }] }),
  component: SafetyHub,
});

const typeIcon: Record<"audio" | "video" | "photo" | "location" | "report", typeof Mic> = {
  audio: Mic,
  video: Video,
  photo: ImageIcon,
  location: MapPin,
  report: FileText,
};

const reportIcon: Record<ReportKind, typeof Siren> = {
  sos: Siren,
  guardian: ShieldCheck,
  scan: ScanSearch,
};

function SafetyHub() {
  const demo = useSimulationState();
  const [tab, setTab] = useState("vault");

  // Hidden simulation scenario: open the AI scanner with a prefilled message.
  useEffect(() => {
    if (demo.scanText) setTab("scanner");
  }, [demo.scanText]);

  return (
    <MobileShell>
      <header className="pt-9">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> End-to-end encrypted
        </div>
        <h1 className="mt-3 font-display text-2xl font-extrabold">Shield Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your evidence vault, AI threat scanner and incident history — all protected in one place.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="mt-5">
        <TabsList className="bg-card border border-border shadow-[var(--shadow-soft)] grid h-auto w-full grid-cols-3 rounded-2xl p-1">
          <TabsTrigger value="vault" className="rounded-xl py-2 text-xs font-semibold">Vault</TabsTrigger>
          <TabsTrigger value="scanner" className="rounded-xl py-2 text-xs font-semibold">Scanner</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-xl py-2 text-xs font-semibold">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="vault" className="mt-4">
          <EvidenceVault />
        </TabsContent>
        <TabsContent value="scanner" className="mt-4">
          <ScannerSection />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <IncidentHistorySection />
        </TabsContent>
      </Tabs>
    </MobileShell>
  );
}

function EvidenceVault() {
  const qc = useQueryClient();
  const evidenceQuery = useQuery({
    queryKey: ["evidence-items"],
    queryFn: dataService.getEvidenceItems,
  });

  const evidenceItems = evidenceQuery.data ?? [];

  const handleDownload = async (storagePath: string) => {
    try {
      const url = await storageService.getEvidence(storagePath);
      window.open(url, "_blank");
    } catch {
      toast.error("Failed to generate secure access URL");
    }
  };

  return (
    <div>
      <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-[1.6rem] p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Lock className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold">Evidence Vault secured</p>
            <p className="text-xs text-muted-foreground">{evidenceItems.length} files protected · end-to-end encrypted</p>
          </div>
        </div>
      </div>

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stored evidence</p>
      {evidenceQuery.isLoading ? (
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] flex items-center justify-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" /> Loading evidence vault…
        </div>
      ) : evidenceItems.length === 0 ? (
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] flex flex-col items-center justify-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground text-center">
          <Lock className="h-8 w-8 text-muted/30 mb-2" />
          <p>No evidence saved yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {evidenceItems.map((item) => {
            const getEvidenceType = (mimeType: string) => {
              const t = mimeType.toLowerCase();
              if (t.includes("audio")) return "audio";
              if (t.includes("video")) return "video";
              if (t.includes("image") || t.includes("photo")) return "photo";
              if (t.includes("location") || t.includes("geo")) return "location";
              return "report";
            };

            const type = getEvidenceType(item.fileType);
            const Icon = typeIcon[type] || FileText;
            const sizeStr = item.sizeBytes
              ? `${(item.sizeBytes / 1024).toFixed(1)} KB`
              : "Unknown size";
            const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={item.id}
                onClick={() => item.storagePath && handleDownload(item.storagePath)}
                className={`bg-card border border-border shadow-[var(--shadow-soft)] flex items-center gap-3 rounded-2xl p-3.5 ${
                  item.storagePath ? "cursor-pointer hover:bg-accent/40 transition-colors" : ""
                }`}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.filename}</p>
                  <p className="truncate text-xs text-muted-foreground">{dateStr} · {item.isEncrypted ? "Encrypted" : "Secured"}</p>
                </div>
                <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Lock className={`h-4 w-4 ${item.isLocked ? "text-safe" : "text-muted-foreground"}`} />
                  <span className="text-[10px] text-muted-foreground">{sizeStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScannerSection() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const scansQuery = useQuery({ queryKey: ["threat-scans"], queryFn: dataService.getThreatScans });
  const demo = useSimulationState();

  // Hidden simulation scenario: prefill a harmful example message, then consume it.
  useEffect(() => {
    if (!demo.scanText) return;
    setText(demo.scanText);
    setResult(null);
    simulationStore.setScan(null);
  }, [demo.scanText]);

  const runScan = async () => {
    if (!text.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const r = await dataService.scanMessage(text.trim());
      setResult(r);
      qc.invalidateQueries({ queryKey: ["threat-scans"] });
    } catch {
      toast.error("Scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
        <Sparkles className="h-3.5 w-3.5" /> AI Digital Safety Scanner
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste a suspicious message and AI will assess harassment, threats and manipulation.
      </p>

      <div className="bg-card border border-border shadow-[var(--shadow-soft)] mt-4 rounded-[1.6rem] p-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the message here…"
          className="min-h-28 resize-none rounded-2xl border-0 bg-card/70 text-sm focus-visible:ring-1"
        />
        <Button variant="hero" size="pill" className="mt-3 w-full" onClick={runScan} disabled={scanning || !text.trim()}>
          <ScanSearch className="h-5 w-5" /> {scanning ? "Analyzing…" : "Analyze message"}
        </Button>
      </div>

      <AnimatePresence>
        {scanning && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-card border border-border shadow-[var(--shadow-soft)] mt-4 flex items-center gap-3 rounded-[1.6rem] p-5"
          >
            <span className="relative grid h-11 w-11 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
              <span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground">
                <ScanSearch className="h-5 w-5" />
              </span>
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold">Analyzing message…</p>
              <p className="text-xs text-muted-foreground">AI is assessing threats, manipulation and risk.</p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </motion.div>
        )}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="bg-card border border-border shadow-[var(--shadow-soft)] mt-4 rounded-[1.6rem] p-5"
          >
            <div className="flex items-center justify-between">
              <RiskBadge risk={result.threat} />
              <span className="text-4xl">{riskMeta[result.threat].emoji}</span>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Risk level</span>
                <span className="text-foreground">{result.risk}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.risk}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    result.threat === "high" ? "bg-danger" : result.threat === "medium" ? "bg-caution" : "bg-safe"
                  }`}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3 rounded-2xl bg-card/70 p-3">
              {result.threat === "low" ? (
                <ShieldCheck className="h-5 w-5 shrink-0 text-safe" />
              ) : (
                <ShieldAlert className="h-5 w-5 shrink-0 text-danger" />
              )}
              <p className="text-sm font-medium">{result.action}</p>
            </div>
            {result.categories && result.categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {result.categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            {result.explanation && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{result.explanation}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent scans</p>
      {scansQuery.isLoading ? (
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] flex items-center justify-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading scans…
        </div>
      ) : (scansQuery.data ?? []).length === 0 ? (
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] flex flex-col items-center justify-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground text-center">
          <ScanSearch className="h-8 w-8 text-muted/30 mb-2" />
          <p>No scans yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {(scansQuery.data ?? []).map((s) => (
            <div key={s.id} className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-2xl p-3.5">
              <div className="flex items-center justify-between">
                <RiskBadge risk={s.threat} />
                <span className="text-[11px] text-muted-foreground">{s.time}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-foreground">“{s.message}”</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const reportTone: Record<string, string> = {
  safe: "bg-safe/15 text-safe",
  info: "bg-primary/15 text-foreground",
  alert: "bg-danger/15 text-danger",
};

function IncidentHistorySection() {
  const incidentsQuery = useQuery({ queryKey: ["incidents"], queryFn: dataService.getIncidents });
  const safetyReports: any[] = []; // Empty fallback since dummy data is removed

  return (
    <div>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
        <FileClock className="h-3.5 w-3.5" /> Incident History
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Protected incident records plus a timeline of SOS activations, Guardian alerts and AI scans.
      </p>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Incident records</p>
      {incidentsQuery.isLoading ? (
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] flex items-center justify-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading incidents…
        </div>
      ) : (incidentsQuery.data ?? []).length === 0 ? (
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] flex flex-col items-center justify-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground text-center">
          <FileClock className="h-8 w-8 text-muted/30 mb-2" />
          <p>No incidents recorded</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {(incidentsQuery.data ?? []).map((rec) => (
            <div key={rec.id} className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Incident {rec.code}</p>
                <RiskBadge risk={rec.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-semibold text-foreground">{rec.date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-semibold text-foreground">{rec.location}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Evidence</p>
                  <p className="inline-flex items-center gap-1 font-semibold text-safe"><Lock className="h-3 w-3" />{rec.evidence}</p>
                </div>
              </div>
              {rec.latitude && rec.longitude && (
                <div className="h-28 rounded-xl overflow-hidden mt-2 border border-border/60">
                  <SafetyMap
                    latitude={rec.latitude}
                    longitude={rec.longitude}
                    risk={rec.status}
                    message={`Incident ${rec.code}`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity timeline</p>
      {safetyReports.length === 0 ? (
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] flex flex-col items-center justify-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground text-center">
          <FileClock className="h-8 w-8 text-muted/30 mb-2" />
          <p>No activity recorded</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {safetyReports.map((rep) => {
            const Icon = reportIcon[rep.kind as ReportKind];
            return (
              <div key={rep.id} className="bg-card border border-border shadow-[var(--shadow-soft)] flex items-center gap-3 rounded-2xl p-3.5">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${reportTone[rep.tone]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{rep.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{rep.detail}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{rep.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}