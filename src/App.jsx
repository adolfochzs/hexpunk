import { useState, useEffect } from "react";
import { useChainData } from "./hooks/useChainData";
import { useWallet } from "./hooks/useWallet";
import { useMemoryHole } from "./hooks/useMemoryHole";
import { useRewardsClaim, REWARDS_CLAIM_ADDR } from "./hooks/useRewardsClaim";
import { translations } from "./translations";

// ─── Project constants ─────────────────────────────────────────────────────────
// Day 0 = Official Drop Genesis on Base Mainnet (Aug 26, 2026, 6:00 PM CST)
const LAUNCH_DATE        = new Date("2026-08-26T18:00:00-06:00");
const TOTAL_DAYS         = 90;
const CONTRACT_ADDR      = "0xb20000000000000000000024A9Cd928Ff6277db8";
const NFT_ADDR           = "0xad745891c3f90D94fB68bf0656Ea9EE1B5297161";
const MEMORY_HOLE_ADDR   = "0x31605c0d4729B82D7C61039ccab06b53278d7E6E"; // Deployed & verified Aug 2026
const OPENSEA_DROP_URL   = "https://opensea.io/collection/hexpunk-2026/";

function calcDay() {
  const diff = Math.floor((Date.now() - LAUNCH_DATE.getTime()) / 86_400_000);
  return Math.min(Math.max(diff, 0), TOTAL_DAYS);
}

// ─── Tag badge ─────────────────────────────────────────────────────────────────
function FeedTag({ type }) {
  return <div className={`tag ${type}`}>{type.toUpperCase()}</div>;
}

// ─── Skeleton loader for feed rows ───────────────────────────────────────────
function FeedSkeleton() {
  return Array.from({ length: 4 }, (_, i) => (
    <div key={i} className="feed-row" style={{ opacity: 0.4 }}>
      <div className="tag memo" style={{ background: "var(--line)", border: "none", color: "transparent" }}>MEMO</div>
      <div className="feed-addr" style={{ background: "var(--line)", borderRadius: 2, height: 12 }}></div>
      <div className="feed-msg" style={{ background: "var(--line)", borderRadius: 2, height: 12 }}></div>
      <div className="feed-time" style={{ background: "var(--line)", borderRadius: 2, height: 12, width: 60, marginLeft: "auto" }}></div>
    </div>
  ));
}

