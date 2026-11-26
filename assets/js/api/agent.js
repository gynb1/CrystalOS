// CrystalAgent - 工具定义、执行和证据链追踪

window.CrystalAgent = (function () {
  "use strict";

  // 证据链存储
  let evidenceChain = [];

  // 清空证据链
  function clearEvidence() {
    evidenceChain = [];
  }

  // 添加证据到链
  function addEvidence(tool, input, result, error = null) {
    evidenceChain.push({
      timestamp: new Date().toISOString(),
      tool: tool,
      input: input,
      result: result,
      error: error,
      status: error ? "failed" : "success"
    });
  }

  // 获取证据链
  function getEvidenceChain() {
    return [...evidenceChain];
  }

  // 工具定义
  const tools = [
    {
      name: "search_structures",
      description: "在 CrystalDB 中搜索晶体结构。可按化学式、空间群等条件搜索。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索关键词，如 Li6PS5Cl 或 F-43m"
          },
          filterType: {
            type: "string",
            enum: ["all", "formula", "space_group"],
            description: "筛选类型"
          },
          limit: {
            type: "integer",
            description: "返回结果数量，默认 10",
            default: 10
          }
        },
        required: ["query"]
      }
    },
    {
      name: "simulate_xrd",
      description: "对指定的晶体结构进行 XRD（X射线衍射）模拟。返回模拟的衍射图谱。",
      parameters: {
        type: "object",
        properties: {
          structure_id: {
            type: "string",
            description: "结构 ID，如 st_li6ps5cl"
          },
          wavelength: {
            type: "string",
            description: "X射线波长，默认 Cu Kα (1.5406 Å)",
            default: "1.5406"
          },
          theta_range: {
            type: "string",
            description: "2θ 扫描范围，格式 'min-max'，默认 '5-90'",
            default: "5-90"
          }
        },
        required: ["structure_id"]
      }
    },
    {
      name: "identify_phases",
      description: "对实验 XRD 图谱进行物相识别。识别可能包含的晶体相及其权重。",
      parameters: {
        type: "object",
        properties: {
          pattern_id: {
            type: "string",
            description: "图谱 ID"
          },
          source_structures: {
            type: "array",
            items: { type: "string" },
            description: "可选：已知或候选的结构 ID 列表，用于约束识别"
          },
          allow_multiphase: {
            type: "boolean",
            description: "是否允许识别多相，默认 true",
            default: true
          },
          max_phases: {
            type: "integer",
            description: "最多识别的相数，默认 5",
            default: 5
          }
        },
        required: ["pattern_id"]
      }
    },
    {
      name: "generate_structures",
      description: "使用 CSP（晶体结构预测）或 DNG（从头生成）为指定组成生成候选结构。",
      parameters: {
        type: "object",
        properties: {
          composition: {
            type: "string",
            description: "目标组成，如 Li6PS5Cl"
          },
          method: {
            type: "string",
            enum: ["csp", "dng", "hybrid"],
            description: "生成方法：CSP（晶体结构预测）、DNG（从头生成）或 Hybrid"
          },
          space_group: {
            type: "string",
            description: "目标空间群，可选"
          },
          constraints: {
            type: "string",
            description: "约束条件，如 '300 K, 0 GPa'"
          },
          max_candidates: {
            type: "integer",
            description: "最多生成候选数，默认 20",
            default: 20
          }
        },
        required: ["composition", "method"]
      }
    },
    {
      name: "run_refinement",
      description: "执行 Rietveld 精修以验证和优化结构模型。需要提供实验图谱和初始结构模型。",
      parameters: {
        type: "object",
        properties: {
          pattern_id: {
            type: "string",
            description: "实验图谱 ID"
          },
          structure_id: {
            type: "string",
            description: "初始结构模型 ID"
          },
          refine_params: {
            type: "array",
            items: { type: "string" },
            description: "要精修的参数，如 ['lattice_param', 'atomic_positions', 'occupancy']"
          },
          max_iterations: {
            type: "integer",
            description: "最多迭代次数，默认 100",
            default: 100
          }
        },
        required: ["pattern_id", "structure_id"]
      }
    },
    {
      name: "recommend_synthesis",
      description: "基于已验证的结构模型，推荐合成路线和实验参数。",
      parameters: {
        type: "object",
        properties: {
          structure_id: {
            type: "string",
            description: "已验证的结构 ID"
          },
          composition: {
            type: "string",
            description: "目标组成"
          },
          constraints: {
            type: "string",
            description: "合成约束，如 '固态反应, 300°C, 1 atm'"
          },
          known_synthesis_routes: {
            type: "array",
            items: { type: "string" },
            description: "已知的合成路线参考"
          }
        },
        required: ["structure_id", "composition"]
      }
    }
  ];

  // 获取工具定义列表
  function getTools() {
    return tools;
  }

  // 执行单个工具
  async function executeTool(toolName, arguments_) {
    try {
      let result;

      switch (toolName) {
        case "search_structures":
          result = await executeSearchStructures(arguments_);
          break;

        case "simulate_xrd":
          result = await executeSimulateXrd(arguments_);
          break;

        case "identify_phases":
          result = await executeIdentifyPhases(arguments_);
          break;

        case "generate_structures":
          result = await executeGenerateStructures(arguments_);
          break;

        case "run_refinement":
          result = await executeRunRefinement(arguments_);
          break;

        case "recommend_synthesis":
          result = await executeRecommendSynthesis(arguments_);
          break;

        default:
          throw new Error(`未知的工具: ${toolName}`);
      }

      addEvidence(toolName, arguments_, result);
      return { tool: toolName, success: true, result: result };
    } catch (error) {
      addEvidence(toolName, arguments_, null, error.message);
      return { tool: toolName, success: false, error: error.message };
    }
  }

  // 执行多个工具调用
  async function executeToolCalls(toolCalls) {
    const results = [];

    for (const call of toolCalls) {
      const result = await executeTool(call.tool, call.arguments);
      results.push(result);
    }

    return results;
  }

  // ==================== 工具实现 ====================

  async function executeSearchStructures(args) {
    const { query, filterType = "all", limit = 10 } = args;

    return await window.CrystalAPI.searchStructures({
      query: query,
      filter: filterType,
      limit: limit,
      page: 1
    });
  }

  async function executeSimulateXrd(args) {
    const { structure_id, wavelength = "1.5406", theta_range = "5-90" } = args;

    return await window.CrystalAPI.simulateXrd({
      structure_id: structure_id,
      wavelength: parseFloat(wavelength),
      theta_min: parseFloat(theta_range.split("-")[0]),
      theta_max: parseFloat(theta_range.split("-")[1])
    });
  }

  async function executeIdentifyPhases(args) {
    const {
      pattern_id,
      source_structures,
      allow_multiphase = true,
      max_phases = 5
    } = args;

    return await window.CrystalAPI.identifyPhases({
      pattern_id: pattern_id,
      source_structure_ids: source_structures || [],
      options: {
        allow_multiphase: allow_multiphase,
        max_phases: max_phases
      }
    });
  }

  async function executeGenerateStructures(args) {
    const {
      composition,
      method,
      space_group,
      constraints,
      max_candidates = 20
    } = args;

    return await window.CrystalAPI.generateStructures({
      composition: composition,
      method: method,
      space_group: space_group,
      constraints: constraints,
      max_candidates: max_candidates
    });
  }

  async function executeRunRefinement(args) {
    const {
      pattern_id,
      structure_id,
      refine_params,
      max_iterations = 100
    } = args;

    return await window.CrystalAPI.runRefinement({
      pattern_id: pattern_id,
      structure_id: structure_id,
      refine_params: refine_params || ["lattice_param", "atomic_positions"],
      max_iterations: max_iterations
    });
  }

  async function executeRecommendSynthesis(args) {
    const {
      structure_id,
      composition,
      constraints,
      known_synthesis_routes = []
    } = args;

    return await window.CrystalAPI.recommendSynthesis({
      structure_id: structure_id,
      composition: composition,
      constraints: constraints,
      known_synthesis_routes: known_synthesis_routes
    });
  }

  // 导出公共 API
  return {
    // 工具管理
    getTools: getTools,
    executeTool: executeTool,
    executeToolCalls: executeToolCalls,

    // 证据链
    clearEvidence: clearEvidence,
    addEvidence: addEvidence,
    getEvidenceChain: getEvidenceChain
  };
})();
