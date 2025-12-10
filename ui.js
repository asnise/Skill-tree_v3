import { state, dom } from "./globals.js";
import { escapeHtml, getParentsOfNode, canActivateNode, setNodeActive, normalizeActivation } from "./utils.js";
import { pushHistory } from "./history.js";
import { render } from "./renderer.js";

// === Context Menu ===
export function hideCtx() {
  dom.ctxMenu.style.display = "none";
}

// === Inspector ===
export function renderInspector() {
  const selectedIds = Array.from(state.selectionSet);
  if (!selectedIds.length) {
    dom.inspectorContent.innerHTML = `
      <div class="empty-state">
        Select a node to edit properties.<br><br>
        <b>Click</b> to select.<br>
        <b>Drag</b> to move.<br>
        <b>Alt+Drag</b> to link.
      </div>
    `;
    return;
  }

  // === MULTI-SELECT MODE ===
  if (selectedIds.length > 1) {
    const nodes = selectedIds.map(id => state.nodes.find(n => n.id === id)).filter(Boolean);

    // Helpers to determine common values or mixed state
    const getCommon = (key, def) => {
        const first = nodes[0][key] !== undefined ? nodes[0][key] : def;
        for (let i = 1; i < nodes.length; i++) {
            const val = nodes[i][key] !== undefined ? nodes[i][key] : def;
            if (val !== first) return null; // null indicates mixed values
        }
        return first;
    };

    const roleVal = getCommon("role", "normal");
    const shapeVal = getCommon("shape", "circle");
    const iconVal = getCommon("iconPath", "");
    const linkStyleVal = getCommon("linkStyle", "curve");

    // Only show sides input if all selected nodes are polygons
    const allPoly = nodes.every(n => n.shape === 'poly');
    const sidesVal = allPoly ? getCommon("polySides", 3) : null;

    // Helper to generate Select HTML with mixed support
    const renderSelect = (id, opts, val) => {
        const mixedOpt = val === null ? `<option value="" selected disabled>...</option>` : '';
        return `<select id="${id}">${mixedOpt}${opts}</select>`;
    };

    dom.inspectorContent.innerHTML = `
        <div class="panel-section">
            <div class="section-title">Multi-Selection (${nodes.length} nodes)</div>
            <div class="control-group">
                <label>Role</label>
                ${renderSelect("inp-role-multi", `
                    <option value="normal" ${roleVal === 'normal' ? 'selected' : ''}>Normal</option>
                    <option value="base" ${roleVal === 'base' ? 'selected' : ''}>Base (Starter)</option>
                `, roleVal)}
            </div>
        </div>

        <div class="panel-section">
          <div class="section-title">Style & Appearance</div>
          <div class="control-group">
            <label>Shape</label>
             ${renderSelect("inp-shape-multi", `
                <option value="circle" ${shapeVal === 'circle' ? 'selected' : ''}>Circle</option>
                <option value="rect" ${shapeVal === 'rect' ? 'selected' : ''}>Rectangle</option>
                <option value="poly" ${shapeVal === 'poly' ? 'selected' : ''}>Polygon</option>
             `, shapeVal)}
          </div>
          ${allPoly ? `
          <div class="control-group">
            <label>Sides</label>
            <input type="number" id="inp-sides-multi" value="${sidesVal === null ? '' : sidesVal}" placeholder="${sidesVal === null ? '...' : ''}" min="3" max="12">
          </div>` : ''}
          <div class="control-group">
            <label>Icon Path</label>
            <input type="text" id="inp-icon-multi" value="${iconVal === null ? '' : escapeHtml(iconVal)}" placeholder="${iconVal === null ? '...' : ''}">
          </div>
          <div class="control-group">
            <label>Connection Style (edges TO these nodes)</label>
             ${renderSelect("inp-link-style-multi", `
                <option value="curve" ${linkStyleVal === "curve" ? "selected" : ""}>Curve</option>
                <option value="straight" ${linkStyleVal === "straight" ? "selected" : ""}>Straight</option>
                <option value="elbow" ${linkStyleVal === "elbow" ? "selected" : ""}>Elbow (bent)</option>
             `, linkStyleVal)}
          </div>
        </div>

        <div class="panel-section">
           <button class="btn-action btn-danger" id="btn-delete-multi">Delete ${nodes.length} Nodes</button>
        </div>
    `;

    // --- Bindings for Multi-Select ---
    const updateAll = (updater) => {
        nodes.forEach(n => updater(n));
        normalizeActivation();
        pushHistory();
        render();
        renderInspector();
    };

    document.getElementById("inp-role-multi").addEventListener("change", (e) => {
        updateAll(n => n.role = e.target.value);
    });

    document.getElementById("inp-shape-multi").addEventListener("change", (e) => {
        updateAll(n => n.shape = e.target.value);
    });

    if (document.getElementById("inp-sides-multi")) {
        document.getElementById("inp-sides-multi").addEventListener("change", (e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val)) updateAll(n => n.polySides = val);
        });
    }

    document.getElementById("inp-icon-multi").addEventListener("change", (e) => {
        updateAll(n => n.iconPath = e.target.value);
    });

    document.getElementById("inp-link-style-multi").addEventListener("change", (e) => {
        const style = e.target.value;
        nodes.forEach(n => n.linkStyle = style);
        // Also update existing edges pointing to these nodes
        state.edges.forEach(edge => {
            if(state.selectionSet.has(edge.to)) edge.style = style;
        });
        pushHistory();
        render();
    });

    document.getElementById("btn-delete-multi").addEventListener("click", () => {
         if (!confirm(`Delete ${selectedIds.length} selected nodes?`)) return;
         state.nodes = state.nodes.filter(n => !state.selectionSet.has(n.id));
         state.edges = state.edges.filter(e => !state.selectionSet.has(e.from) && !state.selectionSet.has(e.to));
         state.selection = null;
         state.selectionSet = new Set();
         normalizeActivation();
         pushHistory();
         render();
         renderInspector();
    });

    return;
  }

  // === SINGLE SELECTION MODE (Existing Logic) ===
  const node = state.nodes.find((n) => n.id === selectedIds[0]);
  if (!node) return;

  // Ensure extras object exists
  if (!node.extras) node.extras = {};

  const parents = getParentsOfNode(node.id);
  const parentSummary = parents.length ? parents.join(", ") : "(none)";

  // Build Attribute List HTML
  const extrasHtml = Object.entries(node.extras).map(([key, val]) => `
    <div class="control-row attribute-row" style="margin-bottom: 4px;">
      <input type="text" class="attr-key" value="${escapeHtml(key)}" data-prev-key="${escapeHtml(key)}" placeholder="Key" style="flex:1; min-width: 0;">
      <input type="text" class="attr-val" value="${escapeHtml(val)}" data-key="${escapeHtml(key)}" placeholder="Value" style="flex:1; min-width: 0;">
      <button class="btn-icon-only btn-del-attr" data-key="${escapeHtml(key)}" title="Delete" style="color:var(--danger)">x</button>
    </div>
  `).join("");

  const html = `
    <div class="panel-section">
      <div class="section-title">General</div>
      <div class="control-group">
        <label>ID</label>
        <input type="text" id="inp-id" value="${escapeHtml(node.id)}">
      </div>
      <div class="control-group">
        <label>Label</label>
        <input type="text" id="inp-label" value="${escapeHtml(node.label)}">
      </div>
      <div class="control-group">
        <label>Description</label>
        <textarea id="inp-desc" rows="3" style="resize:vertical;">${escapeHtml(node.description || "")}</textarea>
      </div>
      <div class="control-row">
        <div class="control-group" style="flex:1">
          <label>X</label>
          <input type="number" id="inp-x" value="${Math.round(node.x)}">
        </div>
        <div class="control-group" style="flex:1">
          <label>Y</label>
          <input type="number" id="inp-y" value="${Math.round(node.y)}">
        </div>
      </div>
      <div class="control-group">
        <div class="extra-item">
          <label style="margin:0; flex:1">Unlocked (Active)</label>
          <div class="toggle-switch">
            <input type="checkbox" id="inp-active" ${node.isActive ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </div>
        </div>
        <div style="font-size:10px; color:#666; margin-top:2px;">
           ${canActivateNode(node.id) ? "Valid state" : "Requires active parents or Base role"}
        </div>
      </div>
      <div class="control-group">
        <label>Role</label>
        <select id="inp-role">
          <option value="normal" ${!node.role || node.role === 'normal' ? 'selected' : ''}>Normal</option>
          <option value="base" ${node.role === 'base' ? 'selected' : ''}>Base (Starter)</option>
        </select>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">Style & Appearance</div>
      <div class="control-group">
        <label>Shape</label>
        <select id="inp-shape">
          <option value="circle" ${node.shape === 'circle' ? 'selected' : ''}>Circle</option>
          <option value="rect" ${node.shape === 'rect' ? 'selected' : ''}>Rectangle</option>
          <option value="poly" ${node.shape === 'poly' ? 'selected' : ''}>Polygon</option>
        </select>
      </div>
      ${node.shape === 'poly' ? `
      <div class="control-group">
        <label>Sides</label>
        <input type="number" id="inp-sides" value="${node.polySides || 3}" min="3" max="12">
      </div>` : ''}
      <div class="control-group">
        <label>Icon Path</label>
        <input type="text" id="inp-icon" value="${escapeHtml(node.iconPath || "")}">
      </div>
      <div class="control-group">
        <label>Connection Style (edges TO this node)</label>
        <select id="inp-link-style">
          <option value="curve" ${node.linkStyle === "curve" ? "selected" : ""}>Curve</option>
          <option value="straight" ${node.linkStyle === "straight" ? "selected" : ""}>Straight</option>
          <option value="elbow" ${node.linkStyle === "elbow" ? "selected" : ""}>Elbow (bent)</option>
        </select>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">Attributes (Extras)</div>
      <div id="attributes-list">
        ${extrasHtml}
      </div>
      <div class="control-row" style="margin-top:8px; border-top:1px dashed var(--border-color); padding-top:8px;">
        <input type="text" id="new-attr-key" placeholder="New Key" style="flex:1; min-width:0;">
        <input type="text" id="new-attr-val" placeholder="Value" style="flex:1; min-width:0;">
        <button class="btn-icon-only" id="btn-add-attr" title="Add" style="color:var(--accent-color)">+</button>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">Relations</div>
      <div class="control-group">
        <label>Parents: ${escapeHtml(parentSummary)}</label>
        <button class="btn-action" onclick="openParentModal('${escapeHtml(node.id)}')">Edit Parents</button>
      </div>
    </div>

    <div class="panel-section">
      <button class="btn-action btn-danger" onclick="deleteNode('${escapeHtml(node.id)}')">Delete Node</button>
    </div>
  `;
  dom.inspectorContent.innerHTML = html;

  // === Bindings for Single Select ===

  // 1. General Inputs
  document.getElementById("inp-label").addEventListener("input", (e) => {
    node.label = e.target.value;
    render();
  });
  document.getElementById("inp-label").addEventListener("change", pushHistory);

  document.getElementById("inp-desc").addEventListener("input", (e) => {
    node.description = e.target.value;
  });
  document.getElementById("inp-desc").addEventListener("change", pushHistory);

  document.getElementById("inp-id").addEventListener("change", (e) => {
    const newId = e.target.value.trim();
    if (!newId || newId === node.id) return;
    if (state.nodes.find(n => n.id === newId)) {
      alert("ID already exists!");
      e.target.value = node.id;
      return;
    }
    state.edges.forEach(edge => {
      if (edge.from === node.id) edge.from = newId;
      if (edge.to === node.id) edge.to = newId;
    });
    if (state.selection === node.id) state.selection = newId;
    if (state.selectionSet.has(node.id)) {
      state.selectionSet.delete(node.id);
      state.selectionSet.add(newId);
    }
    node.id = newId;
    pushHistory();
    render();
    renderInspector();
  });

  document.getElementById("inp-x").addEventListener("change", (e) => {
    node.x = parseFloat(e.target.value) || 0;
    render();
    pushHistory();
  });
  document.getElementById("inp-y").addEventListener("change", (e) => {
    node.y = parseFloat(e.target.value) || 0;
    render();
    pushHistory();
  });

  document.getElementById("inp-active").addEventListener("change", (e) => {
    setNodeActive(node.id, e.target.checked);
    pushHistory();
    render();
    renderInspector();
  });

  document.getElementById("inp-role").addEventListener("change", (e) => {
    node.role = e.target.value;
    normalizeActivation();
    pushHistory();
    render();
    renderInspector();
  });

  document.getElementById("inp-shape").addEventListener("change", (e) => {
    node.shape = e.target.value;
    pushHistory();
    render();
    renderInspector();
  });

  if (document.getElementById("inp-sides")) {
      document.getElementById("inp-sides").addEventListener("change", (e) => {
        node.polySides = parseInt(e.target.value);
        pushHistory();
        render();
      });
  }

  document.getElementById("inp-icon").addEventListener("change", (e) => {
    node.iconPath = e.target.value;
    pushHistory();
    render();
  });

  document.getElementById("inp-link-style").addEventListener("change", (e) => {
    node.linkStyle = e.target.value;
    state.edges.filter(ed => ed.to === node.id).forEach(ed => ed.style = node.linkStyle);
    pushHistory();
    render();
  });

  // 2. Attribute Editor Bindings

  // Add Attribute
  document.getElementById("btn-add-attr").addEventListener("click", () => {
    const kInput = document.getElementById("new-attr-key");
    const vInput = document.getElementById("new-attr-val");
    const k = kInput.value.trim();
    const v = vInput.value.trim();
    if (!k) return;

    if (node.extras[k] !== undefined) {
      alert("Key already exists.");
      return;
    }
    node.extras[k] = v;
    pushHistory();
    renderInspector();
  });

  // Rename Key
  dom.inspectorContent.querySelectorAll(".attr-key").forEach(el => {
    el.addEventListener("change", (e) => {
      const oldK = e.target.dataset.prevKey;
      const newK = e.target.value.trim();
      if (!newK || newK === oldK) return;

      if (node.extras[newK] !== undefined) {
        alert("Key already exists.");
        e.target.value = oldK;
        return;
      }
      const val = node.extras[oldK];
      delete node.extras[oldK];
      node.extras[newK] = val;
      pushHistory();
      renderInspector();
    });
  });

  // Update Value
  dom.inspectorContent.querySelectorAll(".attr-val").forEach(el => {
    el.addEventListener("change", (e) => {
      const k = e.target.dataset.key;
      node.extras[k] = e.target.value;
      pushHistory();
    });
  });

  // Delete Attribute
  dom.inspectorContent.querySelectorAll(".btn-del-attr").forEach(el => {
    el.addEventListener("click", (e) => {
      const k = e.target.dataset.key;
      delete node.extras[k];
      pushHistory();
      renderInspector();
    });
  });
}
