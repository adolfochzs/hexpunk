import { useState, useEffect } from "react";

export default function ScarsFeed({ lang = "en" }) {
  const [scars, setScars] = useState([]);
  const [scarsToday, setScarsToday] = useState(2);
  const [dailyLimit, setDailyLimit] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchScars = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/scars");
      const data = await res.json();
      if (data.scars) {
        setScars(data.scars);
        setScarsToday(data.scarsToday ?? data.scars.length);
        setDailyLimit(data.dailyLimit || 3);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn("Could not fetch scars from API, using cached data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScars();
    // Poll every 60 seconds
    const interval = setInterval(fetchScars, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="scars-feed-container">
      <div className="scars-feed-header">
        <div className="scars-feed-title-col">
          <div className="scars-feed-title">
            <span className="scars-pulse-dot">●</span>{" "}
            {lang === "es"
              ? "BITÁCORA FORENSE EN VIVO // REGISTRO ON-CHAIN"
              : "LIVE FORENSIC LOG // ON-CHAIN SCARS FEED"}
          </div>
          <p className="scars-feed-subtitle">
            {lang === "es"
              ? "Cicatrices digitales inscriptas permanentemente por The Digital Pathologist en Base Mainnet."
              : "Permanent digital scars inscribed autonomously by The Digital Pathologist on Base Mainnet."}
          </p>
        </div>

        <div className="scars-feed-meta">
          <div className="quota-pill">
            <span className="quota-label">{lang === "es" ? "CUOTA HOY:" : "QUOTA TODAY:"}</span>
            <span className="quota-val acid">{scarsToday}/{dailyLimit}</span>
          </div>
          <button
            type="button"
            className="btn-feed-refresh"
            onClick={fetchScars}
            disabled={isLoading}
            title="Refresh feed"
          >
            {isLoading ? "…" : "↻"}
          </button>
        </div>
      </div>

      {isLoading && scars.length === 0 ? (
        <div className="scars-feed-loading">
          <div className="loading-bar-inner" />
          <span className="feed-loading-text">
            {lang === "es" ? "CONSULTANDO BLOQUES DE BASE MAINNET…" : "SCANNING BASE LEDGER EVENTS…"}
          </span>
        </div>
      ) : scars.length === 0 ? (
        <div className="scars-feed-empty">
          {lang === "es"
            ? "No se han emitido cicatrices hoy. El agente ejecuta su ritual cada 24 horas (3 especímenes seleccionados)."
            : "No scars inscribed today yet. The agent executes its ritual every 24 hours (3 selected specimens)."}
        </div>
      ) : (
        <div className="scars-grid">
          {scars.map((s, idx) => (
            <div key={s.txHash || idx} className="scar-card">
              <div className="scar-card-top">
                <span className="scar-index-badge">#{idx + 1}</span>
                <span className="scar-block-badge">BLOCK #{s.blockNumber}</span>
              </div>

              <div className="scar-memo-container">
                <div className="scar-memo-tag">
                  [MEMO: <span className="highlight">{s.memo}</span>]
                </div>
              </div>

              <div className="scar-card-details">
                <div className="scar-detail-row">
                  <span className="detail-key">{lang === "es" ? "Espécimen:" : "Specimen:"}</span>
                  <a
                    href={`https://basescan.org/address/${s.specimen}`}
                    target="_blank"
                    rel="noreferrer"
                    className="detail-val mono-link"
                    title={s.specimen}
                  >
                    {s.specimen ? `${s.specimen.slice(0, 8)}…${s.specimen.slice(-6)}` : "—"} ↗
                  </a>
                </div>
                <div className="scar-detail-row">
                  <span className="detail-key">{lang === "es" ? "Marcador:" : "Marker:"}</span>
                  <span className="detail-val acid">1 $HEXPUNK (transferWithMemo)</span>
                </div>
              </div>

              <div className="scar-card-actions">
                <a
                  href={s.basescanUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-basescan-link"
                >
                  {lang === "es" ? "VER EN BASESCAN ↗" : "VIEW ON BASESCAN ↗"}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="scars-feed-footer">
        <span className="agent-identity-label">
          🤖 {lang === "es" ? "AGENTE OFICIAL:" : "OFFICIAL AGENT:"}{" "}
          <a
            href="https://basescan.org/address/0xcb8e5DAE6ccf90c31d723046f4034F3B20b9f2Ae"
            target="_blank"
            rel="noreferrer"
            className="footer-agent-link"
          >
            0xcb8e…f2Ae
          </a>
        </span>
        <span className="agent-8004-badge">
          <a
            href="https://8004scan.io/agents/base/1129393"
            target="_blank"
            rel="noreferrer"
            className="registry-link"
          >
            ERC-8004 #1129393 ↗
          </a>
        </span>
        {lastUpdated && (
          <span className="feed-timestamp">
            {lang === "es" ? `Sincronizado: ${lastUpdated}` : `Synced: ${lastUpdated}`}
          </span>
        )}
      </div>
    </div>
  );
}
