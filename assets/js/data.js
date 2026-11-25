(function () {
  const elementColors = {
    Li: "#7dd3fc",
    P: "#f59e0b",
    S: "#facc15",
    Cl: "#a78bfa",
    Na: "#fb7185",
    Zr: "#60a5fa",
    Si: "#34d399",
    O: "#f97316",
    La: "#c084fc",
    Y: "#22d3ee",
    Zn: "#e879f9",
    Ti: "#38bdf8",
    C: "#94a3b8",
    H: "#e2e8f0"
  };

  function atom(el, x, y, z) {
    return { el: el, x: x, y: y, z: z, color: elementColors[el] || "#94a3b8" };
  }

  function buildMotif(elements) {
    const base = [
      [-0.42, -0.34, -0.28],
      [0.36, -0.28, -0.36],
      [-0.3, 0.36, -0.3],
      [0.42, 0.3, 0.22],
      [-0.38, -0.22, 0.38],
      [0.3, -0.4, 0.32],
      [-0.26, 0.4, 0.34],
      [0.38, 0.38, -0.28],
      [0, 0, 0],
      [0.12, -0.08, 0.1],
      [-0.16, 0.14, -0.12],
      [0.2, 0.06, -0.02],
      [-0.08, -0.18, 0.22],
      [0.06, 0.24, 0.16]
    ];
    return base.map(function (p, index) {
      const el = elements[index % elements.length];
      return atom(el, p[0], p[1], p[2]);
    });
  }

  const structures = [
    {
      id: "st_li6ps5cl",
      formula: "Li6PS5Cl",
      name: "Argyrodite Li6PS5Cl",
      space_group: "F-43m",
      space_group_number: 216,
      lattice: { a: 9.859, b: 9.859, c: 9.859, alpha: 90, beta: 90, gamma: 90 },
      source: "CrystalDB demo",
      license: "CC-BY-4.0",
      stability: "metastable",
      band_gap_ev: 2.4,
      density_g_cm3: 1.87,
      tags: ["solid electrolyte", "argyrodite", "Li-ion"],
      atoms: buildMotif(["Li", "Li", "P", "S", "S", "Cl", "Li", "S", "P", "Li", "Cl", "S", "Li", "S"]),
      peaks: [
        { x: 15.7, intensity: 20, hkl: "111" },
        { x: 18.0, intensity: 100, hkl: "200" },
        { x: 25.6, intensity: 55, hkl: "220" },
        { x: 31.5, intensity: 30, hkl: "311" },
        { x: 36.5, intensity: 22, hkl: "222" },
        { x: 44.1, intensity: 12, hkl: "400" },
        { x: 52.2, intensity: 8, hkl: "420" },
        { x: 64.8, intensity: 5, hkl: "440" }
      ]
    },
    {
      id: "st_li3ycl6",
      formula: "Li3YCl6",
      name: "Halide electrolyte Li3YCl6",
      space_group: "P-3m1",
      space_group_number: 164,
      lattice: { a: 6.45, b: 6.45, c: 6.15, alpha: 90, beta: 90, gamma: 120 },
      source: "CrystalDB demo",
      license: "CC-BY-4.0",
      stability: "stable",
      band_gap_ev: 3.1,
      density_g_cm3: 2.42,
      tags: ["halide", "solid electrolyte"],
      atoms: buildMotif(["Li", "Y", "Cl", "Cl", "Li", "Cl", "Y", "Cl", "Li", "Cl", "Li", "Y", "Cl", "Cl"]),
      peaks: [
        { x: 14.8, intensity: 18, hkl: "001" },
        { x: 16.9, intensity: 42, hkl: "100" },
        { x: 24.2, intensity: 100, hkl: "101" },
        { x: 30.6, intensity: 34, hkl: "102" },
        { x: 33.5, intensity: 58, hkl: "110" },
        { x: 43.1, intensity: 26, hkl: "201" },
        { x: 51.0, intensity: 14, hkl: "202" }
      ]
    },
    {
      id: "st_li2zrcl6",
      formula: "Li2ZrCl6",
      name: "Halide electrolyte Li2ZrCl6",
      space_group: "P-3m1",
      space_group_number: 164,
      lattice: { a: 6.36, b: 6.36, c: 6.12, alpha: 90, beta: 90, gamma: 120 },
      source: "CrystalDB demo",
      license: "CC-BY-4.0",
      stability: "stable",
      band_gap_ev: 3.4,
      density_g_cm3: 2.61,
      tags: ["halide", "solid electrolyte"],
      atoms: buildMotif(["Li", "Zr", "Cl", "Cl", "Li", "Cl", "Zr", "Cl", "Li", "Cl", "Li", "Zr", "Cl", "Cl"]),
      peaks: [
        { x: 15.0, intensity: 20, hkl: "001" },
        { x: 17.2, intensity: 46, hkl: "100" },
        { x: 24.6, intensity: 100, hkl: "101" },
        { x: 31.0, intensity: 36, hkl: "102" },
        { x: 34.0, intensity: 62, hkl: "110" },
        { x: 43.6, intensity: 24, hkl: "201" },
        { x: 51.6, intensity: 12, hkl: "202" }
      ]
    },
    {
      id: "st_nasicon",
      formula: "Na3Zr2Si2PO12",
      name: "NASICON solid electrolyte",
      space_group: "C2/c",
      space_group_number: 15,
      lattice: { a: 15.62, b: 9.02, c: 9.21, alpha: 90, beta: 123.7, gamma: 90 },
      source: "CrystalDB demo",
      license: "CC-BY-4.0",
      stability: "stable",
      band_gap_ev: 4.2,
      density_g_cm3: 3.27,
      tags: ["NASICON", "Na-ion"],
      atoms: buildMotif(["Na", "Zr", "Si", "P", "O", "O", "Na", "Zr", "O", "Si", "O", "P", "O", "O"]),
      peaks: [
        { x: 12.4, intensity: 16, hkl: "011" },
        { x: 16.1, intensity: 28, hkl: "110" },
        { x: 19.8, intensity: 100, hkl: "113" },
        { x: 23.9, intensity: 38, hkl: "020" },
        { x: 27.7, intensity: 52, hkl: "202" },
        { x: 32.4, intensity: 34, hkl: "222" },
        { x: 38.8, intensity: 18, hkl: "311" },
        { x: 46.2, intensity: 11, hkl: "313" }
      ]
    },
    {
      id: "st_llzo",
      formula: "Li7La3Zr2O12",
      name: "Garnet LLZO",
      space_group: "Ia-3d",
      space_group_number: 230,
      lattice: { a: 12.96, b: 12.96, c: 12.96, alpha: 90, beta: 90, gamma: 90 },
      source: "CrystalDB demo",
      license: "CC-BY-4.0",
      stability: "stable",
      band_gap_ev: 5.1,
      density_g_cm3: 5.11,
      tags: ["garnet", "solid electrolyte"],
      atoms: buildMotif(["Li", "La", "Zr", "O", "O", "Li", "La", "O", "Zr", "O", "Li", "O", "La", "O"]),
      peaks: [
        { x: 16.7, intensity: 12, hkl: "211" },
        { x: 18.6, intensity: 24, hkl: "220" },
        { x: 25.9, intensity: 100, hkl: "321" },
        { x: 30.4, intensity: 36, hkl: "400" },
        { x: 33.1, intensity: 48, hkl: "420" },
        { x: 38.5, intensity: 22, hkl: "332" },
        { x: 43.2, intensity: 14, hkl: "431" },
        { x: 52.8, intensity: 9, hkl: "440" }
      ]
    },
    {
      id: "st_tio2",
      formula: "TiO2",
      name: "Anatase TiO2",
      space_group: "I41/amd",
      space_group_number: 141,
      lattice: { a: 3.78, b: 3.78, c: 9.51, alpha: 90, beta: 90, gamma: 90 },
      source: "CrystalDB demo",
      license: "CC-BY-4.0",
      stability: "stable",
      band_gap_ev: 3.2,
      density_g_cm3: 3.89,
      tags: ["oxide", "photocatalyst"],
      atoms: buildMotif(["Ti", "O", "O", "Ti", "O", "O", "Ti", "O", "Ti", "O", "O", "Ti", "O", "O"]),
      peaks: [
        { x: 25.3, intensity: 100, hkl: "101" },
        { x: 37.8, intensity: 22, hkl: "004" },
        { x: 48.0, intensity: 38, hkl: "200" },
        { x: 53.9, intensity: 18, hkl: "105" },
        { x: 55.1, intensity: 14, hkl: "211" },
        { x: 62.7, intensity: 12, hkl: "204" }
      ]
    },
    {
      id: "st_zno",
      formula: "ZnO",
      name: "Wurtzite ZnO",
      space_group: "P63mc",
      space_group_number: 186,
      lattice: { a: 3.25, b: 3.25, c: 5.21, alpha: 90, beta: 90, gamma: 120 },
      source: "CrystalDB demo",
      license: "CC-BY-4.0",
      stability: "stable",
      band_gap_ev: 3.37,
      density_g_cm3: 5.61,
      tags: ["oxide", "semiconductor"],
      atoms: buildMotif(["Zn", "O", "Zn", "O", "Zn", "O", "Zn", "O", "Zn", "O", "Zn", "O", "Zn", "O"]),
      peaks: [
        { x: 31.8, intensity: 58, hkl: "100" },
        { x: 34.4, intensity: 44, hkl: "002" },
        { x: 36.3, intensity: 100, hkl: "101" },
        { x: 47.5, intensity: 24, hkl: "102" },
        { x: 56.6, intensity: 32, hkl: "110" },
        { x: 62.9, intensity: 28, hkl: "103" },
        { x: 68.0, intensity: 12, hkl: "112" }
      ]
    }
  ];

  function gaussian(x, center, width) {
    return Math.exp(-0.5 * Math.pow((x - center) / width, 2));
  }

  function makePattern(peaks, options) {
    const opts = options || {};
    const start = opts.start === undefined ? 5 : opts.start;
    const end = opts.end === undefined ? 75 : opts.end;
    const step = opts.step === undefined ? 0.05 : opts.step;
    const width = opts.width === undefined ? 0.18 : opts.width;
    const noise = opts.noise === undefined ? 0.006 : opts.noise;
    const x = [];
    const calc = [];
    const obs = [];
    for (let t = start; t <= end; t += step) {
      let y = 0.012 + 0.008 * Math.sin(t * 0.31) + 0.004 * Math.sin(t * 0.97);
      peaks.forEach(function (peak, index) {
        const peakWidth = width * (1 + 0.12 * Math.sin(index * 1.7));
        y += peak.intensity * gaussian(t, peak.x, peakWidth);
        if (index % 2 === 0) {
          y += peak.intensity * 0.08 * gaussian(t, peak.x + 0.9, peakWidth * 2.1);
        }
      });
      const n = noise * (Math.sin(t * 13.7) + Math.sin(t * 7.3 + 1.2)) * 0.5;
      x.push(Number(t.toFixed(2)));
      calc.push(Number(y.toFixed(4)));
      obs.push(Number((y + n).toFixed(4)));
    }
    const max = Math.max.apply(null, calc) * 1.06;
    return {
      x: x,
      calc: calc,
      obs: obs,
      diff: obs.map(function (value, index) { return Number((value - calc[index]).toFixed(4)); }),
      max: max,
      peaks: peaks
    };
  }

  function combinePeaks(groups) {
    const merged = [];
    groups.forEach(function (group) {
      group.peaks.forEach(function (peak) {
        merged.push({ x: peak.x, intensity: peak.intensity * group.scale, hkl: peak.hkl, phase: group.formula });
      });
    });
    return merged.sort(function (a, b) { return a.x - b.x; });
  }

  function findStructure(id) {
    return structures.find(function (item) { return item.id === id; }) || structures[0];
  }

  const defaultPattern = makePattern(combinePeaks([
    { formula: "Li6PS5Cl", scale: 1.0, peaks: structures[0].peaks },
    { formula: "Li2S", scale: 0.18, peaks: [
      { x: 27.0, intensity: 42, hkl: "111" },
      { x: 31.4, intensity: 26, hkl: "200" },
      { x: 44.8, intensity: 18, hkl: "220" }
    ] }
  ]), { noise: 0.008 });

  const synthesis = {
    "Li6PS5Cl": {
      recipe: {
        route: "固相烧结",
        precursors: [
          { formula: "Li2S", ratio: 2.0, mass: "0.459 g" },
          { formula: "P2S5", ratio: 0.5, mass: "0.556 g" },
          { formula: "LiCl", ratio: 1.0, mass: "0.212 g" }
        ],
        conditions: [
          ["温度", "550 °C"],
          ["保温", "12 h"],
          ["气氛", "Ar"],
          ["升温", "3 °C/min"]
        ]
      },
      insights: [
        { text: "LiCl 过量 5% 可补偿高温挥发", confidence: 0.78, evidence: "exp_2024_017" },
        { text: "球磨 12 h 后再烧结，峰形更窄", confidence: 0.71, evidence: "exp_2025_031" },
        { text: "含水气氛会引入 Li2S 杂相", confidence: 0.83, evidence: "negative_2025_009" }
      ],
      reactions: [
        { reaction: "2 Li2S + 0.5 P2S5 + LiCl → Li6PS5Cl", score: 0.86, novelty: 0.31, risk: "low" },
        { reaction: "Li2S + P2S5 + LiCl → Li7PS6 + LiCl", score: 0.64, novelty: 0.48, risk: "medium" },
        { reaction: "Li2S + LiCl + P2S5 → Li6PS5Cl + S", score: 0.58, novelty: 0.57, risk: "medium" }
      ]
    },
    default: {
      recipe: {
        route: "无机固相反应",
        precursors: [
          { formula: "前驱体 A", ratio: 1.0, mass: "待计算" },
          { formula: "前驱体 B", ratio: 1.0, mass: "待计算" }
        ],
        conditions: [
          ["温度", "500 °C"],
          ["保温", "10 h"],
          ["气氛", "Ar"],
          ["升温", "5 °C/min"]
        ]
      },
      insights: [
        { text: "当前为通用模板，接入真实模型后按目标组成推荐", confidence: 0.5, evidence: "template" }
      ],
      reactions: [
        { reaction: "A + B → target", score: 0.5, novelty: 0.5, risk: "unknown" }
      ]
    }
  };

  window.CrystalData = {
    elementColors: elementColors,
    structures: structures,
    defaultPattern: defaultPattern,
    synthesis: synthesis,
    makePattern: makePattern,
    combinePeaks: combinePeaks,
    findStructure: findStructure,
    gaussian: gaussian
  };
})();
