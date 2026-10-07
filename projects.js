(() => {
  const languageFromPage = () => {
    const queryLanguage = new URLSearchParams(window.location.search).get("lang");
    return queryLanguage === "en" || queryLanguage === "es"
      ? queryLanguage
      : document.documentElement.lang?.toLowerCase().startsWith("en")
        ? "en"
        : "es";
  };

  const text = (value, language) => {
    if (value && typeof value === "object") {
      return value[language] ?? value.es ?? value.en ?? "";
    }
    return value ?? "";
  };

  const formatCount = (value, language, singular, plural) => {
    if (value === null || value === undefined || value === "") {
      return "";
    }
    return `${value} ${value === 1 ? singular[language] : plural[language]}`;
  };

  const formatRenovation = (value, language) => {
    if (value === null || value === undefined || value === "") {
      return language === "en" ? "Renovation not provided" : "Reforma no indicada";
    }
    const amount = new Intl.NumberFormat(language === "en" ? "en-US" : "es-ES", {
      maximumFractionDigits: 0,
    }).format(value);
    return language === "en" ? `€${amount} renovation` : `${amount} € reforma`;
  };

  const projectUrl = (slug, language) => {
    const suffix = language === "en" ? "?lang=en" : "";
    return `/proyectos/${encodeURIComponent(slug)}/${suffix}`;
  };

  function localizeHeader(language) {
    if (language !== "en") {
      return;
    }
    const links = Array.from(document.querySelectorAll(".top-nav a"));
    ["Home", "We manage your property", "Invest", "Our story"].forEach((label, index) => {
      if (links[index]) {
        links[index].textContent = label;
      }
    });
    if (links[1]) links[1].href = "/#manage-your-property";
    const breadcrumbs = document.querySelectorAll(".breadcrumbs a");
    breadcrumbs[0]?.replaceChildren("Home");
  }

  async function fetchProject(slug) {
    const response = await fetch(`/assets/projects/${encodeURIComponent(slug)}/project.json`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${slug}: HTTP ${response.status}`);
    }
    return response.json();
  }

  async function loadCatalog() {
    const response = await fetch("/assets/projects/index.json", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`No se pudo cargar el índice de proyectos: HTTP ${response.status}`);
    }

    const manifest = await response.json();
    const projects = await Promise.all((manifest.projects || []).map(fetchProject));
    const language = languageFromPage();

    return projects
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((project) => ({
        ...project,
        section: text(project.section, language),
        title: text(project.title, language),
        city: text(project.city, language),
        summary: text(project.summary, language),
        metrics: project.metrics || {},
        coverUrl: `/assets/projects/${encodeURIComponent(project.slug)}/${encodeURIComponent(project.images?.[0]?.file || "")}`,
        coverAlt: text(project.images?.[0]?.alt, language),
        projectUrl: projectUrl(project.slug, language),
        carousel: {
          model: text(project.carousel?.model, language),
          reform: text(project.carousel?.reform, language),
          economics: text(project.carousel?.economics, language),
          stats: [
            formatCount(project.metrics?.rooms, language, { es: "habitación", en: "room" }, { es: "habitaciones", en: "rooms" }),
            formatCount(project.metrics?.bathrooms, language, { es: "baño", en: "bathroom" }, { es: "baños", en: "bathrooms" }),
            formatRenovation(project.metrics?.renovation, language),
          ].filter(Boolean),
        },
      }));
  }

  function card(project, language) {
    const link = document.createElement("a");
    link.className = "project-card";
    link.href = projectUrl(project.slug, language);

    const image = document.createElement("img");
    image.src = project.coverUrl;
    image.alt = project.coverAlt || project.title;
    image.loading = "lazy";

    const kicker = document.createElement("p");
    kicker.className = "page-kicker";
    kicker.textContent = project.section;

    const title = document.createElement("h3");
    title.textContent = project.title;

    const summary = document.createElement("p");
    summary.textContent = project.summary;

    const meta = document.createElement("div");
    meta.className = "project-meta";
    project.carousel.stats.forEach((value) => {
        const item = document.createElement("span");
        item.textContent = value;
        meta.appendChild(item);
    });

    link.append(image, kicker, title, summary, meta);
    return link;
  }

  async function renderProjectList() {
    const container = document.querySelector("[data-project-list]");
    if (!container) {
      return;
    }

    try {
      const language = languageFromPage();
      document.documentElement.lang = language;
      localizeHeader(language);
      if (language === "en") {
        const hero = document.querySelector(".page-hero");
        const breadcrumb = document.querySelector(".breadcrumbs a:last-of-type");
        if (hero) {
          hero.querySelector(".page-kicker")?.replaceChildren("Managed projects");
          hero.querySelector("h1")?.replaceChildren("Homes prepared for rental");
          hero.querySelector(".page-lead")?.replaceChildren("See homes we prepare and manage for room rentals.");
        }
        breadcrumb?.replaceChildren("Projects");
        document.querySelectorAll(".language-toggle a").forEach((link) => {
          link.href = link.querySelector(".flag-es") ? "/proyectos/" : "/proyectos/?lang=en";
        });
      }
      const projects = await loadCatalog();
      container.replaceChildren(...projects.map((project) => card(project, language)));
    } catch (error) {
      console.warn("No se pudo renderizar el catálogo de proyectos", error);
    }
  }

  window.RMProjects = { fetchProject, loadCatalog, languageFromPage, projectUrl, text };
  renderProjectList();
})();
