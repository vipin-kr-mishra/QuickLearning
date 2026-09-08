/* ==========================================================================
   QuickLearning — global namespace + persisted state
   Loaded first: data/*.js files call QL.register(), so it must exist by then.
   ========================================================================== */
(function () {
  "use strict";

  var QL = (window.QL = window.QL || {});

  QL.sections = [];
  QL.byId = Object.create(null);

  /** Called by every file in data/. */
  QL.register = function (section) {
    if (!section || !section.id) return;
    section.questions = section.questions || [];
    QL.sections.push(section);
    QL.byId[section.id] = section;
    section.questions.forEach(function (q, i) {
      q.n = i + 1;
      q.sectionId = section.id;
      q.key = section.id + "/" + q.id;
    });
  };

  QL.section = function (id) { return QL.byId[id] || null; };

  QL.question = function (sectionId, qid) {
    var s = QL.byId[sectionId];
    if (!s) return null;
    for (var i = 0; i < s.questions.length; i++) {
      if (s.questions[i].id === qid) return s.questions[i];
    }
    return null;
  };

  QL.allQuestions = function () {
    return QL.sections.reduce(function (acc, s) { return acc.concat(s.questions); }, []);
  };

  /* ===== Persisted state ===== */
  var KEY = "ql.v1";
  var DEFAULTS = { theme: "auto", flashcard: false, starred: {}, learned: {}, last: null };

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      var parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULTS, parsed && typeof parsed === "object" ? parsed : {});
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  var state = read();

  function write() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  }

  function toggleIn(bag, key) {
    if (state[bag][key]) { delete state[bag][key]; }
    else { state[bag][key] = Date.now(); }
    write();
    return !!state[bag][key];
  }

  QL.store = {
    get state() { return state; },

    theme: function (v) {
      if (v === undefined) return state.theme;
      state.theme = v; write(); return v;
    },

    flashcard: function (v) {
      if (v === undefined) return !!state.flashcard;
      state.flashcard = !!v; write(); return state.flashcard;
    },

    last: function (v) {
      if (v === undefined) return state.last;
      state.last = v; write(); return v;
    },

    isStarred:  function (key) { return !!state.starred[key]; },
    isLearned:  function (key) { return !!state.learned[key]; },
    toggleStar: function (key) { return toggleIn("starred", key); },
    toggleLearn: function (key) { return toggleIn("learned", key); },

    /** { learned, starred, total } for one section, or for everything. */
    stats: function (sectionId) {
      var qs = sectionId ? (QL.byId[sectionId] || { questions: [] }).questions : QL.allQuestions();
      var learned = 0, starred = 0;
      qs.forEach(function (q) {
        if (state.learned[q.key]) learned++;
        if (state.starred[q.key]) starred++;
      });
      return { learned: learned, starred: starred, total: qs.length };
    },

    reset: function () {
      state = Object.assign({}, DEFAULTS, { theme: state.theme });
      state.starred = {}; state.learned = {};
      write();
    }
  };
})();
