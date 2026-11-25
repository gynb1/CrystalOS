(function () {
  const $ = function (selector, root) { return (root || document).querySelector(selector); };
  const $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

  const state = {
    selectedStructure: null,
    cspCandidates: [],
    pattern: null,
    phaseResult: null,
    refinement: null,
    synthesis: null,
    activeTab: "database",
    dbQuery: "",
    dbFilter: "all",
    dbPage: 1,
    dbPageSize: 10,
    dbTotal: 0,
    selectionToken: 0
  };

  const endpointDescriptions = {
    health: "服务健康检查",
    searchStructures: "数据库结构检索",
    getStructure: "结构详情",
    saveStructure: "结构入库",
    generateStructures: "CSP / DNG 生成",
    simulateXrd: "从结构模拟 PXRD",
    identifyPhases: "物相识别与多相分解",
    refinePattern: "Rietveld / Le Bail / Pawley 精修",
    recommendSynthesis: "固相配方、AI 经验、新反应",
    agentChat: "Agent 工具编排与对话",
    getJob: "长任务状态查询"
  };

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatPercent(value) {
    return (Number(value) * 100).toFixed(1) + "%";
  }

  function formatNumber(value, digits) {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return "—";
    return Number(value).toFixed(digits === undefined ? 2 : digits);
  }

  function currentSource() {
    const configured = window.CrystalConfig.dataSource || "auto";
    if (configured !== "auto") return configured;
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "";
    if (isLocal) return "crystalseek";
    const cfg = window.CrystalConfig.crystalseek || {};
    return cfg.publicBaseUrl ? "crystalseek" : "mock";
  }

  function updateDataSourceUI(meta) {
    const source = currentSource();
    const label = $("#dataSourceLabel");
    const badge = $("#dataSourceBadge");
    const hint = $("#dataSourceHint");
    const select = $("#dataSourceSelect");
    if (select) select.value = source;
    if (!label || !badge || !hint) return;
    badge.classList.remove("live", "fallback");
    if (source === "crystalseek") {
      label.textContent = meta && meta.fallback ? "CrystalSeek · fallback" : "CrystalSeek";
      hint.textContent = meta && meta.fallback
        ? "CrystalSeek 不可用，当前回退到 Mock"
        : "CrystalSeek · /api/File/search";
      if (meta && meta.fallback) badge.classList.add("fallback");
      else badge.classList.add("live");
    } else {
      label.textContent = "Mock API";
      hint.textContent = "演示数据 · 切换数据源即可连接 CrystalSeek";
    }
    const directoryMeta = $("#dbDirectoryMeta");
    if (directoryMeta) {
      directoryMeta.textContent = source === "crystalseek"
        ? (meta && meta.fallback ? "CrystalSeek · fallback" : "CrystalSeek · 已接入")
        : "CrystalOS Demo · 内置";
    }
  }

  function filterDbDirectory() {
    const grid = $("#dbDirectoryGrid");
    if (!grid) return;
    const query = String($("#dbDirectorySearch") ? $("#dbDirectorySearch").value : "").trim().toLowerCase();
    const active = $(".db-filter.active");
    const filter = active ? active.dataset.dbFilter : "all";
    let visible = 0;
    $$(".db-directory-item", grid).forEach(function (item) {
      const categories = String(item.dataset.dbCategory || "").split(/\s+/);
      const haystack = (String(item.dataset.dbSearch || "") + " " + item.textContent).toLowerCase();
      const matchesQuery = !query || haystack.indexOf(query) !== -1;
      const matchesFilter = filter === "all" || categories.indexOf(filter) !== -1;
      const show = matchesQuery && matchesFilter;
      item.hidden = !show;
      if (show) visible += 1;
    });
    const empty = $("#dbDirectoryEmpty");
    if (empty) empty.hidden = visible !== 0;
  }

  function resetDbDirectory() {
    const search = $("#dbDirectorySearch");
    if (search) search.value = "";
    $$(".db-filter").forEach(function (button) {
      button.classList.toggle("active", button.dataset.dbFilter === "all");
    });
    filterDbDirectory();
  }

  function openDbDirectory() {
    const modal = $("#dbDirectoryModal");
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    resetDbDirectory();
    window.setTimeout(function () {
      const search = $("#dbDirectorySearch");
      if (search) search.focus();
    }, 60);
  }

  function closeDbDirectory() {
    const modal = $("#dbDirectoryModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  function showDbLoading() {
    $("#dbResults").innerHTML = '<div class="db-loading"><span class="spinner"></span>正在检索 CrystalSeek…</div>';
    $("#dbPagination").innerHTML = "";
  }

  function renderDbSourceNote(meta) {
    const note = $("#dbSourceNote");
    if (!note) return;
    if (meta && meta.source === "crystalseek") {
      note.innerHTML = '<span class="status-dot ready"></span>数据来自 CrystalSeek · <code>/api/File/search</code>';
    } else if (meta && meta.fallback) {
      note.innerHTML = '<span class="status-dot beta"></span>CrystalSeek 未连接，已回退 Mock · ' + escapeHtml(meta.reason || "");
    } else {
      note.innerHTML = '<span class="status-dot beta"></span>数据来自 Mock 适配器 · 切换到 CrystalSeek 可连接真实数据库';
    }
  }

  function renderDbPagination() {
    const holder = $("#dbPagination");
    const total = Number(state.dbTotal) || 0;
    const size = Number(state.dbPageSize) || 10;
    const pages = Math.max(1, Math.ceil(total / size));
    if (total <= 0 || pages <= 1) {
      holder.innerHTML = total > 0 ? '<span class="page-info">共 ' + total + ' 条</span>' : "";
      return;
    }
    holder.innerHTML = '<button type="button" data-page="prev"' + (state.dbPage <= 1 ? " disabled" : "") + '>上一页</button>' +
      '<span class="page-info">第 ' + state.dbPage + ' / ' + pages + ' 页 · 共 ' + total + ' 条</span>' +
      '<button type="button" data-page="next"' + (state.dbPage >= pages ? " disabled" : "") + '>下一页</button>';
    $$("button", holder).forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.dataset.page === "prev" && state.dbPage > 1) {
          state.dbPage -= 1;
          runDbSearch(state.dbQuery, state.dbFilter, state.dbPage);
        }
        if (button.dataset.page === "next" && state.dbPage < pages) {
          state.dbPage += 1;
          runDbSearch(state.dbQuery, state.dbFilter, state.dbPage);
        }
      });
    });
  }

  function toast(title, message) {
    const stack = $("#toastStack");
    const node = document.createElement("div");
    node.className = "toast";
    node.innerHTML = "<strong>" + escapeHtml(title) + "</strong>" + escapeHtml(message);
    stack.appendChild(node);
    window.setTimeout(function () {
      node.style.opacity = "0";
      node.style.transform = "translateY(8px)";
      window.setTimeout(function () { node.remove(); }, 220);
    }, 3800);
  }

  function normalizePattern(input) {
    const x = input.x || input.two_theta || [];
    const obs = input.obs || input.observed || input.intensity || [];
    const calc = input.calc || input.calculated || [];
    const diff = input.diff || input.difference || obs.map(function (value, index) {
      return Number((value - (calc[index] || 0)).toFixed(4));
    });
    return {
      x: x,
      obs: obs,
      calc: calc,
      diff: diff,
      max: input.max || Math.max.apply(null, obs.concat(calc).concat([1])),
      peaks: input.peaks || [],
      pattern_id: input.pattern_id || "pat_demo",
      source: input.source || "Demo"
    };
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.innerHTML;
      button.disabled = true;
      button.innerHTML = label || "处理中…";
    } else {
      button.disabled = false;
      if (button.dataset.label) {
        button.innerHTML = button.dataset.label;
        delete button.dataset.label;
      }
    }
  }

  function updatePipeline(active) {
    const done = {
      database: Boolean(state.selectedStructure),
      csp: state.cspCandidates.length > 0,
      characterization: Boolean(state.phaseResult),
      refinement: Boolean(state.refinement),
      synthesis: Boolean(state.synthesis)
    };
    $$(".pipeline-step").forEach(function (step) {
      const key = step.dataset.step;
      step.classList.toggle("done", done[key] && key !== active);
      step.classList.toggle("active", key === active);
    });
  }

  function activateTab(name, shouldScroll) {
    state.activeTab = name;
    $$(".tab").forEach(function (tab) {
      const active = tab.dataset.tab === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    $$(".tab-panel").forEach(function (panel) {
      panel.classList.toggle("active", panel.dataset.panel === name);
    });
    updatePipeline(name);
    if (shouldScroll) {
      const section = $("#workspace");
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderHero() {
    if (!state.selectedStructure) return;
    window.CrystalCharts.renderCrystal($("#heroCrystal"), state.selectedStructure, { width: 420, height: 320, scale: 108 });
    const pattern = window.CrystalData.defaultPattern;
    window.CrystalCharts.renderXrd($("#heroXrd"), pattern, { width: 420, height: 110, compact: true });
  }

  function renderStructureCard(structure) {
    $("#structureTitle").textContent = structure.formula + " · " + structure.name;
    $("#structureSource").textContent = structure.source || "CrystalDB";
    if (structure.atoms && structure.atoms.length) {
      window.CrystalCharts.renderCrystal($("#structureView"), structure, { width: 420, height: 300, scale: 100 });
      renderStructureLegend(structure);
    } else {
      $("#structureView").innerHTML = '<text x="210" y="150" fill="#8ff0e4" font-size="11" text-anchor="middle">正在加载结构详情…</text>';
      $("#structureLegend").innerHTML = "";
    }
    renderStructureProps(structure);
    updatePipeline("database");
  }

  async function selectStructure(structure, options) {
    const token = ++state.selectionToken;
    state.selectedStructure = structure;
    renderStructureCard(structure);
    $$(".result-item").forEach(function (item) {
      item.classList.toggle("active", item.dataset.id === structure.id);
    });
    if (options && options.silent !== true) {
      toast("Structure selected", structure.formula + " · " + structure.space_group);
    }
    if (currentSource() === "crystalseek" && structure.id && (!structure.atoms || !structure.atoms.length)) {
      try {
        const response = await window.CrystalAPI.getStructure({ id: structure.id });
        if (token !== state.selectionToken) return;
        updateDataSourceUI(response.meta);
        if (response.meta && response.meta.fallback) {
          $("#structureView").innerHTML = '<text x="210" y="150" fill="#f5c76a" font-size="11" text-anchor="middle">详情接口不可用</text>';
          toast("Detail unavailable", "CrystalSeek 详情接口不可用，保留检索结果。");
          return;
        }
        const detail = response.data || {};
        state.selectedStructure = Object.assign({}, structure, detail, {
          id: structure.id,
          formula: detail.formula || structure.formula,
          name: detail.name || structure.name
        });
        renderStructureCard(state.selectedStructure);
      } catch (error) {
        if (token === state.selectionToken) {
          toast("Structure detail failed", error.message);
        }
      }
    }
  }

  function renderStructureLegend(structure) {
    const seen = {};
    const elements = [];
    (structure.atoms || []).forEach(function (atom) {
      if (!seen[atom.el]) {
        seen[atom.el] = true;
        elements.push(atom);
      }
    });
    $("#structureLegend").innerHTML = elements.map(function (atom) {
      return '<span><i style="background:' + atom.color + '"></i>' + escapeHtml(atom.el) + "</span>";
    }).join("");
  }

  function displayValue(value, suffix) {
    if (value === undefined || value === null || value === "" || value === "—") return "—";
    return String(value) + (suffix || "");
  }

  function renderStructureProps(structure) {
    const lattice = structure.lattice || {};
    const group = structure.space_group || "—";
    const groupNumber = structure.space_group_number ? " (#" + structure.space_group_number + ")" : "";
    const items = [
      ["化学式", structure.formula || "—"],
      ["空间群", group + groupNumber],
      ["晶格", formatNumber(lattice.a, 3) + " / " + formatNumber(lattice.b, 3) + " / " + formatNumber(lattice.c, 3) + " Å"],
      ["稳定性", displayValue(structure.stability)],
      ["带隙", displayValue(structure.band_gap_ev, " eV")],
      ["密度", displayValue(structure.density_g_cm3, " g/cm³")]
    ];
    $("#structureProps").innerHTML = items.map(function (item) {
      return "<div><span>" + escapeHtml(item[0]) + "</span><strong>" + escapeHtml(item[1]) + "</strong></div>";
    }).join("");
  }

  function renderDbResults(items) {
    const list = $("#dbResults");
    if (!items.length) {
      list.innerHTML = '<div class="result-empty">没有找到匹配结构。试试 Li6PS5Cl、F-43m 或 solid electrolyte。</div>';
      return;
    }
    list.innerHTML = items.map(function (item) {
      return '<div class="result-item' + (state.selectedStructure && state.selectedStructure.id === item.id ? " active" : "") + '" data-id="' + escapeHtml(item.id) + '">' +
        "<div><strong>" + escapeHtml(item.formula) + "</strong><small>" + escapeHtml(item.name) + "</small></div>" +
        '<div class="result-meta"><b>' + escapeHtml(item.space_group) + "</b><small>" + escapeHtml(item.source) + "</small></div>" +
        "</div>";
    }).join("");
    $$(".result-item", list).forEach(function (node) {
      node.addEventListener("click", function () {
        const selected = items.find(function (item) { return item.id === node.dataset.id; });
        if (selected) selectStructure(selected);
      });
    });
  }

  async function runDbSearch(query, filter, page) {
    state.dbQuery = query || "";
    state.dbFilter = filter || "all";
    state.dbPage = page || 1;
    showDbLoading();
    try {
      const response = await window.CrystalAPI.searchStructures({
        query: state.dbQuery,
        filter: state.dbFilter,
        page: state.dbPage,
        pageSize: state.dbPageSize,
        limit: state.dbPageSize
      });
      const items = response.data.items || [];
      state.dbTotal = Number(response.data.total) || items.length;
      renderDbResults(items);
      renderDbPagination();
      updateDataSourceUI(response.meta);
      renderDbSourceNote(response.meta);
      if (items.length && (!state.selectedStructure || !items.some(function (item) { return item.id === state.selectedStructure.id; }))) {
        selectStructure(items[0], { silent: true });
      }
      return items;
    } catch (error) {
      $("#dbResults").innerHTML = '<div class="result-empty">检索失败：' + escapeHtml(error.message) + "</div>";
      $("#dbPagination").innerHTML = "";
      $("#dbSourceNote").innerHTML = '<span class="status-dot beta"></span>连接失败：' + escapeHtml(error.message);
      throw error;
    }
  }

  function renderCspResults(candidates) {
    const list = $("#cspResults");
    $("#cspCount").textContent = String(candidates.length);
    if (!candidates.length) {
      list.innerHTML = '<div class="result-empty">尚未运行 CSP / DNG 任务。</div>';
      return;
    }
    list.innerHTML = candidates.map(function (candidate) {
      const score = Math.round(candidate.score * 100);
      return '<div class="candidate-item" data-id="' + escapeHtml(candidate.id) + '">' +
        '<div class="candidate-score" style="background:conic-gradient(#2dd4bf 0 ' + score + '%, rgba(255,255,255,.12) ' + score + '% 100%)">' + score + "</div>" +
        "<div><strong>" + escapeHtml(candidate.name) + "</strong><small>" + escapeHtml(candidate.method.toUpperCase()) + " · " + escapeHtml(candidate.space_group) + " · E " + formatNumber(candidate.energy_ev_atom, 2) + " eV/atom · synth " + formatPercent(candidate.synthesizability) + "</small></div>" +
        '<button class="btn btn-ghost" type="button" data-candidate="' + escapeHtml(candidate.id) + '">送入表征</button>' +
        "</div>";
    }).join("");
    $$("[data-candidate]", list).forEach(function (button) {
      button.addEventListener("click", function () {
        const candidate = candidates.find(function (item) { return item.id === button.dataset.candidate; });
        if (candidate) sendCandidateToCharacterization(candidate);
      });
    });
  }

  async function runCsp() {
    const button = $("#cspForm button[type=submit]");
    setBusy(button, true, "生成中…");
    try {
      const response = await window.CrystalAPI.generateStructures({
        composition: $("#cspComposition").value.trim() || "Li6PS5Cl",
        method: $("#cspMethod").value,
        space_group: $("#cspSpaceGroup").value.trim() || "F-43m",
        constraints: $("#cspConstraints").value
      });
      state.cspCandidates = response.data.candidates || [];
      renderCspResults(state.cspCandidates);
      updatePipeline("csp");
      toast("CSP / DNG completed", "已生成 " + state.cspCandidates.length + " 个候选结构。");
    } catch (error) {
      toast("Generation failed", error.message);
    } finally {
      setBusy(button, false);
    }
  }

  function sendCandidateToCharacterization(candidate) {
    const base = window.CrystalData.findStructure("st_li6ps5cl");
    const structure = {
      id: candidate.id,
      formula: candidate.formula,
      name: candidate.name,
      space_group: candidate.space_group,
      space_group_number: 216,
      lattice: base.lattice,
      source: "CSP / DNG",
      license: "demo",
      stability: "candidate",
      band_gap_ev: "—",
      density_g_cm3: "—",
      tags: ["CSP", "candidate"],
      atoms: candidate.atoms,
      peaks: candidate.peaks
    };
    state.selectedStructure = structure;
    $("#structureTitle").textContent = structure.formula + " · " + structure.name;
    $("#structureSource").textContent = structure.source;
    window.CrystalCharts.renderCrystal($("#structureView"), structure, { width: 420, height: 300, scale: 100 });
    renderStructureLegend(structure);
    renderStructureProps(structure);
    const pattern = normalizePattern(window.CrystalData.makePattern(candidate.peaks, { noise: 0.007 }));
    state.pattern = Object.assign(pattern, { pattern_id: "pat_csp_demo", source: "CSP candidate" });
    renderPatternChart();
    identifyCurrentPattern("st_li6ps5cl");
    activateTab("characterization", true);
    toast("Candidate sent", candidate.name + " 已进入表征面板。");
  }

  function renderPatternChart() {
    if (!state.pattern) return;
    window.CrystalCharts.renderXrd($("#xrdChart"), state.pattern, { width: 760, height: 320 });
    const x = state.pattern.x;
    $("#patternMeta").textContent = "2θ " + formatNumber(x[0], 1) + "–" + formatNumber(x[x.length - 1], 1) + "° · " + x.length + " points · source: " + state.pattern.source;
  }

  function renderPhaseResults(result) {
    const list = $("#phaseResults");
    if (!result || !result.phases || !result.phases.length) {
      list.innerHTML = '<div class="result-empty">尚未进行物相识别。</div>';
      $("#phaseDiagnosis").innerHTML = "";
      return;
    }
    list.innerHTML = result.phases.map(function (phase) {
      return '<div class="phase-item">' +
        '<div class="phase-item-top"><div><strong>' + escapeHtml(phase.formula) + "</strong><small>" + escapeHtml(phase.name || phase.structure_id) + " · weight " + formatPercent(phase.weight_fraction) + " · matched " + phase.matched_peaks + " peaks</small></div><span class=\"phase-confidence\">" + formatPercent(phase.confidence) + "</span></div>" +
        '<div class="phase-bar"><i style="width:' + Math.round(phase.confidence * 100) + '%"></i></div>' +
        "</div>";
    }).join("");
    const diagnosis = result.diagnosis || {};
    $("#phaseDiagnosis").innerHTML = "<strong>Diagnosis</strong>" +
      (diagnosis.is_multiphase ? "多相图谱；" : "单相图谱；") +
      (diagnosis.is_amorphous ? "存在非晶背景；" : "无明显非晶；") +
      "未解释弱峰 " + escapeHtml(diagnosis.unknown_peaks || 0) + " 个。" +
      (diagnosis.notes ? " " + escapeHtml(diagnosis.notes) : "");
  }

  async function identifyCurrentPattern(sourceId) {
    try {
      const response = await window.CrystalAPI.identifyPhases({
        pattern_id: state.pattern ? state.pattern.pattern_id : "pat_exp_demo",
        source_structure_id: sourceId || "st_li6ps5cl",
        options: { allow_multiphase: true, max_phases: 5, use_composition: false }
      });
      state.phaseResult = response.data;
      renderPhaseResults(state.phaseResult);
      updatePipeline("characterization");
    } catch (error) {
      toast("Phase identification failed", error.message);
    }
  }

  function loadDemoPattern() {
    const pattern = normalizePattern(window.CrystalData.defaultPattern);
    state.pattern = Object.assign(pattern, { pattern_id: "pat_exp_demo", source: "experimental demo" });
    renderPatternChart();
    identifyCurrentPattern("st_li6ps5cl");
    activateTab("characterization", true);
    toast("Demo pattern loaded", "已载入 Li6PS5Cl + 第二相的示例 PXRD。");
  }

  async function simulateStructureXrd(structureId) {
    const button = $("#simulateFromDb");
    setBusy(button, true, "加载中…");
    try {
      if (currentSource() === "crystalseek" && state.selectedStructure && state.selectedStructure.xrd_path) {
        try {
          const realResponse = await window.CrystalAPI.getPattern({ structure: state.selectedStructure });
          if (realResponse.data) {
            state.pattern = normalizePattern(realResponse.data);
            state.pattern.source = "CrystalSeek experimental · " + state.selectedStructure.formula;
            state.pattern.pattern_id = "cs_xrd_" + state.selectedStructure.id;
            state.phaseResult = null;
            renderPatternChart();
            $("#phaseResults").innerHTML = '<div class="result-empty">已加载真实实验 XRD。物相识别模块尚未接入，当前不生成 Mock 物相结果。</div>';
            $("#phaseDiagnosis").innerHTML = "<strong>Note</strong>数据库谱图已接通；物相识别、精修与定量分析仍为 Mock，后续接入后会自动更新。";
            updatePipeline("characterization");
            activateTab("characterization", true);
            toast("CrystalSeek PXRD loaded", "已加载数据库中的实验 XRD；物相识别模块仍为 Mock。");
            return;
          }
        } catch (error) {
          toast("XRD file unavailable", "数据库 XRD 文件加载失败，使用模拟谱。");
        }
      }
      const response = await window.CrystalAPI.simulateXrd({ structure_id: structureId });
      state.pattern = normalizePattern(response.data);
      state.pattern.source = "simulated · " + state.selectedStructure.formula;
      state.pattern.pattern_id = response.data.pattern_id;
      renderPatternChart();
      await identifyCurrentPattern(structureId);
      activateTab("characterization", true);
      toast("PXRD simulated", "已生成 " + state.selectedStructure.formula + " 的模拟图谱。");
    } catch (error) {
      toast("Simulation failed", error.message);
    } finally {
      setBusy(button, false);
    }
  }

  function renderRefinement() {
    if (!state.refinement) return;
    const data = state.refinement;
    window.CrystalCharts.renderXrd($("#refineChart"), data.pattern, { width: 760, height: 320 });
    const metrics = data.metrics || {};
    const metricItems = [
      ["Rwp", formatPercent(metrics.rwp)],
      ["Rp", formatPercent(metrics.rp)],
      ["Rexp", formatPercent(metrics.rexp)],
      ["GoF", formatNumber(metrics.gof, 2)],
      ["χ²", formatNumber(metrics.chi2, 2)],
      ["engine", data.engine || "auto"]
    ];
    $("#refineMetrics").innerHTML = metricItems.map(function (item) {
      return '<div class="metric-card"><span>' + escapeHtml(item[0]) + "</span><strong>" + escapeHtml(item[1]) + "</strong></div>";
    }).join("");
    const params = data.parameters || [];
    $("#refineParams").innerHTML = '<div class="param-row head"><span>参数</span><span>值</span><span>ESD</span></div>' +
      params.map(function (param) {
        return '<div class="param-row"><b>' + escapeHtml(param.name) + "</b><span>" + formatNumber(param.value, 4) + " " + escapeHtml(param.unit || "") + "</span><span>" + formatNumber(param.esd, 4) + "</span></div>";
      }).join("");
    $("#refineEngine").textContent = data.engine || "auto";
    const warnings = data.warnings || [];
    $("#refineWarnings").innerHTML = warnings.map(function (warning) {
      return "<span>" + escapeHtml(warning) + "</span>";
    }).join("");
  }

  async function sendToRefine() {
    if (!state.pattern) loadDemoPattern();
    if (state.pattern && String(state.pattern.source).indexOf("CrystalSeek experimental") !== -1) {
      toast("Mock refinement", "真实 XRD 已加载，但精修模块尚未接入，以下指标为演示数据。");
    }
    const button = $("#sendToRefine");
    setBusy(button, true, "精修中…");
    try {
      const response = await window.CrystalAPI.refinePattern({
        pattern_id: state.pattern ? state.pattern.pattern_id : "pat_exp_demo",
        structure_ids: [state.selectedStructure ? state.selectedStructure.id : "st_li6ps5cl"],
        method: "rietveld",
        engine: "auto"
      });
      state.refinement = response.data;
      state.refinement.pattern = normalizePattern(response.data.pattern);
      renderRefinement();
      activateTab("refinement", true);
      updatePipeline("refinement");
      toast("Refinement completed", "Rwp = " + formatPercent(response.data.metrics.rwp) + "，结果已可写入数据库。");
    } catch (error) {
      toast("Refinement failed", error.message);
    } finally {
      setBusy(button, false);
    }
  }

  async function saveRefinement() {
    if (!state.refinement) {
      toast("No refinement", "请先完成一次精修。");
      return;
    }
    const button = $("#saveRefinement");
    setBusy(button, true, "写入中…");
    try {
      await window.CrystalAPI.saveStructure({
        cif: "data_demo_refinement",
        project_id: "prj_demo",
        source: "demo_refinement",
        license: "user_owned",
        tags: ["refinement", state.selectedStructure ? state.selectedStructure.formula : "demo"]
      });
      toast("Saved to CrystalDB", "精修结果、参数与证据链已写入 Demo 数据库。");
    } catch (error) {
      toast("Save failed", error.message);
    } finally {
      setBusy(button, false);
    }
  }

  function renderSynthesis() {
    const data = state.synthesis;
    if (!data) return;
    const recipe = data.recipe || {};
    const conditions = recipe.conditions || [];
    const insights = data.insights || [];
    const reactions = data.recommended_reactions || [];
    $("#synthesisGrid").innerHTML =
      '<article class="synth-card">' +
        '<div class="synth-card-head"><span class="flow-icon icon-teal"><svg class="icon"><use href="#i-flask"></use></svg></span><div><h4>无机固相反应配方</h4><p>' + escapeHtml(recipe.route || "solid state") + "</p></div></div>" +
        '<div class="recipe-list">' + (recipe.precursors || []).map(function (item) {
          return '<div class="recipe-item"><strong>' + escapeHtml(item.formula) + "</strong><span>" + escapeHtml(item.ratio) + " eq · " + escapeHtml(item.mass) + "</span></div>";
        }).join("") + "</div>" +
        '<div class="condition-grid">' + conditions.map(function (item) {
          return "<div><span>" + escapeHtml(item[0]) + "</span><b>" + escapeHtml(item[1]) + "</b></div>";
        }).join("") + "</div>" +
      "</article>" +
      '<article class="synth-card">' +
        '<div class="synth-card-head"><span class="flow-icon icon-gold"><svg class="icon"><use href="#i-spark"></use></svg></span><div><h4>AI 学习经验</h4><p>来自历史实验与失败案例</p></div></div>' +
        '<div class="insight-list">' + insights.map(function (item) {
          return '<div class="insight-item"><strong>' + escapeHtml(item.text) + '</strong><span>' + escapeHtml(item.evidence || "CrystalDB") + '</span><i class="insight-confidence">confidence ' + formatPercent(item.confidence) + "</i></div>";
        }).join("") + "</div>" +
      "</article>" +
      '<article class="synth-card">' +
        '<div class="synth-card-head"><span class="flow-icon icon-violet"><svg class="icon"><use href="#i-refine"></use></svg></span><div><h4>推荐新型反应</h4><p>可实验性与新颖性联合排序</p></div></div>' +
        '<div class="reaction-list">' + reactions.map(function (item) {
          return '<div class="reaction-item"><strong>' + escapeHtml(item.reaction) + '</strong><div class="reaction-meta"><span>score ' + formatNumber(item.score, 2) + "</span><span>novelty " + formatNumber(item.novelty, 2) + "</span><span>risk " + escapeHtml(item.risk) + "</span></div></div>";
        }).join("") + "</div>" +
      "</article>";
  }

  async function runSynthesis() {
    const button = $("#generateSynthesis");
    setBusy(button, true, "生成中…");
    try {
      const response = await window.CrystalAPI.recommendSynthesis({
        target: state.selectedStructure ? state.selectedStructure.formula : "Li6PS5Cl",
        route: "solid_state",
        constraints: { atmosphere: "Ar", max_temperature_c: 550 }
      });
      state.synthesis = response.data;
      renderSynthesis();
      updatePipeline("synthesis");
      toast("Synthesis plan ready", "固相配方、AI 经验与新反应已生成。");
    } catch (error) {
      toast("Synthesis failed", error.message);
    } finally {
      setBusy(button, false);
    }
  }

  function appendChat(role, text, toolCalls) {
    const log = $("#agentLog");
    const node = document.createElement("div");
    node.className = "chat-message " + role;
    let html = escapeHtml(text);
    if (toolCalls && toolCalls.length) {
      html += '<div class="tool-calls">' + toolCalls.map(function (call) {
        return '<div class="tool-call"><svg class="icon"><use href="#i-check"></use></svg><b>' + escapeHtml(call.tool) + "</b><span>" + escapeHtml(call.status) + "</span></div>";
      }).join("") + "</div>";
    }
    node.innerHTML = html;
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
  }

  function renderAgentSuggestions() {
    const prompts = [
      "检索 Li6PS5Cl 并生成 XRD",
      "识别这张物相并给出精修建议",
      "推荐 Li6PS5Cl 固相合成路线",
      "解释当前精修残差"
    ];
    $("#agentSuggestions").innerHTML = prompts.map(function (prompt) {
      return '<button class="suggestion" type="button">' + escapeHtml(prompt) + "</button>";
    }).join("");
    $$(".suggestion").forEach(function (button) {
      button.addEventListener("click", function () {
        $("#agentInput").value = button.textContent;
        sendAgentMessage(button.textContent);
      });
    });
  }

  async function sendAgentMessage(message) {
    const text = String(message || "").trim();
    if (!text) return;
    appendChat("user", text);
    $("#agentInput").value = "";
    const button = $("#agentForm button[type=submit]");
    setBusy(button, true, "…");
    try {
      const response = await window.CrystalAPI.agentChat({
        message: text,
        project_id: "prj_demo",
        context: {
          selected_structure_id: state.selectedStructure ? state.selectedStructure.id : null,
          selected_pattern_id: state.pattern ? state.pattern.pattern_id : null
        }
      });
      const data = response.data;
      appendChat("agent", data.message, data.tool_calls);
      if (data.tool_calls && data.tool_calls.some(function (call) { return call.tool === "simulate_xrd"; })) {
        loadDemoPattern();
      }
      if (data.tool_calls && data.tool_calls.some(function (call) { return call.tool === "recommend_synthesis"; })) {
        runSynthesis();
      }
      if (data.tool_calls && data.tool_calls.some(function (call) { return call.tool === "run_refinement"; })) {
        sendToRefine();
      }
    } catch (error) {
      appendChat("agent", "请求失败：" + error.message + "。请检查 API 配置或稍后重试。");
    } finally {
      setBusy(button, false);
    }
  }

  function renderEndpointList(target, modal) {
    const config = window.CrystalConfig;
    const rows = Object.keys(config.endpoints).map(function (key) {
      const method = key === "health" || key === "getStructure" || key === "getJob" ? "GET" : "POST";
      const description = endpointDescriptions[key] || key;
      return '<div class="endpoint-row"><span class="endpoint-method">' + method + "</span><div><code>" + escapeHtml(config.endpoints[key]) + "</code><span>" + escapeHtml(description) + "</span></div></div>";
    });
    target.innerHTML = rows.join("");
  }

  function openApiModal() {
    const modal = $("#apiModal");
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    renderEndpointList($("#modalEndpoints"), true);
  }

  function closeApiModal() {
    $("#apiModal").hidden = true;
    document.body.style.overflow = "";
  }

  function initCanvas() {
    const canvas = $("#latticeCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let points = [];
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(28, Math.min(64, Math.floor(width / 24)));
      points = Array.from({ length: count }, function (_, index) {
        return {
          x: (Math.sin(index * 12.9898) * 0.5 + 0.5) * width,
          y: (Math.sin(index * 78.233 + 1.7) * 0.5 + 0.5) * height,
          vx: (Math.sin(index * 3.1) * 0.5) * 0.16,
          vy: (Math.cos(index * 4.7) * 0.5) * 0.16,
          r: 0.8 + (index % 4) * 0.5
        };
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < points.length; i += 1) {
        const a = points[i];
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < -20) a.x = width + 20;
        if (a.x > width + 20) a.x = -20;
        if (a.y < -20) a.y = height + 20;
        if (a.y > height + 20) a.y = -20;
        for (let j = i + 1; j < points.length; j += 1) {
          const b = points[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = "rgba(103, 232, 249, " + (0.09 * (1 - distance / 150)).toFixed(3) + ")";
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(45, 212, 191, 0.28)";
        ctx.fill();
      }
      raf = window.requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", function () {
      window.cancelAnimationFrame(raf);
      resize();
      draw();
    });
  }

  function initReveal() {
    const elements = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      elements.forEach(function (element) { element.classList.add("in"); });
      return;
    }
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    elements.forEach(function (element) { observer.observe(element); });
  }

  function bindEvents() {
    const header = $("#siteHeader");
    window.addEventListener("scroll", function () {
      header.classList.toggle("scrolled", window.scrollY > 20);
    }, { passive: true });

    const navToggle = $("#navToggle");
    const mainNav = $("#mainNav");
    navToggle.addEventListener("click", function () {
      const open = mainNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("a", mainNav).forEach(function (link) {
      link.addEventListener("click", function () {
        mainNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });

    $$(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () { activateTab(tab.dataset.tab); });
    });

    $$(".pipeline-step").forEach(function (step) {
      step.addEventListener("click", function () { activateTab(step.dataset.step); });
    });

    $$("[data-tab-link]").forEach(function (link) {
      link.addEventListener("click", function () {
        activateTab(link.dataset.tabLink, true);
      });
    });

    $$("[data-open-db-directory]").forEach(function (button) {
      button.addEventListener("click", openDbDirectory);
    });
    $$("[data-close-db-directory]").forEach(function (button) {
      button.addEventListener("click", closeDbDirectory);
    });
    const directoryModal = $("#dbDirectoryModal");
    if (directoryModal) {
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !directoryModal.hidden) closeDbDirectory();
      });
      const search = $("#dbDirectorySearch");
      if (search) search.addEventListener("input", filterDbDirectory);
      $$(".db-filter").forEach(function (button) {
        button.addEventListener("click", function () {
          $$(".db-filter").forEach(function (item) { item.classList.remove("active"); });
          button.classList.add("active");
          filterDbDirectory();
        });
      });
      $$(".db-directory-item", directoryModal).forEach(function (link) {
        link.addEventListener("click", closeDbDirectory);
      });
    }

    $$("[data-open-api]").forEach(function (button) {
      button.addEventListener("click", openApiModal);
    });
    $$("[data-close-modal]").forEach(function (button) {
      button.addEventListener("click", closeApiModal);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !$("#apiModal").hidden) closeApiModal();
    });

    const dataSourceSelect = $("#dataSourceSelect");
    if (dataSourceSelect) {
      dataSourceSelect.addEventListener("change", function () {
        window.CrystalConfig.dataSource = dataSourceSelect.value;
        state.dbPage = 1;
        state.selectedStructure = null;
        updateDataSourceUI();
        runDbSearch(state.dbQuery, state.dbFilter, 1).catch(function (error) {
          toast("DataSource failed", error.message);
        });
        toast("DataSource switched", dataSourceSelect.value === "crystalseek" ? "正在连接 CrystalSeek 数据库。" : "已切换到 Mock 演示数据。");
      });
    }

    $("#dbSearchForm").addEventListener("submit", function (event) {
      event.preventDefault();
      runDbSearch($("#dbQuery").value, $("#dbFilter").value, 1).catch(function (error) {
        toast("Search failed", error.message);
      });
    });

    $("#simulateFromDb").addEventListener("click", function () {
      if (state.selectedStructure) simulateStructureXrd(state.selectedStructure.id);
    });

    $("#sendDbToCsp").addEventListener("click", function () {
      if (state.selectedStructure) {
        $("#cspComposition").value = state.selectedStructure.formula;
        $("#cspSpaceGroup").value = state.selectedStructure.space_group;
        activateTab("csp", true);
        toast("Seed loaded", "已把 " + state.selectedStructure.formula + " 作为 CSP 种子。");
      }
    });

    $("#cspForm").addEventListener("submit", function (event) {
      event.preventDefault();
      runCsp();
    });

    $("#loadDemoPattern").addEventListener("click", function (event) {
      event.stopPropagation();
      loadDemoPattern();
    });

    const dropzone = $("#patternDrop");
    const fileInput = $("#patternFile");
    dropzone.addEventListener("click", function () { fileInput.click(); });
    dropzone.addEventListener("dragover", function (event) {
      event.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", function () { dropzone.classList.remove("dragover"); });
    dropzone.addEventListener("drop", function (event) {
      event.preventDefault();
      dropzone.classList.remove("dragover");
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) {
        loadDemoPattern();
        toast("File received", file.name + " · Demo 模式使用示例数据解析。");
      }
    });
    fileInput.addEventListener("change", function () {
      const file = fileInput.files && fileInput.files[0];
      if (file) {
        loadDemoPattern();
        toast("File received", file.name + " · Demo 模式使用示例数据解析。");
      }
    });

    $("#sendToRefine").addEventListener("click", sendToRefine);
    $("#saveRefinement").addEventListener("click", saveRefinement);
    $("#generateSynthesis").addEventListener("click", runSynthesis);

    $("#agentForm").addEventListener("submit", function (event) {
      event.preventDefault();
      sendAgentMessage($("#agentInput").value);
    });
  }

  async function loadInitialData() {
    state.selectedStructure = window.CrystalData.structures[0];
    selectStructure(state.selectedStructure, { silent: true });
    renderHero();
    renderAgentSuggestions();
    updateDataSourceUI();

    const localPattern = normalizePattern(window.CrystalData.defaultPattern);
    state.pattern = Object.assign(localPattern, { pattern_id: "pat_exp_demo", source: "experimental demo" });
    renderPatternChart();

    await runDbSearch("", "all", 1);

    const results = await Promise.all([
      window.CrystalAPI.generateStructures({
        composition: "Li6PS5Cl",
        method: "csp",
        space_group: "F-43m",
        constraints: "300 K, 0 GPa"
      }),
      window.CrystalAPI.identifyPhases({
        pattern_id: "pat_exp_demo",
        source_structure_id: "st_li6ps5cl",
        options: { allow_multiphase: true, max_phases: 5 }
      }),
      window.CrystalAPI.refinePattern({
        pattern_id: "pat_exp_demo",
        structure_ids: ["st_li6ps5cl"],
        method: "rietveld",
        engine: "auto"
      }),
      window.CrystalAPI.recommendSynthesis({
        target: "Li6PS5Cl",
        route: "solid_state",
        constraints: { atmosphere: "Ar" }
      })
    ]);

    state.cspCandidates = results[0].data.candidates || [];
    renderCspResults(state.cspCandidates);
    state.phaseResult = results[1].data;
    renderPhaseResults(state.phaseResult);
    state.refinement = results[2].data;
    state.refinement.pattern = normalizePattern(results[2].data.pattern);
    renderRefinement();
    state.synthesis = results[3].data;
    renderSynthesis();
    renderEndpointList($("#endpointList"));
    updatePipeline("database");

    appendChat("agent", "我是 CrystalOS 工作流代理。当前已连接 CrystalDB、CSP/DNG、物相识别、精修与合成推荐工具。你可以直接描述任务，我会先调用工具，再给出带来源的结论。");
  }

  function init() {
    initCanvas();
    initReveal();
    bindEvents();
    loadInitialData().catch(function (error) {
      toast("Initialization failed", error.message);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
