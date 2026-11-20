/* Page renders: Home plus each roster view. */
(function (w) {
  var CH = w.CH;

  var NAME = { k: "name", lbl: "Name", cell: function (p) { return CH.nameCell(p); }, val: function (p) { return p.name; } };
  var RANK = { k: "rank", lbl: "Rank" };
  var MOS = { k: "mos", lbl: "MOS", cell: function (p) { return '<span class="mono">' + CH.esc(p.mos || "—") + "</span>"; } };
  var UIC = { k: "uic", lbl: "UIC", cell: function (p) { return '<span class="mono">' + CH.esc(p.uic || "—") + "</span>"; } };
  var BN = { k: "bn", lbl: "Battalion", wrap: true, val: function (p) { return p.bn; }, cell: function (p) { return CH.esc(p.bn || "—"); } };
  var DOR = { k: "dor", lbl: "Date of Rank", cell: function (p) { return CH.dateText(p.dor); } };

  function windowSeg() {
    return '<div class="segwrap"><span class="seglbl">Window</span>' + CH.seg("window", [["6", "6 months"], ["12", "12 months"], ["over", "Already due"], ["all", "All with a date"]], CH.state.window) + "</div>";
  }

  function counts(rows) {
    var aftFail = rows.filter(function (p) { return p.aft === "Failed"; }).length;
    var ets6 = rows.filter(function (p) { return CH.inWindow(p.daysExp, "6"); }).length;
    var ets12 = rows.filter(function (p) { return CH.inWindow(p.daysExp, "12"); }).length;
    var retNow = rows.filter(function (p) { return p.daysRet != null && p.daysRet <= 0; }).length;
    var ret12 = rows.filter(function (p) { return CH.inWindow(p.daysRet, "12"); }).length;
    var evalOver = rows.filter(function (p) { return p.evalOverdue; }).length;
    var longTig = rows.filter(function (p) { return p.longTig; }).length;
    var wpnOver = rows.filter(function (p) { return p.wpnOverdue; }).length;
    return { aftFail: aftFail, ets6: ets6, ets12: ets12, retNow: retNow, ret12: ret12, evalOver: evalOver, longTig: longTig, wpnOver: wpnOver, n: rows.length };
  }

  /* ---------- Home ---------- */
  var Home = CH.mods.home = { ui: {} };
  Home.render = function () {
    var root = CH.$("page-home"), rows = CH.filtered(), c = counts(rows);
    var officers = rows.filter(function (p) { return p.component === "Officer"; }).length;
    var h = '<div class="hero"><div><div class="eyebrow">Chaplain Corps</div><h1>Chaplain Corps Dashboard' + CH.testTag() + '</h1><p class="lead">' +
      (CH.data.source === "test" ? "Fictional Prairie Division test data · " : "") +
      (CH.data.asOf ? "As of " + CH.dateText(CH.data.asOf) + " · " : "") +
      "ETS and MRD, retirement, AFT, time in grade, schools, evaluations and weapons in one place.</p>" +
      '<div class="hctl" data-stop="1">' + CH.filterBar().replace('class="filters"', 'class="filters" style="margin:12px 0 0;width:100%"') + "</div></div></div>";
    if (CH.data.source === "test") {
      h += '<div class="banner"><strong>Fictional test data.</strong> 30 made-up Soldiers (with duplicate report rows) so you can try the dashboard offline. Upload your two Excel files to replace this — nothing leaves this computer.</div>';
    } else if (!(CH.data.sets && CH.data.sets.personnel)) {
      h += '<div class="nodata"><div><strong>No personnel file loaded.</strong> Use Upload data and choose the roster report (and the address report if you have it).</div></div>';
    }
    var tiles = [
      ["roster", "t-ros", "i-ros", "Roster", CH.num(c.n) + " Soldiers · " + officers + " officers"],
      ["ets", "t-ets", "i-ets", "ETS / MRD", c.ets12 + " within 12 months"],
      ["retire", "t-ret", "i-ret", "Retirement", c.retNow + " eligible now · " + c.ret12 + " within 12 mo"],
      ["aft", "t-aft", "i-aft", "AFT", c.aftFail ? c.aftFail + " failed" : "All passed"],
      ["tig", "t-tig", "i-tig", "Time in Grade", c.longTig + " at rank 4+ years"],
      ["schools", "t-sch", "i-sch", "Schools", "Highest MEL completed"],
      ["evals", "t-eval", "i-eval", "Evaluations", c.evalOver + " overdue or missing"],
      ["weapons", "t-wpn", "i-wpn", "Weapons", c.wpnOver + " qualification overdue"]
    ];
    h += '<div class="tiles t8">' + tiles.map(function (t) {
      return '<button class="tile ' + t[1] + '" type="button" data-go="' + t[0] + '"><span class="tic"><svg class="ic"><use href="#' + t[2] + '"/></svg></span><span class="tt">' + t[3] + '</span><span class="ts">' + t[4] + "</span></button>";
    }).join("") + "</div>";
    h += '<div class="kpis k6">' +
      CH.kpi("info", "On the roster", CH.num(c.n), officers + " officers · " + (c.n - officers) + " enlisted") +
      CH.kpi(c.ets6 ? "warn" : "ok", "ETS / MRD in 6 months", CH.num(c.ets6), c.ets12 + " within 12 months", 'data-go="ets"') +
      CH.kpi(c.retNow ? "warn" : "ok", "Retirement eligible now", CH.num(c.retNow), c.ret12 + " within 12 months", 'data-go="retire"') +
      CH.kpi(c.aftFail ? "alert" : "ok", "AFT failures", CH.num(c.aftFail), "Most recent test", 'data-go="aft"') +
      CH.kpi(c.evalOver ? "warn" : "ok", "Eval overdue / missing", CH.num(c.evalOver), "15 months or no date", 'data-go="evals"') +
      CH.kpi(c.longTig ? "warn" : "ok", "Long time in grade", CH.num(c.longTig), "4 years or more at rank", 'data-go="tig"') +
      "</div>";
    var soonExp = rows.filter(function (p) { return CH.inWindow(p.daysExp, "12"); }).sort(function (a, b) { return (a.daysExp == null ? 9e9 : a.daysExp) - (b.daysExp == null ? 9e9 : b.daysExp); }).slice(0, 6);
    var fails = rows.filter(function (p) { return p.aft === "Failed"; }).sort(function (a, b) { return (b.pftDate || "").localeCompare(a.pftDate || ""); });
    var long = rows.filter(function (p) { return p.longTig; }).sort(function (a, b) { return (b.yearsTig || 0) - (a.yearsTig || 0); }).slice(0, 6);
    function list(items, empty, line) {
      if (!items.length) return '<div class="empty">' + empty + "</div>";
      return items.map(line).join("");
    }
    h += '<div class="overview o3">';
    h += '<article class="ocard" data-go="ets" tabindex="0"><h3><span class="pic t-ets"><svg class="ic"><use href="#i-ets"/></svg></span>Coming up on ETS / MRD' + CH.testTag() + '<span class="more">Open &rsaquo;</span></h3>' +
      list(soonExp, "No expirations in the next 12 months.", function (p) {
        return '<div class="listrow"><div><div class="nm">' + CH.esc(p.rank + "  " + p.name) + '</div><div class="meta">' + CH.esc(p.expirationType) + " " + CH.dateText(p.expiration) + "</div></div>" + CH.duePill(p.daysExp, 365) + "</div>";
      }) + "</article>";
    h += '<article class="ocard" data-go="aft" tabindex="0"><h3><span class="pic t-aft"><svg class="ic"><use href="#i-aft"/></svg></span>AFT failures' + CH.testTag() + '<span class="more">Open &rsaquo;</span></h3>' +
      list(fails, "Everyone on the current filter has a passing most-recent AFT.", function (p) {
        return '<div class="listrow"><div><div class="nm">' + CH.esc(p.rank + "  " + p.name) + '</div><div class="meta">Last test ' + CH.dateText(p.pftDate) + "</div></div>" + CH.aftPill(p.aft) + "</div>";
      }) + "</article>";
    h += '<article class="ocard" data-go="tig" tabindex="0"><h3><span class="pic t-tig"><svg class="ic"><use href="#i-tig"/></svg></span>Longest time in grade' + CH.testTag() + '<span class="more">Open &rsaquo;</span></h3>' +
      list(long, "No one has been at the same rank for 4 years or more.", function (p) {
        return '<div class="listrow"><div><div class="nm">' + CH.esc(p.rank + "  " + p.name) + '</div><div class="meta">Date of rank ' + CH.dateText(p.dor) + "</div></div><strong>" + CH.yearsText(p.yearsTig) + "</strong></div>";
      }) + "</article>";
    h += "</div>";
    h += '<div class="row r2"><div class="panel"><h2>AFT result</h2><div class="chartbox sm"><canvas id="chAft"></canvas></div></div><div class="panel"><h2>Weapon qualification</h2><div class="chartbox sm"><canvas id="chWpn"></canvas></div></div></div>';
    root.innerHTML = h;
    CH.bindCommon(root, Home);
    var passed = rows.filter(function (p) { return p.aft === "Passed"; }).length;
    var failed = c.aftFail, unknown = rows.filter(function (p) { return !p.aft; }).length;
    CH.chart("chAft", { type: "doughnut", data: { labels: ["Passed", "Failed", "No result"], datasets: [{ data: [passed, failed, unknown], backgroundColor: ["#16a34a", "#dc2626", "#cbd5e1"], borderWidth: 0 }] }, options: { plugins: { legend: { position: "bottom" } }, cutout: "62%" } });
    var ex = rows.filter(function (p) { return p.wpn === "Expert"; }).length;
    var sh = rows.filter(function (p) { return p.wpn === "Sharpshooter"; }).length;
    var mk = rows.filter(function (p) { return p.wpn === "Marksman"; }).length;
    var noq = rows.filter(function (p) { return !p.wpn; }).length;
    CH.chart("chWpn", { type: "doughnut", data: { labels: ["Expert", "Sharpshooter", "Marksman", "None"], datasets: [{ data: [ex, sh, mk, noq], backgroundColor: ["#16a34a", "#2563eb", "#64748b", "#cbd5e1"], borderWidth: 0 }] }, options: { plugins: { legend: { position: "bottom" } }, cutout: "62%" } });
  };

  function standardRender(id, icon, title, cfg) {
    return function () {
      var root = CH.$( "page-" + id );
      var rows = CH.filtered(cfg.filter);
      var extra = cfg.toolbar ? cfg.toolbar() : "";
      var h = CH.head(cfg.tone || id, icon, title) + CH.filterBar(extra);
      if (cfg.kpis) h += cfg.kpis(rows);
      if (cfg.note) h += '<p class="pgnote">' + cfg.note + "</p>";
      if (!CH.state.pageSort[id] && cfg.sort) CH.state.pageSort[id] = { k: cfg.sort, dir: cfg.dir || "asc" };
      h += '<div class="panel">' + CH.table(id, cfg.cols, rows, { title: cfg.tableTitle || title, expand: true, sort: cfg.sort, dir: cfg.dir, rowClass: cfg.rowClass }) + "</div>";
      root.innerHTML = h;
      CH.bindCommon(root, CH.mods[id]);
    };
  }

  CH.mods.roster = { ui: {} };
  CH.mods.roster.render = standardRender("roster", "i-ros", "Roster", {
    tone: "ros",
    sort: "name",
    cols: [
      RANK, NAME, MOS, BN, UIC, DOR,
      { k: "expiration", lbl: "Expiration", val: function (p) { return p.expiration || ""; }, cell: function (p) { return p.expiration ? CH.esc(p.expirationType) + " " + CH.dateText(p.expiration) : "—"; } },
      { k: "ret", lbl: "Retirement", cell: function (p) { return CH.dateText(p.ret); } },
      { k: "aft", lbl: "AFT", cell: function (p) { return CH.aftPill(p.aft); } },
      { k: "wpn", lbl: "Weapon", val: function (p) { return p.wpnRank || 0; }, cell: function (p) { return CH.wpnPill(p.wpn); } },
      { k: "mel", lbl: "Highest MEL" },
      { k: "eval", lbl: "Last eval", cell: function (p) { return CH.dateText(p.eval); } }
    ]
  });

  CH.mods.ets = { ui: {} };
  CH.mods.ets.render = standardRender("ets", "i-ets", "ETS and MRD", {
    tone: "ets",
    sort: "daysExp", dir: "asc",
    filter: function (p) { return CH.inWindow(p.daysExp, CH.state.window); },
    toolbar: windowSeg,
    note: "Enlisted expiration is ETS. Officer expiration is Mandatory Removal Date / RCP. Window counts from the data as-of date.",
    kpis: function (rows) {
      var e = rows.filter(function (p) { return p.expirationType === "ETS"; }).length;
      var o = rows.filter(function (p) { return p.expirationType === "MRD/RCP"; }).length;
      var soon = rows.filter(function (p) { return p.daysExp != null && p.daysExp <= 183; }).length;
      return '<div class="kpis">' +
        CH.kpi("warn", "In this window", CH.num(rows.length), "After current filters") +
        CH.kpi("info", "Enlisted (ETS)", CH.num(e), "") +
        CH.kpi("info", "Officers (MRD/RCP)", CH.num(o), "") +
        CH.kpi(soon ? "alert" : "ok", "Within 6 months", CH.num(soon), "Or already past") +
        "</div>";
    },
    rowClass: function (p) { return p.daysExp != null && p.daysExp <= 183 ? (p.daysExp <= 0 ? "overdue" : "due") : ""; },
    cols: [
      RANK, NAME, { k: "component", lbl: "Component" }, MOS, BN, UIC,
      { k: "expirationType", lbl: "Type" },
      { k: "expiration", lbl: "Expiration date", cell: function (p) { return CH.dateText(p.expiration); } },
      { k: "daysExp", lbl: "When", num: true, cell: function (p) { return CH.duePill(p.daysExp, 365); } }
    ]
  });

  CH.mods.retire = { ui: {} };
  CH.mods.retire.render = standardRender("retire", "i-ret", "Retirement eligibility", {
    tone: "ret",
    sort: "daysRet", dir: "asc",
    filter: function (p) { return CH.inWindow(p.daysRet, CH.state.window); },
    toolbar: windowSeg,
    note: "Retirement Pay Eligibility Date from the personnel report. “Already due” means the date is today or earlier (eligible now).",
    kpis: function (rows) {
      var now = rows.filter(function (p) { return p.daysRet != null && p.daysRet <= 0; }).length;
      return '<div class="kpis">' +
        CH.kpi(now ? "warn" : "info", "Eligible now", CH.num(now), "Date is today or earlier") +
        CH.kpi("info", "In this window", CH.num(rows.length), "After current filters") +
        "</div>";
    },
    rowClass: function (p) { return p.daysRet != null && p.daysRet <= 183 ? (p.daysRet <= 0 ? "overdue" : "due") : ""; },
    cols: [
      RANK, NAME, MOS, BN,
      { k: "diems", lbl: "DIEMS", cell: function (p) { return CH.dateText(p.diems); } },
      { k: "yearsSvc", lbl: "Service", num: true, cell: function (p) { return CH.esc(CH.yearsText(p.yearsSvc)); } },
      { k: "ret", lbl: "Eligible date", cell: function (p) { return CH.dateText(p.ret); } },
      { k: "daysRet", lbl: "When", num: true, cell: function (p) { return CH.duePill(p.daysRet, 365); } },
      { k: "expiration", lbl: "ETS / MRD", cell: function (p) { return p.expiration ? CH.esc(p.expirationType) + " " + CH.dateText(p.expiration) : "—"; } }
    ]
  });

  CH.mods.aft = { ui: {} };
  CH.mods.aft.render = standardRender("aft", "i-aft", "Army Fitness Test", {
    tone: "aft",
    sort: "aft", dir: "asc",
    filter: function (p) {
      var v = CH.state.aftView;
      if (v === "failed") return p.aft === "Failed";
      if (v === "passed") return p.aft === "Passed";
      if (v === "overdue") return p.aftOverdue;
      return true;
    },
    toolbar: function () {
      return '<div class="segwrap"><span class="seglbl">Show</span>' + CH.seg("aftView", [["all", "All"], ["failed", "Failed"], ["passed", "Passed"], ["overdue", "Test overdue"]], CH.state.aftView) + "</div>";
    },
    note: "Uses the most recent Physical Fitness Test Effective Date and that row’s AFT Pass/Fail. A test older than about 8 months is flagged overdue.",
    kpis: function (rows) {
      var all = CH.filtered(), fail = all.filter(function (p) { return p.aft === "Failed"; }).length;
      var od = all.filter(function (p) { return p.aftOverdue; }).length;
      return '<div class="kpis">' +
        CH.kpi(fail ? "alert" : "ok", "Failed (most recent)", CH.num(fail), "Of " + CH.num(all.length) + " on the filter") +
        CH.kpi(od ? "warn" : "ok", "Test overdue / missing", CH.num(od), "Older than 8 months") +
        "</div>";
    },
    rowClass: function (p) { return p.aft === "Failed" ? "fail" : p.aftOverdue ? "due" : ""; },
    cols: [
      RANK, NAME, MOS, BN,
      { k: "aft", lbl: "Result", cell: function (p) { return CH.aftPill(p.aft); } },
      { k: "pftDate", lbl: "Test date", cell: function (p) { return CH.dateText(p.pftDate); } },
      { k: "daysAft", lbl: "Age", num: true, cell: function (p) { return p.daysAft == null ? "—" : CH.esc(CH.daysText(-p.daysAft).replace(/^in /, "")); } },
      { k: "pftCat", lbl: "Category" },
      { k: "pftDesc", lbl: "Description", wrap: true }
    ]
  });

  CH.mods.tig = { ui: {} };
  CH.mods.tig.render = standardRender("tig", "i-tig", "Time in grade", {
    tone: "tig",
    sort: "yearsTig", dir: "desc",
    note: "Date of Rank is Home Assignment Grade Entry Date. Four years at the same rank is flagged; six years is flagged more strongly.",
    kpis: function (rows) {
      var long = rows.filter(function (p) { return p.longTig; }).length;
      var very = rows.filter(function (p) { return p.veryLongTig; }).length;
      return '<div class="kpis">' +
        CH.kpi(long ? "warn" : "ok", "4 years or more", CH.num(long), "At current rank") +
        CH.kpi(very ? "alert" : "ok", "6 years or more", CH.num(very), "At current rank") +
        "</div>";
    },
    rowClass: function (p) { return p.veryLongTig ? "overdue" : p.longTig ? "longtig" : ""; },
    cols: [
      RANK, NAME, MOS, BN, UIC, DOR,
      { k: "yearsTig", lbl: "Time in grade", num: true, cell: function (p) { return CH.esc(CH.yearsText(p.yearsTig)); } },
      { k: "diems", lbl: "DIEMS", cell: function (p) { return CH.dateText(p.diems); } },
      { k: "yearsSvc", lbl: "Service", num: true, cell: function (p) { return CH.esc(CH.yearsText(p.yearsSvc)); } }
    ]
  });

  CH.mods.schools = { ui: {} };
  CH.mods.schools.render = standardRender("schools", "i-sch", "Military education", {
    tone: "sch",
    sort: "mel",
    note: "Highest MEL Completed, plus the most recent military education course and its status from the personnel report.",
    cols: [
      RANK, NAME, MOS, BN,
      { k: "mel", lbl: "Highest MEL completed", wrap: true },
      { k: "edRecent", lbl: "Most recent course", wrap: true },
      { k: "edStat", lbl: "Status" }
    ]
  });

  CH.mods.evals = { ui: {} };
  CH.mods.evals.render = standardRender("evals", "i-eval", "Evaluations", {
    tone: "eval",
    sort: "daysEval", dir: "desc",
    filter: function (p) {
      var v = CH.state.evalView;
      if (v === "due") return p.evalDue;
      if (v === "overdue") return p.evalOverdue;
      return true;
    },
    toolbar: function () {
      return '<div class="segwrap"><span class="seglbl">Show</span>' + CH.seg("evalView", [["all", "All"], ["due", "12+ months / missing"], ["overdue", "15+ months / missing"]], CH.state.evalView) + "</div>";
    },
    note: "Last Evaluation Date (OER or NCOER). Flagged after 12 months; more strongly after 15 months, or if the date is missing.",
    kpis: function (rows) {
      var all = CH.filtered(), due = all.filter(function (p) { return p.evalDue; }).length, over = all.filter(function (p) { return p.evalOverdue; }).length;
      return '<div class="kpis">' +
        CH.kpi(due ? "warn" : "ok", "12 months or missing", CH.num(due), "") +
        CH.kpi(over ? "alert" : "ok", "15 months or missing", CH.num(over), "") +
        "</div>";
    },
    rowClass: function (p) { return p.evalOverdue ? "overdue" : p.evalDue ? "due" : ""; },
    cols: [
      RANK, NAME, MOS, BN,
      { k: "eval", lbl: "Last evaluation", cell: function (p) { return CH.dateText(p.eval); } },
      { k: "daysEval", lbl: "Age", num: true, cell: function (p) { return p.daysEval == null ? "No date" : CH.esc(CH.yearsText(p.daysEval / 365.25)); } }
    ]
  });

  CH.mods.weapons = { ui: {} };
  CH.mods.weapons.render = standardRender("weapons", "i-wpn", "Weapon qualification", {
    tone: "wpn",
    sort: "wpnRank", dir: "desc",
    filter: function (p) {
      var v = CH.state.wpnView;
      if (v === "expert" || v === "sharpshooter" || v === "marksman") return p.wpn && p.wpn.toLowerCase() === v;
      if (v === "overdue") return p.wpnOverdue;
      return true;
    },
    toolbar: function () {
      return '<div class="segwrap"><span class="seglbl">Show</span>' + CH.seg("wpnView", [["all", "All"], ["expert", "Expert"], ["sharpshooter", "Sharpshooter"], ["marksman", "Marksman"], ["overdue", "Qual overdue"]], CH.state.wpnView) + "</div>";
    },
    note: "Uses the most recent Weapon Qualification Date. Expert is highest, then Sharpshooter, then Marksman — all are passing. Qualification older than 12 months is flagged.",
    kpis: function (rows) {
      var all = CH.filtered();
      function n(q) { return all.filter(function (p) { return p.wpn === q; }).length; }
      var od = all.filter(function (p) { return p.wpnOverdue; }).length;
      return '<div class="kpis">' +
        CH.kpi("ok", "Expert", CH.num(n("Expert")), "") +
        CH.kpi("info", "Sharpshooter", CH.num(n("Sharpshooter")), "") +
        CH.kpi("info", "Marksman", CH.num(n("Marksman")), "") +
        CH.kpi(od ? "warn" : "ok", "Qual overdue / missing", CH.num(od), "Older than 12 months") +
        "</div>";
    },
    rowClass: function (p) { return p.wpnOverdue ? "due" : ""; },
    cols: [
      RANK, NAME, MOS, BN,
      { k: "wpn", lbl: "Qualification", val: function (p) { return p.wpnRank || 0; }, cell: function (p) { return CH.wpnPill(p.wpn); } },
      { k: "wpnDate", lbl: "Qual date", cell: function (p) { return CH.dateText(p.wpnDate); } },
      { k: "daysWpn", lbl: "Age", num: true, cell: function (p) { return p.daysWpn == null ? "—" : CH.esc(CH.yearsText(p.daysWpn / 365.25)); } }
    ]
  });
})(window);
