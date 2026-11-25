(function () {
  function config() {
    return window.CrystalConfig.crystalseek || {};
  }

  function baseUrl() {
    const cfg = config();
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "";
    const value = isLocal ? cfg.localBaseUrl : cfg.publicBaseUrl;
    return String(value || "").replace(/\/$/, "");
  }

  function ensureConfigured() {
    if (!baseUrl()) {
      throw new Error("CrystalSeek 代理未配置。请先设置 crystalseek.publicBaseUrl，或在本地启动 proxy。");
    }
  }

  async function post(path, body) {
    ensureConfigured();
    const cfg = config();
    const controller = new AbortController();
    const timeout = window.setTimeout(function () { controller.abort(); }, cfg.timeoutMs || 15000);
    try {
      const response = await fetch(baseUrl() + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!response.ok) {
        let detail = "";
        try {
          const errorPayload = await response.json();
          detail = errorPayload.msg || errorPayload.message || errorPayload.error || "";
        } catch (error) {
          detail = "";
        }
        throw new Error("CrystalSeek HTTP " + response.status + (detail ? " · " + detail : ""));
      }
      return response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function toNumber(value) {
    if (value === undefined || value === null || value === "") return null;
    const text = String(value).replace(/\([^)]*\)/g, "").replace(/[^\d.+-]/g, "");
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  function unwrap(response) {
    if (!response) return {};
    if (response.data !== undefined && response.data !== null) return response.data;
    if (response.result !== undefined && response.result !== null) return response.result;
    return response;
  }

  function normalizeItem(item) {
    const source = item || {};
    const guid = source.guid || source.GUID || source.id || source.ID || "";
    const formula = source.chem_formula_sum || source.formula || source.real_name || source.name || "Unknown";
    return {
      id: String(guid || formula),
      guid: String(guid || ""),
      formula: String(formula),
      name: source.real_name || source.name || source.title || String(formula),
      space_group: source.space_group_name || source.space_group || "—",
      space_group_number: toNumber(source.int_Tables_number || source.space_group_number),
      lattice: {
        a: toNumber(source.a || source.cell_length_a),
        b: toNumber(source.b || source.cell_length_b),
        c: toNumber(source.c || source.cell_length_c),
        alpha: toNumber(source.alpha || source.cell_angle_alpha),
        beta: toNumber(source.beta || source.cell_angle_beta),
        gamma: toNumber(source.gamma || source.cell_angle_gamma)
      },
      source: source.journal_full || source.source || "CrystalSeek",
      license: source.doi || source.license || "CrystalSeek",
      stability: source.stability || "database",
      band_gap_ev: toNumber(source.band_gap || source.band_gap_ev),
      density_g_cm3: toNumber(source.density || source.density_g_cm3),
      tags: [source.cell_setting, source.crystal_system, source.space_group_name, source.chem_formula_sum].filter(Boolean),
      doi: source.doi || "",
      volume: toNumber(source.volume || source.cell_volume),
      raw: source
    };
  }

  function normalizeAtom(atom, index) {
    const source = atom || {};
    const el = source.type_symbol || source.element || source.symbol || source.atom_type || source.el || "C";
    const x = toNumber(source.fract_x !== undefined ? source.fract_x : source.x);
    const y = toNumber(source.fract_y !== undefined ? source.fract_y : source.y);
    const z = toNumber(source.fract_z !== undefined ? source.fract_z : source.z);
    const colors = window.CrystalData.elementColors || {};
    return {
      el: el,
      x: x === null ? Math.sin(index * 1.7) * 0.35 : (x - 0.5) * 2,
      y: y === null ? Math.cos(index * 1.3) * 0.35 : (y - 0.5) * 2,
      z: z === null ? Math.sin(index * 0.9) * 0.35 : (z - 0.5) * 2,
      color: colors[el] || "#94a3b8",
      occupancy: toNumber(source.occupancy) || 1
    };
  }

  function normalizePath(value) {
    return value ? String(value).replace(/[\\/]/g, "//") : "";
  }

  function normalizeDetail(data) {
    const source = data || {};
    const normalized = normalizeItem(source);
    normalized.atoms = Array.isArray(source.atoms) ? source.atoms.map(normalizeAtom) : [];
    normalized.xrd_path = normalizePath(source.xrd_path || source.xrdPath || "");
    normalized.cif_path = normalizePath(source.cif_path || source.cifPath || "");
    normalized.remark = source.remark || "";
    normalized.journal = source.journal_full || "";
    return normalized;
  }

  function isElementCombination(query) {
    const colors = window.CrystalData.elementColors || {};
    const parts = query.split("-").map(function (item) { return item.trim(); }).filter(Boolean);
    if (parts.length < 2) return false;
    return parts.every(function (item) {
      return /^[A-Z][a-z]?$/.test(item) && Boolean(colors[item]);
    });
  }

  function normalizeSearchPayload(payload) {
    const query = String(payload && payload.query ? payload.query : "").trim();
    const filter = payload && payload.filter ? payload.filter : "all";
    const isEmpty = query.length === 0;
    const isAtomSearch = isEmpty || filter === "elements" || (filter !== "space_group" && isElementCombination(query));
    let keyword = query;
    if (!isEmpty && isAtomSearch && query.indexOf("-") === -1) {
      keyword = query.split(/\s+/).filter(Boolean).map(function (item) { return "[" + item + "]"; }).join("-");
    }
    if (!isEmpty && isAtomSearch && query.indexOf("-") !== -1) {
      keyword = query.split("-").map(function (item) { return "[" + item.trim() + "]"; }).join("-");
    }
    return {
      searchType: isAtomSearch ? "atom" : "Materials",
      searchKeyword: keyword,
      logic: isEmpty ? "or" : (payload && payload.logic ? payload.logic : "only"),
      pagenum: payload && payload.page ? payload.page : 1,
      pagesize: payload && payload.pageSize ? payload.pageSize : 10
    };
  }

  async function searchStructures(payload) {
    const response = await post(config().searchPath || "/api/File/search", normalizeSearchPayload(payload));
    const data = unwrap(response);
    const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : Array.isArray(data.list) ? data.list : [];
    const total = response.count || response.total || data.count || data.total || items.length;
    return { total: total, items: items.map(normalizeItem) };
  }

  async function getStructure(payload) {
    const id = payload && payload.id ? payload.id : payload;
    const response = await post(config().detailPath || "/api/File/search_single", String(id));
    return normalizeDetail(unwrap(response));
  }

  function decodeBase64(value) {
    let text = String(value || "");
    if (text.indexOf(",") !== -1) text = text.split(",").pop();
    const binary = window.atob(text);
    try {
      return decodeURIComponent(Array.prototype.map.call(binary, function (character) {
        return "%" + ("00" + character.charCodeAt(0).toString(16)).slice(-2);
      }).join(""));
    } catch (error) {
      return binary;
    }
  }

  async function getFile(path) {
    const response = await post(config().filePath || "/api/File/get_file", String(path));
    const data = unwrap(response);
    return typeof data === "string" ? decodeBase64(data) : data;
  }

  function parsePattern(text) {
    const lines = String(text || "").trim().split(/\r?\n/);
    const x = [];
    const intensity = [];
    lines.forEach(function (line, index) {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (index === 0 && /theta|intensity|2theta/i.test(trimmed)) return;
      const parts = trimmed.split(/[\s,;]+/).filter(Boolean);
      const first = Number(parts[0]);
      const second = Number(parts[1]);
      if (Number.isFinite(first) && Number.isFinite(second)) {
        x.push(first);
        intensity.push(second);
      }
    });
    if (!x.length) return null;
    const step = Math.max(1, Math.ceil(x.length / 4000));
    const sampledX = x.filter(function (_, index) { return index % step === 0; });
    const sampledIntensity = intensity.filter(function (_, index) { return index % step === 0; });
    const max = Math.max.apply(null, sampledIntensity) || 1;
    return {
      x: sampledX,
      obs: sampledIntensity,
      calc: sampledIntensity.slice(),
      diff: sampledIntensity.map(function () { return 0; }),
      max: max * 1.05,
      peaks: [],
      pattern_id: "crystalseek_xrd",
      source: "CrystalSeek experimental"
    };
  }

  async function getPattern(payload) {
    const structure = payload && payload.structure ? payload.structure : payload;
    if (!structure || !structure.xrd_path) return null;
    const text = await getFile(structure.xrd_path);
    return parsePattern(text);
  }

  async function health() {
    const result = await searchStructures({ query: "Li", filter: "all", page: 1, pageSize: 1 });
    return { status: "ok", source: "crystalseek", total: result.total };
  }

  window.CrystalSeekAPI = {
    searchStructures: searchStructures,
    getStructure: getStructure,
    getPattern: getPattern,
    getFile: getFile,
    health: health,
    configured: function () { return Boolean(baseUrl()); },
    baseUrl: baseUrl
  };
})();
