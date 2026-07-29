import { useState, useEffect, useMemo } from "react";
import { useChainData } from "./hooks/useChainData";

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
  const [integrity, setIntegrity] = useState(100.0);
  const [fragments, setFragments] = useState("");
  const [epitaph, setEpitaph] = useState("");

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

  // ── Relic grid: deterministic pseudo-random fill ─────────────────────────
  const relics = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const seed = Math.sin(i + 4) * 10000;
      return {
        hex: i.toString(16).toUpperCase().padStart(2, "0"),
        filled: (seed - Math.floor(seed)) < 0.34,
      };
    });
  }, []);

  const handleScrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* ── Integrity bar ─────────────────────────────────────────────────── */}
      <div id="integrity-bar">
        <div id="integrity-fill" style={{ width: `${integrity}%` }} />
      </div>
      <div id="integrity-readout">
        ORGANISM INTEGRITY:{" "}
        <span style={{ color: integrity < 50 ? "var(--magenta)" : "var(--acid)" }}>
          {integrity}%
        </span>
      </div>

      {/* ══════════ HERO ══════════ */}
      <section id="hero">
        <div className="logo-glitch">HEXPUNK</div>
        <p className="tagline">
          A post-biological memory organism.{" "}
          <em>If memory is to die, we will leave a record of how it happened.</em>
        </p>
        <div className="hero-meta">
          <div>NETWORK<b>Base Mainnet</b></div>
          <div>SUPPLY<b>3,000,000</b></div>
          <div>STANDARD<b>B20</b></div>
          <div>DAY<b>34 / 90</b></div>
        </div>
        <div className="hero-cta">
          <button className="btn primary" onClick={() => handleScrollTo("memoryhole")}>
            View Memory Hole
          </button>
          <button className="btn" onClick={() => handleScrollTo("manifiesto")}>
            Read Manifesto
          </button>
        </div>
        <div className="scroll-cue">↓ CONTINUE RECONSTRUCTION</div>
      </section>

      {/* ══════════ ORGANISM MONITOR ══════════ */}
      <section id="monitor">
        <div className="wrap">
          <div className="eyebrow">
            Live on-chain activity
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
          <h2>Organism Monitor</h2>
          <p className="lede">
            Every scar, every transmission, and every sacrifice is permanently inscribed
            on the chain. This is what the organism has registered.
          </p>

          {/* ── Live feed ──────────────────────────────────────────────────── */}
          <div className="feed">
            {chainData.loading ? (
              <FeedSkeleton />
            ) : chainData.error ? (
              <div className="feed-row" style={{ color: "var(--magenta)", fontFamily: "var(--mono)", fontSize: 12 }}>
                [RPC ERROR] {chainData.error} — retrying on next load.
              </div>
            ) : chainData.scars.length === 0 ? (
              <div className="feed-row" style={{ color: "var(--ink-dim)", fontFamily: "var(--mono)", fontSize: 12 }}>
                No scars inscribed in the last 27 hours. Be the first.
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
              <div className="l">INSCRIBED SCARS</div>
            </div>
            <div className="stat">
              <div className="n">
                {chainData.loading ? "—" : chainData.burnedFragments}
              </div>
              <div className="l">BURNED FRAGMENTS</div>
            </div>
            <div className="stat">
              <div className="n">—</div>
              <div className="l">TRANSMISSIONS</div>
            </div>
            <div className="stat">
              <div className="n">—</div>
              <div className="l">ACTIVE CUSTODIANS</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ MEMORY HOLE ══════════ */}
      <section id="memoryhole">
        <div className="wrap">
          <div className="eyebrow">The ritual of degradation</div>
          <h2>Memory Hole</h2>
          <p className="lede">
            Sacrifice memory voluntarily and irreversibly. The Memory Hole receives the
            fragments, executes the destruction, writes your epitaph on the chain, and
            emits the permanent record of the ritual — all in a single movement.
          </p>

          <div className="ritual-box">
            <div className="ritual-visual">
              <div className="incinerator">⬡</div>
              <div className="label">
                INCINERATOR ACTIVE<br />
                {chainData.loading ? "—" : chainData.burnedFragments} $HEXPUNK DESTROYED
              </div>
            </div>
            <div className="ritual-form">
              <div className="field">
                <label>Fragments to sacrifice</label>
                <input
                  type="text"
                  placeholder="0.0 $HEXPUNK"
                  value={fragments}
                  onChange={(e) => setFragments(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Epitaph</label>
                <textarea
                  rows="3"
                  placeholder="up to 32 characters, permanent on-chain"
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
              <button className="btn-burn">EXECUTE SACRIFICE</button>
              <div className="ritual-warn">
                This action is irreversible. The epitaph will be permanently recorded.
                There is no way to recover the fragments once destroyed.
              </div>
            </div>
          </div>

          <div className="capability-row">
            <div className="cap">
              <code>transferWithMemo()</code>
              <p>Transfer fragments leaving a scar of up to 32 bytes inscribed directly on the chain.</p>
            </div>
            <div className="cap">
              <code>announce()</code>
              <p>The transmission channel of Custodian Zero. Messages, chapters of the archaeological record, state updates.</p>
            </div>
            <div className="cap">
              <code>burnWithMemo()</code>
              <p>The heart of the Memory Hole: irreversible destruction accompanied by a permanent epitaph.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ MANIFESTO ══════════ */}
      <section id="manifiesto">
        <div className="wrap">
          <div className="eyebrow">Recovered archive</div>
          <h2>HEXPUNK Manifesto</h2>

          <div className="archive-doc">
            <div className="header-line">ORIGEN: UNKNOWN · ESTIMATED RECOVERY DATE: 12.08.2088</div>
            <div className="header-line">FILE INTEGRITY: <b>71.3%</b> · STATUS: PARTIALLY CORRUPTED</div>
            <div className="header-line">COMPILER: Adolfo Chávez (Node_0x9f0bc974...)</div>
          </div>

          <div className="manifest-body">
            <p>We were promised that technology would preserve our memory. We were told that data would be eternal. That photographs would survive time itself.</p>
            <p>We accepted the promise. We transferred our memories. We digitalized our relationships. We archived our identity.</p>
            <p>But they lied to us. Servers also die. Formats disappear. <span className="highlight">Bit Rot is not a technical flaw; it is a data scar.</span></p>
            <p className="corrupt">[CORRUPTED SECTOR] 3 bytes unrecoverable. Continuing reconstruction...</p>
            <p>HEXPUNK exists for those who understand that all infrastructure eventually collapses. For those who find more truth in a digital scar than in a perfect simulation.</p>
            <div className="signoff">— IF MEMORY IS TO DIE, WE WILL LEAVE A RECORD OF HOW IT HAPPENED —</div>
          </div>
          <div className="read-more">
            <a
              href="https://github.com/adolfochzs/hexpunk/blob/main/manifesto/MANIFESTO_ENG.md"
              target="_blank"
              rel="noreferrer"
              className="btn"
              style={{ marginTop: 24 }}
            >
              Read full document
            </a>
          </div>
        </div>
      </section>

      {/* ══════════ TOKENOMICS ══════════ */}
      <section id="tokenomics">
        <div className="wrap">
          <div className="eyebrow">Organism economy</div>
          <h2>Tokenomics</h2>
          <p className="lede">Closed supply. No emission. Temporary governance sealed forever on Day 90.</p>

          <div className="tokeno-grid">
            <div>
              <div className="supply-block">
                <div className="supply-num">3,000,000 $HEXPUNK</div>
                <div className="supply-label">TOTAL SUPPLY — STRICT CAP, ALREADY MINTED</div>
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
                <div className="eyebrow" style={{ marginBottom: 8 }}>Temporary governance</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--ink-dim)" }}>
                  Permanent sealing of administrative powers
                </div>
                <div className="day90-bar"><div className="day90-fill" /></div>
                <div className="day90-label">
                  <span>DAY 0</span><span>DAY 34 — TODAY</span><span>DAY 90 — SEALED</span>
                </div>
              </div>
            </div>

            <div>
              <table className="roles-table">
                <thead>
                  <tr><th>Role</th><th>Function</th><th>Status</th></tr>
                </thead>
                <tbody>
                  <tr><td>PAUSE_ROLE</td><td>Emergency switch</td><td><span className="status-dot temp" />Temporal</td></tr>
                  <tr><td>UNPAUSE_ROLE</td><td>Emergency switch complement</td><td><span className="status-dot temp" />Temporal</td></tr>
                  <tr><td>DEFAULT_ADMIN_ROLE</td><td>Role master key</td><td><span className="status-dot temp" />Temporal</td></tr>
                  <tr><td>OPERATOR_ROLE</td><td>The Voice — official announcements</td><td><span className="status-dot perm" />Permanent</td></tr>
                  <tr><td>METADATA_ROLE</td><td>The Face — visual identity</td><td><span className="status-dot perm" />Permanent</td></tr>
                  <tr><td>BURN_ROLE</td><td>The Ritual — Memory Hole only</td><td><span className="status-dot perm" />Permanent</td></tr>
                </tbody>
              </table>
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-dim)", marginTop: 16, lineHeight: 1.7 }}>
                MINT_ROLE was not exercised: the supply was born already minted at its maximum
                capacity. Contract:{" "}
                <a
                  href="https://basescan.org/token/0xb20000000000000000000024A9Cd928Ff6277db8"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--teal)", textDecoration: "none" }}
                >
                  0xb2000...77db8
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ RELICS ══════════ */}
      <section id="reliquias">
        <div className="wrap">
          <div className="eyebrow">The anchoring vehicle</div>
          <h2>Relics of Sector Zero</h2>
          <p className="lede">
            100 NFTs (ERC-721) materializing the organism's initial liquidity pool. Each
            Relic contains a latent residue: 1,000 $HEXPUNK automatically transferred
            to the acquirer.
          </p>

          <div className="relic-grid">
            {relics.map((relic, idx) => (
              <div key={idx} className={`relic${relic.filled ? " filled" : ""}`}>
                {relic.hex}
              </div>
            ))}
          </div>

          <div className="relic-mech">
            <div className="relic-step">
              <div className="n">01</div>
              <p>The resources from each Relic are encapsulated directly into the liquidity pool (LP) on Base Mainnet.</p>
            </div>
            <div className="relic-step">
              <div className="n">02</div>
              <p>Cellular Memory Injection: the acquirer immediately receives 1,000 $HEXPUNK from the Creator's Reserve.</p>
            </div>
            <div className="relic-step">
              <div className="n">03</div>
              <p>Upon completing the anchoring, the keys to the pool are permanently incinerated. The organism remains fused to the network.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer>
        <div className="footer-grid">
          <div>$HEXPUNK — Archaeological record of a post-biological memory</div>
          <div className="footer-links">
            <a href="https://basescan.org/token/0xb20000000000000000000024A9Cd928Ff6277db8" target="_blank" rel="noreferrer">Basescan</a>
            <a href="https://github.com/adolfochzs/hexpunk/blob/main/README.md" target="_blank" rel="noreferrer">Whitepaper</a>
            <a href="https://docs.base.org/base-chain/specs/upgrades/beryl/b20" target="_blank" rel="noreferrer">Docs B20</a>
            <a href="#memoryhole">Memory Hole</a>
          </div>
        </div>
      </footer>
    </>
  );
}
