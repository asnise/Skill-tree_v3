import { state, dom } from "./globals.js";
import { render, updateTransform, renderShapeEditor } from "./renderer.js";
import { renderInspector, hideCtx } from "./ui.js";
import { loadFromLocal, pushHistory, undo, redo, saveToLocal } from "./history.js";
import { initGlobalListeners } from "./events.js";
import { initGameEvents, startGameMode, closeGameMode } from "./gamemode.js";
import { normalizeActivation, getParentsOfNode, setNodeActive } from "./utils.js";

// --- Commands exposed to window for HTML/Context Menu access ---
window.cmdAddNode = (x, y) => {
  const id = "n" + (state.nodes.length + 1) + "_" + Math.floor(Math.random()*1000);
  const newNode = {
    id, label: "New Node", kind: "active", role: "normal", x: x, y: y,
    description: "", isActive: false, linkStyle: "curve", shape: "circle"
  };
  state.nodes.push(newNode);
  state.selection = id;
  state.selectionSet = new Set([id]);
  hideCtx();
  pushHistory();
  render();
  renderInspector();
};

window.cmdLinkSelectedTo = (targetId) => {
  const selected = Array.from(state.selectionSet);
  let changed = false;
  selected.forEach(srcId => {
    if (srcId === targetId) return;

    // 1. Forward Link: Selected -> Target
    const existsForward = state.edges.some(e => e.from === srcId && e.to === targetId);
    if (!existsForward) {
      const srcNode = state.nodes.find(n => n.id === srcId);
      state.edges.push({
        id: "e" + state.edgeSeq++, from: srcId, to: targetId,
        style: srcNode.linkStyle || "curve"
      });
      changed = true;
    }

    // 2. Backward Link: Target -> Selected (Relationship with each other)
    const existsBackward = state.edges.some(e => e.from === targetId && e.to === srcId);
    if (!existsBackward) {
      const targetNode = state.nodes.find(n => n.id === targetId);
      state.edges.push({
        id: "e" + state.edgeSeq++, from: targetId, to: srcId,
        style: targetNode?.linkStyle || "curve"
      });
      changed = true;
    }
  });

  if (changed) {
    normalizeActivation();
    pushHistory();
    render();
    renderInspector();
  }
  hideCtx();
};

// --- New: Unlink Selected ---
window.cmdUnlinkSelected = () => {
    const sel = state.selectionSet;
    if (sel.size < 2) return;

    const initialEdges = state.edges.length;
    // Remove edges where both endpoints are in the selection
    state.edges = state.edges.filter(e => !(sel.has(e.from) && sel.has(e.to)));

    if (state.edges.length !== initialEdges) {
        normalizeActivation();
        pushHistory();
        render();
        renderInspector();
    }
    hideCtx();
};

window.deleteNode = (id) => {
  state.nodes = state.nodes.filter((n) => n.id !== id);
  state.edges = state.edges.filter((e) => e.from !== id && e.to !== id);
  state.selection = null;
  state.selectionSet = new Set();
  normalizeActivation();
  pushHistory();
  render();
  renderInspector();
};

window.cmdResetView = () => {
  hideCtx();
  state.view = { x: 400, y: 300, scale: 1 };
  updateTransform();
};

window.resetEdgeHandle = (edgeId) => {
  const edge = state.edges.find(e => e.id === edgeId);
  if (edge) {
    delete edge.hx;
    delete edge.hy;
    hideCtx();
    render();
    pushHistory();
  }
};

window.cmdToggleSelection = (id) => {
    if (state.selectionSet.has(id)) {
        state.selectionSet.delete(id);
    } else {
        state.selectionSet.add(id);
    }
    render();
    renderInspector();
    hideCtx();
};

// --- Shape Generator Tool Commands ---

