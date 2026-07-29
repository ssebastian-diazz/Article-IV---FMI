const CAT_COLORS = {
  "Tasa de Política": "#C8102E",
  "Comunicación": "#1D4E89",
  "Tipo de Cambio": "#2E7D62",
  "Marco de Política Monetaria": "#6B4C9A",
  "Instrumentos y Balance": "#8A7B6C",
};

const AGREE_COLORS = {
  "Acepta / implementa": "#2E7D62",
  "Acepta parcialmente": "#7FA88A",
  "Reconoce el punto pero no se compromete": "#C9B458",
  "Rechaza o defiende postura contraria": "#C8102E",
  "Sin respuesta directa identificable": "#B8B6B2",
};

let DATA = null;
let recById = {};

fetch("data/dataset.json")
  .then((r) => r.json())
  .then((data) => {
    DATA = data;
    recById = Object.fromEntries(DATA.recommendations.map((r) => [r.id, r]));
    init();
  })
  .catch((err) => {
    document.querySelector("main").innerHTML =
      '<p style="padding:40px 0;color:#C8102E;font-family:monospace;">No se pudo cargar data/dataset.json — ' +
      err +
      "</p>";
  });

function init() {
  renderMastheadStats();
  renderRibbonChart();
  renderAgreementChart();
  renderStorylines();
  setupBrowser();
  setupTabs();
}

/* ---------------- Utilidades de texto / evidencia ---------------- */

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Envuelve la primera ocurrencia exacta de `fragment` dentro de `text` en un
// <mark> subrayado del color dado. Si el fragmento no aparece, regresa el
// texto sin modificar (nunca se rompe el render).
function underline(text, fragment, color) {
  const escaped = escapeHtml(text);
  if (!fragment) return escaped;
  const escapedFragment = escapeHtml(fragment);
  const idx = escaped.indexOf(escapedFragment);
  if (idx === -1) return escaped;
  return (
    escaped.slice(0, idx) +
    `<mark class="evidence-underline" style="color:${color};text-decoration-color:${color};">` +
    escaped.slice(idx, idx + escapedFragment.length) +
    "</mark>" +
    escaped.slice(idx + escapedFragment.length)
  );
}

/* ---------------- Tabs ---------------- */

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document
        .querySelectorAll(".view")
        .forEach((v) => v.classList.add("hidden"));
      document
        .getElementById("view-" + tab.dataset.view)
        .classList.remove("hidden");
    });
  });
}

/* ---------------- Masthead stats ---------------- */

function renderMastheadStats() {
  const recs = DATA.recommendations;
  const total = recs.length;
  const years = DATA.meta.years.length;
  const categories = DATA.meta.categories.length;
  const fullAgree = recs.filter(
    (r) => r.agreement_label === "Acepta / implementa"
  ).length;
  const pct = Math.round((fullAgree / total) * 100);

  const stats = [
    { value: total, label: "Recomendaciones" },
    { value: years, label: "Años cubiertos" },
    { value: categories, label: "Categorías" },
    { value: pct + "%", label: "Aceptadas sin matices" },
  ];

  const el = document.getElementById("masthead-stats");
  el.innerHTML = stats
    .map(
      (s) =>
        `<div class="mstat"><div class="mstat-value">${s.value}</div><div class="mstat-label">${s.label}</div></div>`
    )
    .join("");
}

/* ---------------- Ribbon chart (custom SVG stacked columns, clicable) ---------------- */

