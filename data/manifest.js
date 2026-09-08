/* ==========================================================================
   QuickLearning — section groups + content authoring guide
   --------------------------------------------------------------------------
   HOW TO ADD A QUESTION
     1. Open the right file in this folder (e.g. csharp-basic.js).
     2. Add an object to its `questions` array:

          {
            id:   "unique-slug-within-this-file",   // becomes #/section/slug
            q:    "The question exactly as asked?",
            tldr: "One sentence you could say out loud in an interview.",
            tags: ["generics", "memory"],           // optional, first 3 shown
            flag: "doubt",                          // optional, adds a Revisit badge
            seeAlso: ["csharp-advanced/span-t"],    // optional cross-links
            a: [ ...answer blocks... ]
          }

     3. Answer blocks, in any order and any number:

          { p: "A paragraph. Supports `inline code` and **bold**." }
          { ul: ["bullet", "bullet"] }              // or { ol: [...] } for steps
          { code: `public class Foo { }`, lang: "csharp", caption: "optional" }
          { note: "An aside.", kind: "tip" }        // kind: "tip" (default) or "warn"
          { table: { head: ["A", "B"], rows: [["1", "2"], ["3", "4"]] } }

        lang can be: csharp, razor, xml, json, sql, bash, text.

   AUTHORING RULES (these keep escaping from ever biting)
     - Prose strings use DOUBLE quotes, so they can contain `backticks`.
     - `code` values use TEMPLATE LITERALS, because C# contains no backticks.
     - Inside a code template literal, never write a backslash or the sequence
       dollar-brace — JavaScript would interpret them. C# rarely needs either.

   HOW TO ADD A WHOLE NEW TOPIC
     1. Create data/<your-topic>.js, copying the QL.register({...}) header below.
     2. Add a <script src="data/<your-topic>.js"> line in index.html, before
        assets/js/app.js.
     3. Add the section id to a group in QL.groups here (or add a new group).
   ========================================================================== */
(function () {
  "use strict";

  window.QL.groups = [
    {
      id: "csharp",
      title: "C#",
      accent: "violet",
      sections: ["csharp-basic", "csharp-intermediate", "csharp-advanced"]
    },
    {
      id: "mvc",
      title: "ASP.NET MVC",
      accent: "blue",
      sections: ["mvc-basic", "mvc-intermediate", "mvc-advanced"]
    },
    {
      id: "linq",
      title: "LINQ",
      accent: "teal",
      sections: ["linq"]
    }
  ];
})();
