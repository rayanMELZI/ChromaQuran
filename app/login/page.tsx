"use client";

import { useState, type FormEvent } from "react";
import { Background } from "@/components/Background";
import { Emblem } from "@/components/Emblem";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload = mode === "signup" ? { name, email, password } : { email, password };
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        // Hard navigation (not router.replace) so the whole app — incl. StudioProvider —
        // remounts with the new session and re-fetches this user's library + settings.
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.href = next && next.startsWith("/") ? next : "/";
      } else {
        const d = await r.json().catch(() => ({}));
        setError(d.error || "Something went wrong");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const signup = mode === "signup";

  return (
    <>
      <Background />
      <div className="login-wrap">
        <form className="card glass login-card" onSubmit={submit}>
          <div className="brand" style={{ justifyContent: "center" }}>
            <span className="mark">
              <Emblem />
            </span>
            <div>
              <div className="t1">
                Chroma <b>Quran</b>
              </div>
              <div className="t2">Black-canvas Quran video studio</div>
            </div>
          </div>

          <h2 style={{ textAlign: "center", fontSize: 18 }}>{signup ? "Create account" : "Sign in"}</h2>

          {signup ? (
            <div>
              <label className="lbl">Name</label>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus autoComplete="name" />
            </div>
          ) : null}
          <div>
            <label className="lbl">Email</label>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus={!signup}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="lbl">Password</label>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={signup ? "new-password" : "current-password"}
            />
          </div>

          {error ? <div className="login-error">{error}</div> : null}

          <button className="btn btn-gold btn-block" type="submit" disabled={busy} style={{ padding: "13px" }}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
          </button>

          <div className="login-note">
            {signup ? "Already have an account? " : "New here? "}
            <button
              type="button"
              className="login-link"
              onClick={() => {
                setMode(signup ? "signin" : "signup");
                setError("");
              }}
            >
              {signup ? "Sign in" : "Create one"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
