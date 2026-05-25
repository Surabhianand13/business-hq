/* ═══════════════════════════════════════════
   SOLVV AI — Main Script
   ═══════════════════════════════════════════ */

/* ─── LOADER ─── */
window.addEventListener('load', () => {
  const loader   = document.getElementById('loader');
  const bar      = document.getElementById('loader-bar');
  const pct      = document.getElementById('loader-pct');
  const tagline  = document.getElementById('loader-tagline');
  const letters  = document.querySelectorAll('.ll');

  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&';

  /* Scramble-then-reveal each letter with staggered delay */
  letters.forEach((el, i) => {
    const real = el.dataset.char;
    const delay = 80 + i * 90;       /* stagger start */
    const scrambleDuration = 320;    /* ms of random chars before settling */
    const frameInterval = 40;

    setTimeout(() => {
      let elapsed = 0;
      const scramble = setInterval(() => {
        elapsed += frameInterval;
        el.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
        if (elapsed >= scrambleDuration) {
          clearInterval(scramble);
          el.textContent = real;
          el.classList.add('revealed');
        }
      }, frameInterval);
    }, delay);
  });

  /* Show tagline after all letters settle */
  setTimeout(() => tagline.classList.add('visible'), 80 + letters.length * 90 + 320 + 80);

  /* Progress bar */
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 18 + 4;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      setTimeout(() => loader.classList.add('hidden'), 500);
    }
    bar.style.width = progress + '%';
    pct.textContent = Math.floor(progress) + '%';
  }, 80);
});

/* ─── CUSTOM CURSOR ─── */
const cursor = document.getElementById('cursor');
const follower = document.getElementById('cursor-follower');
let fx = 0, fy = 0, cx = 0, cy = 0;

document.addEventListener('mousemove', e => {
  cx = e.clientX; cy = e.clientY;
  cursor.style.left = cx + 'px';
  cursor.style.top  = cy + 'px';
});

(function animFollower() {
  fx += (cx - fx) * 0.12;
  fy += (cy - fy) * 0.12;
  follower.style.left = fx + 'px';
  follower.style.top  = fy + 'px';
  requestAnimationFrame(animFollower);
})();

/* ─── NAV SCROLL ─── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

/* ─── HAMBURGER / MOBILE MENU ─── */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
  document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
});

mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  });
});

