import { useState, useMemo, useCallback, useEffect } from "react";
import { buildMonthData, type MonthData } from "./lib/data";
import { type RawRow, fetchMonthData, fetchAvailableMonths, fetchOpsCosts, updateOpsCostApi, uploadFile, refreshFromWindsor } from "./lib/api";
import { GROUP_ORDER } from "./lib/accounts";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { GroupView } from "./components/GroupView";
import { AccountDetail } from "./components/AccountDetail";
import { HistorySync } from "./components/HistorySync";
import { CumulativeReport } from "./components/CumulativeReport";
import { Upload, RefreshCw, ChevronDown, Check, Loader2, CheckCircle2, AlertCircle, CloudDownload } from "lucide-react";

type View = "dashboard" | "group" | "account" | "historysync" | "cumulative";

function SkeletonLoader() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px] animate-fade-in">
      <div className="space-y-2">
        <div className="skeleton h-7 w-48" />
        <div className="skeleton h-4 w-32" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 skeleton h-72 rounded-xl" />
        <div className="skeleton h-72 rounded-xl" />
      </div>
    </div>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "error" | "info" }) {
  const colors = {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    error: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };
  const icons = {
    success: <CheckCircle2 className="w-3.5 h-3.5" />,
    error: <AlertCircle className="w-3.5 h-3.5" />,
    info: <CloudDownload className="w-3.5 h-3.5" />,
  };
  return (
    <div className={`animate-toast flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${colors[type]}`}>
      {icons[type]}
      {message}
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [selectedGroup, setSelectedGroup] = useState<string>(GROUP_ORDER[0]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [opsCosts, setOpsCosts] = useState<Record<string, number>>({});

  const [rawData, setRawData] = useState<RawRow[]>([]);
  const [prevRawData, setPrevRawData] = useState<RawRow[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    fetchAvailableMonths()
      .then((m) => {
        setMonths(m);
        if (m.length > 0 && !selectedMonth) setSelectedMonth(m[0]);
        if (m.length === 0) setLoading(false);
      })
      .catch((err) => {
        setError("Impossible de charger les mois disponibles");
        setLoading(false);
        console.error(err);
      });
  }, []);

  // Compute previous month string (YYYY-MM)
  const prevMonth = useMemo(() => {
    if (!selectedMonth) return "";
    const [y, m] = selectedMonth.split("-").map(Number);
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    return `${py}-${String(pm).padStart(2, "0")}`;
  }, [selectedMonth]);

  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    setError(null);
    // Load current month + previous month in parallel
    const fetches: Promise<any>[] = [
      fetchMonthData(selectedMonth),
      fetchOpsCosts(selectedMonth),
    ];
    if (prevMonth) {
      fetches.push(fetchMonthData(prevMonth).catch(() => [] as RawRow[]));
    }
    Promise.all(fetches)
      .then(([data, costs, prevData]) => {
        setRawData(data);
        setOpsCosts(costs);
        setPrevRawData(prevData || []);
        setLoading(false);
      })
      .catch((err) => {
        setError("Erreur lors du chargement des données");
        setLoading(false);
        console.error(err);
      });
  }, [selectedMonth, prevMonth]);

  const monthData: MonthData = useMemo(() => buildMonthData(rawData, opsCosts), [rawData, opsCosts]);
  const prevMonthData: MonthData | null = useMemo(() => {
    if (prevRawData.length === 0) return null;
    return buildMonthData(prevRawData, {});
  }, [prevRawData]);

  const navigate = useCallback((v: View, group?: string, account?: string) => {
    setView(v);
    if (group) setSelectedGroup(group);
    if (account) setSelectedAccount(account);
  }, []);

  const updateOpsCost = useCallback((label: string, cost: number) => {
    setOpsCosts((prev) => ({ ...prev, [label]: cost }));
    if (selectedMonth) updateOpsCostApi(label, selectedMonth, cost).catch(console.error);
  }, [selectedMonth]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus({ msg: "Upload en cours...", type: "info" });
    try {
      const result = await uploadFile(file);
      setUploadStatus({ msg: result.message, type: "success" });
      const m = await fetchAvailableMonths();
      setMonths(m);
      if (m.length > 0) setSelectedMonth(m[0]);
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      setUploadStatus({ msg: "Erreur: " + (err instanceof Error ? err.message : "Upload failed"), type: "error" });
      setTimeout(() => setUploadStatus(null), 5000);
    }
    e.target.value = "";
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!selectedMonth) return;
    setRefreshing(true);
    setRefreshStatus(null);
    try {
      const result = await refreshFromWindsor(selectedMonth);
      setRefreshStatus({ msg: `${result.upserted} lignes synchronisées`, type: "success" });
      const [data, costs] = await Promise.all([fetchMonthData(selectedMonth), fetchOpsCosts(selectedMonth)]);
      setRawData(data);
      setOpsCosts(costs);
      const m = await fetchAvailableMonths();
      setMonths(m);
    } catch (err) {
      setRefreshStatus({ msg: "Erreur: " + (err instanceof Error ? err.message : "Sync failed"), type: "error" });
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshStatus(null), 4000);
    }
  }, [selectedMonth]);

  const MONTH_NAMES: Record<string, string> = {
    "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
    "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
    "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre",
  };

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    return `${MONTH_NAMES[mo] || mo} ${y}`;
  };

  return (
    <div className={dark ? "dark" : ""}>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar dark={dark} setDark={setDark} view={view} navigate={navigate} selectedGroup={selectedGroup} monthData={monthData} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="border-b border-border glass-header px-6 py-3 flex items-center gap-3 shrink-0 z-20">
            {/* Month selector */}
            <div className="relative">
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border hover:bg-accent/50 text-sm font-medium transition-all duration-200 hover:border-ring/30"
              >
                {selectedMonth ? formatMonth(selectedMonth) : "Sélectionner un mois"}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showMonthPicker ? "rotate-180" : ""}`} />
              </button>
              {showMonthPicker && (
                <div className="absolute top-full mt-1.5 left-0 bg-card border border-border rounded-xl shadow-xl z-50 min-w-[200px] py-1.5 animate-slide-down">
                  {months.map((m) => (
                    <button
                      key={m}
                      onClick={() => { setSelectedMonth(m); setShowMonthPicker(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-accent/50 flex items-center gap-2.5 transition-colors ${
                        m === selectedMonth ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {m === selectedMonth && <Check className="w-3.5 h-3.5 text-blue-500" />}
                      {m !== selectedMonth && <span className="w-3.5" />}
                      {formatMonth(m)}
                    </button>
                  ))}
                  {months.length === 0 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground">Aucun mois disponible</div>
                  )}
                </div>
              )}
            </div>

            {/* Sync Windsor */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                refreshing
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-500"
                  : "border-border hover:bg-accent/50 hover:border-ring/30"
              } disabled:cursor-not-allowed`}
              title="Synchroniser depuis Windsor.ai"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Synchronisation..." : "Sync Windsor"}
            </button>

            {/* Status toasts */}
            {refreshStatus && <Toast message={refreshStatus.msg} type={refreshStatus.type} />}
            {uploadStatus && <Toast message={uploadStatus.msg} type={uploadStatus.type} />}

            <div className="flex-1" />

            {/* Upload */}
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border hover:bg-accent/50 text-sm font-medium cursor-pointer transition-all duration-200 hover:border-ring/30">
              <Upload className="w-4 h-4" />
              Importer JSON
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </header>

          {/* Progress bar during sync */}
          {refreshing && (
            <div className="h-0.5 w-full progress-bar" />
          )}

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            {loading && view !== "historysync" && view !== "cumulative" && <SkeletonLoader />}
            {error && view !== "historysync" && view !== "cumulative" && (
              <div className="flex items-center justify-center h-64 animate-fade-in">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-red-500 font-medium mb-1">{error}</p>
                  <p className="text-sm text-muted-foreground">Importez un fichier JSON pour commencer.</p>
                </div>
              </div>
            )}
            {!loading && !error && rawData.length === 0 && view !== "historysync" && view !== "cumulative" && (
              <div className="flex items-center justify-center h-64 animate-fade-in">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-semibold mb-1">Aucune donnée</p>
                  <p className="text-sm text-muted-foreground">
                    Importez un fichier JSON ou cliquez sur "Sync Windsor" pour commencer.
                  </p>
                </div>
              </div>
            )}
            {view === "historysync" && (
              <HistorySync onComplete={() => {
                setView("dashboard");
                // Reload months and data
                fetchAvailableMonths().then((m) => {
                  setMonths(m);
                  if (m.length > 0) setSelectedMonth(m[0]);
                });
              }} />
            )}
            {view === "cumulative" && (
              <CumulativeReport navigate={navigate} />
            )}
            {!loading && !error && rawData.length > 0 && view !== "historysync" && view !== "cumulative" && (
              <>
                {view === "dashboard" && <Dashboard monthData={monthData} prevMonthData={prevMonthData} navigate={navigate} />}
                {view === "group" && <GroupView monthData={monthData} group={selectedGroup} navigate={navigate} updateOpsCost={updateOpsCost} />}
                {view === "account" && <AccountDetail monthData={monthData} accountGname={selectedAccount} navigate={navigate} opsCost={opsCosts} updateOpsCost={updateOpsCost} />}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
