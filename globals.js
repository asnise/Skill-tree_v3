export const CONFIG = {
  gridSize: 20,
  snap: true,
  storageKey: "skillTreeEditor_v3"
};

export const state = {
  nodes: [{
    id: "root",
    label: "Core",
    kind: "active",
    role: "base",
    x: 0,
    y: 0,
    description: "Starting node.",
    extras: {},
    iconPath: "",
    linkStyle: "curve",
    isActive: true, // Editor status
    shape: "circle",
    polySides: 6,
    shapeEditor: {
        active: false,
        type: 'rect',   // 'rect' | 'poly'
        x: 0, y: 0,     // Center position in World Space
        w: 300, h: 200, // For rect
        radius: 150,    // For poly
        sides: 5,       // For poly
        dragMode: null, // 'move' | 'handle'
        dragHandleIndex: -1,
        dragStart: { x: 0, y: 0 },
        initialParams: {}
      }
  }],
  edges: [],
  edgeSeq: 1,
  selection: null,
  selectionSet: new Set(),
  view: { x: 400, y: 300, scale: 1 },
  isDragging: false,
  isPanning: false,
  isLinking: false,
  linkDragStarted: false,
  linkSourceNode: null,
  isBoxSelecting: false,
  boxAdditive: false,
  boxStartWorld: { x: 0, y: 0 },
  boxEndWorld: { x: 0, y: 0 },
  boxBaseSelection: new Set(),
  dragStart: { x: 0, y: 0 },
  dragGroup: null,
  history: [],
  historyIndex: -1,
  parentModalNodeId: null,
  dragEdgeHandleId: null,
};

// DOM elements will be populated in main.js
export const dom = {
  svg: null,
  transformLayer: null,
  nodesLayer: null,
  linksLayer: null,
  tempLink: null,
  inspectorContent: null,
  ctxMenu: null,
  bgRect: null,
  viewport: null,
  parentModalBackdrop: null,
  parentModalBody: null,
  importInput: null,
  selectionRect: null,
  gameMode: null,
  gamePoints: null,
  gameCanvasContainer: null,
  gameLinksLayer: null,
  gameNodesLayer: null,
  gameTransformLayer: null,
};
