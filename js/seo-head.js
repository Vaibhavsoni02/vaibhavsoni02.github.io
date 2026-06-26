/**
 * SEO meta tags and structured data — injected into <head> after bundle render.
 */
(function () {
  if (window.__seoHeadLoaded) return;
  window.__seoHeadLoaded = true;

  var SITE_URL = 'https://vaibhav.pocpe.com/';
  var TITLE = 'Vaibhav Soni — Product Manager | Data Services | Optiblack';
  var DESCRIPTION =
    'Vaibhav Soni is a Product Manager at Optiblack, helping companies transform their relationship with data through product strategy, analytics, and MarTech solutions.';

  document.title = TITLE;
  document.documentElement.lang = 'en';

  function setMeta(name, content, isProperty) {
    var attr = isProperty ? 'property' : 'name';
    var el = document.querySelector('meta[' + attr + '="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  setMeta('description', DESCRIPTION);
  setMeta('robots', 'index, follow, max-image-preview:large');
  setMeta('author', 'Vaibhav Soni');
  setMeta('theme-color', '#824DEB');

  setMeta('og:type', 'website', true);
  setMeta('og:url', SITE_URL, true);
  setMeta('og:title', TITLE, true);
  setMeta('og:description', DESCRIPTION, true);
  setMeta('og:site_name', 'Vaibhav Soni — Optiblack', true);
  setMeta('og:locale', 'en_US', true);

  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', TITLE);
  setMeta('twitter:description', DESCRIPTION);
  setMeta('twitter:creator', '@vaibhavsoni02');

  var canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = SITE_URL;

  var ld = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Vaibhav Soni',
    url: SITE_URL,
    jobTitle: 'Product Manager',
    worksFor: {
      '@type': 'Organization',
      name: 'Optiblack',
      url: 'https://optiblack.com'
    },
    email: 'vaibhavgear7@gmail.com',
    sameAs: [
      'https://www.linkedin.com/in/vaibhavsoni02',
      'https://twitter.com/vaibhavsoni02'
    ],
    description: DESCRIPTION
  };

  var script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);
})();
