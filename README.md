# Sacred Geometry Skill Tree Editor / โปรสกิลทรีเอดิเตอร์

A browser-based skill tree editor with a grid-based canvas, JSON import/export, and a simple game-test mode. This repository is intended both as an editor and as a reference for structuring skill tree data in JSON so it can be reused in games, tools, and documentation.  

โปรแกรมแก้ไขสกิลทรีบนเบราว์เซอร์ ที่ใช้ผังกริดสำหรับจัดวางจุดสกิล รองรับการนำเข้า/ส่งออกเป็น JSON และมีโหมดทดสอบเหมือนเล่นเกม เหมาะสำหรับใช้ทั้งเป็นตัวแก้ไขสกิล และเป็นตัวอย่างโครงสร้างข้อมูลสกิลทรีในรูปแบบ JSON เพื่อเอาไปใช้ต่อในเกมหรือระบบอื่น

---

## 1. English

### 1.1 Overview

The Skill Tree Editor runs entirely in the browser. It uses an SVG canvas with a grid background and a right-hand inspector panel for editing node properties. You can import and export the entire tree as JSON, and there is a play/test mode that lets you spend skill points on the current tree layout.

Key UI areas:

- Canvas with grid and nodes
- Bottom toolbar with tools (Select, Pan, Shape Generator, Undo/Redo, Import/Export, Play, Fit View)
- Inspector panel on the right with node properties and extra fields

### 1.2 Features

- Grid-based SVG canvas for arranging skill nodes
- Right-click to create nodes
- Alt + Drag to create links between nodes
- Alt + Click to toggle a node’s active/unlocked state
- Shape generator to add multiple nodes in geometric patterns
- JSON import/export for the full skill tree
- Game mode to test spending skill points on the current tree

### 1.3 Getting Started

1. Clone or download this repository.
2. Open `index.html` directly in a modern browser (Chrome, Firefox, Edge).
3. Make sure `style.css` and all JavaScript files are in the same directory as `index.html`.
4. Start editing:
   - Right-click on the canvas to add nodes.
   - Use the inspector panel to edit properties.
   - Use the toolbar buttons for undo/redo, import/export JSON, and game mode.

If you prefer a local web server:

```bash
# Example using Node.js http-server
npm install -g http-server
http-server .
# Then open http://localhost:8080 in your browser
```

### 1.4 Basic Usage

#### Canvas and Controls

- Right-click on empty space to add a new node.
- Drag nodes to reposition them on the grid.
- Alt + Drag from one node to another to create a connection (edge).
- Alt + Click on a node to toggle its active/unlocked state.
- Use the “Hand” tool to pan the view.
- Use the “Fit View” button to re-center and zoom to fit all nodes.

#### Import / Export JSON

- Import: Click the **Import JSON** button and select a `.json` file exported from this editor (or a compatible schema).
- Export: Click the **Export JSON** button to download the current tree as a `.json` file.

Keep exported JSON under version control (Git) so you can track changes to your skill tree over time.

#### Game Mode

- Click the **Play** button to switch into game mode.
- The editor becomes a read-only “game” view where you can:
  - See available skill points
  - Click nodes to unlock/activate them (following the connection rules)
- Use **Exit Game** to return to the editor.

### 1.5 JSON Data Format

The editor’s internal JSON format may evolve, but this section describes a recommended, stable format that you can target for external tools and documentation.

Recommended JSON structure:

```json
{
  "version": "1.0.0",
  "meta": {
    "name": "Sacred Geometry Skill Tree",
    "description": "Example tree for the Skill Tree Editor",
    "createdAt": "2025-11-28T00:00:00Z",
    "author": "Your Name"
  },
  "statsSchema": ["str", "vit", "int", "dex", "luk"],
  "nodes": [
    {
      "id": "n-001",
      "label": "Power Strike",
      "type": "active",
      "role": "core",
      "position": { "x": 0, "y": 0 },
      "radius": 24,
      "parents": [],
      "children": ["n-002"],
      "cost": {
        "points": 1,
        "requiredNodes": []
      },
      "stats": {
        "str": 10,
        "vit": 0,
        "int": 0,
        "dex": 5,
        "luk": 0
      },
      "tags": ["warrior", "melee"],
      "extra": {
        "summary": "Increase physical damage.",
        "description": "Increase physical damage by 15% for melee attacks.",
        "icon": "icons/power-strike.png"
      }
    }
  ],
  "links": [
    {
      "id": "e-001",
      "from": "n-001",
      "to": "n-002",
      "kind": "normal"
    }
  ]
}
```

