/* Recognise each sheet by its header row (not the file name) and map columns tolerantly. */
(function (w) {
  var CH = w.CH = w.CH || {};

  function decodeX(h) { return String(h == null ? "" : h).replace(/_x([0-9a-fA-F]{4})_/g, function (m, x) { return String.fromCharCode(parseInt(x, 16)); }); }
  function norm(h) { return decodeX(h).replace(/\u00a0/g, " ").toLowerCase().replace(/[^a-z0-9]+/g, ""); }
  function txt(v) { return v == null ? "" : String(v).replace(/\u00a0/g, " ").trim(); }
  function blankish(v) {
    if (v == null) return true;
    if (typeof v === "number") return !isFinite(v);
    var s = txt(v);
    return !s || /^#(ref!|n\/a|value!|div\/0!|name\?|null!|num!|spill!|calc!)$/i.test(s) || /^\(?\s*blank\s*\)?$/i.test(s) || /^(n\/a|null|none)$/i.test(s);
  }
  function dateIso(v) {
    if (blankish(v)) return "";
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + "-" + ("0" + (v.getMonth() + 1)).slice(-2) + "-" + ("0" + v.getDate()).slice(-2);
    if (typeof v === "number" && v > 20000 && v < 80000) {
      var d = new Date(Math.round((v - 25569) * 864e5));
      return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + d.getUTCDate()).slice(-2);
    }
    var s = txt(v), m;
    if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return m[1] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2);
    if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/))) { var y = m[3].length === 2 ? "20" + m[3] : m[3]; return y + "-" + ("0" + m[1]).slice(-2) + "-" + ("0" + m[2]).slice(-2); }
    if ((m = s.match(/^(\d{4})(\d\d)(\d\d)$/))) return m[1] + "-" + m[2] + "-" + m[3];
    var d2 = new Date(s);
    return isNaN(d2) ? "" : dateIso(d2);
  }
  function aliasMap(cols) {
    var m = {};
    cols.forEach(function (c) {
      m[norm(c[1])] = c[0];
      (c[2] || []).forEach(function (a) { if (!m[a]) m[a] = c[0]; });
    });
    return m;
  }
  function aoaSource(aoa) {
    var wd = 0;
    aoa.forEach(function (r) { if (r && r.length > wd) wd = r.length; });
    return { rows: aoa.length, cols: wd, get: function (r, c) { var row = aoa[r]; return row ? row[c] : null; } };
  }
  function mapHeaders(src, alias) {
    var best = 0, hi = -1, r, c;
    for (r = 0; r < Math.min(src.rows, 20); r++) {
      var sc = 0;
      for (c = 0; c < src.cols; c++) { var h = src.get(r, c); if (h != null && h !== "" && alias[norm(h)]) sc++; }
      if (sc > best) { best = sc; hi = r; }
    }
    if (hi < 0 || best < 2) return null;
    var map = {}, extra = [], headers = [];
    for (c = 0; c < src.cols; c++) {
      var hv = src.get(hi, c), k = alias[norm(hv)];
      headers.push(txt(decodeX(hv)));
      if (!txt(hv)) continue;
      if (!k) { extra.push(txt(decodeX(hv))); continue; }
      if (map[k] == null) map[k] = c;
    }
    return { row: hi, map: map, extra: extra, headers: headers, hits: best };
  }
  function pick(src, r, map, key) { return map[key] == null ? null : src.get(r, map[key]); }

  var PERS_COLS = [
    ["bu", "Business Unit", ["businessunit", "unit", "busunit"]],
    ["rank", "RANK", ["rank", "grade", "paygrade"]],
    ["name", "Full Name", ["fullname", "name", "soldiername", "smname"]],
    ["rel", "Religion Code", ["religioncode", "religion", "relcode", "relpref", "religiouspreferencecode"]],
    ["reldesc", "Religion Short Description", ["religionshortdescription", "religiondescription", "religiondesc", "religiouspreference"]],
    ["job", "Soldier Job Code (AOC_MOSW_MOS)", ["soldierjobcodeaocmoswmos", "soldierjobcode", "jobcode", "aoc", "mos", "aocmos", "aocmoswmos", "pmos"]],
    ["dor", "Home Assignment Grade Entry Date", ["homeassignmentgradeentrydate", "gradeentrydate", "dateofrank", "dor", "gradeentrdate"]],
    ["uic", "UIC", ["uic", "unitidentificationcode", "unitid"]],
    ["asi", "ASI", ["asi", "additionalskillidentifier"]],
    ["smos", "SMOS", ["smos", "secondarymos", "secondaryaoc"]],
    ["diems", "Date Initial Entry Military Service (DIEMS)", ["dateinitialentrymilitaryservicediems", "diems", "dateinitialentrymilitaryservice", "basicedate", "pebd"]],
    ["ets", "ETS", ["ets", "expirationtermofservice", "etsdate"]],
    ["mrd", "Mandatory Removal Date/Retention Control Point (MRD/RCP)", ["mandatoryremovaldateretentioncontrolpointmrdrcp", "mandatoryremovaldate", "mrd", "rcp", "mrdrcp", "retentioncontrolpoint"]],
    ["edRecent", "Military Education Most Recent Active", ["militaryeducationmostrecentactive", "mostrecentmilitaryeducation", "recentmilied"]],
    ["edStat", "Military Education Status", ["militaryeducationstatus", "miledstatus"]],
    ["mel", "Highest MEL Completed", ["highestmelcompleted", "highestmel", "mel", "melcompleted"]],
    ["eval", "Last Evaluation Date", ["lastevaluationdate", "lasteval", "lastevaldate", "oerdate", "ncoerdate"]],
    ["ret", "Retirement Pay Eligibility Date", ["retirementpayeligibilitydate", "retirementeligibilitydate", "retirementdate", "rped"]],
    ["aft", "AFT Pass Fail", ["aftpassfail", "aft", "acftpassfail", "pftpassfail", "aftresult", "aftstatus"]],
    ["pftCat", "Physical Fitness Test Category Type", ["physicalfitnesstestcategorytype", "pftcategory", "aftcategory"]],
    ["pftDate", "Physical Fitness Test Effective Date", ["physicalfitnesstesteffectivedate", "pfteffectivedate", "aftdate", "acftdate", "pftdate", "lasttestdate"]],
    ["pftDesc", "Physical Fitness Test Short Description", ["physicalfitnesstestshortdescription", "pftdescription", "aftdescription"]],
    ["wpn", "Weapon Qualification", ["weaponqualification", "weaponsqual", "weaponqual", "qualification", "weapon"]],
    ["wpnDate", "Weapon Qualification Date", ["weaponqualificationdate", "weaponsqualdate", "weaponqualdate", "qualdate"] ]
  ];
  var ADDR_COLS = [
    ["last", "Last Name", ["lastname", "lname", "soldierlastname", "surname", "familyname"]],
    ["first", "First Name", ["firstname", "fname", "givenname", "soldierfirstname"]],
    ["addr", "Home Address", ["homeaddress", "address", "streetaddress", "street", "homeaddr", "address1", "homeaddressline1"]],
    ["city", "Home City", ["homecity", "city"]],
    ["state", "Home State", ["homestate", "state"]],
    ["zip", "Home Zip", ["homezip", "zip", "zipcode", "postalcode", "homezipcode"]],
    ["phone", "Preferred Phone", ["preferredphone", "phone", "cell", "mobile", "primaryphone", "homephone", "phonenumber"]],
    ["email", "Home Email", ["homeemail", "email", "emailaddress", "personalemail"]],
    ["bn", "BN Name", ["bnname", "battalion", "battalionname", "unitname", "bn"] ]
  ];
  var PERS_ALIAS = aliasMap(PERS_COLS);
  var ADDR_ALIAS = aliasMap(ADDR_COLS);

  function scoreKind(mapped, needed) {
    if (!mapped) return 0;
    var n = 0;
    needed.forEach(function (k) { if (mapped.map[k] != null) n++; });
    return n;
  }

  function readPersonnel(src, mapped, sheetName) {
    var report = { sheet: sheetName, skipped: { "blank name": 0 }, notes: [], fatal: "" };
    if (mapped.map.name == null) { report.fatal = "No Full Name column."; return { kind: "personnel", rows: [], report: report }; }
    var rows = [];
    for (var r = mapped.row + 1; r < src.rows; r++) {
      var name = txt(pick(src, r, mapped.map, "name"));
      if (!name) { report.skipped["blank name"]++; continue; }
      rows.push({
        bu: txt(pick(src, r, mapped.map, "bu")),
        rank: txt(pick(src, r, mapped.map, "rank")),
        name: name,
        rel: txt(pick(src, r, mapped.map, "rel")),
        reldesc: txt(pick(src, r, mapped.map, "reldesc")),
        job: txt(pick(src, r, mapped.map, "job")),
        dor: dateIso(pick(src, r, mapped.map, "dor")),
        uic: txt(pick(src, r, mapped.map, "uic")),
        asi: txt(pick(src, r, mapped.map, "asi")),
        smos: txt(pick(src, r, mapped.map, "smos")),
        diems: dateIso(pick(src, r, mapped.map, "diems")),
        ets: dateIso(pick(src, r, mapped.map, "ets")),
        mrd: dateIso(pick(src, r, mapped.map, "mrd")),
        edRecent: txt(pick(src, r, mapped.map, "edRecent")),
        edStat: txt(pick(src, r, mapped.map, "edStat")),
        mel: txt(pick(src, r, mapped.map, "mel")),
        eval: dateIso(pick(src, r, mapped.map, "eval")),
        ret: dateIso(pick(src, r, mapped.map, "ret")),
        aft: txt(pick(src, r, mapped.map, "aft")),
        pftCat: txt(pick(src, r, mapped.map, "pftCat")),
        pftDate: dateIso(pick(src, r, mapped.map, "pftDate")),
        pftDesc: txt(pick(src, r, mapped.map, "pftDesc")),
        wpn: txt(pick(src, r, mapped.map, "wpn")),
        wpnDate: dateIso(pick(src, r, mapped.map, "wpnDate"))
      });
    }
    var have = Object.keys(mapped.map).length;
    report.notes.push("Mapped " + have + " of " + PERS_COLS.length + " known columns starting at row " + (mapped.row + 1) + ".");
    if (mapped.extra.length) report.notes.push("Unused columns: " + mapped.extra.slice(0, 12).join(", ") + (mapped.extra.length > 12 ? " …" : ""));
    return { kind: "personnel", rows: rows, report: report };
  }

  function readAddress(src, mapped, sheetName) {
    var report = { sheet: sheetName, skipped: { "blank name": 0 }, notes: [], fatal: "" };
    if (mapped.map.last == null || mapped.map.first == null) { report.fatal = "Need Last Name and First Name columns."; return { kind: "address", rows: [], report: report }; }
    var rows = [];
    for (var r = mapped.row + 1; r < src.rows; r++) {
      var last = txt(pick(src, r, mapped.map, "last")), first = txt(pick(src, r, mapped.map, "first"));
      if (!last && !first) { report.skipped["blank name"]++; continue; }
      rows.push({
        last: last, first: first,
        addr: txt(pick(src, r, mapped.map, "addr")),
        city: txt(pick(src, r, mapped.map, "city")),
        state: txt(pick(src, r, mapped.map, "state")),
        zip: txt(pick(src, r, mapped.map, "zip")),
        phone: txt(pick(src, r, mapped.map, "phone")),
        email: txt(pick(src, r, mapped.map, "email")),
        bn: txt(pick(src, r, mapped.map, "bn"))
      });
    }
    report.notes.push("Mapped " + Object.keys(mapped.map).length + " of " + ADDR_COLS.length + " known columns starting at row " + (mapped.row + 1) + ".");
    return { kind: "address", rows: rows, report: report };
  }

  CH.parseWorkbook = function (fileName, sheets) {
    var got = [];
    sheets.forEach(function (sh) {
      var src = aoaSource(sh.aoa || []);
      var pMap = mapHeaders(src, PERS_ALIAS);
      var aMap = mapHeaders(src, ADDR_ALIAS);
      var pScore = scoreKind(pMap, ["name", "rank", "job"]);
      var aScore = scoreKind(aMap, ["last", "first"]);
      // Personnel wins if it has a full name plus rank or job; address wins if it has last+first and looks like contact data.
      if (pMap && pScore >= 2 && pScore >= aScore && (pMap.map.name && (pMap.map.rank || pMap.map.job || pMap.map.ets || pMap.map.mrd || pMap.map.aft || pMap.map.wpn))) {
        got.push(readPersonnel(src, pMap, sh.name));
      } else if (aMap && aScore >= 2) {
        got.push(readAddress(src, aMap, sh.name));
      }
    });
    return got;
  };
  CH.util = { norm: norm, txt: txt, dateIso: dateIso, blankish: blankish };
})(window);
