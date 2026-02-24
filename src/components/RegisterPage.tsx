import { useState, useEffect } from "react";
import { User as UserIcon, Lock, Eye, EyeOff, TrendingUp, Loader2, AlertCircle } from "lucide-react";
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

  const bgStyle = { background: "linear-gradient(135deg, #12213A 0%, #0E1A2E 50%, #12213A 100%)" };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: "#EC5760" }} />
          <p className="text-sm text-white/50">V&eacute;rification de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={bgStyle}>
        <div className="w-full max-w-sm text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
               style={{ background: "rgba(236,87,96,0.15)" }}>
            <AlertCircle size={28} style={{ color: "#EC5760" }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Invitation invalide</h2>
          <p className="text-sm text-white/50 mb-6">{error}</p>
          <button onClick={onGoToLogin} className="px-6 py-2.5 rounded-lg text-sm font-semibold btn-coral">
            Aller &agrave; la connexion
          </button>
        </div>
      </div>
    );
  }

  const inputStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#EC5760"; e.target.style.boxShadow = "0 0 0 3px rgba(236,87,96,0.15)"; };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={bgStyle}>
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
               style={{ background: "linear-gradient(135deg, #EC5760 0%, #D94550 100%)", boxShadow: "0 8px 24px rgba(236,87,96,0.3)" }}>
            <TrendingUp size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Cr&eacute;er votre compte</h1>
          <p className="text-sm text-white/50 mt-1">
            Invitation pour <span className="font-medium text-white/80">{email}</span>
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg text-sm font-medium" style={{ background: "rgba(236,87,96,0.12)", border: "1px solid rgba(236,87,96,0.25)", color: "#F2777E" }}>
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Votre nom</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg text-sm text-white placeholder-white/25"
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                  placeholder="Pr&eacute;nom Nom" required autoFocus />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-white placeholder-white/25"
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                  placeholder="Min. 8 caract&egrave;res" minLength={8} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-semibold btn-coral">
              {loading ? "Cr&eacute;ation..." : "Cr&eacute;er mon compte"}
            </button>
          </form>
        </div>

        <p className="text-center mt-6">
          <button onClick={onGoToLogin} className="text-xs hover:underline" style={{ color: "#EC5760" }}>
            D&eacute;j&agrave; un compte ? Se connecter
          </button>
        </p>
      </div>
    </div>
  );
}
