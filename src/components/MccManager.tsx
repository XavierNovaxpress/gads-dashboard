import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Search, ChevronDown, ChevronRight, Loader2,
  CheckCircle2, AlertCircle, Building2, Link, RefreshCw, X, Save,
} from "lucide-react";
import {
  fetchMccs, createMcc, deleteMcc, discoverMccAccounts,
  fetchManagedAccounts, addManagedAccount, bulkAddManagedAccounts,
  updateManagedAccount, deleteManagedAccount,
  type MccAccount, type ManagedAccount, type DiscoveredAccount,
} from "../lib/api";

// ── Default groups available for selection ──────────────────────────────────
const DEFAULT_GROUPS = ["Ondoxa", "Liremia", "Groupe Umami / Seablue", "Groupe Wizorg", "Autres"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function Alert({ type, message }: { type: "success" | "error" | "info"; message: string }) {
  const styles = {
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    error: "bg-red-500/10 border-red-500/30 text-red-400",
    info: "bg-[#EC5760]/10 border-[#EC5760]/30 text-[#EC5760]",
  };
  const icons = { success: CheckCircle2, error: AlertCircle, info: RefreshCw };
  const Icon = icons[type];
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${styles[type]}`}>
      <Icon className="w-4 h-4 shrink-0" />
      {message}
    </div>
  );
}

// ── Add MCC Form ─────────────────────────────────────────────────────────────
function AddMccForm({ onAdded }: { onAdded: (mcc: MccAccount) => void }) {
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !apiKey.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const mcc = await createMcc(name.trim(), apiKey.trim());
      onAdded(mcc);
      setName("");
      setApiKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du compte MCC"
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#EC5760]/40"
          required
        />
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Clé API Windsor.ai"
          type="password"
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#EC5760]/40"
          required
        />
      </div>
      {error && <Alert type="error" message={error} />}
      <button
        type="submit"
        disabled={loading || !name.trim() || !apiKey.trim()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#EC5760] text-white hover:bg-[#D94550] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Ajouter MCC
      </button>
    </form>
  );
}

// ── Account Row (editable) ───────────────────────────────────────────────────
function AccountRow({
  account,
  allGroups,
  onUpdate,
  onDelete,
}: {
  account: ManagedAccount;
  allGroups: string[];
  onUpdate: (id: number, data: Partial<ManagedAccount>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(account.label);
  const [cid, setCid] = useState(account.cid);
  const [group, setGroup] = useState(account.group_name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(account.id, { label, cid, group_name: group });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer "${account.label}" ?`)) return;
    setDeleting(true);
    try {
      await onDelete(account.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <tr className="border-b border-border/50 hover:bg-accent/20 transition-colors">
      <td className="py-2.5 px-3 text-xs text-muted-foreground font-mono max-w-[200px] truncate" title={account.gname || ""}>
        {account.gname || <span className="italic opacity-40">—</span>}
      </td>
      <td className="py-2.5 px-3">
        {editing ? (
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-2 py-1 rounded border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-[#EC5760]/40"
          />
        ) : (
          <span className="text-sm font-medium">{account.label}</span>
        )}
      </td>
      <td className="py-2.5 px-3">
        {editing ? (
          <input
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            placeholder="000-000-0000"
            className="w-full px-2 py-1 rounded border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#EC5760]/40"
          />
        ) : (
          <span className="text-xs font-mono text-muted-foreground">{account.cid || <span className="italic opacity-40">—</span>}</span>
        )}
      </td>
      <td className="py-2.5 px-3">
        {editing ? (
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="px-2 py-1 rounded border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-[#EC5760]/40"
          >
            {allGroups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/60 text-muted-foreground">{account.group_name}</span>
        )}
      </td>
      <td className="py-2.5 px-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                title="Sauvegarder"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => { setEditing(false); setLabel(account.label); setCid(account.cid); setGroup(account.group_name); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent/50 transition-colors"
                title="Annuler"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors text-xs"
              title="Modifier"
            >
              Éditer
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
            title="Supprimer"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Discovery Modal ──────────────────────────────────────────────────────────
function DiscoveryModal({
  mcc,
  existingGnames,
  onClose,
  onImport,
}: {
  mcc: MccAccount;
  existingGnames: Set<string>;
  onClose: () => void;
  onImport: (accounts: Array<{ label: string; cid: string; gname: string; group_name: string }>) => Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [discovered, setDiscovered] = useState<DiscoveredAccount[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [cids, setCids] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [allGroups] = useState(DEFAULT_GROUPS);

  useEffect(() => {
    discoverMccAccounts(mcc.id)
      .then((result) => {
        setDiscovered(result.accounts);
        setDateRange(result.dateRange);
        // Pre-populate labels from gname, default group
        const initLabels: Record<string, string> = {};
        const initGroups: Record<string, string> = {};
        const initSelected = new Set<string>();
        for (const a of result.accounts) {
          if (!existingGnames.has(a.gname)) {
            initSelected.add(a.gname);
          }
          initLabels[a.gname] = a.gname;
          initGroups[a.gname] = "Autres";
        }
        setLabels(initLabels);
        setGroups(initGroups);
        setSelected(initSelected);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Découverte échouée"))
      .finally(() => setLoading(false));
  }, [mcc.id]);

  const toggleSelect = (gname: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(gname) ? s.delete(gname) : s.add(gname);
      return s;
    });
  };

  const handleImport = async () => {
    const toImport = discovered
      .filter((a) => selected.has(a.gname))
      .map((a) => ({
        label: labels[a.gname] || a.gname,
        cid: cids[a.gname] || "",
        gname: a.gname,
        group_name: groups[a.gname] || "Autres",
      }));
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      await onImport(toImport);
      onClose();
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-base">Découverte de comptes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{mcc.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center gap-3 justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[#EC5760]" />
              <span className="text-sm text-muted-foreground">Interrogation de Windsor.ai...</span>
            </div>
          )}
          {error && <Alert type="error" message={error} />}
          {!loading && !error && discovered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Aucun compte trouvé sur les 7 derniers jours.
            </div>
          )}
          {!loading && !error && discovered.length > 0 && (
            <>
              {dateRange && (
                <p className="text-xs text-muted-foreground mb-4">
                  Comptes actifs du <strong>{dateRange.from}</strong> au <strong>{dateRange.to}</strong> — {discovered.length} trouvé(s)
                </p>
              )}
              <div className="space-y-2">
                {discovered.map((a) => {
                  const alreadyExists = existingGnames.has(a.gname);
                  const isSelected = selected.has(a.gname);
                  return (
                    <div
                      key={a.gname}
                      className={`rounded-xl border p-3 transition-colors ${
                        alreadyExists
                          ? "border-border/30 opacity-50"
                          : isSelected
                          ? "border-[#EC5760]/40 bg-[#EC5760]/5"
                          : "border-border hover:border-border/80"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected && !alreadyExists}
                          disabled={alreadyExists}
                          onChange={() => !alreadyExists && toggleSelect(a.gname)}
                          className="mt-1 accent-[#EC5760]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-muted-foreground truncate max-w-[280px]">{a.gname}</span>
                            {alreadyExists && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Déjà importé
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground/60 ml-auto">
                              {a.total_spend > 0 ? `${a.total_spend.toFixed(0)} € dépensés` : ""}
                            </span>
                          </div>
                          {isSelected && !alreadyExists && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                value={labels[a.gname] || ""}
                                onChange={(e) => setLabels((p) => ({ ...p, [a.gname]: e.target.value }))}
                                placeholder="Label affiché"
                                className="px-2 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-[#EC5760]/40"
                              />
                              <input
                                value={cids[a.gname] || ""}
                                onChange={(e) => setCids((p) => ({ ...p, [a.gname]: e.target.value }))}
                                placeholder="CID (ex: 123-456-7890)"
                                className="px-2 py-1.5 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#EC5760]/40"
                              />
                              <select
                                value={groups[a.gname] || "Autres"}
                                onChange={(e) => setGroups((p) => ({ ...p, [a.gname]: e.target.value }))}
                                className="px-2 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-[#EC5760]/40"
                              >
                                {allGroups.map((g) => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && discovered.length > 0 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {selected.size} compte(s) sélectionné(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent/50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={importing || selected.size === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EC5760] text-white text-sm font-medium hover:bg-[#D94550] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Importer {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Single Account Form ──────────────────────────────────────────────────
function AddAccountForm({
  mccId,
  allGroups,
  onAdded,
}: {
  mccId: number;
  allGroups: string[];
  onAdded: () => void;
}) {
  const [label, setLabel] = useState("");
  const [cid, setCid] = useState("");
  const [gname, setGname] = useState("");
  const [group, setGroup] = useState("Autres");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await addManagedAccount(mccId, {
        label: label.trim(),
        cid: cid.trim(),
        gname: gname.trim() || null,
        group_name: group,
      });
      onAdded();
      setLabel(""); setCid(""); setGname(""); setGroup("Autres");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label affiché *"
        className="px-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-[#EC5760]/40"
        required
      />
      <input
        value={gname}
        onChange={(e) => setGname(e.target.value)}
        placeholder="Nom Windsor (gname)"
        className="px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#EC5760]/40"
      />
      <input
        value={cid}
        onChange={(e) => setCid(e.target.value)}
        placeholder="CID (000-000-0000)"
        className="px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#EC5760]/40"
      />
      <div className="flex gap-2">
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="flex-1 px-2 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-[#EC5760]/40"
        >
          {allGroups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button
          type="submit"
          disabled={loading || !label.trim()}
          className="px-3 py-2 rounded-lg bg-[#EC5760]/10 text-[#EC5760] hover:bg-[#EC5760]/20 disabled:opacity-50 transition-colors"
          title="Ajouter"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
      {error && <div className="sm:col-span-4"><Alert type="error" message={error} /></div>}
    </form>
  );
}

// ── MCC Card ─────────────────────────────────────────────────────────────────
function MccCard({
  mcc,
  accounts,
  allGroups,
  onDelete,
  onRefreshAccounts,
}: {
  mcc: MccAccount;
  accounts: ManagedAccount[];
  allGroups: string[];
  onDelete: (id: number) => Promise<void>;
  onRefreshAccounts: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const existingGnames = new Set(accounts.map((a) => a.gname).filter(Boolean) as string[]);

  const handleDelete = async () => {
    if (!confirm(`Supprimer le MCC "${mcc.name}" et tous ses comptes ?`)) return;
    setDeleting(true);
    try {
      await onDelete(mcc.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkImport = async (
    discovered: Array<{ label: string; cid: string; gname: string; group_name: string }>
  ) => {
    await bulkAddManagedAccounts(mcc.id, discovered);
    await onRefreshAccounts();
    setStatus({ type: "success", msg: `${discovered.length} compte(s) importé(s)` });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleUpdateAccount = async (id: number, data: Partial<ManagedAccount>) => {
    await updateManagedAccount(id, data);
    await onRefreshAccounts();
  };

  const handleDeleteAccount = async (id: number) => {
    await deleteManagedAccount(id);
    await onRefreshAccounts();
  };

  const handleAccountAdded = async () => {
    await onRefreshAccounts();
    setStatus({ type: "success", msg: "Compte ajouté" });
    setTimeout(() => setStatus(null), 2000);
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* MCC header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
          <div className="w-8 h-8 rounded-lg bg-[#EC5760]/10 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-[#EC5760]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{mcc.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-mono">{mcc.windsor_api_key_preview}</span>
              <span className="mx-2 opacity-30">·</span>
              {accounts.length} compte{accounts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDiscovery(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent/50 transition-colors"
              title="Découvrir les comptes via Windsor.ai"
            >
              <Search className="w-3.5 h-3.5" />
              Découvrir
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Supprimer ce MCC"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent/50 transition-colors"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="p-5 space-y-4">
            {status && <Alert type={status.type} message={status.msg} />}

            {/* Accounts table */}
            {accounts.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Nom Windsor (gname)</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Label</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">CID</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Groupe</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <AccountRow
                        key={a.id}
                        account={a}
                        allGroups={allGroups}
                        onUpdate={handleUpdateAccount}
                        onDelete={handleDeleteAccount}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun compte. Utilisez "Découvrir" ou ajoutez manuellement ci-dessous.
              </p>
            )}

            {/* Add single account */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Ajouter manuellement</p>
              <AddAccountForm mccId={mcc.id} allGroups={allGroups} onAdded={handleAccountAdded} />
            </div>
          </div>
        )}
      </div>

      {showDiscovery && (
        <DiscoveryModal
          mcc={mcc}
          existingGnames={existingGnames}
          onClose={() => setShowDiscovery(false)}
          onImport={handleBulkImport}
        />
      )}
    </>
  );
}

// ── Main MccManager Component ─────────────────────────────────────────────────
export function MccManager({ onAccountsChanged }: { onAccountsChanged?: () => void }) {
  const [mccs, setMccs] = useState<MccAccount[]>([]);
  const [allAccounts, setAllAccounts] = useState<ManagedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Collect all groups from existing accounts + defaults
  const allGroups = [
    ...DEFAULT_GROUPS,
    ...Array.from(new Set(allAccounts.map((a) => a.group_name))).filter(
      (g) => !DEFAULT_GROUPS.includes(g)
    ),
  ];

  const loadData = useCallback(async () => {
    try {
      const [mccList, accountList] = await Promise.all([fetchMccs(), fetchManagedAccounts()]);
      setMccs(mccList);
      setAllAccounts(accountList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefreshAccounts = useCallback(async () => {
    const accountList = await fetchManagedAccounts();
    setAllAccounts(accountList);
    onAccountsChanged?.();
  }, [onAccountsChanged]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMccAdded = (mcc: MccAccount) => {
    setMccs((prev) => [...prev, mcc]);
  };

  const handleMccDeleted = async (id: number) => {
    await deleteMcc(id);
    setMccs((prev) => prev.filter((m) => m.id !== id));
    setAllAccounts((prev) => prev.filter((a) => a.mcc_id !== id));
    onAccountsChanged?.();
  };

  return (
    <div className="p-6 max-w-[1000px] animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#EC5760]/10 flex items-center justify-center">
            <Link className="w-4.5 h-4.5 text-[#EC5760]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Comptes MCC</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connectez plusieurs MCC Google Ads, découvrez les CIDs et mappez les comptes.
            </p>
          </div>
        </div>
      </div>

      {/* Add new MCC */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#EC5760]" />
          Ajouter un compte MCC
        </h2>
        <AddMccForm onAdded={handleMccAdded} />
      </div>

      {/* MCC list */}
      {loading ? (
        <div className="flex items-center gap-3 justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-[#EC5760]" />
          <span className="text-sm text-muted-foreground">Chargement...</span>
        </div>
      ) : error ? (
        <Alert type="error" message={error} />
      ) : mccs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Aucun compte MCC connecté.</p>
          <p className="text-xs mt-1">Ajoutez votre premier MCC avec sa clé API Windsor.ai.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mccs.map((mcc) => (
            <MccCard
              key={mcc.id}
              mcc={mcc}
              accounts={allAccounts.filter((a) => a.mcc_id === mcc.id)}
              allGroups={allGroups}
              onDelete={handleMccDeleted}
              onRefreshAccounts={handleRefreshAccounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}
