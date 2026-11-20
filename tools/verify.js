#!/usr/bin/env node
/* Headless check of test-data load, de-dupe, joins, and field rules. */
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var src = path.join(__dirname, "..", "src");
var ctx = { console: console, Date: Date, Math: Math, String: String, Number: Number, Object: Object, Array: Array, RegExp: RegExp, JSON: JSON, isFinite: isFinite, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat };
ctx.window = ctx;
ctx.CH = {};
["religion.js", "testdata.js", "data.js", "loaders.js"].forEach(function (f) {
  vm.runInNewContext(fs.readFileSync(path.join(src, f), "utf8"), ctx, { filename: f });
});
var CH = ctx.CH;
CH.data = { v: 1, source: "test", asOf: CH.TEST_ASOF, sets: {} };
CH.makeTestFiles().forEach(function (f) {
  var got = CH.parseWorkbook(f.name, f.sheets);
  if (!got.length) throw new Error("Did not recognise " + f.name);
  got.forEach(function (e) {
    CH.data.sets[e.kind] = { name: f.name, sheet: e.report.sheet, rows: e.rows, report: e.report };
  });
});
CH.derive();
var r = CH.data.roster;
var fail = 0;
function eq(name, a, b) {
  if (a !== b) { fail++; console.error("FAIL", name, "got", JSON.stringify(a), "expected", JSON.stringify(b)); }
  else console.log("ok ", name, "=", JSON.stringify(a));
}
function find(part) {
  var hits = r.filter(function (p) { return p.name === part || p.name.indexOf(part + " ") === 0; });
  if (hits.length !== 1) { fail++; console.error("FAIL find", part, hits.map(function (p) { return p.name; })); return {}; }
  return hits[0];
}
eq("unique soldiers", r.length, 30);
eq("raw personnel rows", CH.data.diag.personnel.raw, CH.TEST_PERSONNEL_ROWS.length);
eq("raw > unique (dupes collapsed)", CH.data.diag.personnel.raw > 30, true);
var kline = find("KLINE ROBERT");
eq("KLINE AFT (latest failed, older passed ignored)", kline.aft, "Failed");
eq("KLINE AFT date", kline.pftDate, "2026-10-12");
eq("KLINE MOS stripped", kline.mos, "56A");
eq("KLINE officer", kline.component, "Officer");
eq("KLINE expiration type", kline.expirationType, "MRD/RCP");
var ram = find("RAMIREZ JOSE");
eq("RAMIREZ MOS", ram.mos, "56M");
eq("RAMIREZ enlisted", ram.component, "Enlisted");
eq("RAMIREZ ETS", ram.expiration, "2027-02-28");
eq("RAMIREZ expiration type", ram.expirationType, "ETS");
eq("RAMIREZ address joined", ram.address.indexOf("19 Fiesta Test Ct") === 0, true);
eq("RAMIREZ BN", ram.bn.indexOf("400th Infantry") >= 0, true);
eq("RAMIREZ phone", ram.phone, "515-555-0119");
var wash = find("WASHINGTON LEAH");
eq("WASHINGTON religion BB", wash.religion.indexOf("Baptist Bible Fellowship") >= 0, true);
eq("WASHINGTON religion known", wash.religionKnown, true);
eq("WASHINGTON AFT failed", wash.aft, "Failed");
var ok = find("OKONKWO CHIDI");
eq("OKONKWO religion NC", ok.religion.indexOf("Primitive Methodist") >= 0, true);
var yates = find("YATES COLIN");
eq("YATES unknown ZZ shown raw", yates.religion, "ZZ");
eq("YATES religion known", yates.religionKnown, false);
eq("YATES no eval", yates.eval, "");
var walker = find("WALKER THOMAS");
eq("WALKER unmatched address", walker.addrMatched, false);
eq("WALKER retirement 2027-01-15", walker.ret, "2027-01-15");
eq("one unmatched address (ORPHAN)", CH.data.diag.unmatchedAddr.length, 1);
eq("ORPHAN last", CH.data.diag.unmatchedAddr[0].last, "ORPHAN");
var hale = find("HALE PATRICIA");
eq("HALE long TIG", hale.veryLongTig, true);
eq("HALE weapon expert (not the older sharpshooter)", hale.wpn, "Expert");
eq("HALE weapon date latest", hale.wpnDate, "2026-04-12");
var how = find("HOWARD DEANDRE");
eq("HOWARD stale weapon date", how.wpnDate, "2025-06-01");
eq("HOWARD weapon overdue", how.wpnOverdue, true);
var reed = find("REED MARIA");
eq("REED MRD", reed.expiration, "2027-04-10");
eq("REED in 6-month window (days<=183)", reed.daysExp != null && reed.daysExp <= 183, true);
eq("religion source set", !!CH.RELIGION_SOURCE, true);
eq("BB maps", CH.religionName("BB"), "Baptist Bible Fellowship");
if (CH.religionName("NC").toLowerCase().indexOf("primitive methodist") < 0) {
  fail++; console.error("FAIL NC title", CH.religionName("NC"));
} else console.log("ok  NC title contains Primitive Methodist:", CH.religionName("NC"));
eq("01 padded", CH.religionName("1"), CH.religionName("01"));
eq("strip O56A", CH.stripJob("O56A"), "56A");
eq("strip E56M", CH.stripJob("e56m"), "56M");
eq("strip already clean", CH.stripJob("56A"), "56A");
eq("namesMatch middle name", CH.namesMatch("SMITH JOHN DEAN", "SMITH", "JOHN"), true);
eq("namesMatch no false prefix", CH.namesMatch("SMITHSON JOHN DEAN", "SMITH", "JOHN"), false);
if (fail) { console.error("\n" + fail + " failures"); process.exit(1); }
console.log("\nAll checks passed.");