window.cmdToggleShapeTool = () => {
  if (!state.shapeEditor) {
      state.shapeEditor = { active: false, type: 'rect', x: 0, y: 0, w: 200, h: 200, radius: 100, sides: 5 };
  }

  state.shapeEditor.active = !state.shapeEditor.active;

  const ui = document.getElementById("shape-controls");
  const btn = document.getElementById("tool-shape");
  const layer = document.getElementById("shape-tool-layer");

  if (state.shapeEditor.active) {
    if (ui) ui.style.display = "flex";
    if (btn) btn.classList.add("active");

    state.shapeEditor.x = 0;
    state.shapeEditor.y = 0;

    renderShapeEditor();
  } else {
    if (ui) ui.style.display = "none";
    if (btn) btn.classList.remove("active");
    if (layer) layer.style.display = "none";
  }
};

window.updateShapeSettings = () => {
  const typeSelect = document.getElementById("shape-type-select");
  const sidesInput = document.getElementById("shape-sides-input");
  const polySettings = document.getElementById("shape-poly-settings");

  state.shapeEditor.type = typeSelect.value;
  state.shapeEditor.sides = parseInt(sidesInput.value) || 3;

  if (polySettings) {
      polySettings.style.display = (state.shapeEditor.type === 'poly') ? "flex" : "none";
  }

  renderShapeEditor();
};

window.cmdCommitShape = () => {
  if (!state.shapeEditor || !state.shapeEditor.active) return;

  const { type, x, y, w, h, radius, sides } = state.shapeEditor;
  let points = [];

  if (type === 'rect') {
    const hw = w/2, hh = h/2;
    points = [
      {x: x - hw, y: y - hh},
      {x: x + hw, y: y - hh},
      {x: x + hw, y: y + hh},
      {x: x - hw, y: y + hh}
    ];
  } else {
    for (let i = 0; i < sides; i++) {
      const ang = (i * 2 * Math.PI) / sides - Math.PI / 2;
      points.push({
        x: x + Math.cos(ang) * radius,
        y: y + Math.sin(ang) * radius
      });
    }
  }

  points.forEach((pt) => {
    const id = "n" + (state.nodes.length + 1) + "_" + Math.floor(Math.random()*1000);
    state.nodes.push({
      id,
      label: "Node",
      kind: "active",
      role: "normal",
      x: Math.round(pt.x),
      y: Math.round(pt.y),
      isActive: false,
      linkStyle: "curve",
      shape: "circle"
    });
  });

  pushHistory();
  window.cmdToggleShapeTool();
  render();
};

// --- Modals ---
window.openParentModal = (nodeId) => {
  state.parentModalNodeId = nodeId;
  const parents = getParentsOfNode(nodeId);
  dom.parentModalBody.innerHTML = state.nodes
    .filter((n) => n.id !== nodeId)
    .map((n) => {
      const checked = parents.includes(n.id) ? "checked" : "";
      const displayText = n.id;
      const title = n.label || n.id;
      return `
        <div class="parent-item">
          <input type="checkbox" id="parent-${n.id}" value="${n.id}" ${checked}>
          <label for="parent-${n.id}" title="${title}">${displayText}</label>
        </div>
      `;
    })
    .join("");
  dom.parentModalBackdrop.style.display = "flex";
};

window.closeParentModal = () => {
  dom.parentModalBackdrop.style.display = "none";
  state.parentModalNodeId = null;
};

window.saveParentModal = () => {
  if (!state.parentModalNodeId) return;
  const checkboxes = dom.parentModalBody.querySelectorAll('input[type="checkbox"]');
  const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

  const nodeId = state.parentModalNodeId;
  const current = getParentsOfNode(nodeId);
  state.edges = state.edges.filter((e) => !(e.to === nodeId && !selected.includes(e.from)));
  const node = state.nodes.find((n) => n.id === nodeId);
  const defaultStyle = node?.linkStyle || "curve";
  selected.forEach((pid) => {
    if (!pid) return;
    if (!current.includes(pid)) {
      state.edges.push({ id: "e" + state.edgeSeq++, from: pid, to: nodeId, style: defaultStyle });
    }
  });
  normalizeActivation();
  pushHistory();
  render();
  renderInspector();
  window.closeParentModal();
};

