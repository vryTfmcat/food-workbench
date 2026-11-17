"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FoodPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/model.ts
var LANES = { recent: "\u6700\u8FD1\u60F3\u5403", home: "\u5728\u5BB6\u7EC4\u5408", out: "\u5916\u51FA\u5019\u9009", done: "\u5DF2\u5904\u7406", later: "\u5148\u653E\u4E00\u653E" };
var KINDS = { voucher: "\u56E2\u8D2D\u5238", stock: "\u5BB6\u4E2D\u98DF\u54C1", ingredient: "\u98DF\u6750", dish: "\u83DC\uFF0F\u9910\u98DF", place: "\u5730\u70B9" };
var SUPPLIES = { have: "\u5BB6\u91CC\u6709\uFF0C\u72B6\u6001\u5F85\u6838", buyable: "\u53EF\u8D2D\u4E70", unknown: "\u662F\u5426\u6709\u5F85\u786E\u8BA4", entitled: "\u5DF2\u6301\u6709\u6743\u76CA" };
var START = "<!-- food-workbench:start -->";
var END = "<!-- food-workbench:end -->";
function emptyBoard() {
  return { schemaVersion: 1, revision: 0, cards: [], stops: [] };
}
function uid() {
  return globalThis.crypto.randomUUID();
}
var string = (v) => typeof v === "string";
function validDate(value) {
  if (value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = /* @__PURE__ */ new Date(value + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function validate(value) {
  const b = value;
  if (!b || b.schemaVersion !== 1 || !Number.isSafeInteger(b.revision) || b.revision < 0 || !Array.isArray(b.cards) || !Array.isArray(b.stops)) throw Error("\u5DE5\u4F5C\u7A7A\u95F4\u683C\u5F0F\u6216\u7248\u672C\u4E0D\u652F\u6301\uFF0C\u539F\u6587\u4EF6\u672A\u6539\u52A8");
  const ids = /* @__PURE__ */ new Set();
  for (const c of b.cards) {
    if (!c || ![c.id, c.sourceKey, c.sourcePath, c.title, c.group, c.date, c.note, c.amount, c.placeId].every(string) || !Object.hasOwn(LANES, c.lane) || !Object.hasOwn(KINDS, c.kind) || !Object.hasOwn(SUPPLIES, c.supply) || !c.id || !c.title.trim() || !validDate(c.date) || ids.has(c.id)) throw Error("\u5DE5\u4F5C\u5361\u7247\u683C\u5F0F\u6709\u8BEF\uFF0C\u539F\u6587\u4EF6\u672A\u6539\u52A8");
    ids.add(c.id);
  }
  const stops = /* @__PURE__ */ new Set();
  for (const p of b.stops) {
    if (!p || ![p.id, p.path, p.title].every(string) || !p.id || stops.has(p.id) || (p.longitude !== void 0 || p.latitude !== void 0) && !coordinates(p)) throw Error("\u8DEF\u7EBF\u683C\u5F0F\u6709\u8BEF\uFF0C\u539F\u6587\u4EF6\u672A\u6539\u52A8");
    stops.add(p.id);
  }
  return structuredClone(b);
}
function coordinates(p) {
  return typeof p.longitude === "number" && Number.isFinite(p.longitude) && p.longitude >= -180 && p.longitude <= 180 && typeof p.latitude === "number" && Number.isFinite(p.latitude) && p.latitude >= -90 && p.latitude <= 90;
}
function readBoard(text) {
  if (text.split(START).length !== 2 || text.split(END).length !== 2 || text.indexOf(END) < text.indexOf(START)) throw Error("\u5DE5\u4F5C\u7A7A\u95F4\u6807\u8BB0\u7F3A\u5931\u6216\u91CD\u590D\uFF0C\u672A\u8986\u76D6\u539F\u5185\u5BB9");
  const block = text.slice(text.indexOf(START) + START.length, text.indexOf(END));
  const match = block.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!match) throw Error("\u627E\u4E0D\u5230\u5DE5\u4F5C\u7A7A\u95F4\u6570\u636E\uFF0C\u672A\u8986\u76D6\u539F\u5185\u5BB9");
  return validate(JSON.parse(match[1]));
}
function cell(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("|", "\\|").replaceAll("\n", " ");
}
function renderBlock(board) {
  validate(board);
  const summary = board.cards.map((c) => `| ${cell(c.title)} | ${LANES[c.lane]} | ${cell(c.group)} | ${c.date || "\u672A\u5B9A"} | ${SUPPLIES[c.supply]} |`).join("\n");
  return `${START}

## \u5DE5\u4F5C\u5361\u7247

| \u5185\u5BB9 | \u653E\u7F6E\u533A | \u7EC4\u5408\uFF0F\u884C\u7A0B | \u610F\u5411\u65E5\u671F | \u83B7\u53D6\u65B9\u5F0F |
| --- | --- | --- | --- | --- |
${summary}

## \u8DEF\u7EBF\u987A\u5E8F

${board.stops.map((p, i) => `${i + 1}. ${cell(p.title)}`).join("\n") || "\u5C1A\u672A\u9009\u62E9\u505C\u9760\u70B9\u3002"}

## \u5DE5\u4F5C\u7A7A\u95F4\u6570\u636E

\u4E0B\u65B9\u7531\u98DF\u7269\u5DE5\u4F5C\u53F0\u7EF4\u62A4\uFF1B\u6B63\u6587\u5176\u4ED6\u4F4D\u7F6E\u53EF\u4EE5\u81EA\u7531\u5199\u7B14\u8BB0\u3002

\`\`\`json
${JSON.stringify(board, null, 2).replaceAll("<", "\\u003c")}
\`\`\`

${END}`;
}
function initialText(board) {
  return `---
title: \u98DF\u7269\u5DE5\u4F5C\u7A7A\u95F4
type: food-workbench-state
schemaVersion: 1
---

# \u98DF\u7269\u5DE5\u4F5C\u7A7A\u95F4

\u8FD9\u662F\u6700\u8FD1\u60F3\u5403\u3001\u5728\u5BB6\u7EC4\u5408\u548C\u5916\u51FA\u5019\u9009\u7684\u5DE5\u4F5C\u7A7A\u95F4\u3002\u52A0\u5165\u6216\u79FB\u52A8\u5361\u7247\u4E0D\u7B49\u4E8E\u9884\u7EA6\u3001\u6838\u9500\u3001\u5403\u5B8C\u6216\u6263\u5E93\u5B58\u3002\u610F\u5411\u65E5\u671F\u7531\u4F60\u4E3B\u52A8\u586B\u5199\uFF1B\u4E0D\u5199\u65E5\u671F\u4E5F\u80FD\u89C4\u5212\u3002

${renderBlock(board)}
`;
}
function replaceBoard(text, expected, next) {
  const actual = readBoard(text);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error("\u5176\u4ED6\u8BBE\u5907\u6216\u7B14\u8BB0\u5DF2\u4FEE\u6539\u5DE5\u4F5C\u7A7A\u95F4\uFF1A\u672C\u6B21\u672A\u8986\u76D6\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5");
  const revised = validate({ ...next, revision: actual.revision + 1 });
  return text.slice(0, text.indexOf(START)) + renderBlock(revised) + text.slice(text.indexOf(END) + END.length);
}
function newCard(source) {
  return { id: uid(), sourceKey: source.key, sourcePath: source.path, title: source.title, kind: source.kind, supply: source.supply, lane: "recent", group: "", date: "", note: source.note, amount: "", placeId: source.places.length === 1 ? source.places[0].id : "" };
}
function addSource(board, source) {
  if (board.cards.some((c) => c.sourceKey === source.key && c.lane !== "done" && c.lane !== "later")) return board;
  return { ...board, cards: [...board.cards, newCard(source)] };
}
function moveCard(board, id, lane) {
  return { ...board, cards: board.cards.map((c) => c.id === id ? { ...c, lane } : c) };
}
function removeCard(board, id) {
  return { ...board, cards: board.cards.filter((c) => c.id !== id) };
}
function shopping(board) {
  return board.cards.filter((c) => (c.lane === "home" || c.lane === "out") && c.supply === "buyable" && c.kind !== "voucher" && c.kind !== "place");
}
function distance(a, b) {
  if (!coordinates(a) || !coordinates(b)) return null;
  const rad = Math.PI / 180, lat1 = a.latitude * rad, lat2 = b.latitude * rad, deltaLat = lat2 - lat1, deltaLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
function navigation(to, from, mode = "walk") {
  if (!coordinates(to)) throw Error("\u5730\u70B9\u7F3A\u5C11\u6709\u6548\u5750\u6807");
  const params = new URLSearchParams({ to: `${to.longitude},${to.latitude},${to.title}`, mode, src: "food-workbench", coordinate: "gaode", callnative: "0" });
  if (from && coordinates(from)) params.set("from", `${from.longitude},${from.latitude},${from.title}`);
  return "https://uri.amap.com/navigation?" + params.toString();
}
function dayString(date = /* @__PURE__ */ new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// src/sources.ts
var str = (v) => typeof v === "string" || typeof v === "number" ? String(v) : "";
var arr = (v) => Array.isArray(v) ? v : [];
function catalogue(records) {
  const places = records.filter((r) => r.fm.personalMapPlace === true).map((r) => {
    const p = { id: str(r.fm.placeId), path: r.path, title: str(r.fm.title) || r.name };
    if (r.fm.coordinateSystem === "GCJ-02") {
      p.longitude = typeof r.fm.longitude === "number" ? r.fm.longitude : void 0;
      p.latitude = typeof r.fm.latitude === "number" ? r.fm.latitude : void 0;
    }
    if (!coordinates(p)) {
      delete p.longitude;
      delete p.latitude;
    }
    return p;
  }).filter((p) => p.id);
  const byId = new Map(places.map((p) => [p.id, p]));
  const selected = new Set(records.filter((r) => r.fm.recordType === "coupon-calendar-schedule" && r.fm.eventStatus === "planned").map((r) => str(r.fm.subjectId)));
  const sources = [];
  for (const r of records) {
    const f = r.fm;
    let kind;
    let id = "";
    if (f.couponSchedulerItem === true && f.entityType === "benefit") {
      kind = "voucher";
      id = str(f.benefitId);
    } else if (f.couponSchedulerItem === true && f.calendarType === "food") {
      kind = "stock";
      id = str(f.itemId);
    } else if (f.entityType === "item-batch" && /^食品\/|^食物\//.test(str(f.category))) {
      kind = "stock";
      id = str(f.entityId);
    } else if (r.path.startsWith("30_\u9879\u76EE/\u505A\u996D\u4E0E\u98DF\u7269\u5B9E\u9A8C/\u83DC\u5F0F/")) {
      kind = "dish";
    }
    if (!kind) continue;
    const placeIds = [...arr(f.usablePlaceIds), ...arr(f.placeIds)].map(str);
    const ended = ["used", "expired", "refunded", "void", "archived", "consumed", "disposed"].includes(str(f.benefitStatus || f.itemStatus || f.status));
    sources.push({ key: id || r.path, path: r.path, title: str(f.title) || r.name, kind, supply: kind === "stock" ? ["have", "buyable", "unknown"].includes(str(f.foodSupply)) ? str(f.foodSupply) : "unknown" : kind === "voucher" ? "entitled" : "buyable", note: kind === "stock" ? str(f.foodNote) || `\u5386\u53F2\uFF0F\u4E3B\u6863\u6765\u6E90\uFF1B\u73B0\u573A\u4F59\u91CF\u4E0E\u72B6\u6001\u5F85\u6838${f.quantity !== void 0 && f.quantity !== null ? "\uFF1B\u8BB0\u5F55\u6570\u91CF " + str(f.quantity) + " " + str(f.unit) : ""}` : kind === "voucher" ? "\u5DF2\u6301\u6709\u6743\u76CA\uFF1B\u662F\u5426\u6838\u9500\u4EE5\u5E73\u53F0\u4E0E\u539F\u4E3B\u6863\u4E3A\u51C6" : "\u505A\u996D\u5019\u9009\uFF1B\u6750\u6599\u53EF\u4EE5\u8D2D\u4E70", expiry: str(f.validTo), places: placeIds.map((id2) => byId.get(id2)).filter((p) => !!p), picked: selected.has(id), ended });
  }
  return { sources, places };
}
var buyableFoods = ["\u9E21\u86CB", "\u9752\u83DC", "\u571F\u8C46", "\u80E1\u841D\u535C", "\u8C46\u8150", "\u756A\u8304", "\u8304\u5B50", "\u7C73\uFF0F\u9762\u7B49\u4E3B\u98DF"].map((title) => ({ key: "buyable:" + title, path: "", title, kind: "ingredient", supply: "buyable", note: "\u6309\u9700\u8D2D\u4E70\u7684\u6750\u6599\u5019\u9009\uFF1B\u4E0D\u4EE3\u8868\u5DF2\u8D2D\u4E70\u3001\u9644\u8FD1\u6709\u8D27\u6216\u5FC5\u987B\u4E70", expiry: "", places: [] }));

// src/main.ts
var VIEW = "food-workbench-view";
var STATE = "30_\u9879\u76EE/\u4E2A\u4EBA\u751F\u6D3B\u8BB0\u5F55\u7CFB\u7EDF/\u98DF\u7269\u5DE5\u4F5C\u7A7A\u95F4.md";
var TEXT = { recent: "\u5148\u628A\u60F3\u5403\u7684\u6311\u51FA\u6765\uFF0C\u4E0D\u5FC5\u5B9A\u65F6\u95F4\u3002", home: "\u7528\u76F8\u540C\u7684\u7EC4\u5408\u540D\uFF0C\u628A\u98DF\u6750\u4E0E\u9910\u98DF\u653E\u5728\u4E00\u8D77\u3002", out: "\u628A\u60F3\u53BB\u7684\u9910\u9986\u3001\u60F3\u7528\u7684\u5238\u548C\u987A\u8DEF\u91C7\u8D2D\u653E\u5728\u4E00\u8D77\u3002", done: "\u53EA\u7ED3\u675F\u5DE5\u4F5C\u5361\u7247\uFF0C\u539F\u5238\u548C\u5E93\u5B58\u4E0D\u4F1A\u56E0\u6B64\u6539\u53D8\u3002", later: "\u6682\u65F6\u4E0D\u60F3\u5403\u7684\u653E\u8FD9\u91CC\uFF0C\u4E4B\u540E\u968F\u65F6\u62FF\u56DE\u6765\u3002" };
var FoodPlugin = class extends import_obsidian.Plugin {
  queue = Promise.resolve();
  async onload() {
    this.registerView(VIEW, (leaf) => new FoodView(leaf, this));
    this.addRibbonIcon("utensils", "\u6253\u5F00\u98DF\u7269\u5DE5\u4F5C\u53F0", () => void this.open());
    this.addCommand({ id: "open-workbench", name: "\u6253\u5F00\u98DF\u7269\u5DE5\u4F5C\u53F0", callback: () => void this.open() });
    this.registerEvent(this.app.metadataCache.on("changed", () => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) {
        const view = leaf.view;
        if (view instanceof FoodView) view.refreshSources();
      }
    }));
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW);
  }
  async open() {
    const leaf = this.app.workspace.getLeavesOfType(VIEW)[0] ?? this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW, active: true });
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
  }
  async loadBoard() {
    const f = this.app.vault.getAbstractFileByPath(STATE);
    if (!f) return emptyBoard();
    if (!(f instanceof import_obsidian.TFile)) throw Error("\u5DE5\u4F5C\u7A7A\u95F4\u8DEF\u5F84\u4E0D\u662F\u6587\u4EF6");
    return readBoard(await this.app.vault.read(f));
  }
  async write(expected, next) {
    const job = this.queue.then(async () => {
      const f = this.app.vault.getAbstractFileByPath(STATE);
      let saved = "";
      if (f instanceof import_obsidian.TFile) {
        saved = await this.app.vault.process(f, (text) => replaceBoard(text, expected, next));
      } else {
        if (f) throw Error("\u5DE5\u4F5C\u7A7A\u95F4\u8DEF\u5F84\u88AB\u6587\u4EF6\u5939\u5360\u7528");
        if (expected.revision !== 0 || expected.cards.length || expected.stops.length) throw Error("\u5DE5\u4F5C\u7A7A\u95F4\u5DF2\u88AB\u79FB\u8D70\uFF0C\u8BF7\u5237\u65B0");
        saved = initialText({ ...next, revision: 1 });
        await this.app.vault.create(STATE, saved);
      }
      return readBoard(saved);
    });
    this.queue = job.then(() => void 0, () => void 0);
    return job;
  }
  sources() {
    return catalogue(this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith("50_\u5B9E\u4F53/") || f.path.startsWith("30_\u9879\u76EE/\u505A\u996D\u4E0E\u98DF\u7269\u5B9E\u9A8C/\u83DC\u5F0F/")).map((f) => ({ path: f.path, name: f.basename, fm: this.app.metadataCache.getFileCache(f)?.frontmatter ?? {} })));
  }
  async createIngredient(title, note, supply) {
    const folder = "50_\u5B9E\u4F53/\u8BB0\u5F55/\u5238\u98DF\u6761\u76EE";
    if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
    const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";
    let time = BigInt(Date.now());
    let prefix = "";
    for (let i = 0; i < 10; i++) {
      prefix = alphabet[Number(time % 32n)] + prefix;
      time /= 32n;
    }
    const random = crypto.getRandomValues(new Uint8Array(16));
    const id = "csi_" + prefix + [...random].map((n) => alphabet[n % 32]).join("");
    const clean = title.replace(/[\\/:*?"<>|\n\r]/g, " ").trim();
    if (!clean) throw Error("\u8BF7\u586B\u5199\u98DF\u6750\u540D\u79F0");
    const fm = { couponSchedulerItem: true, recordType: "coupon-calendar-item", schemaVersion: 1, itemId: id, title: title.trim(), aliases: [], calendarType: "food", merchantName: "", placeIds: [], placeRefs: [], sourcePlatform: "\u7528\u6237\u8BB0\u5F55", purchasePrice: null, faceValue: null, validFrom: null, validTo: null, usableStart: null, usableEnd: null, desire: 3, itemStatus: "active", foodSupply: supply, foodNote: note, created: (/* @__PURE__ */ new Date()).toISOString(), updated: (/* @__PURE__ */ new Date()).toISOString(), tags: ["\u8BB0\u5F55/\u5238\u98DF\u6761\u76EE", "\u5238\u98DF\u65E5\u5386/\u98DF\u6750"] };
    const yaml = Object.entries(fm).map(([k, v]) => k + ": " + JSON.stringify(v)).join("\n");
    await this.app.vault.create(folder + "/" + clean + "-" + id.slice(-6) + ".md", "---\n" + yaml + "\n---\n\n# " + title.trim() + "\n\n## \u5907\u6CE8\n\n" + note + "\n");
  }
  async openPath(path) {
    await this.app.workspace.openLinkText(path, "", true);
  }
};
var FoodView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  plugin;
  board = emptyBoard();
  sources = [];
  places = [];
  search = "";
  tab = "picked";
  busy = false;
  error = "";
  dragId = "";
  laneFilter = "all";
  mapMode = "walk";
  mapLeaf = null;
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return "\u98DF\u7269\u5DE5\u4F5C\u53F0";
  }
  getIcon() {
    return "utensils";
  }
  async onOpen() {
    this.contentEl.addClass("food-workbench");
    try {
      this.board = await this.plugin.loadBoard();
    } catch (e) {
      this.error = String(e);
    }
    this.refreshSources();
  }
  refreshSources() {
    const c = this.plugin.sources();
    this.sources = c.sources;
    this.places = c.places;
    const focused = this.contentEl.ownerDocument.activeElement;
    if (focused && this.contentEl.contains(focused) && ["INPUT", "TEXTAREA", "SELECT"].includes(focused.tagName)) return;
    this.render();
  }
  async change(update) {
    if (this.busy || this.error) return;
    this.busy = true;
    this.render();
    try {
      this.board = await this.plugin.write(this.board, update(structuredClone(this.board)));
    } catch (e) {
      new import_obsidian.Notice(String(e), 8e3);
      this.error = String(e);
    } finally {
      this.busy = false;
      this.render();
    }
  }
  async reload() {
    try {
      this.board = await this.plugin.loadBoard();
      this.error = "";
    } catch (e) {
      this.error = String(e);
    }
    this.refreshSources();
  }
  button(el, label, fn, cls = "") {
    const b = el.createEl("button", { text: label, cls });
    b.disabled = this.busy || !!this.error;
    b.onclick = fn;
    return b;
  }
  render() {
    const root = this.contentEl;
    root.empty();
    const head = root.createDiv({ cls: "fw-header" });
    head.createDiv({ text: "\u98DF\u7269\u5DE5\u4F5C\u7A7A\u95F4", cls: "fw-eyebrow" });
    head.createEl("h1", { text: "\u628A\u60F3\u5403\u7684\uFF0C\u6162\u6162\u62FC\u6210\u4E00\u987F" });
    head.createEl("p", { text: "\u5148\u6311\u9009\uFF0C\u518D\u7EC4\u5408\uFF1B\u60F3\u597D\u4E86\u624D\u5B9A\u65F6\u95F4\u3002\u5728\u5BB6\u5403\u3001\u5916\u51FA\u5403\u548C\u4E70\u98DF\u6750\u90FD\u53EF\u4EE5\u4E00\u8D77\u60F3\u3002" });
    const tools = head.createDiv({ cls: "fw-toolbar" });
    this.button(tools, "\uFF0B \u81EA\u7531\u52A0\u4E00\u5F20", () => this.edit());
    this.button(tools, "\uFF0B \u8BB0\u5F55\u98DF\u6750", () => new IngredientModal(this.plugin, this).open());
    const refresh = tools.createEl("button", { text: "\u5237\u65B0\u6765\u6E90\u4E0E\u5DE5\u4F5C\u7A7A\u95F4" });
    refresh.onclick = () => void this.reload();
    refresh.disabled = this.busy;
    const open = tools.createEl("button", { text: "\u6253\u5F00\u5DE5\u4F5C\u7A7A\u95F4\u7B14\u8BB0" });
    open.onclick = () => void this.plugin.openPath(STATE);
    this.button(tools, "\u5E76\u6392\u770B\u5730\u56FE", () => void this.mapBeside());
    this.button(tools, "\u5238\u98DF\u65E5\u5386", () => this.openCalendar());
    this.button(tools, "\u505A\u996D\u4E0E\u5B9E\u9A8C", () => void this.plugin.openPath("30_\u9879\u76EE/\u505A\u996D\u4E0E\u98DF\u7269\u5B9E\u9A8C/\u505A\u996D\u4E0E\u98DF\u7269\u5B9E\u9A8C.md"));
    if (this.error) {
      root.createDiv({ cls: "fw-error", text: this.error + "\u3002\u4E3A\u907F\u514D\u8986\u76D6\uFF0C\u7F16\u8F91\u5DF2\u6682\u505C\uFF1B\u4FEE\u6B63\u539F\u7B14\u8BB0\u6216\u5237\u65B0\u540E\u7EE7\u7EED\u3002" });
      return;
    }
    if (this.busy) root.createDiv({ text: "\u6B63\u5728\u4FDD\u5B58\u2026", cls: "fw-status" });
    const layout = root.createDiv({ cls: "fw-layout" });
    this.renderLibrary(layout.createDiv({ cls: "fw-library" }));
    const center = layout.createDiv({ cls: "fw-center fw-board" });
    center.createDiv({ cls: "fw-handle", attr: { "aria-hidden": "true" } });
    const filter = center.createDiv({ cls: "fw-toolbar" });
    filter.createSpan({ text: `\u5DE5\u4F5C\u53F0 \xB7 ${this.board.cards.filter((c) => c.lane !== "done" && c.lane !== "later").length} \u5F20\u5019\u9009` });
    const sel = filter.createEl("select", { attr: { "aria-label": "\u663E\u793A\u533A\u57DF" } });
    sel.createEl("option", { value: "all", text: "\u5168\u90E8\u533A\u57DF" });
    for (const [value, label] of Object.entries(LANES)) sel.createEl("option", { value, text: label });
    sel.value = this.laneFilter;
    sel.onchange = () => {
      this.laneFilter = sel.value;
      this.render();
    };
    const lanes = center.createDiv({ cls: "fw-lanes" });
    for (const [key, title] of Object.entries(LANES)) {
      const lane = key;
      if (this.laneFilter !== "all" && this.laneFilter !== lane) continue;
      const col = lanes.createDiv({ cls: "fw-lane", attr: { "data-lane": lane } });
      col.createEl("h3", { text: title });
      col.createEl("p", { text: TEXT[lane], cls: "fw-muted" });
      col.ondragover = (e) => {
        e.preventDefault();
      };
      col.ondrop = (e) => {
        e.preventDefault();
        const id = e.dataTransfer?.getData("text/food-workbench");
        if (id && this.board.cards.some((c) => c.id === id)) void this.change((b) => moveCard(b, id, lane));
      };
      const cards = this.board.cards.filter((c) => c.lane === lane);
      if (!cards.length) col.createDiv({ cls: "fw-empty", text: lane === "recent" ? "\u4ECE\u5DE6\u8FB9\u6311\u9009\uFF0C\u6216\u81EA\u7531\u6DFB\u52A0" : "\u62D6\u5165\u5361\u7247\uFF0C\u4E5F\u53EF\u7528\u5361\u7247\u4E0A\u7684\u9009\u62E9\u83DC\u5355" });
      const groups = [...new Set(cards.map((c) => c.group))];
      for (const group of groups) {
        if (group) col.createDiv({ cls: "fw-group", text: group });
        for (const card of cards.filter((c) => c.group === group)) this.renderCard(col, card);
      }
    }
    const side = layout.createDiv({ cls: "fw-side" });
    this.renderRoute(side);
    this.renderShopping(side);
  }
  renderLibrary(el) {
    el.createEl("h2", { text: "\u4ECE\u8FD9\u91CC\u6311" });
    const search = el.createEl("input", { type: "search", placeholder: "\u627E\u5238\u3001\u98DF\u6750\u3001\u83DC\u6216\u95E8\u5E97", attr: { "aria-label": "\u641C\u7D22\u6765\u6E90" } });
    search.value = this.search;
    const tabs = el.createDiv({ cls: "fw-tabs" });
    for (const [id, name] of [["picked", "\u5238\u98DF\u91CC\u6311\u51FA\u7684"], ["voucher", "\u5168\u90E8\u5238"], ["home", "\u5BB6\u91CC\u6709\u7684"], ["buy", "\u53EF\u8D2D\u4E70\u98DF\u6750"], ["dish", "\u505A\u996D\u5019\u9009"], ["place", "\u5730\u70B9"]]) {
      const b = tabs.createEl("button", { text: name, cls: this.tab === id ? "is-active" : "" });
      b.onclick = () => {
        this.tab = id;
        this.render();
      };
    }
    const results = el.createDiv({ cls: "fw-results" });
    const list = () => {
      results.empty();
      let items;
      if (this.tab === "home") items = this.sources.filter((s) => s.kind === "stock");
      else if (this.tab === "buy") items = buyableFoods;
      else if (this.tab === "place") items = this.places.map((p) => ({ key: p.id, path: p.path, title: p.title, kind: "place", supply: "unknown", note: "\u8DEF\u7EBF\u505C\u9760\u70B9\uFF1B\u4E0D\u4F1A\u6210\u4E3A\u98DF\u54C1\u5E93\u5B58", expiry: "", places: [p] }));
      else if (this.tab === "picked") items = this.sources.filter((s) => s.picked);
      else items = this.sources.filter((s) => s.kind === this.tab);
      const q = this.search.trim().toLocaleLowerCase();
      items = items.filter((s) => (s.title + " " + s.note + " " + s.places.map((p) => p.title).join(" ")).toLocaleLowerCase().includes(q));
      results.createDiv({ cls: "fw-muted", text: `${items.length} \u4E2A\u6765\u6E90${this.tab === "picked" ? " \xB7 \u539F\u65E5\u671F\u4EC5\u4F5C\u6311\u9009\u7EBF\u7D22" : ""}` });
      for (const s of items) {
        const row = results.createDiv({ cls: "fw-source" });
        row.createEl("strong", { text: s.title });
        row.createDiv({ cls: "fw-muted", text: s.kind === "stock" ? "\u6570\u91CF\uFF0F\u72B6\u6001\u9700\u6838\u5B9E" : s.expiry ? `\u4E3B\u6863\u671F\u9650 ${s.expiry}${s.expiry < dayString() ? " \xB7 \u65E5\u671F\u5DF2\u8FC7\uFF0C\u5F85\u6838" : ""}` : KINDS[s.kind] });
        if (s.ended) row.createDiv({ cls: "fw-muted", text: "\u539F\u4E3B\u6863\u5DF2\u7ED3\u675F\uFF1B\u53EF\u67E5\u770B\u6765\u6E90" });
        if (s.note) row.createDiv({ cls: "fw-source-note", text: s.note });
        const buttons = row.createDiv({ cls: "fw-actions" });
        const active = this.board.cards.some((c) => c.sourceKey === s.key && c.lane !== "done" && c.lane !== "later");
        const add = this.button(buttons, active ? "\u5DF2\u5728\u5DE5\u4F5C\u53F0" : "\u6311\u5230\u5DE5\u4F5C\u53F0", () => void this.change((b) => addSource(b, s)));
        if (active) add.disabled = true;
        if (s.path) this.button(buttons, "\u6765\u6E90", () => void this.plugin.openPath(s.path));
      }
      if (!items.length) results.createDiv({ cls: "fw-empty", text: "\u8FD9\u91CC\u8FD8\u6CA1\u6709\u5339\u914D\u5185\u5BB9\u3002\u53EF\u5207\u6362\u5206\u7C7B\uFF0C\u6216\u81EA\u7531\u6DFB\u52A0\u60F3\u5403\u7684\u3002" });
    };
    search.oninput = () => {
      this.search = search.value;
      list();
    };
    list();
  }
  renderCard(el, c) {
    const card = el.createDiv({ cls: "fw-card", attr: { draggable: "true", "data-card-id": c.id } });
    card.ondragstart = (e) => {
      e.dataTransfer?.setData("text/food-workbench", c.id);
    };
    card.createDiv({ cls: "fw-card-kind", text: KINDS[c.kind] + " \xB7 " + SUPPLIES[c.supply] });
    card.createEl("h4", { text: c.title });
    if (c.amount) card.createDiv({ text: c.amount });
    if (c.note) card.createDiv({ text: c.note, cls: "fw-note" });
    if (c.date) card.createDiv({ text: "\u610F\u5411\u65E5\u671F " + c.date, cls: "fw-date" });
    const source = this.sources.find((s) => s.key === c.sourceKey);
    const ps = source?.places ?? [];
    const selected = this.places.find((p) => p.id === c.placeId);
    if (source?.expiry) card.createDiv({ text: "\u4E3B\u6863\u671F\u9650 " + source.expiry + (source.expiry < dayString() ? " \xB7 \u9700\u6838\u5B9E" : ""), cls: "fw-muted" });
    const actions = card.createDiv({ cls: "fw-actions" });
    this.button(actions, "\u7F16\u8F91\uFF0F\u642D\u914D", () => this.edit(c));
    if (source?.path || c.sourcePath) this.button(actions, "\u539F\u8BB0\u5F55", () => void this.plugin.openPath(source?.path || c.sourcePath));
    const routePlaces = selected ? [selected] : ps;
    if (routePlaces.length === 1) this.button(actions, "\uFF0B \u8DEF\u7EBF", () => this.addStop(routePlaces[0]));
    else if (routePlaces.length > 1) this.button(actions, "\u9009\u62E9\u95E8\u5E97", () => this.edit(c));
    const move = actions.createEl("select", { attr: { "aria-label": "\u79FB\u52A8 " + c.title } });
    for (const [value, text] of Object.entries(LANES)) move.createEl("option", { value, text });
    move.value = c.lane;
    move.disabled = this.busy;
    move.onchange = () => void this.change((b) => moveCard(b, c.id, move.value));
    this.button(actions, "\u79FB\u51FA\u5DE5\u4F5C\u53F0", () => void this.change((b) => removeCard(b, c.id)));
  }
  addStop(p) {
    if (this.board.stops.some((s) => s.id === p.id)) {
      new import_obsidian.Notice("\u8DEF\u7EBF\u91CC\u5DF2\u7ECF\u6709\u8FD9\u4E2A\u5730\u70B9");
      return;
    }
    void this.change((b) => ({ ...b, stops: [...b.stops, p] }));
  }
  renderRoute(el) {
    const panel = el.createDiv({ cls: "fw-panel" });
    panel.createEl("h2", { text: "\u8FD9\u6B21\u51FA\u95E8\u600E\u4E48\u8D70" });
    panel.createEl("p", { cls: "fw-muted", text: "\u4ECE\u5361\u7247\u52A0\u5165\u95E8\u5E97\uFF0C\u4E5F\u53EF\u52A0\u4E70\u83DC\u505C\u9760\u70B9\u3002\u5148\u624B\u52A8\u6392\u987A\u5E8F\uFF1B\u8DDD\u79BB\u662F\u76F4\u7EBF\u53C2\u8003\uFF0C\u4E0D\u662F\u5B9E\u9645\u8DEF\u7A0B\u6216\u8017\u65F6\u3002" });
    const pick = panel.createEl("select", { attr: { "aria-label": "\u6DFB\u52A0\u8DEF\u7EBF\u5730\u70B9" } });
    pick.createEl("option", { value: "", text: "\u9009\u62E9\u5DF2\u6709\u5730\u70B9\u2026" });
    for (const p of this.places) pick.createEl("option", { value: p.id, text: p.title });
    pick.onchange = () => {
      const p = this.places.find((p2) => p2.id === pick.value);
      if (p) this.addStop(p);
    };
    const mode = panel.createEl("select", { attr: { "aria-label": "\u5BFC\u822A\u65B9\u5F0F" } });
    for (const [value, text] of [["walk", "\u6B65\u884C"], ["bus", "\u516C\u5171\u4EA4\u901A"], ["car", "\u9A7E\u8F66"], ["ride", "\u9A91\u884C"]]) mode.createEl("option", { value, text });
    mode.value = this.mapMode;
    mode.onchange = () => {
      this.mapMode = mode.value;
      this.render();
    };
    const stops = this.board.stops.map((p) => this.places.find((x) => x.id === p.id) ?? p);
    if (!stops.length) panel.createDiv({ cls: "fw-empty", text: "\u8FD8\u6CA1\u9009\u8DEF\u7EBF\u3002\u5148\u6311\u51E0\u5BB6\u60F3\u5403\u7684\uFF0C\u518D\u51B3\u5B9A\u54EA\u4E9B\u80FD\u653E\u5728\u4E00\u6B21\u51FA\u95E8\u91CC\u3002" });
    stops.forEach((p, i) => {
      const stop = panel.createDiv({ cls: "fw-stop" });
      stop.createEl("strong", { text: `${i + 1}. ${p.title}` });
      if (i > 0) {
        const km = distance(stops[i - 1], p);
        stop.createDiv({ cls: "fw-muted", text: km === null ? "\u4E0E\u4E0A\u4E00\u7AD9\u8DDD\u79BB\u672A\u77E5" : `\u8DDD\u4E0A\u4E00\u7AD9\u76F4\u7EBF\u7EA6 ${km.toFixed(1)} km` });
      }
      const tools = stop.createDiv({ cls: "fw-actions" });
      if (i > 0) this.button(tools, "\u2191", () => void this.change((b) => {
        [b.stops[i - 1], b.stops[i]] = [b.stops[i], b.stops[i - 1]];
        return b;
      }));
      if (i < stops.length - 1) this.button(tools, "\u2193", () => void this.change((b) => {
        [b.stops[i + 1], b.stops[i]] = [b.stops[i], b.stops[i + 1]];
        return b;
      }));
      if (p.path) this.button(tools, "\u5730\u70B9\u7B14\u8BB0", () => void this.plugin.openPath(p.path));
      if (coordinates(p)) {
        const a = tools.createEl("a", { text: i ? "\u5BFC\u822A\u8FD9\u4E00\u6BB5" : "\u5BFC\u822A\u5230\u8FD9\u91CC", href: navigation(p, i ? stops[i - 1] : void 0, this.mapMode) });
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      } else stop.createDiv({ text: "\u7F3A\u5C11\u9AD8\u5FB7\u5750\u6807\uFF0C\u5148\u5728\u4E2A\u4EBA\u5730\u56FE\u786E\u8BA4\u5730\u70B9", cls: "fw-muted" });
      this.button(tools, "\u79FB\u51FA\u8DEF\u7EBF", () => void this.change((b) => ({ ...b, stops: b.stops.filter((s) => s.id !== p.id) })));
    });
    this.button(panel, "\u5E76\u6392\u770B\u4E2A\u4EBA\u5730\u56FE", () => void this.mapBeside());
  }
  renderShopping(el) {
    const panel = el.createDiv({ cls: "fw-panel" });
    panel.createEl("h2", { text: "\u7EC4\u5408\u91CC\u8981\u4E70\u7684" });
    panel.createEl("p", { cls: "fw-muted", text: "\u6765\u81EA\u5728\u5BB6\uFF0F\u5916\u51FA\u7EC4\u5408\u4E2D\u6807\u4E3A\u201C\u53EF\u8D2D\u4E70\u201D\u7684\u5361\u7247\u3002\u8FD9\u91CC\u662F\u89C4\u5212\uFF0C\u4E0D\u662F\u5DF2\u4E0B\u5355\u6216\u5DF2\u5165\u5E93\u3002" });
    const cards = shopping(this.board);
    for (const c of cards) panel.createDiv({ cls: "fw-shopping-item", text: `${c.title}${c.amount ? " \xB7 " + c.amount : ""}${c.group ? " \xB7 " + c.group : ""}` });
    if (!cards.length) panel.createDiv({ cls: "fw-empty", text: "\u628A\u53EF\u8D2D\u4E70\u98DF\u6750\u653E\u8FDB\u7EC4\u5408\uFF0C\u5C31\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002" });
  }
  edit(card) {
    new EditModal(this.plugin, this, card).open();
  }
  async mapBeside() {
    if (!this.app.plugins.enabledPlugins.has("personal-map")) {
      new import_obsidian.Notice("\u8BF7\u5148\u542F\u7528\u4E2A\u4EBA\u5730\u56FE\u63D2\u4EF6");
      return;
    }
    try {
      if (!this.mapLeaf || !this.app.workspace.getLeavesOfType("personal-map-view").includes(this.mapLeaf)) {
        this.app.workspace.setActiveLeaf(this.leaf, { focus: false });
        this.mapLeaf = this.app.workspace.getLeaf("split", "vertical");
        await this.mapLeaf.setViewState({ type: "personal-map-view", active: true });
      }
      await this.app.workspace.revealLeaf(this.mapLeaf);
    } catch (e) {
      new import_obsidian.Notice("\u65E0\u6CD5\u5E76\u6392\u6253\u5F00\u5730\u56FE\uFF1A" + String(e));
    }
  }
  openMap() {
    const enabled = this.app.commands.executeCommandById("personal-map:open-personal-map");
    if (!enabled) new import_obsidian.Notice("\u8BF7\u5148\u542F\u7528\u4E2A\u4EBA\u5730\u56FE\u63D2\u4EF6");
  }
  openCalendar() {
    const enabled = this.app.commands.executeCommandById("coupon-scheduler:open-calendar");
    if (!enabled) new import_obsidian.Notice("\u8BF7\u5148\u542F\u7528\u5238\u98DF\u65E5\u5386\u63D2\u4EF6");
  }
};
var EditModal = class extends import_obsidian.Modal {
  constructor(plugin, view, original) {
    super(plugin.app);
    this.plugin = plugin;
    this.view = view;
    this.original = original;
  }
  plugin;
  view;
  original;
  onOpen() {
    const c = this.original ? structuredClone(this.original) : { id: uid(), sourceKey: "", sourcePath: "", title: "", kind: "ingredient", supply: "buyable", lane: "recent", group: "", date: "", note: "", amount: "", placeId: "" };
    if (!c.sourceKey) c.sourceKey = "custom:" + c.id;
    this.titleEl.setText(this.original ? "\u8C03\u6574\u8FD9\u5F20\u5DE5\u4F5C\u5361\u7247" : "\u52A0\u4E00\u4E2A\u60F3\u5403\u7684\uFF0F\u60F3\u4E70\u7684");
    const form = this.contentEl.createEl("form", { cls: "fw-form" });
    const input = (label2, key, type = "text") => {
      const l = form.createEl("label", { text: label2 });
      const field = type === "textarea" ? l.createEl("textarea") : l.createEl("input", { type });
      field.value = c[key];
      field.oninput = () => {
        c[key] = field.value;
      };
      if (key === "title") field.required = true;
    };
    input("\u53EB\u4EC0\u4E48", "title");
    const select = (label2, key, options) => {
      const l = form.createEl("label", { text: label2 });
      const field = l.createEl("select");
      for (const [value, text] of Object.entries(options)) field.createEl("option", { value, text });
      field.value = c[key];
      field.onchange = () => {
        c[key] = field.value;
      };
    };
    select("\u7C7B\u578B", "kind", KINDS);
    select("\u83B7\u53D6\u65B9\u5F0F", "supply", SUPPLIES);
    select("\u653E\u5728\u54EA\u91CC", "lane", LANES);
    input("\u7EC4\u5408\uFF0F\u884C\u7A0B\u540D\uFF08\u540C\u540D\u5361\u7247\u4F1A\u653E\u5728\u4E00\u8D77\uFF09", "group");
    input("\u4EFD\u91CF\uFF0F\u51C6\u5907\u591A\u5C11\uFF08\u53EF\u7A7A\uFF09", "amount");
    input("\u610F\u5411\u65E5\u671F\uFF08\u53EF\u7A7A\uFF0C\u4E0D\u4EE3\u8868\u5DF2\u9884\u7EA6\uFF09", "date", "date");
    input("\u60F3\u6CD5\u3001\u642D\u914D\u6216\u51C6\u5907\u8981\u6C42", "note", "textarea");
    const label = form.createEl("label", { text: "\u5173\u8054\u5730\u70B9\uFF08\u95E8\u5E97\u6216\u4E70\u83DC\u5730\u70B9\uFF0C\u53EF\u7A7A\uFF09" });
    const places = label.createEl("select");
    places.createEl("option", { value: "", text: "\u6682\u4E0D\u5173\u8054" });
    for (const p of this.view.places) places.createEl("option", { value: p.id, text: p.title });
    places.value = c.placeId;
    places.onchange = () => {
      c.placeId = places.value;
    };
    form.createEl("p", { cls: "fw-muted", text: "\u4FDD\u5B58\u548C\u79FB\u52A8\u53EA\u6539\u53D8\u5DE5\u4F5C\u7A7A\u95F4\u3002\u5238\u6838\u9500\u3001\u5E93\u5B58\u53D8\u5316\u548C\u771F\u6B63\u7684\u65E5\u7A0B\u4ECD\u7531\u4F60\u786E\u8BA4\u540E\u5904\u7406\u3002" });
    const submit = form.createEl("button", { text: "\u4FDD\u5B58\u5361\u7247", type: "submit", cls: "mod-cta" });
    form.onsubmit = (e) => {
      e.preventDefault();
      if (!c.title.trim() || !validDate(c.date)) {
        new import_obsidian.Notice("\u8BF7\u586B\u5199\u540D\u79F0\u4E0E\u6709\u6548\u7684\u610F\u5411\u65E5\u671F\uFF0C\u65E5\u671F\u4E5F\u53EF\u4EE5\u7559\u7A7A");
        return;
      }
      c.title = c.title.trim();
      submit.disabled = true;
      void this.view.change((b) => ({ ...b, cards: this.original ? b.cards.map((x) => x.id === c.id ? c : x) : [...b.cards, c] }));
      this.close();
    };
  }
  onClose() {
    this.contentEl.empty();
  }
};
var IngredientModal = class extends import_obsidian.Modal {
  constructor(plugin, view) {
    super(plugin.app);
    this.plugin = plugin;
    this.view = view;
  }
  plugin;
  view;
  onOpen() {
    this.titleEl.setText("\u8BB0\u5F55\u5230\u5238\u98DF\u65E5\u5386\u7684\u98DF\u6750");
    const form = this.contentEl.createEl("form", { cls: "fw-form" });
    const label = form.createEl("label", { text: "\u98DF\u6750\u540D\u79F0" });
    const title = label.createEl("input");
    title.required = true;
    const l = form.createEl("label", { text: "\u83B7\u53D6\u65B9\u5F0F" });
    const supply = l.createEl("select");
    for (const value of ["have", "buyable", "unknown"]) supply.createEl("option", { value, text: SUPPLIES[value] });
    const n = form.createEl("label", { text: "\u4F59\u91CF\u3001\u53E3\u5473\u6216\u4FDD\u5B58\u5907\u6CE8\uFF08\u53EF\u7A7A\uFF09" });
    const note = n.createEl("textarea");
    form.createEl("p", { text: "\u4FDD\u5B58\u540E\uFF0C\u5238\u98DF\u65E5\u5386\u548C\u98DF\u7269\u5DE5\u4F5C\u53F0\u5171\u7528\u8FD9\u6761\u98DF\u6750\u8BB0\u5F55\u3002\u4E0D\u4F1A\u81EA\u52A8\u52A0\u5165\u6700\u8FD1\u60F3\u5403\u3002", cls: "fw-muted" });
    const button = form.createEl("button", { text: "\u4FDD\u5B58\u98DF\u6750", type: "submit", cls: "mod-cta" });
    form.onsubmit = (e) => {
      e.preventDefault();
      if (!title.value.trim()) return;
      button.disabled = true;
      void this.plugin.createIngredient(title.value, note.value, supply.value).then(() => {
        new import_obsidian.Notice("\u98DF\u6750\u5DF2\u4FDD\u5B58\u5230\u5238\u98DF\u6761\u76EE");
        this.close();
        this.view.refreshSources();
      }).catch((e2) => {
        new import_obsidian.Notice(String(e2));
        button.disabled = false;
      });
    };
  }
  onClose() {
    this.contentEl.empty();
  }
};
