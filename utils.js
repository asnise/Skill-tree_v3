import { state, dom } from "./globals.js";

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getScreenPoint(evt) {
  const rect = dom.svg.getBoundingClientRect();
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

export function screenToWorld(x, y) {
  return {
    x: (x - state.view.x) / state.view.scale,
    y: (y - state.view.y) / state.view.scale,
  };
}

export function getParentsOfNode(nodeId) {
  return state.edges.filter((e) => e.to === nodeId).map((e) => e.from);
}

export function getChildrenOfNode(nodeId) {
  return state.edges.filter((e) => e.from === nodeId).map((e) => e.to);
}

export function canActivateNode(nodeId) {
  const node = state.nodes.find((n) => n.id === nodeId);
  if (node && node.role === 'base') return true;

  const parents = getParentsOfNode(nodeId);
  if (!parents.length) return false;
  return parents.every((pid) => {
    const p = state.nodes.find((n) => n.id === pid);
    return p && p.isActive;
  });
}

export function setNodeActive(nodeId, active) {
  // Recursively set active state (for Editor usage)
  const visited = new Set();
  function dfs(id, value) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = state.nodes.find((n) => n.id === id);
    if (!node) return;

    if (value) {
      if (!canActivateNode(id)) {
        node.isActive = false;
        return;
      }
      node.isActive = true;
    } else {
      node.isActive = false;
      const children = getChildrenOfNode(id);
      children.forEach((cid) => dfs(cid, false));
    }
  }
  dfs(nodeId, active);
}

export function normalizeActivation() {
  let changed;
  do {
    changed = false;
    for (const n of state.nodes) {
      if (n.isActive && !canActivateNode(n.id)) {
        n.isActive = false;
        changed = true;
      }
    }
  } while (changed);
}
