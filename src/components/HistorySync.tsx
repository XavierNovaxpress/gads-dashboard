import { useState } from "react";
import { RefreshCw, Check, X, Calendar, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { refreshFromWindsor } from "../lib/api";
import { MONTH_NAMES_FULL } from "../lib/data";

interface Props {
  onComplete: () => void;
}

interface MonthStatus {
  month: string;
  label: string;
  status: "pending" | "syncing" | "done" | "error";
  rows?: number;
  error?: string;
}

function generateMonthsList(): { month: string; label: string }[] {
  const now = new Date();
  const months: { month: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${y}-${m}`;
    months.push({ month: key, label: `${MONTH_NAMES_FULL[m]} ${y}` });
  }
  return months;
}

export function HistorySync({ onComplete }: Props) {
  const allMonths = generateMonthsList();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<MonthStatus[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [done, setDone] = useState(false);

  const toggleMonth = (m: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === allMonths.length) setSelected(new Set());
    else setSelected(new Set(allMonths.map((m) => m.month)));
  };

  const startSync = async () => {
    if (selected.size === 0) return;
    setSyncing(true);
    setDone(false);

    const monthsToSync = allMonths.filter((m) => selected.has(m.month));
    const initial: MonthStatus[] = monthsToSync.map((m) => ({
      month: m.month, label: m.label, status: "pending",
    }));
    setStatuses(initial);

    for (let i = 0; i < monthsToSync.length; i++) {
      setStatuses((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: "syncing" } : s))
      );

      try {
        const result = await refreshFromWindsor(monthsToSync[i].month);
        setStatuses((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, status: "done", rows: result.upserted } : s))
        );
      } catch (err) {
        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, status: "error", error: err instanceof Error ? err.message : "Erreur" } : s
          )
        );
      }
    }

    setSyncing(false);
    setDone(true);
  };

  const totalSynced = statuses.filter((s) => s.status === "done").reduce((acc, s) => acc + (s.rows ?? 0), 0);
  const totalDone = statuses.filter((s) => s.status === "done").length;
  const totalErrors = statuses.filter((s) => s.status === "error").length;

  return (
    <div className="p-6 max-w-[800px] page-transition">
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-[#EC5760]/10">
            <Download className="w-5 h-5 text-[#EC5760]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Sync historique</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6 ml-12">
          Sélectionnez les mois à synchroniser depuis Windsor.ai
        </p>
      </div>

      {/* Month grid */}
      {!syncing && !done && (
        <div className="animate-fade-in-up stagger-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground/80">12 derniers mois</span>
            <button
              onClick={selectAll}
              className="text-xs text-[#EC5760] hover:text-[#F2777E] transition-colors font-medium"
            >
              {selected.size === allMonths.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
            {allMonths.map((m) => {
              const isSelected = selected.has(m.month);
              return (
                <button
                  key={m.month}
                  onClick={() => toggleMonth(m.month)}
                  className={`relative p-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left ${
                    isSelected
                      ? "border-[#EC5760]/50 bg-[#EC5760]/10 text-[#EC5760]"
                      : "border-border hover:border-ring/30 hover:bg-accent/50 text-muted-foreground"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-3.5 h-3.5 text-[#EC5760]" />
                    </div>
                  )}
                  <Calendar className="w-3.5 h-3.5 mb-1 opacity-50" />
                  <div className="text-xs">{m.label}</div>
                </button>
              );
            })}
          </div>

          <button
            onClick={startSync}
            disabled={selected.size === 0}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
              selected.size > 0
                ? "bg-[#EC5760] hover:bg-[#D94550] text-white shadow-lg shadow-[#EC5760]/20"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Synchroniser {selected.size} mois
          </button>
        </div>
      )}

      {/* Progress */}
      {(syncing || done) && (
        <div className="space-y-2 animate-fade-in-up">
          {/* Progress bar */}
          {syncing && (
            <div className="mb-4">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#EC5760] rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${((statuses.filter((s) => s.status === "done" || s.status === "error").length) / statuses.length) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {statuses.filter((s) => s.status === "done" || s.status === "error").length} / {statuses.length} mois traités
              </p>
            </div>
          )}

          {/* Status list */}
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {statuses.map((s) => (
              <div
                key={s.month}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm transition-all duration-300 ${
                  s.status === "done"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : s.status === "error"
                    ? "border-red-500/20 bg-red-500/5"
                    : s.status === "syncing"
                    ? "border-[#EC5760]/20 bg-[#EC5760]/5"
                    : "border-border"
                }`}
              >
                {s.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/20" />}
                {s.status === "syncing" && <Loader2 className="w-4 h-4 text-[#EC5760] animate-spin" />}
                {s.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {s.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}

                <span className={`flex-1 ${s.status === "syncing" ? "text-[#EC5760] font-medium" : s.status === "done" ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>

                {s.status === "done" && (
                  <span className="text-xs text-emerald-500 font-medium">{s.rows} lignes</span>
                )}
                {s.status === "error" && (
                  <span className="text-xs text-red-500">{s.error}</span>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          {done && (
            <div className="mt-4 p-4 rounded-xl border border-border bg-card animate-fade-in-up">
              <div className="flex items-center gap-4">
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-emerald-500">{totalDone}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Mois synchronisés</div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold tabular-nums">{totalSynced.toLocaleString("fr-FR")}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Lignes importées</div>
                </div>
                {totalErrors > 0 && (
                  <>
                    <div className="w-px h-10 bg-border" />
                    <div className="text-center flex-1">
                      <div className="text-2xl font-bold text-red-500">{totalErrors}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Erreurs</div>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={onComplete}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#EC5760] hover:bg-[#D94550] text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-[#EC5760]/20"
              >
                <Check className="w-4 h-4" />
                Retour au dashboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
