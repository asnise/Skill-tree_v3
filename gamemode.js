import { state, dom } from "./globals.js";
import { buildEdgePath, createNodeShapeElement } from "./renderer.js";
import { getParentsOfNode } from "./utils.js";

let gameState = {
  active: false,
  points: 9999,
  unlocked: new Set(),
  view: { x: 0, y: 0, scale: 1 }
};

export function startGameMode() {
  dom.gameMode.style.display = "flex";
  gameState.view = { ...state.view };
  gameState.active = true;
  gameState.points = 9999;
  gameState.unlocked = new Set();

  updateGameHUD();
  renderGame();
}

export function closeGameMode() {
  dom.gameMode.style.display = "none";
  gameState.active = false;
}

function updateGameHUD() {
  dom.gamePoints.innerText = ""; // Infinite points
}

function updateGameTransform() {
  dom.gameTransformLayer.setAttribute(
    "transform",
    `translate(${gameState.view.x}, ${gameState.view.y}) scale(${gameState.view.scale})`
  );
}

function renderGame() {
  updateGameTransform();
  dom.gameLinksLayer.innerHTML = "";
  dom.gameNodesLayer.innerHTML = "";

  const nodeMap = new Map(state.nodes.map(n => [n.id, n]));

  // Edges
  state.edges.forEach(edge => {
    const parent = nodeMap.get(edge.from);
    const node = nodeMap.get(edge.to);
    if (!parent || !node) return;

    const isActiveLink = gameState.unlocked.has(parent.id);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", buildEdgePath(edge, parent, node));
    path.setAttribute("class", "link-path");
    path.style.stroke = isActiveLink ? "var(--accent-color)" : "#333";
    path.style.strokeWidth = isActiveLink ? "2" : "1";
    dom.gameLinksLayer.appendChild(path);
  });

  // Nodes
  state.nodes.forEach(node => {
    const isUnlocked = gameState.unlocked.has(node.id);
    const isBase = (node.role === 'base');
    const parents = getParentsOfNode(node.id);
    const hasUnlockedParent = parents.some(pid => gameState.unlocked.has(pid));
    const canBuy = !isUnlocked && (isBase || hasUnlockedParent);

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
    g.style.cursor = (isUnlocked || canBuy) ? "pointer" : "default";

    const shape = createNodeShapeElement(node);
    if (isUnlocked) {
        shape.setAttribute("fill", "var(--accent-color)");
        shape.setAttribute("stroke", "#fff");
        shape.setAttribute("stroke-width", "2");
    } else if (canBuy) {
        shape.setAttribute("fill", "#2d3748");
        shape.setAttribute("stroke", "var(--accent-color)");
        shape.setAttribute("stroke-width", "2");
        shape.setAttribute("stroke-dasharray", "4 2");
    } else {
        shape.setAttribute("fill", "#111");
        shape.setAttribute("stroke", "#333");
        shape.setAttribute("stroke-width", "1");
    }
    g.appendChild(shape);

    if(node.iconPath) {
      const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
      img.setAttribute("x", -16);
      img.setAttribute("y", -16);
      img.setAttribute("width", 32);
      img.setAttribute("height", 32);
      img.setAttributeNS("http://www.w3.org/1999/xlink", "href", node.iconPath);
      img.setAttribute("href", node.iconPath);
      if(!isUnlocked) img.style.filter = "grayscale(100%) opacity(0.5)";
      g.appendChild(img);
    }

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = node.label || node.id;
    text.setAttribute("y", 35);
    text.setAttribute("fill", isUnlocked ? "#fff" : "#666");
    text.setAttribute("text-anchor", "middle");
    text.style.fontSize = "10px";
    g.appendChild(text);

    // Points Check Removed: Free buying
    g.onclick = (e) => {
      e.stopPropagation();
      if (isUnlocked) return;
      if (!canBuy) return;

      gameState.unlocked.add(node.id);
      updateGameHUD();
      renderGame();
    };

    dom.gameNodesLayer.appendChild(g);
  });
}

// Game Mode Panning Logic
let isGamePanning = false;
let gameDragStart = {x:0, y:0};

export function initGameEvents() {
    dom.gameCanvasContainer.addEventListener("wheel", (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const wheel = e.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * zoomIntensity);
        const rect = dom.gameCanvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const newScale = Math.max(0.1, Math.min(5, gameState.view.scale * zoom));
        gameState.view.x = mouseX - ((mouseX - gameState.view.x) * newScale) / gameState.view.scale;
        gameState.view.y = mouseY - ((mouseY - gameState.view.y) * newScale) / gameState.view.scale;
        gameState.view.scale = newScale;
        updateGameTransform();
    });

    dom.gameCanvasContainer.addEventListener("mousedown", (e) => {
      isGamePanning = true;
      gameDragStart = { x: e.clientX, y: e.clientY };
      dom.gameCanvasContainer.classList.add("panning");
    });

    window.addEventListener("mousemove", (e) => {
        if(gameState.active && isGamePanning) {
            const dx = e.clientX - gameDragStart.x;
            const dy = e.clientY - gameDragStart.y;
            gameState.view.x += dx;
            gameState.view.y += dy;
            gameDragStart = { x: e.clientX, y: e.clientY };
            updateGameTransform();
        }
    });

    window.addEventListener("mouseup", () => {
       if(isGamePanning) {
           isGamePanning = false;
           dom.gameCanvasContainer.classList.remove("panning");
       }
    });
}
