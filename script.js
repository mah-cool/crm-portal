/* [Company Name] — site interactions */
(function () {
  'use strict';

  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var navList = document.getElementById('nav-list');
  if (toggle && navList) {
    toggle.addEventListener('click', function () {
      var open = navList.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close menu when a link is tapped
    navList.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        navList.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Current year in footer
  var yearEl = document.getElementById('year');
  if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

  // Quote form — client-side validation + friendly confirmation.
  // NOTE: this does not yet send anywhere. See the comment below to wire it up.
  var form = document.getElementById('quote-form');
  var note = document.getElementById('form-note');
  if (form && note) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!name || !emailOk) {
        note.textContent = 'Please enter your name and a valid email address.';
        note.className = 'form-note err';
        return;
      }

      // TODO: connect to a backend or form service (e.g. Formspree, Netlify
      // Forms, or your own endpoint) to actually receive submissions:
      //   fetch('https://formspree.io/f/XXXX', { method:'POST', body:new FormData(form) })
      note.textContent = 'Thanks, ' + name + '! Your request has been received — we’ll be in touch shortly.';
      note.className = 'form-note ok';
      form.reset();
    });
  }
})();
