#!/usr/bin/env python3
"""Build fictional test workbooks plus testdata.js and religion.js. No real PII."""
from __future__ import annotations
import json
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = Path(__file__).resolve().parent
SRC = ROOT / "src"
SAMPLES = ROOT / "samples"

PERS_HEADERS = [
    "Business Unit", "RANK", "Full Name", "Religion Code", "Religion Short Description",
    "Soldier Job Code (AOC_MOSW_MOS)", "Home Assignment Grade Entry Date", "UIC", "ASI", "SMOS",
    "Date Initial Entry Military Service (DIEMS)", "ETS",
    "Mandatory Removal Date/Retention Control Point (MRD/RCP)",
    "Military Education Most Recent Active", "Military Education Status", "Highest MEL Completed",
    "Last Evaluation Date", "Retirement Pay Eligibility Date", "AFT Pass Fail",
    "Physical Fitness Test Category Type", "Physical Fitness Test Effective Date",
    "Physical Fitness Test Short Description", "Weapon Qualification", "Weapon Qualification Date",
]
ADDR_HEADERS = [
    "Last Name", "First Name", "Home Address", "Home City", "Home State", "Home Zip",
    "Preferred Phone", "Home Email", "BN Name",
]
BN = {
    "HHC": ("Headquarters and Headquarters Company, 99th Infantry Brigade", "WPA01"),
    "IN": ("1st Battalion, 400th Infantry", "WPA10"),
    "IN2": ("1st Battalion, 400th Infantry", "WPA11"),
    "AV": ("2nd Battalion, 401st Aviation", "WPA20"),
    "BSB": ("334th Brigade Support Battalion", "WPA30"),
    "CAV": ("1st Squadron, 402nd Cavalry", "WPA40"),
}

def parse_date(v):
    if not v:
        return None
    if isinstance(v, date):
        return v
    return datetime.strptime(v, "%Y-%m-%d").date()

def short_rel(code, religion):
    if not code or code == "ZZ":
        return ""
    name = religion.get(code, "")
    if not name:
        return ""
    # Title-ish short description as a report might show it
    t = name.title().replace("Lds", "LDS").replace("Usa", "USA")
    return t

def person_row(s, religion, aft, aft_date, wpn, wpn_date, aft_label=None):
    _bn, uic = BN[s["uic"]]
    code = s["rel"]
    return [
        "Prairie Division (FICTIONAL TEST DATA)",
        s["rank"],
        f"{s['last']} {s['first']} {s['mid']}",
        code,
        short_rel(code, religion),
        s["job"],
        parse_date(s["dor"]),
        uic,
        s.get("asi") or "",
        s.get("smos") or "",
        parse_date(s["diems"]),
        parse_date(s.get("ets")),
        parse_date(s.get("mrd")),
        s["ed_recent"],
        s["ed_stat"],
        s["mel"],
        parse_date(s.get("eval")),
        parse_date(s.get("ret")),
        aft_label if aft_label is not None else aft,
        "AFT",
        parse_date(aft_date),
        "Army Fitness Test",
        wpn,
        parse_date(wpn_date),
    ]

def expand_personnel(soldiers, religion):
    rows = []
    for s in soldiers:
        hist_p = list(s.get("pft_hist") or [])
        hist_w = list(s.get("wpn_hist") or [])
        cur_p, cur_w = s["aft"], s["wpn"]
        def split_pw(pair, kind):
            # current: [result, date]; history: [date, result]
            a, b = pair[0], pair[1]
            if kind == "aft":
                results = ("Passed", "Failed", "PASS", "FAIL")
            else:
                results = ("Expert", "Sharpshooter", "Marksman")
            if str(a) in results or str(a).title() in ("Passed", "Failed", "Expert", "Sharpshooter", "Marksman"):
                return a, b  # result, date
            return b, a      # date, result -> result, date
        cur_aft, cur_adt = split_pw(cur_p, "aft")
        cur_wq, cur_wd = split_pw(cur_w, "wpn")
        n = max(len(hist_p), len(hist_w), 1)
        for i in range(n):
            pr = hist_p[i] if i < len(hist_p) else (hist_p[-1] if hist_p else cur_p)
            wr = hist_w[i] if i < len(hist_w) else (hist_w[-1] if hist_w else cur_w)
            aft, adt = split_pw(pr, "aft")
            wq, wd = split_pw(wr, "wpn")
            aft_lab = {"Passed": "PASS", "Failed": "FAIL"}.get(aft, aft) if i == 0 else aft
            wpn_lab = wq.upper() if i % 2 == 0 else wq
            rows.append(person_row(s, religion, aft, adt, wpn_lab, wd, aft_label=aft_lab))
        rows.append(person_row(s, religion, cur_aft, cur_adt, cur_wq, cur_wd))
        if hist_w:
            old_wq, old_wd = split_pw(hist_w[0], "wpn")
            rows.append(person_row(s, religion, cur_aft, cur_adt, old_wq, old_wd, aft_label=str(cur_aft).upper()))
    return rows

def address_rows(soldiers):
    rows = []
    for s in soldiers:
        if s.get("no_address"):
            continue
        bn_name, _ = BN[s["uic"]]
        rows.append([s["last"], s["first"], s["addr"], s["city"], s["st"], s["zip"], s["phone"], s["email"], bn_name])
    rows.append(["ORPHAN", "TEST", "1 Unmatched Sample Rd", "Des Moines", "IA", "50309",
                 "515-555-0199", "orphan.test@example.com",
                 "Headquarters and Headquarters Company, 99th Infantry Brigade"])
    return rows

