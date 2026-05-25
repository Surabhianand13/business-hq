// Solvv AI — Blog JS
(function () {
  // ─── Reading Progress Bar ───
  const bar = document.getElementById('reading-progress');
  if (bar) {
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
    }, { passive: true });
  }

  // ─── Custom Cursor ───
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursor-follower');
  if (cursor && follower) {
    let mx = 0, my = 0, fx = 0, fy = 0;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; cursor.style.left = mx + 'px'; cursor.style.top = my + 'px'; });
    (function animateFollower() {
      fx += (mx - fx) * 0.12; fy += (my - fy) * 0.12;
      follower.style.left = fx + 'px'; follower.style.top = fy + 'px';
      requestAnimationFrame(animateFollower);
    })();
  }

  // ─── Nav Scroll Effect ───
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  // ─── Calendly Triggers ───
  document.querySelectorAll('.calendly-trigger').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      if (window.Calendly) {
        Calendly.initPopupWidget({ url: 'https://calendly.com/solvvai/discovery' });
      } else {
        window.open('https://calendly.com/solvvai/discovery', '_blank');
      }
    });
  });

  // ─── Active TOC Link on Scroll ───
  const tocLinks = document.querySelectorAll('.toc-list a');
  if (tocLinks.length) {
    const headings = Array.from(document.querySelectorAll('.prose h2[id]'));
    window.addEventListener('scroll', () => {
      let current = '';
      headings.forEach(h => { if (window.scrollY >= h.offsetTop - 120) current = h.id; });
      tocLinks.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
      });
    }, { passive: true });
  }

  // ─── Reveal on Scroll ───
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  }
})();
