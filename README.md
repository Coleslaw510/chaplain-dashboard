# Chaplain Corps Dashboard (fictional test data)

Single self-contained HTML file. Works offline from `file://` (no server, no CDN). Chart.js 4.4.4 and SheetJS are inlined. The visual theme matches the G3 Dashboard.

**This repository contains only fictional test data.** Do not commit real personnel reports (they are CUI).

- Live page: https://coleslaw510.github.io/chaplain-dashboard/
- `index.html`: the dashboard, preloaded with 30 made-up Soldiers. Open it locally or on the live page, then use **Upload data** to load your two Excel files in the browser. Nothing is sent to a server.
- Sample workbooks (same column headers as a real report; duplicate personnel rows are intentional):
  - [samples/chaplain-personnel-test.xlsx](samples/chaplain-personnel-test.xlsx)
  - [samples/chaplain-address-test.xlsx](samples/chaplain-address-test.xlsx)
- `src/`: source. Build with `python3 build.py`. Regenerate samples with `python3 tools/generate_samples.py`. Check with `node tools/verify.js`.

A **Save with data** copy contains whatever you loaded. Treat that file with the same protection as the source reports and do not put it in this repo.
