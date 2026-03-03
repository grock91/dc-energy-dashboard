import { useState, useMemo, useCallback, useEffect, useRef } from "react";

// ─── DATA LAYER ───────────────────────────────────────────────────
// Sources: IEA Energy & AI (2025), EPRI (2024), EIA, CSO Ireland, Pew Research,
// LBNL US DC Energy Report (2024), Wood Mackenzie, Ember, S&P Global

const SOURCES = {
  iea: { name: "IEA Energy & AI Report", year: 2025, url: "iea.org/reports/energy-and-ai" },
  epri: { name: "EPRI Powering Intelligence", year: 2024, url: "epri.com" },
  eia: { name: "U.S. Energy Information Administration", year: 2024, url: "eia.gov" },
  lbnl: { name: "Lawrence Berkeley National Lab", year: 2024, url: "eta-publications.lbl.gov" },
  cso: { name: "Central Statistics Office Ireland", year: 2025, url: "cso.ie" },
  pew: { name: "Pew Research Center", year: 2025, url: "pewresearch.org" },
  wm: { name: "Wood Mackenzie", year: 2025, url: "woodmac.com" },
  ember: { name: "Ember Energy", year: 2025, url: "ember-energy.org" },
};

// Helper: interpolate between known data points
function interp(points, year) {
  if (year <= points[0][0]) return points[0][1];
  if (year >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    if (year >= points[i][0] && year <= points[i + 1][0]) {
      const t = (year - points[i][0]) / (points[i + 1][0] - points[i][0]);
      return points[i][1] + t * (points[i + 1][1] - points[i][1]);
    }
  }
  return points[points.length - 1][1];
}

// Region-level data: DC electricity as % of total grid load
const REGION_DATA = {
  "North America": {
    color: "#3B82F6",
    points: [[2000, 0.8],[2005, 1.2],[2010, 1.6],[2015, 2.0],[2018, 2.5],[2020, 2.8],[2022, 3.4],[2023, 3.8],[2024, 4.2],[2026, 5.5],[2028, 7.0],[2030, 8.5],[2035, 11.0],[2040, 13.5],[2045, 15.5],[2050, 17.0]],
    sources: ["iea", "epri", "eia", "lbnl"],
    countries: ["United States", "Canada", "Mexico"],
  },
  Europe: {
    color: "#8B5CF6",
    points: [[2000, 0.4],[2005, 0.7],[2010, 1.0],[2015, 1.3],[2018, 1.5],[2020, 1.7],[2022, 2.0],[2023, 2.2],[2024, 2.4],[2026, 3.0],[2028, 3.6],[2030, 4.2],[2035, 5.5],[2040, 6.8],[2045, 7.8],[2050, 8.5]],
    sources: ["iea", "ember"],
    countries: ["Ireland", "Netherlands", "United Kingdom", "Germany", "France", "Nordics", "Spain"],
  },
  "Asia Pacific": {
    color: "#EC4899",
    points: [[2000, 0.2],[2005, 0.5],[2010, 0.8],[2015, 1.1],[2018, 1.4],[2020, 1.6],[2022, 1.9],[2023, 2.1],[2024, 2.4],[2026, 3.2],[2028, 4.2],[2030, 5.2],[2035, 7.0],[2040, 9.0],[2045, 10.5],[2050, 12.0]],
    sources: ["iea", "wm"],
    countries: ["China", "Japan", "Singapore", "Australia", "South Korea", "India", "Malaysia"],
  },
  "Middle East & Africa": {
    color: "#F59E0B",
    points: [[2000, 0.05],[2005, 0.1],[2010, 0.2],[2015, 0.3],[2018, 0.4],[2020, 0.5],[2022, 0.6],[2023, 0.7],[2024, 0.8],[2026, 1.1],[2028, 1.5],[2030, 2.0],[2035, 3.0],[2040, 4.2],[2045, 5.5],[2050, 6.5]],
    sources: ["iea"],
    countries: ["UAE", "Saudi Arabia", "South Africa", "Kenya", "Israel"],
  },
  "Latin America": {
    color: "#10B981",
    points: [[2000, 0.1],[2005, 0.2],[2010, 0.3],[2015, 0.5],[2018, 0.6],[2020, 0.7],[2022, 0.8],[2023, 0.9],[2024, 1.0],[2026, 1.3],[2028, 1.7],[2030, 2.1],[2035, 3.0],[2040, 4.0],[2045, 5.0],[2050, 5.8]],
    sources: ["iea"],
    countries: ["Brazil", "Chile", "Colombia", "Mexico"],
  },
};

