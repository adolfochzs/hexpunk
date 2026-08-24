import { useState, useEffect, useMemo } from "react";
import { useChainData } from "./hooks/useChainData";

// ─── Project constants ─────────────────────────────────────────────────────────
// Day 0 = Official Drop Genesis on Base Mainnet (Aug 26, 2026, 6:00 PM CST)
const LAUNCH_DATE        = new Date("2026-08-26T18:00:00-06:00");
const TOTAL_DAYS         = 90;
const CONTRACT_ADDR      = "0xb20000000000000000000024A9Cd928Ff6277db8";
const NFT_ADDR           = "0xad745891c3f90d94fb68bf0656ea9ee1b5297161";
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
  const [integrity, setIntegrity]   = useState(100.0);
  const [fragments, setFragments]   = useState("");
  const [epitaph, setEpitaph]       = useState("");
  const [currentDay, setCurrentDay] = useState(calcDay);
  const [sacrificeMsg, setSacrificeMsg] = useState(null);

  // Recalculate day at midnight
  useEffect(() => {
    const msToMidnight = () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
    };
    const t = setTimeout(() => setCurrentDay(calcDay()), msToMidnight());
    return () => clearTimeout(t);
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
          <div>DAY<b>{currentDay} / {TOTAL_DAYS}</b></div>
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
                No scars inscribed in the last 48 hours. Be the first.
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
              <div className="n">
                {chainData.loading ? "—" : chainData.totalScars.toLocaleString()}
              </div>
              <div className="l">TRANSMISSIONS</div>
            </div>
            <div className="stat">
              <div className="n">
                {chainData.loading ? "—" : (chainData.activeCustodians ?? "—").toLocaleString()}
              </div>
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
              <button
                className="btn-burn"
                disabled={!fragments || !epitaph}
                onClick={() => {
                  const amt  = parseFloat(fragments);
                  if (isNaN(amt) || amt <= 0) { setSacrificeMsg({ type: "error", text: "Enter a valid amount." }); return; }
                  if (!epitaph.trim()) { setSacrificeMsg({ type: "error", text: "Epitaph cannot be empty." }); return; }
                  // Encode epitaph as bytes32 hex
                  const bytes  = new TextEncoder().encode(epitaph.slice(0, 32));
                  const padded = Array.from({ length: 32 }, (_, i) => (bytes[i] ?? 0).toString(16).padStart(2, "0")).join("");
                  const bytes32 = "0x" + padded;
                  const rawAmt  = BigInt(Math.floor(amt * 1e18)).toString();
                  const cmd = `cast send ${CONTRACT_ADDR} "burnWithMemo(uint256,bytes32)" ${rawAmt} ${bytes32} --rpc-url $RPC_URL --private-key $PRIVATE_KEY`;
                  setSacrificeMsg({ type: "cmd", text: cmd });
                }}
              >
                EXECUTE SACRIFICE
              </button>
              {sacrificeMsg && (
                <div style={{
                  marginTop: 12,
                  padding: "12px 14px",
                  border: `1px solid ${sacrificeMsg.type === "error" ? "var(--magenta)" : "var(--acid)"}`,
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: sacrificeMsg.type === "error" ? "var(--magenta)" : "var(--acid)",
                  lineHeight: 1.6,
                  wordBreak: "break-all",
                }}>
                  {sacrificeMsg.type === "cmd" ? (
                    <><b>Run in your terminal:</b><br />{sacrificeMsg.text}</>
                  ) : sacrificeMsg.text}
                </div>
              )}
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
                <div className="day90-bar">
                  <div className="day90-fill" style={{ width: `${(currentDay / TOTAL_DAYS) * 100}%` }} />
                </div>
                <div className="day90-label">
                  <span>DAY 0</span>
                  <span>DAY {currentDay} — TODAY</span>
                  <span>DAY {TOTAL_DAYS} — SEALED</span>
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

          {/* ── Anti-Rug & Immutability Guarantee ──────────────────────── */}
          <div className="tokeno-guarantee">
            <div className="guarantee-badge">IMMUTABILITY & TRUST PROTOCOL</div>
            <p className="guarantee-quote">
              “Once the anchoring is complete, the liquidity pool keys will be permanently incinerated.
              The energy deposited by collectors will remain fused into the network, ensuring the perpetual
              existence, immutable transparency, and free circulation of the organism.”
            </p>
            <div className="guarantee-pillars">
              <div className="pillar">
                <span className="icon">🛡️</span>
                <div>
                  <strong>STRICT SUPPLY CAP</strong>
                  <p>Supply strictly capped at 3,000,000 $HEXPUNK. No more tokens can ever be minted.</p>
                </div>
              </div>
              <div className="pillar">
                <span className="icon">🔥</span>
                <div>
                  <strong>LP KEYS INCINERATED</strong>
                  <p>Initial DEX liquidity pool keys permanently burned. Mathematically impossible to rug pull.</p>
                </div>
              </div>
              <div className="pillar">
                <span className="icon">⏳</span>
                <div>
                  <strong>DAY 90 AUTONOMY</strong>
                  <p>All admin keys revoked on Day 90. The organism becomes 100% ownerless and permanent.</p>
                </div>
              </div>
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
            100 archaeological artifacts (ERC-721) on Base Mainnet materializing the organism's initial liquidity pool.
            Each Relic holder can claim 1,000 $HEXPUNK directly on this portal.
          </p>

          <div className="relic-showcase">
            <div className="relic-art-frame">
              <img src="/relic-preview.png" alt="HEXPUNK Relic Showcase" />
              <div className="relic-badge">SECTOR ZERO · 100 PIECES</div>
            </div>

            <div className="relic-info">
              <div className="relic-specs">
                <div className="relic-spec-item">
                  <div className="label">Supply Cap</div>
                  <div className="val">100 Unique 1/1 Scars</div>
                </div>
                <div className="relic-spec-item">
                  <div className="label">Network & Standard</div>
                  <div className="val">ERC-721 · Base Mainnet</div>
                </div>
                <div className="relic-spec-item">
                  <div className="label">Drop Date</div>
                  <div className="val highlight">August 26 · 6:00 PM CST</div>
                </div>
                <div className="relic-spec-item">
                  <div className="label">Custodian Reward</div>
                  <div className="val highlight">Claim 1,000 $HEXPUNK</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                <a
                  href={OPENSEA_DROP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-opensea"
                >
                  VIEW DROP ON OPENSEA ↗
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
                  Contract: {NFT_ADDR.slice(0, 6)}…{NFT_ADDR.slice(-4)}
                </a>
              </div>
            </div>
          </div>

          <div className="relic-mech">
            <div className="relic-step">
              <div className="n">01</div>
              <p>50% of the proceeds from each Relic are encapsulated directly into the $HEXPUNK liquidity pool (LP) on Base, with 50% dedicated to operational infrastructure.</p>
            </div>
            <div className="relic-step">
              <div className="n">02</div>
              <p>Cellular Memory Injection: each Relic holder can claim 1,000 $HEXPUNK on-chain from the Creator's Reserve.</p>
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