function renderRibbonChart() {
  const years = DATA.meta.years;
  const categories = DATA.meta.categories;
  const recs = DATA.recommendations;

  const byYear = {};
  years.forEach((y) => (byYear[y] = {}));
  recs.forEach((r) => {
    byYear[r.year][r.category] = (byYear[r.year][r.category] || 0) + 1;
  });

  const maxCount = Math.max(
    ...years.map((y) => Object.values(byYear[y]).reduce((a, b) => a + b, 0))
  );

  const colW = 76;
  const gap = 14;
  const chartH = 260;
  const padTop = 10;
  const padBottom = 30;
  const w = years.length * (colW + gap) + gap;
  const h = chartH + padTop + padBottom;
  const unitH = chartH / maxCount;

  let svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;

  years.forEach((y, i) => {
    const x = gap + i * (colW + gap);
    let yCursor = padTop + chartH;
    categories.forEach((cat) => {
      const count = byYear[y][cat] || 0;
      if (count === 0) return;
      const segH = count * unitH;
      yCursor -= segH;
      svg += `<rect class="ribbon-seg" data-year="${y}" data-category="${cat}" x="${x}" y="${yCursor}" width="${colW}" height="${segH}" fill="${CAT_COLORS[cat]}"><title>${cat} — ${y}: ${count} (clic para ver evidencia)</title></rect>`;
      if (segH > 14) {
        svg += `<text class="ribbon-count-label" x="${x + colW / 2}" y="${
          yCursor + segH / 2 + 4
        }" text-anchor="middle">${count}</text>`;
      }
    });
    svg += `<text class="ribbon-year-label" x="${x + colW / 2}" y="${
      h - 8
    }" text-anchor="middle">${y}</text>`;
  });

  svg += `</svg>`;
  document.getElementById("ribbon-chart").innerHTML = svg;

  document.getElementById("ribbon-legend").innerHTML = categories
    .map(
      (cat) =>
        `<div class="legend-item"><span class="legend-swatch" style="background:${CAT_COLORS[cat]}"></span>${cat}</div>`
    )
    .join("");

  document.querySelectorAll("#ribbon-chart .ribbon-seg").forEach((seg) => {
    seg.addEventListener("click", () => {
      document
        .querySelectorAll("#ribbon-chart .ribbon-seg")
        .forEach((s) => s.classList.remove("selected"));
      seg.classList.add("selected");
      showCategoryDetail(Number(seg.dataset.year), seg.dataset.category);
    });
  });
}

function showCategoryDetail(year, category) {
  const items = DATA.recommendations.filter(
    (r) => r.year === year && r.category === category
  );
  const panel = document.getElementById("category-detail");
  const color = CAT_COLORS[category];

  const recsHtml = items
    .map((r) => {
      const fragment = (r.category_evidence || [])[0] || null;
      const fragmentInThesis = fragment && r.thesis.includes(fragment);
      const fragmentInBody = fragment && !fragmentInThesis && r.body.includes(fragment);
      const thesisHtml = fragmentInThesis
        ? underline(r.thesis, fragment, color)
        : escapeHtml(r.thesis);
      const bodyHtml = fragmentInBody
        ? underline(r.body, fragment, color)
        : escapeHtml(r.body);
      return `
      <div class="detail-rec">
        <p class="detail-rec-thesis">${thesisHtml}</p>
        <p class="detail-rec-body">${bodyHtml}</p>
        <div class="detail-evidence-label">Por qué se clasificó como "${category}"</div>
        <p class="detail-quote">${
          fragment
            ? "El fragmento subrayado en el texto de arriba es lo que ubica esta recomendación en esta categoría."
            : "No se identificó un fragmento único; la clasificación se basa en el sentido general del texto."
        }</p>
      </div>`;
    })
    .join("");

  panel.innerHTML = `
    <div class="detail-header">
      <span class="detail-title">${category} — ${year} (${items.length} ${
    items.length === 1 ? "recomendación" : "recomendaciones"
  })</span>
      <button class="detail-close" id="category-detail-close">Cerrar</button>
    </div>
    ${recsHtml}`;
  panel.classList.remove("hidden");
  document
    .getElementById("category-detail-close")
    .addEventListener("click", () => {
      panel.classList.add("hidden");
      document
        .querySelectorAll("#ribbon-chart .ribbon-seg")
        .forEach((s) => s.classList.remove("selected"));
    });
  panel.scrollIntoView({ behavior: "instant", block: "nearest" });
}

/* ---------------- Agreement chart (custom SVG, clicable) ---------------- */