export default function App() {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("hexpunk_lang") || "en";
  });
  const [integrity, setIntegrity]   = useState(100.0);
  const [fragments, setFragments]   = useState("");
  const [epitaph, setEpitaph]       = useState("");
  const [currentDay, setCurrentDay] = useState(calcDay);
  const [docTab, setDocTab]         = useState("all");
  const [isDossierExpanded, setIsDossierExpanded] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false); // lock inmediato al click
  const [claimTokenIds, setClaimTokenIds]   = useState("");

  // ── Wallet, Memory Hole & Rewards Claim ───────────────────────────────────
  const wallet       = useWallet();
  const memoryHole   = useMemoryHole();
  const rewardsClaim = useRewardsClaim();

  const handleSetLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem("hexpunk_lang", newLang);
  };

  const t = translations[lang] || translations.en;

  // Recalculate day at midnight
  useEffect(() => {
    const msToMidnight = () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
    };
    const tTimer = setTimeout(() => setCurrentDay(calcDay()), msToMidnight());
    return () => clearTimeout(tTimer);
  }, [currentDay]);

  // ── Live blockchain data ──────────────────────────────────────────────────
  const chainData = useChainData();

  // ── Integrity bar: decreases on scroll ───────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const scrolled = window.scrollY / scrollHeight;
      setIntegrity(parseFloat(Math.max(38.0, 100.0 - scrolled * 62.0).toFixed(1)));
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* ── Integrity Bar ──────────────────────────────────────────────────── */}
      <div id="integrity-bar">
        <div id="integrity-fill" style={{ width: `${integrity}%` }} />
      </div>

      {/* ── Top Navigation Bar & Language Switcher ─────────────────────────── */}
      <div id="top-nav-bar">
        <div className="top-nav-left">
          <a href="#monitor" className="nav-link-pill" onClick={(e) => { e.preventDefault(); handleScrollTo("monitor"); }}>
            {t.nav.monitor}
          </a>
          <a href="#memoryhole" className="nav-link-pill" onClick={(e) => { e.preventDefault(); handleScrollTo("memoryhole"); }}>
            {t.nav.memoryhole}
          </a>
          <a href="#manifiesto" className="nav-link-pill" onClick={(e) => { e.preventDefault(); handleScrollTo("manifiesto"); }}>
            {t.nav.manifesto}
          </a>
          <a href="#tokenomics" className="nav-link-pill" onClick={(e) => { e.preventDefault(); handleScrollTo("tokenomics"); }}>
            {t.nav.tokenomics}
          </a>
          <a href="#reliquias" className="nav-link-pill" onClick={(e) => { e.preventDefault(); handleScrollTo("reliquias"); }}>
            {t.nav.relics}
          </a>
        </div>

        <div className="top-nav-right">
          <div className="lang-toggle">
            <button
              className={`lang-btn${lang === "en" ? " active" : ""}`}
              onClick={() => handleSetLang("en")}
              title="English"
            >
              EN
            </button>
            <button
              className={`lang-btn${lang === "es" ? " active" : ""}`}
              onClick={() => handleSetLang("es")}
              title="Español"
            >
              ES
            </button>
          </div>

          {/* ── Wallet Button ── */}
          <div style={{ position: "relative" }}>
            {!wallet.isConnected ? (
              <>
                <button
                  id="btn-connect-wallet"
                  className="btn-wallet"
                  onClick={() => setShowConnectors((v) => !v)}
                >
                  {wallet.isConnecting ? "CONNECTING…" : (lang === "es" ? "CONECTAR WALLET" : "CONNECT WALLET")}
                </button>
                {showConnectors && (
                  <div className="connector-menu">
                    {wallet.connectors.map((c) => (
                      <button
                        key={c.uid}
                        className="connector-item"
                        onClick={() => { wallet.connect(c); setShowConnectors(false); }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                id="btn-wallet-connected"
                className="btn-wallet connected"
                onClick={wallet.disconnect}
                title={wallet.address}
              >
                {wallet.isWrongNetwork
                  ? "⚠ WRONG NETWORK"
                  : `${wallet.address?.slice(0, 6)}…${wallet.address?.slice(-4)}`}
              </button>
            )}
          </div>

          <div id="integrity-readout">
            INTEGRITY:{" "}
            <span style={{ color: integrity < 50 ? "var(--magenta)" : "var(--acid)" }}>
              {integrity}%
            </span>
          </div>
        </div>
      </div>

      {/* ══════════ HERO ══════════ */}
      <section id="hero">
        <div className="logo-glitch">HEXPUNK</div>
        <p className="tagline">
          {t.hero.subtitle}{" "}
          <em>{lang === "es" ? "Si la memoria va a morir, dejaremos constancia de cómo ocurrió." : "If memory is to die, we will leave a record of how it happened."}</em>
        </p>
        <div className="hero-meta">
          <div>NETWORK<b>Base Mainnet</b></div>
          <div>SUPPLY<b>3,000,000</b></div>
          <div>STANDARD<b>B20</b></div>
          <div>DAY<b>{currentDay} / {TOTAL_DAYS}</b></div>
        </div>
        <div className="hero-cta">
          <button className="btn primary" onClick={() => handleScrollTo("memoryhole")}>
            {t.nav.memoryhole}
          </button>
          <button className="btn" onClick={() => handleScrollTo("manifiesto")}>
            {t.hero.ctaWhitepaper}
          </button>
          <a
            href={OPENSEA_DROP_URL}
            target="_blank"
            rel="noreferrer"
            className="btn"
            style={{ borderColor: "var(--yellow)", color: "var(--yellow)" }}
          >
            {t.hero.ctaDrop}
          </a>
        </div>
        <div className="scroll-cue">↓ {lang === "es" ? "CONTINUAR RECONSTRUCCIÓN" : "CONTINUE RECONSTRUCTION"}</div>
      </section>

      {/* ══════════ ORGANISM MONITOR ══════════ */}
      <section id="monitor">
        <div className="wrap">
          <div className="eyebrow">
            {t.monitor.eyebrow}
            {chainData.loading && (
              <span style={{ color: "var(--acid)", fontSize: 9, marginLeft: 8, animation: "pulse 1s infinite" }}>
                ● SYNCING
              </span>
            )}
            {!chainData.loading && !chainData.error && (
              <span style={{ color: "var(--acid)", fontSize: 9, marginLeft: 8 }}>
                ● LIVE
              </span>
            )}
          </div>
          <h2>{t.monitor.title}</h2>
          <p className="lede">{t.monitor.lede}</p>

          {/* ── Live feed ──────────────────────────────────────────────────── */}
          <div className="feed">
            {chainData.loading ? (
              <FeedSkeleton />
            ) : chainData.error ? (
              <div className="feed-row" style={{ color: "var(--magenta)", fontFamily: "var(--mono)", fontSize: 12 }}>
                [RPC ERROR] {chainData.error}
              </div>
            ) : chainData.scars.length === 0 ? (
              <div className="feed-row" style={{ color: "var(--ink-dim)", fontFamily: "var(--mono)", fontSize: 12 }}>
                {t.monitor.noEvents}
              </div>
            ) : (
              chainData.scars.map((scar, i) => (
                <div className="feed-row" key={i}>
                  <FeedTag type="memo" />
                  <div className="feed-addr">{scar.from}</div>
                  <div className="feed-msg">
                    transferWithMemo →{" "}
                    {scar.memo ? (
                      <span className="quote">"{scar.memo}"</span>
                    ) : (
                      <span style={{ color: "var(--ink-dim)" }}>[no memo]</span>
                    )}
                  </div>
                  <div className="feed-time">
                    <a
                      href={`https://basescan.org/tx/${scar.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--ink-dim)", textDecoration: "none" }}
                      title="View on Basescan"
                    >
                      {scar.timeAgo}
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Stats ──────────────────────────────────────────────────────── */}
          <div className="monitor-stats">
            <div className="stat">
              <div className="n">
                {chainData.loading ? "—" : chainData.totalScars.toLocaleString()}
              </div>
              <div className="l">{t.monitor.stats.scars}</div>
            </div>
            <div className="stat">
              <div className="n">
                {chainData.loading ? "—" : chainData.burnedFragments}
              </div>
              <div className="l">{t.monitor.stats.burned}</div>
            </div>
            <div className="stat">
              <div className="n">
                {chainData.loading ? "—" : chainData.totalScars.toLocaleString()}
              </div>
              <div className="l">{t.monitor.stats.transmissions}</div>
            </div>
            <div className="stat">
              <div className="n">
                {chainData.loading ? "—" : (chainData.activeCustodians ?? "—").toLocaleString()}
              </div>
              <div className="l">{t.monitor.stats.custodians}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ MEMORY HOLE ══════════ */}
      <section id="memoryhole">
        <div className="wrap">
          <div className="eyebrow">{t.memoryHole.eyebrow}</div>
          <h2>{t.memoryHole.title}</h2>
          <p className="lede">{t.memoryHole.lede}</p>

          <div className="ritual-box">
            <div className="ritual-visual">
              <div className="incinerator">⬡</div>
              <div className="label">
                {t.memoryHole.incineratorActive}<br />
                {chainData.loading ? "—" : chainData.burnedFragments} {t.memoryHole.destroyedLabel}
              </div>
            </div>
            <div className="ritual-form">
              <div className="field">
                <label>{t.memoryHole.fieldAmount}</label>
                <input
                  type="text"
                  placeholder={t.memoryHole.fieldAmountPh}
                  value={fragments}
                  onChange={(e) => setFragments(e.target.value)}
                />
              </div>
              <div className="field">
                <label>{t.memoryHole.fieldEpitaph}</label>
                <textarea
                  rows="3"
                  placeholder={t.memoryHole.fieldEpitaphPh}
                  value={epitaph}
                  onChange={(e) => setEpitaph(e.target.value.slice(0, 32))}
                />
                <div
                  className="count"
                  style={{ color: epitaph.length >= 32 ? "var(--magenta)" : "var(--ink-dim)" }}
                >
                  {epitaph.length} / 32
                </div>
              </div>
              {/* ── Wallet required gate ── */}
              {!wallet.isConnected && (
                <div className="wallet-gate">
                  <span>{lang === "es" ? "Conecta tu wallet para ejecutar el ritual" : "Connect your wallet to execute the ritual"}</span>
                  <button
                    className="btn-burn"
                    onClick={() => setShowConnectors(true)}
                  >
                    {lang === "es" ? "CONECTAR WALLET" : "CONNECT WALLET"}
                  </button>
                </div>
              )}

              {wallet.isWrongNetwork && (
                <div className="ritual-status error">
                  ⚠ {lang === "es" ? "Cambia a Base Mainnet en tu wallet" : "Switch to Base Mainnet in your wallet"}
                  <button className="btn-switch" onClick={wallet.ensureBase}>
                    {lang === "es" ? "Cambiar a Base" : "Switch to Base"}
                  </button>
                </div>
              )}

              {/* ── Burn button (real tx) ── */}
              {wallet.isConnected && !wallet.isWrongNetwork && (
                <>
                  {memoryHole.step === "idle" || memoryHole.step === "error" ? (
                    <button
                      className="btn-burn"
                      disabled={
                        !fragments ||
                        !epitaph ||
                        isSubmitting ||
                        (memoryHole.step !== "idle" && memoryHole.step !== "error")
                      }
                      onClick={async () => {
                        const amt = parseFloat(fragments);
                        if (isNaN(amt) || amt <= 0) return;
                        if (!epitaph.trim()) return;
                        setIsSubmitting(true);  // bloquea el botón de inmediato
                        memoryHole.reset();
                        await memoryHole.sacrifice(fragments, epitaph);
                        setIsSubmitting(false); // desbloquea cuando termina
                      }}
                    >
                      {t.memoryHole.btnBurn}
                    </button>
                  ) : null}

                  {/* Step indicator */}
                  {memoryHole.step === "approving" && (
                    <div className="ritual-status pending">
                      <span className="tx-spinner">⬡</span>
                      {lang === "es" ? "Paso 1/2 — Confirma el permiso en tu wallet…" : "Step 1/2 — Confirm approval in your wallet…"}
                    </div>
                  )}
                  {memoryHole.step === "approved" && (
                    <div className="ritual-status ok">
                      ✓ {lang === "es" ? "Permiso otorgado — preparando el ritual…" : "Approval granted — preparing ritual…"}
                    </div>
                  )}
                  {memoryHole.step === "burning" && (
                    <div className="ritual-status pending">
                      <span className="tx-spinner">⬡</span>
                      {lang === "es" ? "Paso 2/2 — Confirma el sacrificio en tu wallet…" : "Step 2/2 — Confirm the sacrifice in your wallet…"}
                    </div>
                  )}
                  {memoryHole.step === "done" && (
                    <div className="ritual-status ok">
                      ✓ {lang === "es" ? "Memoria destruida. El epitafio es permanente." : "Memory destroyed. The epitaph is permanent."}
                      {memoryHole.burnTxHash && (
                        <a
                          href={`https://basescan.org/tx/${memoryHole.burnTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="tx-link"
                        >
                          {lang === "es" ? "Ver en Basescan →" : "View on Basescan →"}
                        </a>
                      )}
                      <button className="btn-reset" onClick={() => { memoryHole.reset(); setFragments(""); setEpitaph(""); }}>
                        {lang === "es" ? "Nuevo ritual" : "New ritual"}
                      </button>
                    </div>
                  )}
                  {memoryHole.step === "error" && (
                    <div className="ritual-status error">
                      ✗ {memoryHole.errorMsg}
                      <button className="btn-reset" onClick={memoryHole.reset}>
                        {lang === "es" ? "Reintentar" : "Try again"}
                      </button>
                    </div>
                  )}
                </>
              )}
              <div className="ritual-warn">
                {t.memoryHole.warn}
              </div>
            </div>
          </div>

          <div className="capability-row">
            <div className="cap">
              <code>{t.memoryHole.caps.transferMemoTitle}</code>
              <p>{t.memoryHole.caps.transferMemoDesc}</p>
            </div>
            <div className="cap">
              <code>{t.memoryHole.caps.announceTitle}</code>
              <p>{t.memoryHole.caps.announceDesc}</p>
            </div>
            <div className="cap">
              <code>{t.memoryHole.caps.burnMemoTitle}</code>
              <p>{t.memoryHole.caps.burnMemoDesc}</p>
            </div>
          </div>

          {/* ── Security Guarantee Banner ───────────────────────────────── */}
          <div className="security-guarantee-card">
            <div className="sec-header">
              <span className="sec-icon">🛡️</span>
              <span className="sec-badge">{t.security?.badge}</span>
            </div>
            <div className="sec-grid">
              <div className="sec-item">
                <div className="sec-item-title">
                  <span className="sec-bullet">✓</span> {t.security?.exactAllowanceTitle}
                </div>
                <p className="sec-item-desc">{t.security?.exactAllowanceDesc}</p>
              </div>
              <div className="sec-item">
                <div className="sec-item-title">
                  <span className="sec-bullet">✓</span> {t.security?.noBlindSignTitle}
                </div>
                <p className="sec-item-desc">{t.security?.noBlindSignDesc}</p>
              </div>
              <div className="sec-item">
                <div className="sec-item-title">
                  <span className="sec-bullet">✓</span> {t.security?.openSourceTitle}
                </div>
                <p className="sec-item-desc">
                  {t.security?.openSourceDesc}{" "}
                  <a
                    href={`https://basescan.org/token/${CONTRACT_ADDR}`}
                    target="_blank"
                    rel="noreferrer"
                    className="sec-link"
                  >
                    {t.security?.verifiedLink || "Basescan"} ↗
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ MANIFESTO ══════════ */}
      <section id="manifiesto">
        <div className="wrap">
          <div className="eyebrow">{t.manifesto.eyebrow}</div>
          <h2>{t.manifesto.title}</h2>

          {/* ── Archive Header ────────────────────────────────────────── */}
          <div className="archive-doc">
            <div className="header-line">{t.manifesto.headerOrigin}</div>
            <div className="header-line">{t.manifesto.headerStatus}</div>
            <div className="header-line">{t.manifesto.headerClass}</div>
            <div className="header-line">{t.manifesto.headerCompiler}</div>
          </div>

          {/* ── Document Tabs ─────────────────────────────────────────── */}
          <div className="archive-tabs">
            <button
              className={`archive-tab-btn${docTab === "all" ? " active" : ""}`}
              onClick={() => setDocTab("all")}
            >
              {t.manifesto.tabAll}
            </button>
            <button
              className={`archive-tab-btn${docTab === "manifesto" ? " active" : ""}`}
              onClick={() => setDocTab("manifesto")}
            >
              {t.manifesto.tab1}
            </button>
            <button
              className={`archive-tab-btn${docTab === "whitepaper" ? " active" : ""}`}
              onClick={() => setDocTab("whitepaper")}
            >
              {t.manifesto.tab2}
            </button>
            <button
              className={`archive-tab-btn${docTab === "specs" ? " active" : ""}`}
              onClick={() => setDocTab("specs")}
            >
              {t.manifesto.tab3}
            </button>
          </div>

          {/* ── Document Body ─────────────────────────────────────────── */}
          <div className={`manifest-body${isDossierExpanded ? " expanded" : ""}`}>
            {/* ─── PART 1: THE MANIFESTO ─── */}
            {(docTab === "all" || docTab === "manifesto") && (
              <div>
                <h3>{t.manifesto.part1Title}</h3>
                <p>{t.manifesto.p1}</p>
                <p>{t.manifesto.p2}</p>
                <p>{t.manifesto.p3}</p>
                <p>{t.manifesto.p4}</p>
                <p>{t.manifesto.p5}</p>
                <p>{t.manifesto.p6}</p>
                <p>{t.manifesto.p7}</p>
                <p>{t.manifesto.p8}</p>
                <p><span className="highlight">{t.manifesto.p9}</span></p>
                <p>{t.manifesto.p10}</p>
                <p>{t.manifesto.p11}</p>
                <p><strong>{t.manifesto.p12}</strong></p>
                <div className="signoff">{t.manifesto.signoff1}</div>
              </div>
            )}

            {/* ─── PART 2: WHITE PAPER & SYSTEM ARCHITECTURE ─── */}
            {(docTab === "all" || docTab === "whitepaper") && (
              <div style={{ marginTop: docTab === "all" ? 48 : 0 }}>
                <h3>{t.manifesto.part2Title}</h3>
                <p>{t.manifesto.wpDesc1}</p>
                <p>{t.manifesto.wpDesc2}</p>
                <p><em>{t.manifesto.wpHypothesis}</em></p>

                <h4>{t.manifesto.h1}</h4>
                <p>{t.manifesto.h1Text}</p>

                <h4>{t.manifesto.h2}</h4>
                <p>{lang === "es" ? "El organismo está compuesto por:" : "The organism is composed of:"}</p>
                <ul>
                  {t.manifesto.h2List.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p>{t.manifesto.h2Note}</p>

                <h4>{t.manifesto.h3}</h4>
                <ul>
                  <li><strong>Name:</strong> HEXPUNK</li>
                  <li><strong>Symbol:</strong> $HEXPUNK</li>
                  <li><strong>Chain:</strong> Base Mainnet (Layer 2)</li>
                  <li><strong>Standard:</strong> B20 (Superset of ERC-20, Variant ASSET)</li>
                  <li><strong>Contract:</strong> <code>{CONTRACT_ADDR}</code></li>
                </ul>

                <h4>{t.manifesto.h4}</h4>
                <p>{t.manifesto.h4Text}</p>

                <div className="corrupt">
                  {t.manifesto.bitRot}
                </div>

                <h4>{t.manifesto.h5}</h4>
                <ul>
                  {t.manifesto.h5List.map((item, idx) => (
                    <li key={idx}><code>{item.split(" — ")[0]}</code> — {item.split(" — ")[1]}</li>
                  ))}
                </ul>

                <h4>{t.manifesto.h6}</h4>
                <p>{t.manifesto.h6Text}</p>

                <h4>{t.manifesto.h7}</h4>
                <p>{t.manifesto.h7Text}</p>
              </div>
            )}

            {/* ─── PART 3: SPECIFICATIONS & EPILOGUE ─── */}
            {(docTab === "all" || docTab === "specs") && (
              <div style={{ marginTop: docTab === "all" ? 48 : 0 }}>
                <h3>{t.manifesto.part3Title}</h3>

                <table className="doc-specs-table">
                  <thead>
                    <tr>
                      <th>{t.manifesto.thParam}</th>
                      <th>{t.manifesto.thValue}</th>
                      <th>{t.manifesto.thState}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Token Standard</td>
                      <td>B20 (ERC-20 Superset / ASSET)</td>
                      <td>Inscribed on Base Mainnet</td>
                    </tr>
                    <tr>
                      <td>Total Supply Cap</td>
                      <td>3,000,000 $HEXPUNK</td>
                      <td>Immutable · No MINT_ROLE</td>
                    </tr>
                    <tr>
                      <td>NFT Relics Standard</td>
                      <td>ERC-721 (100 Unique Artefacts)</td>
                      <td><code>{NFT_ADDR}</code></td>
                    </tr>
                    <tr>
                      <td>Administration Window</td>
                      <td>90 Days (Expires Nov 24, 2026)</td>
                      <td>Permanent Admin-Less Migration</td>
                    </tr>
                    <tr>
                      <td>Documentation</td>
                      <td>Base Chain Specs (Beryl / B20)</td>
                      <td>docs.base.org</td>
                    </tr>
                  </tbody>
                </table>

                <p>{t.manifesto.specsPermissionless}</p>
                <ul>
                  {t.manifesto.specsActors.map((actor, idx) => (
                    <li key={idx}>{actor}</li>
                  ))}
                </ul>

                <div className="corrupt">
                  {t.manifesto.lastBlock}
                </div>

                <p>{t.manifesto.epilogue1}</p>
                <p>{t.manifesto.epilogue2}</p>
                <p>{t.manifesto.epilogue3}</p>
                <p><strong>{t.manifesto.epilogue4}</strong></p>

                <div className="signoff">
                  {t.manifesto.signoffFinal}<br />
                  <code>[CONNECTION LOST]</code>
                </div>
              </div>
            )}
          </div>

          {/* ── Dossier Expand / Scroll Control Bar ──────────────────── */}
          <div className="dossier-expand-bar">
            <span style={{ color: "var(--ink-dim)" }}>
              {isDossierExpanded
                ? (lang === "es" ? "MODO EXPANDIDO // VISTA COMPLETA" : "EXPANDED MODE // FULL VIEW")
                : (lang === "es" ? "VISTA COMPACTA // DESPLAZA PARA LEER" : "SCROLL INSIDE BOX OR EXPAND")
              }
            </span>
            <button
              className="dossier-expand-btn"
              onClick={() => setIsDossierExpanded((prev) => !prev)}
            >
              {isDossierExpanded
                ? (lang === "es" ? "⛶ COLAPSAR EXPEDIENTE" : "⛶ COLLAPSE DOSSIER")
                : (lang === "es" ? "⛶ EXPANDIR EXPEDIENTE" : "⛶ EXPAND DOSSIER")
              }
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ TOKENOMICS ══════════ */}
      <section id="tokenomics">
        <div className="wrap">
          <div className="eyebrow">{t.tokenomics.eyebrow}</div>
          <h2>{t.tokenomics.title}</h2>
          <p className="lede">{t.tokenomics.lede}</p>

          <div className="tokeno-grid">
            <div>
              <div className="supply-block">
                <div className="supply-num">3,000,000 $HEXPUNK</div>
                <div className="supply-label">{t.tokenomics.strictCapLabel}</div>
                <div className="dist-bar">
                  <div className="dist-seg" style={{ width: "66.7%", background: "var(--teal)" }}>66.7%</div>
                  <div className="dist-seg" style={{ width: "3.3%", background: "var(--yellow)" }}>3.3%</div>
                  <div className="dist-seg" style={{ width: "10%", background: "var(--magenta)" }}>10%</div>
                  <div className="dist-seg" style={{ width: "20%", background: "var(--purple)", color: "var(--ink)" }}>20%</div>
                </div>
                <div className="dist-legend">
                  <span><i style={{ background: "var(--teal)" }} />LP (DEX) — 66.7% (2,000,000)</span>
                  <span><i style={{ background: "var(--yellow)" }} />NFT Relics — 3.3% (100,000)</span>
                  <span><i style={{ background: "var(--magenta)" }} />Founders Circle — 10% (300,000)</span>
                  <span><i style={{ background: "var(--purple)" }} />Creator (Operation) — 20% (600,000)</span>
                </div>
              </div>

              <div className="day90">
                <div className="eyebrow" style={{ marginBottom: 8 }}>{t.tokenomics.tempGovTitle}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--ink-dim)" }}>
                  {t.tokenomics.tempGovSubtitle}
                </div>
                <div className="day90-bar">
                  <div className="day90-fill" style={{ width: `${(currentDay / TOTAL_DAYS) * 100}%` }} />
                </div>
                <div className="day90-label">
                  <span>{t.tokenomics.day0}</span>
                  <span>{t.tokenomics.today}: DAY {currentDay}</span>
                  <span>{t.tokenomics.day90Sealed}</span>
                </div>
              </div>
            </div>

            <div>
              <table className="roles-table">
                <thead>
                  <tr>
                    <th>{t.tokenomics.thRole}</th>
                    <th>{t.tokenomics.thFunction}</th>
                    <th>{t.tokenomics.thStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>PAUSE_ROLE</td><td>Emergency switch</td><td><span className="status-dot temp" />{t.tokenomics.tempBadge}</td></tr>
                  <tr><td>UNPAUSE_ROLE</td><td>Emergency switch complement</td><td><span className="status-dot temp" />{t.tokenomics.tempBadge}</td></tr>
                  <tr><td>DEFAULT_ADMIN_ROLE</td><td>Role master key</td><td><span className="status-dot temp" />{t.tokenomics.tempBadge}</td></tr>
                  <tr><td>OPERATOR_ROLE</td><td>The Voice — official announcements</td><td><span className="status-dot perm" />{t.tokenomics.permBadge}</td></tr>
                  <tr><td>METADATA_ROLE</td><td>The Face — visual identity</td><td><span className="status-dot perm" />{t.tokenomics.permBadge}</td></tr>
                  <tr><td>BURN_ROLE</td><td>The Ritual — Memory Hole only</td><td><span className="status-dot perm" />{t.tokenomics.permBadge}</td></tr>
                </tbody>
              </table>
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-dim)", marginTop: 16, lineHeight: 1.7 }}>
                {t.tokenomics.mintRoleNote}{" "}
                <a
                  href={`https://basescan.org/token/${CONTRACT_ADDR}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--teal)", textDecoration: "none" }}
                >
                  {CONTRACT_ADDR.slice(0, 7)}...{CONTRACT_ADDR.slice(-5)}
                </a>
              </p>
            </div>
          </div>

          {/* ── Anti-Rug & Immutability Guarantee ──────────────────────── */}
          <div className="tokeno-guarantee">
            <div className="guarantee-badge">{t.tokenomics.guarantee.badge}</div>
            <p className="guarantee-quote">
              {t.tokenomics.guarantee.quote}
            </p>
            <div className="guarantee-pillars">
              <div className="pillar">
                <span className="icon">🛡️</span>
                <div>
                  <strong>{t.tokenomics.guarantee.p1Title}</strong>
                  <p>{t.tokenomics.guarantee.p1Desc}</p>
                </div>
              </div>
              <div className="pillar">
                <span className="icon">🔥</span>
                <div>
                  <strong>{t.tokenomics.guarantee.p2Title}</strong>
                  <p>{t.tokenomics.guarantee.p2Desc}</p>
                </div>
              </div>
              <div className="pillar">
                <span className="icon">⏳</span>
                <div>
                  <strong>{t.tokenomics.guarantee.p3Title}</strong>
                  <p>{t.tokenomics.guarantee.p3Desc}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ RELICS ══════════ */}
      <section id="reliquias">
        <div className="wrap">
          <div className="eyebrow">{t.relics.eyebrow}</div>
          <h2>{t.relics.title}</h2>
          <p className="lede">{t.relics.lede}</p>

          <div className="relic-showcase">
            <div className="relic-art-frame">
              <img src="/relic-preview.png" alt="HEXPUNK Relic Showcase" />
              <div className="relic-badge">{t.relics.badge}</div>
            </div>

            <div className="relic-info">
              <div className="relic-specs">
                <div className="relic-spec-item">
                  <div className="label">{t.relics.supplyCap}</div>
                  <div className="val">{t.relics.supplyCapVal}</div>
                </div>
                <div className="relic-spec-item">
                  <div className="label">{t.relics.standard}</div>
                  <div className="val">{t.relics.standardVal}</div>
                </div>
                <div className="relic-spec-item">
                  <div className="label">{t.relics.dropDate}</div>
                  <div className="val highlight">{t.relics.dropDateVal}</div>
                </div>
                <div className="relic-spec-item">
                  <div className="label">{t.relics.reward}</div>
                  <div className="val highlight">{t.relics.rewardVal}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                <a
                  href={OPENSEA_DROP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-opensea"
                >
                  {t.relics.btnOpenSea}
                </a>
                <a
                  href={`https://basescan.org/address/${NFT_ADDR}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "12px",
                    color: "var(--ink-dim)",
                    textDecoration: "none",
                  }}
                >
                  {t.relics.contractPrefix} {NFT_ADDR.slice(0, 6)}…{NFT_ADDR.slice(-4)}
                </a>
              </div>
            </div>
          </div>

          {/* ── Relics Claim Module ─────────────────────────────────── */}
          <div className="relic-claim-card">
            <div className="relic-claim-header">
              <div className="relic-claim-title">
                <span style={{ color: "var(--teal)" }}>⬡</span> {t.relics.claimCard.title}
              </div>
              <p className="relic-claim-subtitle">{t.relics.claimCard.subtitle}</p>
            </div>

            <div className="relic-claim-body">
              {!wallet.isConnected ? (
                <div className="relic-claim-locked">
                  <p>{t.relics.claimCard.connectPrompt}</p>
                  <button
                    className="btn-wallet"
                    onClick={() => setShowConnectors(true)}
                  >
                    {lang === "es" ? "CONECTAR WALLET" : "CONNECT WALLET"}
                  </button>
                </div>
              ) : (
                <div className="relic-claim-form">
                  <div className="relic-claim-input-group">
                    <label htmlFor="relic-token-ids">{t.relics.claimCard.tokenLabel}</label>
                    <input
                      id="relic-token-ids"
                      type="text"
                      placeholder={t.relics.claimCard.tokenPlaceholder}
                      value={claimTokenIds}
                      onChange={(e) => setClaimTokenIds(e.target.value)}
                      disabled={rewardsClaim.step === "claiming"}
                    />
                  </div>

                  <button
                    className="btn-claim-reward"
                    disabled={!claimTokenIds.trim() || rewardsClaim.step === "claiming"}
                    onClick={async () => {
                      const raw = claimTokenIds.split(",").map(s => s.trim()).filter(Boolean);
                      if (raw.length === 0) return;
                      await rewardsClaim.claimReward(raw);
                    }}
                  >
                    {rewardsClaim.step === "claiming" ? "CLAIMING…" : t.relics.claimCard.btnClaim}
                  </button>

                  {/* Claim Status indicators */}
                  {rewardsClaim.step === "done" && (
                    <div className="ritual-status ok" style={{ marginTop: 12 }}>
                      ✓ {t.relics.claimCard.claimSuccess}
                      {rewardsClaim.claimTxHash && (
                        <a
                          href={`https://basescan.org/tx/${rewardsClaim.claimTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="tx-link"
                        >
                          {lang === "es" ? "Ver en Basescan →" : "View on Basescan →"}
                        </a>
                      )}
                      <button
                        className="btn-reset"
                        onClick={() => { rewardsClaim.reset(); setClaimTokenIds(""); }}
                      >
                        {lang === "es" ? "Reclamar otro" : "Claim another"}
                      </button>
                    </div>
                  )}

                  {rewardsClaim.step === "error" && (
                    <div className="ritual-status error" style={{ marginTop: 12 }}>
                      ✗ {rewardsClaim.errorMsg}
                      <button className="btn-reset" onClick={rewardsClaim.reset}>
                        {lang === "es" ? "Reintentar" : "Try again"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="relic-claim-footer">
                <span>{t.relics.claimCard.contractVerified}</span>
                <a
                  href={`https://basescan.org/address/${REWARDS_CLAIM_ADDR}`}
                  target="_blank"
                  rel="noreferrer"
                  className="sec-link"
                >
                  {REWARDS_CLAIM_ADDR.slice(0, 6)}…{REWARDS_CLAIM_ADDR.slice(-4)} ↗
                </a>
              </div>
            </div>
          </div>

          <div className="relic-mech">
            <div className="relic-step">
              <div className="n">01</div>
              <p>{t.relics.step1}</p>
            </div>
            <div className="relic-step">
              <div className="n">02</div>
              <p>{t.relics.step2}</p>
            </div>
            <div className="relic-step">
              <div className="n">03</div>
              <p>{t.relics.step3}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer>
        <div className="footer-grid">
          <div>{t.footer.tagline}</div>
          <div className="footer-links">
            <a href={`https://basescan.org/token/${CONTRACT_ADDR}`} target="_blank" rel="noreferrer">{t.footer.basescan}</a>
            <a href="https://github.com/adolfochzs/hexpunk/blob/main/README.md" target="_blank" rel="noreferrer">{t.footer.whitepaper}</a>
            <a href="https://docs.base.org/base-chain/specs/upgrades/beryl/b20" target="_blank" rel="noreferrer">{t.footer.docs}</a>
            <a href="#memoryhole">{t.footer.memoryHole}</a>
          </div>
        </div>
      </footer>
    </>
  );
}