Key ideas:

- `nodes` holds every skill node (active/passive).
- `links` describes the edges between nodes.
- `stats` holds the core attributes (`str`, `vit`, `int`, `dex`, `luk`) but you can add more fields under `extra`.
- `type` can be `"active"` or `"passive"` (or any categories you define).
- `role` can be `"root"`, `"core"`, `"keystone"`, etc. to mark special nodes.

You can treat this structure as the “documentation format” even if the editor uses a slightly different internal representation.

### 1.6 JSON Formats for Documentation and HTML

You may want different views of the same tree for different purposes:

1. **Editor Format**  
   Includes positions, links, and all raw properties, suitable for re-importing into the editor.

2. **Documentation Format**  
   Focuses on readable descriptions, grouped by path or class. Example:

   ```json
   {
     "treeName": "Universal Skill Tree",
     "paths": [
       {
         "id": "path-strength",
         "name": "Path of Strength",
         "summary": "Melee and physical damage oriented skills.",
         "nodes": ["n-001", "n-002", "n-010"]
       }
     ],
     "nodeDetails": {
       "n-001": {
         "name": "Power Strike",
         "type": "active",
         "tier": 1,
         "summary": "Increase physical damage.",
         "description": "Increase physical damage by 15% for melee attacks.",
         "requirements": ["None"],
         "effects": ["+10 STR", "+5 DEX"],
         "tags": ["melee", "starter"]
       }
     }
   }
   ```

   This is easier to render into PDF, wiki pages, or static docs.

3. **HTML-oriented Format**  
   You can pre-generate HTML snippets to embed directly into documentation pages:

   ```json
   {
     "sections": [
       {
         "id": "sec-strength",
         "title": "Path of Strength",
         "html": "<h2>Path of Strength</h2><p>Melee-focused skills...</p><ul><li><b>Power Strike</b> – Increase physical damage by 15%.</li></ul>"
       }
     ]
   }
   ```

   Then your documentation renderer only needs to insert these snippets into the page.

### 1.7 Using the JSON in Other Projects

Some ideas for reusing the exported JSON:

- **Game engine integration**:  
  Load the JSON at runtime and build your skill tree logic (unlock rules, cost calculations, character builds).

- **Build planners**:  
  Create a separate web app that lets players plan a build using the same JSON tree.

- **Static documentation**:  
  Generate Markdown, HTML, or PDF from the documentation-oriented format so you can publish design docs or player guides.

- **Testing / balancing tools**:  
  Write scripts that read the JSON, calculate total possible stats, or highlight overpowered paths.

---

## 2. ภาษาไทย

### 2.1 ภาพรวม

โปรแกรม Skill Tree Editor นี้ทำงานบนเว็บเบราว์เซอร์ทั้งหมด ใช้ SVG canvas พร้อมพื้นหลังเป็นกริด และมีแถบ Properties ทางด้านขวาสำหรับแก้ไขค่าของแต่ละ node สามารถนำเข้า/ส่งออกสกิลทรีทั้งหมดเป็น JSON และมีโหมดทดลองเล่น (Game Mode) สำหรับทดสอบการอัปสกิลจากต้นไม้ชุดเดียวกัน

ส่วนประกอบหลักของหน้าจอ:

- พื้นที่ Canvas พร้อมกริดและ node ต่าง ๆ
- แถบเครื่องมือด้านล่าง (Select, Pan, Shape Generator, Undo/Redo, Import/Export, Play, Fit View)
- แผง Inspector ด้านขวา สำหรับแก้ไขข้อมูล node

### 2.2 ฟีเจอร์

- จัดวางจุดสกิลบนกริดด้วย SVG canvas
- คลิกขวาเพื่อสร้าง node ใหม่
- กด Alt ค้างแล้วลากจาก node หนึ่งไปยังอีก node เพื่อสร้างเส้นเชื่อม
- กด Alt + คลิก ที่ node เพื่อสลับสถานะ Active/Unlocked
- มีตัวช่วยสร้างรูปทรง (Shape Generator) เพื่อวาง node เป็นแพทเทิร์นสวย ๆ
- นำเข้า/ส่งออกสกิลทรีทั้งหมดเป็นไฟล์ JSON
- มีโหมดเล่นทดลอง (Game Mode) สำหรับกดอัพสกิลจากต้นไม้นั้น

### 2.3 การเริ่มต้นใช้งาน

