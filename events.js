import { state, dom, CONFIG } from "./globals.js";
import { getScreenPoint, screenToWorld, normalizeActivation, setNodeActive } from "./utils.js";
import { render, updateTransform, updateSelectionRect, renderShapeEditor } from "./renderer.js"; // Added renderShapeEditor
import { renderInspector, hideCtx } from "./ui.js";
import { pushHistory } from "./history.js";

// === Functions invoked by Listeners ===
export function onNodeMouseDown(e, node) {
  e.stopPropagation();
  hideCtx();
  if (e.button === 2) return;

  // Handle Alt Key (Link Only)
  if (e.altKey) {
    state.isLinking = true;
    state.linkDragStarted = false;
    state.linkSourceNode = node;
    dom.tempLink.setAttribute("d", `M ${node.x} ${node.y} L ${node.x} ${node.y}`);
    dom.tempLink.style.display = "block";
    return;
  }

  // Selection Logic
  const additive = e.ctrlKey || e.metaKey;
  if (additive) {
    if (state.selectionSet.has(node.id)) {
        state.selectionSet.delete(node.id);
        const arr = Array.from(state.selectionSet);
        state.selection = arr.length ? arr[arr.length - 1] : null;
    } else {
        state.selectionSet.add(node.id);
        state.selection = node.id;
    }
  } else {
    if (!state.selectionSet.has(node.id)) {
      state.selection = node.id;
      state.selectionSet = new Set([node.id]);
    } else {
      state.selection = node.id;
    }
  }
  render();
  renderInspector();

  if (e.button === 0) {
    const ids = Array.from(state.selectionSet);
    if (!ids.length) return;
    state.isDragging = true;
    state.dragGroup = ids.map((id) => state.nodes.find((n) => n.id === id)).filter(Boolean);
  }
}

export function onNodeContextMenu(e, node) {
  e.preventDefault();
  e.stopPropagation();
  const menu = dom.ctxMenu;
  const selectedIds = Array.from(state.selectionSet).filter((id) => id !== node.id);

  let html = `<div class="ctx-item" onclick="window.cmdToggleSelection('${node.id}')">Toggle Selection</div>`;

  if (selectedIds.length > 0) {
    html += `<div class="ctx-item" onclick="window.cmdLinkSelectedTo('${node.id}')">Link Selected to This</div>`;
  }

  html += `<div class="ctx-item" style="color:var(--danger)" onclick="window.deleteNode('${node.id}')">Delete Node</div>`;

  menu.innerHTML = html;
  menu.style.display = "block";
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
}

export function onEdgeHandleMouseDown(e, edgeId) {
  e.stopPropagation();
  if (e.button === 0) {
    state.dragEdgeHandleId = edgeId;
  }
}

export function showEdgeHandleContextMenu(e, edgeId) {
  e.preventDefault();
  e.stopPropagation();
  const menu = dom.ctxMenu;
  menu.innerHTML = `<div class="ctx-item" onclick="window.resetEdgeHandle('${edgeId}')">Reset Handle</div>`;
  menu.style.display = "block";
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
}

