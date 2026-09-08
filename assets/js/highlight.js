/* ==========================================================================
   QuickLearning — dependency-free syntax highlighting
   A rule list is compiled into one master regex; the first alternative that
   matches at a position wins, so tokens can never corrupt each other.
   Every rule pattern MUST use non-capturing groups only — the compiler
   relies on one capture group per rule to identify the winner.
   ========================================================================== */
(function () {
  "use strict";

  var QL = (window.QL = window.QL || {});

  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) { return ESC[c]; });
  }

  function build(rules) {
    var re = new RegExp(
      rules.map(function (r) { return "(" + r.re.source + ")"; }).join("|"),
      "gm"
    );
    return function (code) {
      var out = "", last = 0, m;
      re.lastIndex = 0;
      while ((m = re.exec(code)) !== null) {
        if (m[0] === "") { re.lastIndex++; continue; }
        if (m.index > last) out += esc(code.slice(last, m.index));
        var cls = "t-punc";
        for (var i = 0; i < rules.length; i++) {
          if (m[i + 1] !== undefined) { cls = rules[i].cls; break; }
        }
        out += '<span class="' + cls + '">' + esc(m[0]) + "</span>";
        last = m.index + m[0].length;
      }
      return out + esc(code.slice(last));
    };
  }

  /* Shared fragments ------------------------------------------------------ */
  var CS_KEY = /\b(?:abstract|as|async|await|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|dynamic|else|enum|event|explicit|extern|false|file|finally|fixed|float|for|foreach|get|global|goto|if|implicit|in|init|int|interface|internal|is|lock|long|nameof|namespace|new|not|null|object|operator|out|override|params|partial|private|protected|public|readonly|record|ref|required|return|sbyte|scoped|sealed|set|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|value|var|virtual|void|volatile|when|where|while|with|yield)\b/;

  var CS_COMMENT = /\/\/[^\n]*|\/\*[\s\S]*?\*\//;
  var CS_STRING  = /\$?@"(?:[^"]|"")*"|\$?"(?:\\.|[^"\\\n])*"/;
  var CS_CHAR    = /'(?:\\.|[^'\\])'/;
  var NUMBER     = /\b(?:0[xX][0-9a-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)(?:[fFdDmMuUlL]{1,2})?\b/;

  /* Language definitions -------------------------------------------------- */
  var HL = {
    csharp: build([
      { cls: "t-com",  re: CS_COMMENT },
      { cls: "t-str",  re: CS_STRING },
      { cls: "t-str",  re: CS_CHAR },
      { cls: "t-pre",  re: /^[ \t]*#(?:region|endregion|if|else|elif|endif|define|undef|pragma|nullable|line|warning|error)[^\n]*/ },
      { cls: "t-attr", re: /^[ \t]*\[[A-Za-z_][\w.]*(?:\((?:[^()\n]|\([^()\n]*\))*\))?\]/ },
      { cls: "t-num",  re: NUMBER },
      { cls: "t-key",  re: CS_KEY },
      // PascalCase identifiers that are not immediately invoked read as types.
      { cls: "t-type", re: /\b[A-Z][A-Za-z0-9_]*\b(?!\s*\()/ }
    ]),

    razor: build([
      { cls: "t-com",  re: /@\*[\s\S]*?\*@|<!--[\s\S]*?-->|\/\/[^\n]*/ },
      { cls: "t-str",  re: /\$?@"(?:[^"]|"")*"|\$?"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/ },
      { cls: "t-key",  re: /@(?:model|using|inject|inherits|functions|section|await|addTagHelper|page|namespace|attribute|typeparam|implements|code|foreach|for|while|switch|if|else|try|catch|finally|\{|\()/ },
      { cls: "t-attr", re: /@[A-Za-z_][\w.]*/ },
      { cls: "t-type", re: /<\/?[A-Za-z][\w:.-]*|\/?>/ },
      { cls: "t-num",  re: NUMBER },
      { cls: "t-key",  re: CS_KEY }
    ]),

    xml: build([
      { cls: "t-com",  re: /<!--[\s\S]*?-->/ },
      { cls: "t-str",  re: /"[^"\n]*"|'[^'\n]*'/ },
      { cls: "t-type", re: /<[?\/!]?[A-Za-z_][\w:.-]*|[?\/]?>/ },
      { cls: "t-attr", re: /\b[A-Za-z_][\w:.-]*(?=\s*=)/ }
    ]),

    json: build([
      { cls: "t-attr", re: /"(?:\\.|[^"\\])*"(?=\s*:)/ },
      { cls: "t-str",  re: /"(?:\\.|[^"\\])*"/ },
      { cls: "t-key",  re: /\b(?:true|false|null)\b/ },
      { cls: "t-num",  re: NUMBER }
    ]),

    sql: build([
      { cls: "t-com", re: /--[^\n]*|\/\*[\s\S]*?\*\// },
      { cls: "t-str", re: /'(?:''|[^'])*'/ },
      { cls: "t-key", re: /\b(?:SELECT|FROM|WHERE|JOIN|INNER|LEFT|RIGHT|OUTER|ON|GROUP|BY|ORDER|HAVING|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|ALTER|DROP|AS|AND|OR|NOT|NULL|IS|IN|EXISTS|COUNT|SUM|AVG|MIN|MAX|DISTINCT|TOP|CASE|WHEN|THEN|ELSE|END|WITH|NOLOCK|UNION|ALL|ASC|DESC)\b/i },
      { cls: "t-num", re: NUMBER }
    ]),

    bash: build([
      { cls: "t-com", re: /#[^\n]*/ },
      { cls: "t-str", re: /"(?:\\.|[^"\\])*"|'[^']*'/ },
      { cls: "t-key", re: /^[ \t]*(?:dotnet|npm|npx|node|git|cd|nuget|Install-Package|Update-Database|Add-Migration)\b/ }
    ]),

    text: function (code) { return esc(code); }
  };

  HL.cs = HL.csharp;
  HL.cshtml = HL.razor;
  HL.html = HL.xml;
  HL.config = HL.xml;

  /** Highlight `code` for `lang`; always returns HTML-escaped markup. */
  QL.highlight = function (code, lang) {
    var fn = HL[String(lang || "csharp").toLowerCase()] || HL.text;
    try { return fn(code); } catch (e) { return esc(code); }
  };

  QL.escapeHtml = esc;
})();
