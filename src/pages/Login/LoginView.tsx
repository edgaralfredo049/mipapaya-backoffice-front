import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { authApi } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import logo from "../../../assets/Full logo Orange con espacio.avif";

type Step = "credentials" | "new_password";

export const LoginView = () => {
  const navigate     = useNavigate();
  const { login }    = useAuthStore();

  const [step, setStep]               = useState<Step>("credentials");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [session, setSession]         = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(email, password);

      if ("challenge" in res && res.challenge) {
        if (res.challenge_name === "NEW_PASSWORD_REQUIRED") {
          setSession(res.session);
          setStep("new_password");
        } else {
          setError(`Challenge no soportado: ${res.challenge_name}`);
        }
        return;
      }

      // Login exitoso
      const { token, user, permissions } = res as any;
      login(token, user, permissions);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPass) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.respondChallenge(
        session,
        "NEW_PASSWORD_REQUIRED",
        email,
        newPassword,
      );

      if ("challenge" in res && res.challenge) {
        setError("Se requiere un paso adicional. Contacta al administrador.");
        return;
      }

      const { token, user, permissions } = res as any;
      login(token, user, permissions);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message || "Error al establecer contraseña");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="MiPapaya" className="h-10 w-auto object-contain" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {step === "credentials" ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Iniciar sesión</h1>
              <p className="text-sm text-gray-500 mb-6">Backoffice administrativo</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:border-papaya-orange focus:outline-none focus:ring-1 focus:ring-papaya-orange/30 transition-colors"
                    placeholder="usuario@mipapaya.io"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-200 px-3 pr-10 text-sm text-gray-800 focus:border-papaya-orange focus:outline-none focus:ring-1 focus:ring-papaya-orange/30 transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg bg-papaya-orange text-white text-sm font-semibold hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="animate-pulse">Verificando…</span>
                  ) : (
                    <>
                      <LogIn size={15} />
                      Ingresar
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Establecer contraseña</h1>
              <p className="text-sm text-gray-500 mb-6">
                Es tu primer ingreso. Define una contraseña nueva para tu cuenta.
              </p>

              <form onSubmit={handleNewPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      required
                      autoFocus
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-200 px-3 pr-10 text-sm text-gray-800 focus:border-papaya-orange focus:outline-none focus:ring-1 focus:ring-papaya-orange/30 transition-colors"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Mín. 8 caracteres, mayúscula, número y símbolo
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:border-papaya-orange focus:outline-none focus:ring-1 focus:ring-papaya-orange/30 transition-colors"
                    placeholder="Repite la contraseña"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg bg-papaya-orange text-white text-sm font-semibold hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <span className="animate-pulse">Guardando…</span> : "Confirmar contraseña"}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setError(null); }}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← Volver al login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