// === Global Listeners Setup ===
export function initGlobalListeners() {
    dom.viewport.addEventListener("wheel", (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const wheel = e.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * zoomIntensity);
        const rect = dom.svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const newScale = Math.max(0.1, Math.min(5, state.view.scale * zoom));
        state.view.x = mouseX - ((mouseX - state.view.x) * newScale) / state.view.scale;
        state.view.y = mouseY - ((mouseY - state.view.y) * newScale) / state.view.scale;
        state.view.scale = newScale;
        updateTransform();
    });

    dom.bgRect.addEventListener("mousedown", (e) => {
        hideCtx();
        if (e.button === 1 || document.getElementById("tool-hand").classList.contains("active")) {
            state.isPanning = true;
            state.dragStart = { x: e.clientX, y: e.clientY };
            dom.viewport.classList.add("panning");
            return;
        }
        if (e.button === 0) {
            const mouse = getScreenPoint(e);
            const world = screenToWorld(mouse.x, mouse.y);
            state.isBoxSelecting = true;
            state.boxAdditive = e.ctrlKey || e.metaKey;
            state.boxStartWorld = { ...world };
            state.boxEndWorld = { ...world };
            state.boxBaseSelection = new Set(state.selectionSet);
            if (!state.boxAdditive) {
                state.selection = null;
                state.selectionSet = new Set();
            }
            updateSelectionRect();
        }
    });

    window.addEventListener("mousemove", (e) => {
        // --- Shape Tool Logic ---
        if (state.shapeEditor && state.shapeEditor.active && state.shapeEditor.dragMode) {
            const dx = (e.clientX - state.shapeEditor.dragStart.x) / state.view.scale;
            const dy = (e.clientY - state.shapeEditor.dragStart.y) / state.view.scale;

            if (state.shapeEditor.dragMode === 'move') {
                state.shapeEditor.x += dx;
                state.shapeEditor.y += dy;
                state.shapeEditor.dragStart = { x: e.clientX, y: e.clientY };
            }
            else if (state.shapeEditor.dragMode === 'handle') {
                const init = state.shapeEditor.initialParams;

                if (state.shapeEditor.type === 'rect') {
                    // Symmetric resizing
                    const idx = state.shapeEditor.dragHandleIndex;
                    const dirX = (idx === 1 || idx === 2) ? 1 : -1;
                    const dirY = (idx === 2 || idx === 3) ? 1 : -1;

                    state.shapeEditor.w = Math.max(40, init.w + (dx * dirX * 2));
                    state.shapeEditor.h = Math.max(40, init.h + (dy * dirY * 2));

                    // Reset drag start prevents compounding errors
                    state.shapeEditor.dragStart = { x: e.clientX, y: e.clientY };
                    state.shapeEditor.initialParams.w = state.shapeEditor.w;
                    state.shapeEditor.initialParams.h = state.shapeEditor.h;
                } else {
                    // Polygon: Adjust Radius
                    const mouse = getScreenPoint(e);
                    const world = screenToWorld(mouse.x, mouse.y);
                    const dist = Math.sqrt(Math.pow(world.x - state.shapeEditor.x, 2) + Math.pow(world.y - state.shapeEditor.y, 2));
                    state.shapeEditor.radius = dist;
                }
            }
            renderShapeEditor();
            return; // Block other interactions
        }
        // ------------------------

        if (state.isPanning) {
            const dx = e.clientX - state.dragStart.x;
            const dy = e.clientY - state.dragStart.y;
            state.view.x += dx;
            state.view.y += dy;
            state.dragStart = { x: e.clientX, y: e.clientY };
            updateTransform();
            return;
        }

        if (state.isDragging && state.dragGroup && state.dragGroup.length) {
            const zoom = state.view.scale;
            const dx = e.movementX / zoom;
            const dy = e.movementY / zoom;
            state.dragGroup.forEach((n) => {
                n.x += dx;
                n.y += dy;
                if (CONFIG.snap && e.shiftKey) {
                    n.x = Math.round(n.x / CONFIG.gridSize) * CONFIG.gridSize;
                    n.y = Math.round(n.y / CONFIG.gridSize) * CONFIG.gridSize;
                }
            });
            render();
            const primaryId = state.selection;
            if (primaryId) {
                const primary = state.nodes.find((n) => n.id === primaryId);
                if (primary) {
                    const inpX = document.getElementById("inp-x");
                    const inpY = document.getElementById("inp-y");
                    if (inpX) inpX.value = Math.round(primary.x);
                    if (inpY) inpY.value = Math.round(primary.y);
                }
            }
        }

        if (state.dragEdgeHandleId) {
            const edge = state.edges.find((e2) => e2.id === state.dragEdgeHandleId);
            if (edge) {
                const mouse = getScreenPoint(e);
                const world = screenToWorld(mouse.x, mouse.y);
                edge.hx = world.x;
                edge.hy = world.y;
                render();
            }
        }

        if (state.isLinking && state.linkSourceNode) {
            state.linkDragStarted = true;
            const mouse = getScreenPoint(e);
            const world = screenToWorld(mouse.x, mouse.y);
            dom.tempLink.setAttribute("d", `M ${state.linkSourceNode.x} ${state.linkSourceNode.y} L ${world.x} ${world.y}`);
        }

        if (state.isBoxSelecting) {
            const mouse = getScreenPoint(e);
            const world = screenToWorld(mouse.x, mouse.y);
            state.boxEndWorld = world;
            updateSelectionRect();

            const x1 = Math.min(state.boxStartWorld.x, state.boxEndWorld.x);
            const x2 = Math.max(state.boxStartWorld.x, state.boxEndWorld.x);
            const y1 = Math.min(state.boxStartWorld.y, state.boxEndWorld.y);
            const y2 = Math.max(state.boxStartWorld.y, state.boxEndWorld.y);

            const newSet = new Set(state.boxAdditive ? state.boxBaseSelection : []);
            state.nodes.forEach(n => {
                if (n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2) {
                    newSet.add(n.id);
                }
            });
            state.selectionSet = newSet;
            if (state.selectionSet.size > 0 && !state.selectionSet.has(state.selection)) {
                state.selection = Array.from(state.selectionSet)[0];
            } else if (state.selectionSet.size === 0) {
                state.selection = null;
            }
            render();
            renderInspector();
        }
    });

    window.addEventListener("mouseup", (e) => {
        state.isPanning = false;
        dom.viewport.classList.remove("panning");
        state.isDragging = false;
        state.dragGroup = null;
        state.dragEdgeHandleId = null;

        // --- Reset Shape Tool Drag ---
        if (state.shapeEditor && state.shapeEditor.active && state.shapeEditor.dragMode) {
            state.shapeEditor.dragMode = null;
            return;
        }
        // -----------------------------

        if (state.isLinking) {
            state.isLinking = false;
            dom.tempLink.style.display = "none";
            const targetGroup = e.target.closest(".node-group");
            if (targetGroup) {
                const targetId = targetGroup.dataset.id;
                if (targetId && targetId !== state.linkSourceNode.id) {
                    const exists = state.edges.some(edge => edge.from === state.linkSourceNode.id && edge.to === targetId);
                    if (!exists) {
                        state.edges.push({
                            id: "e" + state.edgeSeq++,
                            from: state.linkSourceNode.id,
                            to: targetId,
                            style: state.linkSourceNode.linkStyle || "curve"
                        });
                        normalizeActivation();
                        pushHistory();
                        render();
                    }
                }
            }
            state.linkSourceNode = null;
        }

        if (state.isBoxSelecting) {
            state.isBoxSelecting = false;
            updateSelectionRect();
        }
    });

    window.addEventListener("click", (e) => {
        if (!e.target.closest("#context-menu")) {
            hideCtx();
        }
    });

    dom.svg.addEventListener("contextmenu", (e) => {
        if (e.target.closest(".node-group")) return;
        if (e.target.classList.contains("edge-handle")) return;

        e.preventDefault();
        const menu = dom.ctxMenu;
        const mouse = getScreenPoint(e);
        const world = screenToWorld(mouse.x, mouse.y);

        menu.innerHTML = `
            <div class="ctx-item" onclick="window.cmdAddNode(${world.x}, ${world.y})">Add Node Here</div>
            <div class="ctx-item" onclick="window.cmdResetView()">Reset View</div>
        `;
        menu.style.display = "block";
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) menu.style.left = `${e.clientX - rect.width}px`;
        if (rect.bottom > window.innerHeight) menu.style.top = `${e.clientY - rect.height}px`;
    });
}
