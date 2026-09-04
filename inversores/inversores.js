(() => {
  const API_BASE = new URL("../api/inversores/", window.location.href);
  const apiEndpoint = (path) => new URL(path, API_BASE).toString();
  const API_LOGIN_ENDPOINT = apiEndpoint("login");
  const API_ME_ENDPOINT = apiEndpoint("me");
  const API_LOGOUT_ENDPOINT = apiEndpoint("logout");

  const euro = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  const percent = new Intl.NumberFormat("es-ES", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const dateFormatter = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const loginView = document.querySelector("[data-login-view]");
  const dashboardView = document.querySelector("[data-dashboard]");
  const loginForm = document.querySelector("[data-investor-login]");
  const loginStatus = document.querySelector("[data-login-status]");
  const logoutButton = document.querySelector("[data-logout]");
  const loginNav = document.querySelector("[data-login-nav]");
  const dashboardNavItems = Array.from(document.querySelectorAll("[data-dashboard-nav]"));
  const contractTabs = document.querySelector("[data-contract-tabs]");
  const kpis = document.querySelector("[data-kpis]");
  const principalChart = document.querySelector("[data-growth-chart]");
  const paymentChart = document.querySelector("[data-payment-chart]");
  const paymentsTable = document.querySelector("[data-payments-table]");
  const contractFacts = document.querySelector("[data-contract-facts]");
  const contractLink = document.querySelector("[data-contract-link]");
  const contractTitle = document.querySelector("[data-contract-title]");
  const growthTotal = document.querySelector("[data-growth-total]");
  const nextPayment = document.querySelector("[data-next-payment]");

  let activePortfolio = null;
  let activeContractId = null;

  function money(value) {
    const amount = Number(value);
    return euro.format(Number.isFinite(amount) ? amount : 0);
  }

  function rate(value) {
    const amount = Number(value);
    return percent.format(Number.isFinite(amount) ? amount : 0);
  }

  function isoDateText(value) {
    if (!value) {
      return "";
    }
    const raw = String(value).slice(0, 10);
    const date = new Date(`${raw}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
  }

  function asNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function safeHref(value) {
    if (!value) {
      return "";
    }

    try {
      const parsed = new URL(String(value), window.location.origin);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function setStatus(message, state) {
    if (!loginStatus) {
      return;
    }

    loginStatus.hidden = !message;
    loginStatus.textContent = message || "";

    if (state) {
      loginStatus.dataset.state = state;
    } else {
      delete loginStatus.dataset.state;
    }
  }

  function normalizePayment(payment, index) {
    const installmentNumber = asNumber(payment.installmentNumber ?? payment.installment_number ?? index + 1);
    const principalAmount = asNumber(payment.principalAmount ?? payment.principal_amount ?? payment.principal ?? 0);
    const interestAmount = asNumber(payment.interestAmount ?? payment.interest_amount ?? payment.interest ?? 0);
    const totalAmount = asNumber(payment.totalAmount ?? payment.total_amount ?? payment.total ?? principalAmount + interestAmount);
    const paidAmount = asNumber(payment.paidAmount ?? payment.paid_amount ?? payment.paid ?? 0);
    const balanceAfter = asNumber(payment.balanceAfter ?? payment.balance_after ?? payment.outstanding ?? 0);
    const isPaid = Boolean(payment.isPaid ?? payment.is_paid ?? payment.paid ?? paidAmount > 0);

    return {
      installmentNumber,
      dueDate: String(payment.dueDate ?? payment.due_date ?? payment.date ?? ""),
      principalAmount,
      interestAmount,
      totalAmount,
      paidAmount,
      balanceAfter,
      capitalRecovered: asNumber(payment.capitalRecovered ?? payment.capital_recovered ?? 0),
      isPaid,
      status: payment.status || (isPaid ? "Pagada" : "Pendiente"),
    };
  }

  function normalizeContract(contract, index) {
    const schedule = Array.isArray(contract.schedule) ? contract.schedule.map(normalizePayment) : [];
    const capital = asNumber(contract.capital);
    const installments = Math.max(0, Math.trunc(asNumber(contract.installments) || schedule.length));
    const monthlyPrincipal = asNumber(contract.monthlyPrincipal ?? contract.monthly_principal ?? (installments ? capital / installments : 0));
    const monthlyInterest = asNumber(contract.monthlyInterest ?? contract.monthly_interest ?? 0);
    const totalInterest = asNumber(contract.totalInterest ?? contract.total_interest ?? monthlyInterest * installments);
    const totalReturn = asNumber(contract.totalReturn ?? contract.total_return ?? capital + totalInterest);
    const paidInstallments = Math.trunc(asNumber(contract.paidInstallments ?? contract.paid_installments ?? schedule.filter((payment) => payment.isPaid).length));
    const paidPrincipal = asNumber(contract.paidPrincipal ?? contract.paid_principal ?? schedule.filter((payment) => payment.isPaid).reduce((sum, payment) => sum + payment.principalAmount, 0));
    const paidInterest = asNumber(contract.paidInterest ?? contract.paid_interest ?? schedule.filter((payment) => payment.isPaid).reduce((sum, payment) => sum + payment.interestAmount, 0));
    const paidTotal = asNumber(contract.paidTotal ?? contract.paid_total ?? schedule.filter((payment) => payment.isPaid).reduce((sum, payment) => sum + payment.paidAmount, 0));
    const remainingPrincipal = asNumber(contract.remainingPrincipal ?? contract.remaining_principal ?? Math.max(0, capital - paidPrincipal));
    const nextPayment = contract.nextPayment ?? contract.next_payment ?? schedule.find((payment) => !payment.isPaid) ?? null;
    const paymentProgress = Number.isFinite(Number(contract.paymentProgress ?? contract.payment_progress))
      ? Number(contract.paymentProgress ?? contract.payment_progress)
      : installments
        ? paidInstallments / installments
        : 0;
    const documentUrl =
      contract.documentUrl ||
      contract.document_url ||
      contract.contractPdfUrl ||
      contract.contract_pdf_url ||
      contract.contractDriveFolderUrl ||
      contract.contract_drive_folder_url ||
      "";

    return {
      ...contract,
      id: asNumber(contract.id ?? index + 1),
      title: contract.title || contract.projectName || contract.project_name || "Contrato",
      projectName: contract.projectName || contract.project_name || contract.title || "Contrato",
      capital,
      annualInterest: asNumber(contract.annualInterest ?? contract.annual_interest),
      installments,
      monthlyPrincipal,
      monthlyInterest,
      totalInterest,
      totalReturn,
      documentUrl,
      contractPdfUrl: contract.contractPdfUrl ?? contract.contract_pdf_url ?? null,
      contractDriveFolderUrl: contract.contractDriveFolderUrl ?? contract.contract_drive_folder_url ?? "",
      startDate: String(contract.startDate ?? contract.start_date ?? ""),
      displayOrder: asNumber(contract.displayOrder ?? contract.display_order ?? index + 1),
      schedule,
      paidInstallments,
      paidPrincipal,
      paidInterest,
      paidTotal,
      remainingPrincipal,
      nextPayment,
      paymentProgress,
    };
  }

  function normalizePortfolio(portfolio) {
    const investor = portfolio.investor || {};
    const contracts = Array.isArray(portfolio.contracts)
      ? portfolio.contracts.map(normalizeContract)
      : [];

    return {
      ...portfolio,
      investor: {
        id: asNumber(investor.id),
        loginUser: investor.loginUser || investor.login_user || "",
        fullName: investor.fullName || investor.full_name || "",
        email: investor.email || "",
        address: investor.address || "",
        bankAccount: investor.bankAccount || investor.bank_account || "",
        summary: investor.summary || "",
      },
      contracts,
      selectedContractId: asNumber(portfolio.selectedContractId ?? portfolio.selected_contract_id ?? contracts[0]?.id ?? 0) || null,
    };
  }

  function setNavigation(loggedIn) {
    if (loginNav) {
      loginNav.hidden = loggedIn;
    }
    dashboardNavItems.forEach((item) => {
      item.hidden = !loggedIn;
    });
    if (logoutButton) {
      logoutButton.hidden = !loggedIn;
    }
  }

  function setView(loggedIn) {
    if (loginView) {
      loginView.hidden = loggedIn;
    }
    if (dashboardView) {
      dashboardView.hidden = !loggedIn;
    }
    setNavigation(loggedIn);
  }

  function activeContract() {
    if (!activePortfolio) {
      return null;
    }
    return (
      activePortfolio.contracts.find((contract) => contract.id === activeContractId) ||
      activePortfolio.contracts[0] ||
      null
    );
  }

  function renderContractTabs() {
    if (!contractTabs || !activePortfolio) {
      return;
    }

    contractTabs.replaceChildren();
    activePortfolio.contracts.forEach((contract) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "portfolio-tab";
      button.textContent = contract.projectName;
      button.setAttribute("aria-pressed", String(contract.id === activeContractId));
      button.addEventListener("click", () => {
        activeContractId = contract.id;
        renderContractTabs();
        renderDashboard();
      });
      contractTabs.append(button);
    });
  }

  function renderInvestorPanel() {
    if (!activePortfolio) {
      return;
    }

    const investor = activePortfolio.investor;
    const nameNode = document.querySelector("[data-investor-name]");
    const summaryNode = document.querySelector("[data-investor-summary]");
    const fullNameNode = document.querySelector("[data-investor-full-name]");
    const addressNode = document.querySelector("[data-investor-address]");
    const bankAccountNode = document.querySelector("[data-investor-bank-account]");

    if (nameNode) {
      nameNode.textContent = investor.fullName ? investor.fullName.split(" ")[0] : "Inversor";
    }
    if (summaryNode) {
      summaryNode.textContent = investor.summary || "Resumen actualizado con capital aportado, intereses y calendario de pagos.";
    }
    if (fullNameNode) {
      fullNameNode.textContent = investor.fullName || "";
    }
    if (addressNode) {
      addressNode.textContent = investor.address || "";
    }
    if (bankAccountNode) {
      bankAccountNode.textContent = investor.bankAccount || "";
    }
  }

  function contractTotals(contract) {
    const schedule = contract.schedule || [];
    const paidPayments = schedule.filter((payment) => payment.isPaid);
    const paidInstallments = contract.paidInstallments || paidPayments.length;
    const paidPrincipal = contract.paidPrincipal || paidPayments.reduce((sum, payment) => sum + payment.principalAmount, 0);
    const paidInterest = contract.paidInterest || paidPayments.reduce((sum, payment) => sum + payment.interestAmount, 0);
    const paidTotal = contract.paidTotal || paidPayments.reduce((sum, payment) => sum + payment.paidAmount, 0);
    const remainingPrincipal = Math.max(0, contract.capital - paidPrincipal);
    const progress = contract.paymentProgress || (contract.installments ? paidInstallments / contract.installments : 0);
    const nextPayment = contract.nextPayment || schedule.find((payment) => !payment.isPaid) || null;

    return {
      paidInstallments,
      paidPrincipal,
      paidInterest,
      paidTotal,
      remainingPrincipal,
      progress,
      nextPayment,
    };
  }

  function renderKpis(contract, totals) {
    if (!kpis) {
      return;
    }

    const rows = [
      ["Capital", money(contract.capital), `${contract.installments} cuotas mensuales`],
      ["Interés anual", rate(contract.annualInterest), `${money(contract.totalInterest)} totales`],
      ["Pagado", money(totals.paidTotal), `${rate(totals.progress)} de la inversión`],
      ["Pendiente", money(totals.remainingPrincipal), totals.nextPayment ? `Próxima cuota ${isoDateText(totals.nextPayment.dueDate)}` : "Contrato completado"],
    ];

    kpis.replaceChildren(
      ...rows.map(([label, value, sublabel]) => {
        const card = document.createElement("article");
        card.className = "kpi-card";

        const labelNode = document.createElement("span");
        labelNode.className = "kpi-label";
        labelNode.textContent = label;

        const valueNode = document.createElement("strong");
        valueNode.className = "kpi-value";
        valueNode.textContent = value;

        const subNode = document.createElement("span");
        subNode.className = "kpi-sub";
        subNode.textContent = sublabel;

        card.append(labelNode, valueNode, subNode);
        return card;
      }),
    );
  }

  function renderPrincipalChart(contract) {
    if (!principalChart) {
      return;
    }

    const schedule = contract.schedule || [];
    const timeline = [];
    let accumulatedPrincipal = 0;
    let accumulatedInterest = 0;

    schedule.forEach((payment) => {
      const principalAmount = asNumber(payment.principalAmount);
      const interestAmount = asNumber(payment.interestAmount);

      accumulatedPrincipal += principalAmount;
      accumulatedInterest += interestAmount;

      timeline.push({
        label: String(payment.installmentNumber),
        dueDate: payment.dueDate,
        principal: accumulatedPrincipal,
        interest: accumulatedInterest,
        total: accumulatedPrincipal + accumulatedInterest,
        monthPrincipal: principalAmount,
        monthInterest: interestAmount,
      });
    });

    const width = 640;
    const height = 280;
    const padding = { top: 30, right: 20, bottom: 48, left: 56 };
    const usableWidth = width - padding.left - padding.right;
    const usableHeight = height - padding.top - padding.bottom;
    const max = Math.max(contract.capital, ...timeline.map((item) => item.total), 1);
    const barGap = 8;
    const barWidth = timeline.length
      ? Math.max(12, (usableWidth - barGap * (timeline.length - 1)) / timeline.length)
      : usableWidth;
    const baseline = height - padding.bottom;
    const capitalLineY = baseline - (contract.capital / max) * usableHeight;
    const capitalLabelY = Math.max(padding.top + 10, capitalLineY - 8);
    const capitalLabel = `Capital inicial ${money(contract.capital)}`;

    principalChart.innerHTML = `
      <line class="chart-axis" x1="${padding.left}" y1="${baseline}" x2="${width - padding.right}" y2="${baseline}" />
      <line class="chart-grid" x1="${padding.left}" y1="${padding.top + usableHeight * 0.33}" x2="${width - padding.right}" y2="${padding.top + usableHeight * 0.33}" />
      <line class="chart-grid" x1="${padding.left}" y1="${padding.top + usableHeight * 0.66}" x2="${width - padding.right}" y2="${padding.top + usableHeight * 0.66}" />
      <line class="capital-reference" x1="${padding.left}" y1="${capitalLineY}" x2="${width - padding.right}" y2="${capitalLineY}" />
      <text class="capital-reference-label" x="${padding.left}" y="${capitalLabelY}" text-anchor="start">${capitalLabel}</text>
      ${timeline
        .map((item, index) => {
          const x = padding.left + index * (barWidth + barGap);
          const totalHeight = Math.max(2, (item.total / max) * usableHeight);
          const totalAmount = Math.max(item.total, 1);
          const principalHeight = totalHeight * (item.principal / totalAmount);
          const interestHeight = totalHeight - principalHeight;
          const principalY = baseline - principalHeight;
          const interestY = baseline - totalHeight;
          return `
            <g>
              <title>M${item.label} - ${isoDateText(item.dueDate)} - recuperado ${money(item.total)} (cuota ${money(item.monthPrincipal)} principal + ${money(item.monthInterest)} intereses)</title>
              <rect class="bar-interest" x="${x}" y="${interestY}" width="${barWidth}" height="${interestHeight}" rx="4" />
              <rect class="principal-bar" x="${x}" y="${principalY}" width="${barWidth}" height="${principalHeight}" rx="4" />
              <text class="chart-label" x="${x + barWidth / 2}" y="${height - 14}" text-anchor="middle">M${item.label}</text>
            </g>
          `;
        })
        .join("")}
      <text class="chart-value-label" x="${padding.left}" y="${padding.top - 6}">${money(contract.totalReturn)}</text>
    `;
  }

  function renderPaymentChart(contract) {
    if (!paymentChart) {
      return;
    }

    const schedule = contract.schedule || [];
    const visible = schedule;
    const width = 640;
    const height = 280;
    const padding = { top: 26, right: 20, bottom: 48, left: 56 };
    const usableWidth = width - padding.left - padding.right;
    const usableHeight = height - padding.top - padding.bottom;
    const max = Math.max(
      1,
      ...visible.map((payment) => payment.principalAmount + payment.interestAmount),
    );
    const barGap = 8;
    const barWidth = visible.length
      ? Math.max(12, (usableWidth - barGap * (visible.length - 1)) / visible.length)
      : usableWidth;
    const baseline = height - padding.bottom;

    paymentChart.innerHTML = `
      <line class="chart-axis" x1="${padding.left}" y1="${baseline}" x2="${width - padding.right}" y2="${baseline}" />
      ${visible
        .map((payment, index) => {
          const x = padding.left + index * (barWidth + barGap);
          const principalHeight = Math.max(1, (payment.principalAmount / max) * usableHeight);
          const interestHeight = Math.max(1, (payment.interestAmount / max) * usableHeight);
          const principalY = baseline - principalHeight;
          const interestY = principalY - interestHeight;
          return `
            <g>
              <rect class="bar-interest" x="${x}" y="${interestY}" width="${barWidth}" height="${interestHeight}" rx="4">
                <title>${isoDateText(payment.dueDate)} - Interés: ${money(payment.interestAmount)}</title>
              </rect>
              <rect class="bar-principal" x="${x}" y="${principalY}" width="${barWidth}" height="${principalHeight}" rx="4">
                <title>${isoDateText(payment.dueDate)} - Principal: ${money(payment.principalAmount)}</title>
              </rect>
              <text class="chart-label" x="${x + barWidth / 2}" y="${height - 14}" text-anchor="middle">${payment.installmentNumber}</text>
            </g>
          `;
        })
        .join("")}
      <text class="chart-value-label" x="${padding.left}" y="${padding.top - 6}">${money(max)}</text>
    `;
  }

  function renderContractFacts(contract, totals) {
    if (!contractFacts) {
      return;
    }

    const rows = [
      ["Contrato", contract.projectName],
      ["Capital", money(contract.capital)],
      ["Interés anual", rate(contract.annualInterest)],
      ["Interés mensual", money(contract.monthlyInterest)],
      ["Cuotas", `${contract.installments}`],
      ["Pagado", money(totals.paidTotal)],
    ];

    contractTitle.textContent = contract.projectName;
    const documentUrl = safeHref(contract.documentUrl);
    contractLink.href = documentUrl || "#";
    contractLink.toggleAttribute("aria-disabled", !documentUrl);
    contractLink.tabIndex = documentUrl ? 0 : -1;
    contractLink.textContent = documentUrl && documentUrl.includes("drive.google.com")
      ? "Abrir carpeta"
      : documentUrl && documentUrl.toLowerCase().includes(".pdf")
        ? "Ver PDF"
        : documentUrl
          ? "Ver contrato"
          : "Contrato no disponible";

    contractFacts.replaceChildren(
      ...rows.map(([label, value]) => {
        const row = document.createElement("div");
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = value;
        row.append(dt, dd);
        return row;
      }),
    );
  }

  function renderPayments(contract) {
    if (!paymentsTable) {
      return;
    }

    paymentsTable.replaceChildren(
      ...(contract.schedule || []).map((payment) => {
        const row = document.createElement("tr");
        const cells = [
          payment.installmentNumber,
          isoDateText(payment.dueDate),
          money(payment.principalAmount),
          money(payment.interestAmount),
          money(payment.totalAmount),
          money(payment.paidAmount),
        ];

        cells.forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });

        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        status.className = `payment-status${payment.isPaid ? "" : " pending"}`;
        status.textContent = payment.status;
        statusCell.append(status);
        row.append(statusCell);
        return row;
      }),
    );
  }

  function renderDashboard() {
    if (!activePortfolio) {
      return;
    }

    renderInvestorPanel();
    renderContractTabs();

    const contract = activeContract();
    if (!contract) {
      return;
    }

    const totals = contractTotals(contract);
    renderKpis(contract, totals);
    renderPrincipalChart(contract);
    renderPaymentChart(contract);
    renderContractFacts(contract, totals);
    renderPayments(contract);

    if (nextPayment) {
      nextPayment.textContent = totals.nextPayment
        ? `${money(totals.nextPayment.totalAmount)} el ${isoDateText(totals.nextPayment.dueDate)}`
        : "Completado";
    }
    if (growthTotal) {
      growthTotal.textContent = money(contract.totalReturn);
    }
  }

  function openDashboard(portfolio) {
    activePortfolio = normalizePortfolio(portfolio);
    activeContractId = activePortfolio.selectedContractId || activePortfolio.contracts[0]?.id || null;
    setView(true);
    renderDashboard();
    window.location.hash = "portal";
  }

  function closeDashboard() {
    activePortfolio = null;
    activeContractId = null;
    setView(false);
    setStatus("", "");
    if (loginForm) {
      loginForm.reset();
    }
    window.location.hash = "login";
  }

  async function fetchCurrentPortfolio() {
    const response = await fetch(API_ME_ENDPOINT, {
      headers: {
        Accept: "application/json",
      },
    });

    const raw = await response.text();
    let result = {};
    if (raw) {
      try {
        result = JSON.parse(raw);
      } catch {
        throw new SyntaxError("La respuesta del servidor no es válida.");
      }
    }

    if (!response.ok) {
      return null;
    }

    if (!result.ok || !result.portfolio) {
      return null;
    }

    return normalizePortfolio(result.portfolio);
  }

  async function handleLogin(event) {
    event.preventDefault();

    if (!loginForm?.reportValidity()) {
      return;
    }

    const formData = new FormData(loginForm);
    const user = String(formData.get("user") || "").trim();
    const password = String(formData.get("password") || "");

    setStatus("Entrando...", "loading");

    try {
      const response = await fetch(API_LOGIN_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user, password }),
      });

      const raw = await response.text();
      let result = {};
      if (raw) {
        try {
          result = JSON.parse(raw);
        } catch {
          throw new SyntaxError("La respuesta del servidor no es válida.");
        }
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "No se ha podido iniciar sesión.");
      }

      const portfolio = await fetchCurrentPortfolio();
      if (!portfolio) {
        throw new Error("No se ha podido cargar la cartera del inversor.");
      }

      if (loginForm) {
        loginForm.reset();
      }
      setStatus("", "");
      openDashboard(portfolio);
    } catch (error) {
      const message = error instanceof SyntaxError ? "La respuesta del servidor no es válida." : error.message;
      setStatus(message || "No se ha podido iniciar sesión.", "error");
    }
  }

  loginForm?.addEventListener("submit", handleLogin);

  async function handleLogout() {
    try {
      await fetch(API_LOGOUT_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
    } catch {
      // If logout fails locally, clear the UI and let the server-side session expire naturally.
    }

    closeDashboard();
  }

  logoutButton?.addEventListener("click", handleLogout);

  dashboardNavItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (!activePortfolio) {
        return;
      }
      const targetId = item.getAttribute("href")?.slice(1);
      if (!targetId) {
        return;
      }
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  (async () => {
    try {
      const portfolio = await fetchCurrentPortfolio();
      if (portfolio) {
        openDashboard(portfolio);
        return;
      }
    } catch {
      // Fall through to the login view.
    }

    setView(false);
    window.location.hash = "login";
  })();
})();