// Game Mode
window.closeGameMode = closeGameMode;

// --- Init ---
function bindDOM() {
    dom.svg = document.getElementById("canvas");
    dom.transformLayer = document.getElementById("transform-layer");
    dom.nodesLayer = document.getElementById("nodes-layer");
    dom.linksLayer = document.getElementById("links-layer");
    dom.tempLink = document.getElementById("temp-link");
    dom.inspectorContent = document.getElementById("inspector-content");
    dom.ctxMenu = document.getElementById("context-menu");
    dom.bgRect = document.getElementById("bg-rect");
    dom.viewport = document.getElementById("viewport");
    dom.parentModalBackdrop = document.getElementById("parent-modal-backdrop");
    dom.parentModalBody = document.getElementById("parent-modal-body");
    dom.importInput = document.getElementById("import-input");

    dom.gameMode = document.getElementById("game-mode");
    dom.gamePoints = document.getElementById("game-points");
    dom.gameCanvasContainer = document.getElementById("game-canvas-container");
    dom.gameLinksLayer = document.getElementById("game-links-layer");
    dom.gameNodesLayer = document.getElementById("game-nodes-layer");
    dom.gameTransformLayer = document.getElementById("game-transform-layer");
}

function initTools() {
    document.getElementById("tool-select").addEventListener("click", () => {
        document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
        document.getElementById("tool-select").classList.add("active");
    });
    document.getElementById("tool-hand").addEventListener("click", () => {
        document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
        document.getElementById("tool-hand").classList.add("active");
    });
    document.getElementById("tool-undo").addEventListener("click", undo);
    document.getElementById("tool-redo").addEventListener("click", redo);

    document.getElementById("tool-export").addEventListener("click", () => {
      const exportObj = { nodes: state.nodes, edges: state.edges };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
      const a = document.createElement("a");
      a.setAttribute("href", dataStr);
      a.setAttribute("download", "skill-tree.json");
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    document.getElementById("tool-import").addEventListener("click", () => {
        dom.importInput.click();
    });

    document.getElementById("tool-reset-view").addEventListener("click", window.cmdResetView);
    document.getElementById("tool-play").addEventListener("click", startGameMode);

    dom.importInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                state.nodes = data.nodes || [];
                state.edges = data.edges || [];
                state.edgeSeq = data.edgeSeq || (state.edges.length + 100);
                normalizeActivation();
                pushHistory();
                render();
            } catch (err) { alert("Invalid JSON"); }
        };
        reader.readAsText(file);
    });

    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.code === "Delete" || e.code === "Backspace") {
            const ids = Array.from(state.selectionSet);
            if (!ids.length) return;
            if (ids.length === 1) window.deleteNode(ids[0]);
            else {
                if (!confirm(`Delete ${ids.length} selected nodes?`)) return;
                state.nodes = state.nodes.filter(n => !ids.includes(n.id));
                state.edges = state.edges.filter(e => !ids.includes(e.from) && !ids.includes(e.to));
                state.selection = null;
                state.selectionSet = new Set();
                normalizeActivation();
                pushHistory();
                render();
                renderInspector();
            }
        }
        if (e.ctrlKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
        if (e.ctrlKey && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    });
}

(function init() {
    bindDOM();

    const selRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    selRect.setAttribute("class", "selection-rect");
    selRect.setAttribute("visibility", "hidden");
    selRect.setAttribute("pointer-events", "none");
    dom.transformLayer.appendChild(selRect);
    dom.selectionRect = selRect;

    const saved = loadFromLocal();
    if (saved) {
        state.nodes = saved.nodes;
        state.edges = saved.edges;
        state.edgeSeq = saved.edgeSeq;
        pushHistory();
    } else {
        pushHistory();
    }

    initGlobalListeners();
    initGameEvents();
    initTools();

    render();
    renderInspector();
})();
