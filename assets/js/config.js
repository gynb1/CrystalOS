window.CrystalConfig = {
  useMock: true,
  baseUrl: "http://localhost:8000",
  appName: "CrystalOS",
  version: "0.1.0",
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
