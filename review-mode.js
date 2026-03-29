(function () {
    const STORAGE_KEY = "peg_review_edits_v1";
    const MODE_KEY = "peg_review_mode_enabled";
    const SIDE_KEY = "peg_review_side_v1";
    const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    const EDIT_ID_FALLBACKS = [
        [".site-intro-header", "site-intro-header"],
        [".header-grid", "profile-header"],
        [".profile-intro-block", "profile-intro"],
        [".sidebar", "sidebar"],
        ["#specialties-heading", "specialties-section"],
        ["#finances-section", "finances-section"],
        [".qualifications-section", "qualifications-section"],
        ["#client-focus-section", "client-focus-section"],
        [".treatment-section", "treatment-section"],
        ["#endorsements-section", "endorsements-section"],
        ["#address-section", "location-section"],
        [".location-map", "location-map"],
        [".ready-talk-band", "ready-talk-band"]
    ];

    const STYLE_ID = "review-mode-inline-styles";
    const ROOT_ID = "review-mode-root";
    const TOGGLE_ID = "review-mode-toggle";
    const PANEL_ID = "review-mode-panel";

    const state = {
        enabled: false,
        selectedElement: null,
        edits: [],
        panelSide: "right",
        deletedEdits: [],
        undoFlashTimer: null
    };

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = ""
            + "#" + TOGGLE_ID + " {"
            + "position: fixed; left: 16px; bottom: 16px; z-index: 120000;"
            + "background: #2b6cb0; color: #fff; border: 0; border-radius: 999px;"
            + "padding: 10px 16px; font: 600 14px/1.2 Segoe UI, Arial, sans-serif; cursor: pointer;"
            + "box-shadow: 0 8px 18px rgba(0, 0, 0, 0.22);"
            + "}"
            + "#" + TOGGLE_ID + ".is-on { background: #1f4f84; }"
            + "#" + PANEL_ID + " {"
            + "position: fixed; top: 12px; right: 12px; width: min(420px, calc(100vw - 24px));"
            + "max-height: calc(100vh - 24px); overflow: auto; z-index: 120001;"
            + "background: #fff; border: 1px solid #d5dbe5; border-radius: 12px;"
            + "box-shadow: 0 16px 36px rgba(16, 24, 40, 0.24);"
            + "font: 14px/1.35 Segoe UI, Arial, sans-serif; color: #1d2733;"
            + "display: none;"
            + "}"
            + "#" + PANEL_ID + ".is-open { display: block; }"
            + "#" + PANEL_ID + " .rm-head { padding: 12px 14px; border-bottom: 1px solid #e6ebf2; background: #f7f9fc; }"
            + "#" + PANEL_ID + " .rm-head-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }"
            + "#" + PANEL_ID + " .rm-title { margin: 0; font-size: 16px; font-weight: 700; }"
            + "#" + PANEL_ID + " .rm-side-btn {"
            + "width: 34px; height: 34px; border-radius: 999px; border: 1px solid #c5d0de;"
            + "background: #fff; color: #3e4a5c; display: inline-flex; align-items: center; justify-content: center;"
            + "padding: 0; cursor: pointer;"
            + "}"
            + "#" + PANEL_ID + " .rm-side-btn:hover { background: #f0f5fb; border-color: #aab9ce; }"
            + "#" + PANEL_ID + " .rm-side-btn:focus { outline: 2px solid #2b6cb0; outline-offset: 2px; }"
            + "#" + PANEL_ID + " .rm-side-btn svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }"
            + "#" + PANEL_ID + " .rm-sub { margin: 5px 0 0; color: #5b6778; font-size: 12px; }"
            + "#" + PANEL_ID + " .rm-body { padding: 12px 14px; }"
            + "#" + PANEL_ID + " .rm-row { margin-bottom: 10px; }"
            + "#" + PANEL_ID + " .rm-label { display: block; margin-bottom: 5px; font-weight: 600; font-size: 12px; color: #455468; }"
            + "#" + PANEL_ID + " .rm-field, #" + PANEL_ID + " .rm-textarea, #" + PANEL_ID + " .rm-select {"
            + "width: 100%; border: 1px solid #cfd8e5; border-radius: 8px; padding: 8px 10px;"
            + "font: 13px/1.35 Segoe UI, Arial, sans-serif; color: #1d2733; background: #fff;"
            + "}"
            + "#" + PANEL_ID + " .rm-textarea { min-height: 74px; resize: vertical; }"
            + "#" + PANEL_ID + " .rm-textarea.rm-current { min-height: 92px; background: #f7f9fc; }"
            + "#" + PANEL_ID + " #rm-change-type, #" + PANEL_ID + " #rm-requested {"
            + "border: 2px solid #2b6cb0;"
            + "box-shadow: 0 0 0 2px rgba(43, 108, 176, 0.18);"
            + "}"
            + "#" + PANEL_ID + " #rm-change-type:focus, #" + PANEL_ID + " #rm-requested:focus {"
            + "outline: 2px solid #1f4f84;"
            + "outline-offset: 1px;"
            + "box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.28);"
            + "}"
            + "#" + PANEL_ID + " .rm-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }"
            + "#" + PANEL_ID + " .rm-btn {"
            + "border: 0; border-radius: 8px; padding: 8px 12px; cursor: pointer;"
            + "font: 600 13px/1.2 Segoe UI, Arial, sans-serif;"
            + "}"
            + "#" + PANEL_ID + " .rm-btn-primary { background: #2b6cb0; color: #fff; }"
            + "#" + PANEL_ID + " .rm-btn-neutral { background: #eef3fa; color: #1d2733; }"
            + "#" + PANEL_ID + " .rm-btn-danger { background: #c62828; color: #fff; }"
            + "#" + PANEL_ID + " .rm-btn-undo { background: #e7f6ea; color: #1d5d2f; border: 1px solid #b8e2c2; }"
            + "#" + PANEL_ID + " .rm-btn:disabled { opacity: 0.55; cursor: not-allowed; }"
            + "#" + PANEL_ID + " .rm-btn-undo.rm-btn-attn { background: #f6cf57; color: #3f2f00; border-color: #e2ba3d; }"
            + "#" + PANEL_ID + " .rm-btn-undo.rm-btn-flash { animation: rmUndoPulse 0.65s ease; }"
            + "#" + PANEL_ID + " .rm-list { margin: 12px 0 0; padding: 0; list-style: none; border-top: 1px solid #e6ebf2; }"
            + "#" + PANEL_ID + " .rm-item { padding: 10px 0; border-bottom: 1px solid #eef2f7; }"
            + "#" + PANEL_ID + " .rm-item { cursor: pointer; }"
            + "#" + PANEL_ID + " .rm-item:hover { background: #f7fbff; }"
            + "#" + PANEL_ID + " .rm-item:focus { outline: 2px solid #2b6cb0; outline-offset: 2px; }"
            + "#" + PANEL_ID + " .rm-item-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }"
            + "#" + PANEL_ID + " .rm-item-title { margin: 0 0 4px; font-weight: 600; font-size: 12px; color: #1f4f84; }"
            + "#" + PANEL_ID + " .rm-item-copy { margin: 0; font-size: 12px; color: #4b5a70; }"
            + "#" + PANEL_ID + " .rm-item-delete {"
            + "border: 1px solid #e6b8b8; background: #fff5f5; color: #8a1c1c;"
            + "border-radius: 999px; font: 700 11px/1 Segoe UI, Arial, sans-serif;"
            + "padding: 5px 9px; cursor: pointer; flex: 0 0 auto;"
            + "}"
            + "#" + PANEL_ID + " .rm-item-delete:hover { background: #ffe5e5; border-color: #dd9d9d; }"
            + "#" + PANEL_ID + " .rm-item-delete:focus { outline: 2px solid #c62828; outline-offset: 1px; }"
            + "#" + PANEL_ID + " .rm-empty { margin: 8px 0 0; font-size: 12px; color: #6c7788; }"
            + "#" + PANEL_ID + " .rm-note { margin: 8px 0 0; font-size: 12px; color: #6b7484; }"
            + "@keyframes rmUndoPulse { 0% { transform: scale(1); } 35% { transform: scale(1.05); } 100% { transform: scale(1); } }"
            + ".rm-selected-target { outline: 3px solid #e53935 !important; outline-offset: 2px !important; }";

        document.head.appendChild(style);
    }

    function ensureEditIds() {
        EDIT_ID_FALLBACKS.forEach(function (pair) {
            const selector = pair[0];
            const editId = pair[1];
            const el = document.querySelector(selector);
            if (el && !el.hasAttribute("data-edit-id")) {
                el.setAttribute("data-edit-id", editId);
            }
        });
    }

    function safeReadStorage() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function saveStorage() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.edits));
        } catch (error) {
            // Ignore storage failures gracefully.
        }
    }

    function setModeStorage(value) {
        try {
            window.localStorage.setItem(MODE_KEY, value ? "1" : "0");
        } catch (error) {
            // Ignore storage failures gracefully.
        }
    }

    function setSideStorage(value) {
        try {
            window.localStorage.setItem(SIDE_KEY, value);
        } catch (error) {
            // Ignore storage failures gracefully.
        }
    }

    function getPreferredMode() {
        try {
            return window.localStorage.getItem(MODE_KEY) === "1";
        } catch (error) {
            return false;
        }
    }

    function getPreferredSide() {
        try {
            const value = window.localStorage.getItem(SIDE_KEY);
            return value === "left" ? "left" : "right";
        } catch (error) {
            return "right";
        }
    }

    function textPreview(el) {
        if (!el) {
            return "";
        }
        if (el.tagName === "IMG") {
            return "Image alt: " + (el.getAttribute("alt") || "(none)");
        }
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            return "Form value: " + (el.value || "");
        }
        return (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 260);
    }

    function buildSelector(el) {
        if (!el) {
            return "";
        }
        if (el.id) {
            return "#" + el.id;
        }

        const parts = [];
        let node = el;
        let depth = 0;

        while (node && node.nodeType === 1 && depth < 5 && node.tagName !== "HTML") {
            let part = node.tagName.toLowerCase();
            if (node.classList.length > 0) {
                const stableClasses = Array.from(node.classList)
                    .filter(function (className) {
                        return className !== "rm-selected-target" && !className.startsWith("rm-");
                    })
                    .slice(0, 2);

                if (stableClasses.length > 0) {
                    part += "." + stableClasses.join(".");
                }
            }
            parts.unshift(part);
            node = node.parentElement;
            depth += 1;
        }

        return parts.join(" > ");
    }

    function collectCurrentValues(el) {
        if (!el) {
            return "";
        }
        const cs = window.getComputedStyle(el);
        const lines = [
            "text: " + textPreview(el),
            "color: " + cs.color,
            "font-size: " + cs.fontSize,
            "font-family: " + cs.fontFamily,
            "font-weight: " + cs.fontWeight,
            "background-color: " + cs.backgroundColor,
            "margin: " + cs.margin,
            "padding: " + cs.padding
        ];

        return lines.join("\n");
    }

    function clearSelection() {
        if (state.selectedElement) {
            state.selectedElement.classList.remove("rm-selected-target");
            state.selectedElement = null;
        }
    }

    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        return DATE_FORMATTER.format(date);
    }

    function exportEdits(edits) {
        if (!edits.length) {
            alert("No edits to export yet.");
            return;
        }

        const blocks = edits.map(function (edit, index) {
            return [
                "EDIT " + String(index + 1).padStart(3, "0"),
                "Timestamp: " + edit.timestamp,
                "Section: " + edit.section,
                "Selector: " + edit.selector,
                "Element: " + edit.element,
                "Change type: " + edit.changeType,
                "Priority: " + edit.priority,
                "Current values:",
                edit.current,
                "Requested change:",
                edit.requested,
                "Note:",
                edit.note || "(none)",
                ""
            ].join("\n");
        });

        const content = [
            "Peggi Site Review Instructions",
            "Exported: " + new Date().toISOString(),
            "Total edits: " + edits.length,
            "",
            blocks.join("\n")
        ].join("\n");

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");

        anchor.href = url;
        anchor.download = "review-instructions-" + stamp + ".txt";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 500);
    }

    function createUi() {
        if (document.getElementById(ROOT_ID)) {
            return;
        }

        const root = document.createElement("div");
        root.id = ROOT_ID;

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.id = TOGGLE_ID;
        toggle.textContent = "Review Mode";

        const panel = document.createElement("aside");
        panel.id = PANEL_ID;
        panel.setAttribute("aria-label", "Site Review Panel");
        panel.innerHTML = ""
            + "<div class='rm-head'>"
            + "  <div class='rm-head-top'>"
            + "    <h3 class='rm-title'>Client Review Helper</h3>"
            + "    <button class='rm-side-btn' id='rm-swap-side' type='button' aria-label='Move helper to the left side' title='Move helper to the left side'>"
            + "      <svg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>"
            + "        <path d='M14.5 5.5 8 12l6.5 6.5'></path>"
            + "      </svg>"
            + "    </button>"
            + "  </div>"
            + "  <p class='rm-sub'>Click any page element to capture a requested change.</p>"
            + "  <p class='rm-sub'><strong>Review Mode is notes only.</strong> It does not change site content directly.</p>"
            + "</div>"
            + "<div class='rm-body'>"
            + "  <div class='rm-row'>"
            + "    <label class='rm-label'>Selected Section</label>"
            + "    <input class='rm-field' id='rm-section' type='text' readonly value='(none selected)'>"
            + "  </div>"
            + "  <div class='rm-row'>"
            + "    <label class='rm-label'>Element Selector</label>"
            + "    <input class='rm-field' id='rm-selector' type='text' readonly value=''>"
            + "  </div>"
            + "  <div class='rm-row'>"
            + "    <label class='rm-label'>Current Values</label>"
            + "    <textarea class='rm-textarea rm-current' id='rm-current' readonly></textarea>"
            + "  </div>"
            + "  <div class='rm-row'>"
            + "    <label class='rm-label' for='rm-change-type'>Change Type</label>"
            + "    <select class='rm-select' id='rm-change-type'>"
            + "      <option value='text-replace'>Text replace</option>"
            + "      <option value='style-update'>Style update</option>"
            + "      <option value='spacing-update'>Spacing update</option>"
            + "      <option value='remove-pending'>Remove pending marker</option>"
            + "      <option value='other'>Other</option>"
            + "    </select>"
            + "  </div>"
            + "  <div class='rm-row'>"
            + "    <label class='rm-label' for='rm-requested'>Requested Change</label>"
            + "    <textarea class='rm-textarea' id='rm-requested' placeholder='Describe what should change...'></textarea>"
            + "  </div>"
            + "  <div class='rm-actions'>"
            + "    <button class='rm-btn rm-btn-primary' id='rm-add' type='button'>Add Edit</button>"
            + "    <button class='rm-btn rm-btn-neutral' id='rm-export' type='button'>Export TXT</button>"
            + "    <button class='rm-btn rm-btn-danger' id='rm-clear' type='button'>Clear All</button>"
            + "    <button class='rm-btn rm-btn-undo' id='rm-undo' type='button' disabled>Undo Delete</button>"
            + "  </div>"
            + "  <p class='rm-note'>Edits are saved in this browser and can be exported anytime.</p>"
            + "  <div class='rm-list' id='rm-list'></div>"
            + "  <p class='rm-empty' id='rm-empty'>No edits recorded yet.</p>"
            + "</div>";

        root.appendChild(toggle);
        root.appendChild(panel);
        document.body.appendChild(root);
    }

    function getPanelFields() {
        return {
            root: document.getElementById(ROOT_ID),
            toggle: document.getElementById(TOGGLE_ID),
            panel: document.getElementById(PANEL_ID),
            swapSide: document.getElementById("rm-swap-side"),
            section: document.getElementById("rm-section"),
            selector: document.getElementById("rm-selector"),
            current: document.getElementById("rm-current"),
            changeType: document.getElementById("rm-change-type"),
            requested: document.getElementById("rm-requested"),
            add: document.getElementById("rm-add"),
            exportBtn: document.getElementById("rm-export"),
            clear: document.getElementById("rm-clear"),
            undo: document.getElementById("rm-undo"),
            list: document.getElementById("rm-list"),
            empty: document.getElementById("rm-empty")
        };
    }

    function pushDeletedEdit(record, index) {
        state.deletedEdits.push({
            edit: Object.assign({}, record),
            index: index
        });

        if (state.deletedEdits.length > 10) {
            state.deletedEdits.shift();
        }
    }

    function updateUndoButton(fields, flash) {
        if (!fields.undo) {
            return;
        }

        const count = state.deletedEdits.length;
        fields.undo.disabled = count === 0;
        fields.undo.textContent = count > 0 ? "Undo Delete (" + count + ")" : "Undo Delete";
        fields.undo.classList.toggle("rm-btn-attn", count > 0);

        if (state.undoFlashTimer) {
            window.clearTimeout(state.undoFlashTimer);
            state.undoFlashTimer = null;
        }

        if (flash && count > 0) {
            fields.undo.classList.add("rm-btn-flash");
            state.undoFlashTimer = window.setTimeout(function () {
                fields.undo.classList.remove("rm-btn-flash");
                state.undoFlashTimer = null;
            }, 700);
        } else {
            fields.undo.classList.remove("rm-btn-flash");
        }
    }

    function deleteEditAt(index, fields) {
        if (index < 0 || index >= state.edits.length) {
            return;
        }

        const removed = state.edits.splice(index, 1)[0];
        pushDeletedEdit(removed, index);
        saveStorage();
        renderEdits(fields);
        updateUndoButton(fields, true);
    }

    function undoDelete(fields) {
        if (!state.deletedEdits.length) {
            return;
        }

        const restored = state.deletedEdits.pop();
        const insertIndex = Math.max(0, Math.min(restored.index, state.edits.length));
        state.edits.splice(insertIndex, 0, restored.edit);
        saveStorage();
        renderEdits(fields);
        updateUndoButton(fields, false);
    }

    function updateSideLayout(fields) {
        const panelOnLeft = state.panelSide === "left";

        fields.panel.style.left = panelOnLeft ? "12px" : "auto";
        fields.panel.style.right = panelOnLeft ? "auto" : "12px";

        fields.toggle.style.left = panelOnLeft ? "auto" : "16px";
        fields.toggle.style.right = panelOnLeft ? "16px" : "auto";

        if (fields.swapSide) {
            const moveToLeft = !panelOnLeft;
            const titleText = moveToLeft
                ? "Move helper to the left side"
                : "Move helper to the right side";
            fields.swapSide.setAttribute("aria-label", titleText);
            fields.swapSide.setAttribute("title", titleText);
            fields.swapSide.innerHTML = moveToLeft
                ? "<svg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M14.5 5.5 8 12l6.5 6.5'></path></svg>"
                : "<svg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='m9.5 5.5 6.5 6.5-6.5 6.5'></path></svg>";
        }
    }

    function updatePanelMode(fields) {
        fields.toggle.classList.toggle("is-on", state.enabled);
        fields.panel.classList.toggle("is-open", state.enabled);
        fields.toggle.textContent = state.enabled ? "Review Mode On" : "Review Mode";

        if (!state.enabled) {
            clearSelection();
        }
    }

    function renderEdits(fields) {
        fields.list.innerHTML = "";

        if (!state.edits.length) {
            fields.empty.style.display = "block";
            updateUndoButton(fields, false);
            return;
        }

        fields.empty.style.display = "none";

        for (let index = state.edits.length - 1; index >= 0; index -= 1) {
            const edit = state.edits[index];
            const item = document.createElement("article");
            item.className = "rm-item";
            item.tabIndex = 0;
            item.innerHTML = ""
                + "<div class='rm-item-head'>"
                + "  <p class='rm-item-title'>" + edit.section + " | " + edit.priority.toUpperCase() + " | " + formatTimestamp(edit.timestamp) + "</p>"
                + "  <button class='rm-item-delete' type='button' aria-label='Delete this edit'>Delete</button>"
                + "</div>"
                + "<p class='rm-item-copy'><strong>Request:</strong> " + (edit.requested || "(empty)") + "</p>"
                + "<p class='rm-item-copy'><strong>Type:</strong> " + edit.changeType + "</p>";

            const deleteBtn = item.querySelector(".rm-item-delete");

            const jumpToTarget = function () {
                const target = findTargetForEdit(edit);
                if (!target) {
                    alert("Could not find that element on the page. Try selecting it again and creating a new edit.");
                    return;
                }

                selectElement(target, fields);
                target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            };

            item.addEventListener("click", function () {
                jumpToTarget();
            });

            item.addEventListener("keydown", function (event) {
                if (event.target && event.target.closest(".rm-item-delete")) {
                    return;
                }
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    jumpToTarget();
                }
            });

            if (deleteBtn) {
                deleteBtn.addEventListener("click", function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    deleteEditAt(index, fields);
                });
            }

            fields.list.appendChild(item);
        }

        updateUndoButton(fields, false);
    }

    function findTargetForEdit(edit) {
        if (!edit) {
            return null;
        }

        let selectorMatch = null;
        if (edit.selector) {
            try {
                selectorMatch = document.querySelector(edit.selector);
            } catch (error) {
                selectorMatch = null;
            }
        }

        if (selectorMatch) {
            return selectorMatch;
        }

        if (!edit.section || edit.section === "unscoped") {
            return null;
        }

        const escapedSection = window.CSS && typeof window.CSS.escape === "function"
            ? window.CSS.escape(edit.section)
            : edit.section.replace(/"/g, "\\\"");

        return document.querySelector("[data-edit-id=\"" + escapedSection + "\"]");
    }

    function selectElement(target, fields) {
        if (!target || !(target instanceof HTMLElement)) {
            return;
        }

        clearSelection();

        state.selectedElement = target;
        target.classList.add("rm-selected-target");

        const scoped = target.closest("[data-edit-id]");
        const sectionValue = scoped ? scoped.getAttribute("data-edit-id") : "unscoped";

        fields.section.value = sectionValue;
        fields.selector.value = buildSelector(target);
        fields.current.value = collectCurrentValues(target);
    }

    function addEdit(fields) {
        if (!state.selectedElement) {
            alert("Select an element first.");
            return;
        }

        const requested = fields.requested.value.trim();
        if (!requested) {
            alert("Please add the requested change before saving.");
            return;
        }

        const scoped = state.selectedElement.closest("[data-edit-id]");

        const record = {
            id: Date.now() + "-" + Math.floor(Math.random() * 10000),
            timestamp: new Date().toISOString(),
            section: scoped ? scoped.getAttribute("data-edit-id") : "unscoped",
            selector: buildSelector(state.selectedElement),
            element: state.selectedElement.tagName.toLowerCase(),
            changeType: fields.changeType.value,
            priority: "medium",
            current: fields.current.value,
            requested: requested,
            note: "",
            path: window.location.pathname
        };

        state.edits.push(record);
        saveStorage();
        renderEdits(fields);

        fields.requested.value = "";
    }

    function bindEvents(fields) {
        fields.toggle.addEventListener("click", function () {
            state.enabled = !state.enabled;
            setModeStorage(state.enabled);
            updatePanelMode(fields);
        });

        if (fields.swapSide) {
            fields.swapSide.addEventListener("click", function () {
                state.panelSide = state.panelSide === "left" ? "right" : "left";
                setSideStorage(state.panelSide);
                updateSideLayout(fields);
            });
        }

        fields.add.addEventListener("click", function () {
            addEdit(fields);
        });

        fields.exportBtn.addEventListener("click", function () {
            exportEdits(state.edits);
        });

        fields.clear.addEventListener("click", function () {
            const ok = window.confirm("Clear all stored review edits from this browser?");
            if (!ok) {
                return;
            }

            state.edits.forEach(function (edit, index) {
                pushDeletedEdit(edit, index);
            });

            state.edits = [];
            saveStorage();
            renderEdits(fields);
            updateUndoButton(fields, true);
        });

        if (fields.undo) {
            fields.undo.addEventListener("click", function () {
                undoDelete(fields);
            });
        }

        document.addEventListener("click", function (event) {
            if (!state.enabled) {
                return;
            }

            const panel = fields.panel;
            const toggle = fields.toggle;

            if (panel.contains(event.target) || toggle.contains(event.target)) {
                return;
            }

            if (event.target.closest(".modal-backdrop") || event.target.closest(".floating-contact-bar")) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const candidate = event.target.closest("[data-edit-id], h1, h2, h3, h4, p, li, a, button, img, span, div");
            if (!candidate) {
                return;
            }

            selectElement(candidate, fields);
        }, true);

        document.addEventListener("keydown", function (event) {
            if (!state.enabled) {
                return;
            }
            if (event.key === "Escape") {
                clearSelection();
                fields.section.value = "(none selected)";
                fields.selector.value = "";
                fields.current.value = "";
            }
        });
    }

    function init() {
        injectStyles();
        ensureEditIds();
        createUi();

        const fields = getPanelFields();
        state.edits = safeReadStorage();
        state.enabled = getPreferredMode();
        state.panelSide = getPreferredSide();

        updatePanelMode(fields);
        updateSideLayout(fields);
        renderEdits(fields);
        bindEvents(fields);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