1. ดาวน์โหลดหรือ clone โปรเจกต์นี้จาก GitHub
2. เปิดไฟล์ `index.html` ด้วยเบราว์เซอร์สมัยใหม่ (Chrome, Firefox, Edge)
3. ตรวจสอบให้แน่ใจว่าไฟล์ `style.css` และไฟล์ JavaScript ทั้งหมดอยู่ในโฟลเดอร์เดียวกับ `index.html`
4. เริ่มใช้งาน:
   - คลิกขวาบน canvas เพื่อสร้าง node
   - ใช้แผง Inspector ด้านขวาเพื่อแก้ไขข้อมูล
   - ใช้ปุ่มบน toolbar สำหรับ undo/redo, import/export JSON และเข้าโหมด Game

หากต้องการรันผ่าน web server ในเครื่อง:

```bash
# ตัวอย่างการใช้ Node.js http-server
npm install -g http-server
http-server .
# แล้วเปิด http://localhost:8080 ในเบราว์เซอร์
```

### 2.4 วิธีใช้พื้นฐาน

#### การควบคุมบน Canvas

- คลิกขวาบนพื้นที่ว่างเพื่อสร้าง node ใหม่
- ลาก node เพื่อย้ายตำแหน่งให้ตรงกับกริด
- กด Alt ค้างแล้วลากจาก node หนึ่งไปอีก node เพื่อสร้างเส้นเชื่อม
- กด Alt + คลิกที่ node เพื่อสลับสถานะ Active/Unlocked
- ใช้เครื่องมือ “Hand” เพื่อเลื่อนมุมมอง
- ใช้ปุ่ม “Fit View” เพื่อจัดตำแหน่งและซูมให้เห็นทุก node

#### การนำเข้า / ส่งออก JSON

- นำเข้า: คลิกปุ่ม **Import JSON** แล้วเลือกไฟล์ `.json` ที่ส่งออกมาจากตัว editor นี้ (หรือรูปแบบที่เข้ากันได้)
- ส่งออก: คลิกปุ่ม **Export JSON** เพื่อดาวน์โหลดสกิลทรีปัจจุบันเป็นไฟล์ `.json`

แนะนำให้เก็บไฟล์ JSON ไว้ใน Git เพื่อดูประวัติการเปลี่ยนแปลงของสกิลทรีได้สะดวก

#### โหมด Game (ทดสอบการอัปสกิล)

- คลิกปุ่ม **Play** เพื่อเข้าสู่โหมด Game
- ระบบจะแสดงมุมมองที่เน้นการเล่น/ทดสอบ โดยมี:
  - จำนวนแต้มสกิลที่ใช้ได้ (Available Points)
  - การคลิก node เพื่ออัปสกิล (ตามกติกาการเชื่อมต่อ)
- คลิก **Exit Game** เพื่อกลับสู่หน้าแก้ไข

### 2.5 รูปแบบข้อมูล JSON

แม้ว่าโครงสร้าง JSON ภายใน editor อาจเปลี่ยนในอนาคต แต่ส่วนนี้คือ “รูปแบบแนะนำ” ที่เหมาะสำหรับใช้เป็นมาตรฐานกลางในการเชื่อมต่อกับระบบอื่นหรือใช้เขียนเอกสาร

โครงสร้างที่แนะนำ:

```json
{
  "version": "1.0.0",
  "meta": {
    "name": "Sacred Geometry Skill Tree",
    "description": "ตัวอย่างสกิลทรีสำหรับ Skill Tree Editor",
    "createdAt": "2025-11-28T00:00:00Z",
    "author": "Your Name"
  },
  "statsSchema": ["str", "vit", "int", "dex", "luk"],
  "nodes": [
    {
      "id": "n-001",
      "label": "Power Strike",
      "type": "active",
      "role": "core",
      "position": { "x": 0, "y": 0 },
      "radius": 24,
      "parents": [],
      "children": ["n-002"],
      "cost": {
        "points": 1,
        "requiredNodes": []
      },
      "stats": {
        "str": 10,
        "vit": 0,
        "int": 0,
        "dex": 5,
        "luk": 0
      },
      "tags": ["warrior", "melee"],
      "extra": {
        "summary": "เพิ่มความเสียหายกายภาพ",
        "description": "เพิ่มความเสียหายกายภาพ 15% สำหรับการโจมตีระยะใกล้",
        "icon": "icons/power-strike.png"
      }
    }
  ],
  "links": [
    {
      "id": "e-001",
      "from": "n-001",
      "to": "n-002",
      "kind": "normal"
    }
  ]
}
```

แนวคิดหลัก:

