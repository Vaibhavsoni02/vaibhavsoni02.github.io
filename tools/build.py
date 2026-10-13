#!/usr/bin/env python3
"""Build index.html from src/shell.html + src/template.html + site.config.json.

    python3 tools/build.py

src/shell.html     bundler runtime, fonts and design-system assets (rarely edited)
src/template.html  the page itself: copy, sections, styles (edit this)
site.config.json   title, description, job title, company, social links (edit this)

Every SEO tag (static <head>, post-render <head>, JSON-LD) is generated from
site.config.json, so the role/company is only ever written down once.
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
cfg = json.loads((ROOT / "site.config.json").read_text(encoding="utf-8"))


def esc(s):
    return html.escape(s, quote=True)


def seo_head():
    ld = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": cfg["name"],
        "url": cfg["siteUrl"],
        "jobTitle": cfg["jobTitle"],
        "worksFor": {"@type": "Organization", "name": cfg["company"], "url": cfg["companyUrl"]},
        "email": cfg["email"],
        "sameAs": cfg["sameAs"],
    }
    t, d, u = esc(cfg["title"]), esc(cfg["description"]), esc(cfg["siteUrl"])
    return "".join([
        f"<title>{t}</title>",
        f'<meta name="description" content="{d}">',
        '<meta name="robots" content="index, follow, max-image-preview:large">',
        f'<meta name="author" content="{esc(cfg["name"])}">',
        f'<meta name="theme-color" content="{esc(cfg["themeColor"])}">',
        f'<link rel="canonical" href="{u}">',
        '<meta property="og:type" content="website">',
        f'<meta property="og:url" content="{u}">',
        f'<meta property="og:title" content="{t}">',
        f'<meta property="og:description" content="{d}">',
        f'<meta property="og:site_name" content="{esc(cfg["siteName"])}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{t}">',
        f'<meta name="twitter:description" content="{d}">',
        f'<meta name="twitter:creator" content="{esc(cfg["twitterHandle"])}">',
        '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False, separators=(",", ":")) + "</script>",
    ])


def js_string(s):
    # safe inside an inline <script>: never emit a literal "</script>"
    return json.dumps(s, ensure_ascii=False).replace("</", "<\\/")


def main():
    shell = (ROOT / "src/shell.html").read_text(encoding="utf-8")
    template = (ROOT / "src/template.html").read_text(encoding="utf-8")
    head = seo_head()
    for token in ("__TEMPLATE__", "__SEO_HEAD_JSON__", "__SEO_HEAD__"):
        assert token in shell, f"{token} missing from src/shell.html"
    out = (
        shell.replace("__TEMPLATE__", json.dumps(template, ensure_ascii=False).replace("</", "<\\u002F"))
        .replace("__SEO_HEAD_JSON__", js_string(head))
        .replace("__SEO_HEAD__", head)
    )
    (ROOT / "index.html").write_text(out, encoding="utf-8")
    print(f"built index.html ({len(out) // 1024} KB) — {cfg['jobTitle']} @ {cfg['company']}")


if __name__ == "__main__":
    main()
