/* ═══════════════════════════════════════════
   СказкиПро — Main JavaScript
   Multi-step form, FAQ, animations, header
   ═══════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Config ──
  const FORM_ENDPOINT = ''; // Set to Google Apps Script URL or API endpoint
  const PRICE = '399₽';

  // ═══════════════════════════════════════════
  // STICKY HEADER
  // ═══════════════════════════════════════════
  const header = document.getElementById('header');

  function handleScroll() {
    if (window.scrollY > 60) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  // ═══════════════════════════════════════════
  // MOBILE MENU
  // ═══════════════════════════════════════════
  const burger = document.querySelector('.burger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (burger && mobileMenu) {
    burger.addEventListener('click', function() {
      const isOpen = mobileMenu.classList.toggle('open');
      burger.textContent = isOpen ? '✕' : '☰';
      burger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu on link click
    mobileMenu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        mobileMenu.classList.remove('open');
        burger.textContent = '☰';
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // ═══════════════════════════════════════════
  // SMOOTH SCROLL
  // ═══════════════════════════════════════════
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        var headerOffset = 80;
        var y = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  // ═══════════════════════════════════════════
  // SCROLL REVEAL ANIMATIONS
  // ═══════════════════════════════════════════
  var revealElements = document.querySelectorAll('.reveal, .reveal-stagger');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(function(el) { observer.observe(el); });
  } else {
    revealElements.forEach(function(el) { el.classList.add('visible'); });
  }

  // ═══════════════════════════════════════════
  // FAQ ACCORDION
  // ═══════════════════════════════════════════
  document.querySelectorAll('.faq-item__question').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var item = this.closest('.faq-item');
      var wasOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item.open').forEach(function(openItem) {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-item__question').setAttribute('aria-expanded', 'false');
      });

      // Toggle current
      if (!wasOpen) {
        item.classList.add('open');
        this.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ═══════════════════════════════════════════
  // MULTI-STEP ORDER FORM
  // ═══════════════════════════════════════════
  var currentStep = 1;
  var formData = {
    theme: '',
    childName: '',
    childAge: '',
    childGender: '',
    photo: null,
    phone: '',
    email: ''
  };

  var form = document.getElementById('orderForm');
  if (!form) return;

  var steps = form.querySelectorAll('.form-step');
  var progressSteps = form.querySelectorAll('.form-progress__step');
  var progressLines = form.querySelectorAll('.form-progress__line');

  // Theme selection
  document.querySelectorAll('.theme-option').forEach(function(option) {
    option.addEventListener('click', function() {
      document.querySelectorAll('.theme-option').forEach(function(o) { o.classList.remove('selected'); });
      this.classList.add('selected');
      this.querySelector('input').checked = true;
      formData.theme = this.querySelector('input').value;
    });
  });

  // Gender selection
  document.querySelectorAll('.gender-option').forEach(function(option) {
    option.addEventListener('click', function() {
      document.querySelectorAll('.gender-option').forEach(function(o) { o.classList.remove('selected'); });
      this.classList.add('selected');
      this.querySelector('input').checked = true;
      formData.childGender = this.querySelector('input').value;
    });
  });

  // Photo upload
  var photoInput = document.getElementById('photoInput');
  var photoUpload = document.querySelector('.photo-upload');

  if (photoInput) {
    photoInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;

      // Validate file type
      var allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedTypes.indexOf(file.type) === -1) {
        showFieldError('photoError', 'Пожалуйста, загрузите фото в формате JPG, PNG или WebP');
        this.value = '';
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        showFieldError('photoError', 'Файл слишком большой. Максимум 10 МБ.');
        this.value = '';
        return;
      }

      hideFieldError('photoError');
      formData.photo = file;
      photoUpload.classList.add('has-file');

      // Preview
      var reader = new FileReader();
      reader.onload = function(e) {
        var preview = photoUpload.querySelector('.photo-upload__preview');
        preview.querySelector('img').src = e.target.result;
        preview.querySelector('.file-name').textContent = file.name;
      };
      reader.readAsDataURL(file);
    });
  }

  // Navigation buttons
  document.querySelectorAll('[data-action="next"]').forEach(function(btn) {
    btn.addEventListener('click', function() { goToStep(currentStep + 1); });
  });

  document.querySelectorAll('[data-action="back"]').forEach(function(btn) {
    btn.addEventListener('click', function() { goToStep(currentStep - 1); });
  });

  // Clicking catalog cards or price → select theme and scroll to form
  document.querySelectorAll('.story-card').forEach(function(card) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', function(e) {
      e.preventDefault();
      var theme = this.getAttribute('data-theme');
      if (!theme) return;
      formData.theme = theme;

      // Select corresponding theme in form
      document.querySelectorAll('.theme-option').forEach(function(o) {
        o.classList.remove('selected');
        if (o.querySelector('input').value === theme) {
          o.classList.add('selected');
          o.querySelector('input').checked = true;
        }
      });

      // Scroll to form and go to step 2
      var orderSection = document.getElementById('order');
      var headerOffset = 80;
      var y = orderSection.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });

      setTimeout(function() { goToStep(2); }, 400);
    });
  });

  function goToStep(step) {
    // Validate before moving forward
    if (step > currentStep && !validateStep(currentStep)) return;

    currentStep = step;

    // Update steps visibility
    steps.forEach(function(s, i) {
      s.classList.toggle('active', i + 1 === currentStep);
    });

    // Update progress
    progressSteps.forEach(function(s, i) {
      s.classList.remove('active', 'done');
      if (i + 1 === currentStep) s.classList.add('active');
      else if (i + 1 < currentStep) s.classList.add('done');
    });

    progressLines.forEach(function(l, i) {
      l.classList.remove('active', 'done');
      if (i + 1 < currentStep) l.classList.add('done');
      else if (i + 1 === currentStep) l.classList.add('active');
    });

    // Scroll form into view
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function validateStep(step) {
    if (step === 1) {
      if (!formData.theme) {
        shakeElement(document.querySelector('.theme-selector'));
        return false;
      }
      return true;
    }

    if (step === 2) {
      var valid = true;
      var nameInput = document.getElementById('childName');
      var ageSelect = document.getElementById('childAge');

      formData.childName = nameInput.value.trim();
      formData.childAge = ageSelect.value;

      if (!formData.childName) {
        showFieldError('nameError', 'Введите имя ребёнка');
        nameInput.classList.add('form-input--error');
        valid = false;
      } else {
        hideFieldError('nameError');
        nameInput.classList.remove('form-input--error');
      }

      if (!formData.childAge) {
        showFieldError('ageError', 'Выберите возраст');
        ageSelect.classList.add('form-input--error');
        valid = false;
      } else {
        hideFieldError('ageError');
        ageSelect.classList.remove('form-input--error');
      }

      if (!formData.childGender) {
        shakeElement(document.querySelector('.gender-options'));
        valid = false;
      }

      if (!formData.photo) {
        showFieldError('photoError', 'Загрузите фото ребёнка');
        photoUpload.classList.add('error');
        valid = false;
      } else {
        hideFieldError('photoError');
        photoUpload.classList.remove('error');
      }

      return valid;
    }

    return true;
  }

  // Submit form
  var submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', function(e) {
      e.preventDefault();

      var phoneInput = document.getElementById('contactPhone');
      var emailInput = document.getElementById('contactEmail');

      formData.phone = phoneInput.value.trim();
      formData.email = emailInput ? emailInput.value.trim() : '';

      if (!formData.phone) {
        showFieldError('phoneError', 'Укажите телефон или Telegram');
        phoneInput.classList.add('form-input--error');
        return;
      }

      hideFieldError('phoneError');
      phoneInput.classList.remove('form-input--error');

      submitOrder();
    });
  }

  function submitOrder() {
    var btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Отправляем...';

    // Prepare data
    var data = new FormData();
    data.append('theme', formData.theme);
    data.append('childName', formData.childName);
    data.append('childAge', formData.childAge);
    data.append('childGender', formData.childGender);
    data.append('phone', formData.phone);
    data.append('email', formData.email);
    if (formData.photo) {
      data.append('photo', formData.photo);
    }

    if (FORM_ENDPOINT) {
      fetch(FORM_ENDPOINT, { method: 'POST', body: data })
        .then(function() { showThankYou(); })
        .catch(function() { showThankYou(); /* Still show thanks — retry on backend */ });
    } else {
      // Demo mode — no backend
      console.log('Order data:', formData);
      setTimeout(function() { showThankYou(); }, 800);
    }
  }

  function showThankYou() {
    form.style.display = 'none';
    document.querySelector('.order .section__title').style.display = 'none';

    var thankYou = document.getElementById('thankYou');
    var nameSpan = thankYou.querySelector('.child-name');
    if (nameSpan) nameSpan.textContent = formData.childName;
    thankYou.classList.add('show');
  }

  // ── Helpers ──
  function showFieldError(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('show'); }
  }

  function hideFieldError(id) {
    var el = document.getElementById(id);
    if (el) { el.classList.remove('show'); }
  }

  function shakeElement(el) {
    if (!el) return;
    el.style.animation = 'none';
    el.offsetHeight; // Trigger reflow
    el.style.animation = 'shake 0.4s ease';
    setTimeout(function() { el.style.animation = ''; }, 500);
  }

  // ═══════════════════════════════════════════
  // "COMING SOON" EMAIL FORM
  // ═══════════════════════════════════════════
  var voiceForm = document.getElementById('voiceNotifyForm');
  if (voiceForm) {
    voiceForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var input = this.querySelector('input');
      var btn = this.querySelector('button');
      var value = input.value.trim();

      if (!value) return;

      btn.textContent = '✓';
      btn.disabled = true;
      input.disabled = true;
      input.value = 'Спасибо! Мы сообщим вам первым.';

      // Send to backend if endpoint exists
      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, {
          method: 'POST',
          body: JSON.stringify({ contact: value, source: 'voice_notify' }),
          headers: { 'Content-Type': 'application/json' }
        }).catch(function() {});
      }
    });
  }

})();

/* Shake animation (injected by CSS-in-JS to keep it here) */
var shakeStyle = document.createElement('style');
shakeStyle.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}';
document.head.appendChild(shakeStyle);
