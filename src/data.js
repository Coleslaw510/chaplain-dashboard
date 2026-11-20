/* Chaplain Corps Dashboard: derived roster, test-file wrappers, shared field rules. */
(function (w) {
  var CH = w.CH = w.CH || {};
  CH.PAGES = ["home", "roster", "ets", "retire", "aft", "tig", "schools", "evals", "weapons"];
  CH.KIND_ORDER = ["personnel", "address"];
  CH.KIND_LABEL = { personnel: "Personnel report", address: "Address / contact report" };
  CH.DATASET_COLS = {
    personnel: "Business Unit, RANK, Full Name, Religion Code, Religion Short Description, Soldier Job Code (AOC_MOSW_MOS), Home Assignment Grade Entry Date, UIC, ASI, SMOS, Date Initial Entry Military Service (DIEMS), ETS, Mandatory Removal Date/Retention Control Point (MRD/RCP), Military Education Most Recent Active, Military Education Status, Highest MEL Completed, Last Evaluation Date, Retirement Pay Eligibility Date, AFT Pass Fail, Physical Fitness Test Category Type, Physical Fitness Test Effective Date, Physical Fitness Test Short Description, Weapon Qualification, Weapon Qualification Date",
    address: "Last Name, First Name, Home Address, Home City, Home State, Home Zip, Preferred Phone, Home Email, BN Name"
  };
  CH.OFFICER_RANKS = { COL: 1, LTC: 1, MAJ: 1, CPT: 1, "1LT": 1, "2LT": 1, CW5: 1, CW4: 1, CW3: 1, CW2: 1, WO1: 1, BG: 1, MG: 1, LTG: 1, GEN: 1, "1SG": 0 };
  CH.WPN_RANK = { Expert: 3, Sharpshooter: 2, Marksman: 1 };
  CH.MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  CH.MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  CH.emptyData = function () { return { v: 1, source: "file", asOf: null, sets: {} }; };

  CH.relKey = function (c) {
    var s = String(c == null ? "" : c).replace(/\u00a0/g, " ").trim().toUpperCase();
    if (/^\d+$/.test(s)) s = ("00" + s).slice(-2);
    return s;
  };
  CH.titleCase = function (s) {
    s = String(s || "").toLowerCase().replace(/(^|[\s\-\/(),])([a-z])/g, function (_, a, b) { return a + b.toUpperCase(); });
    s = s.replace(/\b(Lds|Usa|Us|Nc|Af|Inc|The|Of|And|In|For|To)\b/g, function (m, _g, off) {
      var keep = { Lds: "LDS", Usa: "USA", Us: "US", Nc: "NC", Af: "AF", Inc: "Inc." };
      if (keep[m]) return keep[m];
      return off === 0 ? m : m.toLowerCase();
    });
    if (/,\s*the$/i.test(s)) s = "The " + s.replace(/,\s*the$/i, "");
    return s;
  };
  CH.religionName = function (code, shortDesc) {
    var k = CH.relKey(code), official = (CH.RELIGION_CODES || {})[k];
    if (official) return CH.titleCase(official);
    var d = String(shortDesc == null ? "" : shortDesc).replace(/\u00a0/g, " ").trim();
    if (d) return d;
    return k;
  };
  CH.religionKnown = function (code) { return !!(CH.RELIGION_CODES || {})[CH.relKey(code)]; };

  CH.stripJob = function (code) {
    var s = String(code == null ? "" : code).replace(/\u00a0/g, " ").trim().toUpperCase().replace(/\s+/g, "");
    return s.replace(/^[EO](?=[0-9])/, "");
  };
  CH.isOfficer = function (job, rank) {
    var j = String(job == null ? "" : job).replace(/\u00a0/g, " ").trim().toUpperCase();
    if (/^O/.test(j) || /^W/.test(j)) return true;
    if (/^E/.test(j)) return false;
    var r = String(rank == null ? "" : rank).replace(/\s+/g, "").toUpperCase();
    return !!CH.OFFICER_RANKS[r];
  };
  CH.normAft = function (v) {
    var s = String(v == null ? "" : v).replace(/\u00a0/g, " ").trim().toLowerCase().replace(/[\s_\-]/g, "");
    if (!s) return "";
    if (/^(pass|passed|p|go|green|sat|satisfactory)$/.test(s)) return "Passed";
    if (/^(fail|failed|f|nogo|nogo|red|unsat|unsatisfactory)$/.test(s)) return "Failed";
    return String(v).replace(/\u00a0/g, " ").trim();
  };
  CH.normWpn = function (v) {
    var s = String(v == null ? "" : v).replace(/\u00a0/g, " ").trim().toLowerCase().replace(/[\s_\-]/g, "");
    if (!s) return "";
    if (/^(expert|ex|e)$/.test(s)) return "Expert";
    if (/^(sharpshooter|ss|sharp)$/.test(s)) return "Sharpshooter";
    if (/^(marksman|mm|mkm|mark)$/.test(s)) return "Marksman";
    return String(v).replace(/\u00a0/g, " ").trim();
  };
  CH.nameKey = function (s) {
    return String(s == null ? "" : s).replace(/[\u200b-\u200d\u2060\ufeff]/g, "").replace(/,/g, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  };
  CH.namesMatch = function (full, last, first) {
    var f = CH.nameKey(full), prefix = CH.nameKey(String(last || "") + " " + String(first || ""));
    if (!f || !prefix) return false;
    return f === prefix || f.indexOf(prefix + " ") === 0;
  };
  CH.fmtAddress = function (street, city, state, zip) {
    var a = [street, city, state].map(function (x) { return String(x == null ? "" : x).replace(/\u00a0/g, " ").trim(); }).filter(Boolean);
    var z = String(zip == null ? "" : zip).replace(/\u00a0/g, " ").trim();
    if (!a.length && !z) return "";
    var line = a.slice(0, 2).join(", ");
    if (a[2]) line = (a[0] ? a[0] + ", " : "") + a[1] + (a[1] ? ", " : "") + a[2];
    // street, city, ST ZIP
    var streetP = String(street == null ? "" : street).replace(/\u00a0/g, " ").trim();
    var cityP = String(city == null ? "" : city).replace(/\u00a0/g, " ").trim();
    var stP = String(state == null ? "" : state).replace(/\u00a0/g, " ").trim();
    var parts = [];
    if (streetP) parts.push(streetP);
    var csz = [cityP, [stP, z].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    if (csz) parts.push(csz);
    return parts.join(", ");
  };

  CH.parseDate = function (s) {
    if (s instanceof Date && !isNaN(s)) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
    var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  CH.dateIso = function (d) {
    d = CH.parseDate(d);
    return d ? d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) : "";
  };
  CH.daysBetween = function (from, to) {
    var a = CH.parseDate(from), b = CH.parseDate(to);
    if (!a || !b) return null;
    return Math.round((b - a) / 864e5);
  };
  CH.yearsBetween = function (from, to) {
    var d = CH.daysBetween(from, to);
    return d == null ? null : d / 365.25;
  };

  function firstFill(cur, next, keys) {
    keys.forEach(function (k) {
      if ((cur[k] == null || cur[k] === "") && next[k] != null && next[k] !== "") cur[k] = next[k];
    });
  }

  function mergePerson(rows) {
    var identity = ["bu", "rank", "name", "rel", "reldesc", "job", "dor", "uic", "asi", "smos", "diems", "ets", "mrd", "edRecent", "edStat", "mel", "eval", "ret"];
    var p = { srcRows: rows.length, pftDate: "", aft: "", pftCat: "", pftDesc: "", wpnDate: "", wpn: "" };
    identity.forEach(function (k) { p[k] = ""; });
    rows.forEach(function (r) {
      firstFill(p, r, identity);
      if (r.pftDate && (!p.pftDate || r.pftDate > p.pftDate)) {
        p.pftDate = r.pftDate; p.aft = r.aft; p.pftCat = r.pftCat; p.pftDesc = r.pftDesc;
      } else if (r.pftDate && r.pftDate === p.pftDate) {
        if (!p.aft && r.aft) p.aft = r.aft;
        if (!p.pftCat && r.pftCat) p.pftCat = r.pftCat;
        if (!p.pftDesc && r.pftDesc) p.pftDesc = r.pftDesc;
      }
      if (r.wpnDate && (!p.wpnDate || r.wpnDate > p.wpnDate)) {
        p.wpnDate = r.wpnDate; p.wpn = r.wpn;
      } else if (r.wpnDate && r.wpnDate === p.wpnDate && !p.wpn && r.wpn) p.wpn = r.wpn;
    });
    return p;
  }

  CH.derive = function () {
    var d = CH.data, asOf = d.asOf || CH.TEST_ASOF || CH.dateIso(new Date());
    var pers = ((d.sets.personnel || {}).rows) || [];
    var addr = ((d.sets.address || {}).rows) || [];
    var groups = {};
    pers.forEach(function (r) {
      var k = CH.nameKey(r.name);
      if (!k) return;
      (groups[k] = groups[k] || []).push(r);
    });
    var usedAddr = {};
    var unmatchedAddr = [];
    var unknownRel = {};
    var roster = Object.keys(groups).sort().map(function (k) {
      var p = mergePerson(groups[k]);
      var officer = CH.isOfficer(p.job, p.rank);
      p.component = officer ? "Officer" : "Enlisted";
      p.mos = CH.stripJob(p.job);
      p.religion = CH.religionName(p.rel, p.reldesc);
      p.religionKnown = CH.religionKnown(p.rel);
      if (p.rel && !p.religionKnown) unknownRel[CH.relKey(p.rel)] = (unknownRel[CH.relKey(p.rel)] || 0) + 1;
      p.aft = CH.normAft(p.aft);
      p.wpn = CH.normWpn(p.wpn);
      p.wpnRank = CH.WPN_RANK[p.wpn] || 0;
      p.expiration = officer ? p.mrd : p.ets;
      p.expirationType = officer ? "MRD/RCP" : "ETS";
      p.daysExp = CH.daysBetween(asOf, p.expiration);
      p.daysRet = CH.daysBetween(asOf, p.ret);
      p.daysEval = CH.daysBetween(p.eval, asOf);
      p.daysAft = CH.daysBetween(p.pftDate, asOf);
      p.daysWpn = CH.daysBetween(p.wpnDate, asOf);
      p.yearsTig = CH.yearsBetween(p.dor, asOf);
      p.yearsSvc = CH.yearsBetween(p.diems, asOf);
      var hit = null, hi;
      for (hi = 0; hi < addr.length; hi++) {
        if (CH.namesMatch(p.name, addr[hi].last, addr[hi].first)) { hit = addr[hi]; usedAddr[hi] = true; break; }
      }
      if (hit) {
        p.address = CH.fmtAddress(hit.addr, hit.city, hit.state, hit.zip);
        p.street = hit.addr || ""; p.city = hit.city || ""; p.state = hit.state || ""; p.zip = hit.zip || "";
        p.phone = hit.phone || ""; p.email = hit.email || ""; p.bn = hit.bn || "";
        p.addrMatched = true;
      } else {
        p.address = p.street = p.city = p.state = p.zip = p.phone = p.email = p.bn = "";
        p.addrMatched = false;
      }
      p.aftOverdue = p.daysAft == null || p.daysAft > 243; /* ~8 months */
      p.evalDue = p.daysEval == null || p.daysEval > 365;
      p.evalOverdue = p.daysEval == null || p.daysEval > 456; /* ~15 months */
      p.wpnOverdue = p.daysWpn == null || p.daysWpn > 365;
      p.longTig = p.yearsTig != null && p.yearsTig >= 4;
      p.veryLongTig = p.yearsTig != null && p.yearsTig >= 6;
      return p;
    });
    addr.forEach(function (a, i) { if (!usedAddr[i]) unmatchedAddr.push(a); });
    d.roster = roster;
    d.asOf = asOf;
    d.diag = {
      personnel: { raw: pers.length, unique: roster.length },
      address: { raw: addr.length, matched: roster.filter(function (r) { return r.addrMatched; }).length, unmatched: unmatchedAddr.length },
      unknownRel: unknownRel,
      unmatchedPeople: roster.filter(function (r) { return !r.addrMatched; }),
      unmatchedAddr: unmatchedAddr
    };
  };

  CH.makeTestFiles = function () {
    function aoa(headers, rows) { return [headers].concat(rows.map(function (r) { return r.slice(); })); }
    return [
      { name: "Chaplain personnel (test)", sheets: [{ name: "Personnel", aoa: [["FICTIONAL TEST DATA — not real personnel."]].concat(aoa(CH.TEST_PERSONNEL_HEADERS, CH.TEST_PERSONNEL_ROWS)) }] },
      { name: "Chaplain addresses (test)", sheets: [{ name: "Addresses", aoa: [["FICTIONAL TEST DATA — not real personnel."]].concat(aoa(CH.TEST_ADDRESS_HEADERS, CH.TEST_ADDRESS_ROWS)) }] }
    ];
  };
})(window);