def js_val(v):
    if v is None or v == "":
        return "null"
    if isinstance(v, date):
        return json.dumps(v.isoformat())
    return json.dumps(v, ensure_ascii=False)

def write_js_array(rows):
    out = ["["]
    for r in rows:
        out.append("    [" + ", ".join(js_val(c) for c in r) + "],")
    out.append("  ]")
    return "\n".join(out)

def write_religion_js(religion):
    keys = sorted(religion, key=lambda k: (0, int(k)) if k.isdigit() else (1, k))
    body = ",\n".join(f'    {json.dumps(k)}: {json.dumps(religion[k])}' for k in keys)
    (SRC / "religion.js").write_text(
        "/* DoD religious preference (manpower) codes.\n"
        " * Primary source: USNA / USMC “Religion Manpower Codes Lookup” (2013),\n"
        " * https://www.usna.edu/USMC/_files/documents/fwd2014commissioningrequirements/Religious%20Preferences%20codes.pdf\n"
        " * CF added from the companion MCRC Religious Preference Codes list (not on the USNA scan).\n"
        " * A few wrapped PDF lines were reconstructed from the same documents.\n"
        " * Unknown codes are shown as-is.\n"
        " */\n"
        "(function (w) {\n"
        "  var CH = w.CH = w.CH || {};\n"
        "  CH.RELIGION_CODES = {\n" + body + "\n  };\n"
        '  CH.RELIGION_SOURCE = "DoD/USMC Religion Manpower Codes Lookup (USNA 2013 PDF); CF from the MCRC Religious Preference Codes list.";\n'
        "})(window);\n"
    )

def write_testdata_js(pers, addr):
    (SRC / "testdata.js").write_text(
        "/* FICTIONAL test data only. Not real personnel. As-of date: 20 Nov 2026. */\n"
        "(function (w) {\n"
        "  var CH = w.CH = w.CH || {};\n"
        '  CH.TEST_ASOF = "2026-11-20";\n'
        "  CH.TEST_PERSONNEL_HEADERS = " + json.dumps(PERS_HEADERS) + ";\n"
        "  CH.TEST_PERSONNEL_ROWS = " + write_js_array(pers) + ";\n"
        "  CH.TEST_ADDRESS_HEADERS = " + json.dumps(ADDR_HEADERS) + ";\n"
        "  CH.TEST_ADDRESS_ROWS = " + write_js_array(addr) + ";\n"
        "})(window);\n"
    )

def write_xlsx(pers, addr):
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.comments import Comment
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="1E3A8A")
    thin = Border(
        left=Side(style="thin", color="E3E8F0"),
        right=Side(style="thin", color="E3E8F0"),
        top=Side(style="thin", color="E3E8F0"),
        bottom=Side(style="thin", color="E3E8F0"),
    )
    note_fill = PatternFill("solid", fgColor="FFFBEB")

    def sheet(wb, title, headers, rows, banner):
        ws = wb.active if wb.active.title == "Sheet" and not wb.active["A1"].value else wb.create_sheet(title)
        ws.title = title
        ws.append([banner])
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
        ws["A1"].font = Font(bold=True, color="92400E")
        ws["A1"].fill = note_fill
        ws.append(headers)
        for c in range(1, len(headers) + 1):
            cell = ws.cell(2, c)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(wrap_text=True, vertical="center")
            cell.border = thin
        for r in rows:
            ws.append(list(r))
            rr = ws.max_row
            for c, val in enumerate(r, 1):
                cell = ws.cell(rr, c)
                cell.border = thin
                if isinstance(val, date):
                    cell.number_format = "YYYY-MM-DD"
        ws.row_dimensions[1].height = 28
        ws.row_dimensions[2].height = 30
        ws.freeze_panes = "A3"
        for i, h in enumerate(headers, 1):
            ws.column_dimensions[get_column_letter(i)].width = max(14, min(42, len(h) + 4))
        ws["A1"].comment = Comment(
            "FICTIONAL test data for the Chaplain Corps Dashboard. Not real Soldiers. "
            "Multiple rows per name are intentional (report quirk). The dashboard keeps the most recent PFT and weapon-qualification dates.",
            "Chaplain Dashboard",
        )
        return ws

    wb1 = Workbook()
    sheet(wb1, "Personnel", PERS_HEADERS, pers,
          "FICTIONAL TEST DATA — not real personnel. Prairie Division Chaplain Corps roster (duplicate rows per Soldier are intentional).")
    p1 = SAMPLES / "chaplain-personnel-test.xlsx"
    wb1.save(p1)
    wb2 = Workbook()
    sheet(wb2, "Addresses", ADDR_HEADERS, addr,
          "FICTIONAL TEST DATA — not real personnel. Match to the personnel file by LAST NAME + FIRST NAME against Full Name.")
    p2 = SAMPLES / "chaplain-address-test.xlsx"
    wb2.save(p2)
    return p1, p2

def main():
    SRC.mkdir(parents=True, exist_ok=True)
    SAMPLES.mkdir(parents=True, exist_ok=True)
    religion = json.loads((TOOLS / "religion_codes.json").read_text())
    soldiers = json.loads((TOOLS / "soldiers.json").read_text())
    pers = expand_personnel(soldiers, religion)
    addr = address_rows(soldiers)
    write_religion_js(religion)
    write_testdata_js(pers, addr)
    p1, p2 = write_xlsx(pers, addr)
    print(f"soldiers {len(soldiers)}  personnel rows {len(pers)}  address rows {len(addr)}")
    print(f"wrote {p1}")
    print(f"wrote {p2}")
    print(f"wrote {SRC / 'religion.js'}")
    print(f"wrote {SRC / 'testdata.js'}")

if __name__ == "__main__":
    main()
