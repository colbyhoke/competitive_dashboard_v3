import { useState, useEffect, useMemo } from "react";

const THREAT_COLORS = {
  CRITICAL:        "#E53935",
  HIGH:            "#F57C00",
  "MEDIUM-HIGH":   "#FBC02D",
  "MODERATE-HIGH": "#FBC02D",
  MODERATE:        "#66BB6A",
  LOW:             "#78909C",
};
const SENTIMENT_COLORS = { good: "#66BB6A", warn: "#F57C00", bad: "#E53935" };
const TIER_COLORS = { 0: "#00B4D8", 1: "#E53935", 2: "#F57C00", 3: "#1E88E5", 4: "#78909C" };

function avg(scores) {
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
}

// Weighted score: sum(score * marketWeight) / sum(marketWeight), normalized to 1–10
function weightedScore(scores, dimensions) {
  if (!dimensions?.length) return 0;
  const totalWeight = dimensions.reduce((s, d) => s + d.marketWeight, 0);
  const weighted    = scores.reduce((s, score, i) => s + score * (dimensions[i]?.marketWeight ?? 1), 0);
  return (weighted / totalWeight).toFixed(1);
}

// Color for a weighted score value
function wScoreColor(val) {
  const n = parseFloat(val);
  if (n >= 8)   return "#00B4D8";
  if (n >= 6.5) return "#66BB6A";
  if (n >= 5)   return "#FBC02D";
  return "#E53935";
}

function ThreatBadge({ level }) {
  if (!level) return null;
  return (
    <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: "#0a0a1a", background: THREAT_COLORS[level] || "#78909C", textTransform: "uppercase", fontFamily: "monospace" }}>
      {level}
    </span>
  );
}

function TierBadge({ tier, tiers }) {
  if (tier === 0) return <span style={{ fontSize: 10, color: "#00B4D8", fontWeight: 700, fontFamily: "monospace" }}>SAS</span>;
  const t = tiers?.[String(tier)];
  return <span style={{ fontSize: 10, color: t?.color || "#94a3b8", fontWeight: 600, fontFamily: "monospace" }}>T{tier}</span>;
}

function ScoreChip({ score, isSAS }) {
  const bg    = score >= 9 ? "rgba(0,180,216,0.18)" : score >= 7 ? "rgba(102,187,106,0.12)" : score <= 3 ? "rgba(229,57,53,0.1)" : "transparent";
  const color = isSAS && score >= 8 ? "#00B4D8" : score >= 9 ? "#00B4D8" : score >= 7 ? "#66BB6A" : score <= 3 ? "#E53935" : "#94a3b8";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: "monospace", background: bg, color }}>
      {score}
    </span>
  );
}

function ScoreBar({ score, isSAS, highlight }) {
  const bg = isSAS ? "linear-gradient(90deg,#00B4D8,#0077B6)" : highlight ? "linear-gradient(90deg,#F57C00,#E53935)" : "linear-gradient(90deg,#4a5568,#2d3748)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 56, height: 7, background: "#1a1a2e", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${score * 10}%`, height: "100%", background: bg, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: isSAS ? "#00B4D8" : "#a0aec0", fontFamily: "monospace", minWidth: 16 }}>{score}</span>
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "7px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "monospace", transition: "all 0.2s", background: active ? "#00B4D8" : "transparent", color: active ? "#0a0a1a" : "#a0aec0", border: active ? "none" : "1px solid #1e293b" }}>
      {label}
    </button>
  );
}

function TierFilterBar({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {[{ k: "all", l: "All" }, { k: "1", l: "T1: Platforms" }, { k: "2", l: "T2: Analytics/ML" }, { k: "3", l: "T3: BI/Viz" }, { k: "4", l: "T4: Statistical" }].map(f => (
        <button key={f.k} onClick={() => onChange(f.k)} style={{ padding: "4px 10px", borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: "monospace", border: "1px solid #1e293b", background: value === f.k ? "#1e293b" : "transparent", color: value === f.k ? "#e2e8f0" : "#64748b" }}>
          {f.l}
        </button>
      ))}
    </div>
  );
}

