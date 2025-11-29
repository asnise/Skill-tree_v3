import { state, dom } from "./globals.js";
import { onNodeMouseDown, onNodeContextMenu, onEdgeHandleMouseDown, showEdgeHandleContextMenu } from "./events.js";

// --- Helpers for Geometry ---
export function buildEdgePath(edge, parent, node) {
  const style = edge.style || "curve";
  const hasHandle = typeof edge.hx === "number" && typeof edge.hy === "number";
  const mid = hasHandle
    ? { x: edge.hx, y: edge.hy }
    : { x: (parent.x + node.x) / 2, y: (parent.y + node.y) / 2 };

  if (style === "straight") {
    return `M ${parent.x} ${parent.y} L ${node.x} ${node.y}`;
  }
  if (style === "elbow") {
    return `M ${parent.x} ${parent.y} L ${mid.x} ${mid.y} L ${node.x} ${node.y}`;
  }
  return `M ${parent.x} ${parent.y} Q ${mid.x} ${mid.y} ${node.x} ${node.y}`;
}

export function getEdgeHandlePos(edge, parent, node) {
  if (typeof edge.hx === "number" && typeof edge.hy === "number") {
    return { x: edge.hx, y: edge.hy };
  }
  return {
    x: (parent.x + node.x) / 2,
    y: (parent.y + node.y) / 2,
  };
}

export function createNodeShapeElement(node) {
  const shapeType = node.shape || "circle";
  const r = 20;

  if (shapeType === "rect") {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", -r);
    rect.setAttribute("y", -r);
    rect.setAttribute("width", r * 2);
    rect.setAttribute("height", r * 2);
    rect.setAttribute("rx", 4);
    return rect;
  }

  if (shapeType === "poly") {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const sides = Math.max(3, node.polySides || 3);
    const points = [];
    for(let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI / sides) - (Math.PI / 2);
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        points.push(`${px},${py}`);
    }
    poly.setAttribute("points", points.join(" "));
    return poly;
  }

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("r", r);
  return circle;
}

export function updateTransform() {
  dom.transformLayer.setAttribute(
    "transform",
    `translate(${state.view.x}, ${state.view.y}) scale(${state.view.scale})`
  );
}

export function updateSelectionRect() {
  if (!dom.selectionRect) return;
  if (!state.isBoxSelecting) {
    dom.selectionRect.setAttribute("visibility", "hidden");
    dom.selectionRect.setAttribute("width", 0);
    dom.selectionRect.setAttribute("height", 0);
    return;
  }
  const x1 = state.boxStartWorld.x, y1 = state.boxStartWorld.y;
  const x2 = state.boxEndWorld.x, y2 = state.boxEndWorld.y;
  const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
  const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
  dom.selectionRect.setAttribute("x", rx);
  dom.selectionRect.setAttribute("y", ry);
  dom.selectionRect.setAttribute("width", rw);
  dom.selectionRect.setAttribute("height", rh);
  dom.selectionRect.setAttribute("visibility", "visible");
}

