/* ==========================================================================
   QuickLearning — in-memory search
   One flat index over question text, summary and flattened answer body.
   All query tokens must match (AND); matches are weighted by where they hit.
   ========================================================================== */
(function () {
  "use strict";

  var QL = (window.QL = window.QL || {});
  var index = [];

  function norm(s) { return String(s).toLowerCase(); }

  function tokenize(s) {
    return norm(s).split(/[^a-z0-9#+_.<>]+/).filter(function (t) { return t.length > 0; });
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  QL.search = {
    build: function () {
      index = QL.allQuestions().map(function (q) {
        var plain = QL.plainText(q);
        return {
          q: q,
          section: QL.section(q.sectionId),
          question: norm(q.q),
          tldr: norm(q.tldr || ""),
          body: norm(plain),
          plain: plain
        };
      });
      return index.length;
    },

    size: function () { return index.length; },

    /** Ranked results for a raw query string. */
    query: function (raw, limit) {
      var tokens = tokenize(raw || "");
      if (!tokens.length) return [];
      var phrase = norm(raw).trim();
      var hits = [];

      for (var i = 0; i < index.length; i++) {
        var e = index[i], score = 0, all = true;

        for (var t = 0; t < tokens.length; t++) {
          var tok = tokens[t];
          var inQ = e.question.indexOf(tok);
          var inT = e.tldr.indexOf(tok);
          var inB = e.body.indexOf(tok);

          if (inQ < 0 && inT < 0 && inB < 0) { all = false; break; }

          if (inQ >= 0) {
            score += 10;
            // Whole-word and start-of-question matches rank higher.
            if (new RegExp("\\b" + escapeRe(tok) + "\\b").test(e.question)) score += 6;
            if (inQ === 0) score += 4;
          }
          if (inT >= 0) score += 4;
          if (inB >= 0) score += 1;
        }

        if (!all) continue;
        if (phrase.length > 2 && e.question.indexOf(phrase) >= 0) score += 14;
        if (e.q.flag) score += 1;

        hits.push({ q: e.q, section: e.section, score: score, plain: e.plain });
      }

      hits.sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return a.q.q.length - b.q.q.length;
      });

      var out = hits.slice(0, limit || 30);
      out.forEach(function (h) { h.snippet = snippet(h.plain, tokens); });
      return out;
    },

    /** Escape `text` and wrap every token occurrence in <mark>. */
    mark: function (text, raw) {
      var tokens = typeof raw === "string" ? tokenize(raw) : raw;
      var out = QL.escapeHtml(text);
      if (!tokens || !tokens.length) return out;
      var re = new RegExp("(" + tokens.map(escapeRe).sort(function (a, b) {
        return b.length - a.length;
      }).join("|") + ")", "gi");
      return out.replace(re, "<mark>$&</mark>");
    },

    tokenize: tokenize
  };

  /** A ~150-char window of the answer text around the first token hit. */
  function snippet(plain, tokens) {
    var low = norm(plain), at = -1;
    for (var i = 0; i < tokens.length && at < 0; i++) at = low.indexOf(tokens[i]);
    if (at < 0) at = 0;
    var start = Math.max(0, at - 55);
    var text = plain.slice(start, start + 165).replace(/\s+/g, " ").trim();
    return (start > 0 ? "… " : "") + text + (start + 165 < plain.length ? " …" : "");
  }
})();
