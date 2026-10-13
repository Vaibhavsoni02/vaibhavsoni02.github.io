/**
 * Unified analytics loader for vaibhav.pocpe.com
 * Injected after the page bundle renders (head is replaced by bundler).
 */
(function () {
  if (window.__siteAnalyticsLoaded) return;
  window.__siteAnalyticsLoaded = true;

  function appendToHead(node) {
    document.head.appendChild(node);
  }

  function injectScript(src, attrs) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        s.setAttribute(k, attrs[k]);
      });
    }
    appendToHead(s);
  }

  function injectInline(code) {
    var s = document.createElement('script');
    s.textContent = code;
    appendToHead(s);
  }

  // Plausible
  injectScript(
    '/js/plausible.js',
    { defer: '', 'data-domain': 'vaibhav.pocpe.com' }
  );
  injectInline(
    'window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }'
  );

  // GA4 (gtag.js)
  injectScript('https://www.googletagmanager.com/gtag/js?id=G-TWZB89M6Y4');
  injectInline(
    "window.dataLayer = window.dataLayer || [];\n" +
      'function gtag(){dataLayer.push(arguments);}\n' +
      "gtag('js', new Date());\n" +
      "gtag('config', 'G-TWZB89M6Y4');"
  );

  // Meta Pixel
  injectInline(
    "!function(f,b,e,v,n,t,s)\n" +
      '{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\n' +
      'n.callMethod.apply(n,arguments):n.queue.push(arguments)};\n' +
      'if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version=\'2.0\';\n' +
      'n.queue=[];t=b.createElement(e);t.async=!0;\n' +
      't.src=v;s=b.getElementsByTagName(e)[0];\n' +
      's.parentNode.insertBefore(t,s)}(window, document,\'script\',\n' +
      "'https://connect.facebook.net/en_US/fbevents.js');\n" +
      "fbq('init', '1449217027234038');\n" +
      "fbq('track', 'PageView');"
  );
  var noscript = document.createElement('noscript');
  noscript.innerHTML =
    '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1449217027234038&ev=PageView&noscript=1" />';
  appendToHead(noscript);

  // Mixpanel
  injectInline(
    '(function(f,b){if(!b.__SV){var e,g,i,h;window.mixpanel=b;b._i=[];b.init=function(e,f,c){function g(a,d){var b=d.split(".");2==b.length&&(a=a[b[0]],d=b[1]);a[d]=function(){a.push([d].concat(Array.prototype.slice.call(arguments,0)))}}var a=b;"undefined"!==typeof c?a=b[c]=[]:c="mixpanel";a.people=a.people||[];a.toString=function(a){var d="mixpanel";"mixpanel"!==c&&(d+="."+c);a||(d+=" (stub)");return d};a.people.toString=function(){return a.toString(1)+".people (stub)"};i="disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");\n' +
      'for(h=0;h<i.length;h++)g(a,i[h]);var j="set set_once union unset remove delete".split(" ");a.get_group=function(){function b(c){d[c]=function(){call2_args=arguments;call2=[c].concat(Array.prototype.slice.call(call2_args,0));a.push([e,call2])}}for(var d={},e=["get_group"].concat(Array.prototype.slice.call(arguments,0)),c=0;c<j.length;c++)b(j[c]);return d};b._i.push([e,f,c])};b.__SV=1.2;e=f.createElement("script");e.type="text/javascript";e.async=!0;e.src="undefined"!==typeof MIXPANEL_CUSTOM_LIB_URL?\n' +
      'MIXPANEL_CUSTOM_LIB_URL:"file:"===f.location.protocol&&"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\\/\\//)?"https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js":"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";g=f.getElementsByTagName("script")[0];g.parentNode.insertBefore(e,g)}})(document,window.mixpanel||[]);\n' +
      "mixpanel.init('d6f7392cd6d34de1dbd17e41ba8080d6', {\n" +
      '  record_sessions_percent: 100,\n' +
      '  debug: true,\n' +
      '  ignore_dnt: true,\n' +
      '  record_block_selector: "",\n' +
      '  record_mask_text_selector: "",\n' +
      '  autocapture: { click: true, pageview: "url-with-path" }\n' +
      '});\n' +
      'function generateUUID(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c=="x"?r:(r&0x3|0x8);return v.toString(16)})}\n' +
      'function getUserId(){var userId=localStorage.getItem("user_id");if(!userId){userId=generateUUID();localStorage.setItem("user_id",userId)}return userId}\n' +
      'function getUTMParams(){var params={};var searchParams=new URLSearchParams(window.location.search);searchParams.forEach(function(value,key){if(key.startsWith("utm_")){params[key]=value}});return params}\n' +
      'function setUserProperties(){var userId=getUserId();var utmParams=getUTMParams();mixpanel.identify(userId);mixpanel.people.set(utmParams);mixpanel.track("Page View")}\n' +
      'setUserProperties();'
  );

  // Hotjar
  injectInline(
    '(function(h,o,t,j,a,r){\n' +
      'h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};\n' +
      'h._hjSettings={hjid:3335870,hjsv:6};\n' +
      'a=o.getElementsByTagName("head")[0];\n' +
      'r=o.createElement("script");r.async=1;\n' +
      'r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;\n' +
      'a.appendChild(r);\n' +
      "})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');"
  );

  // Microsoft Clarity
  injectInline(
    '(function(c,l,a,r,i,t,y){\n' +
      'c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};\n' +
      't=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;\n' +
      'y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);\n' +
      '})(window, document, "clarity", "script", "fxakklxfbs");'
  );

  // Convert Experiences (A/B testing)
  injectScript('//cdn-4.convertexperiments.com/js/100412048-100412369.js');

  // Customer.io Forms
  injectInline(
    '(function() {\n' +
      "var t = document.createElement('script'), s = document.getElementsByTagName('script')[0];\n" +
      't.async = true;\n' +
      "t.id = 'cio-forms-handler';\n" +
      "t.setAttribute('data-site-id', '68d00106cfd377347654');\n" +
      "t.setAttribute('data-base-url', 'https://customerioforms.com');\n" +
      "t.src = 'https://customerioforms.com/assets/forms.js';\n" +
      's.parentNode.insertBefore(t, s);\n' +
      '})();'
  );

  // Mixpanel EZTrack (load then init)
  var ez = document.createElement('script');
  ez.src = 'https://mpeztrack.com/v1.0.0/eztrack.min.js';
  ez.onload = function () {
    if (window.mpEZTrack) {
      window.mpEZTrack.init('d6f7392cd6d34de1dbd17e41ba8080d6');
    }
  };
  appendToHead(ez);
})();
