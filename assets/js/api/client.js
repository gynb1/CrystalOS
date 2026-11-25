(function () {
  const config = window.CrystalConfig;
  const mock = window.CrystalMock;
  const crystalseek = window.CrystalSeekAPI;
  const databaseMethods = {
    health: true,
    searchStructures: true,
    getStructure: true,
    getPattern: true
  };

  function resolveSource() {
    const configured = config.dataSource || "auto";
    if (configured !== "auto") return configured;
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "";
    if (isLocal) return "crystalseek";
    return config.crystalseek && config.crystalseek.publicBaseUrl ? "crystalseek" : "mock";
  }

  function fillPath(template, params) {
    return template.replace(/\{(\w+)\}/g, function (_, key) {
      return encodeURIComponent(params && params[key] !== undefined ? params[key] : "");
    });
  }

  function envelope(data, meta) {
    return {
      ok: true,
      data: data,
      error: null,
      meta: meta || { source: resolveSource() },
      request_id: "req_" + Math.random().toString(36).slice(2, 10),
      elapsed_ms: 80 + Math.round(Math.random() * 320)
    };
  }

  async function request(method, path, body, query) {
    let url = config.baseUrl.replace(/\/$/, "") + path;
    if (query) {
      const search = new URLSearchParams();
      Object.keys(query).forEach(function (key) {
        if (query[key] !== undefined && query[key] !== null) {
          search.set(key, String(query[key]));
        }
      });
      const suffix = search.toString();
      if (suffix) {
        url += (url.indexOf("?") === -1 ? "?" : "&") + suffix;
      }
    }
    const headers = { "Content-Type": "application/json" };
    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok || !payload || payload.ok === false) {
      const error = new Error(payload && payload.error && payload.error.message ? payload.error.message : "API request failed");
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async function callCrystalSeek(mockName, payload) {
    if (!crystalseek) throw new Error("CrystalSeek adapter is not loaded");
    if (mockName === "searchStructures") return crystalseek.searchStructures(payload || {});
    if (mockName === "getStructure") return crystalseek.getStructure(payload || {});
    if (mockName === "getPattern") return crystalseek.getPattern(payload || {});
    if (mockName === "health") return crystalseek.health();
    throw new Error("Method not supported by CrystalSeek adapter");
  }

  async function call(mockName, realMethod, path, payload, query) {
    const source = resolveSource();
    if (source === "crystalseek" && crystalseek && databaseMethods[mockName]) {
      try {
        const data = await callCrystalSeek(mockName, payload);
        return envelope(data, { source: "crystalseek", fallback: false });
      } catch (error) {
        if (config.crystalseek && config.crystalseek.fallbackToMock && mock && typeof mock[mockName] === "function") {
          const fallback = await mock[mockName](payload || {});
          fallback.meta = {
            source: "mock",
            fallback: true,
            reason: error.message
          };
          return fallback;
        }
        throw error;
      }
    }
    if (mock && (source === "mock" || config.useMock || (source === "crystalseek" && !databaseMethods[mockName])) && typeof mock[mockName] === "function") {
      return mock[mockName](payload || {});
    }
    return request(realMethod, path, payload, query);
  }

  window.CrystalAPI = {
    health: function () {
      return call("health", "GET", config.endpoints.health);
    },
    searchStructures: function (payload) {
      return call("searchStructures", "POST", config.endpoints.searchStructures, payload);
    },
    getStructure: function (payload) {
      return call("getStructure", "GET", fillPath(config.endpoints.getStructure, payload), payload);
    },
    getPattern: function (payload) {
      return call("getPattern", "POST", config.endpoints.simulateXrd, payload);
    },
    saveStructure: function (payload) {
      return call("saveStructure", "POST", config.endpoints.saveStructure, payload);
    },
    generateStructures: function (payload) {
      return call("generateStructures", "POST", config.endpoints.generateStructures, payload);
    },
    simulateXrd: function (payload) {
      return call("simulateXrd", "POST", config.endpoints.simulateXrd, payload);
    },
    identifyPhases: function (payload) {
      return call("identifyPhases", "POST", config.endpoints.identifyPhases, payload);
    },
    refinePattern: function (payload) {
      return call("refinePattern", "POST", config.endpoints.refinePattern, payload);
    },
    recommendSynthesis: function (payload) {
      return call("recommendSynthesis", "POST", config.endpoints.recommendSynthesis, payload);
    },
    agentChat: function (payload) {
      return call("agentChat", "POST", config.endpoints.agentChat, payload);
    },
    getJob: function (payload) {
      return call("getJob", "GET", fillPath(config.endpoints.getJob, payload), payload);
    }
  };
})();

