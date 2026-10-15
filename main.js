const CONFIG = {
  FORM_URL: 'https://forms.gle/Xu1t3ecmrYcabD8x8', // 구글폼 신청 링크
  TEMPLATE_URL: 'https://drive.google.com/drive/folders/1yP8RwNqN8BOABiFggjJmJ1x-6mqCjSlS?usp=drive_link', // 사업계획서·발표자료 양식 링크
  CONTACT: 'openharbor2026@gmail.com',
  DEADLINE: '2026-10-28T23:59:59+09:00',
};

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const vertical = window.matchMedia('(max-width: 959px)');
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  /* ----- 날짜 (한국 시간 기준) ----- */
  const kstDay = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date);
  const dayNumber = (ymd) => Date.UTC(...ymd.split('-').map((n, i) => (i === 1 ? n - 1 : +n))) / 86400000;
  const today = kstDay(new Date());

  /* ----- CONFIG 주입 ----- */
  $$('[data-config]').forEach((el) => {
    const key = el.dataset.config;
    const value = CONFIG[key];
    if (key === 'CONTACT') {
      el.textContent = value;
      el.href = `mailto:${value}`;
      return;
    }
    if (value) {
      el.href = value;
      el.target = '_blank';
      el.rel = 'noopener';
    } else {
      el.removeAttribute('href');
      el.removeAttribute('download');
      el.setAttribute('aria-disabled', 'true');
      el.classList.add('is-disabled');
      if (el.dataset.emptyText) el.textContent = el.dataset.emptyText;
    }
  });

  /* ----- 신청 마감 D-n ----- */
  const dday = $('#dday');
  if (dday) {
    const deadline = new Date(CONFIG.DEADLINE);
    const left = dayNumber(kstDay(deadline)) - dayNumber(today);
    if (Date.now() > deadline.getTime()) {
      dday.textContent = '신청 마감';
    } else {
      dday.textContent = left === 0 ? 'D-DAY' : `D-${left}`;
      dday.setAttribute('aria-label', left === 0 ? '오늘 마감' : `마감까지 ${left}일`);
    }
    dday.hidden = false;
  }

  /* ----- 일정: 지난 날짜, 다음 일정 ----- */
  const timeline = $('#timeline');
  const fill = $('#timeline-fill');
  const track = timeline && timeline.querySelector('.timeline__track');
  const items = $$('.tl');
  let passedCount = 0;
  let nextMarked = false;
  items.forEach((li) => {
    if (li.dataset.date < today) {
      li.classList.add('is-past');
      passedCount += 1;
    } else if (!nextMarked) {
      li.classList.add('is-next');
      nextMarked = true;
    }
  });

  // 점 위치를 재서 진행선의 길이와 점별 위치(0~1)를 정한다
  let dotStops = [];
  let lineStart = 0;
  let lineLength = 1;
  function measureTimeline() {
    if (!timeline) return;
    const base = timeline.getBoundingClientRect();
    const centers = items.map((li) => {
      const r = li.querySelector('.tl__dot').getBoundingClientRect();
      return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
    });
    const first = centers[0];
    const last = centers[centers.length - 1];
    const isVertical = vertical.matches;
    lineStart = isVertical ? first.y : first.x;
    lineLength = Math.max(1, (isVertical ? last.y : last.x) - lineStart);
    dotStops = centers.map((c) => ((isVertical ? c.y : c.x) - lineStart) / lineLength);
    Object.assign(track.style, isVertical
      ? { left: `${first.x - 3}px`, top: `${first.y}px`, width: '6px', height: `${lineLength}px` }
      : { left: `${first.x}px`, top: `${first.y - 3}px`, width: `${lineLength}px`, height: '6px' });
  }

  function paintTimeline(progress) {
    fill.style.transform = vertical.matches ? `scaleY(${progress})` : `scaleX(${progress})`;
    items.forEach((li, i) => li.classList.toggle('is-reached', progress > 0 && dotStops[i] <= progress + 0.001));
  }

  /* ----- 스크롤 등장 ----- */
  $$('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, i) => child.style.setProperty('--i', i));
  });
  $$('[data-band] .band__list li').forEach((li, i) => li.style.setProperty('--i', i));

  const revealTargets = $$('[data-reveal], [data-stagger], [data-band], .divider');
  const reveal = (el) => {
    el.classList.add('is-in');
    if (el.hasAttribute('data-stagger')) {
      const total = 500 + el.children.length * 80;
      setTimeout(() => el.classList.add('is-done'), total);
    }
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach(reveal);
  }

  /* ----- 모바일 하단 신청 버튼 ----- */
  const mobileCta = $('#mobile-cta');
  const heroCta = $('#hero-cta');
  const applySection = $('#apply');
  const ctaState = { heroVisible: true, applyVisible: false };
  const syncMobileCta = () => {
    const show = !ctaState.heroVisible && !ctaState.applyVisible;
    mobileCta.classList.toggle('is-shown', show);
    mobileCta.toggleAttribute('inert', !show);
  };
  if ('IntersectionObserver' in window && mobileCta) {
    new IntersectionObserver(([entry]) => {
      ctaState.heroVisible = entry.isIntersecting;
      syncMobileCta();
    }).observe(heroCta);
    new IntersectionObserver(([entry]) => {
      ctaState.applyVisible = entry.isIntersecting;
      syncMobileCta();
    }).observe(applySection);
  }
  syncMobileCta();

  /* ----- 평가 탭 ----- */
  const tabs = $$('[role="tab"]');
  const selectTab = (tab, focus) => {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      // 두 패널은 같은 칸에 겹쳐 있어 높이가 같고, 보이는 쪽만 바뀐다
      document.getElementById(t.getAttribute('aria-controls')).classList.toggle('is-active', selected);
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (step) selectTab(tabs[(i + step + tabs.length) % tabs.length], true);
      if (e.key === 'Home') selectTab(tabs[0], true);
      if (e.key === 'End') selectTab(tabs[tabs.length - 1], true);
    });
  });

  /* ----- 펼침: 같은 줄의 다른 칸은 원래 높이 유지 ----- */
  // 칸들은 평소 같은 높이로 늘어나 있다. 하나를 펼치기 직전에 지금 높이를 고정해
  // 펼친 칸만 길어지게 하고, 모두 접히면 고정을 푼다.
  const lockable = '.grid, .tabs__panel';
  const unlock = (row) => {
    row.classList.remove('is-locked');
    Array.from(row.children).forEach((child) => { child.style.minHeight = ''; });
  };
  $$(`:is(${lockable}) details`).forEach((details) => {
    const row = details.closest(lockable);
    details.querySelector('summary').addEventListener('click', () => {
      if (details.open || row.classList.contains('is-locked')) return;
      const heights = Array.from(row.children).map((child) => child.offsetHeight);
      Array.from(row.children).forEach((child, i) => { child.style.minHeight = `${heights[i]}px`; });
      row.classList.add('is-locked');
    });
    details.addEventListener('toggle', () => {
      if (!details.open && !row.querySelector('details[open]')) unlock(row);
    });
  });
  window.addEventListener('resize', () => $$('.is-locked').forEach(unlock));

  /* ----- 스크롤에 반응하는 요소 ----- */
  const topbar = $('#topbar');
  const progressBar = $('#progress-bar');
  const hero = $('.hero');
  const heroCopy = $('#hero-copy');
  const heroArt = $('#hero-art');
  const heroSky = $('#hero-sky');
  const navLinks = $$('.nav a');
  const navTargets = ['overview', 'tracks', 'benefits', 'schedule', 'program', 'evaluation', 'apply', 'day', 'faq', 'english']
    .map((id) => document.getElementById(id));

  let ticking = false;
  function update() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight - vh;
    const heroH = hero.offsetHeight;
    const motion = !reduceMotion.matches;

    // 진행 바, 상단 바
    progressBar.style.transform = `scaleX(${docH > 0 ? clamp(y / docH) : 0})`;
    topbar.classList.toggle('is-solid', y > heroH - topbar.offsetHeight);

    // 현재 섹션 앵커 밑줄
    const line = vh * 0.3;
    const current = navTargets.find((s) => {
      const r = s.getBoundingClientRect();
      return r.top <= line && r.bottom > line;
    });
    navLinks.forEach((a) => {
      const on = current && a.hash === `#${current.id}`;
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });

    // 히어로 패럴랙스
    if (motion && y < heroH) {
      const scale = heroArt.offsetWidth / 900;
      heroCopy.style.transform = `translate3d(0, ${-y * 0.18}px, 0)`;
      heroCopy.style.opacity = String(1 - 0.7 * clamp(y / (heroH * 0.6)));
      heroArt.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
      heroSky.style.transform = `translate(0px, ${(y * 0.12) / scale}px)`;
    } else if (!motion) {
      heroCopy.style.transform = heroCopy.style.opacity = heroArt.style.transform = heroSky.style.transform = '';
    }

    // 일정 진행선
    if (timeline) {
      let progress;
      if (!motion) {
        progress = passedCount ? dotStops[passedCount - 1] : 0;
      } else if (vertical.matches) {
        const top = timeline.getBoundingClientRect().top + lineStart;
        progress = clamp((vh * 0.6 - top) / lineLength);
      } else {
        const top = timeline.getBoundingClientRect().top;
        progress = clamp((vh * 0.85 - top) / (vh * 0.5));
      }
      paintTimeline(progress);
    }
  }
  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  };
  const remeasure = () => {
    measureTimeline();
    requestUpdate();
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', remeasure);
  reduceMotion.addEventListener('change', requestUpdate);
  vertical.addEventListener('change', remeasure);
  if (document.fonts) document.fonts.ready.then(remeasure);
  window.addEventListener('load', remeasure);
  remeasure();
})();