/* ─── HERO CANVAS PARTICLES ─── */
(function initCanvas() {
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], shootingStars = [], t = 0;
  let mouseX = -9999, mouseY = -9999;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  canvas.parentElement.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  canvas.parentElement.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });

  /* Palette: [r,g,b] for glow colours */
  const PALETTE = [
    [124, 58,  237],   /* purple  */
    [255,  0,  110],   /* pink    */
    [  0, 212, 255],   /* cyan    */
    [  0, 255, 136],   /* green   */
    [200, 150, 255],   /* lavender*/
  ];

  /* ── Star particles ── */
  class Star {
    constructor(big) {
      this.big = big;
      this.reset(true);
    }
    reset(init) {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.vx = (Math.random() - 0.5) * (this.big ? 0.2 : 0.35);
      this.vy = (Math.random() - 0.5) * (this.big ? 0.2 : 0.35);
      this.r  = this.big ? Math.random() * 2 + 2.5 : Math.random() * 1.5 + 0.8;
      this.baseAlpha = this.big ? Math.random() * 0.4 + 0.6 : Math.random() * 0.5 + 0.3;
      this.col = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      this.twinkleSpeed = Math.random() * 0.04 + 0.01;
      this.twinkleOffset = Math.random() * Math.PI * 2;
      this.life = init ? Math.random() * 400 : 0;
      this.maxLife = Math.random() * 400 + 300;
    }
    update() {
      /* Gentle mouse repulsion */
      const dx = this.x - mouseX, dy = this.y - mouseY;
      const d2 = dx*dx + dy*dy;
      if (d2 < 14400) {
        const d = Math.sqrt(d2);
        this.x += (dx / d) * 0.8;
        this.y += (dy / d) * 0.8;
      }
      this.x += this.vx; this.y += this.vy;
      this.life++;
      if (this.life > this.maxLife || this.x < -5 || this.x > W+5 || this.y < -5 || this.y > H+5) this.reset(false);
    }
    draw() {
      const lifeFade  = Math.sin((this.life / this.maxLife) * Math.PI);
      const twinkle   = 0.6 + 0.4 * Math.sin(t * this.twinkleSpeed + this.twinkleOffset);
      const alpha     = this.baseAlpha * lifeFade * twinkle;
      const [r,g,b]   = this.col;

      ctx.save();
      ctx.shadowBlur  = this.big ? 18 : 10;
      ctx.shadowColor = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fill();

      /* Inner bright core */
      if (this.big) {
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ── Shooting stars ── */
  class ShootingStar {
    constructor() { this.active = false; }
    spawn() {
      this.x  = Math.random() * W * 0.6;
      this.y  = Math.random() * H * 0.4;
      const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.4;
      const spd   = Math.random() * 10 + 14;
      this.vx     = Math.cos(angle) * spd;
      this.vy     = Math.sin(angle) * spd;
      this.len    = Math.random() * 180 + 80;
      this.life   = 0;
      this.maxLife = 50;
      this.active  = true;
      this.col     = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    }
    update() {
      if (!this.active) return;
      this.x += this.vx; this.y += this.vy;
      this.life++;
      if (this.life > this.maxLife || this.x > W || this.y > H) this.active = false;
    }
    draw() {
      if (!this.active) return;
      const fade  = 1 - this.life / this.maxLife;
      const [r,g,b] = this.col;
      const tailX = this.x - this.vx * (this.len / 14);
      const tailY = this.y - this.vy * (this.len / 14);
      const grad  = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(1, `rgba(255,255,255,${fade * 0.95})`);
      ctx.save();
      ctx.shadowBlur  = 12;
      ctx.shadowColor = `rgba(${r},${g},${b},${fade})`;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  /* Populate */
  const BIG_COUNT = 30, SMALL_COUNT = 160;
  for (let i = 0; i < BIG_COUNT; i++)   particles.push(new Star(true));
  for (let i = 0; i < SMALL_COUNT; i++) particles.push(new Star(false));
  for (let i = 0; i < 4; i++) shootingStars.push(new ShootingStar());

  /* Shooting star scheduler */
  let nextShoot = 120;

  /* Connection lines (only small nearby stars) */
  function drawLines() {
    const small = particles.slice(BIG_COUNT);
    for (let i = 0; i < small.length; i++) {
      for (let j = i + 1; j < small.length; j++) {
        const dx = small[i].x - small[j].x;
        const dy = small[i].y - small[j].y;
        const dist = dx*dx + dy*dy;
        if (dist < 8100) { /* 90px */
          const alpha = (1 - Math.sqrt(dist) / 90) * 0.18;
          ctx.beginPath();
          ctx.moveTo(small[i].x, small[i].y);
          ctx.lineTo(small[j].x, small[j].y);
          ctx.strokeStyle = `rgba(124,58,237,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    t++;

    /* Shooting stars */
    if (t >= nextShoot) {
      const ss = shootingStars.find(s => !s.active);
      if (ss) { ss.spawn(); nextShoot = t + Math.floor(Math.random() * 200 + 150); }
    }

    drawLines();
    particles.forEach(p => { p.update(); p.draw(); });
    shootingStars.forEach(s => { s.update(); s.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ─── SCROLL REVEAL ─── */
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay || 0);
      setTimeout(() => entry.target.classList.add('visible'), delay);
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => revealObs.observe(el));

/* ─── COUNTER ANIMATION ─── */
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const duration = 1800;
  const start = performance.now();
  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    el.textContent = Math.floor(ease * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

const counters = document.querySelectorAll('.count');
const counterObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      counterObs.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
counters.forEach(c => counterObs.observe(c));

/* ─── MAGNETIC BUTTONS ─── */
document.querySelectorAll('.magnetic').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top  - rect.height / 2;
    btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

/* ─── 3D CARD TILT ─── */
document.querySelectorAll('.service-card, .pricing-card, .testimonial').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) translateY(-6px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
  });
  card.addEventListener('mouseenter', () => {
    card.style.transition = 'transform 0.1s';
  });
});

/* ─── CONTACT FORM ─── */
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn       = document.getElementById('submit-btn');
    const btnText   = btn.querySelector('.btn-text');
    const btnSuccess = btn.querySelector('.btn-success');
    const errEl     = document.getElementById('form-error');

    btn.disabled = true;
    btnText.textContent = 'Sending…';
    errEl.style.display = 'none';

    try {
      const data = Object.fromEntries(new FormData(form));
      const res  = await fetch('https://api.web3forms.com/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        btn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
        btnText.style.display  = 'none';
        btnSuccess.style.display = 'block';
        form.reset();
        setTimeout(() => {
          btn.disabled = false;
          btn.style.background = '';
          btnText.textContent  = 'Send It 🚀';
          btnText.style.display = 'block';
          btnSuccess.style.display = 'none';
        }, 4000);
      } else {
        throw new Error(json.message || 'Submission failed');
      }
    } catch (err) {
      btn.disabled = false;
      btnText.textContent = 'Send It 🚀';
      errEl.textContent   = 'Something went wrong. Please email us at biz@solvvai.com';
      errEl.style.display = 'block';
    }
  });
}

/* ─── CURRENCY TOGGLE ─── */
(function initCurrencyToggle() {
  const toggle = document.getElementById('currency-toggle');
  if (!toggle) return;

  const thumb  = document.getElementById('ctoggle-thumb');
  const track  = toggle.querySelector('.ctoggle-track');
  const btns   = toggle.querySelectorAll('.ctoggle-btn');
  const prices = document.querySelectorAll('.plan-price[data-usd]');

  const bookLinks = document.querySelectorAll('.plan-book-call');

  let current = 'usd';

  function switchTo(currency) {
    if (currency === current) return;
    current = currency;

    btns.forEach(b => b.classList.toggle('active', b.dataset.currency === currency));
    thumb.classList.toggle('inr', currency === 'inr');
    track.classList.toggle('inr', currency === 'inr');

    prices.forEach(el => {
      el.classList.add('flipping');
      setTimeout(() => {
        el.textContent = currency === 'inr' ? el.dataset.inr : el.dataset.usd;
        el.classList.remove('flipping');
      }, 175);
    });

  }

  // Click on either button
  btns.forEach(btn => {
    btn.addEventListener('click', () => switchTo(btn.dataset.currency));
  });

  // Click on the track itself also toggles
  track.addEventListener('click', () => switchTo(current === 'usd' ? 'inr' : 'usd'));
})();

/* ─── CALENDLY POPUP ─── */
const CALENDLY_URL = 'https://calendly.com/biz-solvvai/30min';

document.querySelectorAll('.calendly-trigger').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    if (window.Calendly) {
      Calendly.initPopupWidget({ url: CALENDLY_URL });
    } else {
      window.open(CALENDLY_URL, '_blank');
    }
  });
});

/* ─── SMOOTH SCROLL FOR ANCHORS ─── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  });
});

/* ─── ACTIVE NAV HIGHLIGHT ─── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = link.getAttribute('href') === '#' + entry.target.id ? '#fff' : '';
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => sectionObs.observe(s));

/* ─── PARALLAX ORBS ─── */
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  document.querySelectorAll('.orb').forEach((orb, i) => {
    const speed = [0.08, 0.12, 0.06][i] || 0.1;
    orb.style.transform = `translateY(${scrollY * speed}px)`;
  });
});

/* ─── FAQ ACCORDION ─── */
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const answer = btn.nextElementSibling;
    const isOpen = btn.getAttribute('aria-expanded') === 'true';

    /* Close all others */
    document.querySelectorAll('.faq-q[aria-expanded="true"]').forEach(other => {
      if (other !== btn) {
        other.setAttribute('aria-expanded', 'false');
        other.nextElementSibling.classList.remove('open');
      }
    });

    btn.setAttribute('aria-expanded', String(!isOpen));
    answer.classList.toggle('open', !isOpen);
  });
});

/* ─── MOBILE STICKY BAR ─── */
const stickyBar = document.getElementById('mobile-sticky-bar');
if (stickyBar) {
  const heroSection = document.querySelector('.hero');
  const showThreshold = heroSection ? heroSection.offsetHeight * 0.8 : 400;
  let dismissed = false;

  // Mobile: scroll-based show/hide
  window.addEventListener('scroll', () => {
    if (dismissed) return;
    stickyBar.classList.toggle('visible', window.scrollY > showThreshold);
  }, { passive: true });

  // All screens: show after 10s if not already dismissed
  setTimeout(() => {
    if (!dismissed) {
      stickyBar.classList.add('timed', 'visible');
    }
  }, 10000);

  // Dismiss button (desktop)
  const closeBtn = document.getElementById('msb-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      dismissed = true;
      stickyBar.classList.remove('visible');
      setTimeout(() => stickyBar.classList.remove('timed'), 400);
    });
  }
}

/* ─── GLITCH HOVER RE-TRIGGER ─── */
const glitchEl = document.querySelector('.glitch');
if (glitchEl) {
  setInterval(() => {
    glitchEl.style.animation = 'none';
    void glitchEl.offsetWidth;
    glitchEl.style.animation = '';
  }, 5000);
}