function MatrixView({ vendors, dimensions, tiers, sortDim, onSortDim }) {
  // sortDim === "weighted" | "avg" | null | number (dimension index)
  const SORT_WEIGHTED = "weighted";
  const SORT_AVG      = "avg";

  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "8px 10px", color: "#64748b", fontSize: 10, fontWeight: 600, position: "sticky", left: 0, background: "#0a0a1a", zIndex: 2, borderBottom: "1px solid #1e293b", minWidth: 140 }}>VENDOR</th>
            {dimensions.map((d, i) => (
              <th key={d.id} onClick={() => onSortDim(sortDim === i ? null : i)} style={{ textAlign: "center", padding: "8px 4px", fontSize: 9, fontWeight: 600, cursor: "pointer", color: sortDim === i ? "#00B4D8" : "#64748b", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap", minWidth: 64, userSelect: "none" }}>
                {d.label.split(" / ")[0]}{sortDim === i ? " ▼" : ""}
                <div style={{ fontSize: 8, color: "#475569", fontWeight: 400, marginTop: 1 }}>w{d.marketWeight}</div>
              </th>
            ))}
            {/* Simple avg column */}
            <th onClick={() => onSortDim(sortDim === SORT_AVG ? null : SORT_AVG)} style={{ textAlign: "center", padding: "8px 6px", fontSize: 9, fontWeight: 600, cursor: "pointer", color: sortDim === SORT_AVG ? "#94a3b8" : "#64748b", borderBottom: "1px solid #1e293b", minWidth: 44, userSelect: "none", whiteSpace: "nowrap" }}>
              AVG{sortDim === SORT_AVG ? " ▼" : ""}
            </th>
            {/* Weighted score column — hero column */}
            <th onClick={() => onSortDim(sortDim === SORT_WEIGHTED ? null : SORT_WEIGHTED)} style={{ textAlign: "center", padding: "8px 8px", fontSize: 9, fontWeight: 700, cursor: "pointer", borderBottom: "2px solid #00B4D8", minWidth: 60, userSelect: "none", whiteSpace: "nowrap", background: "rgba(0,180,216,0.06)", color: sortDim === SORT_WEIGHTED ? "#00B4D8" : "#7dd3fc" }}>
              WTD{sortDim === SORT_WEIGHTED ? " ▼" : " ↕"}
              <div style={{ fontSize: 8, fontWeight: 400, color: "#475569", marginTop: 1 }}>mkt-weighted</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {vendors.map(v => {
            const simpleAvg = avg(v.scores);
            const wtd       = weightedScore(v.scores, dimensions);
            return (
              <tr key={v.id} style={{ background: v.isSAS ? "rgba(0,180,216,0.05)" : "transparent" }}>
                <td style={{ padding: "6px 10px", position: "sticky", left: 0, background: v.isSAS ? "rgba(0,180,216,0.07)" : "#0a0a1a", zIndex: 1, borderBottom: "1px solid #111827" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <TierBadge tier={v.tier} tiers={tiers} />
                    <span style={{ fontWeight: v.isSAS ? 700 : 500, color: v.isSAS ? "#00B4D8" : "#e2e8f0", fontSize: 11 }}>{v.name}</span>
                    {v.threat && <ThreatBadge level={v.threat} />}
                  </div>
                </td>
                {v.scores.map((s, i) => (
                  <td key={i} style={{ textAlign: "center", padding: "6px 4px", borderBottom: "1px solid #111827" }}>
                    <ScoreChip score={s} isSAS={v.isSAS} />
                  </td>
                ))}
                {/* Simple avg */}
                <td style={{ textAlign: "center", padding: "6px", borderBottom: "1px solid #111827", fontFamily: "monospace", color: "#64748b", fontSize: 11 }}>
                  {simpleAvg}
                </td>
                {/* Weighted score — styled prominently */}
                <td style={{ textAlign: "center", padding: "6px 8px", borderBottom: "1px solid #111827", background: "rgba(0,180,216,0.04)" }}>
                  <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace", color: wScoreColor(wtd) }}>
                    {wtd}
                  </span>
                  {v.isSAS && (
                    <div style={{ fontSize: 8, color: "#475569", fontFamily: "monospace" }}>baseline</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CompetitorCard({ vendor, dimensions, tiers, sasScores }) {
  const [open, setOpen] = useState(false);
  const wtd    = weightedScore(vendor.scores, dimensions);
  const sasWtd = weightedScore(sasScores, dimensions);
  const wtdDelta = (parseFloat(wtd) - parseFloat(sasWtd)).toFixed(1);
  return (
    <div style={{ background: "#111827", borderRadius: 10, padding: 16, border: vendor.isSAS ? "1px solid rgba(0,180,216,0.3)" : "1px solid #1e293b" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <TierBadge tier={vendor.tier} tiers={tiers} />
            <span style={{ fontSize: 15, fontWeight: 700, color: vendor.isSAS ? "#00B4D8" : "#e2e8f0" }}>{vendor.name}</span>
            {vendor.threat && <ThreatBadge level={vendor.threat} />}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{vendor.revenue}</div>
        </div>
        {/* Weighted score badge */}
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: wScoreColor(wtd) }}>{wtd}</span>
              <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>/10 wtd</span>
            </div>
            {!vendor.isSAS && (
              <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: parseFloat(wtdDelta) > 0 ? "#E53935" : "#66BB6A" }}>
                {parseFloat(wtdDelta) > 0 ? `+${wtdDelta}` : wtdDelta} vs SAS ({sasWtd})
              </span>
            )}
            {vendor.isSAS && (
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "#475569" }}>baseline</span>
            )}
            <div style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace" }}>
              {vendor.analyst.gartnerDSML && vendor.analyst.gartnerDSML !== "—" ? vendor.analyst.gartnerDSML.split("(")[0].trim() : ""}
            </div>
            <div style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace" }}>
              {vendor.analyst.g2 ? vendor.analyst.g2.split("(")[0].trim() : ""}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", marginBottom: 10 }}>
        {dimensions.map((d, i) => {
          const delta = vendor.scores[i] - sasScores[i];
          return (
            <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 0" }}>
              <span style={{ fontSize: 10, color: "#94a3b8", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.label.split(" / ")[0]}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <ScoreBar score={vendor.scores[i]} isSAS={vendor.isSAS} highlight={!vendor.isSAS && delta > 0} />
                {!vendor.isSAS && delta !== 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: delta > 0 ? "#E53935" : "#66BB6A", fontFamily: "monospace", minWidth: 20 }}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => setOpen(!open)} style={{ background: "transparent", border: "1px solid #1e293b", color: "#64748b", padding: "4px 10px", borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: "monospace", width: "100%" }}>
        {open ? "COLLAPSE ▲" : "EXPAND — GenAI · Analyst · Key Moves ▼"}
      </button>

      {open && (
        <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8", lineHeight: 1.65 }}>
          {vendor.genaiStatus   && <p style={{ marginBottom: 6 }}><strong style={{ color: "#64748b" }}>GENAI: </strong>{vendor.genaiStatus}</p>}
          {vendor.keyMove       && <p style={{ marginBottom: 6 }}><strong style={{ color: "#64748b" }}>KEY MOVE: </strong>{vendor.keyMove}</p>}
          {!vendor.isSAS && vendor.threatVector  && <p style={{ marginBottom: 6 }}><strong style={{ color: "#E53935" }}>THREAT: </strong>{vendor.threatVector}</p>}
          {!vendor.isSAS && vendor.sasAdvantage  && <p style={{ marginBottom: 6 }}><strong style={{ color: "#66BB6A" }}>SAS EDGE: </strong>{vendor.sasAdvantage}</p>}
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, fontSize: 10 }}>
            {Object.entries(vendor.analyst).filter(([, v]) => v && v !== "—").map(([k, v]) => (
              <div key={k} style={{ overflow: "hidden" }}><span style={{ color: "#475569" }}>{k}: </span><span style={{ color: "#cbd5e1" }}>{v.length > 60 ? v.slice(0, 57) + "…" : v}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GapsView({ vendors, dimensions, watchItems }) {
  const sas = vendors.find(v => v.isSAS);
  const competitors = vendors.filter(v => !v.isSAS);
  const priority = dimensions.map((d, i) => ({ ...d, idx: i })).filter(d => d.marketWeight >= 7).sort((a, b) => b.marketWeight - a.marketWeight);

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace", marginBottom: 12 }}>
        SAS Viya vs. best-in-class on dimensions with market weight ≥ 7 (analyst-derived priority)
      </div>
      {priority.map(d => {
        const sasScore = sas.scores[d.idx];
        const best = competitors.reduce((mx, v) => v.scores[d.idx] > mx.score ? { score: v.scores[d.idx], name: v.name } : mx, { score: 0, name: "" });
        const gap = sasScore - best.score;
        return (
          <div key={d.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600 }}>
                (Wt {d.marketWeight}) {d.label}
              </span>
              <span style={{ fontSize: 10, fontFamily: "monospace", color: gap >= 0 ? "#66BB6A" : "#E53935" }}>
                SAS {sasScore} {gap >= 0 ? "▲" : "▼"} vs {best.name} ({best.score})
              </span>
            </div>
            <div style={{ position: "relative", height: 8, background: "#1a1a2e", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ position: "absolute", height: "100%", width: `${best.score * 10}%`, background: "rgba(229,57,53,0.25)", borderRadius: 4 }} />
              <div style={{ position: "absolute", height: "100%", width: `${sasScore * 10}%`, background: "linear-gradient(90deg,#00B4D8,#0077B6)", borderRadius: 4 }} />
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 20, background: "#111827", borderRadius: 8, padding: 14, border: "1px solid #1e293b" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#E53935", marginBottom: 10 }}>Critical Watch Items</div>
        {watchItems.map((w, i) => (
          <div key={w.id} style={{ marginBottom: i < watchItems.length - 1 ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <ThreatBadge level={w.severity} />
              <strong style={{ fontSize: 11, color: "#e2e8f0" }}>{w.title}</strong>
            </div>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{w.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadToHeadView({ vendors, dimensions, sas }) {
  const competitors = vendors.filter(v => !v.isSAS);
  const [selectedId, setSelectedId] = useState(competitors[0]?.id || "");
  const [sortMode, setSortMode]     = useState("delta"); // "delta" | "weight" | "dimension"

  const competitor = competitors.find(v => v.id === selectedId);
  if (!competitor) return null;

  const sasWtd  = parseFloat(weightedScore(sas.scores, dimensions));
  const compWtd = parseFloat(weightedScore(competitor.scores, dimensions));
  const wtdDelta = (compWtd - sasWtd).toFixed(1);

  // Build per-dimension rows with delta and sort key
  const rows = dimensions.map((d, i) => ({
    ...d,
    idx:       i,
    sasScore:  sas.scores[i],
    compScore: competitor.scores[i],
    delta:     competitor.scores[i] - sas.scores[i],
  }));

  const sorted = [...rows].sort((a, b) => {
    if (sortMode === "delta")     return Math.abs(b.delta) - Math.abs(a.delta);
    if (sortMode === "weight")    return b.marketWeight - a.marketWeight;
    return a.idx - b.idx;
  });

  // Summary counts
  const sasLeads  = rows.filter(r => r.sasScore > r.compScore).length;
  const compLeads = rows.filter(r => r.compScore > r.sasScore).length;
  const ties      = rows.filter(r => r.delta === 0).length;

  const BAR_MAX = 200; // px for score 10

  function DuelBar({ sasScore, compScore, weight }) {
    const sasW  = (sasScore  / 10) * BAR_MAX;
    const compW = (compScore / 10) * BAR_MAX;
    const delta = compScore - sasScore;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* SAS bar — grows left from center */}
        <div style={{ width: BAR_MAX, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: "#00B4D8", minWidth: 16, textAlign: "right" }}>{sasScore}</span>
            <div style={{ width: sasW, height: 10, background: "linear-gradient(270deg,#00B4D8,#0077B6)", borderRadius: "4px 0 0 4px" }} />
          </div>
        </div>
        {/* Delta pill in center */}
        <div style={{ width: 38, textAlign: "center" }}>
          <span style={{
            display: "inline-block", padding: "1px 5px", borderRadius: 4,
            fontSize: 10, fontWeight: 700, fontFamily: "monospace",
            background: delta > 0 ? "rgba(229,57,53,0.15)" : delta < 0 ? "rgba(102,187,106,0.15)" : "rgba(100,116,139,0.15)",
            color: delta > 0 ? "#E53935" : delta < 0 ? "#66BB6A" : "#64748b",
          }}>
            {delta > 0 ? `+${delta}` : delta === 0 ? "=" : delta}
          </span>
        </div>
        {/* Competitor bar — grows right from center */}
        <div style={{ width: BAR_MAX, display: "flex", justifyContent: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: compW, height: 10, background: delta > 0 ? "linear-gradient(90deg,#E53935,#F57C00)" : "linear-gradient(90deg,#4a5568,#2d3748)", borderRadius: "0 4px 4px 0" }} />
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: delta > 0 ? "#E53935" : "#94a3b8", minWidth: 16 }}>{compScore}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Competitor selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>Compare SAS Viya vs.</span>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{ background: "#111827", border: "1px solid #1e293b", color: "#e2e8f0", padding: "6px 12px", borderRadius: 6, fontSize: 13, fontFamily: "monospace", cursor: "pointer", outline: "none" }}
        >
          {competitors.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ k: "delta", l: "Sort: Biggest Gap" }, { k: "weight", l: "Sort: Market Priority" }, { k: "dimension", l: "Sort: Default" }].map(f => (
            <button key={f.k} onClick={() => setSortMode(f.k)} style={{ padding: "4px 10px", borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: "monospace", border: "1px solid #1e293b", background: sortMode === f.k ? "#1e293b" : "transparent", color: sortMode === f.k ? "#e2e8f0" : "#64748b" }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Summary header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, marginBottom: 20, alignItems: "stretch" }}>
        {/* SAS card */}
        <div style={{ background: "rgba(0,180,216,0.07)", border: "1px solid rgba(0,180,216,0.25)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", marginBottom: 4 }}>SAS VIYA</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#00B4D8", fontFamily: "monospace", marginBottom: 2 }}>{sasWtd.toFixed(1)}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>weighted score</div>
          <div style={{ marginTop: 10, display: "flex", gap: 16 }}>
            <div><span style={{ fontSize: 18, fontWeight: 700, color: "#66BB6A" }}>{sasLeads}</span><span style={{ fontSize: 10, color: "#64748b", marginLeft: 4 }}>leads</span></div>
            <div><span style={{ fontSize: 18, fontWeight: 700, color: "#475569" }}>{ties}</span><span style={{ fontSize: 10, color: "#64748b", marginLeft: 4 }}>ties</span></div>
            <div><span style={{ fontSize: 18, fontWeight: 700, color: "#E53935" }}>{compLeads}</span><span style={{ fontSize: 10, color: "#64748b", marginLeft: 4 }}>trails</span></div>
          </div>
        </div>

        {/* Center divider */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <div style={{ width: 1, flex: 1, background: "#1e293b" }} />
          <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", padding: "4px 8px", border: "1px solid #1e293b", borderRadius: 4, background: "#0a0a1a" }}>VS</span>
          <div style={{ width: 1, flex: 1, background: "#1e293b" }} />
        </div>

        {/* Competitor card */}
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{competitor.name.toUpperCase()}</span>
            {competitor.threat && <ThreatBadge level={competitor.threat} />}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace", color: wScoreColor(compWtd.toFixed(1)), marginBottom: 2 }}>{compWtd.toFixed(1)}</div>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>weighted score</div>
          <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: parseFloat(wtdDelta) > 0 ? "#E53935" : "#66BB6A" }}>
            {parseFloat(wtdDelta) > 0 ? `+${wtdDelta} vs SAS` : `${wtdDelta} vs SAS`}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 16 }}>
            <div><span style={{ fontSize: 18, fontWeight: 700, color: "#E53935" }}>{compLeads}</span><span style={{ fontSize: 10, color: "#64748b", marginLeft: 4 }}>leads</span></div>
            <div><span style={{ fontSize: 18, fontWeight: 700, color: "#475569" }}>{ties}</span><span style={{ fontSize: 10, color: "#64748b", marginLeft: 4 }}>ties</span></div>
            <div><span style={{ fontSize: 18, fontWeight: 700, color: "#66BB6A" }}>{sasLeads}</span><span style={{ fontSize: 10, color: "#64748b", marginLeft: 4 }}>trails</span></div>
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", marginBottom: 4, paddingRight: 0 }}>
        <div style={{ textAlign: "right", paddingRight: 8 }}>
          <span style={{ fontSize: 10, color: "#00B4D8", fontFamily: "monospace", fontWeight: 700 }}>← SAS VIYA</span>
        </div>
        <div style={{ width: 38 + 16 }} />
        <div style={{ paddingLeft: 8 }}>
          <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", fontWeight: 700 }}>{competitor.name.toUpperCase()} →</span>
        </div>
      </div>

      {/* Dimension rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {sorted.map(row => (
          <div key={row.id} style={{ display: "grid", gridTemplateColumns: "160px 1fr auto 1fr", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: row.delta > 2 ? "rgba(229,57,53,0.04)" : row.delta < -2 ? "rgba(102,187,106,0.04)" : "transparent" }}>
            {/* Dimension label + weight */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: row.marketWeight >= 8 ? 600 : 400 }}>{row.label}</div>
              <div style={{ fontSize: 9, color: "#475569", fontFamily: "monospace" }}>weight {row.marketWeight}</div>
            </div>
            {/* Duel bars */}
            <DuelBar sasScore={row.sasScore} compScore={row.compScore} weight={row.marketWeight} />
          </div>
        ))}
      </div>

      {/* Insight callouts */}
      {(competitor.threatVector || competitor.sasAdvantage) && (
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {competitor.sasAdvantage && (
            <div style={{ background: "rgba(102,187,106,0.06)", border: "1px solid rgba(102,187,106,0.2)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#66BB6A", fontFamily: "monospace", marginBottom: 6 }}>▲ SAS ADVANTAGES</div>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{competitor.sasAdvantage}</p>
            </div>
          )}
          {competitor.threatVector && (
            <div style={{ background: "rgba(229,57,53,0.06)", border: "1px solid rgba(229,57,53,0.2)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#E53935", fontFamily: "monospace", marginBottom: 6 }}>▼ THREAT VECTORS</div>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{competitor.threatVector}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineView({ events, tierFilter }) {
  const filtered = tierFilter === "all" ? events
    : tierFilter === "sas" ? events.filter(e => e.tier === 0)
    : events.filter(e => e.tier === 0 || e.tier === parseInt(tierFilter));

  return (
    <div style={{ maxWidth: 650, position: "relative", paddingLeft: 20 }}>
      <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg,#00B4D8,#1e293b)", borderRadius: 2 }} />
      {filtered.map((e, i) => {
        const dotColor = TIER_COLORS[e.tier] || "#64748b";
        return (
          <div key={i} style={{ position: "relative", marginBottom: 14, paddingLeft: 18 }}>
            <div style={{ position: "absolute", left: -1, top: 5, width: 10, height: 10, borderRadius: "50%", background: dotColor, boxShadow: e.tier === 0 ? `0 0 8px ${dotColor}` : "none" }} />
            <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace", marginBottom: 1 }}>{e.date}</div>
            <div style={{ fontSize: 12, color: "#e2e8f0" }}>
              <span style={{ color: dotColor, fontWeight: 700 }}>{e.vendorName}</span>
              <span style={{ color: "#94a3b8" }}> — {e.event}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState("matrix");
  const [tierFilter, setTier] = useState("all");
  const [sortDim, setSortDim] = useState(null);
  const [tlFilter, setTl]     = useState("all");
  useEffect(() => {
    fetch("/competitive-data.json")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (tierFilter === "all") return data.vendors;
    return data.vendors.filter(v => v.isSAS || v.tier === parseInt(tierFilter));
  }, [data, tierFilter]);

  const sorted = useMemo(() => {
    if (!data) return filtered;
    if (sortDim === null)        return filtered;
    if (sortDim === "weighted")  return [...filtered].sort((a, b) => weightedScore(b.scores, data.dimensions) - weightedScore(a.scores, data.dimensions));
    if (sortDim === "avg")       return [...filtered].sort((a, b) => avg(b.scores) - avg(a.scores));
    return [...filtered].sort((a, b) => b.scores[sortDim] - a.scores[sortDim]);
  }, [filtered, sortDim, data]);

  if (error) return (
    <div style={{ background: "#0a0a1a", color: "#E53935", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", padding: 32, textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 16, marginBottom: 8 }}>Failed to load competitive-data.json</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{error}</div>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ background: "#0a0a1a", color: "#00B4D8", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>
      Loading dashboard…
    </div>
  );

  const sas = data.vendors.find(v => v.isSAS);
  const { dimensions, tiers, quickStats, watchItems, timeline, meta } = data;

  return (
    <div style={{ background: "#0a0a1a", color: "#e2e8f0", minHeight: "100vh", fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", padding: "20px 16px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
          <div style={{ width: 4, height: 28, background: "linear-gradient(180deg,#00B4D8,#0077B6)", borderRadius: 2 }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>SAS Viya Competitive Intelligence</h1>
        </div>
        <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", marginLeft: 14 }}>
          {data.vendors.length} vendors · {dimensions.length} dimensions · {meta.coverageWindow} · {meta.classification}
          <span style={{ marginLeft: 12, color: "#475569" }}>v{meta.version} · updated {meta.lastUpdated}</span>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px,1fr))", gap: 10, marginBottom: 20 }}>
        {quickStats.map((s, i) => (
          <div key={i} style={{ background: "#111827", borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${SENTIMENT_COLORS[s.sentiment]}` }}>
            <div style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: SENTIMENT_COLORS[s.sentiment] }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <Tab label="Capability Matrix"    active={tab === "matrix"}   onClick={() => setTab("matrix")}   />
        <Tab label="Competitor Cards"     active={tab === "cards"}    onClick={() => setTab("cards")}    />
        <Tab label="Head-to-Head"         active={tab === "h2h"}      onClick={() => setTab("h2h")}      />
        <Tab label="Market Priority Gaps" active={tab === "gaps"}     onClick={() => setTab("gaps")}     />
        <Tab label="Timeline"             active={tab === "timeline"} onClick={() => setTab("timeline")} />
      </div>

      {/* Tier filter */}
      {(tab === "matrix" || tab === "cards") && (
        <div style={{ marginBottom: 12 }}><TierFilterBar value={tierFilter} onChange={setTier} /></div>
      )}

      {tab === "matrix" && (
        <>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 8 }}>
            Click any column to sort · <span style={{ color: "#00B4D8" }}>Blue ≥ 9</span> · <span style={{ color: "#66BB6A" }}>Green ≥ 7</span> · <span style={{ color: "#E53935" }}>Red ≤ 3</span>
            &nbsp;·&nbsp; <span style={{ color: "#7dd3fc", fontWeight: 600 }}>WTD</span> = market-priority weighted score (GenAI w10, Governance w9… vs. simple AVG). Click <span style={{ color: "#7dd3fc" }}>WTD ↕</span> to rank by it.
          </div>
          <MatrixView vendors={sorted} dimensions={dimensions} tiers={tiers} sortDim={sortDim} onSortDim={setSortDim} />
        </>
      )}

      {tab === "cards" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(370px,1fr))", gap: 12 }}>
          {filtered.map(v => <CompetitorCard key={v.id} vendor={v} dimensions={dimensions} tiers={tiers} sasScores={sas.scores} />)}
        </div>
      )}

      {tab === "h2h" && <HeadToHeadView vendors={data.vendors} dimensions={dimensions} sas={sas} />}

      {tab === "gaps" && <GapsView vendors={data.vendors} dimensions={dimensions} watchItems={watchItems} />}

      {tab === "timeline" && (
        <div style={{ maxWidth: 650 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {[{ k: "all", l: "All" }, { k: "sas", l: "SAS" }, { k: "1", l: "T1" }, { k: "2", l: "T2" }, { k: "3", l: "T3" }].map(f => (
              <button key={f.k} onClick={() => setTl(f.k)} style={{ padding: "4px 10px", borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: "monospace", border: "1px solid #1e293b", background: tlFilter === f.k ? "#1e293b" : "transparent", color: tlFilter === f.k ? "#e2e8f0" : "#64748b" }}>
                {f.l}
              </button>
            ))}
          </div>
          <TimelineView events={timeline} tierFilter={tlFilter} />
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 28, paddingTop: 12, borderTop: "1px solid #1e293b", fontSize: 9, color: "#475569", fontFamily: "monospace", lineHeight: 1.7 }}>
        Sources: Gartner MQ DSML 2024/2025 · Gartner MQ Decision Intelligence 2026 · Gartner MQ ABI 2025 · Forrester Wave AI/ML Q3 2024 · Forrester Wave BI Q2 2025 · IDC MarketScape MLOps/AI Governance 2024–26 · G2 &amp; Gartner Peer Insights · vendor press releases · CNBC · TechTarget
        <br />To update: edit <code style={{ color: "#00B4D8" }}>public/competitive-data.json</code> and push to trigger a redeploy. No code changes needed.
      </div>
    </div>
  );
}
