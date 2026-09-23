/* ==========================================================================
   QuickLearning — application controller
   Boot, sidebar, home dashboard, section rendering, filters, search UI,
   progress, flashcard mode, keyboard shortcuts and printing.
   ========================================================================== */
(function () {
  "use strict";

  var QL = window.QL;
  var store = QL.store;
  var icon = QL.icon;
  var esc = QL.escapeHtml;

  var el = {};
  var ui = { sectionId: null, filter: "all", cursor: -1, results: [], resultIdx: -1 };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ===================================================================== */
  /* Theme                                                                  */
  /* ===================================================================== */

  function systemDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function resolvedTheme() {
    var t = store.theme();
    return t === "auto" ? (systemDark() ? "dark" : "light") : t;
  }

  function applyTheme() {
    var t = store.theme();
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    var dark = resolvedTheme() === "dark";
    if (el.themeBtn) {
      el.themeBtn.innerHTML = icon(dark ? "moon" : "sun", 16);
      el.themeBtn.title = "Switch to " + (dark ? "light" : "dark") + " theme  (T)";
      el.themeBtn.setAttribute("aria-label", el.themeBtn.title);
    }
  }

  function toggleTheme() {
    store.theme(resolvedTheme() === "dark" ? "light" : "dark");
    applyTheme();
  }

  /* ===================================================================== */
  /* Small helpers                                                          */
  /* ===================================================================== */

  function ring(done, total, size, stroke) {
    size = size || 34; stroke = stroke || 3.5;
    var pct = total ? done / total : 0;
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var half = size / 2;
    return '<span class="ring-wrap" style="width:' + size + "px;height:" + size + 'px">' +
      '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '">' +
        '<circle class="ring__track" cx="' + half + '" cy="' + half + '" r="' + r + '" fill="none" stroke-width="' + stroke + '"/>' +
        '<circle class="ring__fill" cx="' + half + '" cy="' + half + '" r="' + r + '" fill="none" stroke-width="' + stroke +
          '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + (c * (1 - pct)).toFixed(2) + '"/>' +
      "</svg>" +
      '<span class="ring-wrap__label">' + Math.round(pct * 100) + "</span></span>";
  }

  function pbar(done, total, label) {
    var pct = total ? Math.round((done / total) * 100) : 0;
    return '<div class="pbar-row"><span class="pbar-row__label">' + esc(label) + "</span>" +
      '<span class="pbar-row__value">' + done + " / " + total + "</span></div>" +
      '<div class="pbar"><span class="pbar__fill" style="width:' + pct + '%"></span></div>';
  }

  function levelBadge(level) {
    var cls = { Basic: "basic", Intermediate: "intermediate", Advanced: "advanced" }[level] || "core";
    return '<span class="badge badge--' + cls + '">' + esc(level) + "</span>";
  }

  var toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove("is-on"); }, 1700);
  }

  /* ===================================================================== */
  /* Sidebar                                                                */
  /* ===================================================================== */

  function renderSidebar() {
    var html = '<div class="sidebar__overall" id="overall"></div>';

    html += '<div class="sidebar__group">' +
      '<a class="nav-item" href="#/" data-nav="home">' +
        '<span class="nav-item__dot" style="background:var(--text-faint)"></span>' +
        '<span class="nav-item__text">Home</span></a></div>';

    (QL.groups || []).forEach(function (g) {
      html += '<div class="sidebar__group" data-accent="' + esc(g.accent) + '">' +
        '<div class="sidebar__label">' + esc(g.title) + "</div>";
      g.sections.forEach(function (id) {
        var s = QL.section(id);
        if (!s) return;
        html += '<a class="nav-item" href="#/' + id + '" data-nav="' + id + '">' +
          '<span class="nav-item__dot"></span>' +
          '<span class="nav-item__text">' + esc(s.level) + "</span>" +
          '<span class="nav-item__count" data-count="' + id + '"></span></a>';
      });
      html += "</div>";
    });

    el.sidebar.innerHTML = html;
  }

  function refreshProgress() {
    var all = store.stats();
    $("#overall").innerHTML = pbar(all.learned, all.total, "Overall progress") +
      '<div style="margin-top:9px;display:flex;gap:14px;font-size:11.5px;color:var(--text-muted)">' +
        "<span>" + icon("star", 12, "") + " " + all.starred + " starred</span>" +
        "<span>" + (all.total - all.learned) + " to go</span>" +
      "</div>";

    $$("[data-count]").forEach(function (node) {
      var st = store.stats(node.getAttribute("data-count"));
      node.textContent = st.learned + "/" + st.total;
    });
  }

  function markActiveNav(id) {
    $$(".nav-item", el.sidebar).forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-nav") === (id || "home"));
    });
  }

  /* ===================================================================== */
  /* Home                                                                   */
  /* ===================================================================== */

  function renderHome() {
    var all = store.stats();
    var last = store.last();
    var lastSection = last && QL.section(last.split("/")[0]);

    var html = '<section class="home-hero">' +
      '<h1 class="home-hero__title">Interview quick reference</h1>' +
      '<p class="home-hero__lead">' + all.total + " questions with interview-ready answers across C#, ASP.NET MVC, LINQ and TypeScript. " +
        "Search from anywhere, star what matters, and tick things off as you learn them.</p>" +
      '<div class="home-hero__stats">' +
        '<div class="stat"><div class="stat__value">' + all.total + '</div><div class="stat__label">Questions</div></div>' +
        '<div class="stat"><div class="stat__value">' + all.learned + '</div><div class="stat__label">Learned</div></div>' +
        '<div class="stat"><div class="stat__value">' + all.starred + '</div><div class="stat__label">Starred</div></div>' +
        '<div class="stat"><div class="stat__value">' + (QL.sections.length) + '</div><div class="stat__label">Sections</div></div>' +
      "</div>" +
      '<div class="home-hero__actions">' +
        (lastSection
          ? '<a class="btn btn--primary" href="#/' + esc(last) + '">' + icon("right", 15) + "Continue where you left off</a>"
          : '<a class="btn btn--primary" href="#/' + esc(QL.sections[0].id) + '">' + icon("right", 15) + "Start with " + esc(QL.sections[0].short) + "</a>") +
        '<button type="button" class="btn" data-act="random">' + icon("dice", 15) + "Random question</button>" +
        '<button type="button" class="btn" data-act="print-all">' + icon("printer", 15) + "Print everything</button>" +
        '<button type="button" class="btn" data-act="shortcuts">' + icon("keyboard", 15) + "Shortcuts</button>" +
      "</div></section>";

    (QL.groups || []).forEach(function (g) {
      var gTotal = 0, gLearned = 0;
      g.sections.forEach(function (id) {
        var st = store.stats(id); gTotal += st.total; gLearned += st.learned;
      });
      html += '<section class="home-group" data-accent="' + esc(g.accent) + '">' +
        '<div class="home-group__head"><h2 class="home-group__title">' + esc(g.title) + "</h2>" +
        '<span class="home-group__count">' + gLearned + " of " + gTotal + " learned</span></div>" +
        '<div class="topic-grid">';
      g.sections.forEach(function (id) {
        var s = QL.section(id);
        if (!s) return;
        var st = store.stats(id);
        html += '<a class="topic-card" href="#/' + id + '" data-accent="' + esc(s.accent) + '">' +
          '<div class="topic-card__top"><div>' +
            '<div class="topic-card__title">' + esc(s.short) + "</div>" +
            '<div style="margin-top:5px">' + levelBadge(s.level) + "</div>" +
          "</div>" + ring(st.learned, st.total) + "</div>" +
          '<p class="topic-card__desc">' + esc(s.desc) + "</p>" +
          '<div class="topic-card__foot">' + pbar(st.learned, st.total, st.total + " questions") + "</div>" +
        "</a>";
      });
      html += "</div></section>";
    });

    el.view.removeAttribute("data-accent");
    el.view.innerHTML = html;
    markActiveNav("home");
    document.title = "QuickLearning — Interview Q&A";
    ui.sectionId = null;
    ui.cursor = -1;
  }

  /* ===================================================================== */
  /* Section                                                                */
  /* ===================================================================== */

  function questionCard(q, i) {
    var starred = store.isStarred(q.key);
    var learned = store.isLearned(q.key);
    var bodyId = "body-" + q.sectionId + "-" + q.id;

    var tags = "";
    if (q.flag) tags += '<span class="badge badge--flag">' + icon("alert", 11, "") + " Revisit</span>";
    (q.tags || []).slice(0, 3).forEach(function (t) {
      tags += '<span class="badge badge--topic">' + esc(t) + "</span>";
    });

    return '<article class="qcard' + (learned ? " is-learned" : "") + '" data-key="' + esc(q.key) +
        '" data-qid="' + esc(q.id) + '" id="q-' + esc(q.id) + '">' +
      '<div class="qcard__top">' +
        '<button type="button" class="qcard__head" aria-expanded="false" aria-controls="' + bodyId + '">' +
          '<span class="qcard__num">' + (i + 1) + "</span>" +
          '<span class="qcard__main">' +
            '<span class="qcard__q">' + esc(q.q) + "</span>" +
            (q.tldr ? '<span class="qcard__tldr">' + QL.inline(q.tldr) + "</span>" : "") +
            (tags ? '<span class="qcard__tags">' + tags + "</span>" : "") +
          "</span>" +
          '<span class="qcard__chevron">' + icon("chevron", 17, "") + "</span>" +
        "</button>" +
        '<div class="qcard__tools">' +
          '<button type="button" class="tool-btn" data-act="copy-q" title="Copy question" aria-label="Copy question">' + icon("copy", 15, "") + "</button>" +
          '<button type="button" class="tool-btn' + (starred ? " is-on" : "") + '" data-act="star" title="Star  (S)" aria-pressed="' + starred + '">' + icon("star", 16, "") + "</button>" +
          '<button type="button" class="tool-btn' + (learned ? " is-on" : "") + '" data-act="learn" title="Mark learned  (L)" aria-pressed="' + learned + '">' + icon("check", 16, "") + "</button>" +
        "</div>" +
      "</div>" +
      '<div class="qcard__reveal"><button type="button" class="btn btn--sm" data-act="reveal">' + icon("eye", 14) + "Reveal answer</button></div>" +
      '<div class="qcard__wrap"><div class="qcard__clip">' +
        '<div class="qcard__body" id="' + bodyId + '" role="region"></div>' +
      "</div></div></article>";
  }

  function renderSection(id) {
    var s = QL.section(id);
    if (!s) { renderHome(); return; }

    var idx = QL.sections.indexOf(s);
    var prev = QL.sections[idx - 1];
    var next = QL.sections[idx + 1];

    var html = '<div class="page-head">' +
      '<div class="page-head__crumbs"><a href="#/">Home</a>' + icon("right", 13, "") +
        "<span>" + esc(s.topic) + "</span></div>" +
      '<h1 class="page-head__title">' + esc(s.short) + levelBadge(s.level) + "</h1>" +
      '<p class="page-head__desc">' + esc(s.desc) + "</p>" +
    "</div>";

    html += '<div class="toolbar">' +
      '<button type="button" class="chip is-active" data-filter="all">All <span class="chip__count" data-fc="all"></span></button>' +
      '<button type="button" class="chip" data-filter="starred">' + icon("star", 12, "") + ' Starred <span class="chip__count" data-fc="starred"></span></button>' +
      '<button type="button" class="chip" data-filter="unlearned">To learn <span class="chip__count" data-fc="unlearned"></span></button>' +
      '<button type="button" class="chip" data-filter="flagged">Revisit <span class="chip__count" data-fc="flagged"></span></button>' +
      '<span class="toolbar__spacer"></span>' +
      '<button type="button" class="btn btn--sm" data-act="expand-all">Expand all</button>' +
      '<button type="button" class="btn btn--sm" data-act="collapse-all">Collapse all</button>' +
      '<button type="button" class="btn btn--sm" data-act="shuffle" title="Shuffle this section">' + icon("shuffle", 13) + "Shuffle</button>" +
      '<button type="button" class="btn btn--sm" data-act="print" title="Print this section">' + icon("printer", 13) + "Print</button>" +
    "</div>";

    html += '<div class="qlist">' + s.questions.map(questionCard).join("") + "</div>";

    html += '<nav class="section-nav">' +
      (prev ? '<a class="snav" href="#/' + prev.id + '"><div class="snav__label">Previous</div>' +
        '<div class="snav__title">' + icon("left", 13, "") + " " + esc(prev.short) + "</div></a>" : "<span></span>") +
      (next ? '<a class="snav section-nav__next" href="#/' + next.id + '"><div class="snav__label">Next</div>' +
        '<div class="snav__title">' + esc(next.short) + " " + icon("right", 13, "") + "</div></a>" : "<span></span>") +
    "</nav>";

    el.view.setAttribute("data-accent", s.accent);
    el.view.innerHTML = html;
    ui.sectionId = id;
    ui.filter = "all";
    ui.cursor = -1;
    markActiveNav(id);
    updateFilterCounts();
    document.title = s.short + " — QuickLearning";
    store.last(id);
    window.scrollTo(0, 0);
  }

  function cards() { return $$(".qcard", el.view); }
  function visibleCards() { return cards().filter(function (c) { return !c.hidden; }); }

  function ensureBody(card) {
    var body = $(".qcard__body", card);
    if (body.getAttribute("data-filled")) return body;
    var q = QL.question(ui.sectionId, card.getAttribute("data-qid"));
    body.innerHTML = q ? QL.renderAnswer(q) : "";
    body.setAttribute("data-filled", "1");
    return body;
  }

  function setOpen(card, open) {
    if (open) ensureBody(card);
    card.classList.toggle("is-open", open);
    if (!open) card.classList.remove("is-revealed");
    $(".qcard__head", card).setAttribute("aria-expanded", String(open));
    if (open) store.last(ui.sectionId + "/" + card.getAttribute("data-qid"));
  }

  function toggleCard(card) { setOpen(card, !card.classList.contains("is-open")); }

  function updateFilterCounts() {
    var s = QL.section(ui.sectionId);
    if (!s) return;
    var c = { all: s.questions.length, starred: 0, unlearned: 0, flagged: 0 };
    s.questions.forEach(function (q) {
      if (store.isStarred(q.key)) c.starred++;
      if (!store.isLearned(q.key)) c.unlearned++;
      if (q.flag) c.flagged++;
    });
    Object.keys(c).forEach(function (k) {
      var n = $('[data-fc="' + k + '"]', el.view);
      if (n) n.textContent = c[k];
    });
  }

  function applyFilter(name) {
    ui.filter = name;
    $$(".chip", el.view).forEach(function (ch) {
      ch.classList.toggle("is-active", ch.getAttribute("data-filter") === name);
    });
    var shown = 0;
    cards().forEach(function (card) {
      var key = card.getAttribute("data-key");
      var q = QL.question(ui.sectionId, card.getAttribute("data-qid"));
      var keep = name === "all" ||
        (name === "starred" && store.isStarred(key)) ||
        (name === "unlearned" && !store.isLearned(key)) ||
        (name === "flagged" && !!(q && q.flag));
      card.hidden = !keep;
      if (keep) shown++;
    });

    var empty = $(".empty", el.view);
    if (empty) empty.remove();
    if (!shown) {
      var msg = { starred: "Nothing starred in this section yet — hit the star on any question.",
                  unlearned: "Everything here is marked as learned. Nice.",
                  flagged: "No questions flagged for revisiting in this section." }[name] || "";
      $(".qlist", el.view).insertAdjacentHTML("afterend",
        '<div class="empty"><div class="empty__title">Nothing to show</div>' +
        '<div class="empty__text">' + esc(msg) + "</div></div>");
    }
    ui.cursor = -1;
    setCursor(-1);
  }

  /* ===================================================================== */
  /* Cursor (keyboard navigation)                                           */
  /* ===================================================================== */

  function setCursor(i) {
    var list = visibleCards();
    cards().forEach(function (c) { c.classList.remove("is-cursor"); });
    if (i < 0 || !list.length) { ui.cursor = -1; return; }
    ui.cursor = Math.max(0, Math.min(i, list.length - 1));
    var card = list[ui.cursor];
    card.classList.add("is-cursor");
    card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function moveCursor(delta) {
    var list = visibleCards();
    if (!list.length) return;
    if (ui.cursor < 0) {
      // Start from whichever card is nearest the top of the viewport.
      var top = document.querySelector(".topbar").getBoundingClientRect().bottom;
      var best = 0, bestD = Infinity;
      list.forEach(function (c, i) {
        var d = Math.abs(c.getBoundingClientRect().top - top);
        if (d < bestD) { bestD = d; best = i; }
      });
      setCursor(best);
    } else {
      setCursor(ui.cursor + delta);
    }
  }

  function cursorCard() {
    var list = visibleCards();
    return ui.cursor >= 0 ? list[ui.cursor] : null;
  }

  /* ===================================================================== */
  /* Star / learned                                                         */
  /* ===================================================================== */

  function toggleStar(card) {
    var on = store.toggleStar(card.getAttribute("data-key"));
    var btn = $('[data-act="star"]', card);
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", String(on));
    updateFilterCounts();
    refreshProgress();
    toast(on ? "Starred" : "Star removed");
  }

  function toggleLearn(card) {
    var on = store.toggleLearn(card.getAttribute("data-key"));
    var btn = $('[data-act="learn"]', card);
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", String(on));
    card.classList.toggle("is-learned", on);
    updateFilterCounts();
    refreshProgress();
    toast(on ? "Marked as learned" : "Marked as not learned");
  }

  /* ===================================================================== */
  /* Search                                                                 */
  /* ===================================================================== */

  var searchTimer = null;

  function closeSearch() {
    el.panel.hidden = true;
    ui.results = [];
    ui.resultIdx = -1;
  }

  function runSearch() {
    var raw = el.input.value.trim();
    el.box.classList.toggle("has-value", raw.length > 0);
    if (raw.length < 2) { closeSearch(); return; }

    var results = QL.search.query(raw, 40);
    ui.results = results;
    ui.resultIdx = results.length ? 0 : -1;

    var html = '<div class="search-panel__meta">' +
      (results.length ? results.length + (results.length === 40 ? "+" : "") + " match" + (results.length === 1 ? "" : "es") +
        " · <kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open"
        : "No matches for " + esc(raw)) + "</div>";

    html += results.map(function (r, i) {
      return '<button type="button" class="sresult' + (i === 0 ? " is-cursor" : "") +
          '" data-goto="' + esc(r.q.sectionId + "/" + r.q.id) + '">' +
        '<div class="sresult__q">' + QL.search.mark(r.q.q, raw) + "</div>" +
        '<div class="sresult__meta">' + levelBadge(r.section.level) +
          "<span>" + esc(r.section.short) + "</span>" +
          (store.isLearned(r.q.key) ? "<span>· learned</span>" : "") + "</div>" +
        '<div class="sresult__snippet">' + QL.search.mark(r.snippet, raw) + "</div>" +
      "</button>";
    }).join("");

    el.panel.innerHTML = html;
    el.panel.hidden = false;
  }

  function moveResult(delta) {
    if (!ui.results.length) return;
    ui.resultIdx = (ui.resultIdx + delta + ui.results.length) % ui.results.length;
    $$(".sresult", el.panel).forEach(function (n, i) {
      n.classList.toggle("is-cursor", i === ui.resultIdx);
      if (i === ui.resultIdx) n.scrollIntoView({ block: "nearest" });
    });
  }

  function openResult(idx) {
    var r = ui.results[idx];
    if (!r) return;
    el.input.value = "";
    el.box.classList.remove("has-value");
    closeSearch();
    el.input.blur();
    QL.router.go(r.q.sectionId + "/" + r.q.id);
  }

  /* ===================================================================== */
  /* Flashcard + shuffle + random                                           */
  /* ===================================================================== */

  function applyFlashcard() {
    var on = store.flashcard();
    document.body.classList.toggle("flashcard", on);
    el.flashBtn.classList.toggle("is-on", on);
    el.flashBtn.setAttribute("aria-pressed", String(on));
    el.flashBtn.title = (on ? "Leave" : "Enter") + " flashcard mode  (F)";
  }

  function toggleFlashcard() {
    store.flashcard(!store.flashcard());
    applyFlashcard();
    toast(store.flashcard() ? "Flashcard mode on — answers are hidden" : "Flashcard mode off");
  }

  function shuffleSection() {
    var list = $(".qlist", el.view);
    if (!list) return;
    var kids = $$(".qcard", list);
    for (var i = kids.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      list.appendChild(kids[j]);
      kids.splice(j, 1);
    }
    if (kids[0]) list.appendChild(kids[0]);
    setCursor(-1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast("Shuffled");
  }

  function randomQuestion() {
    var all = QL.allQuestions();
    var q = all[Math.floor(Math.random() * all.length)];
    QL.router.go(q.sectionId + "/" + q.id);
  }

  /* ===================================================================== */
  /* Printing                                                               */
  /* ===================================================================== */

  function printSection() {
    cards().forEach(function (c) { ensureBody(c); });
    window.print();
  }

  function printAll() {
    var host = document.createElement("div");
    host.className = "print-only";
    host.id = "printAll";
    host.innerHTML = QL.sections.map(function (s) {
      return '<div data-accent="' + esc(s.accent) + '">' +
        '<h2 class="print-section-title">' + esc(s.short) + "</h2>" +
        s.questions.map(function (q, i) {
          return '<article class="qcard is-open"><div class="qcard__top"><div class="qcard__head">' +
            '<span class="qcard__num">' + (i + 1) + "</span>" +
            '<span class="qcard__main"><span class="qcard__q">' + esc(q.q) + "</span></span>" +
            "</div></div>" +
            '<div class="qcard__wrap"><div class="qcard__clip"><div class="qcard__body">' +
              QL.renderAnswer(q) + "</div></div></div></article>";
        }).join("") + "</div>";
    }).join("");

    el.content.appendChild(host);
    document.body.classList.add("printing-all");

    var cleanup = function () {
      document.body.classList.remove("printing-all");
      if (host.parentNode) host.parentNode.removeChild(host);
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  }

  /* ===================================================================== */
  /* Clipboard                                                              */
  /* ===================================================================== */

  function copyText(text, what) {
    what = what || "Code";
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(what + " copied"); },
        function () { legacyCopy(text, what); });
    } else {
      legacyCopy(text, what);
    }
  }

  function legacyCopy(text, what) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    toast(ok ? what + " copied" : "Copy failed — select the text manually");
  }

  /* ===================================================================== */
  /* Shortcuts modal + drawer                                               */
  /* ===================================================================== */

  var SHORTCUTS = [
    ["Focus search", ["Ctrl", "K"]], ["Focus search", ["/"]],
    ["Next / previous question", ["J"], ["K"]],
    ["Expand or collapse", ["Enter"]],
    ["Star the current question", ["S"]],
    ["Mark learned", ["L"]],
    ["Flashcard mode", ["F"]],
    ["Light / dark theme", ["T"]],
    ["Random question", ["R"]],
    ["Back to home", ["H"]],
    ["Close / clear", ["Esc"]],
    ["This help", ["?"]]
  ];

  function showShortcuts() {
    var rows = SHORTCUTS.map(function (row) {
      var combos = row.slice(1).map(function (keys) {
        return keys.map(function (k) { return "<kbd>" + esc(k) + "</kbd>"; }).join("");
      }).join(' <span style="color:var(--text-faint)">or</span> ');
      return '<div class="keys__row"><span class="keys__desc">' + esc(row[0]) + "</span>" +
        '<span class="keys__combo">' + combos + "</span></div>";
    }).join("");

    el.modal.innerHTML = '<div class="modal-scrim" data-act="close-modal">' +
      '<div class="modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">' +
        '<div class="modal__head"><h2 class="modal__title">Keyboard shortcuts</h2>' +
        '<button type="button" class="btn btn--icon btn--ghost" data-act="close-modal" aria-label="Close">' + icon("x", 16) + "</button></div>" +
        '<div class="keys">' + rows + "</div>" +
      "</div></div>";
    el.modal.hidden = false;
  }

  function closeModal() { el.modal.hidden = true; el.modal.innerHTML = ""; }

  function setDrawer(open) {
    el.sidebar.classList.toggle("is-open", open);
    el.scrim.classList.toggle("is-open", open);
  }

  /* ===================================================================== */
  /* Events                                                                 */
  /* ===================================================================== */

  function onViewClick(e) {
    var copyBtn = e.target.closest(".js-copy");
    if (copyBtn) {
      var pre = copyBtn.closest(".codeblock").querySelector("pre code");
      copyText(pre ? pre.textContent : "");
      return;
    }

    var act = e.target.closest("[data-act]");
    if (act) {
      var name = act.getAttribute("data-act");
      var card = act.closest(".qcard");
      if (name === "copy-q" && card) return copyText($(".qcard__q", card).textContent, "Question");
      if (name === "star" && card) return toggleStar(card);
      if (name === "learn" && card) return toggleLearn(card);
      if (name === "reveal" && card) {
        setOpen(card, true);              // guard: reveal implies open
        card.classList.add("is-revealed");
        return;
      }
      if (name === "expand-all") { visibleCards().forEach(function (c) { setOpen(c, true); c.classList.add("is-revealed"); }); return; }
      if (name === "collapse-all") { cards().forEach(function (c) { setOpen(c, false); }); return; }
      if (name === "shuffle") return shuffleSection();
      if (name === "print") return printSection();
      if (name === "print-all") return printAll();
      if (name === "random") return randomQuestion();
      if (name === "shortcuts") return showShortcuts();
    }

    var chip = e.target.closest(".chip[data-filter]");
    if (chip) return applyFilter(chip.getAttribute("data-filter"));

    var head = e.target.closest(".qcard__head");
    if (head) {
      // Finishing a text selection inside the header should not toggle the card.
      var sel = window.getSelection && window.getSelection();
      if (sel && !sel.isCollapsed && head.contains(sel.anchorNode)) return;
      var c2 = head.closest(".qcard");
      toggleCard(c2);
      var list = visibleCards();
      setCursor(list.indexOf(c2));
      if (store.flashcard() && c2.classList.contains("is-open")) c2.classList.remove("is-revealed");
    }
  }

  function onKey(e) {
    var tag = (e.target.tagName || "").toLowerCase();
    var typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault(); el.input.focus(); el.input.select(); return;
    }

    if (e.key === "Escape") {
      if (!el.modal.hidden) return closeModal();
      if (!el.panel.hidden) { closeSearch(); el.input.blur(); return; }
      if (el.sidebar.classList.contains("is-open")) return setDrawer(false);
      if (typing) { el.input.value = ""; el.box.classList.remove("has-value"); el.input.blur(); return; }
      return setCursor(-1);
    }

    if (typing) {
      if (e.target === el.input && !el.panel.hidden) {
        if (e.key === "ArrowDown") { e.preventDefault(); return moveResult(1); }
        if (e.key === "ArrowUp") { e.preventDefault(); return moveResult(-1); }
        if (e.key === "Enter") { e.preventDefault(); return openResult(ui.resultIdx); }
      }
      return;
    }

    if (e.altKey || e.ctrlKey || e.metaKey) return;

    switch (e.key) {
      case "/":
        e.preventDefault(); el.input.focus(); break;
      case "j": case "J":
        e.preventDefault(); moveCursor(1); break;
      case "k": case "K":
        e.preventDefault(); moveCursor(-1); break;
      case "Enter": case " ":
        if (cursorCard()) {
          e.preventDefault();
          var cc = cursorCard();
          if (store.flashcard() && cc.classList.contains("is-open") && !cc.classList.contains("is-revealed")) {
            cc.classList.add("is-revealed");
          } else {
            toggleCard(cc);
          }
        }
        break;
      case "s": case "S":
        if (cursorCard()) { e.preventDefault(); toggleStar(cursorCard()); } break;
      case "l": case "L":
        if (cursorCard()) { e.preventDefault(); toggleLearn(cursorCard()); } break;
      case "f": case "F":
        e.preventDefault(); toggleFlashcard(); break;
      case "t": case "T":
        e.preventDefault(); toggleTheme(); break;
      case "r": case "R":
        e.preventDefault(); randomQuestion(); break;
      case "h": case "H":
        e.preventDefault(); QL.router.home(); break;
      case "?":
        e.preventDefault(); showShortcuts(); break;
    }
  }

  /* ===================================================================== */
  /* Routing                                                                */
  /* ===================================================================== */

  function handleRoute(route) {
    setDrawer(false);
    closeSearch();

    if (route.view === "home") { renderHome(); refreshProgress(); return; }

    if (ui.sectionId !== route.sectionId) renderSection(route.sectionId);
    refreshProgress();

    if (route.questionId) {
      var card = $('.qcard[data-qid="' + CSS.escape(route.questionId) + '"]', el.view);
      if (card) {
        setOpen(card, true);
        if (store.flashcard()) card.classList.add("is-revealed");
        setCursor(visibleCards().indexOf(card));
        // Let the accordion settle before scrolling to it.
        requestAnimationFrame(function () {
          card.scrollIntoView({ block: "start", behavior: "smooth" });
        });
      }
    }
  }

  /* ===================================================================== */
  /* Boot                                                                   */
  /* ===================================================================== */

  function boot() {
    el.sidebar = $("#sidebar");
    el.scrim = $("#scrim");
    el.view = $("#view");
    el.content = $("#content");
    el.input = $("#searchInput");
    el.box = $("#searchBox");
    el.panel = $("#searchPanel");
    el.themeBtn = $("#themeBtn");
    el.flashBtn = $("#flashBtn");
    el.modal = $("#modal");
    el.toast = $("#toast");

    if (!QL.sections.length) {
      el.view.innerHTML = '<div class="empty"><div class="empty__title">No content loaded</div>' +
        '<div class="empty__text">The files under <code>data/</code> did not register any sections.</div></div>';
      return;
    }

    // Icons that live in the static shell.
    $("#searchIcon").innerHTML = icon("search", 15, "");
    $("#clearBtn").innerHTML = icon("x", 14, "");
    $("#menuBtn").innerHTML = icon("menu", 18);
    $("#flashBtn").innerHTML = icon("cards", 16);
    $("#helpBtn").innerHTML = icon("keyboard", 16);
    $("#printBtn").innerHTML = icon("printer", 16);

    QL.search.build();
    renderSidebar();
    applyTheme();
    applyFlashcard();

    el.view.addEventListener("click", onViewClick);
    document.addEventListener("keydown", onKey);

    el.input.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(runSearch, 120);
    });
    el.input.addEventListener("focus", function () { if (el.input.value.trim().length > 1) runSearch(); });

    el.panel.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-goto]");
      if (!btn) return;
      openResult($$(".sresult", el.panel).indexOf(btn));
    });

    $("#clearBtn").addEventListener("click", function () {
      el.input.value = "";
      el.box.classList.remove("has-value");
      closeSearch();
      el.input.focus();
    });

    document.addEventListener("click", function (e) {
      if (!el.panel.hidden && !e.target.closest("#searchWrap")) closeSearch();
      var closer = e.target.closest('[data-act="close-modal"]');
      if (closer && (!closer.classList.contains("modal-scrim") || !e.target.closest(".modal"))) closeModal();
    });

    el.themeBtn.addEventListener("click", toggleTheme);
    el.flashBtn.addEventListener("click", toggleFlashcard);
    $("#helpBtn").addEventListener("click", showShortcuts);
    $("#printBtn").addEventListener("click", function () {
      if (ui.sectionId) printSection(); else printAll();
    });
    $("#menuBtn").addEventListener("click", function () {
      setDrawer(!el.sidebar.classList.contains("is-open"));
    });
    el.scrim.addEventListener("click", function () { setDrawer(false); });
    el.sidebar.addEventListener("click", function (e) {
      if (e.target.closest(".nav-item")) setDrawer(false);
    });

    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var onScheme = function () { if (store.theme() === "auto") applyTheme(); };
      if (mq.addEventListener) mq.addEventListener("change", onScheme);
      else if (mq.addListener) mq.addListener(onScheme);
    }

    QL.router.start(handleRoute);
    refreshProgress();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