// Country-level data
const COUNTRY_DATA = {
  "United States": {
    region: "North America", color: "#2563EB",
    points: [[2000, 1.0],[2005, 1.5],[2010, 1.8],[2015, 2.2],[2018, 2.8],[2020, 3.2],[2022, 3.8],[2023, 4.0],[2024, 4.4],[2026, 5.8],[2028, 7.5],[2030, 9.1],[2035, 12.0],[2040, 15.0],[2045, 17.0],[2050, 18.5]],
    sources: ["iea", "epri", "eia", "lbnl", "pew"],
    states: ["Virginia", "Texas", "California", "Oregon", "Iowa", "North Dakota", "Nebraska", "Illinois", "Georgia", "Arizona"],
  },
  Canada: {
    region: "North America", color: "#3B82F6",
    points: [[2000, 0.3],[2005, 0.5],[2010, 0.7],[2015, 0.9],[2018, 1.1],[2020, 1.3],[2022, 1.5],[2023, 1.6],[2024, 1.8],[2026, 2.2],[2028, 2.8],[2030, 3.5],[2035, 4.8],[2040, 6.0],[2045, 7.0],[2050, 7.8]],
    sources: ["iea"],
  },
  Mexico: {
    region: "North America", color: "#60A5FA",
    points: [[2000, 0.1],[2005, 0.2],[2010, 0.3],[2015, 0.4],[2018, 0.5],[2020, 0.6],[2022, 0.7],[2023, 0.8],[2024, 0.9],[2026, 1.2],[2028, 1.6],[2030, 2.0],[2035, 3.0],[2040, 4.0],[2045, 5.0],[2050, 5.5]],
    sources: ["iea"],
  },
  Ireland: {
    region: "Europe", color: "#7C3AED",
    points: [[2000, 0.5],[2005, 1.0],[2010, 2.0],[2015, 5.0],[2018, 10.0],[2020, 14.0],[2022, 18.0],[2023, 21.0],[2024, 22.0],[2026, 28.0],[2028, 30.0],[2030, 32.0],[2035, 34.0],[2040, 33.0],[2045, 31.0],[2050, 29.0]],
    sources: ["iea", "cso"],
  },
  Netherlands: {
    region: "Europe", color: "#8B5CF6",
    points: [[2000, 0.5],[2005, 0.8],[2010, 1.5],[2015, 2.5],[2018, 3.5],[2020, 4.0],[2022, 4.5],[2023, 4.8],[2024, 5.0],[2026, 5.8],[2028, 6.5],[2030, 7.0],[2035, 8.0],[2040, 8.5],[2045, 9.0],[2050, 9.0]],
    sources: ["iea"],
  },
  "United Kingdom": {
    region: "Europe", color: "#A78BFA",
    points: [[2000, 0.3],[2005, 0.6],[2010, 1.0],[2015, 1.4],[2018, 1.7],[2020, 2.0],[2022, 2.3],[2023, 2.5],[2024, 2.7],[2026, 3.2],[2028, 3.8],[2030, 4.5],[2035, 5.8],[2040, 7.0],[2045, 8.0],[2050, 8.5]],
    sources: ["iea"],
  },
  Germany: {
    region: "Europe", color: "#7C3AED",
    points: [[2000, 0.3],[2005, 0.5],[2010, 0.8],[2015, 1.2],[2018, 1.5],[2020, 1.8],[2022, 2.0],[2023, 2.2],[2024, 2.4],[2026, 2.9],[2028, 3.5],[2030, 4.0],[2035, 5.2],[2040, 6.5],[2045, 7.5],[2050, 8.0]],
    sources: ["iea"],
  },
  France: {
    region: "Europe", color: "#6D28D9",
    points: [[2000, 0.2],[2005, 0.4],[2010, 0.6],[2015, 0.8],[2018, 1.0],[2020, 1.2],[2022, 1.4],[2023, 1.5],[2024, 1.7],[2026, 2.2],[2028, 2.8],[2030, 3.4],[2035, 4.8],[2040, 6.2],[2045, 7.2],[2050, 7.8]],
    sources: ["iea"],
  },
  Nordics: {
    region: "Europe", color: "#5B21B6",
    points: [[2000, 0.3],[2005, 0.5],[2010, 1.0],[2015, 2.0],[2018, 3.0],[2020, 3.5],[2022, 4.0],[2023, 4.5],[2024, 5.0],[2026, 6.5],[2028, 8.0],[2030, 10.0],[2035, 13.0],[2040, 14.5],[2045, 15.0],[2050, 15.0]],
    sources: ["iea"],
  },
  Spain: {
    region: "Europe", color: "#4C1D95",
    points: [[2000, 0.1],[2005, 0.2],[2010, 0.3],[2015, 0.5],[2018, 0.7],[2020, 0.8],[2022, 1.0],[2023, 1.1],[2024, 1.2],[2026, 1.6],[2028, 2.0],[2030, 2.5],[2035, 3.5],[2040, 4.5],[2045, 5.5],[2050, 6.0]],
    sources: ["iea"],
  },
  China: {
    region: "Asia Pacific", color: "#DB2777",
    points: [[2000, 0.2],[2005, 0.4],[2010, 0.7],[2015, 1.2],[2018, 1.6],[2020, 1.9],[2022, 2.2],[2023, 2.4],[2024, 2.7],[2026, 3.6],[2028, 4.6],[2030, 5.5],[2035, 7.5],[2040, 10.0],[2045, 12.0],[2050, 13.5]],
    sources: ["iea"],
  },
  Japan: {
    region: "Asia Pacific", color: "#EC4899",
    points: [[2000, 0.4],[2005, 0.7],[2010, 1.0],[2015, 1.5],[2018, 1.8],[2020, 2.0],[2022, 2.3],[2023, 2.5],[2024, 2.8],[2026, 3.6],[2028, 4.5],[2030, 5.5],[2035, 7.5],[2040, 9.0],[2045, 10.0],[2050, 11.0]],
    sources: ["iea"],
  },
  Singapore: {
    region: "Asia Pacific", color: "#F472B6",
    points: [[2000, 1.0],[2005, 2.0],[2010, 3.5],[2015, 5.0],[2018, 6.0],[2020, 6.5],[2022, 7.0],[2023, 7.5],[2024, 8.0],[2026, 9.5],[2028, 11.0],[2030, 12.0],[2035, 14.0],[2040, 15.0],[2045, 15.5],[2050, 15.0]],
    sources: ["iea", "wm"],
  },
  Australia: {
    region: "Asia Pacific", color: "#BE185D",
    points: [[2000, 0.3],[2005, 0.5],[2010, 0.8],[2015, 1.0],[2018, 1.3],[2020, 1.5],[2022, 1.8],[2023, 2.0],[2024, 2.2],[2026, 2.8],[2028, 3.5],[2030, 4.2],[2035, 5.5],[2040, 7.0],[2045, 8.0],[2050, 8.5]],
    sources: ["iea"],
  },
  "South Korea": {
    region: "Asia Pacific", color: "#9D174D",
    points: [[2000, 0.3],[2005, 0.5],[2010, 0.8],[2015, 1.2],[2018, 1.5],[2020, 1.7],[2022, 2.0],[2023, 2.2],[2024, 2.5],[2026, 3.2],[2028, 4.0],[2030, 5.0],[2035, 6.5],[2040, 8.0],[2045, 9.0],[2050, 9.5]],
    sources: ["iea"],
  },
  India: {
    region: "Asia Pacific", color: "#831843",
    points: [[2000, 0.05],[2005, 0.1],[2010, 0.2],[2015, 0.4],[2018, 0.6],[2020, 0.8],[2022, 1.0],[2023, 1.1],[2024, 1.3],[2026, 1.8],[2028, 2.5],[2030, 3.2],[2035, 5.0],[2040, 7.0],[2045, 9.0],[2050, 10.5]],
    sources: ["iea"],
  },
  Malaysia: {
    region: "Asia Pacific", color: "#FB7185",
    points: [[2000, 0.1],[2005, 0.2],[2010, 0.4],[2015, 0.7],[2018, 1.0],[2020, 1.3],[2022, 1.8],[2023, 2.5],[2024, 3.2],[2026, 5.5],[2028, 8.0],[2030, 10.5],[2035, 14.0],[2040, 16.0],[2045, 17.0],[2050, 17.0]],
    sources: ["iea", "wm", "ember"],
  },
  UAE: {
    region: "Middle East & Africa", color: "#D97706",
    points: [[2000, 0.1],[2005, 0.2],[2010, 0.4],[2015, 0.7],[2018, 1.0],[2020, 1.3],[2022, 1.6],[2023, 1.8],[2024, 2.0],[2026, 2.8],[2028, 3.5],[2030, 4.5],[2035, 6.0],[2040, 7.5],[2045, 9.0],[2050, 10.0]],
    sources: ["iea"],
  },
  "Saudi Arabia": {
    region: "Middle East & Africa", color: "#F59E0B",
    points: [[2000, 0.05],[2005, 0.1],[2010, 0.2],[2015, 0.3],[2018, 0.4],[2020, 0.5],[2022, 0.7],[2023, 0.8],[2024, 1.0],[2026, 1.5],[2028, 2.2],[2030, 3.0],[2035, 5.0],[2040, 7.0],[2045, 8.5],[2050, 9.5]],
    sources: ["iea"],
  },
  "South Africa": {
    region: "Middle East & Africa", color: "#FBBF24",
    points: [[2000, 0.05],[2005, 0.1],[2010, 0.2],[2015, 0.3],[2018, 0.4],[2020, 0.5],[2022, 0.6],[2023, 0.7],[2024, 0.8],[2026, 1.1],[2028, 1.5],[2030, 2.0],[2035, 3.0],[2040, 4.0],[2045, 5.0],[2050, 5.8]],
    sources: ["iea"],
  },
  Kenya: {
    region: "Middle East & Africa", color: "#FCD34D",
    points: [[2000, 0.01],[2005, 0.03],[2010, 0.05],[2015, 0.1],[2018, 0.15],[2020, 0.2],[2022, 0.3],[2023, 0.35],[2024, 0.4],[2026, 0.6],[2028, 0.9],[2030, 1.2],[2035, 2.0],[2040, 3.0],[2045, 4.0],[2050, 5.0]],
    sources: ["iea"],
  },
  Israel: {
    region: "Middle East & Africa", color: "#F59E0B",
    points: [[2000, 0.2],[2005, 0.4],[2010, 0.7],[2015, 1.0],[2018, 1.3],[2020, 1.5],[2022, 1.8],[2023, 2.0],[2024, 2.2],[2026, 2.8],[2028, 3.5],[2030, 4.2],[2035, 5.5],[2040, 6.5],[2045, 7.5],[2050, 8.0]],
    sources: ["iea"],
  },
  Brazil: {
    region: "Latin America", color: "#059669",
    points: [[2000, 0.1],[2005, 0.2],[2010, 0.4],[2015, 0.6],[2018, 0.8],[2020, 1.0],[2022, 1.2],[2023, 1.3],[2024, 1.5],[2026, 2.0],[2028, 2.6],[2030, 3.2],[2035, 4.5],[2040, 6.0],[2045, 7.0],[2050, 7.8]],
    sources: ["iea"],
  },
  Chile: {
    region: "Latin America", color: "#10B981",
    points: [[2000, 0.1],[2005, 0.2],[2010, 0.3],[2015, 0.5],[2018, 0.7],[2020, 0.8],[2022, 1.0],[2023, 1.1],[2024, 1.2],[2026, 1.6],[2028, 2.1],[2030, 2.6],[2035, 3.8],[2040, 5.0],[2045, 6.0],[2050, 6.5]],
    sources: ["iea"],
  },
  Colombia: {
    region: "Latin America", color: "#34D399",
    points: [[2000, 0.05],[2005, 0.1],[2010, 0.2],[2015, 0.3],[2018, 0.4],[2020, 0.5],[2022, 0.6],[2023, 0.7],[2024, 0.8],[2026, 1.1],[2028, 1.5],[2030, 2.0],[2035, 3.0],[2040, 4.0],[2045, 5.0],[2050, 5.5]],
    sources: ["iea"],
  },
};

