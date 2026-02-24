import { useState, useMemo, useCallback, useEffect } from "react";
import { buildMonthData, type MonthData } from "./lib/data";
import { type RawRow, fetchMonthData, fetchAvailableMonths, fetchOpsCosts, updateOpsCostApi, uploadFile } from "./lib/api";
import { GROUP_ORDER } from "./lib/accounts";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { GroupView } from "./components/GroupView";
import { AccountDetail } from "./components/AccountDetail";
import { Upload, RefreshCw, ChevronDown, Check, Loader2 } from "lucide-react";

type View = "dashboard" | "group" | "account";

export default function App() {
  const [dark, setDark] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [selectedGroup, setSelectedGroup] = useState<string>(GROUP_ORDER[0]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [opsCosts, setOpsCosts] = useState<Record<string, number>>({});

  // API state
  const [rawData, setRawData] = useState<RawRow[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Load months on mount
  useEffect(() => {
    fetchAvailableMonths()
      .then((m) => {
        setMonths(m);
        if (m.length > 0 && !selectedMonth) {
          setSelectedMonth(m[0]); // most recent
        }
        if (m.length === 0) setLoading(false);
      })
      .catch((err) => {
        setError("Impossible de charger les mois disponibles");
        setLoading(false);
        console.error(err);
      });
  }, []);

  // Load data when month changes
  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchMonthData(selectedMonth), fetchOpsCosts(selectedMonth)])
      .then(([data, costs]) => {
        setRawData(data);
        setOpsCosts(costs);
        setLoading(false);
      })
      .catch((err) => {
        setError("Erreur lors du chargement des données");
        setLoading(false);
        console.error(err);
      });
  }, [selectedMonth]);

  const monthData: MonthData = useMemo(
    () => buildMonthData(rawData, opsCosts),
    [rawData, opsCosts]
  );

  const navigate = useCallback((v: View, group?: string, account?: string) => {
    setView(v);
    if (group) setSelectedGroup(group);
    if (account) setSelectedAccount(account);
  }, []);

  const updateOpsCost = useCallback(
    (label: string, cost: number) => {
      setOpsCosts((prev) => ({ ...prev, [label]: cost }));
      // Persist to API
      if (selectedMonth) {
        updateOpsCostApi(label, selectedMonth, cost).catch(console.error);
      }
    },
    [selectedMonth]
  );

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus("Upload en cours...");
    try {
      const result = await uploadFile(file);
      setUploadStatus(`${result.message}`);
      // Reload months and data
      const m = await fetchAvailableMonths();
      setMonths(m);
      if (m.length > 0) {
        setSelectedMonth(m[0]);
      }
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      setUploadStatus("Erreur: " + (err instanceof Error ? err.message : "Upload failed"));
      setTimeout(() => setUploadStatus(null), 5000);
    }
    e.target.value = "";
  }, []);

  const handleRefresh = useCallback(() => {
    if (selectedMonth) {
      setLoading(true);
      Promise.all([fetchMonthData(selectedMonth), fetchOpsCosts(selectedMonth)])
        .then(([data, costs]) => {
          setRawData(data);
          setOpsCosts(costs);
          setLoading(false);
        })
        .catch(() => setLoading(false));
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
        <Sidebar
          dark={dark}
          setDark={setDark}
          view={view}
          navigate={navigate}
          selectedGroup={selectedGroup}
          monthData={monthData}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar with month selector + upload */}
          <header className="border-b border-border bg-card px-6 py-3 flex items-center gap-3 shrink-0">
            {/* Month selector */}
            <div className="relative">
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-accent/50 text-sm transition-colors"
              >
                {selectedMonth ? formatMonth(selectedMonth) : "Sélectionner un mois"}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showMonthPicker && (
                <div className="absolute top-full mt-1 left-0 bg-card border border-border rounded-md shadow-lg z-50 min-w-[180px] py-1">
                  {months.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedMonth(m);
                        setShowMonthPicker(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent/50 flex items-center gap-2 ${
                        m === selectedMonth ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {m === selectedMonth && <Check className="w-3 h-3" />}
                      {formatMonth(m)}
                    </button>
                  ))}
                  {months.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Aucun mois disponible</div>
                  )}
                </div>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <div className="flex-1" />

            {/* Upload */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-accent/50 text-sm cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Importer JSON
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>

            {/* Upload status */}
            {uploadStatus && (
              <span className="text-xs text-muted-foreground">{uploadStatus}</span>
            )}
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-red-500 mb-2">{error}</p>
                  <p className="text-sm text-muted-foreground">
                    Importez un fichier JSON pour commencer.
                  </p>
                </div>
              </div>
            )}
            {!loading && !error && rawData.length === 0 && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-lg font-medium mb-1">Aucune donnée</p>
                  <p className="text-sm text-muted-foreground">
                    Importez un fichier JSON (mtd.json) ou envoyez les données via l'API.
                  </p>
                </div>
              </div>
            )}
            {!loading && !error && rawData.length > 0 && (
              <>
                {view === "dashboard" && (
                  <Dashboard monthData={monthData} navigate={navigate} />
                )}
                {view === "group" && (
                  <GroupView
                    monthData={monthData}
                    group={selectedGroup}
                    navigate={navigate}
                    updateOpsCost={updateOpsCost}
                  />
                )}
                {view === "account" && (
                  <AccountDetail
                    monthData={monthData}
                    accountGname={selectedAccount}
                    navigate={navigate}
                    opsCost={opsCosts}
                    updateOpsCost={updateOpsCost}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
