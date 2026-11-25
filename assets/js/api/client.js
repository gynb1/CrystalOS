(function () {
  const config = window.CrystalConfig;
  const mock = window.CrystalMock;

  function fillPath(template, params) {
    return template.replace(/\{(\w+)\}/g, function (_, key) {
      return encodeURIComponent(params && params[key] !== undefined ? params[key] : "");
    });
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

  async function call(mockName, realMethod, path, payload, query) {
    if (config.useMock && mock && typeof mock[mockName] === "function") {
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
      return call("getStructure", "GET", fillPath(config.endpoints.getStructure, payload), undefined);
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
      return call("getJob", "GET", fillPath(config.endpoints.getJob, payload));
    }
  };
})();