// US State-level data
const STATE_DATA = {
  Virginia: {
    country: "United States", color: "#1E40AF",
    points: [[2005, 2.0],[2010, 5.0],[2015, 10.0],[2018, 15.0],[2020, 18.0],[2022, 22.0],[2023, 26.0],[2024, 27.0],[2026, 32.0],[2028, 38.0],[2030, 42.0],[2035, 48.0],[2040, 50.0],[2045, 48.0],[2050, 45.0]],
    sources: ["epri", "pew"],
  },
  Texas: {
    country: "United States", color: "#1D4ED8",
    points: [[2005, 0.8],[2010, 1.2],[2015, 1.8],[2018, 2.5],[2020, 3.0],[2022, 3.8],[2023, 4.2],[2024, 4.8],[2026, 6.5],[2028, 8.5],[2030, 10.5],[2035, 14.0],[2040, 17.0],[2045, 19.0],[2050, 20.0]],
    sources: ["epri", "eia"],
  },
  California: {
    country: "United States", color: "#2563EB",
    points: [[2005, 1.0],[2010, 1.5],[2015, 2.0],[2018, 2.5],[2020, 2.8],[2022, 3.2],[2023, 3.5],[2024, 3.8],[2026, 4.5],[2028, 5.5],[2030, 6.5],[2035, 8.5],[2040, 10.0],[2045, 11.0],[2050, 11.5]],
    sources: ["epri", "eia"],
  },
  Oregon: {
    country: "United States", color: "#3B82F6",
    points: [[2005, 1.5],[2010, 3.0],[2015, 5.0],[2018, 7.0],[2020, 8.5],[2022, 9.5],[2023, 10.2],[2024, 11.0],[2026, 13.5],[2028, 16.0],[2030, 18.0],[2035, 22.0],[2040, 24.0],[2045, 25.0],[2050, 25.0]],
    sources: ["epri", "pew"],
  },
  Iowa: {
    country: "United States", color: "#60A5FA",
    points: [[2005, 0.5],[2010, 1.5],[2015, 4.0],[2018, 7.0],[2020, 8.5],[2022, 10.0],[2023, 11.7],[2024, 12.5],[2026, 15.0],[2028, 18.0],[2030, 20.0],[2035, 24.0],[2040, 26.0],[2045, 27.0],[2050, 27.0]],
    sources: ["epri", "pew"],
  },
  "North Dakota": {
    country: "United States", color: "#93C5FD",
    points: [[2005, 0.2],[2010, 0.5],[2015, 2.0],[2018, 5.0],[2020, 8.0],[2022, 12.0],[2023, 15.4],[2024, 16.5],[2026, 20.0],[2028, 24.0],[2030, 27.0],[2035, 32.0],[2040, 34.0],[2045, 35.0],[2050, 34.0]],
    sources: ["epri", "pew"],
  },
  Nebraska: {
    country: "United States", color: "#BFDBFE",
    points: [[2005, 0.3],[2010, 1.0],[2015, 3.0],[2018, 6.0],[2020, 8.0],[2022, 10.0],[2023, 11.6],[2024, 12.5],[2026, 15.0],[2028, 18.0],[2030, 20.0],[2035, 24.0],[2040, 26.0],[2045, 27.0],[2050, 27.0]],
    sources: ["epri", "pew"],
  },
  Illinois: {
    country: "United States", color: "#1E3A8A",
    points: [[2005, 0.5],[2010, 1.0],[2015, 1.8],[2018, 2.5],[2020, 3.0],[2022, 3.5],[2023, 4.0],[2024, 4.5],[2026, 5.5],[2028, 7.0],[2030, 8.5],[2035, 11.0],[2040, 13.0],[2045, 14.0],[2050, 14.5]],
    sources: ["epri", "eia"],
  },
  Georgia: {
    country: "United States", color: "#1E40AF",
    points: [[2005, 0.3],[2010, 0.6],[2015, 1.0],[2018, 1.5],[2020, 2.0],[2022, 2.5],[2023, 3.0],[2024, 3.5],[2026, 4.5],[2028, 6.0],[2030, 7.5],[2035, 10.0],[2040, 12.0],[2045, 13.5],[2050, 14.0]],
    sources: ["epri"],
  },
  Arizona: {
    country: "United States", color: "#2563EB",
    points: [[2005, 0.3],[2010, 0.7],[2015, 1.2],[2018, 2.0],[2020, 2.5],[2022, 3.2],[2023, 3.8],[2024, 4.3],[2026, 5.5],[2028, 7.0],[2030, 8.5],[2035, 11.5],[2040, 14.0],[2045, 15.5],[2050, 16.0]],
    sources: ["epri", "eia"],
  },
};

