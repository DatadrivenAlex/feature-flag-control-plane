import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Flag } from "../src/engine.js";
import "./style.css";
type Audit = {
  at: string;
  key: string;
  from: number;
  to: number;
  enabled: boolean;
  rollout: number;
};
async function api(path: string, init?: RequestInit) {
  const r = await fetch("/api/" + path, init);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "Request failed");
  return data;
}
function App() {
  const [flags, setFlags] = useState<Flag[]>([]),
    [selected, setSelected] = useState("smart-search"),
    [audit, setAudit] = useState<Audit[]>([]);
  const [subject, setSubject] = useState("demo-user-42"),
    [plan, setPlan] = useState("pro"),
    [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function reload() {
    try {
      setFlags(await api("flags"));
      setAudit(await api("audit"));
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  const flag = flags.find((f) => f.key === selected);
  function edit(change: Partial<Flag>) {
    setFlags(flags.map((f) => (f.key === selected ? { ...f, ...change } : f)));
    setResult(null);
  }
  async function save() {
    if (!flag) return;
    setBusy(true);
    setError("");
    try {
      await api("flags/" + flag.key, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(flag),
      });
      await reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function check() {
    setError("");
    try {
      setResult(
        await api("evaluate/" + selected, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, plan }),
        }),
      );
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <>
      <aside>
        <div className="logo">
          R<span>Rollout Studio</span>
        </div>
        <div className="workspace">
          WORKSPACE <b>Portfolio sandbox</b>
        </div>
        <nav>
          <a className="active" href="#flags">
            Feature flags <span>{flags.length}</span>
          </a>
          <a href="#evaluate">Decision explorer</a>
          <a href="#audit">Change history</a>
        </nav>
        <div className="aside-note">
          Portfolio demo
          <br />
          Synthetic features · no customer data
        </div>
      </aside>
      <main>
        <header>
          <div className="eyebrow">RELEASE CONTROL / DEMO ENVIRONMENT</div>
          <div className="heading">
            <div>
              <h1>Ship with intention.</h1>
              <p>
                Small releases. Explainable decisions. A clear change trail.
              </p>
            </div>
            <span className="badge">LOCAL SANDBOX</span>
          </div>
        </header>
        <section className="stats">
          <article>
            <span>CONFIGURED FLAGS</span>
            <strong>{flags.length}</strong>
          </article>
          <article>
            <span>ENABLED</span>
            <strong>{flags.filter((f) => f.enabled).length}</strong>
          </article>
          <article>
            <span>RECENT CHANGES</span>
            <strong>{audit.length}</strong>
          </article>
        </section>
        <div className="columns">
          <section id="flags" className="panel">
            <div className="section-heading">
              <h2>Feature controls</h2>
              <button className="quiet" onClick={() => void reload()}>
                Reload saved state
              </button>
            </div>
            <div className="tabs">
              {flags.map((f) => (
                <button
                  key={f.key}
                  className={selected === f.key ? "selected" : ""}
                  onClick={() => {
                    setSelected(f.key);
                    setResult(null);
                  }}
                >
                  {f.name}
                  <small>{f.key}</small>
                </button>
              ))}
            </div>
            {flag && (
              <div className="controls">
                <div className="row">
                  <div>
                    <h3>{flag.name}</h3>
                    <small>Configuration version {flag.version}</small>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={flag.enabled}
                      onChange={(e) => edit({ enabled: e.target.checked })}
                    />{" "}
                    Enabled
                  </label>
                </div>
                <label className="field">
                  Rollout percentage <b>{flag.rollout}%</b>
                  <input
                    aria-label="Rollout percentage"
                    type="range"
                    min="0"
                    max="100"
                    value={flag.rollout}
                    onChange={(e) => edit({ rollout: Number(e.target.value) })}
                  />
                </label>
                <div className="field">
                  Target plans <small>None selected means all plans.</small>
                  <div className="chips">
                    {["free", "pro", "enterprise"].map((p) => (
                      <label key={p}>
                        <input
                          type="checkbox"
                          checked={flag.plans.includes(p as never)}
                          onChange={(e) =>
                            edit({
                              plans: e.target.checked
                                ? [...flag.plans, p as never]
                                : flag.plans.filter((x) => x !== p),
                            })
                          }
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="field">
                  Demo admin token
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder="Set in your local ADMIN_TOKEN environment"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </label>
                <button
                  className="primary"
                  disabled={busy || !token}
                  onClick={() => void save()}
                >
                  {busy ? "Saving…" : "Save configuration"}
                </button>
                <small className="helper">
                  Edits apply after saving. Tokens stay in this page’s memory
                  only.
                </small>
              </div>
            )}
          </section>
          <section id="evaluate" className="panel explorer">
            <div className="section-heading">
              <h2>Decision explorer</h2>
              <span className="dot">SAVED RULES</span>
            </div>
            <p>
              Try a synthetic subject to understand why a feature is on or off.
            </p>
            <label className="field">
              Subject ID
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={100}
              />
            </label>
            <label className="field">
              Plan
              <select value={plan} onChange={(e) => setPlan(e.target.value)}>
                <option>free</option>
                <option>pro</option>
                <option>enterprise</option>
              </select>
            </label>
            <button className="primary outline" onClick={() => void check()}>
              Evaluate saved flag
            </button>
            {result && (
              <div className={"decision " + (result.value ? "on" : "off")}>
                <span>DECISION</span>
                <strong>{result.value ? "Enabled" : "Disabled"}</strong>
                <p>{String(result.reason).replaceAll("_", " ")}</p>
                <small>
                  Bucket {String(result.bucket)} / 9999 · version{" "}
                  {String(result.version)}
                </small>
              </div>
            )}
            <div className="explain">
              <b>How it works</b>
              <p>
                SHA-256 assigns a stable bucket for each flag and subject. Plan
                rules run first; the percentage threshold runs next.
              </p>
            </div>
          </section>
        </div>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        <section id="audit" className="panel history">
          <h2>Change history</h2>
          <p>
            Configuration updates only. Evaluation subject IDs are not stored.
          </p>
          {!audit.length ? (
            <div className="empty">
              No changes yet. Save a configuration to create the first audit
              entry.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Flag</th>
                    <th>Version</th>
                    <th>Rollout</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a, i) => (
                    <tr key={i}>
                      <td>{new Date(a.at).toLocaleString()}</td>
                      <td>{a.key}</td>
                      <td>
                        {a.from} → {a.to}
                      </td>
                      <td>{a.rollout}%</td>
                      <td>{a.enabled ? "Enabled" : "Disabled"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <footer>
          Educational portfolio demo · Single-process JSON storage · Not a
          hosted production service
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
