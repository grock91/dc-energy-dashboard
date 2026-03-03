# DC Energy Observatory — Global Data Center Grid Load Share

Interactive dashboard showing data center electricity consumption as a percentage of total grid load across regions, countries, and states — from 2000 to 2050.

## Features

- **3-level drill-down**: Regions → Countries → States/Provinces
- **Time slider**: 2000–2050 with animated playback
- **Authoritative sources**: IEA, EPRI, EIA, LBNL, CSO Ireland, Pew Research, Ember, Wood Mackenzie
- **Forecast boundary**: Visual distinction between historical data (≤2026) and projections (2027+)

## Data Sources

| Source | Coverage |
|--------|----------|
| IEA Energy & AI Report (2025) | Global + regional consumption & forecasts |
| EPRI Powering Intelligence (2024) | US state-level load scenarios |
| US Energy Information Administration | US electricity data |
| Lawrence Berkeley National Lab (2024) | US data center energy usage |
| CSO Ireland (2025) | Ireland DC electricity share |
| Pew Research Center (2025) | US state-level DC percentages |
| Wood Mackenzie (2025) | Southeast Asia DC demand |
| Ember Energy (2025) | ASEAN DC electricity growth |

## Run Locally

```bash
npm install
npm run dev
```

## Deploy

Connected to Netlify for automatic deployment on push to `main`.

## License

MIT
