import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import { buildMonthData, formatMonth, type MonthData } from "./lib/data";
import { type RawRow, fetchMonthData, fetchAvailableMonths, fetchOpsCosts, updateOpsCostApi, uploadFile, refreshFromWindsor, fetchManagedAccounts, type ManagedAccount } from "./lib/api";
import { getCurrentUser, logout, type User } from "./lib/auth";
import { ACCOUNTS, GROUP_ORDER, type AccountConfig } from "./lib/accounts";
import { Sidebar } from "./components/Sidebar";

const Dashboard = lazy(() => import("./components/Dashboard").then(m => ({ default: m.Dashboard })));
const GroupView = lazy(() => import("./components/GroupView").then(m => ({ default: m.GroupView })));
const AccountDetail = lazy(() => import("./components/AccountDetail").then(m => ({ default: m.AccountDetail })));
const HistorySync = lazy(() => import("./components/HistorySync").then(m => ({ default: m.HistorySync })));
const CumulativeReport = lazy(() => import("./components/CumulativeReport").then(m => ({ default: m.CumulativeReport })));
const LoginPage = lazy(() => import("./components/LoginPage"));
const RegisterPage = lazy(() => import("./components/RegisterPage"));
const AdminPanel = lazy(() => import("./components/AdminPanel"));
const MccManager = lazy(() => import("./components/MccManager").then(m => ({ default: m.MccManager })));
import { Upload, RefreshCw, ChevronDown, Check, Loader2, CheckCircle2, AlertCircle, CloudDownload, Menu, X, LogOut, Shield, TrendingUp } from "lucide-react";

type View = "dashboard" | "group" | "account" | "historysync" | "cumulative" | "admin" | "mccmanager";

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
    info: "border-[#EC5760]/30 bg-[#EC5760]/10 text-[#EC5760]",
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

