/* ==========================================================================
   QuickLearning — icons + answer-block renderer
   Answers are stored as structured blocks (see data/manifest.js); this file
   is the only place that turns them into markup. Every string is escaped at
   the leaf, then two inline transforms are applied: `code` and **bold**.
   ========================================================================== */
(function () {
  "use strict";

  var QL = (window.QL = window.QL || {});
  var esc = QL.escapeHtml;

  /* ===== Icons (stroked, 24x24 viewBox) ================================== */
  var PATHS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.9"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    cards: '<rect x="3" y="7" width="13" height="14" rx="2"/><path d="M8 4h10a2 2 0 0 1 2 2v11"/>',
    printer: '<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M7 14h10v7H7z"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    shuffle: '<path d="M17 3h4v4M21 3l-6.5 6.5M3 21l6.5-6.5M17 21h4v-4M3 3l18 18"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 4.5L21 19H3z"/><path d="M12 10v4M12 17h.01"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8.5 8.5h.01M15.5 15.5h.01M12 12h.01"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4h4"/>'
  };

  QL.icon = function (name, size, cls) {
    var d = PATHS[name];
    if (!d) return "";
    return '<svg class="' + (cls || "btn__icon") + '" width="' + (size || 16) + '" height="' + (size || 16) +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  };

  /* ===== Inline markup =================================================== */
  QL.inline = function (s) {
    var codes = [];
    var out = esc(s).replace(/`([^`]+)`/g, function (_, c) {
      codes.push(c);
      return "\u0000" + (codes.length - 1) + "\u0000";
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return out.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return "<code>" + codes[+i] + "</code>";
    });
  };

  var inline = QL.inline;

  function listItems(items) {
    return items.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("");
  }

  function codeBlock(b) {
    var lang = b.lang || "csharp";
    var label = { csharp: "C#", cs: "C#", razor: "Razor", cshtml: "Razor", xml: "XML",
                  config: "Config", json: "JSON", sql: "SQL", bash: "Shell", text: "Text",
                  typescript: "TypeScript", ts: "TypeScript" }[lang] || lang;
    return '<div class="codeblock">' +
      '<div class="codeblock__bar">' +
        '<span class="codeblock__lang">' + esc(label) + "</span>" +
        '<span class="codeblock__caption">' + (b.caption ? esc(b.caption) : "") + "</span>" +
        '<button type="button" class="btn btn--sm btn--ghost js-copy" title="Copy code">' +
          QL.icon("copy", 13) + "<span>Copy</span></button>" +
      "</div>" +
      "<pre><code>" + QL.highlight(b.code.replace(/^\n+|\s+$/g, ""), lang) + "</code></pre>" +
    "</div>";
  }

  function noteBlock(b) {
    var warn = b.kind === "warn";
    return '<div class="ans-note' + (warn ? " ans-note--warn" : "") + '">' +
      '<span class="ans-note__icon">' + QL.icon(warn ? "alert" : "info", 15, "") + "</span>" +
      "<div>" + inline(b.note) + "</div></div>";
  }

  function tableBlock(t) {
    var head = "<tr>" + t.head.map(function (h) { return "<th>" + inline(h) + "</th>"; }).join("") + "</tr>";
    var body = t.rows.map(function (r) {
      return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>";
    }).join("");
    return '<div class="ans-table-wrap"><table class="ans-table"><thead>' + head +
      "</thead><tbody>" + body + "</tbody></table></div>";
  }

  /** Render an array of answer blocks to HTML. */
  QL.renderBlocks = function (blocks) {
    return (blocks || []).map(function (b) {
      if (b.p) return "<p>" + inline(b.p) + "</p>";
      if (b.ul) return "<ul>" + listItems(b.ul) + "</ul>";
      if (b.ol) return "<ol>" + listItems(b.ol) + "</ol>";
      if (b.code) return codeBlock(b);
      if (b.note) return noteBlock(b);
      if (b.table) return tableBlock(b.table);
      return "";
    }).join("");
  };

  /** Full answer body: the summary callout, the blocks, then any cross-links. */
  QL.renderAnswer = function (q) {
    var html = '<div class="answer">';
    if (q.tldr) {
      html += '<div class="answer__tldr">' +
        '<span class="answer__tldr-key">In short</span>' +
        '<span class="answer__tldr-text">' + inline(q.tldr) + "</span></div>";
    }
    html += QL.renderBlocks(q.a);
    if (q.seeAlso && q.seeAlso.length) {
      var links = q.seeAlso.map(function (ref) {
        var parts = String(ref).split("/");
        var target = QL.question(parts[0], parts[1]);
        var s = QL.section(parts[0]);
        if (!target || !s) return "";
        return '<a class="seealso-link" href="#/' + ref + '">' +
          QL.icon("right", 12, "") + esc(s.short || s.title) + " · " + esc(target.q) + "</a>";
      }).join("");
      if (links) html += '<div class="qcard__seealso"><span>See also</span>' + links + "</div>";
    }
    return html + "</div>";
  };

  /** Flattened plain text of a question, used to build the search index. */
  QL.plainText = function (q) {
    var out = [q.q, q.tldr || ""];
    (q.a || []).forEach(function (b) {
      if (b.p) out.push(b.p);
      else if (b.ul) out.push(b.ul.join(" "));
      else if (b.ol) out.push(b.ol.join(" "));
      else if (b.code) out.push(b.code);
      else if (b.note) out.push(b.note);
      else if (b.table) {
        out.push(b.table.head.join(" "));
        b.table.rows.forEach(function (r) { out.push(r.join(" ")); });
      }
    });
    if (q.tags) out.push(q.tags.join(" "));
    return out.join(" · ").replace(/[`*]/g, "");
  };
})();
