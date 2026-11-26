// CrystalLLM - LLM 客户端
// 支持 OpenAI、Claude、Google Gemini、Ollama

window.CrystalLLM = (function () {
  "use strict";

  // 配置存储 Key
  const CONFIG_KEY = "crystal_llm_config";
  const STORAGE_KEY = "crystal_llm_cache";

  // 默认配置
  const DEFAULT_CONFIG = {
    provider: "openai",
    model: "gpt-4",
    apiKey: "",
    baseUrl: "",
    temperature: 0.7,
    maxTokens: 2000,
    configured: false
  };

  // 当前配置
  let config = { ...DEFAULT_CONFIG };

  // 加载已保存的配置
  function loadConfig() {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        config = { ...config, ...parsed };
      }
    } catch (e) {
      console.warn("Failed to load LLM config from storage:", e);
    }
  }

  // 保存配置到本地存储
  function saveConfig(newConfig) {
    config = { ...config, ...newConfig };
    // 不存储 apiKey 到本地存储，只在内存中保留
    const toSave = { ...config };
    delete toSave.apiKey;
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn("Failed to save LLM config:", e);
    }
  }

  // 检查是否配置
  function isConfigured() {
    return config.configured && config.apiKey && config.model;
  }

  // 获取当前配置
  function getConfig() {
    return { ...config, apiKey: "***" }; // 不返回真实 key
  }

  // 设置配置
  function setConfig(newConfig) {
    if (!newConfig.apiKey) {
      throw new Error("API 密钥不能为空");
    }
    if (!newConfig.provider || !newConfig.model) {
      throw new Error("供应商和模型不能为空");
    }
    
    config = {
      ...config,
      ...newConfig,
      configured: true
    };
    
    saveConfig(newConfig);
  }

  // LLM 错误类
  class LLMError extends Error {
    constructor(code, message) {
      super(message);
      this.name = "LLMError";
      this.code = code;
    }
  }

  // OpenAI 兼容 API 调用
  async function callOpenAICompatible(messages, tools, systemPrompt) {
    const url = config.baseUrl || "https://api.openai.com/v1/chat/completions";
    
    const requestBody = {
      model: config.model,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...messages
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools.map(tool => ({
        type: "function",
        function: tool
      }));
      requestBody.tool_choice = "auto";
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new LLMError(
        response.status,
        error.error?.message || `API 错误: ${response.status}`
      );
    }

    const data = await response.json();
    const choice = data.choices[0];
    const message = choice.message;

    return {
      content: message.content || "",
      toolCalls: (message.tool_calls || []).map(call => ({
        tool: call.function.name,
        arguments: JSON.parse(call.function.arguments || "{}")
      })),
      finishReason: choice.finish_reason
    };
  }

  // Claude API 调用
  async function callClaude(messages, tools, systemPrompt) {
    const url = "https://api.anthropic.com/v1/messages";
    
    const requestBody = {
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt || "你是一个有帮助的助手",
      messages: messages
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters || {
          type: "object",
          properties: {},
          required: []
        }
      }));
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new LLMError(
        response.status,
        error.error?.message || `Claude API 错误: ${response.status}`
      );
    }

    const data = await response.json();
    let content = "";
    const toolCalls = [];

    for (const block of data.content) {
      if (block.type === "text") {
        content = block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          tool: block.name,
          arguments: block.input || {}
        });
      }
    }

    return {
      content: content,
      toolCalls: toolCalls,
      finishReason: data.stop_reason
    };
  }

  // Google Gemini API 调用
  async function callGemini(messages, tools, systemPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
    
    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt || "你是一个有帮助的助手" }]
      },
      contents: messages.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      })),
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens
      }
    };

    if (tools && tools.length > 0) {
      requestBody.tools = [{
        functionDeclarations: tools
      }];
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new LLMError(
        response.status,
        error.error?.message || `Gemini API 错误: ${response.status}`
      );
    }

    const data = await response.json();
    const content = data.candidates[0].content;
    
    let text = "";
    const toolCalls = [];

    for (const part of content.parts) {
      if (part.text) {
        text = part.text;
      } else if (part.functionCall) {
        toolCalls.push({
          tool: part.functionCall.name,
          arguments: part.functionCall.args || {}
        });
      }
    }

    return {
      content: text,
      toolCalls: toolCalls,
      finishReason: data.candidates[0].finishReason
    };
  }

  // Ollama API 调用
  async function callOllama(messages, tools, systemPrompt) {
    const url = `${config.baseUrl}/api/chat`;
    
    const requestBody = {
      model: config.model,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...messages
      ],
      stream: false,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new LLMError(
        response.status,
        `Ollama 连接失败: ${response.status}`
      );
    }

    const data = await response.json();

    return {
      content: data.message?.content || "",
      toolCalls: [], // Ollama 本身不支持工具调用，需要手动解析
      finishReason: "stop"
    };
  }

  // 主 chat 方法
  async function chat(messages, tools, options = {}) {
    if (!isConfigured()) {
      throw new LLMError("NOT_CONFIGURED", "LLM 未配置");
    }

    try {
      let result;
      const systemPrompt = options.system || "你是一个有帮助的晶体学研究助手";

      switch (config.provider) {
        case "openai":
          result = await callOpenAICompatible(messages, tools, systemPrompt);
          break;
        
        case "claude":
          result = await callClaude(messages, tools, systemPrompt);
          break;
        
        case "gemini":
          result = await callGemini(messages, tools, systemPrompt);
          break;
        
        case "ollama":
          result = await callOllama(messages, tools, systemPrompt);
          break;
        
        default:
          throw new LLMError("UNKNOWN_PROVIDER", `未知的 LLM 供应商: ${config.provider}`);
      }

      return result;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError("API_ERROR", error.message);
    }
  }

  // 测试连接
  async function testConnection() {
    if (!isConfigured()) {
      throw new LLMError("NOT_CONFIGURED", "LLM 未配置");
    }

    const testMessages = [
      { role: "user", content: "说一个字" }
    ];

    try {
      const result = await chat(testMessages, [], {
        system: "回复要尽可能简洁"
      });
      return { success: true, response: result.content };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof LLMError ? error.message : "未知错误"
      };
    }
  }

  // 初始化
  loadConfig();

  // 导出公共 API
  return {
    // 配置管理
    isConfigured,
    getConfig,
    setConfig,
    loadConfig,
    saveConfig,
    
    // 聊天
    chat,
    testConnection,
    
    // 错误类
    getLLMError: () => LLMError,
    
    // 获取支持的供应商列表
    getProviders: () => [
      { id: "openai", name: "OpenAI (GPT-4)", requiresKey: true, requiresUrl: false },
      { id: "claude", name: "Claude (Anthropic)", requiresKey: true, requiresUrl: false },
      { id: "gemini", name: "Google Gemini", requiresKey: true, requiresUrl: false },
      { id: "ollama", name: "Ollama (本地)", requiresKey: false, requiresUrl: true }
    ]
  };
})();
