# vaibhav.pocpe.com

Personal site of **Vaibhav Soni — Senior Product Manager, MarTech at Articore** (previously Optiblack).
A single page, hosted on GitHub Pages at <https://vaibhav.pocpe.com/>.

## Layout

```
index.html            built output — what GitHub Pages serves (don't edit by hand)
404.html              redirects any old URL back to /
CNAME                 custom domain
robots.txt, sitemap.xml
site.config.json      title, description, role, company, links  ← edit for SEO/role changes
src/template.html     the page copy, sections and styles       ← edit for content changes
src/shell.html        bundler runtime + fonts + design-system assets (rarely touched)
tools/build.py        src + config → index.html
js/site-analytics.js  Plausible, GA4, Meta Pixel, Clarity, Mixpanel loader
js/plausible.js       self-hosted Plausible script
assets/img/           articore-logo.png
assets/pdf/           Vaibhav_Soni_Resume.pdf  ← replace this file to update the résumé
```

## Update the site

```bash
# edit src/template.html and/or site.config.json, then
python3 tools/build.py
git add -A && git commit -m "Update site" && git push
```

## Endpoints

| URL | What |
| --- | --- |
| `/` | the whole portfolio (About · Stack · Experience · Contact) |
| `/assets/pdf/Vaibhav_Soni_Resume.pdf` | résumé |
| `/sitemap.xml`, `/robots.txt` | SEO |
| `/404.html` | not-found fallback → `/` |

External services: Formspree `xlevzzgj` (contact form), Plausible, GA4 `G-TWZB89M6Y4`, Meta Pixel, Clarity, Mixpanel.
