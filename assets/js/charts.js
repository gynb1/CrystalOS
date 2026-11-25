(function () {
  const NS = "http://www.w3.org/2000/svg";

  function el(name, attrs) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, String(attrs[key]));
    });
    return node;
  }

  function normalize(data) {
    const x = data.x || data.two_theta || [];
    const obs = data.obs || data.observed || data.intensity || [];
    const calc = data.calc || data.calculated || [];
    const diff = data.diff || data.difference || [];
    const max = data.max || Math.max.apply(null, obs.concat(calc).concat([1]));
    return { x: x, obs: obs, calc: calc, diff: diff, max: max, peaks: data.peaks || [] };
  }

  function linePath(values, xScale, yScale) {
    let path = "";
    values.forEach(function (value, index) {
      const x = xScale(index);
      const y = yScale(value);
      path += (index === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
    });
    return path;
  }

  function renderXrd(svg, data, options) {
    const opts = options || {};
    const width = opts.width || 760;
    const height = opts.height || 320;
    const compact = Boolean(opts.compact);
    const margin = compact ? { left: 12, right: 12, top: 10, bottom: 10 } : { left: 48, right: 24, top: 22, bottom: 42 };
    const plotW = width - margin.left - margin.right;
    const plotH = compact ? height - margin.top - margin.bottom : height - margin.top - margin.bottom - 54;
    const diffH = compact ? 0 : 34;
    const normalized = normalize(data);
    const xMin = normalized.x[0] || 5;
    const xMax = normalized.x[normalized.x.length - 1] || 75;
    const yMax = normalized.max || 1;
    const xScale = function (index) {
      return margin.left + (index / Math.max(1, normalized.x.length - 1)) * plotW;
    };
    const yScale = function (value) {
      return margin.top + plotH - (value / yMax) * plotH;
    };
    const diffScale = function (value) {
      const base = margin.top + plotH + 18;
      return base + diffH / 2 - (value / (yMax * 0.25 || 1)) * (diffH / 2);
    };

    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.innerHTML = "";

    const glowId = "xrdGlow-" + (svg.id || "xrd") + "-" + Math.random().toString(36).slice(2, 7);
    const defs = el("defs");
    const glow = el("filter", { id: glowId, x: "-40%", y: "-40%", width: "180%", height: "180%" });
    const blur = el("feGaussianBlur", { stdDeviation: "2.2", result: "blur" });
    const merge = el("feMerge");
    merge.appendChild(el("feMergeNode", { in: "blur" }));
    merge.appendChild(el("feMergeNode", { in: "SourceGraphic" }));
    glow.appendChild(blur);
    glow.appendChild(merge);
    defs.appendChild(glow);
    svg.appendChild(defs);

    const bg = el("rect", { x: 0, y: 0, width: width, height: height, fill: "transparent" });
    svg.appendChild(bg);

    if (!compact) {
      for (let t = 10; t <= 70; t += 10) {
        const x = margin.left + ((t - xMin) / (xMax - xMin)) * plotW;
        svg.appendChild(el("line", { x1: x, y1: margin.top, x2: x, y2: margin.top + plotH, stroke: "rgba(148,163,184,.14)", "stroke-width": 1 }));
        const label = el("text", { x: x, y: height - 14, fill: "#94a3b8", "font-size": 11, "text-anchor": "middle" });
        label.textContent = t + "°";
        svg.appendChild(label);
      }
      [0, 0.25, 0.5, 0.75, 1].forEach(function (ratio) {
        const y = margin.top + plotH - ratio * plotH;
        svg.appendChild(el("line", { x1: margin.left, y1: y, x2: margin.left + plotW, y2: y, stroke: "rgba(148,163,184,.1)", "stroke-width": 1 }));
      });
      const xLabel = el("text", { x: width - margin.right, y: height - 14, fill: "#94a3b8", "font-size": 11, "text-anchor": "end" });
      xLabel.textContent = "2θ";
      svg.appendChild(xLabel);
      const yLabel = el("text", { x: 6, y: margin.top + 10, fill: "#94a3b8", "font-size": 11 });
      yLabel.textContent = "Intensity";
      svg.appendChild(yLabel);
    }

    if (normalized.calc && normalized.calc.length) {
      svg.appendChild(el("path", {
        d: linePath(normalized.calc, xScale, yScale),
        fill: "none",
        stroke: "#f5c76a",
        "stroke-width": compact ? 1.5 : 1.8,
        "stroke-dasharray": "5 5",
        opacity: 0.92
      }));
    }

    svg.appendChild(el("path", {
      d: linePath(normalized.obs, xScale, yScale),
      fill: "none",
      stroke: "#67e8f9",
      "stroke-width": compact ? 1.6 : 2.1,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
      filter: compact ? "" : "url(#" + glowId + ")"
    }));

    if (!compact && normalized.diff && normalized.diff.length) {
      const base = margin.top + plotH + 18 + diffH / 2;
      svg.appendChild(el("line", { x1: margin.left, y1: base, x2: margin.left + plotW, y2: base, stroke: "rgba(148,163,184,.24)", "stroke-width": 1 }));
      let diffPath = "";
      normalized.diff.forEach(function (value, index) {
        const x = xScale(index);
        const y = diffScale(value);
        diffPath += (index === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
      });
      svg.appendChild(el("path", {
        d: diffPath,
        fill: "none",
        stroke: "#2dd4bf",
        "stroke-width": 1.2,
        opacity: 0.9
      }));
      const diffLabel = el("text", { x: 6, y: base + 4, fill: "#5eead4", "font-size": 10 });
      diffLabel.textContent = "Δ";
      svg.appendChild(diffLabel);
    }

    if (!compact && normalized.peaks && normalized.peaks.length) {
      normalized.peaks.forEach(function (peak) {
        const x = margin.left + ((peak.x - xMin) / (xMax - xMin)) * plotW;
        svg.appendChild(el("line", {
          x1: x,
          y1: margin.top + plotH,
          x2: x,
          y2: margin.top + plotH + 7,
          stroke: "rgba(245,199,106,.8)",
          "stroke-width": 1.2
        }));
      });
    }
  }

  function project(point, width, height, scale) {
    const cx = width / 2;
    const cy = height / 2 + 6;
    return {
      x: cx + (point.x - point.y) * scale * 0.92,
      y: cy + (point.x + point.y) * scale * 0.46 - point.z * scale * 0.92
    };
  }

  function renderCrystal(svg, structure, options) {
    const opts = options || {};
    const width = opts.width || 420;
    const height = opts.height || 320;
    const scale = opts.scale || 118;
    const atoms = structure.atoms || [];
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.innerHTML = "";

    const atomGlowId = "atomGlow-" + (svg.id || "crystal") + "-" + Math.random().toString(36).slice(2, 7);
    const defs = el("defs");
    const glow = el("filter", { id: atomGlowId, x: "-80%", y: "-80%", width: "260%", height: "260%" });
    const blur = el("feGaussianBlur", { stdDeviation: "3", result: "blur" });
    const merge = el("feMerge");
    merge.appendChild(el("feMergeNode", { in: "blur" }));
    merge.appendChild(el("feMergeNode", { in: "SourceGraphic" }));
    glow.appendChild(blur);
    glow.appendChild(merge);
    defs.appendChild(glow);
    svg.appendChild(defs);

    const grid = [
      [{ x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }],
      [{ x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }],
      [{ x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 }],
      [{ x: -1, y: 1, z: -1 }, { x: -1, y: -1, z: -1 }],
      [{ x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }],
      [{ x: 1, y: -1, z: 1 }, { x: 1, y: 1, z: 1 }],
      [{ x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 }],
      [{ x: -1, y: 1, z: 1 }, { x: -1, y: -1, z: 1 }],
      [{ x: -1, y: -1, z: -1 }, { x: -1, y: -1, z: 1 }],
      [{ x: 1, y: -1, z: -1 }, { x: 1, y: -1, z: 1 }],
      [{ x: 1, y: 1, z: -1 }, { x: 1, y: 1, z: 1 }],
      [{ x: -1, y: 1, z: -1 }, { x: -1, y: 1, z: 1 }]
    ];

    grid.forEach(function (edge) {
      const a = project(edge[0], width, height, scale);
      const b = project(edge[1], width, height, scale);
      svg.appendChild(el("line", {
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        stroke: "rgba(103,232,249,.18)",
        "stroke-width": 1
      }));
    });

    const center = { x: 0, y: 0, z: 0 };
    const centerPoint = project(center, width, height, scale);
    atoms.forEach(function (atom, index) {
      const point = project(atom, width, height, scale);
      const alpha = 0.35 + (atom.z + 1) * 0.18;
      svg.appendChild(el("line", {
        x1: centerPoint.x,
        y1: centerPoint.y,
        x2: point.x,
        y2: point.y,
        stroke: atom.color,
        "stroke-width": index % 3 === 0 ? 1.4 : 0.8,
        opacity: Math.min(0.42, alpha * 0.45)
      }));
    });

    atoms.slice().sort(function (a, b) { return a.z - b.z; }).forEach(function (atom) {
      const point = project(atom, width, height, scale);
      const radius = atom.el === "Li" ? 4.2 : atom.el === "O" || atom.el === "Cl" ? 5.8 : 7.2;
      svg.appendChild(el("circle", {
        cx: point.x,
        cy: point.y,
        r: radius + 4,
        fill: atom.color,
        opacity: 0.12,
        filter: "url(#" + atomGlowId + ")"
      }));
      svg.appendChild(el("circle", {
        cx: point.x,
        cy: point.y,
        r: radius,
        fill: atom.color,
        opacity: 0.95,
        stroke: "rgba(255,255,255,.5)",
        "stroke-width": 0.7
      }));
      if (atom.el === "P" || atom.el === "Zr" || atom.el === "La" || atom.el === "Y") {
        const label = el("text", {
          x: point.x,
          y: point.y + 3.2,
          fill: "#08111f",
          "font-size": 7,
          "font-weight": 700,
          "text-anchor": "middle"
        });
        label.textContent = atom.el;
        svg.appendChild(label);
      }
    });
  }

  window.CrystalCharts = {
    renderXrd: renderXrd,
    renderCrystal: renderCrystal
  };
})();
