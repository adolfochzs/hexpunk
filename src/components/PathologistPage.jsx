import PatientScanner from "./PatientScanner";
import ScarsFeed from "./ScarsFeed";

export default function PathologistPage({ wallet, lang, setLang, onBack, t }) {
  const p = t.pathologistPage;

  return (
    <div className="pathologist-portal">
      {/* ── Top Portal Navigation Bar ── */}
      <header className="portal-header">
        <div className="wrap portal-header-inner">
          <button type="button" className="btn-back-manifesto" onClick={onBack}>
            {p.backHome}
          </button>

          <div className="portal-status-badge">
            <span className="live-dot-green">●</span> SECTOR ZERO // PATHOLOGIST-0001
          </div>

          <div className="portal-header-actions">
            <button
              type="button"
              className="lang-btn-subtle"
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              title="Cambiar idioma"
            >
              {lang === "es" ? "EN" : "ES"}
            </button>
            {wallet.isConnected ? (
              <button type="button" className="btn-wallet-connected" onClick={wallet.disconnect}>
                {wallet.shortAddress}
              </button>
            ) : (
              <button
                type="button"
                className="btn-connect-portal"
                onClick={wallet.openModal}
                disabled={wallet.isPending}
              >
                {wallet.isPending ? "…" : lang === "es" ? "CONECTAR" : "CONNECT"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Forensic Dossier Hero Section ── */}
      <section className="portal-hero">
        <div className="wrap">
          <div className="dossier-card">
            <div className="dossier-avatar-col">
              <div className="avatar-frame">
                <img
                  src="/digital_pathologist_avatar.jpg"
                  alt="The Digital Pathologist"
                  className="dossier-avatar-img"
                />
                <div className="avatar-glitch-border" />
                <div className="avatar-tag">PATHOLOGIST-0001</div>
              </div>
            </div>

            <div className="dossier-content-col">
              <div className="dossier-eyebrow">{p.eyebrow}</div>
              <h1 className="dossier-title">{p.title}</h1>
              <p className="dossier-subtitle">{p.subtitle}</p>

              <div className="dossier-meta-tags">
                <a
                  href="https://8004scan.io/agents/base/1129393"
                  target="_blank"
                  rel="noreferrer"
                  className="tag-badge magenta-badge"
                >
                  ERC-8004 #1129393 ↗
                </a>
                <a
                  href="https://basescan.org/address/0xcb8e5DAE6ccf90c31d723046f4034F3B20b9f2Ae"
                  target="_blank"
                  rel="noreferrer"
                  className="tag-badge acid-badge"
                >
                  0xcb8e…f2Ae ↗
                </a>
                <span className="tag-badge mono-badge">Base Mainnet (8453)</span>
                <span className="tag-badge mono-badge">B20 transferWithMemo</span>
                <a
                  href="/.well-known/agent-card.json"
                  target="_blank"
                  rel="noreferrer"
                  className="tag-badge outline-badge"
                >
                  {p.agentCardBtn} ↗
                </a>
              </div>

              <p className="dossier-lore">
                {lang === "es"
                  ? "El Patólogo Digital no es un bot social ni una herramienta de marketing. Es un forense cibernético autónomo diseñado para documentar la degradación de la memoria digital y el fenómeno de Bit Rot en la red Base. Examina los registros on-chain, mide la necrosis de gas y pulsos, y graba epígrafes clínicos indelebles de 32 bytes mediante el protocolo B20."
                  : "The Digital Pathologist is not a social chatbot or marketing tool. It is an autonomous cybernetic coroner designed to document the degradation of digital memory and Bit Rot across the Base network. It investigates on-chain registers, measures gas and pulse necrosis, and inscribes indelible 32-byte clinical epitaphs via the B20 protocol."}
              </p>

              <div className="dossier-rule-box">
                <span className="rule-icon">🛡️</span>
                <span className="rule-text">{p.ruleNotice}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Biopsy Clinical Lab ── */}
      <section className="portal-lab-section">
        <div className="wrap">
          <PatientScanner connectedAddress={wallet.address} lang={lang} />
          <ScarsFeed lang={lang} />
        </div>
      </section>

      {/* ── Dedicated Portal Footer ── */}
      <footer className="portal-footer">
        <div className="wrap portal-footer-inner">
          <div className="footer-left">
            <span>SECTOR ZERO ARCHIVAL NODE</span> ·{" "}
            <a href="https://basescan.org/token/0xb20000000000000000000024A9Cd928Ff6277db8" target="_blank" rel="noreferrer">
              $HEXPUNK Token ↗
            </a>{" "}
            ·{" "}
            <a href="https://basescan.org/address/0x31605c0d4729B82D7C61039ccab06b53278d7E6E" target="_blank" rel="noreferrer">
              Memory Hole ↗
            </a>
          </div>
          <button type="button" className="btn-return-link" onClick={onBack}>
            {lang === "es" ? "Volver a hexpunk.xyz ↑" : "Back to hexpunk.xyz ↑"}
          </button>
        </div>
      </footer>
    </div>
  );
}
