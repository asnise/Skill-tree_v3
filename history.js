import { state, CONFIG } from "./globals.js";
import { normalizeActivation } from "./utils.js";
import { render } from "./renderer.js";
import { renderInspector } from "./ui.js";

export function saveToLocal() {
  try {
    const payload = {
      nodes: state.nodes,
      edges: state.edges,
      edgeSeq: state.edgeSeq,
    };
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(payload));
  } catch (err) {
    console.warn("Save failed", err);
  }
}

export function loadFromLocal() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) return null;
    return {
      nodes: data.nodes,
      edges: data.edges,
      edgeSeq: data.edgeSeq || data.edges.length + 1,
    };
  } catch (err) {
    return null;
  }
}

export function pushHistory() {
  if (state.historyIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.historyIndex + 1);
  }
  const snapshot = JSON.parse(JSON.stringify({
      nodes: state.nodes,
      edges: state.edges,
      edgeSeq: state.edgeSeq,
  }));
  state.history.push(snapshot);
  state.historyIndex++;
  if (state.history.length > 20) {
    state.history.shift();
    state.historyIndex--;
  }
  saveToLocal();
}

export function undo() {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    const snap = state.history[state.historyIndex];
    state.nodes = JSON.parse(JSON.stringify(snap.nodes));
    state.edges = JSON.parse(JSON.stringify(snap.edges));
    state.edgeSeq = snap.edgeSeq;
    normalizeActivation();
    render();
    renderInspector();
    saveToLocal();
  }
}

export function redo() {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    const snap = state.history[state.historyIndex];
    state.nodes = JSON.parse(JSON.stringify(snap.nodes));
    state.edges = JSON.parse(JSON.stringify(snap.edges));
    state.edgeSeq = snap.edgeSeq;
    normalizeActivation();
    render();
    renderInspector();
    saveToLocal();
  }
}