function renderAgreementChart() {
  const years = DATA.meta.years;
  const levels = DATA.meta.agreement_scale;
  const recs = DATA.recommendations;

  const byYear = {};
  years.forEach((y) => (byYear[y] = {}));
  recs.forEach((r) => {
    byYear[r.year][r.agreement_label] =
      (byYear[r.year][r.agreement_label] || 0) + 1;
  });

  const maxCount = Math.max(
    ...years.map((y) => Object.values(byYear[y]).reduce((a, b) => a + b, 0))
  );

  const colW = 76;
  const gap = 14;
  const chartH = 220;
  const padTop = 10;
  const padBottom = 30;
  const w = years.length * (colW + gap) + gap;
  const h = chartH + padTop + padBottom;
  const unitH = chartH / maxCount;

  let svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;

  years.forEach((y, i) => {
    const x = gap + i * (colW + gap);
    let yCursor = padTop + chartH;
    levels.forEach((level) => {
      const count = byYear[y][level] || 0;
      if (count === 0) return;
      const segH = count * unitH;
      yCursor -= segH;
      svg += `<rect class="ribbon-seg" data-year="${y}" data-level="${level}" x="${x}" y="${yCursor}" width="${colW}" height="${segH}" fill="${AGREE_COLORS[level]}"><title>${level} — ${y}: ${count} (clic para ver evidencia)</title></rect>`;
      if (segH > 14) {
        svg += `<text class="ribbon-count-label" x="${x + colW / 2}" y="${
          yCursor + segH / 2 + 4
        }" text-anchor="middle">${count}</text>`;
      }
    });
    svg += `<text class="ribbon-year-label" x="${x + colW / 2}" y="${
      h - 8
    }" text-anchor="middle">${y}</text>`;
  });

  svg += `</svg>`;
  document.getElementById("agreement-chart").innerHTML = svg;

  document.getElementById("agreement-legend").innerHTML = levels
    .map(
      (level) =>
        `<div class="legend-item"><span class="legend-swatch" style="background:${AGREE_COLORS[level]}"></span>${level}</div>`
    )
    .join("");

  document.querySelectorAll("#agreement-chart .ribbon-seg").forEach((seg) => {
    seg.addEventListener("click", () => {
      document
        .querySelectorAll("#agreement-chart .ribbon-seg")
        .forEach((s) => s.classList.remove("selected"));
      seg.classList.add("selected");
      showAgreementDetail(Number(seg.dataset.year), seg.dataset.level);
    });
  });
}

function showAgreementDetail(year, level) {
  const items = DATA.recommendations.filter(
    (r) => r.year === year && r.agreement_label === level
  );
  const panel = document.getElementById("agreement-detail");
  const color = AGREE_COLORS[level];

  const recsHtml = items
    .map((r) => {
      const quote = r.agreement_evidence;
      return `
      <div class="detail-rec">
        <p class="detail-rec-thesis">${escapeHtml(r.thesis)}</p>
        <p class="detail-rec-body">${escapeHtml(r.body)}</p>
        <div class="detail-evidence-label">Respuesta literal de las autoridades ese año</div>
        ${
          quote
            ? `<p class="detail-quote" style="border-left-color:${color};">"${escapeHtml(
                quote
              )}"</p>`
            : `<p class="detail-quote empty">No se encontró una declaración específica de las autoridades sobre este punto ese año — por eso se clasificó como "${level}".</p>`
        }
      </div>`;
    })
    .join("");

  panel.innerHTML = `
    <div class="detail-header">
      <span class="detail-title">${level} — ${year} (${items.length} ${
    items.length === 1 ? "recomendación" : "recomendaciones"
  })</span>
      <button class="detail-close" id="agreement-detail-close">Cerrar</button>
    </div>
    ${recsHtml}`;
  panel.classList.remove("hidden");
  document
    .getElementById("agreement-detail-close")
    .addEventListener("click", () => {
      panel.classList.add("hidden");
      document
        .querySelectorAll("#agreement-chart .ribbon-seg")
        .forEach((s) => s.classList.remove("selected"));
    });
  panel.scrollIntoView({ behavior: "instant", block: "nearest" });
}

/* ---------------- Storylines ---------------- */

function renderStorylines() {
  const container = document.getElementById("storylines-container");
  const entries = Object.entries(DATA.storylines);
  container.innerHTML = entries
    .map(([cat, story]) => renderStorylineCard(cat, story))
    .join("");
}

function findMaxSimilarity(cat, yearA, yearB) {
  const pairs = DATA.similarity_pairs;
  let max = 0;
  pairs.forEach((p) => {
    if (
      p.category === cat &&
      ((p.year_a === yearA && p.year_b === yearB) ||
        (p.year_a === yearB && p.year_b === yearA))
    ) {
      if (p.similarity > max) max = p.similarity;
    }
  });
  return max;
}

function renderStorylineCard(cat, story) {
  const color = CAT_COLORS[cat] || "#8A7B6C";
  const years = story.arco.map((b) => b.year);

  const nodeGap = 130;
  const padX = 40;
  const svgW = padX * 2 + Math.max(0, years.length - 1) * nodeGap;
  const svgH = 90;
  const cy = 40;

  let svg = `<svg viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">`;

  for (let i = 0; i < years.length - 1; i++) {
    const sim = findMaxSimilarity(cat, years[i], years[i + 1]);
    const x1 = padX + i * nodeGap;
    const x2 = padX + (i + 1) * nodeGap;
    const strokeW = 1.5 + sim * 10;
    const opacity = 0.25 + sim * 0.6;
    svg += `<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}" stroke="${color}" stroke-width="${strokeW.toFixed(
      1
    )}" opacity="${opacity.toFixed(2)}"><title>Similaridad ${years[i]}→${
      years[i + 1]
    }: ${(sim * 100).toFixed(0)}%</title></line>`;
  }

  years.forEach((y, i) => {
    const x = padX + i * nodeGap;
    svg += `<circle cx="${x}" cy="${cy}" r="7" fill="${color}"></circle>`;
    svg += `<text class="beat-node-label" x="${x}" y="${
      cy + 26
    }" text-anchor="middle">${y}</text>`;
  });

  svg += `</svg>`;

  const beatsHtml = story.arco
    .map((b) => {
      const quotes = (b.rec_ids || [])
        .map((rid) => recById[rid])
        .filter(Boolean)
        .map((r) => `<p class="beat-quote">"${escapeHtml(r.thesis)}"</p>`)
        .join("");
      return `
    <div class="beat">
      <div class="beat-year">${b.year}</div>
      <div>
        <p class="beat-text">${escapeHtml(b.beat)}</p>
        ${quotes}
      </div>
    </div>`;
    })
    .join("");

  const conclusiones = (story.conclusiones || [])
    .slice(0, 3)
    .map((c) => `<li>${escapeHtml(c)}</li>`)
    .join("");

  return `
  <div class="storyline-card">
    <div class="storyline-head">
      <span class="storyline-swatch" style="background:${color}"></span>
      <h3 class="storyline-title">${cat}</h3>
    </div>
    <p class="storyline-summary">${escapeHtml(story.resumen)}</p>
    <div class="storyline-svg-wrap">${svg}</div>
    <div class="storyline-beats">${beatsHtml}</div>
    <div class="storyline-insight">
      <strong>Conclusiones</strong>
      <ul>${conclusiones}</ul>
    </div>
  </div>`;
}

