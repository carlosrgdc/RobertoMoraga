(() => {
  const page = document.querySelector("[data-project-page]");
  const slug = document.body.dataset.projectSlug;
  if (!page || !slug || !window.RMProjects) {
    return;
  }

  const language = window.RMProjects.languageFromPage();
  const t = (value) => window.RMProjects.text(value, language);
  const formatCount = (value, singular, plural) => {
    if (value === null || value === undefined || value === "") {
      return language === "en" ? "Not provided" : "No indicado";
    }
    return `${value} ${value === 1 ? singular : plural}`;
  };
  const formatRenovation = (value) => {
    if (value === null || value === undefined || value === "") {
      return language === "en" ? "Not provided" : "No indicada";
    }
    const amount = new Intl.NumberFormat(language === "en" ? "en-US" : "es-ES", { maximumFractionDigits: 0 }).format(value);
    return language === "en" ? `€${amount}` : `${amount} €`;
  };
  const escape = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const labels = language === "en"
    ? { home: "Home", catalog: "Projects", gallery: "Gallery", galleryTitle: "Property images", scope: "Scope", scopeTitle: "What the work includes", rooms: "Rooms", bathrooms: "Bathrooms", renovation: "Renovation", contact: "Contact", contactTitle: "Tell us what you need and where the property is.", request: "Request information", whatsapp: "WhatsApp", similar: "If you want something similar, tell us", similarCopy: "We can help you assess whether it fits your property.", open: "Open image viewer", close: "Close viewer", previous: "Previous image", next: "Next image" }
    : { home: "Inicio", catalog: "Proyectos gestionados", gallery: "Galería", galleryTitle: "Imágenes de la vivienda", scope: "Alcance", scopeTitle: "Qué incluye el trabajo", rooms: "Habitaciones", bathrooms: "Baños", renovation: "Reforma", contact: "Contacto", contactTitle: "Cuéntanos qué necesitas y dónde está el inmueble.", request: "Solicitar información", whatsapp: "WhatsApp", similar: "Si quieres algo parecido, cuéntanoslo", similarCopy: "Te ayudamos a valorar si encaja con tu inmueble.", open: "Abrir imagen", close: "Cerrar visor", previous: "Imagen anterior", next: "Imagen siguiente" };

  function mountLightbox(project) {
    const images = project.images || [];
    if (!images.length) {
      return;
    }

    document.querySelector("[data-project-lightbox]")?.remove();
    const viewer = document.createElement("dialog");
    viewer.className = "project-lightbox";
    viewer.dataset.projectLightbox = "true";
    viewer.setAttribute("aria-label", labels.galleryTitle);
    viewer.innerHTML = `
      <div class="project-lightbox-shell">
        <button class="project-lightbox-close" type="button" data-project-lightbox-close aria-label="${labels.close}">${labels.close}</button>
        <button class="project-lightbox-nav project-lightbox-prev" type="button" data-project-lightbox-prev aria-label="${labels.previous}">‹</button>
        <figure class="project-lightbox-figure">
          <img class="project-lightbox-image" data-project-lightbox-image alt="" />
          <figcaption class="project-lightbox-caption" data-project-lightbox-caption></figcaption>
        </figure>
        <button class="project-lightbox-nav project-lightbox-next" type="button" data-project-lightbox-next aria-label="${labels.next}">›</button>
        <span class="project-lightbox-counter" data-project-lightbox-counter aria-live="polite"></span>
      </div>`;
    document.body.appendChild(viewer);

    const imageNode = viewer.querySelector("[data-project-lightbox-image]");
    const captionNode = viewer.querySelector("[data-project-lightbox-caption]");
    const counterNode = viewer.querySelector("[data-project-lightbox-counter]");
    const closeButton = viewer.querySelector("[data-project-lightbox-close]");
    const previousButton = viewer.querySelector("[data-project-lightbox-prev]");
    const nextButton = viewer.querySelector("[data-project-lightbox-next]");
    let activeIndex = 0;
    let lastTrigger = null;

    const imageFile = (image) => `/assets/projects/${encodeURIComponent(project.slug)}/${encodeURIComponent(image.file)}`;
    const renderImage = (index) => {
      activeIndex = (index + images.length) % images.length;
      const image = images[activeIndex];
      const alt = t(image.alt) || t(image.caption) || t(project.title);
      imageNode.src = imageFile(image);
      imageNode.alt = alt;
      captionNode.textContent = t(image.caption) || alt;
      counterNode.textContent = `${activeIndex + 1} / ${images.length}`;
    };
    const close = () => {
      if (viewer.open) {
        viewer.close();
      }
      document.body.classList.remove("project-lightbox-open");
      lastTrigger?.focus();
    };
    const open = (index, trigger) => {
      lastTrigger = trigger;
      renderImage(index);
      document.body.classList.add("project-lightbox-open");
      if (typeof viewer.showModal === "function") {
        viewer.showModal();
      } else {
        viewer.setAttribute("open", "");
      }
      closeButton.focus();
    };

    page.querySelectorAll("[data-project-image-index]").forEach((trigger) => {
      trigger.addEventListener("click", () => open(Number(trigger.dataset.projectImageIndex), trigger));
    });
    closeButton.addEventListener("click", close);
    previousButton.addEventListener("click", () => renderImage(activeIndex - 1));
    nextButton.addEventListener("click", () => renderImage(activeIndex + 1));
    viewer.addEventListener("click", (event) => {
      if (event.target === viewer) {
        close();
      }
    });
    viewer.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });
    viewer.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        renderImage(activeIndex - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        renderImage(activeIndex + 1);
      }
    });
  }

  function render(project) {
    const title = t(project.title);
    const summary = t(project.summary);
    const projectPath = window.RMProjects.projectUrl(project.slug, language);
    const imageHtml = (project.images || []).map((image, index) => {
      const file = `/assets/projects/${encodeURIComponent(project.slug)}/${encodeURIComponent(image.file)}`;
      const alt = t(image.alt) || t(image.caption) || title;
      const caption = t(image.caption) || alt;
      return `<figure class="page-card project-image-card"><button class="project-image-trigger" type="button" data-project-image-index="${index}" aria-label="${escape(`${labels.open}: ${caption}`)}"><img src="${file}" alt="${escape(alt)}" loading="lazy" /></button><figcaption>${escape(caption)}</figcaption></figure>`;
    }).join("");
    const scopeHtml = (project.scope?.[language] || []).map((item) => `<li>${escape(item)}</li>`).join("");
    const rooms = project.metrics?.rooms;
    const bathrooms = project.metrics?.bathrooms;
    const renovation = project.metrics?.renovation;
    const whatsappText = language === "en"
      ? "I%20would%20like%20information%20about%20this%20project."
      : "Quiero%20informaci%C3%B3n%20sobre%20este%20proyecto.";

    page.innerHTML = `
      <nav class="breadcrumbs" aria-label="Breadcrumbs"><a href="/">${labels.home}</a> / <a href="/proyectos/${language === "en" ? "?lang=en" : ""}">${labels.catalog}</a> / <span>${escape(title)}</span></nav>
      <section class="page-hero">
        <div><p class="page-kicker">${escape(t(project.section))}</p><h1>${escape(title)}</h1><p class="page-lead">${escape(summary)}</p>
          <div class="page-hero-actions"><a class="whatsapp-button" href="https://wa.me/34635335513?text=${whatsappText}" target="_blank" rel="noopener"><img class="whatsapp-icon" src="/assets/whatsapp.svg" alt="" aria-hidden="true" />${labels.whatsapp}</a><a class="button button-light" href="/contacto/">${labels.request}</a></div>
        </div>
        <aside class="page-hero-panel" aria-label="${escape(labels.rooms)}"><article class="page-card"><h3>${labels.rooms}</h3><p>${escape(formatCount(rooms, language === "en" ? "room" : "habitación", language === "en" ? "rooms" : "habitaciones"))}</p></article><article class="page-card"><h3>${labels.bathrooms}</h3><p>${escape(formatCount(bathrooms, language === "en" ? "bathroom" : "baño", language === "en" ? "bathrooms" : "baños"))}</p></article><article class="page-card"><h3>${labels.renovation}</h3><p>${escape(formatRenovation(renovation))}</p></article></aside>
      </section>
      <section class="page-section"><div class="section-heading"><p class="eyebrow">${labels.gallery}</p><h2>${labels.galleryTitle}</h2></div><div class="project-grid">${imageHtml}</div></section>
      <section class="page-section"><div class="section-heading"><p class="eyebrow">${labels.scope}</p><h2>${labels.scopeTitle}</h2></div><ul class="page-list">${scopeHtml}</ul></section>
      <section class="page-cta"><p class="page-kicker">${labels.contact}</p><strong>${labels.similar}</strong><p>${labels.similarCopy}</p><a class="button button-light" href="/contacto/">${labels.request}</a></section>
      <section class="page-section"><div class="section-heading"><p class="eyebrow">${labels.contact}</p><h2>${labels.contactTitle}</h2></div><div class="related-links"><a href="https://wa.me/34635335513?text=${whatsappText}">${labels.whatsapp}</a><a href="/contacto/">${labels.request}</a><a href="${projectPath}">${title}</a></div></section>`;

    document.documentElement.lang = language;
    if (language === "en") {
      const links = Array.from(document.querySelectorAll(".top-nav a"));
      ["Home", "We manage your property", "Invest", "Our story"].forEach((label, index) => {
        if (links[index]) links[index].textContent = label;
      });
      if (links[1]) links[1].href = "/#manage-your-property";
    }
    document.title = `${title} | Roberto Moraga`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", summary);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", `${title} | Roberto Moraga`);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", summary);
    document.querySelector('meta[property="og:image"]')?.setAttribute("content", `${window.location.origin}/assets/projects/${project.slug}/${project.images?.[0]?.file || ""}`);
    document.querySelectorAll(".language-toggle a").forEach((link) => {
      const targetLanguage = link.querySelector(".flag-es") ? "es" : "en";
      link.href = window.RMProjects.projectUrl(project.slug, targetLanguage);
      link.setAttribute("aria-current", targetLanguage === language ? "page" : "false");
    });
    mountLightbox(project);
  }

  window.RMProjects.fetchProject(slug).then(render).catch((error) => {
    console.error("No se pudo cargar el proyecto", error);
    page.innerHTML = `<p class="page-note">No se ha podido cargar este proyecto.</p>`;
  });
})();
