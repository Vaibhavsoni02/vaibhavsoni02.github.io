/*!
 * Plausible-like analytics script — cleaned & commented
 * Preserves original behavior: sends events to data-api endpoint via POST (keepalive:true)
 * Supports optional measurements:
 *  - Outbound links
 *  - File downloads
 *  - 404 error pages
 *  - Hashed page paths
 *  - Custom events
 *  - Custom properties
 *  - Ecommerce revenue
 *
 * Usage: include this script tag with optional attributes:
 *  data-api      -> full API endpoint (defaults to script origin + "/api/event")
 *  data-domain   -> site domain (used in event payload)
 *  file-types    -> comma separated file extensions to treat as downloads
 *  add-file-types-> additional comma separated file extensions
 *  event-<name>  -> custom attributes passed into events as props (e.g. event-environment="prod")
 *  (See inline comments for details)
 */
(function () {
  // Short aliases to window/document for terser references
  var locationObj = window.location;
  var doc = window.document;
  var currentScript = doc.currentScript;

  // Determine API endpoint: if data-api attribute set, use it; otherwise use script origin + "/api/event"
  var apiEndpoint = currentScript.getAttribute("data-api") || new URL(currentScript.src).origin + "/api/event";

  // Domain / site id to include in event payloads (provided as data-domain attribute on script tag)
  var domain = currentScript.getAttribute("data-domain");

  // Internal state variables
  var pageviewFlag = false; // whether a pageview has been recorded recently (controls engagement tracking)
  var lastScrollPos = -1; // last recorded maximum scroll position
  var engagementTimer = null; // timestamp when page became focused/visible (for engagement time)
  var accumulatedHiddenTime = 0; // accumulated time spent out-of-focus (ms)
  var visibilityAttached = false; // whether visibility/focus listeners attached
  var initialDocHeight = 0; // document height at load / recent check
  var maxViewedHeight = 0; // maximum bottom-of-viewport Y seen so far
  var baseUrl = locationObj.href; // current URL for payloads
  var customProps = {}; // last seen custom properties (from pageview)
  var engagementIntervalId = 0; // used for interval during initial load to update doc height

  // ----- Utility functions (kept small and explicit) -----

  // Get the full document height (max of body & documentElement metrics)
  function getDocumentHeight() {
    var body = doc.body || {};
    var html = doc.documentElement || {};
    return Math.max(
      body.scrollHeight || 0,
      body.offsetHeight || 0,
      body.clientHeight || 0,
      html.scrollHeight || 0,
      html.offsetHeight || 0,
      html.clientHeight || 0
    );
  }

  // Get the bottom Y coordinate of the viewport (scroll position + viewport height).
  // This is used to compute "percentage of page viewed".
  function getViewportBottom() {
    var body = doc.body || {};
    var html = doc.documentElement || {};
    var innerHeight = window.innerHeight || html.clientHeight || 0;
    var scrollY = window.scrollY || html.scrollTop || body.scrollTop || 0;

    // If full document smaller than viewport, bottom = viewport height
    return innerHeight >= initialDocHeight ? initialDocHeight : scrollY + innerHeight;
  }

  // Compute accumulated "engagement" time (ms). If page is currently focused (engagementTimer !== null),
  // include time since last focus.
  function getAccumulatedEngagement() {
    return engagementTimer ? accumulatedHiddenTime + (Date.now() - engagementTimer) : accumulatedHiddenTime;
  }

  // Post an event payload to the API endpoint using fetch keepalive if available.
  // `payload` must be a plain object. `opts` may include a callback: { callback: fn }.
  function postEvent(endpoint, payload, opts) {
    if (window.fetch) {
      try {
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          keepalive: true,
          body: JSON.stringify(payload),
        })
          .then(function (res) {
            if (opts && typeof opts.callback === "function") {
              opts.callback({ status: res.status });
            }
          })
          .catch(function () {
            // swallow network errors silently (match original behavior)
          });
      } catch (e) {
        // silent fallback
      }
    }
  }

  // Lightweight ignore function that logs nothing but supports callbacks
  function ignoreEvent(eventName, reason, opts) {
    // Keep original semantics: if a callback was provided, call it
    if (opts && opts.callback) opts.callback();
    // For "pageview" we should also flip pageviewFlag true if needed (original used `a` var)
    if (eventName === "pageview") {
      pageviewFlag = true;
    }
  }

  // ----- Engagement tracking (keeps original heuristics intact) -----

  // This function checks whether we should send an engagement event, and triggers it.
  // Engagement events are triggered when either:
  //  - the user scrolls further down the page (seen more of the page than previously),
  //  - or a time threshold (3000ms) of accumulated focus has passed.
  function maybeSendEngagement() {
    var engagementMs = getAccumulatedEngagement();

    // If we haven't recorded a pageview recently, or the user progressed further down,
    // or they have spent >= 3000 ms focused, send engagement payload.
    if (!pageviewFlag && (lastScrollPos < maxViewedHeight || engagementMs >= 3000)) {
      lastScrollPos = maxViewedHeight;

      var payload = {
        n: "engagement", // event name
        sd: Math.round((maxViewedHeight / initialDocHeight) * 100), // percent of document scrolled (0-100)
        d: domain,
        u: baseUrl,
        p: customProps,
        e: engagementMs,
        v: 3, // protocol version / schema version
        h: 1, // header flag in original payload
      };

      // Reset focus/engagement counters the same way original did
      engagementTimer = null;
      accumulatedHiddenTime = 0;

      postEvent(apiEndpoint, payload);
    }
  }

  // Visibility/focus handler. Tracks when page becomes visible/focused and when it loses focus.
  // It updates `engagementTimer` and accumulates hidden time to `accumulatedHiddenTime`.
  function handleVisibilityChange() {
    // If document is visible and tab has focus, start (or resume) engagement timer
    if (doc.visibilityState === "visible" && doc.hasFocus() && engagementTimer === null) {
      engagementTimer = Date.now();
    } else {
      // Otherwise, stop timer and accumulate
      if (!(doc.visibilityState === "hidden") && doc.hasFocus()) {
        // still visible/focused -> nothing
      } else {
        // tab lost focus or became hidden
        accumulatedHiddenTime = getAccumulatedEngagement();
        engagementTimer = null;
        // Possibly send engagement right away when losing focus (matches original)
        maybeSendEngagement();
      }
    }
  }

  // ----- Main event function (exposed as window.plausible) -----
  //
  // Accepts:
  //  - eventName (string)
  //  - options (object) with optional fields:
  //      meta: object (meta info stored as JSON string in payload)
  //      props: object (custom properties to attach to event)
  //      revenue: object (ecommerce revenue values)
  //      callback: function (called with {status: HTTPStatus} when network returns)
  //
  // Behavior:
  //  - If eventName === "pageview" it reinitializes pageview-specific state (similar to original).
  //  - Applies filters to ignore events on localhost or when running in automation.
  window.plausible = function plausible(eventName, opts) {
    var isPageview = eventName === "pageview";

    // Detect local dev hosts and file protocol -> ignore
    if (/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(locationObj.hostname) || locationObj.protocol === "file:") {
      return ignoreEvent(eventName, "localhost", opts);
    }

    // Ignore when running in headless / test environments (phantomjs, nightmare, webdriver, Cypress),
    // unless a global override `window.__plausible` is present (original behavior used a negative condition)
    if ((window._phantom || window.__nightmare || window.navigator.webdriver || window.Cypress) && !window.__plausible) {
      return ignoreEvent(eventName, null, opts);
    }

    // Respect a localStorage flag `plausible_ignore` if present (some users set this to disable analytics)
    try {
      if (window.localStorage && window.localStorage.plausible_ignore === "true") {
        return ignoreEvent(eventName, "localStorage flag", opts);
      }
    } catch (e) {
      // ignore storage access errors (e.g., in private mode)
    }

    // Build the base payload
    var payload = {};
    payload.n = eventName;
    payload.v = 3;
    payload.u = locationObj.href;
    payload.d = domain || null;
    payload.r = doc.referrer || null;

    // If options include meta or props or revenue, include them
    if (opts && opts.meta) payload.m = JSON.stringify(opts.meta);
    if (opts && opts.props) payload.p = opts.props;
    if (opts && opts.revenue) payload.$ = opts.revenue;

    // Read attributes on the script tag that start with "event-" and merge into props (original behavior)
    // This allows embedding data attributes for default props, e.g. <script data-event-env="prod">
    try {
      // Get all attribute names from the script element and filter those starting with 'event-'
      var attrNames = currentScript.getAttributeNames
        ? currentScript.getAttributeNames().filter(function (n) {
            return n.indexOf("event-") === 0;
          })
        : [];

      var props = payload.p || {};
      attrNames.forEach(function (attr) {
        var key = attr.replace("event-", "");
        var value = currentScript.getAttribute(attr);
        // Don't override existing prop values
        if (!props[key]) props[key] = value;
      });
      payload.p = props;
    } catch (e) {
      // ignore attribute read errors
    }

    // For pageview events, do the pageview initialization tasks:
    //  - mark pageviewFlag false (so engagement tracking will trigger)
    //  - set baseUrl to payload url
    //  - copy props into customProps for later engagement events
    //  - reset scroll/engagement state
    if (isPageview) {
      pageviewFlag = false;
      baseUrl = payload.u;
      customProps = payload.p || {};
      lastScrollPos = -1;
      accumulatedHiddenTime = 0;
      engagementTimer = Date.now();

      // Attach global focus/visibility listeners once
      if (!visibilityAttached) {
        doc.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleVisibilityChange);
        window.addEventListener("focus", handleVisibilityChange);
        visibilityAttached = true;
      }
    }

    // Send the payload
    postEvent(apiEndpoint, payload, opts);

    // If pageview, reset the document height and start a short interval to re-check height
    // (original does this to capture dynamic content that changes after load)
    if (isPageview) {
      initialDocHeight = getDocumentHeight();
      // small interval to recalc initialDocHeight a few times soon after load
      var tries = 0;
      var tId = setInterval(function () {
        initialDocHeight = getDocumentHeight();
        if (++tries === 15) clearInterval(tId);
      }, 200);
    }
  };

  // Re-apply any queued calls to window.plausible (the original script supported queueing calls
  // placed before the script loaded).
  var queued = window.plausible && window.plausible.q ? window.plausible.q : [];
  window.plausible = window.plausible; // ensure reference
  for (var qi = 0; qi < queued.length; qi++) {
    try {
      window.plausible.apply(this, queued[qi]);
    } catch (e) {
      // ignore errors from queued invocations
    }
  }

  // ----- Pageview detection and pageshow/hashchange handling -----

  // Keep track of the current pathname so we can call a pageview when it changes
  var lastPathname = null;

  function sendPageviewIfNeeded() {
    lastPathname = locationObj.pathname;
    // call plausible("pageview") without any options
    window.plausible("pageview");
  }

  // If the page is in prerender state, wait for visibilitychange to fire to send initial pageview
  if (doc.visibilityState === "prerender") {
    doc.addEventListener("visibilitychange", function () {
      if (!lastPathname && doc.visibilityState === "visible") {
        sendPageviewIfNeeded();
      }
    });
  } else {
    // otherwise send pageview now
    sendPageviewIfNeeded();
  }

  // Also send pageview when pageshow occurs with persisted navigation (back/forward cache)
  window.addEventListener("pageshow", function (ev) {
    if (ev && ev.persisted) sendPageviewIfNeeded();
  });

  // On hashchange, treat as a navigation and send pageview
  window.addEventListener("hashchange", function () {
    sendPageviewIfNeeded();
  });

  // ----- Link/file/download detection & tracking -----
  //
  // The script listens for click/auxclick events, figures out whether the clicked element:
  //  - is an outbound link (different host), or
  //  - is a file download (based on extension), or
  //  - is a special "plausible-event-*" decorated element (custom events),
  // and then calls plausible(...) accordingly. It preserves original semantics for how it
  // prevents navigation to ensure the event can be sent first (fallback to a timeout to proceed).

  // Default set of file extensions to treat as downloads.
  var defaultFileTypes = [
    "pdf",
    "xlsx",
    "docx",
    "txt",
    "rtf",
    "csv",
    "exe",
    "key",
    "pps",
    "ppt",
    "pptx",
    "7z",
    "pkg",
    "rar",
    "gz",
    "zip",
    "avi",
    "mov",
    "mp4",
    "mpeg",
    "wmv",
    "midi",
    "mp3",
    "wav",
    "wma",
    "dmg",
  ];

  // Allow configuration via script attributes `file-types` or `add-file-types`
  var configuredFilesAttr = currentScript.getAttribute("file-types");
  var addFilesAttr = currentScript.getAttribute("add-file-types");
  var fileTypes = defaultFileTypes.slice();

  if (configuredFilesAttr) {
    fileTypes = configuredFilesAttr.split(",").map(function (s) {
      return s.trim();
    });
  } else if (addFilesAttr) {
    // add extras to defaults
    addFilesAttr
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .forEach(function (ext) {
        if (fileTypes.indexOf(ext) === -1) fileTypes.push(ext);
      });
  }

  // Helper: walk up parent chain and find the nearest <a> anchor with an href
  function findClosestAnchor(el) {
    while (el && el.tagName && el.tagName.toLowerCase() !== "a") {
      el = el.parentNode;
    }
    return el && el.tagName && el.tagName.toLowerCase() === "a" ? el : null;
  }

  // Helper: returns whether an element has a class matching plausible-event-name pattern
  function elementHasPlausibleEventMarker(el) {
    var cls = el && el.classList;
    if (!cls) return false;
    for (var i = 0; i < cls.length; i++) {
      if (/plausible-event-name(=|--)(.+)/.test(cls.item(i))) return true;
    }
    return false;
  }

  // Parse an element's classes for plausible-event-*/plausible-revenue-* patterns and assemble a small event object.
  // This mirrors the original `$()` helper in the source.
  function parseEventFromElement(el) {
    var result = { name: null, props: {}, revenue: {} };
    var clsList = el && el.classList;
    if (!clsList) return result;

    for (var i = 0; i < clsList.length; i++) {
      var c = clsList.item(i);

      // plausible-event-<key>=<value>  OR plausible-event-<key>--<value>
      var m = c.match(/plausible-event-(.+?)(=|--)(.+)/);
      if (m) {
        var k = m[1];
        var v = m[3].replace(/\+/g, " ");
        if (k.toLowerCase() === "name") result.name = v;
        else result.props[k] = result.props[k] || v;
      }

      // plausible-revenue-<key>=<value> pattern for ecommerce revenue
      var mr = c.match(/plausible-revenue-(.+?)(=|--)(.+)/);
      if (mr) {
        var rk = mr[1];
        var rv = mr[3];
        result.revenue[rk] = rv;
      }
    }

    return result;
  }

  // A small recursion depth guard used in original script to avoid walking too far up DOM
  var MAX_NODE_WALK = 3;

  // Determine if a node (or its ancestors up to depth) is decorated with plausible event indicators
  function decoratedEventAncestor(node, depth) {
    var cur = node;
    for (var i = 0; i <= depth && cur; i++) {
      if (elementHasPlausibleEventMarker(cur)) return cur;
      cur = cur.parentNode;
    }
    return null;
  }

  // The actual click/auxclick listener that decides whether to send an outbound/file/custom event.
  // It mirrors the logic of the original `_` function.
  var PRIMARY_BUTTON = 1; // left click button constant used by original script

  function handleClickEvent(e) {
    // Ignore non-left-auxclick types except we still accept primary button on auxclick
    if (e.type === "auxclick" && e.button !== PRIMARY_BUTTON) return;

    // Find clickable anchor element, if any
    var anchor = (function findAnchor(el) {
      for (; el && el !== doc; el = el.parentNode) {
        if (el.tagName && el.tagName.toLowerCase() === "a" && el.href) return el;
      }
      return null;
    })(e.target);

    // If the clicked element (or its ancestor) is annotated with plausible-event-* classes,
    // we want to treat that as a custom event and send it.
    var annotatedNode = decoratedEventAncestor(e.target, 0);
    if (annotatedNode && !isInsideForm(e.target)) {
      // If the annotated node is a link, we'll include the link href as a 'url' prop
      var parsed = parseEventFromElement(annotatedNode);
      if (anchor && anchor.href) parsed.props.url = anchor.href;

      // If the clickable link would navigate away, prefer to send the event first and then navigate.
      // Use the original navigation-preventing heuristic: allow if not defaultPrevented and not ctrl/meta/shift and target isn't a special _blank etc.
      var shouldIntercept = shouldInterceptNavigation(e);

      if (shouldIntercept && anchor) {
        var called = false;
        function proceed() {
          if (called) return;
          called = true;
          window.location = anchor.href;
        }

        // dispatch event and schedule fallback navigation after 5s if not already navigated
        var opts = { props: parsed.props, revenue: parsed.revenue, callback: proceed };
        window.plausible(parsed.name || parsed.props.name || "custom", opts);
        setTimeout(proceed, 5000);
        e.preventDefault();
      } else {
        // non-intercept case: just fire event and don't prevent navigation
        window.plausible(parsed.name || parsed.props.name || "custom", { props: parsed.props, revenue: parsed.revenue });
      }
      return;
    }

    // If there's an anchor but no annotated event, decide if it's outbound or file download
    if (anchor && anchor.href && anchor.host && anchor.host !== locationObj.host) {
      // Outbound link
      dispatchLinkOrFileEvent(e, anchor, "Outbound Link: Click", { url: anchor.href });
      return;
    }

    // If anchor target is same host but URL extension matches fileTypes, treat as file download
    if (anchor && anchor.href) {
      var cleaned = anchor.href.split("?")[0].split("#")[0];
      var ext = cleaned.split(".").pop().toLowerCase();
      if (fileTypes.indexOf(ext) !== -1) {
        dispatchLinkOrFileEvent(e, anchor, "File Download", { url: cleaned });
        return;
      }
    }

    // Otherwise: no special tracking action required
  }

  // Helper: returns true if a node or its ancestor within MAX_NODE_WALK is a <form>
  function isInsideForm(node) {
    var cur = node;
    for (var i = 0; i <= MAX_NODE_WALK && cur; i++) {
      if (cur && cur.tagName && cur.tagName.toLowerCase() === "form") return true;
      cur = cur.parentNode;
    }
    return false;
  }

  // Helper: whether to intercept the link navigation (same heuristic as original)
  function shouldInterceptNavigation(e) {
    // Don't intercept if default prevented or user used modifier keys or target is a new browsing context
    var targetAttr = e.target && e.target.target ? e.target.target : "";
    var targetSpecial = !targetAttr || targetAttr.match(/^_(self|parent|top)$/i);
    var hasModifier = e.ctrlKey || e.metaKey || e.shiftKey;
    return !e.defaultPrevented && targetSpecial && !hasModifier && e.type === "click";
  }

  // Dispatch an outbound link click or file download event.
  // Attempts to send plausible(...) and prevent navigation briefly to allow the POST to be queued.
  function dispatchLinkOrFileEvent(e, anchor, eventName, props) {
    var shouldIntercept = shouldInterceptNavigation(e);

    if (shouldIntercept && anchor) {
      var navigated = false;
      function navigateAway() {
        if (navigated) return;
        navigated = true;
        window.location = anchor.href;
      }

      var opts = { props: props, callback: navigateAway };
      window.plausible(eventName, opts);
      setTimeout(navigateAway, 5000);
      e.preventDefault();
    } else {
      window.plausible(eventName, { props: props });
    }
  }

  // Attach click listeners like the original: both 'click' and 'auxclick' to support middle-click
  doc.addEventListener("click", handleClickEvent);
  doc.addEventListener("auxclick", handleClickEvent);

  // ----- Form submit handler for elements decorated with plausible-event-* classes -----
  // The original script intercepted form submissions if the form carried plausible-event classes,
  // sent the event, then allowed submission after a short delay.
  doc.addEventListener("submit", function (ev) {
    var targetForm = ev.target;
    var parsed = parseEventFromElement(targetForm);
    if (!parsed.name) return; // nothing to do if form has no plausible-event marker

    // Prevent immediate submission, then re-submit after event sent (or 5s fallback)
    ev.preventDefault();
    var submitted = false;
    function doSubmit() {
      if (submitted) return;
      submitted = true;
      // use native submit to avoid re-triggering our handler
      targetForm.submit();
    }

    setTimeout(doSubmit, 5000);
    window.plausible(parsed.name, { props: parsed.props, revenue: parsed.revenue, callback: doSubmit });
  });

  // ----- Scroll listener to update max viewed height and trigger engagement checks -----
  initialDocHeight = getDocumentHeight();
  maxViewedHeight = getViewportBottom();

  // When the page is scrolled, update document height (in case content changes) and track maximum viewport bottom Y seen.
  doc.addEventListener("scroll", function () {
    initialDocHeight = getDocumentHeight();
    var currentBottom = getViewportBottom();
    if (maxViewedHeight < currentBottom) {
      maxViewedHeight = currentBottom;
    }
  });

  // Also update initialDocHeight on load a bit (original behaviour)
  window.addEventListener("load", function () {
    initialDocHeight = getDocumentHeight();
    var tries = 0;
    var iv = setInterval(function () {
      initialDocHeight = getDocumentHeight();
      if (++tries === 15) clearInterval(iv);
    }, 200);
  });

  // Set up a periodic check that may send engagement events when criteria are satisfied.
  // We'll reuse maybeSendEngagement via visibility changes; but also schedule one here in case of long focus.
  // (Original script used a combination of focus/visibility and manual trigger — we've mirrored the behavior.)
  // For safety, also call maybeSendEngagement on visibilitychange and focus/blur handlers already set.
  // Nothing else needed here.

  // ----- Helper to detect hashed path behavior (optionally included as a property on pageview)
  // If you want hashed page paths to be sent as part of pageview payloads, the server should inspect the `u` (URL)
  // or `p` props. This script leaves `u` as the full URL (including hash). If you need a separate hashed-path
  // property, add data on the script tag or include it in the pageview invocation: window.plausible("pageview",{props:{hashed_path:location.hash}})
  //
  // Also 404 pages detection is best performed server-side (by returning a 404 status and maybe the script receives
  // a data attribute indicating the page is a 404). To include it client-side, set an attribute on the script tag
  // such as data-404="true" and the pageview props will include it (via event-404="true" attribute or via JS):
  // window.plausible("pageview",{props:{is_404:true}})

  // ----- Expose small helper for external calls if someone wants to trigger engagement checks manually -----
  window.plausible_check_engagement = maybeSendEngagement;

  // End of IIFE
})();
