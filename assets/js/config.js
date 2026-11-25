window.CrystalConfig = {
  useMock: false,
  dataSource: "auto",
  baseUrl: "http://localhost:8000",
  appName: "CrystalOS",
  version: "0.1.0",
  crystalseek: {
    localBaseUrl: "http://127.0.0.1:8787",
    publicBaseUrl: "https://crystalseek-proxy.gynb1.workers.dev",
    searchPath: "/api/File/search",
    detailPath: "/api/File/search_single",
    filePath: "/api/File/get_file",
    timeoutMs: 15000,
    fallbackToMock: true
  },
  endpoints: {
    health: "/api/health",
    searchStructures: "/api/structures/search",
    getStructure: "/api/structures/{id}",
    saveStructure: "/api/structures",
    generateStructures: "/api/csp/generate",
    simulateXrd: "/api/xrd/simulate",
    identifyPhases: "/api/characterization/identify",
    refinePattern: "/api/refinement/run",
    recommendSynthesis: "/api/synthesis/recommend",
    agentChat: "/api/agent/chat",
    getJob: "/api/jobs/{id}"
  },
  modules: {
    database: true,
    csp: true,
    characterization: true,
    refinement: true,
    synthesis: true,
    agent: true
  }
};

