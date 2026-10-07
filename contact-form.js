(() => {
  const form = document.querySelector("[data-owner-contact-form]");
  if (!form) {
    return;
  }

  const status = form.querySelector("[data-owner-form-status]");
  const whatsappNumber = "34635335513";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const data = new FormData(form);
    const name = String(data.get("nombre") || "").trim();
    const phone = String(data.get("telefono") || "").trim();
    const price = String(data.get("precio_alquiler") || "").trim();
    const neighbourhood = String(data.get("barrio") || "").trim();
    const extra = String(data.get("mensaje") || "").trim();
    const lines = [
      "Hola, quiero información sobre la gestión de mi vivienda.",
      `Nombre: ${name}`,
      `Teléfono: ${phone}`,
      `Precio actual de alquiler: ${price} €/mes`,
      `Barrio: ${neighbourhood}`,
    ];

    if (extra) {
      lines.push(`Información adicional: ${extra}`);
    }

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    if (status) {
      status.hidden = false;
      status.dataset.state = "success";
      status.textContent = "Se ha preparado tu mensaje de WhatsApp con los datos indicados.";
    }
  });
})();
