/**
 * AJAX handler for Formspree forms — used on legacy pages and as a safety net.
 */
(function () {
  function enhanceForm(form) {
    if (!form || form.dataset.formspreeEnhanced) return;
    if (!form.action || form.action.indexOf('formspree.io') === -1) return;

    form.dataset.formspreeEnhanced = 'true';

    var status = form.querySelector('[data-form-status]');
    if (!status) {
      status = document.createElement('p');
      status.setAttribute('data-form-status', '');
      status.style.marginTop = '10px';
      status.style.fontWeight = '600';
      form.appendChild(status);
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('[type="submit"], button[name="submit"]');
      var originalText = submitBtn ? submitBtn.textContent : '';

      if (submitBtn) {
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
      }
      status.textContent = '';
      status.style.color = '';

      try {
        var response = await fetch(form.action, {
          method: form.method || 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });

        if (response.ok) {
          status.style.color = '#62B28A';
          status.textContent = 'Your message has been sent!';
          form.reset();
          if (typeof mixpanel !== 'undefined') {
            mixpanel.track('Contact Form Submitted');
          }
          if (typeof fbq !== 'undefined') {
            fbq('track', 'Lead');
          }
        } else {
          throw new Error('Submission failed');
        }
      } catch (err) {
        status.style.color = '#E85D5D';
        status.textContent = 'Something went wrong. Please try again.';
      }

      if (submitBtn) {
        setTimeout(function () {
          submitBtn.textContent = originalText || 'Send';
          submitBtn.disabled = false;
        }, 2000);
      }
    });
  }

  function init() {
    document.querySelectorAll('form[action*="formspree.io"]').forEach(enhanceForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.enhanceFormspreeForms = init;
})();
