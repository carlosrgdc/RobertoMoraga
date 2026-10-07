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
    ? { home: "Home", catalog: "Projects", gallery: "Gallery", galleryTitle: "Project images", scope: "Scope", scopeTitle: "What the work includes", rooms: "Rooms", bathrooms: "Bathrooms", renovation: "Renovation", contact: "Contact", contactTitle: "Tell us what you need and where the property is.", request: "Request information", whatsapp: "WhatsApp", similar: "If you want something similar, tell us", similarCopy: "We can help you assess whether it fits your property.", viewServices: "View services", viewProperty: "Property management" }
    : { home: "Inicio", catalog: "Vendemos", gallery: "Galería", galleryTitle: "Imágenes del proyecto", scope: "Alcance", scopeTitle: "Qué incluye el trabajo", rooms: "Habitaciones", bathrooms: "Baños", renovation: "Reforma", contact: "Contacto", contactTitle: "Cuéntanos qué necesitas y dónde está el inmueble.", request: "Solicitar información", whatsapp: "WhatsApp", similar: "Si quieres algo parecido, cuéntanoslo", similarCopy: "Te ayudamos a valorar si encaja con tu inmueble.", viewServices: "Ver servicios", viewProperty: "Gestionamos tu vivienda" };

  function render(project) {
    const title = t(project.title);
    const summary = t(project.summary);
    const projectPath = window.RMProjects.projectUrl(project.slug, language);
    const imageHtml = (project.images || []).map((image) => {
      const file = `/assets/projects/${encodeURIComponent(project.slug)}/${encodeURIComponent(image.file)}`;
      return `<figure class="page-card"><img src="${file}" alt="${escape(t(image.alt) || title)}" loading="lazy" /><figcaption>${escape(t(image.caption))}</figcaption></figure>`;
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
      <section class="page-section"><div class="section-heading"><p class="eyebrow">${labels.contact}</p><h2>${labels.contactTitle}</h2></div><div class="related-links"><a href="https://wa.me/34635335513?text=${whatsappText}">${labels.whatsapp}</a><a href="/contacto/">${labels.request}</a><a href="/servicios/">${labels.viewServices}</a><a href="/servicios-para-propietarios/">${labels.viewProperty}</a><a href="${projectPath}">${title}</a></div></section>`;

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
  }

  window.RMProjects.fetchProject(slug).then(render).catch((error) => {
    console.error("No se pudo cargar el proyecto", error);
    page.innerHTML = `<p class="page-note">No se ha podido cargar este proyecto.</p>`;
  });
})();
