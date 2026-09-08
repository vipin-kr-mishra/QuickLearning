/* ==========================================================================
   QuickLearning — hash routing
   Hash rather than the History API on purpose: the same files then work from
   file:// and from a GitHub Pages sub-path with no server rewrite rules.
     #/                             home dashboard
     #/csharp-basic                 section
     #/csharp-basic/what-is-csharp  section, scrolled to and expanded
   ========================================================================== */
(function () {
  "use strict";

  var QL = (window.QL = window.QL || {});
  var handler = null;

  function parse(hash) {
    var h = String(hash === undefined ? window.location.hash : hash).replace(/^#\/?/, "");
    if (!h) return { view: "home" };
    var parts = h.split("/").filter(Boolean).map(decodeURIComponent);
    if (!parts.length) return { view: "home" };
    return { view: "section", sectionId: parts[0], questionId: parts[1] || null };
  }

  QL.router = {
    parse: parse,

    current: function () { return parse(); },

    /** Navigate. `replace` avoids adding a history entry. */
    go: function (path, replace) {
      var target = "#/" + String(path || "").replace(/^#?\/?/, "");
      if (window.location.hash === target) {
        if (handler) handler(parse());
        return;
      }
      if (replace && window.history && window.history.replaceState) {
        window.history.replaceState(null, "", target);
        if (handler) handler(parse());
      } else {
        window.location.hash = target;
      }
    },

    home: function () { QL.router.go(""); },

    start: function (fn) {
      handler = fn;
      window.addEventListener("hashchange", function () { handler(parse()); });
      handler(parse());
    }
  };
})();
