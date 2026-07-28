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

fetch("dataset.json")
  .then((r) => r.json())
  .then((data) => {
    DATA = data;
    init();
  })
  .catch((err) => {
    document.querySelector("main").innerHTML =
      '<p style="padding:40px 0;color:#C8102E;font-family:monospace;">No se pudo cargar data/dataset.json — ' +
      err +
      "</p>";
  });

function init() {
  renderRibbonChart();
  renderAgreementChart();
  renderRankLists();
  renderStorylines();
  setupBrowser();
  setupTabs();
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



/* ---------------- Ribbon chart (custom SVG stacked columns) ---------------- */

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
    ...years.map((y) =>
      Object.values(byYear[y]).reduce((a, b) => a + b, 0)
    )
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
      svg += `<rect class="ribbon-seg" x="${x}" y="${yCursor}" width="${colW}" height="${segH}" fill="${CAT_COLORS[cat]}"><title>${cat} — ${y}: ${count}</title></rect>`;
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
}

/* ---------------- Agreement chart (custom SVG, same idiom as ribbon chart) ---------------- */

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
      svg += `<rect class="ribbon-seg" x="${x}" y="${yCursor}" width="${colW}" height="${segH}" fill="${AGREE_COLORS[level]}"><title>${level} — ${y}: ${count}</title></rect>`;
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
}

/* ---------------- Rank lists ---------------- */

function renderRankLists() {
  const recs = [...DATA.recommendations];

  const recurrent = [...recs]
    .sort((a, b) => b.persistence.max_sim_prior - a.persistence.max_sim_prior)
    .slice(0, 6);

  const novel = recs
    .filter((r) => r.persistence.max_sim_prior === 0)
    .slice(0, 6);

  document.getElementById("rank-recurrent").innerHTML = recurrent
    .map(
      (r, i) => `
    <li>
      <span class="rank-num">${i + 1}</span>
      <span class="rank-text"><span class="rank-year">${r.year}</span>${r.thesis}</span>
      <span class="rank-score">${(r.persistence.max_sim_prior * 100).toFixed(0)}%</span>
    </li>`
    )
    .join("");

  document.getElementById("rank-novel").innerHTML = novel
    .map(
      (r, i) => `
    <li>
      <span class="rank-num">${i + 1}</span>
      <span class="rank-text"><span class="rank-year">${r.year}</span>${r.thesis}</span>
      <span class="rank-score">nueva</span>
    </li>`
    )
    .join("");
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

  // ---- conector SVG ----
  const nodeGap = 130;
  const padX = 40;
  const svgW = padX * 2 + (years.length - 1) * nodeGap;
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

  // ---- beats ----
  const beatsHtml = story.arco
    .map(
      (b) => `
    <div class="beat">
      <div class="beat-year">${b.year}</div>
      <div class="beat-text">${b.beat}</div>
    </div>`
    )
    .join("");

  return `
  <div class="storyline-card">
    <div class="storyline-head">
      <span class="storyline-swatch" style="background:${color}"></span>
      <h3 class="storyline-title">${cat}</h3>
    </div>
    <p class="storyline-summary">${story.resumen}</p>
    <div class="storyline-svg-wrap">${svg}</div>
    <div class="storyline-beats">${beatsHtml}</div>
    <div class="storyline-insight">
      <strong>Lectura para el dashboard</strong>
      ${story.insight}
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

  let recs = [...DATA.recommendations].sort((a, b) => b.year - a.year || a.id - b.id);

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
            .map((sb) => `<li style="margin-bottom:4px;">${sb}</li>`)
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
          <p class="rec-thesis">${r.thesis}</p>
          <p class="rec-body">${r.body}</p>
          ${subBullets}
          <div class="rec-footer">
            <span class="rec-agreement" style="border-color:${
              AGREE_COLORS[r.agreement_label]
            }; color:${AGREE_COLORS[r.agreement_label]};">${
        r.agreement_label
      }</span>
            <span class="rec-rationale">${r.agreement_rationale}</span>
          </div>
        </div>
      </div>`;
    })
    .join("");
}
