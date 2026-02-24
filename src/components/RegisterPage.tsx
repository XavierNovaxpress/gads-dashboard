import { useState, useEffect } from "react";
import { User as UserIcon, Lock, Eye, EyeOff, BarChart3, Loader2, AlertCircle } from "lucide-react";
import { register, verifyInvitation, type User } from "../lib/auth";

interface Props {
  token: string;
  onSuccess: (user: User) => void;
  onGoToLogin: () => void;
}

export default function RegisterPage({ token, onSuccess, onGoToLogin }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    verifyInvitation(token).then((result) => {
      if (result.valid && result.email) {
        setValid(true);
        setEmail(result.email);
      } else {
        setError(result.error || "Invitation invalide ou expir\u00e9e");
      }
      setVerifying(false);
    });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caract\u00e8res");
      return;
    }
    setLoading(true);
    try {
      const { user } = await register(token, name, password);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">V\u00e9rification de l'invitation...</p>
        </div>
      </div>
    );
  }

  // Invalid invitation
  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 mb-4">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Invitation invalide</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <button
            onClick={onGoToLogin}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
          >
            Aller \u00e0 la connexion
          </button>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white mb-4">
            <BarChart3 size={28} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cr\u00e9er votre compte</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invitation pour <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Votre nom</label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                placeholder="Pr\u00e9nom Nom"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                placeholder="Min. 8 caract\u00e8res"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Cr\u00e9ation..." : "Cr\u00e9er mon compte"}
          </button>
        </form>

        <p className="text-center mt-6">
          <button onClick={onGoToLogin} className="text-xs text-blue-500 hover:underline">
            D\u00e9j\u00e0 un compte ? Se connecter
          </button>
        </p>
      </div>
    </div>
  );
}
