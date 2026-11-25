(function () {
  const data = window.CrystalData;

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function envelope(payload) {
    return {
      ok: true,
      data: payload,
      error: null,
      request_id: "req_" + Math.random().toString(36).slice(2, 10),
      elapsed_ms: 120 + Math.round(Math.random() * 380)
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function findStructure(id) {
    return data.structures.find(function (item) { return item.id === id; }) || data.structures[0];
  }

  function searchStructures(payload) {
    const query = String(payload && payload.query ? payload.query : "").trim().toLowerCase();
    const filter = payload && payload.filter ? payload.filter : "all";
    let items = data.structures.slice();
    if (query) {
      items = items.filter(function (item) {
        const haystack = [
          item.id,
          item.formula,
          item.name,
          item.space_group,
          item.source,
          item.tags.join(" ")
        ].join(" ").toLowerCase();
        return haystack.indexOf(query) !== -1;
      });
    }
    if (filter === "formula") {
      items = items.filter(function (item) { return item.formula.toLowerCase().indexOf(query) !== -1; });
    }
    if (filter === "space_group") {
      items = items.filter(function (item) { return item.space_group.toLowerCase().indexOf(query) !== -1; });
    }
    return {
      total: items.length,
      items: clone(items)
    };
  }

  function generateStructures(payload) {
    const base = data.structures[0];
    const composition = payload && payload.composition ? payload.composition : "Li6PS5Cl";
    const method = payload && payload.method ? payload.method : "csp";
    const spaceGroup = payload && payload.space_group ? payload.space_group : base.space_group;
    const seeds = [
      { suffix: "A", score: 0.94, energy: -4.21, volume: 956.4, synth: 0.86, uncertainty: 0.05, shift: 0 },
      { suffix: "B", score: 0.89, energy: -4.16, volume: 962.8, synth: 0.79, uncertainty: 0.07, shift: 0.12 },
      { suffix: "C", score: 0.83, energy: -4.08, volume: 971.3, synth: 0.72, uncertainty: 0.09, shift: -0.14 },
      { suffix: "D", score: 0.76, energy: -3.97, volume: 984.6, synth: 0.64, uncertainty: 0.12, shift: 0.2 }
    ];
    const candidates = seeds.map(function (seed, index) {
      return {
        id: "csp_" + method + "_" + seed.suffix.toLowerCase(),
        formula: composition,
        name: composition + " candidate " + seed.suffix,
        method: method,
        space_group: spaceGroup,
        score: seed.score,
        energy_ev_atom: seed.energy,
        volume_a3: seed.volume,
        synthesizability: seed.synth,
        uncertainty: seed.uncertainty,
        source_structure_id: base.id,
        peaks: base.peaks.map(function (peak) {
          return { x: Number((peak.x + seed.shift).toFixed(2)), intensity: peak.intensity, hkl: peak.hkl };
        }),
        atoms: clone(base.atoms)
      };
    });
    return {
      job_id: "job_csp_" + Date.now(),
      candidates: candidates
    };
  }

  function simulateXrd(payload) {
    const structure = findStructure(payload && payload.structure_id ? payload.structure_id : "st_li6ps5cl");
    const pattern = data.makePattern(structure.peaks, { noise: 0.002 });
    return {
      pattern_id: "pat_sim_" + structure.id.replace("st_", ""),
      structure_id: structure.id,
      formula: structure.formula,
      two_theta: pattern.x,
      intensity: pattern.calc,
      observed: pattern.obs,
      calculated: pattern.calc,
      difference: pattern.diff,
      max: pattern.max,
      peaks: structure.peaks,
      phases: [{ structure_id: structure.id, formula: structure.formula, weight: 1.0 }]
    };
  }

  function identifyPhases(payload) {
    const source = payload && payload.source_structure_id ? findStructure(payload.source_structure_id) : data.structures[0];
    const second = data.structures[3];
    return {
      phases: [
        {
          structure_id: source.id,
          formula: source.formula,
          name: source.name,
          confidence: 0.94,
          weight_fraction: 0.81,
          matched_peaks: 8,
          residual: 0.08
        },
        {
          structure_id: second.id,
          formula: second.formula,
          name: second.name,
          confidence: 0.71,
          weight_fraction: 0.19,
          matched_peaks: 3,
          residual: 0.14
        }
      ],
      diagnosis: {
        is_multiphase: true,
        is_amorphous: false,
        unknown_peaks: 2,
        notes: "两处弱峰尚未解释，建议补充元素信息或进行 Rietveld 定量验证。"
      },
      alternatives: [
        { formula: "Li2S", confidence: 0.46 },
        { formula: "LiCl", confidence: 0.31 }
      ]
    };
  }

  function refinePattern(payload) {
    const structure = findStructure(payload && payload.structure_ids && payload.structure_ids[0] ? payload.structure_ids[0] : "st_li6ps5cl");
    const pattern = data.makePattern(structure.peaks, { noise: 0.006 });
    const calculated = pattern.calc.map(function (value, index) {
      return Number((pattern.obs[index] - pattern.diff[index] * 0.22).toFixed(4));
    });
    return {
      refinement_id: "ref_" + Date.now(),
      method: payload && payload.method ? payload.method : "rietveld",
      engine: payload && payload.engine ? payload.engine : "auto",
      metrics: {
        rwp: 0.081,
        rp: 0.064,
        rexp: 0.052,
        gof: 1.24,
        chi2: 1.54
      },
      parameters: [
        { name: "a", value: 9.8612, esd: 0.0011, unit: "Å" },
        { name: "b", value: 9.8612, esd: 0.0011, unit: "Å" },
        { name: "c", value: 9.8612, esd: 0.0011, unit: "Å" },
        { name: "Zero", value: -0.012, esd: 0.004, unit: "°" },
        { name: "Scale", value: 1.042, esd: 0.018, unit: "" },
        { name: "Size", value: 84.2, esd: 3.1, unit: "nm" }
      ],
      phases: [
        { structure_id: structure.id, formula: structure.formula, weight_fraction: 0.81, rwp_contribution: 0.058 },
        { structure_id: "st_nasicon", formula: "Na3Zr2Si2PO12", weight_fraction: 0.19, rwp_contribution: 0.023 }
      ],
      pattern: {
        two_theta: pattern.x,
        observed: pattern.obs,
        calculated: calculated,
        difference: pattern.obs.map(function (value, index) {
          return Number((value - calculated[index]).toFixed(4));
        }),
        max: pattern.max
      },
      warnings: ["两处弱峰仍未完全解释", "建议补充 SEM/EDS 验证第二相"]
    };
  }

  function recommendSynthesis(payload) {
    const target = payload && payload.target ? payload.target : "Li6PS5Cl";
    const plan = data.synthesis[target] || data.synthesis.default;
    return {
      target: target,
      route: "solid_state",
      recipe: clone(plan.recipe),
      insights: clone(plan.insights),
      recommended_reactions: clone(plan.reactions)
    };
  }

  function agentChat(payload) {
    const message = String(payload && payload.message ? payload.message : "");
    const lower = message.toLowerCase();
    const toolCalls = [];
    const citations = [];
    const nextActions = [];
    let reply = "我会把任务拆成可验证的步骤，并只根据工具返回的数据给出结论。";
    if (lower.indexOf("检索") !== -1 || lower.indexOf("数据库") !== -1 || lower.indexOf("li6ps5cl") !== -1) {
      const structure = data.structures[0];
      toolCalls.push({
        tool: "search_structures",
        status: "ok",
        input: { query: "Li6PS5Cl" },
        output_ref: structure.id
      });
      citations.push({ type: "structure", id: structure.id });
      nextActions.push("查看结构详情", "生成 XRD 模拟");
      reply = "已在 CrystalDB 中检索到 Li6PS5Cl（F-43m，a = 9.859 Å）。建议下一步生成模拟 PXRD，再与实验谱比较。";
    }
    if (lower.indexOf("xrd") !== -1 || lower.indexOf("图谱") !== -1 || lower.indexOf("模拟") !== -1) {
      const pattern = simulateXrd({ structure_id: "st_li6ps5cl" });
      toolCalls.push({
        tool: "simulate_xrd",
        status: "ok",
        input: { structure_id: "st_li6ps5cl" },
        output_ref: pattern.pattern_id
      });
      citations.push({ type: "pattern", id: pattern.pattern_id });
      nextActions.push("提交物相识别", "进入精修");
      reply = "已生成 Cu Kα 模拟 PXRD，主峰位于 18.0°、25.6°、31.5°。可以将实验谱载入表征面板进行物相识别。";
    }
    if (lower.indexOf("物相") !== -1 || lower.indexOf("识别") !== -1) {
      toolCalls.push({
        tool: "identify_phases",
        status: "ok",
        input: { pattern_id: "pat_exp_demo" },
        output_ref: "phase_result_demo"
      });
      citations.push({ type: "pattern", id: "pat_exp_demo" });
      nextActions.push("提交精修", "查看候选物相");
      reply = "物相识别给出两个候选：Li6PS5Cl（置信度 0.94）与 Na3Zr2Si2PO12（0.71），同时有 2 个弱峰未解释。建议用 Rietveld 定量验证。";
    }
    if (lower.indexOf("精修") !== -1 || lower.indexOf("rietveld") !== -1) {
      toolCalls.push({
        tool: "run_refinement",
        status: "ok",
        input: { method: "rietveld", engine: "auto" },
        output_ref: "ref_demo"
      });
      citations.push({ type: "refinement", id: "ref_demo" });
      nextActions.push("查看精修报告", "写回数据库");
      reply = "已完成 Rietveld 精修：Rwp = 8.1%，GoF = 1.24，主相权重 81%。残差仍提示第二相存在，建议补充 EDS 或调整背景模型。";
    }
    if (lower.indexOf("合成") !== -1 || lower.indexOf("配方") !== -1 || lower.indexOf("反应") !== -1) {
      toolCalls.push({
        tool: "recommend_synthesis",
        status: "ok",
        input: { target: "Li6PS5Cl", route: "solid_state" },
        output_ref: "syn_demo"
      });
      citations.push({ type: "synthesis", id: "syn_demo" });
      nextActions.push("查看固相配方", "对比 AI 经验");
      reply = "已生成 Li6PS5Cl 固相合成方案：Li2S : P2S5 : LiCl = 2 : 0.5 : 1，550 °C / 12 h / Ar。AI 经验提示 LiCl 过量 5% 可补偿挥发。";
    }
    if (toolCalls.length === 0) {
      toolCalls.push({
        tool: "search_structures",
        status: "ok",
        input: { query: message || "all" },
        output_ref: "st_li6ps5cl"
      });
      citations.push({ type: "structure", id: "st_li6ps5cl" });
      nextActions.push("查看工作台", "打开 API 文档");
    }
    return {
      message: reply,
      tool_calls: toolCalls,
      citations: citations,
      confidence: 0.88,
      next_actions: nextActions
    };
  }

  window.CrystalMock = {
    health: function () {
      return wait(180).then(function () {
        return envelope({
          status: "ok",
          version: "0.1.0",
          modules: {
            database: "ready",
            csp: "ready",
            characterization: "beta",
            refinement: "ready",
            synthesis: "planned",
            agent: "beta"
          }
        });
      });
    },
    searchStructures: function (payload) {
      return wait(320).then(function () { return envelope(searchStructures(payload)); });
    },
    getStructure: function (payload) {
      return wait(220).then(function () { return envelope(clone(findStructure(payload && payload.id))); });
    },
    saveStructure: function (payload) {
      return wait(420).then(function () {
        return envelope({
          id: "st_user_" + Date.now(),
          status: "validated",
          duplicate_of: null,
          input: payload
        });
      });
    },
    generateStructures: function (payload) {
      return wait(720).then(function () { return envelope(generateStructures(payload)); });
    },
    simulateXrd: function (payload) {
      return wait(480).then(function () { return envelope(simulateXrd(payload)); });
    },
    identifyPhases: function (payload) {
      return wait(560).then(function () { return envelope(identifyPhases(payload)); });
    },
    refinePattern: function (payload) {
      return wait(860).then(function () { return envelope(refinePattern(payload)); });
    },
    recommendSynthesis: function (payload) {
      return wait(540).then(function () { return envelope(recommendSynthesis(payload)); });
    },
    agentChat: function (payload) {
      return wait(620).then(function () { return envelope(agentChat(payload)); });
    },
    getJob: function (payload) {
      return wait(200).then(function () {
        return envelope({
          job_id: payload && payload.id ? payload.id : "job_demo",
          status: "succeeded",
          progress: 1,
          message: "Demo job completed",
          result_url: null
        });
      });
    }
  };
})();
