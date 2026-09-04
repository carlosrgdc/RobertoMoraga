(() => {
  document.documentElement.classList.add("js-motion");

  const pageLanguage = document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "es";
  const textByLanguage = {
    es: {
      defaultSubmit: "Enviar solicitud",
      endpointUnavailable:
        "El servidor no está procesando la API del formulario. Si estás probando en local, abre la web con Flask o Apache, no con un servidor estático.",
      mapUnavailable: "Mapa no disponible temporalmente",
      phoneDigitsOnly: "El número solo puede contener dígitos, sin espacios, guiones ni letras.",
      phoneExactLength: "El número para {country} debe tener {length} dígitos.",
      phoneRangeLength: "El número para {country} debe tener entre {min} y {max} dígitos.",
      phoneRequired: "Indica tu número de teléfono.",
      sendingLabel: "Enviando...",
      sendingStatus: "Enviando solicitud...",
      callbackSendingStatus: "Enviando registro...",
      submitError: "No se ha podido enviar la solicitud.",
      submitSuccess: "Solicitud recibida. Nos pondremos en contacto contigo pronto.",
      callbackSuccess: "Recibido!\nMuchas gracias por confiar en Roberto Moraga",
    },
    en: {
      defaultSubmit: "Send request",
      endpointUnavailable:
        "The server is not processing the form API. If you are testing locally, open the site with Flask or Apache, not a static server.",
      mapUnavailable: "Map temporarily unavailable",
      phoneDigitsOnly: "The number can only contain digits, without spaces, hyphens or letters.",
      phoneExactLength: "The number for {country} must have {length} digits.",
      phoneRangeLength: "The number for {country} must have between {min} and {max} digits.",
      phoneRequired: "Enter your phone number.",
      sendingLabel: "Sending...",
      sendingStatus: "Sending request...",
      callbackSendingStatus: "Sending registration...",
      submitError: "We could not send the request.",
      submitSuccess: "Request received. We will contact you soon.",
      callbackSuccess: "Received!\nThank you for trusting Roberto Moraga",
    },
  };
  const copy = textByLanguage[pageLanguage];
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileCarouselQuery = window.matchMedia("(max-width: 768px)");
  const phoneCountryRules = {
    "+34": { country: { es: "España", en: "Spain" }, min: 9, max: 9 },
    "+351": { country: { es: "Portugal", en: "Portugal" }, min: 9, max: 9 },
    "+33": { country: { es: "Francia", en: "France" }, min: 9, max: 9 },
    "+44": { country: { es: "Reino Unido", en: "United Kingdom" }, min: 10, max: 10 },
    "+49": { country: { es: "Alemania", en: "Germany" }, min: 7, max: 12 },
    "+39": { country: { es: "Italia", en: "Italy" }, min: 6, max: 11 },
    "+376": { country: { es: "Andorra", en: "Andorra" }, min: 6, max: 6 },
  };

  function languageOverride() {
    const params = new URLSearchParams(window.location.search);
    const lang = (params.get("lang") || "").trim().toLowerCase();
    return lang === "en" || lang === "es" ? lang : "";
  }

  function localeHasSpainRegion(locale) {
    const parts = String(locale || "").split(/[-_]/);
    return parts.slice(1).some((part) => part.toUpperCase() === "ES");
  }

  function isLikelySpainVisitor() {
    const spanishTimeZones = new Set(["Europe/Madrid", "Atlantic/Canary", "Africa/Ceuta"]);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];

    return spanishTimeZones.has(timeZone) || languages.some(localeHasSpainRegion);
  }

  function redirectForVisitorLanguage() {
    const currentFile = window.location.pathname.split("/").pop().toLowerCase();
    const isEnglishPage = currentFile === "index-en.html";
    const targetLanguage = languageOverride() || (isLikelySpainVisitor() ? "es" : "en");

    if (targetLanguage === "en" && !isEnglishPage) {
      const targetUrl = new URL("index-en.html", window.location.href);
      targetUrl.search = window.location.search;
      targetUrl.hash = window.location.hash;
      window.location.replace(targetUrl);
      return true;
    }

    if (targetLanguage === "es" && isEnglishPage) {
      const targetUrl = new URL("index.html", window.location.href);
      targetUrl.search = window.location.search;
      targetUrl.hash = window.location.hash;
      window.location.replace(targetUrl);
      return true;
    }

    return false;
  }

  if (redirectForVisitorLanguage()) {
    return;
  }

  const forms = Array.from(document.querySelectorAll("[data-contact-form]"));
  const categorySelect = document.querySelector("[data-category-select]");
  const profileLinks = Array.from(document.querySelectorAll("[data-profile-link]"));
  const formPanels = Array.from(document.querySelectorAll("[data-form-panel]"));
  const mapSvg = document.querySelector(".iberia-map");
  const provinceInputs = Array.from(document.querySelectorAll("[data-location-province]"));
  const siteHeader = document.querySelector(".site-header");
  const contactSection = document.getElementById("contacto");
  const floatingWhatsapp = document.querySelector("[data-floating-whatsapp]");
  const modelSection = document.getElementById("modelo");
  const modelNavLink = document.querySelector('.top-nav a[href="#modelo"]');
  const caseCarousels = Array.from(document.querySelectorAll("[data-case-carousel]"));
  const heroTitle = document.querySelector(".hero h1");
  const heroPhoto = document.querySelector(".hero-photo");
  const clickTrackSelector = ".profile-card, .case-cover, .case-nav, .button, .whatsapp-button, .floating-whatsapp, .top-nav a, .language-toggle a";
  const scrollThresholds = [25, 50, 75, 90];
  const seenScrollThresholds = new Set();
  const hasForms = forms.length > 0;
  const seenMarkerEvents = new Set();

  let locationsPromise = null;
  let provinceStatusConfigPromise = null;
  let scrollTicking = false;
  let formSwitchTimer = null;

  function normalizeText(value) {
    return (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function pushTrackingEvent(eventName, params = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      page_path: window.location.pathname,
      page_title: document.title,
      ...params,
    });
  }

  function pushTrackingEventOnce(eventName, markerKey, params = {}) {
    const key = `${eventName}:${markerKey}`;
    if (seenMarkerEvents.has(key)) {
      return;
    }

    seenMarkerEvents.add(key);
    pushTrackingEvent(eventName, params);
  }

  function pushWhatsAppTrackingEvent(params = {}) {
    pushTrackingEvent("roberto_moraga_whatsapp_click", params);
    pushTrackingEvent("whatsapp_click", params);
  }

  function elementText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function sectionLabel(element) {
    const labelNode = element?.querySelector?.(".eyebrow, h1, h2, h3");
    return elementText(labelNode?.textContent || "");
  }

  function isWhatsAppLink(element, href = "") {
    return Boolean(
      element.classList.contains("whatsapp-button") ||
        element.classList.contains("floating-whatsapp") ||
        (href && href.includes("wa.me")),
    );
  }

  function inferClickType(element, href = "") {
    if (isWhatsAppLink(element, href)) {
      return "whatsapp_button";
    }
    if (element.classList.contains("profile-card")) {
      return "profile_card";
    }
    if (element.classList.contains("case-cover")) {
      return "case_card";
    }
    if (element.classList.contains("case-nav")) {
      return "case_navigation";
    }
    if (element.classList.contains("case-detail-link")) {
      return "case_project_link";
    }
    if (element.classList.contains("whatsapp-button")) {
      return "whatsapp_button";
    }
    if (element.classList.contains("floating-whatsapp")) {
      return "whatsapp_float";
    }
    if (element.closest(".language-toggle")) {
      return "language_toggle";
    }
    if (element.closest(".top-nav")) {
      return "header_nav";
    }
    if (element.classList.contains("button")) {
      return "button";
    }
    return "click";
  }

  function trackClickEvent(element) {
    const clickId = element.dataset.analyticsId || element.id || "";
    const label =
      elementText(element.getAttribute("aria-label")) ||
      elementText(element.dataset.profileLink) ||
      elementText(element.textContent);
    const nearestSection = element.closest("section[id]");
    const href = element.tagName === "A" ? element.getAttribute("href") || "" : "";

    pushTrackingEvent("roberto_moraga_click", {
      click_type: inferClickType(element, href),
      click_text: label.slice(0, 120),
      click_id: clickId,
      click_class: element.className || "",
      click_href: href,
      click_section: nearestSection?.id || "",
    });
  }

  function trackIntentMarker(element) {
    const clickId = element.dataset.analyticsId || element.id || "";
    const href = element.tagName === "A" ? element.getAttribute("href") || "" : "";
    const label =
      elementText(element.getAttribute("aria-label")) ||
      elementText(element.dataset.profileLink) ||
      elementText(element.textContent);
    const nearestSection = element.closest("section[id]");
    const clickSection = nearestSection?.id || "";
    const withinHero = Boolean(element.closest(".hero"));
    const withinPageHero = Boolean(element.closest(".page-hero"));
    const isFloatingWhatsapp = element.classList.contains("floating-whatsapp");
    const isWhatsapp = isWhatsAppLink(element, href);
    const ctaLocation = isFloatingWhatsapp ? "floating" : withinHero ? "hero" : withinPageHero ? "page_hero" : clickSection || "page";

    if (isWhatsapp) {
      pushWhatsAppTrackingEvent({
        click_type: "whatsapp_button",
        click_text: label.slice(0, 120),
        click_href: href,
        click_section: clickSection,
        whatsapp_location: ctaLocation,
        click_id: clickId,
      });

      if (withinHero) {
        pushTrackingEvent("roberto_moraga_hero_cta_click", {
          click_text: label.slice(0, 120),
          click_href: href,
          click_section: clickSection,
          cta_type: "whatsapp",
          cta_location: ctaLocation,
          click_id: clickId,
        });
      }

      return;
    }

    if (element.classList.contains("button") && withinHero) {
      pushTrackingEvent("roberto_moraga_hero_cta_click", {
        click_text: label.slice(0, 120),
        click_href: href,
        click_section: clickSection,
        cta_type: "button",
        cta_location: ctaLocation,
        click_id: clickId,
      });
      return;
    }

    if (element.classList.contains("profile-card")) {
      pushTrackingEvent("roberto_moraga_route_intent", {
        click_text: label.slice(0, 120),
        click_href: href,
        click_section: clickSection,
        route_key: element.dataset.profileLink || "",
      });
      return;
    }

    if (element.classList.contains("case-detail-link")) {
      pushTrackingEvent("roberto_moraga_project_open", {
        click_text: label.slice(0, 120),
        click_href: href,
        click_section: clickSection,
        browse_reason: "detail_link",
        project_title: element.dataset.caseTitle || "",
        project_city: element.dataset.caseCity || "",
        project_model: element.dataset.caseModel || "",
        project_url: href,
      });
      return;
    }

    if (element.closest(".top-nav")) {
      pushTrackingEvent("roberto_moraga_navigation_intent", {
        click_text: label.slice(0, 120),
        click_href: href,
        click_section: clickSection,
        nav_area: "top",
      });
      return;
    }

    if (element.closest(".language-toggle")) {
      pushTrackingEvent("roberto_moraga_language_switch", {
        click_text: label.slice(0, 120),
        click_href: href,
        click_section: clickSection,
        target_language: href.includes("index-en") ? "en" : "es",
      });
    }
  }

  function trackSectionView(sectionName, element) {
    pushTrackingEventOnce("roberto_moraga_section_view", sectionName, {
      section_name: sectionName,
      section_id: element.id || "",
      section_label: sectionLabel(element),
      page_language: pageLanguage,
    });
  }

  function currentScrollPercent() {
    const doc = document.documentElement;
    const body = document.body;
    const viewport = window.innerHeight || doc.clientHeight || 0;
    const pageHeight = Math.max(doc.scrollHeight, body.scrollHeight);
    const maxScrollable = Math.max(pageHeight - viewport, 1);
    const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
    return Math.min(100, Math.max(0, Math.round((scrollTop / maxScrollable) * 100)));
  }

  function trackScrollDepth() {
    const percent = currentScrollPercent();
    scrollThresholds.forEach((threshold) => {
      if (percent >= threshold && !seenScrollThresholds.has(threshold)) {
        seenScrollThresholds.add(threshold);
        pushTrackingEvent("roberto_moraga_scroll_depth", {
          scroll_percent: threshold,
        });
      }
    });
  }

  function scheduleScrollTracking() {
    if (scrollTicking) {
      return;
    }
    scrollTicking = true;
    window.requestAnimationFrame(() => {
      trackScrollDepth();
      syncFloatingWhatsappVisibility();
      syncMotionOnScroll();
      scrollTicking = false;
    });
  }

  function syncMotionOnScroll() {
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

    if (siteHeader) {
      siteHeader.classList.toggle("is-scrolled", scrollY > 18);
    }

    if (heroPhoto && !reduceMotionQuery.matches) {
      const shift = Math.min(44, Math.max(0, scrollY * 0.08));
      heroPhoto.style.setProperty("--hero-shift", `${shift}px`);
    }
  }

  function splitHeroTitle() {
    if (!heroTitle || heroTitle.dataset.motionReady === "true") {
      return;
    }

    const title = heroTitle.textContent.trim();
    if (!title) {
      return;
    }

    heroTitle.dataset.motionReady = "true";
    heroTitle.setAttribute("aria-label", title);
    heroTitle.textContent = "";

    let wordIndex = 0;
    title.split(/(\s+)/).forEach((token) => {
      if (!token) {
        return;
      }

      if (/^\s+$/.test(token)) {
        heroTitle.appendChild(document.createTextNode(token));
        return;
      }

      const span = document.createElement("span");
      span.className = "hero-title-word";
      if (token.toLowerCase() === "gratis" || token.toLowerCase() === "free") {
        span.classList.add("brand-highlight-free");
      }
      span.style.setProperty("--word-index", String(wordIndex));
      span.setAttribute("aria-hidden", "true");
      span.textContent = token;
      heroTitle.appendChild(span);
      wordIndex += 1;
    });
  }

  function initRevealMotion() {
    splitHeroTitle();

    const revealGroups = [
      { selector: ".section-heading", type: "fade-up", stagger: 60 },
      { selector: ".intro-grid article", type: "fade-up", stagger: 90 },
      { selector: ".case-carousel", type: "fade-up", stagger: 0 },
      { selector: ".concept-card", type: "fade-up", stagger: 45 },
      { selector: ".band-inner", type: "clip", stagger: 0 },
      { selector: ".pathway", type: "slide-right", stagger: 85 },
      { selector: ".map-panel", type: "slide-left", stagger: 0 },
      { selector: ".city-copy", type: "slide-right", stagger: 0 },
      { selector: ".contact-copy", type: "slide-left", stagger: 0 },
      { selector: ".contact-form", type: "fade-up", stagger: 0 },
      { selector: ".site-footer > span", type: "fade-up", stagger: 80 },
    ];

    const revealTargets = [];
    revealGroups.forEach(({ selector, type, stagger }) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        element.dataset.reveal = type;
        element.style.setProperty("--reveal-delay", `${Math.min(index * stagger, 360)}ms`);
        revealTargets.push(element);
      });
    });

    if (reduceMotionQuery.matches || !("IntersectionObserver" in window)) {
      revealTargets.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    function revealVisibleTargets() {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      revealTargets.forEach((element) => {
        if (element.hidden || element.classList.contains("is-visible")) {
          return;
        }

        const rect = element.getBoundingClientRect();
        if (rect.top < viewportHeight * 0.94 && rect.bottom > 0) {
          element.classList.add("is-visible");
        }
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.16,
      },
    );

    revealTargets.forEach((element) => observer.observe(element));
    window.requestAnimationFrame(revealVisibleTargets);
    window.setTimeout(revealVisibleTargets, 420);
    window.addEventListener("hashchange", () => window.setTimeout(revealVisibleTargets, 120));
  }

  function caseSlotForIndex(index, activeIndex, total) {
    let slot = index - activeIndex;
    if (slot > total / 2) slot -= total;
    if (slot < -total / 2) slot += total;
    return slot;
  }

  function primeCaseCarouselStage(stage) {
    const cards = Array.from(stage?.querySelectorAll("[data-case-card]") || []);
    if (!cards.length) {
      return;
    }

    cards.forEach((card, index) => {
      card.dataset.slot = String(caseSlotForIndex(index, 0, cards.length));
      card.classList.toggle("is-active", index === 0);
      card.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    });
  }

  function primeCaseCarouselLayout() {
    caseCarousels.forEach((carousel) => {
      primeCaseCarouselStage(carousel.querySelector(".case-stage"));
    });
  }

  function createCaseCard(project, index = 0) {
    const card = document.createElement("button");
    card.className = "case-cover";
    card.type = "button";
    card.dataset.caseCard = "";
    card.dataset.caseSection = project.section || "";
    card.dataset.caseTitle = project.title || "";
    card.dataset.caseCity = project.city || "";
    card.dataset.caseModel = project.carousel?.model || "";
    card.dataset.caseUrl = project.projectUrl || "";
    card.dataset.caseReform = project.carousel?.reform || "";
    card.dataset.caseEconomics = project.carousel?.economics || "";

    const image = document.createElement("img");
    image.src = project.coverUrl || "";
    image.alt = project.coverAlt || project.title || "";
    image.loading = index === 0 ? "eager" : "lazy";

    const meta = document.createElement("span");
    meta.className = "case-listing-meta";

    const section = document.createElement("small");
    section.className = "case-section";
    section.textContent = project.section || "";

    const title = document.createElement("strong");
    title.textContent = project.title || "";

    const price = document.createElement("span");
    price.className = "case-price";
    price.textContent = project.priceLabel || "";

    const stats = document.createElement("span");
    stats.className = "case-stats";
    stats.setAttribute("aria-label", pageLanguage === "en" ? "Key data" : "Datos clave");

    (Array.isArray(project.carousel?.stats) ? project.carousel.stats : []).forEach((stat) => {
      const small = document.createElement("small");
      small.textContent = stat;
      stats.appendChild(small);
    });

    meta.append(section, title, price, stats);
    card.append(image, meta);
    return card;
  }

  function renderProjectCatalog(projects) {
    caseCarousels.forEach((carousel) => {
      const stage = carousel.querySelector(".case-stage");
      const controls = carousel.querySelector(".case-controls");
      if (!stage || !controls) {
        return;
      }

      const cards = projects.map((project, index) => createCaseCard(project, index));
      stage.replaceChildren(...cards, controls);
      primeCaseCarouselStage(stage);
    });
  }

  async function loadProjectCatalogs() {
    if (!caseCarousels.length) {
      return false;
    }

    try {
      const response = await fetch(`./api/projects.php?lang=${pageLanguage}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload.projects) || !payload.projects.length) {
        return false;
      }

      renderProjectCatalog(payload.projects);
      return true;
    } catch (error) {
      console.warn("No se pudo cargar el catálogo de proyectos", error);
      return false;
    }
  }

  function initCaseCarousels() {
    caseCarousels.forEach((carousel) => {
      const cards = Array.from(carousel.querySelectorAll("[data-case-card]"));
      const stage = carousel.querySelector(".case-stage");
      const detail = carousel.querySelector(".case-detail");
      const previousButton = carousel.querySelector("[data-case-prev]");
      const nextButton = carousel.querySelector("[data-case-next]");
      if (!cards.length || !detail) {
        return;
      }

      const fields = {
        section: detail.querySelector("[data-case-section]"),
        title: detail.querySelector("[data-case-title]"),
        model: detail.querySelector("[data-case-model]"),
        reform: detail.querySelector("[data-case-reform]"),
        economics: detail.querySelector("[data-case-economics]"),
        link: detail.querySelector("[data-case-link]"),
      };
      let activeIndex = 0;
      let pointerId = null;
      let pointerStartX = 0;
      let pointerStartY = 0;
      let swipeSource = "";
      let ignoreClickUntil = 0;

      function slotFor(index) {
        return caseSlotForIndex(index, activeIndex, cards.length);
      }

      function trackProjectBrowse(browseReason, card, fromIndex) {
        if (!browseReason || !card) {
          return;
        }

        pushTrackingEvent("roberto_moraga_project_browse", {
          browse_reason: browseReason,
          browse_from_index: fromIndex,
          browse_to_index: activeIndex,
          project_section: card.dataset.caseSection || "",
          project_title: card.dataset.caseTitle || "",
          project_city: card.dataset.caseCity || "",
          project_model: card.dataset.caseModel || "",
          project_url: card.dataset.caseUrl || "",
        });
      }

      function trackProjectOpen(card, openSource) {
        if (!card) {
          return;
        }

        pushTrackingEvent("roberto_moraga_project_open", {
          open_source: openSource,
          project_section: card.dataset.caseSection || "",
          project_title: card.dataset.caseTitle || "",
          project_city: card.dataset.caseCity || "",
          project_model: card.dataset.caseModel || "",
          project_url: card.dataset.caseUrl || "",
        });
      }

      function syncDetail(card) {
        if (fields.section) fields.section.textContent = card.dataset.caseSection || "";
        if (fields.title) fields.title.textContent = card.dataset.caseTitle || "";
        if (fields.model) fields.model.textContent = card.dataset.caseModel || "";
        if (fields.reform) fields.reform.textContent = card.dataset.caseReform || "";
        if (fields.economics) fields.economics.textContent = card.dataset.caseEconomics || "";
        if (fields.link) {
          fields.link.href = card.dataset.caseUrl || "#casos";
        }
      }

      function render() {
        const openProjectLabel = pageLanguage === "en" ? "Open project" : "Abrir proyecto";
        const showProjectLabel = pageLanguage === "en" ? "Show" : "Mostrar";
        cards.forEach((card, index) => {
          const slot = slotFor(index);
          card.dataset.slot = String(slot);
          card.classList.toggle("is-active", index === activeIndex);
          card.setAttribute("aria-pressed", index === activeIndex ? "true" : "false");
          card.setAttribute(
            "aria-label",
            index === activeIndex
              ? `${openProjectLabel} ${card.dataset.caseTitle || ""}`.trim()
              : `${showProjectLabel} ${card.dataset.caseTitle || ""}`.trim(),
          );
        });
        syncDetail(cards[activeIndex]);
      }

      function activate(index, shouldFocus = false, browseReason = "") {
        const previousIndex = activeIndex;
        activeIndex = (index + cards.length) % cards.length;
        render();
        if (browseReason) {
          trackProjectBrowse(browseReason, cards[activeIndex], previousIndex);
        }
        if (shouldFocus) {
          cards[activeIndex].focus({ preventScroll: true });
        }
      }

      function navigateToProject(card) {
        const url = card.dataset.caseUrl;
        if (!url) {
          return;
        }
        trackProjectOpen(card, "active_cover");
        window.location.href = url;
      }

      cards.forEach((card, index) => {
        card.addEventListener("click", (event) => {
          if (performance.now() < ignoreClickUntil) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          if (index === activeIndex) {
            navigateToProject(card);
            return;
          }
          activate(index, false, "card_focus");
        });
      });

      function beginSwipe(x, y, source) {
        if (!mobileCarouselQuery.matches || swipeSource) {
          return false;
        }

        swipeSource = source;
        pointerStartX = x;
        pointerStartY = y;
        return true;
      }

      function finishSwipe(x, y, source, event) {
        if (!mobileCarouselQuery.matches || swipeSource !== source) {
          return;
        }

        const dx = x - pointerStartX;
        const dy = y - pointerStartY;
        swipeSource = "";
        pointerId = null;

        if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy) * 1.2) {
          return;
        }

        event.preventDefault();
        ignoreClickUntil = performance.now() + 420;
        const nextIndex = activeIndex + (dx < 0 ? 1 : -1);
        activate(nextIndex, false, dx < 0 ? "swipe_next" : "swipe_previous");
        pushTrackingEvent("roberto_moraga_case_swipe", {
          direction: dx < 0 ? "next" : "previous",
          project_title: cards[(nextIndex + cards.length) % cards.length]?.dataset.caseTitle || "",
        });
      }

      stage?.addEventListener("pointerdown", (event) => {
        if (!event.isPrimary || event.pointerType === "mouse") {
          return;
        }

        if (!beginSwipe(event.clientX, event.clientY, "pointer")) {
          return;
        }
        pointerId = event.pointerId;
        stage.setPointerCapture?.(event.pointerId);
      });

      stage?.addEventListener("pointerup", (event) => {
        if (pointerId !== event.pointerId) {
          return;
        }

        finishSwipe(event.clientX, event.clientY, "pointer", event);
      });

      stage?.addEventListener("pointercancel", (event) => {
        if (pointerId === event.pointerId) {
          pointerId = null;
          swipeSource = "";
        }
      });

      stage?.addEventListener(
        "touchstart",
        (event) => {
          if (event.touches.length !== 1) {
            return;
          }

          const touch = event.touches[0];
          beginSwipe(touch.clientX, touch.clientY, "touch");
        },
        { passive: true },
      );

      stage?.addEventListener(
        "touchend",
        (event) => {
          const touch = event.changedTouches[0];
          if (!touch) {
            return;
          }

          finishSwipe(touch.clientX, touch.clientY, "touch", event);
        },
        { passive: false },
      );

      stage?.addEventListener("touchcancel", () => {
        if (swipeSource === "touch") {
          swipeSource = "";
        }
      });

      previousButton?.addEventListener("click", () => {
        activate(activeIndex - 1, true, "previous_button");
      });

      nextButton?.addEventListener("click", () => {
        activate(activeIndex + 1, true, "next_button");
      });

      carousel.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          activate(activeIndex - 1, true, "keyboard_left");
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          activate(activeIndex + 1, true, "keyboard_right");
        }
      });

      render();
    });
  }

  function trackPageView() {
    pushTrackingEvent("roberto_moraga_page_view", {
      page_location: window.location.href,
      page_language: pageLanguage,
    });
  }

  function initSectionViewTracking() {
    const targets = [
      { element: document.querySelector(".hero"), name: "hero" },
      { element: document.getElementById("casos"), name: "projects" },
      { element: document.getElementById("ciudades"), name: "zones" },
      { element: document.querySelector(".site-footer"), name: "footer" },
    ].filter(({ element }) => Boolean(element));

    if (!targets.length) {
      return;
    }

    const markSection = ({ element, name }) => {
      trackSectionView(name, element);
    };

    const heroTarget = targets.find(({ name }) => name === "hero");
    if (heroTarget) {
      markSection(heroTarget);
    }

    const observedTargets = targets.filter(({ name }) => name !== "hero");
    if (!observedTargets.length) {
      return;
    }

    if (reduceMotionQuery.matches || !("IntersectionObserver" in window)) {
      observedTargets.forEach(markSection);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          observer.unobserve(entry.target);
          markSection({
            element: entry.target,
            name: entry.target.dataset.sectionMarker || entry.target.id || "section",
          });
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.3,
      },
    );

    observedTargets.forEach(({ element, name }) => {
      element.dataset.sectionMarker = name;
      observer.observe(element);
    });
  }

  function loadLocations() {
    if (locationsPromise) {
      return locationsPromise;
    }

    locationsPromise = fetch("./assets/es_locations.json")
      .then((resp) => (resp.ok ? resp.json() : null))
      .catch(() => null);

    return locationsPromise;
  }

  function loadProvinceStatusConfig() {
    if (provinceStatusConfigPromise) {
      return provinceStatusConfigPromise;
    }

    provinceStatusConfigPromise = fetch("./assets/es-provinces-status.json")
      .then((resp) => (resp.ok ? resp.json() : null))
      .catch(() => null);

    return provinceStatusConfigPromise;
  }

  function normalizeProvinceStatus(value) {
    const status = normalizeText(value);
    if (status === "activa" || status === "active" || status === "activo") {
      return "activa";
    }
    if (
      status === "en_proceso" ||
      status === "en proceso" ||
      status === "en-proceso" ||
      status === "en curso" ||
      status === "in_process" ||
      status === "upcoming" ||
      status === "pending"
    ) {
      return "en_proceso";
    }
    if (status === "inactiva" || status === "inactive" || status === "inactivo") {
      return "inactiva";
    }
    return "inactiva";
  }

  function ensureDatalist(id) {
    let list = document.getElementById(id);
    if (list) {
      return list;
    }

    list = document.createElement("datalist");
    list.id = id;
    document.body.appendChild(list);
    return list;
  }

  function fillDatalist(list, options) {
    const fragment = document.createDocumentFragment();
    options.forEach(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      if (label) {
        option.label = label;
        option.textContent = label;
      }
      fragment.appendChild(option);
    });
    list.replaceChildren(fragment);
  }

  async function initLocationSuggest() {
    if (!provinceInputs.length) {
      return;
    }

    const data = await loadLocations();
    const provinces = Array.isArray(data?.provinces) ? data.provinces : [];
    const municipalitiesByProvince = data?.municipalitiesByProvince || {};

    if (!provinces.length) {
      return;
    }

    const provinceIndex = new Map();
    const provinceAliases = [];

    function addProvinceAlias(alias, province) {
      const key = normalizeText(alias);
      if (!key) {
        return;
      }

      provinceAliases.push({ key, province });
      if (!provinceIndex.has(key)) {
        provinceIndex.set(key, province);
      }
    }

    function resolveProvince(value) {
      const norm = normalizeText(value);
      if (!norm) {
        return null;
      }

      const primaryValue = norm.split("·")[0].trim();
      const exact = provinceIndex.get(norm) || provinceIndex.get(primaryValue);
      if (exact) {
        return exact;
      }

      const partialMatches = provinceAliases.filter(({ key }) => {
        if (key.length < 3 || primaryValue.length < 3) {
          return false;
        }
        return key.startsWith(primaryValue) || primaryValue.startsWith(key);
      });

      return partialMatches.length === 1 ? partialMatches[0].province : null;
    }

    const provinceOptions = provinces.map((entry) => {
      const [cpro, name, normName, _codauto, comunidad] = entry;
      const province = { cpro, name, comunidad };
      if (cpro && normName) {
        addProvinceAlias(normName, province);
        addProvinceAlias(name, province);
        if (name.includes("/")) {
          name.split("/").forEach((alias) => addProvinceAlias(alias, province));
        }
      }
      return {
        value: name,
        label: comunidad ? `${name} · ${comunidad}` : name,
      };
    });

    const provinceList = ensureDatalist("province-options");
    fillDatalist(provinceList, provinceOptions);

    provinceInputs.forEach((provinceInput) => {
      provinceInput.setAttribute("list", provinceList.id);

      const form = provinceInput.closest("form");
      const scope = form || document;
      const municipioInput = scope.querySelector("[data-location-municipio]");

      const formKey = form?.dataset?.formPanel || String(forms.indexOf(form));
      const municipioList = municipioInput ? ensureDatalist(`municipio-options-${formKey}`) : null;

      if (municipioInput && municipioList) {
        municipioInput.setAttribute("list", municipioList.id);
      }

      let currentProvinceCode = "";

      function syncMunicipiosForProvince() {
        const province = resolveProvince(provinceInput.value);
        const cpro = province?.cpro;
        const entries = cpro ? municipalitiesByProvince[cpro] : null;
        const options = Array.isArray(entries)
          ? entries.map((m) => ({ value: m[2] }))
          : [];

        if (cpro && cpro !== currentProvinceCode) {
          if (municipioInput) {
            municipioInput.value = "";
          }
        }
        currentProvinceCode = cpro || "";

        if (municipioList) {
          fillDatalist(municipioList, options);
        }
      }

      ["input", "change", "blur"].forEach((eventName) => {
        provinceInput.addEventListener(eventName, syncMunicipiosForProvince);
      });

      syncMunicipiosForProvince();
    });
  }

  function setStatus(form, state, message, effect = "") {
    const status = form.querySelector("[data-form-status]");
    if (!status) {
      return;
    }

    status.hidden = false;
    status.dataset.state = state;
    if (effect) {
      status.dataset.effect = effect;
    } else {
      status.removeAttribute("data-effect");
    }
    status.textContent = message;
  }

  function clearStatus(form) {
    const status = form.querySelector("[data-form-status]");
    if (!status) {
      return;
    }

    status.hidden = true;
    status.removeAttribute("data-state");
    status.removeAttribute("data-effect");
    status.textContent = "";
  }

  function isCallbackForm(form) {
    return form.matches("[data-callback-form]");
  }

  function phoneRuleForPrefix(prefix) {
    return phoneCountryRules[prefix] || {
      country: { es: "este país", en: "this country" },
      min: 6,
      max: 15,
    };
  }

  function phoneFlagClassForPrefix(prefix) {
    switch (prefix) {
      case "+351":
        return "flag-pt";
      case "+33":
        return "flag-fr";
      case "+44":
        return "flag-uk";
      case "+49":
        return "flag-de";
      case "+39":
        return "flag-it";
      case "+376":
        return "flag-ad";
      case "+34":
      default:
        return "flag-es";
    }
  }

  function formatTemplate(template, values) {
    return Object.entries(values).reduce(
      (message, [key, value]) => message.replace(`{${key}}`, String(value)),
      template,
    );
  }

  function callbackPhoneParts(form) {
    const prefixInput = form.querySelector("[data-phone-prefix]");
    const nationalInput = form.querySelector("[data-phone-national]");
    const hiddenInput = form.querySelector("[data-phone-full]");
    const flag = form.querySelector("[data-phone-flag]");
    const prefix = prefixInput?.value || "+34";
    const national = (nationalInput?.value || "").trim();
    const full = national ? `${prefix}${national}` : "";

    if (hiddenInput) {
      hiddenInput.value = full;
    }

    if (flag) {
      flag.className = `flag-icon callback-country-flag ${phoneFlagClassForPrefix(prefix)}`;
    }

    return { prefix, national, full, input: nationalInput };
  }

  function callbackPhoneValidationMessage(form) {
    if (!isCallbackForm(form)) {
      return "";
    }

    const { prefix, national } = callbackPhoneParts(form);
    const rule = phoneRuleForPrefix(prefix);
    const country = rule.country[pageLanguage] || rule.country.es;

    if (!national) {
      return copy.phoneRequired;
    }

    if (!/^[0-9]+$/.test(national)) {
      return copy.phoneDigitsOnly;
    }

    if (rule.min === rule.max && national.length !== rule.min) {
      return formatTemplate(copy.phoneExactLength, {
        country,
        length: rule.min,
      });
    }

    if (national.length < rule.min || national.length > rule.max) {
      return formatTemplate(copy.phoneRangeLength, {
        country,
        min: rule.min,
        max: rule.max,
      });
    }

    return "";
  }

  function normalizeCallbackPayload(form, payload) {
    if (!isCallbackForm(form)) {
      return payload;
    }

    const { prefix, national, full } = callbackPhoneParts(form);
    payload.prefijo_telefono = prefix;
    payload.telefono_nacional = national;
    payload.telefono = full;
    return payload;
  }

  function firstApiError(result) {
    if (result?.errors && typeof result.errors === "object") {
      return Object.values(result.errors).filter(Boolean)[0] || "";
    }

    return result?.error || "";
  }

  function responseErrorMessage(response, result, responseText) {
    const apiError = firstApiError(result);
    if (apiError) {
      return apiError;
    }

    if ([404, 405, 501].includes(response.status)) {
      return copy.endpointUnavailable;
    }

    const text = (responseText || "").trim();
    if (text && !text.startsWith("{")) {
      return copy.endpointUnavailable;
    }

    return copy.submitError;
  }

  function headerOffset() {
    return (siteHeader?.offsetHeight || 0) + 12;
  }

  function scrollToSectionStart(section) {
    if (!section) {
      return;
    }

    const top = section.getBoundingClientRect().top + window.scrollY - headerOffset();
    window.scrollTo({
      top: Math.max(0, top),
      behavior: "smooth",
    });
  }

  function showModelSection(shouldScroll = true) {
    if (!modelSection) {
      return;
    }

    modelSection.hidden = false;
    if (shouldScroll) {
      scrollToSectionStart(modelSection);
    }
  }

  function syncFloatingWhatsappVisibility() {
    if (!floatingWhatsapp || !contactSection) {
      return;
    }

    const rect = contactSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const isInContactSection = rect.top < viewportHeight && rect.bottom > 0;

    floatingWhatsapp.classList.toggle("is-hidden", isInContactSection);
    floatingWhatsapp.setAttribute("aria-hidden", isInContactSection ? "true" : "false");
    floatingWhatsapp.tabIndex = isInContactSection ? -1 : 0;
  }

  function focusFirstField(category) {
    const activeForm = formPanels.find((panel) => panel.dataset.formPanel === category);
    const firstField = activeForm?.querySelector("input:not([type='hidden']), select, textarea");
    firstField?.focus({ preventScroll: true });
  }

  function showMapFallback() {
    if (!mapSvg) {
      return;
    }

    mapSvg.innerHTML = `
      <rect x="0" y="0" width="640" height="440" fill="#d9e0dd"></rect>
      <text x="320" y="220" text-anchor="middle" fill="#244c3e" font-size="20" font-weight="700">
        ${copy.mapUnavailable}
      </text>
    `;
    pushTrackingEventOnce("roberto_moraga_map_fallback", "fallback", {
      map_state: "fallback",
      map_scope: "iberia",
    });
  }

  function setActiveCategory(category, shouldFocus = false) {
    let activePanel = null;

    formPanels.forEach((panel) => {
      const isActive = panel.dataset.formPanel === category;
      panel.hidden = !isActive;
      if (isActive) {
        activePanel = panel;
      }
    });

    if (categorySelect && categorySelect.value !== category) {
      categorySelect.value = category;
    }

    if (activePanel && !reduceMotionQuery.matches) {
      const contactRect = contactSection?.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      if (contactRect && contactRect.top < viewportHeight && contactRect.bottom > 0) {
        activePanel.classList.add("is-visible");
      }

      window.clearTimeout(formSwitchTimer);
      activePanel.classList.remove("is-switching");
      void activePanel.offsetWidth;
      activePanel.classList.add("is-switching");
      formSwitchTimer = window.setTimeout(() => {
        activePanel.classList.remove("is-switching");
      }, 520);
    }

    if (shouldFocus) {
      focusFirstField(category);
    }
  }

  function formPayload(form) {
    const payload = {};
    const data = new FormData(form);

    data.forEach((value, rawName) => {
      const name = rawName.endsWith("[]") ? rawName.slice(0, -2) : rawName;
      if (rawName.endsWith("[]")) {
        payload[name] = payload[name] || [];
        payload[name].push(value);
        return;
      }

      if (payload[name] !== undefined) {
        payload[name] = Array.isArray(payload[name]) ? payload[name] : [payload[name]];
        payload[name].push(value);
        return;
      }

      payload[name] = value;
    });

    return payload;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat(pageLanguage === "en" ? "en-US" : "es-ES", {
      maximumFractionDigits: 0,
    }).format(value);
  }

  function syncRangePair(group) {
    const minInput = group.querySelector("[data-range-min]");
    const maxInput = group.querySelector("[data-range-max]");
    const output = group.querySelector("[data-range-output]");

    if (!minInput || !maxInput || !output) {
      return;
    }

    let minValue = Number(minInput.value);
    let maxValue = Number(maxInput.value);

    if (minValue > maxValue) {
      if (document.activeElement === minInput) {
        maxValue = minValue;
        maxInput.value = String(maxValue);
      } else {
        minValue = maxValue;
        minInput.value = String(minValue);
      }
    }

    output.textContent = `${formatCurrency(minValue)} - ${formatCurrency(maxValue)} euros`;
  }

  async function renderIberiaMap() {
    if (!mapSvg) {
      return;
    }

    const d3 = window.d3;
    const topojson = window.topojson;
    if (!d3 || !topojson) {
      return;
    }

    const viewBox = (mapSvg.getAttribute("viewBox") || "0 0 640 440").split(/\s+/).map(Number);
    const width = viewBox[2] || 640;
    const height = viewBox[3] || 440;

    const [topology, portugal, provinceConfig] = await Promise.all([
      fetch("./assets/es-provinces.topo.json").then((resp) => resp.json()),
      fetch("./assets/portugal.geojson").then((resp) => resp.json()),
      loadProvinceStatusConfig(),
    ]);

    const excluded = new Set([
      "Illes Balears",
      "Las Palmas",
      "Santa Cruz de Tenerife",
      "Ceuta",
      "Melilla",
    ]);

    const provinces = topojson.feature(topology, topology.objects.provinces);
    const spainFeatures = (provinces.features || []).filter((feature) => {
      const name = feature?.properties?.name || "";
      if (!name) return false;
      if (excluded.has(name)) return false;
      if (String(name).startsWith("Gibraltar")) return false;
      return true;
    });

    const spainCollection = { type: "FeatureCollection", features: spainFeatures };
    const combined = {
      type: "FeatureCollection",
      features: [...(portugal.features || []), ...spainFeatures],
    };

    const projection = d3.geoMercator().fitExtent(
      [
        [14, 14],
        [width - 14, height - 14],
      ],
      combined,
    );
    const path = d3.geoPath(projection);

    const svg = d3.select(mapSvg);
    const portugalLayer = svg.select('[data-iberia-map="portugal"]');
    const spainLayer = svg.select('[data-iberia-map="spain"]');
    const defaultStatus = normalizeProvinceStatus(provinceConfig?.defaultStatus || "inactiva");
    const statusStyles = provinceConfig?.statusStyles || {};
    const statusByNameLookup = new Map(
      Object.entries(provinceConfig?.statusByName || {}).map(([name, status]) => [
        normalizeText(name),
        normalizeProvinceStatus(status),
      ])
    );
    const statusByCodeLookup = new Map(
      Object.entries(provinceConfig?.statusByCode || {}).map(([code, status]) => [
        normalizeText(code),
        normalizeProvinceStatus(status),
      ])
    );

    function provinceName(feature) {
      return String(feature?.properties?.name || "").trim();
    }

    function provinceCode(feature) {
      return String(feature?.id || "").trim();
    }

    function provinceStatus(feature) {
      const nameKey = normalizeText(provinceName(feature));
      const codeKey = normalizeText(provinceCode(feature));
      return statusByNameLookup.get(nameKey) || statusByCodeLookup.get(codeKey) || defaultStatus;
    }

    function provinceFill(feature) {
      const status = provinceStatus(feature);
      const style = statusStyles[status] || statusStyles.inactiva || {};
      return style.fill || "#d9e0dd";
    }

    function provinceStroke(feature) {
      const status = provinceStatus(feature);
      const style = statusStyles[status] || statusStyles.inactiva || {};
      return style.stroke || "rgba(23, 32, 29, 0.44)";
    }

    const portugalFeatures = portugal.features || [];

    // "Absorbe" cualquier rendija entre datasets distintos con un subrayado del mismo color.
    portugalLayer
      .selectAll("path.portugal-underlay")
      .data(portugalFeatures)
      .join("path")
      .attr("class", "portugal-underlay")
      .attr("d", path)
      .attr("fill", "#c7cfcc")
      .attr("stroke", "#c7cfcc")
      .attr("stroke-width", 16)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    portugalLayer
      .selectAll("path.portugal-outline")
      .data(portugalFeatures)
      .join("path")
      .attr("class", "portugal-outline")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "rgba(23, 32, 29, 0.28)")
      .attr("stroke-width", 1.2);

    spainLayer
      .selectAll("path")
      .data(spainCollection.features)
      .join("path")
      .attr("class", (feature) => {
        const status = provinceStatus(feature);
        return status === "en_proceso"
          ? "province province-en_proceso province-upcoming"
          : `province province-${status}`;
      })
      .attr("data-province-name", provinceName)
      .attr("data-province-code", provinceCode)
      .attr("data-status", provinceStatus)
      .attr("d", path)
      .attr("fill", provinceFill)
      .attr("stroke", provinceStroke)
      .attr("stroke-width", (feature) => (provinceStatus(feature) === "inactiva" ? 1.1 : 1.45));

    pushTrackingEventOnce("roberto_moraga_map_ready", "loaded", {
      map_state: "loaded",
      map_scope: "iberia",
      map_provinces: spainFeatures.length,
      map_countries: 2,
    });
  }

  async function renderMadridMap() {
    const map = document.querySelector(".madrid-map");
    if (!map || !window.d3 || !window.topojson) {
      return;
    }

    const topology = await fetch("./assets/es-provinces.topo.json").then((response) => response.json());
    const allProvinces = topojson.feature(topology, topology.objects.provinces).features || [];
    const names = new Set(["Madrid", "Toledo", "Segovia", "Guadalajara", "Ávila", "Cuenca"]);
    const provinces = allProvinces.filter((feature) => names.has(feature?.properties?.name));
    const collection = { type: "FeatureCollection", features: provinces };
    const viewBox = (map.getAttribute("viewBox") || "0 0 760 500").split(/\s+/).map(Number);
    const width = viewBox[2] || 760;
    const height = viewBox[3] || 500;
    const projection = d3.geoMercator().fitExtent([[24, 24], [width - 24, height - 24]], collection);
    const path = d3.geoPath(projection);
    const svg = d3.select(map);
    const provinceLayer = svg.select('[data-madrid-map="provinces"]');
    const pinLayer = svg.select('[data-madrid-map="pins"]');

    provinceLayer.selectAll("path")
      .data(provinces)
      .join("path")
      .attr("class", (feature) => feature.properties.name === "Madrid" ? "province province-madrid" : "province")
      .attr("data-province-name", (feature) => feature.properties.name)
      .attr("d", path);

    // Keep the visual distribution aligned with the 141 managed homes shown above.
    const centralPins = Array.from({ length: 99 }, (_, index) => {
      const angle = index * 2.399963;
      const radius = 0.015 + (index % 11) * 0.006;
      return [-3.704 + Math.cos(angle) * radius, 40.416 + Math.sin(angle) * radius * 0.72];
    });
    const metropolitanPins = Array.from({ length: 28 }, (_, index) => {
      const angle = index * 2.618;
      const radius = 0.11 + (index % 7) * 0.025;
      return [-3.704 + Math.cos(angle) * radius, 40.416 + Math.sin(angle) * radius * 0.72];
    });
    const outsidePins = [
      [-4.03, 39.86], [-4.02, 39.88], // Toledo
      [-3.58, 41.00], [-3.50, 41.02], [-3.35, 40.95], // Guadalajara
      [-4.10, 40.65], [-4.00, 40.70], [-4.18, 40.60], // Avila
      [-3.98, 41.02], [-3.85, 41.08], // Segovia
      [-2.95, 40.05], [-2.85, 40.12], [-3.05, 40.20], [-3.15, 39.98], // Cuenca
    ];
    const pinCoordinates = [...centralPins, ...metropolitanPins, ...outsidePins];

    pinLayer.selectAll("circle")
      .data(pinCoordinates)
      .join("circle")
      .attr("cx", ([longitude, latitude]) => projection([longitude, latitude])[0])
      .attr("cy", ([longitude, latitude]) => projection([longitude, latitude])[1])
      .attr("r", 5);

    svg.selectAll("text.map-label").remove();
    provinceLayer.selectAll("path").each(function (feature) {
      const [x, y] = path.centroid(feature);
      svg.append("text").attr("class", feature.properties.name === "Madrid" ? "map-label map-label--madrid" : "map-label").attr("x", x).attr("y", y).text(feature.properties.name.toUpperCase());
    });
  }

  if (hasForms) {
    categorySelect?.addEventListener("change", () => {
      setActiveCategory(categorySelect.value, true);
    });

    profileLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        trackClickEvent(link);
        const category = link.dataset.profileLink;
        setActiveCategory(category, false);
        scrollToSectionStart(contactSection);
        window.setTimeout(() => {
          focusFirstField(category);
        }, 260);
        if (history.replaceState) {
          history.replaceState(null, "", "#contacto");
        }
      });
    });

    document.querySelectorAll("[data-range-pair]").forEach((group) => {
      const inputs = group.querySelectorAll("input[type='range']");
      inputs.forEach((input) => {
        input.addEventListener("input", () => syncRangePair(group));
      });
      syncRangePair(group);
    });

    forms.forEach((form) => {
      const submitButton = form.querySelector("button[type='submit']");
      const submitLabel = submitButton?.textContent || copy.defaultSubmit;

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const phoneValidationMessage = callbackPhoneValidationMessage(form);
        if (phoneValidationMessage) {
          setStatus(form, "error", phoneValidationMessage);
          callbackPhoneParts(form).input?.focus({ preventScroll: true });
          return;
        }

        if (!form.reportValidity()) {
          return;
        }

        const payload = normalizeCallbackPayload(form, formPayload(form));
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = copy.sendingLabel;
        }
        form.setAttribute("aria-busy", "true");
        setStatus(form, "loading", isCallbackForm(form) ? copy.callbackSendingStatus : copy.sendingStatus);

        try {
          const response = await fetch(form.action, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          const responseText = await response.text();
          const result = responseText ? JSON.parse(responseText) : {};

          if (!response.ok || !result.ok) {
            const errorMessage = responseErrorMessage(response, result, responseText);
            throw new Error(errorMessage);
          }

          form.reset();
          callbackPhoneParts(form);
          document.querySelectorAll("[data-range-pair]").forEach((group) => syncRangePair(group));
          if (isCallbackForm(form)) {
            setStatus(form, "success", copy.callbackSuccess, "received");
            window.setTimeout(() => {
              const status = form.querySelector("[data-form-status]");
              if (status?.dataset.effect === "received") {
                clearStatus(form);
              }
            }, 4300);
          } else {
            setStatus(form, "success", copy.submitSuccess);
          }
        } catch (error) {
          const message = error instanceof SyntaxError ? copy.endpointUnavailable : error.message || copy.submitError;
          setStatus(form, "error", message);
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = submitLabel;
          }
          form.removeAttribute("aria-busy");
        }
      });

      if (isCallbackForm(form)) {
        callbackPhoneParts(form);
      }

      form.addEventListener("input", () => {
        if (isCallbackForm(form)) {
          callbackPhoneParts(form);
        }
        const status = form.querySelector("[data-form-status]");
        if (status?.dataset.state === "error") {
          clearStatus(form);
        }
      });

      form.addEventListener("change", () => {
        if (isCallbackForm(form)) {
          callbackPhoneParts(form);
        }
        const status = form.querySelector("[data-form-status]");
        if (status?.dataset.state === "error") {
          clearStatus(form);
        }
      });
    });
  } else {
    profileLinks.forEach((link) => {
      link.addEventListener("click", () => {
        trackClickEvent(link);
        trackIntentMarker(link);
      });
    });
  }

  document.addEventListener("click", (event) => {
    const element = event.target?.closest(clickTrackSelector);
    if (!element) {
      return;
    }
    if (element.classList.contains("profile-card")) {
      return;
    }
    if (element === modelNavLink) {
      return;
    }
    trackClickEvent(element);
    trackIntentMarker(element);
  });

  window.addEventListener("scroll", scheduleScrollTracking, { passive: true });
  window.addEventListener("resize", scheduleScrollTracking);

  function initCounters() {
    const counters = Array.from(document.querySelectorAll("[data-counter]"));
    if (!counters.length) {
      return;
    }

    const animate = (node) => {
      const target = Number(node.dataset.counter || 0);
      const duration = 1200;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const prefix = node.dataset.counterPrefix || "";
        node.textContent = `${prefix}${Math.round(target * eased).toLocaleString("es-ES")}`;
        if (progress < 1) {
          window.requestAnimationFrame(tick);
        }
      };

      window.requestAnimationFrame(tick);
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries, instance) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }
        counters.forEach(animate);
        instance.disconnect();
      }, { threshold: 0.35 });
      observer.observe(counters[0].closest(".stats-strip") || counters[0]);
    } else {
      counters.forEach(animate);
    }
  }

  function initMediaModal() {
    const mediaCards = Array.from(document.querySelectorAll('.history-card[href*="youtu.be"], .history-card[href*="youtube.com"], .history-card[href*="instagram.com/reel"], .history-card[href*="instagram.com/p/"]'));
    if (!mediaCards.length) {
      return;
    }

    const modal = document.createElement("div");
    modal.className = "media-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="media-modal-backdrop" data-media-modal-close></div>
      <div class="media-modal-dialog" role="dialog" aria-modal="true" aria-label="${pageLanguage === "en" ? "Featured content" : "Contenido destacado"}">
        <button class="media-modal-close" type="button" aria-label="${pageLanguage === "en" ? "Close video" : "Cerrar vídeo"}" data-media-modal-close>×</button>
        <div class="media-modal-frame"></div>
      </div>`;
    document.body.appendChild(modal);

    const frame = modal.querySelector(".media-modal-frame");
    let lastFocusedElement = null;

    function closeModal() {
      modal.hidden = true;
      frame.replaceChildren();
      document.body.classList.remove("media-modal-open");
      lastFocusedElement?.focus({ preventScroll: true });
    }

    function openModal(card) {
      const url = new URL(card.href, window.location.href);
      const isInstagram = url.hostname.includes("instagram.com");
      const youtubeId = url.hostname.includes("youtu.be")
        ? url.pathname.slice(1)
        : url.searchParams.get("v");
      const instagramMatch = url.pathname.match(/\/(reel|p)\/([^/]+)/);
      const embedUrl = isInstagram && instagramMatch
        ? `https://www.instagram.com/${instagramMatch[1]}/${instagramMatch[2]}/embed/?hidecaption=1&maxwidth=658`
        : youtubeId
          ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0`
          : "";

      if (!embedUrl) {
        return;
      }

      const iframe = document.createElement("iframe");
      iframe.src = embedUrl;
      iframe.title = card.querySelector("h3")?.textContent?.trim() || (isInstagram ? "Instagram" : "YouTube");
      iframe.loading = "eager";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      frame.replaceChildren(iframe);
      lastFocusedElement = document.activeElement;
      modal.hidden = false;
      document.body.classList.add("media-modal-open");
      modal.querySelector(".media-modal-close")?.focus({ preventScroll: true });
    }

    mediaCards.forEach((card) => {
      card.addEventListener("click", (event) => {
        event.preventDefault();
        openModal(card);
      });
    });
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-media-modal-close]")) {
        closeModal();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });
  }

  function initHistoryExpansion() {
    const button = document.querySelector("[data-history-more]");
    if (!button) {
      return;
    }

    const extraCards = Array.from(document.querySelectorAll(".history-card--extra"));
    button.addEventListener("click", () => {
      const isExpanded = button.dataset.expanded === "true";
      extraCards.forEach((card) => {
        card.hidden = isExpanded;
      });
      button.dataset.expanded = String(!isExpanded);
      button.textContent = isExpanded
        ? (pageLanguage === "en" ? "View more" : "Ver más")
        : (pageLanguage === "en" ? "View less" : "Ver menos");
    });
  }

  function arrangeLandingSections() {
    const main = document.querySelector("main");
    const history = document.querySelector("#nuestra-historia, #our-story");
    const management = document.querySelector("#gestionamos-tu-vivienda, #manage-your-property");
    const faq = document.querySelector("#preguntas-frecuentes, #frequently-asked-questions");
    const reviews = document.querySelector("#opiniones");
    if (!main || !history || !management || !faq || !reviews) {
      return;
    }

    main.insertBefore(management, history.nextElementSibling);
    main.insertBefore(faq, management.nextElementSibling);
    main.insertBefore(reviews, faq.nextElementSibling);
  }

  function bootstrap() {
    primeCaseCarouselLayout();
    loadProjectCatalogs().finally(() => {
      initCaseCarousels();
    });
    initRevealMotion();
    initSectionViewTracking();
    if (hasForms) {
      setActiveCategory(categorySelect?.value || "servicios");
    }
    syncFloatingWhatsappVisibility();
    syncMotionOnScroll();
    trackPageView();
    if (window.location.hash === "#modelo") {
      showModelSection(true);
    }
    trackScrollDepth();
    initCounters();
    initMediaModal();
    initHistoryExpansion();
    arrangeLandingSections();
    renderIberiaMap().catch((error) => {
      console.error("Error al renderizar el mapa:", error);
      showMapFallback();
    });
    renderMadridMap().catch((error) => {
      console.error("Error al renderizar el mapa de Madrid:", error);
    });
    if (hasForms) {
      initLocationSuggest().catch(() => {});
    }
  }

  bootstrap();
})();