/* ---------------- Browser ---------------- */

function setupBrowser() {
  const catSel = document.getElementById("filter-category");
  const yearSel = document.getElementById("filter-year");
  const agreeSel = document.getElementById("filter-agreement");

  DATA.meta.categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    catSel.appendChild(opt);
  });

  [...DATA.meta.years].reverse().forEach((y) => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  });

  DATA.meta.agreement_scale.forEach((a) => {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = a;
    agreeSel.appendChild(opt);
  });

  [catSel, yearSel, agreeSel].forEach((sel) =>
    sel.addEventListener("change", renderRecList)
  );

  document.getElementById("filter-reset").addEventListener("click", () => {
    catSel.value = "";
    yearSel.value = "";
    agreeSel.value = "";
    renderRecList();
  });

  renderRecList();
}

function renderRecList() {
  const cat = document.getElementById("filter-category").value;
  const year = document.getElementById("filter-year").value;
  const agree = document.getElementById("filter-agreement").value;

  let recs = [...DATA.recommendations].sort(
    (a, b) => b.year - a.year || a.id - b.id
  );

  if (cat) recs = recs.filter((r) => r.category === cat);
  if (year) recs = recs.filter((r) => r.year === Number(year));
  if (agree) recs = recs.filter((r) => r.agreement_label === agree);

  document.getElementById(
    "results-count"
  ).textContent = `${recs.length} de ${DATA.recommendations.length} recomendaciones`;

  document.getElementById("rec-list").innerHTML = recs
    .map((r) => {
      const subBullets = r.sub_bullets.length
        ? `<ul style="margin:0 0 10px 18px;padding:0;font-size:14.5px;color:var(--ink-soft);">${r.sub_bullets
            .map((sb) => `<li style="margin-bottom:4px;">${escapeHtml(sb)}</li>`)
            .join("")}</ul>`
        : "";
      return `
      <div class="rec-card">
        <div class="rec-meta">
          <div class="rec-year">${r.year}</div>
          <span class="rec-cat-tag" style="background:${
            CAT_COLORS[r.category]
          }">${r.category}</span>
        </div>
        <div class="rec-content">
          <p class="rec-thesis">${escapeHtml(r.thesis)}</p>
          <p class="rec-body">${escapeHtml(r.body)}</p>
          ${subBullets}
          <div class="rec-footer">
            <span class="rec-agreement" style="border-color:${
              AGREE_COLORS[r.agreement_label]
            }; color:${AGREE_COLORS[r.agreement_label]};">${
        r.agreement_label
      }</span>
            <span class="rec-rationale">${escapeHtml(r.agreement_rationale)}</span>
          </div>
        </div>
      </div>`;
    })
    .join("");
}