export function render() {
  dom.nodesLayer.innerHTML = "";
  dom.linksLayer.innerHTML = "";

  const nodeMap = new Map(state.nodes.map((n) => [n.id, n]));

  // Draw Edges
  state.edges.forEach((edge) => {
    const parent = nodeMap.get(edge.from);
    const node = nodeMap.get(edge.to);
    if (!parent || !node) return;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", buildEdgePath(edge, parent, node));
    path.setAttribute("class", "link-path");
    if (state.selectionSet.has(edge.from) || state.selectionSet.has(edge.to)) {
      path.classList.add("highlight");
    }
    dom.linksLayer.appendChild(path);

    if (edge.style !== "straight") {
      const handlePos = getEdgeHandlePos(edge, parent, node);
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", handlePos.x);
      c.setAttribute("cy", handlePos.y);
      c.setAttribute("r", 5);
      c.setAttribute("class", "edge-handle");
      c.dataset.edgeId = edge.id;
      c.addEventListener("mousedown", (ev) => onEdgeHandleMouseDown(ev, edge.id));
      c.addEventListener("contextmenu", (ev) => showEdgeHandleContextMenu(ev, edge.id));
      dom.linksLayer.appendChild(c);
    }
  });

  // Draw Nodes
  state.nodes.forEach((node) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
    g.setAttribute("class", "node-group" + (state.selectionSet.has(node.id) ? " selected" : ""));
    g.dataset.id = node.id;

    const shape = createNodeShapeElement(node);
    const baseClasses = [
      "node-base",
      node.kind === "passive" ? "passive-skill" : "active-skill",
    ];
    if (node.isActive) baseClasses.push("node-unlocked");
    shape.setAttribute("class", baseClasses.join(" "));
    g.appendChild(shape);

    if (node.iconPath) {
      const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
      img.setAttribute("x", -16);
      img.setAttribute("y", -16);
      img.setAttribute("width", 32);
      img.setAttribute("height", 32);
      img.setAttributeNS("http://www.w3.org/1999/xlink", "href", node.iconPath);
      img.setAttribute("href", node.iconPath);
      g.appendChild(img);
    } else {
      const hLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      hLine.setAttribute("x1", -7);
      hLine.setAttribute("y1", 0);
      hLine.setAttribute("x2", 7);
      hLine.setAttribute("y2", 0);
      hLine.setAttribute("class", "node-plus-line");
      const vLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      vLine.setAttribute("x1", 0);
      vLine.setAttribute("y1", -7);
      vLine.setAttribute("x2", 0);
      vLine.setAttribute("y2", 7);
      vLine.setAttribute("class", "node-plus-line");
      g.appendChild(hLine);
      g.appendChild(vLine);
    }

    const sub = document.createElementNS("http://www.w3.org/2000/svg", "text");
    sub.textContent = node.label ? `${node.label}` : node.id;
    sub.setAttribute("y", 32);
    sub.setAttribute("class", "node-id-sub");
    g.appendChild(sub);

    g.addEventListener("mousedown", (e) => onNodeMouseDown(e, node));
    g.addEventListener("contextmenu", (e) => onNodeContextMenu(e, node));

    dom.nodesLayer.appendChild(g);
  });
}

export function renderShapeEditor() {
  const layer = document.getElementById("shape-tool-layer");
  if (!state.shapeEditor.active) {
    layer.style.display = "none";
    return;
  }
  layer.style.display = "block";
  layer.innerHTML = ""; // Clear previous

  const { type, x, y, w, h, radius, sides } = state.shapeEditor;

  // 1. Draw the Shape Body
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "shape-preview-path");

  let vertices = [];

  if (type === 'rect') {
    const hw = w/2;
    const hh = h/2;
    vertices = [
      {x: x - hw, y: y - hh}, // Top-Left
      {x: x + hw, y: y - hh}, // Top-Right
      {x: x + hw, y: y + hh}, // Bottom-Right
      {x: x - hw, y: y + hh}  // Bottom-Left
    ];
    path.setAttribute("d", `M ${vertices[0].x} ${vertices[0].y} L ${vertices[1].x} ${vertices[1].y} L ${vertices[2].x} ${vertices[2].y} L ${vertices[3].x} ${vertices[3].y} Z`);
  } else {
    // Polygon
    for (let i = 0; i < sides; i++) {
      const ang = (i * 2 * Math.PI) / sides - Math.PI / 2;
      vertices.push({
        x: x + Math.cos(ang) * radius,
        y: y + Math.sin(ang) * radius
      });
    }
    const d = vertices.map((v, i) => (i === 0 ? "M" : "L") + ` ${v.x} ${v.y}`).join(" ") + " Z";
    path.setAttribute("d", d);
  }

  // Attach Body Event (Move)
  path.addEventListener("mousedown", (e) => {
     if(e.button !== 0) return;
     e.stopPropagation();
     state.shapeEditor.dragMode = 'move';
     state.shapeEditor.dragStart = { x: e.clientX, y: e.clientY };
  });

  layer.appendChild(path);

  // 2. Draw Handles (at vertices)
  vertices.forEach((v, i) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", v.x);
    c.setAttribute("cy", v.y);
    c.setAttribute("r", 6);
    c.setAttribute("class", "shape-handle");

    // Attach Handle Event (Resize)
    c.addEventListener("mousedown", (e) => {
       if(e.button !== 0) return;
       e.stopPropagation();
       state.shapeEditor.dragMode = 'handle';
       state.shapeEditor.dragHandleIndex = i;
       state.shapeEditor.dragStart = { x: e.clientX, y: e.clientY };
       state.shapeEditor.initialParams = { w, h, radius, x, y }; // Snapshot for delta calc
    });

    layer.appendChild(c);
  });
}