- `nodes` เก็บจุดสกิลทั้งหมด (ทั้ง active/passive)
- `links` เก็บเส้นเชื่อมระหว่าง node แต่ละตัว
- `stats` เก็บค่าสเตตัสหลัก (`str`, `vit`, `int`, `dex`, `luk`) และสามารถเพิ่ม field เพิ่มเติมใน `extra` ได้
- `type` ใช้บอกประเภทของสกิล เช่น `"active"` หรือ `"passive"`
- `role` ใช้ระบุบทบาท เช่น `"root"`, `"core"`, `"keystone"` เพื่อกำหนด node สำคัญ

โครงสร้างนี้สามารถใช้เป็น “รูปแบบสำหรับเอกสาร” ได้ แม้ภายใน editor จริงจะใช้โครงสร้างที่ไม่เหมือนกันทั้งหมด

### 2.6 รูปแบบ JSON สำหรับเอกสารและเอกสาร HTML

อาจต้องการมองข้อมูลสกิลทรีคนละแบบ ขึ้นกับว่าคุณจะเอาไปใช้ที่ไหน:

1. **รูปแบบสำหรับ Editor**  
   มีข้อมูลตำแหน่ง, เส้นเชื่อม และ property ทุกอย่างแบบละเอียด เหมาะสำหรับนำกลับเข้า editor

2. **รูปแบบสำหรับ Document อธิบายสกิล**  
   เน้นให้อ่านเข้าใจง่าย แยกตามสาย/คลาส ตัวอย่าง:

   ```json
   {
     "treeName": "Universal Skill Tree",
     "paths": [
       {
         "id": "path-strength",
         "name": "สายพละกำลัง",
         "summary": "เน้นสกิลโจมตีกายภาพและการต่อสู้ระยะใกล้",
         "nodes": ["n-001", "n-002", "n-010"]
       }
     ],
     "nodeDetails": {
       "n-001": {
         "name": "Power Strike",
         "type": "active",
         "tier": 1,
         "summary": "เพิ่มความเสียหายกายภาพ",
         "description": "เพิ่มความเสียหายกายภาพ 15% สำหรับการโจมตีระยะใกล้",
         "requirements": ["ไม่ต้องการเงื่อนไข"],
         "effects": ["+10 STR", "+5 DEX"],
         "tags": ["melee", "starter"]
       }
     }
   }
   ```

3. **รูปแบบสำหรับ Document HTML**  
   เตรียม HTML snippet ไว้ล่วงหน้าเพื่อฝังในหน้าเว็บ/วิกิ:

   ```json
   {
     "sections": [
       {
         "id": "sec-strength",
         "title": "สายพละกำลัง",
         "html": "<h2>สายพละกำลัง</h2><p>สายสกิลสำหรับผู้เล่นที่เน้นการโจมตีกายภาพระยะใกล้...</p><ul><li><b>Power Strike</b> – เพิ่มความเสียหายกายภาพ 15%.</li></ul>"
       }
     ]
   }
   ```

ตัว renderer ของเว็บเพจจะทำแค่เอา HTML เหล่านี้ไปวางในตำแหน่งที่ต้องการเท่านั้น

### 2.7 การนำ JSON ไปใช้ต่อในโปรเจกต์อื่น

ตัวอย่างการต่อยอดไฟล์ JSON:

- **เชื่อมกับเกมเอนจิน**  
  โหลด JSON ตอนเริ่มเกม แล้วสร้างระบบสกิลทรี (กติกาการปลดล็อก, การคิดค่าใช้จ่าย, การคำนวณ build ตัวละคร) จากข้อมูลนั้น

- **ตัวช่วยวางสายสกิล (Build Planner)**  
  ทำเว็บอีกตัวหนึ่งให้ผู้เล่นลองจัด build ด้วยสกิลทรีชุดเดียวกัน

- **เอกสารประกอบ / คู่มือผู้เล่น**  
  แปลง JSON เป็น Markdown, HTML หรือ PDF เพื่อลงรายละเอียดสกิลในวิกิหรือคู่มือเกม

- **เครื่องมือปรับบาลานซ์**  
  เขียนสคริปต์อ่าน JSON แล้วคำนวณค่ารวมของสเตตัส หรือช่วยตรวจหาสายที่อาจจะแรงเกินไป

---

## 3. License

Specify your license here (for example MIT, Apache-2.0, or another license you prefer).  
ระบุประเภท License ที่คุณต้องการใช้กับโปรเจกต์นี้ (เช่น MIT, Apache-2.0 เป็นต้น)
