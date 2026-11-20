/* State, formatting, routing, charts, upload, save with data, shared widgets. */
(function (w) {
  var CH = w.CH, $ = function (id) { return document.getElementById(id); };
  CH.$ = $;
  CH.mods = {};
  CH.charts = {};
  CH.state = { bn: "All", uic: "All", rank: "All", q: "", window: "12", aftView: "all", wpnView: "all", evalView: "all", aftFilter: "All", etsWin: "All", wpnFilter: "All", selected: "", open: "", sort: {}, pageSort: {} };
  CH.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  CH.dateText = function (d) { d = CH.parseDate(d); return d ? ("0" + d.getDate()).slice(-2) + " " + CH.MONS[d.getMonth()] + " " + d.getFullYear() : "—"; };
  CH.num = function (v) { return Math.round(v).toLocaleString("en-US"); };
  CH.yearsText = function (y) { return y == null || !isFinite(y) ? "—" : (y < 1 ? (y * 12).toFixed(0) + " mo" : y.toFixed(1) + " yr"); };
  CH.daysText = function (d) {
    if (d == null || !isFinite(d)) return "—";
    if (d < 0) { var a = Math.abs(d); return a === 0 ? "today" : (a < 31 ? a + "d ago" : (a < 365 ? Math.round(a / 30.4) + " mo ago" : (a / 365.25).toFixed(1) + " yr ago")); }
    if (d === 0) return "today";
    if (d < 31) return "in " + d + "d";
    if (d < 365) return "in " + Math.round(d / 30.4) + " mo";
    return "in " + (d / 365.25).toFixed(1) + " yr";
  };
  CH.dueClass = function (days, win) {
    if (days == null) return "na";
    if (days <= 0) return "over";
    if (days <= 183) return "m6";
    if (days <= (win || 365)) return "m12";
    return "ok";
  };
  CH.testTag = function () { return CH.data.source === "test" ? '<span class="demotag">Test data</span>' : ""; };
  CH.scope = function (extra) {
    var n = CH.filtered().length, t = (CH.data.roster || []).length;
    var bits = [CH.num(n) + (n === t ? "" : " of " + CH.num(t)) + " Soldiers"];
    if (CH.state.bn !== "All") bits.push(CH.state.bn);
    if (CH.state.uic !== "All") bits.push("UIC " + CH.state.uic);
    if (CH.state.rank !== "All") bits.push(CH.state.rank);
    if (CH.state.q) bits.push("search “" + CH.state.q + "”");
    if (extra) bits.push(extra);
    return bits.join(" · ");
  };
  CH.head = function (id, icon, title, scope) {
    return '<div class="pagehead"><div><h1><span class="pic t-' + id + '"><svg class="ic"><use href="#' + icon + '"/></svg></span>' + title + CH.testTag() + '</h1><div class="scope">' + (scope || CH.scope()) + "</div></div></div>";
  };
  CH.kpi = function (cls, lbl, val, sub, attrs) {
    return '<div class="kpi ' + (cls || "") + '"' + (attrs || "") + '><div class="lbl">' + lbl + '</div><div class="val">' + val + '</div><div class="sub">' + (sub || "&nbsp;") + "</div></div>";
  };
  CH.seg = function (name, opts, cur) {
    return '<div class="seg" data-seg="' + name + '">' + opts.map(function (o) { return '<button type="button" data-v="' + CH.esc(o[0]) + '"' + (String(o[0]) === String(cur) ? ' class="on"' : "") + ">" + o[1] + "</button>"; }).join("") + "</div>";
  };
  CH.aftPill = function (v) {
    if (!v) return '<span class="apill na">—</span>';
    return '<span class="apill ' + (v === "Failed" ? "fail" : v === "Passed" ? "pass" : "na") + '">' + CH.esc(v) + "</span>";
  };
  CH.wpnPill = function (v) {
    if (!v) return '<span class="qpill na">—</span>';
    var k = v === "Expert" ? "expert" : v === "Sharpshooter" ? "sharp" : v === "Marksman" ? "marks" : "na";
    return '<span class="qpill ' + k + '">' + CH.esc(v) + "</span>";
  };
  CH.duePill = function (days, win) {
    if (days == null) return '<span class="duepill na">No date</span>';
    var k = CH.dueClass(days, win);
    var label = days <= 0 ? (days === 0 ? "Due today" : "Past due") : CH.daysText(days);
    return '<span class="duepill ' + k + '">' + label + "</span>";
  };

  CH.options = function () {
    var r = CH.data.roster || [], bns = {}, uics = {}, ranks = {};
    r.forEach(function (p) { if (p.bn) bns[p.bn] = 1; if (p.uic) uics[p.uic] = 1; if (p.rank) ranks[p.rank] = 1; });
    var RANK_ORDER = ["COL", "LTC", "MAJ", "CPT", "1LT", "2LT", "CW5", "CW4", "CW3", "CW2", "WO1", "CSM", "SGM", "1SG", "MSG", "SFC", "SSG", "SGT", "CPL", "SPC", "PFC", "PV2", "PV1"];
    function keys(o) { return Object.keys(o).sort(); }
    return {
      bns: keys(bns),
      uics: keys(uics),
      ranks: keys(ranks).sort(function (a, b) { var ia = RANK_ORDER.indexOf(a), ib = RANK_ORDER.indexOf(b); if (ia < 0 && ib < 0) return a.localeCompare(b); if (ia < 0) return 1; if (ib < 0) return -1; return ia - ib; })
    };
  };
  CH.sel = function (key, label, all, list) {
    var cur = CH.state[key];
    return "<label>" + label + '<select data-st="' + key + '"><option value="All"' + (cur === "All" ? " selected" : "") + ">" + all + "</option>" +
      list.map(function (v) { return '<option value="' + CH.esc(v) + '"' + (cur === v ? " selected" : "") + ">" + CH.esc(v) + "</option>"; }).join("") + "</select></label>";
  };
  CH.filterBar = function (extra) {
    var o = CH.options();
    return '<div class="filters">' +
      CH.sel("bn", "Battalion", "All battalions", o.bns) +
      CH.sel("uic", "UIC", "All UICs", o.uics) +
      CH.sel("rank", "Rank", "All ranks", o.ranks) +
      '<label class="grow">Search<input type="search" id="filterSearch" data-st="q" value="' + CH.esc(CH.state.q) + '" placeholder="Name, MOS, email, phone, religion…" autocomplete="off"></label>' +
      (extra || "") + "</div>";
  };
  CH.optsel = function (key, label, opts) {
    var cur = CH.state[key];
    return "<label>" + label + '<select data-st="' + key + '">' + opts.map(function (o) {
      return '<option value="' + CH.esc(o[0]) + '"' + (String(cur) === String(o[0]) ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("") + "</select></label>";
  };
  CH.homeFilterBar = function () {
    return CH.filterBar(
      CH.optsel("aftFilter", "AFT", [["All", "All AFT results"], ["Passed", "Passed"], ["Failed", "Failed"], ["Overdue", "Test overdue"]]) +
      CH.optsel("etsWin", "ETS / MRD", [["All", "Any expiration"], ["6", "Within 6 months"], ["12", "Within 12 months"], ["over", "Already due"]]) +
      CH.optsel("wpnFilter", "Weapon", [["All", "All qualifications"], ["Expert", "Expert"], ["Sharpshooter", "Sharpshooter"], ["Marksman", "Marksman"], ["Overdue", "Qual overdue"]]) +
      '<button type="button" class="btn sm btn-clear" id="btnClearFilters" data-clear="1">Clear filters</button>'
    );
  };
  function hay(p) {
    return [p.name, p.rank, p.mos, p.job, p.uic, p.bn, p.religion, p.rel, p.phone, p.email, p.address, p.asi, p.smos, p.mel, p.edRecent].join(" ").toUpperCase();
  }
  CH.filtered = function (extra) {
    var st = CH.state, q = CH.nameKey(st.q);
    return (CH.data.roster || []).filter(function (p) {
      if (st.bn !== "All" && p.bn !== st.bn) return false;
      if (st.uic !== "All" && p.uic !== st.uic) return false;
      if (st.rank !== "All" && p.rank !== st.rank) return false;
      if (q && hay(p).indexOf(q) < 0) return false;
      return !extra || extra(p);
    });
  };
  CH.homeRows = function () {
    var st = CH.state;
    return CH.filtered(function (p) {
      if (st.aftFilter === "Failed" && p.aft !== "Failed") return false;
      if (st.aftFilter === "Passed" && p.aft !== "Passed") return false;
      if (st.aftFilter === "Overdue" && !p.aftOverdue) return false;
      if (st.etsWin && st.etsWin !== "All" && !CH.inWindow(p.daysExp, st.etsWin)) return false;
      if (st.wpnFilter === "Overdue" && !p.wpnOverdue) return false;
      if (st.wpnFilter === "Expert" || st.wpnFilter === "Sharpshooter" || st.wpnFilter === "Marksman") {
        if (p.wpn !== st.wpnFilter) return false;
      }
      return true;
    });
  };
  CH.clearFilters = function () {
    CH.state.bn = "All"; CH.state.uic = "All"; CH.state.rank = "All"; CH.state.q = "";
    CH.state.aftFilter = "All"; CH.state.etsWin = "All"; CH.state.wpnFilter = "All";
    CH.state.selected = "";
    CH.refresh();
  };
  CH.inWindow = function (days, win) {
    if (days == null) return false;
    if (win === "all") return true;
    if (win === "over") return days <= 0;
    var n = +win || 12;
    return days <= Math.round(n * 30.4375);
  };

  CH.sortRows = function (rows, key, dir, getter) {
    var d = dir === "asc" ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      var va = getter ? getter(a) : a[key], vb = getter ? getter(b) : b[key];
      if (va == null || va === "") return 1;
      if (vb == null || vb === "") return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * d;
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" }) * d;
    });
  };
  CH.table = function (page, cols, rows, opts) {
    opts = opts || {};
    var st = CH.state.pageSort[page] || (CH.state.pageSort[page] = { k: opts.sort || cols[0].k, dir: opts.dir || "asc" });
    var getter = function (r) {
      var c = cols.filter(function (x) { return x.k === st.k; })[0];
      return c && c.val ? c.val(r) : r[st.k];
    };
    var sorted = CH.sortRows(rows, st.k, st.dir, getter);
    var open = CH.state.open;
    var thead = cols.map(function (c) {
      var cls = [];
      if (c.num) cls.push("num");
      if (c.cls) cls.push(c.cls);
      if (st.k === c.k) cls.push("sorted" + (st.dir === "asc" ? " asc" : ""));
      return "<th" + (cls.length ? ' class="' + cls.join(" ") + '"' : "") + (c.nosort ? "" : ' data-k="' + CH.esc(c.k) + '"') + ">" + c.lbl + "</th>";
    }).join("");
    var body = sorted.map(function (r) {
      var cls = (opts.rowClass && opts.rowClass(r)) || "";
      if (opts.expand && open === r.name) cls += " sel";
      var tds = cols.map(function (c) {
        var v = c.cell ? c.cell(r) : CH.esc(r[c.k] == null || r[c.k] === "" ? "—" : r[c.k]);
        var tdcls = [];
        if (c.num) tdcls.push("num");
        if (c.wrap) tdcls.push("wrapc");
        if (c.cls) tdcls.push(c.cls);
        if (c.k === "name") tdcls.push("namec");
        return "<td" + (tdcls.length ? ' class="' + tdcls.join(" ") + '"' : "") + ">" + v + "</td>";
      }).join("");
      var main = '<tr class="' + cls + (opts.expand ? " clickrow" : "") + '" data-name="' + CH.esc(r.name) + '">' + tds + "</tr>";
      if (opts.expand && open === r.name) main += '<tr class="sdet" data-stop="1"><td colspan="' + cols.length + '">' + CH.personProfile(r) + "</td></tr>";
      return main;
    }).join("");
    if (!rows.length) body = '<tr><td colspan="' + cols.length + '" class="muted">No Soldiers match these filters.</td></tr>';
    var hint = opts.hint ? '<p class="pgnote rohint">' + opts.hint + "</p>" : "";
    var wrapCls = "tablewrap scrolly" + (opts.noXScroll ? " nox" : "");
    var tblCls = "grid" + (opts.tblClass ? " " + opts.tblClass : "");
    return hint + '<div class="tablehead"><h2>' + (opts.title || "Roster") + ' <span class="muted small">' + CH.num(rows.length) + "</span></h2>" +
      (opts.tools || "") + "</div><div class=\"" + wrapCls + "\"><table class=\"" + tblCls + "\" data-page=\"" + page + "\"><thead><tr>" + thead + "</tr></thead><tbody>" + body + "</tbody></table></div>";
  };
  CH.statusFlags = function (p) {
    var flags = [];
    if (p.veryLongTig) flags.push(["over", "Time in grade " + CH.yearsText(p.yearsTig)]);
    else if (p.longTig) flags.push(["m6", "Time in grade " + CH.yearsText(p.yearsTig)]);
    if (p.evalOverdue) flags.push(["over", p.eval ? "Eval overdue (" + CH.yearsText(p.daysEval / 365.25) + ")" : "Eval missing"]);
    else if (p.evalDue) flags.push(["m12", "Eval due (" + CH.yearsText(p.daysEval / 365.25) + ")"]);
    if (p.aft === "Failed") flags.push(["over", "AFT failed"]);
    if (p.aftOverdue) flags.push(["m6", p.pftDate ? "AFT test overdue" : "No AFT date"]);
    if (p.wpnOverdue) flags.push(["m6", p.wpnDate ? "Weapon qual overdue" : "No weapon qualification"]);
    if (p.daysExp != null && p.daysExp <= 183) flags.push([p.daysExp <= 0 ? "over" : "m6", p.expirationType + " " + CH.daysText(p.daysExp)]);
    else if (p.daysExp != null && p.daysExp <= 365) flags.push(["m12", p.expirationType + " " + CH.daysText(p.daysExp)]);
    if (p.daysRet != null && p.daysRet <= 0) flags.push(["over", "Retirement eligible now"]);
    else if (p.daysRet != null && p.daysRet <= 183) flags.push(["m6", "Retirement " + CH.daysText(p.daysRet)]);
    else if (p.daysRet != null && p.daysRet <= 365) flags.push(["m12", "Retirement " + CH.daysText(p.daysRet)]);
    if (!flags.length) flags.push(["ok", "No flags"]);
    return flags;
  };
  CH.personProfile = function (p, opts) {
    opts = opts || {};
    function cell(l, v) { return "<div><span>" + l + "</span><b>" + (v || "—") + "</b></div>"; }
    var flags = CH.statusFlags(p).map(function (f) { return '<span class="duepill ' + f[0] + '">' + CH.esc(f[1]) + "</span>"; }).join("");
    var close = opts.closable ? '<button type="button" class="btn sm profile-close" data-unselect="1">Close</button>' : "";
    return '<div class="profile" data-profile="' + CH.esc(p.name) + '"><div class="profile-head"><div><div class="eyebrow">Soldier record</div><h2>' +
      CH.esc(p.rank + "  " + p.name) + "</h2><div class=\"scope\">" + CH.esc([p.mos || p.job, p.bn, p.uic].filter(Boolean).join(" · ")) +
      '</div><div class="flagrow">' + flags + "</div></div>" + close + "</div><div class=\"detgrid\">" +
      cell("Rank", CH.esc(p.rank)) +
      cell("Full name", CH.esc(p.name)) +
      cell("Religion", CH.esc(p.religion) + (p.rel ? ' <span class="relcode">' + CH.esc(CH.relKey(p.rel)) + (p.religionKnown ? "" : " (unmapped)") + "</span>" : "")) +
      cell("Job code", CH.esc(p.mos || "—") + (p.job && p.job !== p.mos ? ' <span class="relcode">report: ' + CH.esc(p.job) + "</span>" : "")) +
      cell("Date of Rank", CH.dateText(p.dor) + (p.yearsTig != null ? " · " + CH.yearsText(p.yearsTig) + " in grade" : "")) +
      cell(p.expirationType || "Expiration", CH.dateText(p.expiration) + (p.daysExp != null ? " · " + CH.daysText(p.daysExp) : "")) +
      cell("Retirement pay eligibility", CH.dateText(p.ret) + (p.daysRet != null ? " · " + CH.daysText(p.daysRet) : "")) +
      cell("Highest MEL completed", CH.esc(p.mel)) +
      cell("Most recent course", CH.esc(p.edRecent)) +
      cell("Military education status", CH.esc(p.edStat)) +
      cell("Last evaluation (OER / NCOER)", CH.dateText(p.eval) + (p.daysEval != null ? " · " + CH.yearsText(p.daysEval / 365.25) + " ago" : "")) +
      cell("AFT pass / fail", (p.aft ? CH.aftPill(p.aft) : "—")) +
      cell("Physical fitness test date", CH.dateText(p.pftDate) + (p.daysAft != null ? " · " + CH.yearsText(p.daysAft / 365.25) + " ago" : "")) +
      cell("PFT category / description", CH.esc([p.pftCat, p.pftDesc].filter(Boolean).join(" · "))) +
      cell("Weapon qualification", (p.wpn ? CH.wpnPill(p.wpn) : "—")) +
      cell("Weapon qualification date", CH.dateText(p.wpnDate) + (p.daysWpn != null ? " · " + CH.yearsText(p.daysWpn / 365.25) + " ago" : "")) +
      cell("UIC", CH.esc(p.uic)) +
      cell("BN Name", CH.esc(p.bn)) +
      cell("ASI", CH.esc(p.asi || "—")) +
      cell("SMOS", CH.esc(p.smos || "—")) +
      cell("Date initial entry (DIEMS)", CH.dateText(p.diems) + (p.yearsSvc != null ? " · " + CH.yearsText(p.yearsSvc) + " of service" : "")) +
      cell("Preferred phone", CH.esc(p.phone)) +
      cell("Home email", p.email ? '<a href="mailto:' + CH.esc(p.email) + '">' + CH.esc(p.email) + "</a>" : "—") +
      cell("Home address", CH.esc(p.address || "—")) +
      cell("Rows in the report", CH.num(p.srcRows) + " collapsed to this Soldier") +
      "</div></div>";
  };
  CH.personDetail = function (p) { return CH.personProfile(p); };
  CH.nameCell = function (p) {
    var on = CH.state.open === p.name;
    return '<span class="caret">' + (on ? "▾" : "▸") + '</span><button type="button" class="namebtn" data-open="' + CH.esc(p.name) + '">' + CH.esc(p.name) + "</button>";
  };
  CH.viewCell = function (p) {
    var on = CH.state.open === p.name;
    return '<button type="button" class="btn sm viewbtn" data-open="' + CH.esc(p.name) + '">' + (on ? "Hide" : "View") + "</button>";
  };

  CH.bindCommon = function (root, mod) {
    root.querySelectorAll("[data-seg]").forEach(function (sg) {
      sg.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        var name = sg.getAttribute("data-seg");
        CH.state[name] = b.getAttribute("data-v");
        CH.refresh();
      });
    });
    root.querySelectorAll("select[data-st],input[data-st]").forEach(function (s) {
      s.addEventListener(s.tagName === "INPUT" ? "input" : "change", function () {
        CH.state[s.getAttribute("data-st")] = s.value;
        if (s.tagName === "INPUT") {
          clearTimeout(s._t);
          s._t = setTimeout(function () { CH.refresh(); }, 120);
        } else CH.refresh();
      });
    });
    root.querySelectorAll("table.grid").forEach(function (tbl) {
      var page = tbl.getAttribute("data-page");
      tbl.querySelectorAll("th[data-k]").forEach(function (th) {
        th.addEventListener("click", function () {
          var st = CH.state.pageSort[page] || (CH.state.pageSort[page] = { k: th.getAttribute("data-k"), dir: "asc" });
          if (st.k === th.getAttribute("data-k")) st.dir = st.dir === "asc" ? "desc" : "asc";
          else { st.k = th.getAttribute("data-k"); st.dir = "asc"; }
          CH.refresh();
        });
      });
    });
    root.querySelectorAll("[data-open]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var n = b.getAttribute("data-open");
        CH.state.open = CH.state.open === n ? "" : n;
        CH.refresh();
      });
    });
    root.querySelectorAll("tr.clickrow").forEach(function (tr) {
      tr.addEventListener("click", function () {
        var n = tr.getAttribute("data-name");
        CH.state.open = CH.state.open === n ? "" : n;
        CH.refresh();
      });
    });
    root.querySelectorAll("[data-clear]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); CH.clearFilters(); });
    });
    root.querySelectorAll("[data-unselect]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); CH.state.selected = ""; CH.refresh(); });
    });
  };

  CH.chart = function (id, cfg) {
    if (CH.charts[id]) { CH.charts[id].destroy(); delete CH.charts[id]; }
    var el = $(id); if (!el || !w.Chart) return null;
    CH.charts[id] = new Chart(el, cfg);
    return CH.charts[id];
  };
  function chartsInit() {
    if (!w.Chart) return;
    Chart.defaults.color = "#475569"; Chart.defaults.borderColor = "#e2e8f0";
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily; Chart.defaults.font.size = 11.5;
    Chart.defaults.animation = false; Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.labels.boxWidth = 10; Chart.defaults.plugins.legend.labels.boxHeight = 10; Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.position = "bottom";
  }

  function page() { var p = location.hash.replace(/^#\/?/, "").split("/")[0]; return CH.PAGES.indexOf(p) >= 0 ? p : "home"; }
  CH.page = page;
  CH.go = function (p) { if ("#/" + p === location.hash) show(); else location.hash = "#/" + p; };
  function show() {
    var p = page();
    CH.PAGES.forEach(function (x) { $("page-" + x).hidden = x !== p; });
    document.querySelectorAll("#tabs button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-go") === p); });
    render(p);
  }
  function render(p, force) {
    var mod = CH.mods[p];
    if (mod && mod.render) mod.render();
  }
  CH.refresh = function () {
    var ae = document.activeElement, restore = null;
    if (ae && ae.getAttribute && ae.getAttribute("data-st")) {
      restore = { id: ae.id, st: ae.getAttribute("data-st"), start: ae.selectionStart, end: ae.selectionEnd, val: ae.value };
    }
    render(page(), true);
    headerState();
    if (restore) {
      var el = (restore.id && document.getElementById(restore.id)) || (restore.st && document.querySelector("[data-st='" + restore.st + "']"));
      if (el && el.focus) {
        el.focus();
        if (restore.start != null && el.setSelectionRange) {
          try { el.setSelectionRange(restore.start, restore.end); } catch (e) {}
        }
      }
    }
  };


  function headerState() {
    $("asOf").textContent = CH.data.asOf ? "Data as of " + CH.dateText(CH.data.asOf) : "";
    $("btnSave").disabled = false;
    var warn = CH.data.source === "test" || !(CH.data.sets && CH.data.sets.personnel);
    $("btnInfo").classList.toggle("dot", false);
    var btn = $("btnInfo");
    var dot = btn.querySelector(".dot");
    if (CH.data.source === "test") {
      if (!dot) { dot = document.createElement("span"); dot.className = "dot"; btn.appendChild(dot); }
    } else if (dot) dot.remove();
  }

  function ingest(fileName, sheets) {
    var got = CH.parseWorkbook(fileName, sheets);
    got.forEach(function (e) { CH.data.sets[e.kind] = { name: fileName, sheet: e.report.sheet, rows: e.rows, report: e.report, at: new Date().toISOString() }; });
    return got;
  }
  CH.ingest = ingest;

  function ensureXlsx() {
    if (w.XLSX) return true;
    var lz = $("xlsxLazy");
    if (lz) { var sc = document.createElement("script"); sc.textContent = lz.textContent; document.head.appendChild(sc); sc.remove(); }
    return !!w.XLSX;
  }
  function isoToday() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }

  function loadFiles(list) {
    if (!ensureXlsx()) { CH.toast("Excel reader not available.", true); return; }
    var files = Array.prototype.slice.call(list || []), done = [], miss = [], fatal = [];
    (function next() {
      var f = files.shift(); if (!f) return finish();
      var rd = new FileReader();
      rd.onload = function (e) {
        try {
          var wb = /\.csv$/i.test(f.name) ? XLSX.read(e.target.result, { type: "string", cellDates: true }) : XLSX.read(new Uint8Array(e.target.result), { type: "array", cellDates: true });
          var sheets = wb.SheetNames.map(function (sn) { return { name: sn, aoa: XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: null, blankrows: false }) }; });
          if (CH.data.source === "test") { CH.data = CH.emptyData(); CH.toast("Test data cleared; loading your files."); }
          var got = ingest(f.name, sheets);
          if (!got.length) miss.push(f.name);
          got.forEach(function (g) { if (g.report.fatal) fatal.push(f.name + ": " + g.report.fatal); else done.push(f.name + " → " + CH.KIND_LABEL[g.kind]); });
        } catch (err) { miss.push(f.name + " (" + err.message + ")"); }
        next();
      };
      if (/\.csv$/i.test(f.name)) rd.readAsText(f); else rd.readAsArrayBuffer(f);
    })();
    function finish() {
      if (done.length) { CH.data.source = "file"; CH.data.asOf = isoToday(); }
      CH.derive();
      CH.toast((done.length ? "Loaded " + done.join(", ") + ". " : "") + (fatal.length ? "Problems: " + fatal.join("; ") + ". " : "") + (miss.length ? "Not recognised: " + miss.join(", ") : ""), !!(miss.length || fatal.length));
      renderDrawer(); CH.refresh();
    }
  }
  CH.loadFiles = loadFiles;

  function loadTest() {
    CH.data = { v: 1, source: "test", asOf: CH.TEST_ASOF, sets: {} };
    CH.makeTestFiles().forEach(function (f) { ingest(f.name, f.sheets); });
    CH.derive();
  }
  CH.loadTest = loadTest;

  var SAVED_ID = "chSaved";
  function readSaved() { var el = $(SAVED_ID); if (!el) return null; try { var o = JSON.parse(el.textContent); return o && o.v === 1 && o.data && o.data.sets ? o : null; } catch (e) { return null; } }
  function safeJson(o) { return JSON.stringify(o).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"); }
  function saveWithData() {
    var cap = w.__dashSrc, scripts = [], seen = false;
    document.querySelectorAll("script").forEach(function (sc) { if (sc.id === SAVED_ID) return; if (seen) scripts.push(sc.outerHTML); else if (sc.textContent.indexOf("__dashSrc") >= 0) seen = true; });
    if (!cap) { alert("Could not build the saved file."); return; }
    var html = "<!doctype html>\n" + cap.replace(/<\/body>\s*<\/html>\s*$/i, "") + "\n" + scripts.join("\n") + "\n";
    html += '<script id="' + SAVED_ID + '" type="application/json">' + safeJson({ v: 1, savedAt: new Date().toISOString(), data: { v: 1, source: CH.data.source, asOf: CH.data.asOf, sets: CH.data.sets } }) + "</scr" + "ipt>\n</body>\n</html>\n";
    var d = new Date(), name = "Chaplain-Corps-Dashboard-" + ("0" + d.getDate()).slice(-2) + CH.MONS[d.getMonth()] + String(d.getFullYear()).slice(2) + ".html";
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  function downloadSample(kind) {
    if (!ensureXlsx()) { CH.toast("Excel writer not available.", true); return; }
    var headers = kind === "personnel" ? CH.TEST_PERSONNEL_HEADERS : CH.TEST_ADDRESS_HEADERS;
    var rows = kind === "personnel" ? CH.TEST_PERSONNEL_ROWS : CH.TEST_ADDRESS_ROWS;
    var banner = kind === "personnel"
      ? "FICTIONAL TEST DATA — not real personnel. Prairie Division Chaplain Corps roster (duplicate rows per Soldier are intentional)."
      : "FICTIONAL TEST DATA — not real personnel. Match to the personnel file by LAST NAME + FIRST NAME against Full Name.";
    var aoa = [ [banner], headers ].concat(rows.map(function (r) { return r.slice(); }));
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, kind === "personnel" ? "Personnel" : "Addresses");
    XLSX.writeFile(wb, kind === "personnel" ? "chaplain-personnel-test.xlsx" : "chaplain-address-test.xlsx");
  }
  CH.downloadSample = downloadSample;

  function openDrawer(on) { $("drawer").hidden = !on; $("scrim").hidden = !on; $("btnInfo").setAttribute("aria-expanded", on ? "true" : "false"); if (on) renderDrawer(); }
  function renderDrawer() {
    var d = CH.data, S = d.sets, esc = CH.esc, diag = d.diag || {};
    $("dState").innerHTML = d.source === "test"
      ? "Showing <strong>fictional test data</strong> (Prairie Division, as of " + CH.dateText(d.asOf) + "), read through the same loaders as real files. Your first upload clears it; after that each upload replaces only the datasets it brings."
      : "Showing data loaded from your files. Each upload replaces only the datasets it brings" + (d.asOf ? "; clocks and windows are counted to " + CH.dateText(d.asOf) : "") + ". A saved file contains this data — keep it as protected as the source reports.";
    $("tFiles").querySelector("tbody").innerHTML = CH.KIND_ORDER.map(function (k) {
      var s = S[k];
      if (!s) return "<tr><td><strong>" + CH.KIND_LABEL[k] + '</strong></td><td class="muted" colspan="3">Not loaded</td></tr>';
      var rp = s.report || {}, notes = [];
      if (rp.fatal) notes.push('<span class="err">' + esc(rp.fatal) + "</span>");
      Object.keys(rp.skipped || {}).forEach(function (why) { if (rp.skipped[why]) notes.push('<span class="warn">' + CH.num(rp.skipped[why]) + " " + esc(why) + "</span>"); });
      (rp.notes || []).forEach(function (n) { notes.push(esc(n)); });
      if (k === "personnel" && diag.personnel) notes.unshift(CH.num(diag.personnel.raw) + " report rows → <strong>" + CH.num(diag.personnel.unique) + " Soldiers</strong> after de-duplication");
      return "<tr><td><strong>" + CH.KIND_LABEL[k] + "</strong></td><td>" + esc(s.name) + (s.sheet && s.sheet !== "Sheet1" ? ' <span class="muted">(' + esc(s.sheet) + " tab)</span>" : "") + '</td><td class="num">' + CH.num(s.rows.length) + '</td><td class="small">' + notes.join("<br>") + "</td></tr>";
    }).join("");
    var up = (diag.unmatchedPeople || []), ua = (diag.unmatchedAddr || []);
    var join = "";
    if (!S.personnel) join = "<p>Load the personnel report to build the roster.</p>";
    else if (!S.address) join = '<p class="warn">Address report not loaded — battalion, phone, email and home address will be blank.</p>';
    else {
      join = "<p>" + CH.num((diag.address || {}).matched || 0) + " of " + CH.num((d.roster || []).length) + " Soldiers matched an address row by last name + first name.</p>";
      if (up.length) join += "<p><strong>On the roster with no address match:</strong> " + up.map(function (p) { return "<code>" + esc(p.name) + "</code>"; }).join(" ") + "</p>";
      if (ua.length) join += "<p><strong>Address rows with no roster match:</strong> " + ua.map(function (a) { return "<code>" + esc(a.last + " " + a.first) + "</code>"; }).join(" ") + "</p>";
      if (!up.length && !ua.length) join += '<p class="ok">Every address row matched a Soldier, and every Soldier has an address.</p>';
    }
    $("dJoin").innerHTML = join;
    var ur = diag.unknownRel || {}, uk = Object.keys(ur);
    $("dRel").innerHTML = "<p>" + esc(CH.RELIGION_SOURCE || "") + "</p>" +
      (uk.length ? '<p class="warn"><strong>Unmapped codes</strong> (shown as entered): ' + uk.map(function (c) { return "<code>" + esc(c) + "</code> (" + ur[c] + ")"; }).join(" ") + "</p>" : '<p class="ok">Every loaded religion code is on the standard list.</p>');
    $("dSchema").innerHTML = CH.KIND_ORDER.map(function (k) { return "<p><strong>" + CH.KIND_LABEL[k] + ":</strong> " + esc(CH.DATASET_COLS[k]) + "</p>"; }).join("") +
      '<p class="muted">Files are recognised by their header row, not their name. A title row above the headers is fine. Column names are matched ignoring case, spacing and punctuation.</p>';
    $("dSamples").innerHTML = '<button class="btn sm" type="button" id="dlPers">Download sample personnel.xlsx</button><button class="btn sm" type="button" id="dlAddr">Download sample addresses.xlsx</button><span class="muted small">Fictional data, same columns as a real report.</span>';
    $("dlPers").onclick = function () { downloadSample("personnel"); };
    $("dlAddr").onclick = function () { downloadSample("address"); };
  }
  CH.renderDrawer = renderDrawer;
  var tt;
  CH.toast = function (msg, warn) { var t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, warn ? 7000 : 3500); };

  function init() {
    chartsInit();
    var saved = readSaved();
    if (saved) { CH.data = saved.data; CH.derive(); } else loadTest();
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-go]"); if (t && !e.target.closest("[data-stop]")) { CH.go(t.getAttribute("data-go")); return; }
      if (e.target.closest("[data-upload]")) $("fileInput").click();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") openDrawer(false); });
    $("btnUpload").addEventListener("click", function () { $("fileInput").click(); });
    $("fileInput").addEventListener("change", function (e) { loadFiles(e.target.files); this.value = ""; });
    $("btnInfo").addEventListener("click", function () { openDrawer(true); });
    $("btnClose").addEventListener("click", function () { openDrawer(false); });
    $("scrim").addEventListener("click", function () { openDrawer(false); });
    $("btnSave").addEventListener("click", saveWithData);
    $("btnReset").addEventListener("click", function () { loadTest(); renderDrawer(); CH.refresh(); CH.toast("Test data restored."); });
    var dz = 0;
    document.addEventListener("dragenter", function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") >= 0) { dz++; $("dropOver").hidden = false; } });
    document.addEventListener("dragleave", function () { if (--dz <= 0) { dz = 0; $("dropOver").hidden = true; } });
    document.addEventListener("dragover", function (e) { e.preventDefault(); });
    document.addEventListener("drop", function (e) { e.preventDefault(); dz = 0; $("dropOver").hidden = true; if (e.dataTransfer.files.length) loadFiles(e.dataTransfer.files); });
    w.addEventListener("hashchange", show);
    headerState(); show();
  }
  CH.init = init;
})(window);
