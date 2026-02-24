import { useState, useEffect } from "react";
import {
  UserPlus, Copy, Check, Users, Mail, Clock, Shield, ChevronLeft, Loader2,
} from "lucide-react";
import {
  createInvitation, fetchInvitations, fetchUsers,
  type User, type Invitation,
} from "../lib/auth";

interface Props {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: Props) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([fetchInvitations(), fetchUsers()])
      .then(([inv, usr]) => {
        setInvitations(inv);
        setUsers(usr);
      })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteUrl("");
    setInviteLoading(true);
    try {
      const result = await createInvitation(email);
      setInviteUrl(result.invitationUrl);
      setEmail("");
      // Refresh invitations list
      const inv = await fetchInvitations();
      setInvitations(inv);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const invStatus = (inv: Invitation) => {
    if (inv.used_at) return { label: "Utilis\u00e9e", color: "text-green-600 bg-green-500/10" };
    if (new Date(inv.expires_at) < new Date()) return { label: "Expir\u00e9e", color: "text-red-500 bg-red-500/10" };
    return { label: "En attente", color: "text-yellow-600 bg-yellow-500/10" };
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-muted transition"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield size={20} className="text-blue-600" /> Administration
          </h2>
          <p className="text-sm text-muted-foreground">G\u00e9rer les utilisateurs et les invitations</p>
        </div>
      </div>

      {/* Invite Form */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
          <UserPlus size={16} className="text-blue-600" /> Inviter un utilisateur
        </h3>

        <form onSubmit={handleInvite} className="flex gap-2">
          <div className="relative flex-1">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
              required
            />
          </div>
          <button
            type="submit"
            disabled={inviteLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50 whitespace-nowrap"
          >
            {inviteLoading ? "..." : "Inviter"}
          </button>
        </form>

        {inviteError && (
          <p className="text-red-500 text-xs mt-2">{inviteError}</p>
        )}

        {inviteUrl && (
          <div className="mt-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <p className="text-xs text-muted-foreground mb-1">Lien d'invitation (valide 48h) :</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-foreground bg-background/50 px-2 py-1.5 rounded overflow-x-auto">
                {inviteUrl}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-muted transition flex-shrink-0"
                title="Copier"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {loadingData ? (
        <div className="text-center py-8">
          <Loader2 size={24} className="animate-spin text-muted-foreground mx-auto" />
        </div>
      ) : (
        <>
          {/* Users List */}
          <div className="border border-border rounded-xl p-5 bg-card">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <Users size={16} className="text-blue-600" /> Utilisateurs ({users.length})
            </h3>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50">
                  <div>
                    <span className="text-sm font-medium">{u.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                  </div>
                  {u.is_admin && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-medium">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invitations List */}
          <div className="border border-border rounded-xl p-5 bg-card">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <Clock size={16} className="text-blue-600" /> Invitations ({invitations.length})
            </h3>
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune invitation envoy\u00e9e</p>
            ) : (
              <div className="space-y-2">
                {invitations.map((inv) => {
                  const status = invStatus(inv);
                  return (
                    <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50">
                      <div>
                        <span className="text-sm">{inv.email}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {fmtDate(inv.created_at)}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