// ─── Auth wrapper ──────────────────────────────────────────────────────────────
function getInviteToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("invite");
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [inviteToken] = useState<string | null>(getInviteToken);

  // Check auth on mount
  useEffect(() => {
    getCurrentUser()
      .then((u) => setUser(u))
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLoginSuccess = (u: User) => {
    setUser(u);
    // Clear invite param from URL
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const handleLogout = async () => {
    try { await logout(); } finally { setUser(null); }
  };

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #12213A 0%, #0E1A2E 50%, #12213A 100%)" }}>
        <div className="text-center">
          <Loader2 size={28} className="animate-spin mx-auto" style={{ color: "#EC5760" }} />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    // Check if this is an invitation link
    if (inviteToken) {
      return (
        <Suspense fallback={null}>
          <RegisterPage
            token={inviteToken}
            onSuccess={handleLoginSuccess}
            onGoToLogin={() => {
              window.history.replaceState({}, "", window.location.pathname);
              window.location.reload();
            }}
          />
        </Suspense>
      );
    }
    return <Suspense fallback={null}><LoginPage onSuccess={handleLoginSuccess} /></Suspense>;
  }

  // Authenticated → Dashboard
  return <AuthenticatedApp user={user} onLogout={handleLogout} />;
}

// ─── Main authenticated app ───────────────────────────────────────────────────
function AuthenticatedApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [dark, setDark] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [selectedGroup, setSelectedGroup] = useState<string>(GROUP_ORDER[0]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [dynamicAccounts, setDynamicAccounts] = useState<AccountConfig[] | null>(null);
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load dynamic accounts from DB (falls back to hardcoded if none configured)
  const loadDynamicAccounts = useCallback(async () => {
    try {
      const managed: ManagedAccount[] = await fetchManagedAccounts();
      if (managed.length > 0) {
        const accounts: AccountConfig[] = managed.map((a) => ({
          label: a.label,
          cid: a.cid,
          gname: a.gname,
          group: a.group_name,
        }));
        setDynamicAccounts(accounts);
      } else {
        setDynamicAccounts(null); // use hardcoded fallback
      }
    } catch {
      setDynamicAccounts(null); // use hardcoded fallback on error
    }
  }, []);

  useEffect(() => { loadDynamicAccounts(); }, [loadDynamicAccounts]);

  // Active account list: dynamic if available, otherwise hardcoded
  const activeAccounts: AccountConfig[] = useMemo(
    () => dynamicAccounts ?? ACCOUNTS,
    [dynamicAccounts]
  );

  // Derived group order from active accounts
  const activeGroupOrder = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const g of GROUP_ORDER) { seen.add(g); order.push(g); }
    for (const a of activeAccounts) {
      if (!seen.has(a.group)) { seen.add(a.group); order.push(a.group); }
    }
    return order.filter((g) => activeAccounts.some((a) => a.group === g));
  }, [activeAccounts]);

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

  const prevMonth = useMemo(() => {
    if (!selectedMonth) return "";
    const [y, m] = selectedMonth.split("-").map(Number);
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    return `${py}-${String(pm).padStart(2, "0")}`;
  }, [selectedMonth]);

  useEffect(() => {
    if (!selectedMonth) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const fetches: Promise<any>[] = [
      fetchMonthData(selectedMonth),
      fetchOpsCosts(selectedMonth),
    ];
    if (prevMonth) {
      fetches.push(fetchMonthData(prevMonth).catch(() => [] as RawRow[]));
    }
    Promise.all(fetches)
      .then(([data, costs, prevData]) => {
        if (cancelled) return;
        setRawData(data);
        setOpsCosts(costs);
        setPrevRawData(prevData || []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError("Erreur lors du chargement des donn\u00e9es");
        setLoading(false);
        console.error(err);
      });
    return () => { cancelled = true; };
  }, [selectedMonth, prevMonth]);

  const monthData: MonthData = useMemo(
    () => buildMonthData(rawData, opsCosts, activeAccounts),
    [rawData, opsCosts, activeAccounts]
  );
  const prevMonthData: MonthData | null = useMemo(() => {
    if (prevRawData.length === 0) return null;
    return buildMonthData(prevRawData, {}, activeAccounts);
  }, [prevRawData, activeAccounts]);

  const navigate = useCallback((v: View, group?: string, account?: string) => {
    if ((v === "admin" || v === "mccmanager") && !user.is_admin) return;
    setView(v);
    if (group !== undefined) setSelectedGroup(group || GROUP_ORDER[0]);
    if (account !== undefined) setSelectedAccount(account || "");
  }, [user.is_admin]);

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
      setRefreshStatus({ msg: `${result.upserted} lignes synchronis\u00e9es`, type: "success" });
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

  return (
    <div className={dark ? "dark" : ""}>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        {/* Desktop sidebar */}
        <div className="sidebar-desktop shrink-0 h-full">
          <Sidebar dark={dark} setDark={setDark} view={view} navigate={(v, g?: string) => { navigate(v as View, g); setSidebarOpen(false); }} selectedGroup={selectedGroup} monthData={monthData} groupOrder={activeGroupOrder} isAdmin={user.is_admin} />
        </div>
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div className="sidebar-mobile-overlay" onClick={() => setSidebarOpen(false)} />
            <div className="sidebar-mobile">
              <Sidebar dark={dark} setDark={setDark} view={view} navigate={(v, g?: string) => { navigate(v as View, g); setSidebarOpen(false); }} selectedGroup={selectedGroup} monthData={monthData} groupOrder={activeGroupOrder} isAdmin={user.is_admin} />
            </div>
          </>
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="border-b border-border glass-header px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3 shrink-0 z-20">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mobile-menu-btn p-2 rounded-lg hover:bg-accent/50 transition-colors"
              aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Month selector */}
            <div className="relative">
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border hover:bg-accent/50 text-sm font-medium transition-all duration-200 hover:border-ring/30"
              >
                {selectedMonth ? formatMonth(selectedMonth) : "S\u00e9lectionner un mois"}
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
                      {m === selectedMonth && <Check className="w-3.5 h-3.5 text-[#EC5760]" />}
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
                  ? "border-[#EC5760]/30 bg-[#EC5760]/10 text-[#EC5760]"
                  : "border-border hover:bg-accent/50 hover:border-ring/30"
              } disabled:cursor-not-allowed`}
              title="Synchroniser depuis Windsor.ai"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{refreshing ? "Synchronisation..." : "Sync Windsor"}</span>
            </button>

            {/* Status toasts */}
            {refreshStatus && <Toast message={refreshStatus.msg} type={refreshStatus.type} />}
            {uploadStatus && <Toast message={uploadStatus.msg} type={uploadStatus.type} />}

            <div className="flex-1" />

            {/* Upload */}
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border hover:bg-accent/50 text-sm font-medium cursor-pointer transition-all duration-200 hover:border-ring/30">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importer JSON</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>

            {/* Admin button */}
            {user.is_admin && (
              <button
                onClick={() => setView("admin")}
                className={`p-2 rounded-lg transition-colors ${view === "admin" ? "bg-[#EC5760]/10 text-[#EC5760]" : "hover:bg-accent/50 text-muted-foreground"}`}
                title="Administration"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}

            {/* User + Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <span className="text-xs text-muted-foreground hidden sm:inline">{user.name}</span>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                title="D\u00e9connexion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Progress bar during sync */}
          {refreshing && (
            <div className="h-0.5 w-full progress-bar" />
          )}

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<SkeletonLoader />}>
            {view === "admin" && user.is_admin && (
              <div className="p-6 max-w-[800px]">
                <AdminPanel onBack={() => setView("dashboard")} />
              </div>
            )}
            {view === "mccmanager" && user.is_admin && (
              <MccManager onAccountsChanged={loadDynamicAccounts} />
            )}
            {loading && view !== "historysync" && view !== "cumulative" && view !== "admin" && view !== "mccmanager" && <SkeletonLoader />}
            {error && view !== "historysync" && view !== "cumulative" && view !== "admin" && view !== "mccmanager" && (
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
            {!loading && !error && rawData.length === 0 && view !== "historysync" && view !== "cumulative" && view !== "admin" && view !== "mccmanager" && (
              <div className="flex items-center justify-center h-64 animate-fade-in">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-semibold mb-1">Aucune donn\u00e9e</p>
                  <p className="text-sm text-muted-foreground">
                    Importez un fichier JSON ou cliquez sur "Sync Windsor" pour commencer.
                  </p>
                </div>
              </div>
            )}
            {view === "historysync" && (
              <HistorySync onComplete={() => {
                setView("dashboard");
                fetchAvailableMonths().then((m) => {
                  setMonths(m);
                  if (m.length > 0) setSelectedMonth(m[0]);
                });
              }} />
            )}
            {view === "cumulative" && (
              <CumulativeReport navigate={navigate} accountOverrides={dynamicAccounts ?? undefined} />
            )}
            {!loading && !error && rawData.length > 0 && view !== "historysync" && view !== "cumulative" && view !== "admin" && view !== "mccmanager" && (
              <>
                {view === "dashboard" && <Dashboard monthData={monthData} prevMonthData={prevMonthData} navigate={navigate} />}
                {view === "group" && <GroupView monthData={monthData} group={selectedGroup} navigate={navigate} updateOpsCost={updateOpsCost} />}
                {view === "account" && <AccountDetail monthData={monthData} accountGname={selectedAccount} navigate={navigate} opsCost={opsCosts} updateOpsCost={updateOpsCost} />}
              </>
            )}
          </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
