#!/usr/bin/env python3
"""Inline src/ into one self-contained file: chaplain-dashboard.html (no network needed)."""
import pathlib
root = pathlib.Path(__file__).parent
src = root / "src"
css = (src / "base.css").read_text() + "\n" + (src / "chaplain.css").read_text()
order = [
    "vendor/chart.umd.min.js",
    "vendor/xlsx.full.min.js",
    "religion.js",
    "testdata.js",
    "data.js",
    "loaders.js",
    "core.js",
    "pages.js",
]
LAZY = {"vendor/xlsx.full.min.js": "xlsxLazy"}

def js(p):
    t = (src / p).read_text()
    if p in LAZY:
        return '<script type="text/x-lazy" id="' + LAZY[p] + '">\n' + t.replace("</script", "<\\/script") + "\n</script>"
    return "<script>\n" + t.replace("</script", "<\\/script") + "\n</script>"

scripts = "\n".join(js(p) for p in order) + "\n<script>if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', CH.init); else CH.init();</script>"
html = (src / "index.html").read_text().replace("/*@@CSS@@*/", css).replace("<!--@@SCRIPTS@@-->", scripts)
out = root / "chaplain-dashboard.html"
out.write_text(html)
print("wrote", out, len(html), "bytes")