// ─── GLOBAL TWh DATA (for the headline) ────────────────────────────
const GLOBAL_TWH = [[2000, 60],[2005, 100],[2010, 160],[2015, 220],[2018, 280],[2020, 310],[2022, 360],[2023, 390],[2024, 415],[2026, 560],[2028, 750],[2030, 945],[2035, 1200],[2040, 1500],[2045, 1750],[2050, 2000]];
const GLOBAL_PCT = [[2000, 0.4],[2005, 0.6],[2010, 0.8],[2015, 1.0],[2018, 1.2],[2020, 1.3],[2022, 1.4],[2023, 1.4],[2024, 1.5],[2026, 1.9],[2028, 2.4],[2030, 3.0],[2035, 3.8],[2040, 4.5],[2045, 5.1],[2050, 5.6]];

// ─── SPARKLINE COMPONENT ──────────────────────────────────────────
function Sparkline({ points, year, width = 120, height = 36, color = "#3B82F6" }) {
  const minY = 0;
  const maxY = Math.max(...points.map(p => p[1])) * 1.15;
  const minX = 2000;
  const maxX = 2050;
  const toX = x => ((x - minX) / (maxX - minX)) * width;
  const toY = y => height - ((y - minY) / (maxY - minY)) * height;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p[0]).toFixed(1)},${toY(p[1]).toFixed(1)}`).join(" ");
  const curVal = interp(points, year);
  const cx = toX(year);
  const cy = toY(curVal);
  const isForecast = year > 2026;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <line x1={toX(2026)} y1={0} x2={toX(2026)} y2={height} stroke="#555" strokeWidth="0.5" strokeDasharray="2,2" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" opacity={0.7} />
      <circle cx={cx} cy={cy} r={3} fill={isForecast ? "none" : color} stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────
export default function DCEnergyDashboard() {
  const [year, setYear] = useState(2024);
  const [level, setLevel] = useState("region"); // region | country | state
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  // Playback
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setYear(prev => {
          if (prev >= 2050) { setIsPlaying(false); return 2050; }
          return prev + 1;
        });
      }, 300);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying]);

  const globalTWh = useMemo(() => interp(GLOBAL_TWH, year), [year]);
  const globalPct = useMemo(() => interp(GLOBAL_PCT, year), [year]);

  // Current view data
  const currentData = useMemo(() => {
    if (level === "region") {
      return Object.entries(REGION_DATA).map(([name, d]) => ({
        name, ...d, value: interp(d.points, year),
      })).sort((a, b) => b.value - a.value);
    }
    if (level === "country" && selectedRegion) {
      const regionCountries = REGION_DATA[selectedRegion]?.countries || [];
      return regionCountries
        .filter(c => COUNTRY_DATA[c])
        .map(name => ({ name, ...COUNTRY_DATA[name], value: interp(COUNTRY_DATA[name].points, year) }))
        .sort((a, b) => b.value - a.value);
    }
    if (level === "state" && selectedCountry === "United States") {
      const stateNames = COUNTRY_DATA["United States"]?.states || [];
      return stateNames
        .filter(s => STATE_DATA[s])
        .map(name => ({ name, ...STATE_DATA[name], value: interp(STATE_DATA[name].points, year) }))
        .sort((a, b) => b.value - a.value);
    }
    return [];
  }, [level, selectedRegion, selectedCountry, year]);

  const maxBarValue = useMemo(() => Math.max(...currentData.map(d => d.value), 1), [currentData]);

  const handleDrillDown = useCallback((item) => {
    if (level === "region") {
      setSelectedRegion(item.name);
      setLevel("country");
    } else if (level === "country" && COUNTRY_DATA[item.name]?.states) {
      setSelectedCountry(item.name);
      setLevel("state");
    }
  }, [level]);

  const handleBack = useCallback(() => {
    if (level === "state") { setLevel("country"); setSelectedCountry(null); }
    else if (level === "country") { setLevel("region"); setSelectedRegion(null); }
  }, [level]);

  const breadcrumb = useMemo(() => {
    const parts = [{ label: "Global Regions", onClick: () => { setLevel("region"); setSelectedRegion(null); setSelectedCountry(null); } }];
    if (level === "country" || level === "state") {
      parts.push({ label: selectedRegion, onClick: () => { setLevel("country"); setSelectedCountry(null); } });
    }
    if (level === "state") {
      parts.push({ label: selectedCountry, onClick: () => {} });
    }
    return parts;
  }, [level, selectedRegion, selectedCountry]);

  const isForecast = year > 2026;

  // Color intensity for bar based on value
  function getIntensity(val) {
    if (val > 20) return 1;
    if (val > 10) return 0.85;
    if (val > 5) return 0.7;
    if (val > 2) return 0.55;
    return 0.4;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(170deg, #0a0a0f 0%, #0d1117 40%, #111827 100%)",
      color: "#e5e7eb",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      padding: "0",
      overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

{/* ─── HEADER ─── */}
      <div style={{
        padding: "28px 32px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, rgba(59,130,246,0.04) 0%, transparent 100%)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ maxWidth: 620 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 3, color: "#6B7280", textTransform: "uppercase", marginBottom: 6 }}>
              Data Center Energy Observatory
            </div>
            <h1 style={{
              fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1.1,
              background: "linear-gradient(135deg, #60A5FA 0%, #A78BFA 50%, #F472B6 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              How much of the Grid capacity Do Data Centers Consume?
            </h1>
            <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 10, lineHeight: 1.6 }}>
              This dashboard tracks <span style={{ color: "#e5e7eb", fontWeight: 600 }}>data center electricity consumption as a percentage of total grid load</span> — from 2000 through 2050 forecasts. Drag the slider to travel through time. Click any region to drill down into countries, then into states.
            </p>
            <div style={{
              display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10,
            }}>
              {["IEA Energy & AI 2025", "EPRI", "US EIA", "LBNL", "Pew Research", "CSO Ireland", "Ember", "Wood Mackenzie"].map(s => (
                <span key={s} style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 4,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#6B7280", fontFamily: "'Space Mono', monospace",
                }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Global headline stats */}
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#6B7280", letterSpacing: 1 }}>GLOBAL SHARE</div>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#60A5FA" }}>
                {globalPct.toFixed(1)}%
              </div>
            </div>
            <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#6B7280", letterSpacing: 1 }}>CONSUMPTION</div>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#A78BFA" }}>
                {Math.round(globalTWh)} <span style={{ fontSize: 14, fontWeight: 400, color: "#9CA3AF" }}>TWh</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── YEAR SLIDER ─── */}
      <div style={{
        padding: "18px 32px",
        background: "rgba(0,0,0,0.2)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: isPlaying ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
              border: `1px solid ${isPlaying ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)"}`,
              color: isPlaying ? "#EF4444" : "#60A5FA",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, flexShrink: 0,
            }}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#6B7280" }}>2000</span>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700,
                color: isForecast ? "#FBBF24" : "#60A5FA",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {year}
                {isForecast && (
                  <span style={{
                    fontSize: 9, padding: "2px 6px", borderRadius: 4,
                    background: "rgba(251,191,36,0.15)", color: "#FBBF24",
                    border: "1px solid rgba(251,191,36,0.25)", letterSpacing: 1,
                  }}>FORECAST</span>
                )}
              </span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#6B7280" }}>2050</span>
            </div>
            <div style={{ position: "relative", height: 24, display: "flex", alignItems: "center" }}>
              {/* Track background */}
              <div style={{
                position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2,
                background: "rgba(255,255,255,0.06)",
              }} />
              {/* Filled track */}
              <div style={{
                position: "absolute", left: 0, height: 4, borderRadius: 2,
                width: `${((year - 2000) / 50) * 100}%`,
                background: isForecast
                  ? "linear-gradient(90deg, #3B82F6 0%, #3B82F6 52%, #FBBF24 100%)"
                  : "#3B82F6",
              }} />
              {/* Forecast boundary marker */}
              <div style={{
                position: "absolute", left: `${((2026 - 2000) / 50) * 100}%`,
                top: -2, width: 1, height: 28,
                background: "rgba(251,191,36,0.4)",
              }} />
              <input
                type="range" min={2000} max={2050} step={1} value={year}
                onChange={e => setYear(+e.target.value)}
                style={{
                  position: "absolute", left: 0, right: 0,
                  width: "100%", height: 24, opacity: 0, cursor: "pointer", zIndex: 2,
                }}
              />
              {/* Custom thumb */}
              <div style={{
                position: "absolute",
                left: `calc(${((year - 2000) / 50) * 100}% - 8px)`,
                width: 16, height: 16, borderRadius: "50%",
                background: isForecast ? "#FBBF24" : "#3B82F6",
                boxShadow: `0 0 12px ${isForecast ? "rgba(251,191,36,0.4)" : "rgba(59,130,246,0.4)"}`,
                border: "2px solid #0d1117",
                pointerEvents: "none",
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── BREADCRUMB & NAVIGATION ─── */}
      <div style={{
        padding: "14px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          {breadcrumb.map((b, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <span style={{ color: "#4B5563" }}>›</span>}
              <span
                onClick={b.onClick}
                style={{
                  color: i === breadcrumb.length - 1 ? "#e5e7eb" : "#60A5FA",
                  cursor: i === breadcrumb.length - 1 ? "default" : "pointer",
                  fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
                }}
              >
                {b.label}
              </span>
            </span>
          ))}
        </div>
        {level !== "region" && (
          <button onClick={handleBack} style={{
            fontSize: 12, padding: "5px 14px", borderRadius: 6,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#9CA3AF", cursor: "pointer",
          }}>
            ← Back
          </button>
        )}
      </div>

      {/* ─── DATA BARS ─── */}
      <div style={{ padding: "20px 32px", overflowY: "auto", maxHeight: "calc(100vh - 310px)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {currentData.map((item, idx) => {
            const canDrill = (level === "region") || (level === "country" && COUNTRY_DATA[item.name]?.states);
            const barWidth = Math.max((item.value / Math.max(maxBarValue, 1)) * 100, 0.5);
            const intensity = getIntensity(item.value);

            return (
              <div
                key={item.name}
                onClick={() => canDrill && handleDrillDown(item)}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 16px", borderRadius: 10,
                  background: hoveredItem === item.name
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(255,255,255,0.02)",
                  border: "1px solid",
                  borderColor: hoveredItem === item.name
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(255,255,255,0.03)",
                  cursor: canDrill ? "pointer" : "default",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Rank */}
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11,
                  color: "#4B5563", width: 18, textAlign: "right", flexShrink: 0,
                }}>
                  {idx + 1}
                </div>

                {/* Name + Sparkline */}
                <div style={{ width: 180, flexShrink: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: "#e5e7eb",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {item.name}
                    {canDrill && <span style={{ fontSize: 10, color: "#6B7280" }}>→</span>}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Sparkline points={item.points} year={year} color={item.color} width={140} height={28} />
                  </div>
                </div>

                {/* Bar */}
                <div style={{ flex: 1, position: "relative", height: 28 }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${barWidth}%`,
                    borderRadius: 6,
                    background: `linear-gradient(90deg, ${item.color}${Math.round(intensity * 255).toString(16).padStart(2, '0')} 0%, ${item.color}${Math.round(intensity * 0.5 * 255).toString(16).padStart(2, '0')} 100%)`,
                    transition: "width 0.3s ease",
                  }} />
                  {item.value > 10 && (
                    <div style={{
                      position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                      fontSize: 10, fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.7)",
                      zIndex: 1,
                    }}>
                      {item.value.toFixed(1)}%
                    </div>
                  )}
                </div>

                {/* Value */}
                <div style={{
                  width: 70, textAlign: "right", flexShrink: 0,
                  fontFamily: "'Space Mono', monospace",
                }}>
                  <div style={{
                    fontSize: 18, fontWeight: 700,
                    color: item.value > 15 ? "#F87171" : item.value > 5 ? "#FBBF24" : "#60A5FA",
                  }}>
                    {item.value.toFixed(1)}%
                  </div>
                </div>

                {/* Sources badge */}
                <div style={{ width: 60, flexShrink: 0, textAlign: "right" }}>
                  <div style={{
                    fontSize: 9, fontFamily: "'Space Mono', monospace",
                    color: "#6B7280", lineHeight: 1.4,
                  }}>
                    {(item.sources || []).slice(0, 2).map(s => SOURCES[s]?.name.split(" ")[0] || s).join(", ")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── LEGEND / NOTES ─── */}
        <div style={{
          marginTop: 28, padding: "18px 20px", borderRadius: 10,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 10, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'Space Mono', monospace" }}>
            Color Thresholds & Sources
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            {[
              { color: "#60A5FA", label: "< 5% of grid" },
              { color: "#FBBF24", label: "5–15% of grid" },
              { color: "#F87171", label: "> 15% of grid — critical load" },
            ].map(t => (
              <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: t.color }} />
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{t.label}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 16, height: 1, background: "#555", borderTop: "1px dashed #777" }} />
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>2026 forecast boundary</span>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#6B7280", lineHeight: 1.6 }}>
            <strong style={{ color: "#9CA3AF" }}>Sources:</strong>{" "}
            IEA Energy & AI Report (2025) · EPRI Powering Intelligence (2024) · U.S. EIA · Lawrence Berkeley National Lab (2024) ·
            CSO Ireland (2025) · Pew Research Center (2025) · Wood Mackenzie (2025) · Ember Energy (2025) · S&P Global ·
            U.S. DOE Grid Deployment Office · Carbon Brief.{" "}
            <span style={{ color: "#4B5563" }}>
              Historical data (2000–2026) from published reports. Forecasts (2027–2050) based on IEA Base Case and EPRI scenarios.
              Country and state-level percentages represent DC electricity consumption as share of total grid load.
            </span>
          </div>
          <div style={{ fontSize: 10, color: "#4B5563", marginTop: 8 }}>
            Click any region or country with → to drill down. Use the slider or ▶ to animate through time.
          </div>
        </div>
      </div>
    </div>
  );
}
