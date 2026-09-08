/* LINQ. 10 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "linq",
  topic: "LINQ",
  level: "Core",
  short: "LINQ",
  accent: "teal",
  desc: "Querying collections and databases: execution semantics, the operators that matter, and the IEnumerable/IQueryable distinction that decides where your query actually runs.",
  questions: [

    {
      id: "what-is-linq",
      q: "What is LINQ, and how does it improve data querying in C#?",
      tldr: "Language Integrated Query — a uniform, strongly typed set of query operators built into C#, usable over objects, databases and XML with the same syntax.",
      tags: ["fundamentals"],
      seeAlso: ["csharp-basic/linq-intro", "linq/ienumerable-vs-iqueryable"],
      a: [
        { ul: [
          "**One syntax, many sources** — LINQ to Objects, LINQ to Entities (EF), LINQ to XML, LINQ to JSON via providers.",
          "**Compile-time checking and IntelliSense.** A typo in a SQL string fails at runtime; a typo in a LINQ query fails at build.",
          "**Declarative** — you say *what* you want, not how to loop. Filtering, grouping and ordering read in one chain.",
          "**Composable** — build a query in pieces and combine them, because nothing executes until you enumerate.",
          "**Refactor-safe** — renaming a property updates the query; a SQL string silently rots."
        ] },
        { code: `// Without LINQ
var result = new List<string>();
foreach (var o in orders)
    if (o.Total > 100 && o.Status == Status.Shipped)
        result.Add(o.Reference);
result.Sort();

// With LINQ
var result = orders
    .Where(o => o.Total > 100 && o.Status == Status.Shipped)
    .OrderBy(o => o.Reference)
    .Select(o => o.Reference)
    .ToList();`, lang: "csharp" },
        { p: "LINQ rests on four C# features added specifically for it: **extension methods**, **lambda expressions**, **anonymous types** and **expression trees**." },
        { note: "The honest caveat worth mentioning: LINQ to Objects is slightly slower than a hand-written loop (delegate calls and iterator allocations), and against a database a careless query can generate terrible SQL. Readability usually wins, but you should know where to look when it does not.", kind: "tip" }
      ]
    },

    {
      id: "deferred-vs-immediate-execution",
      q: "Explain the difference between deferred execution and immediate execution in LINQ.",
      tldr: "Deferred means the query is only a recipe until you enumerate it; immediate means an operator runs the query and returns a concrete result right away.",
      tags: ["execution"],
      a: [
        { table: { head: ["", "Deferred", "Immediate"], rows: [
          ["Runs", "When enumerated (`foreach`, `ToList`)", "At the call"],
          ["Returns", "`IEnumerable<T>` / `IQueryable<T>`", "A value or a materialised collection"],
          ["Operators", "`Where`, `Select`, `OrderBy`, `Take`, `Skip`, `GroupBy`, `Join`", "`ToList`, `ToArray`, `ToDictionary`, `Count`, `Sum`, `First`, `Any`, `Max`"],
          ["Re-enumerating", "**Runs the query again**", "Reuses the stored result"]
        ] } },
        { code: `var query = numbers.Where(n => n > 2);   // nothing has run yet

numbers.Add(10);                        // the source changed...

foreach (var n in query) { }            // ...and 10 IS included — runs now

var list = numbers.Where(n => n > 2).ToList();   // runs immediately
numbers.Add(20);                                  // list is unaffected`, lang: "csharp" },
        { p: "**Why deferred execution is good:** you can compose a query in stages, and only the final shape is executed — so a database only ever sees one optimised statement." },
        { code: `IQueryable<Order> q = _db.Orders;

if (from.HasValue) q = q.Where(o => o.CreatedOn >= from);
if (status != null) q = q.Where(o => o.Status == status);

var page = q.OrderBy(o => o.CreatedOn)
            .Skip(skip).Take(size)
            .ToList();          // ONE SQL query, with all the filters applied`, lang: "csharp" },
        { note: "The two traps. **Multiple enumeration**: iterating a deferred query twice runs it twice — twice the database round trips. **Captured variables**: the lambda reads the variable's value *at execution time*, not at definition time, which surprises people inside loops. `ToList()` at the point you are done composing fixes both.", kind: "warn" }
      ]
    },

    {
      id: "select-vs-selectmany",
      q: "What is the difference between Select and SelectMany in LINQ? Provide examples.",
      tldr: "Select maps each element to one result, producing a sequence of sequences when the result is a collection; SelectMany maps and then flattens into a single sequence.",
      tags: ["operators", "projection"],
      a: [
        { code: `var authors = new[]
{
    new Author { Name = "Ada",  Books = new[] { "A1", "A2" } },
    new Author { Name = "Brian", Books = new[] { "B1" } }
};

// Select: one result per author -> a sequence OF SEQUENCES
IEnumerable<string[]> nested = authors.Select(a => a.Books);
// [ ["A1","A2"], ["B1"] ]  -- needs a nested loop to read

// SelectMany: flattened into ONE sequence
IEnumerable<string> flat = authors.SelectMany(a => a.Books);
// [ "A1", "A2", "B1" ]`, lang: "csharp" },
        { p: "`SelectMany` also has an overload that keeps the parent, which is what you almost always want:" },
        { code: `var pairs = authors.SelectMany(
    a => a.Books,                                  // the collection selector
    (author, book) => new { author.Name, Book = book });   // the result selector

// { Name = "Ada", Book = "A1" }
// { Name = "Ada", Book = "A2" }
// { Name = "Brian", Book = "B1" }`, lang: "csharp" },
        { code: `// Query syntax: a second "from" IS SelectMany
var pairs2 = from a in authors
             from b in a.Books
             select new { a.Name, Book = b };

// Real-world: every line of every order over 100
var lines = orders.Where(o => o.Total > 100)
                  .SelectMany(o => o.Lines)
                  .ToList();`, lang: "csharp" },
        { table: { head: ["", "`Select`", "`SelectMany`"], rows: [
          ["Result count", "Same as the source", "Sum of the inner collection sizes"],
          ["Result shape", "`IEnumerable<TResult>` (may be nested)", "Flat `IEnumerable<TResult>`"],
          ["Query syntax", "`select`", "A second `from`"],
          ["Use when", "One-to-one mapping", "One-to-many, and you want them flattened"]
        ] } },
        { note: "`SelectMany` skips empty inner collections entirely — an author with no books contributes nothing. If you need them kept, that is a `GroupJoin` / left join, not `SelectMany`.", kind: "warn" }
      ]
    },

    {
      id: "where-clause",
      q: "How do you use LINQ to filter data with the Where clause?",
      tldr: "Where takes a predicate and returns the elements that satisfy it, lazily — and multiple Where calls compose into a single AND.",
      tags: ["operators", "filtering"],
      a: [
        { code: `var adults = people.Where(p => p.Age >= 18);

// Chained Where calls are ANDed together
var target = people.Where(p => p.Age >= 18)
                   .Where(p => p.City == "Pune");

// Equivalent in one predicate
var target2 = people.Where(p => p.Age >= 18 && p.City == "Pune");

// Query syntax
var target3 = from p in people
              where p.Age >= 18 && p.City == "Pune"
              select p;

// The index overload — LINQ to Objects only
var everyOther = people.Where((p, index) => index % 2 == 0);`, lang: "csharp" },
        { p: "**Conditional filtering** is where deferred execution pays off — build the query up, execute once:" },
        { code: `IQueryable<Product> q = _db.Products;

if (!string.IsNullOrWhiteSpace(search))
    q = q.Where(p => p.Name.Contains(search));

if (categoryId.HasValue)
    q = q.Where(p => p.CategoryId == categoryId.Value);

if (inStockOnly)
    q = q.Where(p => p.Stock > 0);

var results = q.OrderBy(p => p.Name).Take(50).ToList();   // one query`, lang: "csharp" },
        { ul: [
          "`Where` is **deferred** — nothing runs until enumeration.",
          "**Filter before you project and before you sort.** Sorting a filtered set is cheaper, and against a database it changes the generated SQL.",
          "**`Where(...).FirstOrDefault()`** and `FirstOrDefault(predicate)` are equivalent; the second reads better.",
          "Related operators: `OfType<T>()` filters by type, `Distinct()` removes duplicates, `Any(predicate)` just tests existence.",
          "Prefer **`Any()` over `Count() > 0`** — `Any` stops at the first match, `Count` walks everything."
        ] },
        { note: "Against EF, only what the provider can translate reaches SQL. Calling your own C# method inside `Where` either throws or silently pulls the whole table into memory first — check the generated SQL when a query is slow.", kind: "warn" }
      ]
    },

    {
      id: "ienumerable-vs-iqueryable",
      q: "Explain the difference between IEnumerable<T> and IQueryable<T> in the context of LINQ.",
      tldr: "IEnumerable executes in memory with delegates; IQueryable builds an expression tree that a provider translates — so the filtering happens in the database instead of in your process.",
      tags: ["execution", "performance"],
      seeAlso: ["csharp-advanced/expression-trees", "linq/deferred-vs-immediate-execution"],
      a: [
        { table: { head: ["", "`IEnumerable<T>`", "`IQueryable<T>`"], rows: [
          ["Namespace", "`System.Collections.Generic`", "`System.Linq`"],
          ["Predicate is a", "`Func<T, bool>` — compiled code", "`Expression<Func<T, bool>>` — a tree"],
          ["Executes", "**In memory**, in your process", "**At the source** — translated to SQL"],
          ["Best for", "In-memory collections", "Remote data: EF, OData"],
          ["Custom C# in the predicate", "Anything", "Only what the provider can translate"],
          ["Extra round trips", "N/A", "Composable into one query"]
        ] } },
        { p: "**This is the single most expensive LINQ mistake:**" },
        { code: `// BAD: AsEnumerable/ToList switches to LINQ to Objects.
// SELECT * FROM Orders  -- the whole table crosses the wire,
// then C# filters it in memory.
var bad = _db.Orders
    .AsEnumerable()
    .Where(o => o.Total > 1000)
    .Take(10)
    .ToList();

// GOOD: stays IQueryable, so the filter and the paging reach SQL.
// SELECT TOP 10 * FROM Orders WHERE Total > 1000
var good = _db.Orders
    .Where(o => o.Total > 1000)
    .Take(10)
    .ToList();`, lang: "csharp" },
        { code: `// The same trap hidden in a method signature
public IEnumerable<Order> GetOrders() => _db.Orders;   // callers filter in memory
public IQueryable<Order>  GetOrders() => _db.Orders;   // callers compose into SQL`, lang: "csharp" },
        { ul: [
          "`IQueryable<T>` **derives from** `IEnumerable<T>`, so anything queryable is also enumerable — which is exactly why the mistake is so easy to make.",
          "Switch to `IEnumerable` deliberately with `AsEnumerable()` when you genuinely need C# the provider cannot translate — but do it **after** filtering and paging, never before.",
          "Returning `IQueryable` from a repository is powerful but leaks persistence concerns and keeps the `DbContext` lifetime in play. Returning `IEnumerable` or a materialised list is safer; teams differ on this and either answer is defensible if you can explain the trade-off."
        ] }
      ]
    },

    {
      id: "join",
      q: "How can you use LINQ to join two collections? Provide an example using Join.",
      tldr: "Join takes both sequences, a key selector for each, and a result selector — producing an inner join; GroupJoin plus DefaultIfEmpty gives a left outer join.",
      tags: ["operators", "joins"],
      a: [
        { code: `var customers = new[]
{
    new Customer { Id = 1, Name = "Ada" },
    new Customer { Id = 2, Name = "Brian" },
    new Customer { Id = 3, Name = "Cleo" }        // has no orders
};

var orders = new[]
{
    new Order { Id = 10, CustomerId = 1, Total = 100m },
    new Order { Id = 11, CustomerId = 1, Total = 250m },
    new Order { Id = 12, CustomerId = 2, Total = 75m }
};

// INNER JOIN — Cleo is excluded
var joined = customers.Join(
    orders,                          // inner sequence
    c => c.Id,                       // outer key
    o => o.CustomerId,               // inner key
    (c, o) => new { c.Name, o.Id, o.Total });   // result

// Ada 10 100 / Ada 11 250 / Brian 12 75`, lang: "csharp" },
        { code: `// Query syntax — usually more readable for joins
var joined2 = from c in customers
              join o in orders on c.Id equals o.CustomerId
              select new { c.Name, o.Id, o.Total };`, lang: "csharp" },
        { code: `// LEFT OUTER JOIN — GroupJoin + SelectMany + DefaultIfEmpty
var left = from c in customers
           join o in orders on c.Id equals o.CustomerId into customerOrders
           from o in customerOrders.DefaultIfEmpty()
           select new
           {
               c.Name,
               OrderId = o?.Id,
               Total = o?.Total ?? 0m
           };

// Ada 10 100 / Ada 11 250 / Brian 12 75 / Cleo null 0`, lang: "csharp" },
        { code: `// GROUP JOIN — one row per customer, with their orders nested
var grouped = customers.GroupJoin(
    orders,
    c => c.Id,
    o => o.CustomerId,
    (c, os) => new { c.Name, Count = os.Count(), Total = os.Sum(x => x.Total) });

// Composite key — use an anonymous type on both sides
var composite = from a in listA
                join b in listB
                  on new { a.Year, a.Code } equals new { b.Year, b.Code }
                select new { a, b };`, lang: "csharp" },
        { ul: [
          "`Join` is an **equijoin only** — the `on ... equals ...` form cannot express `>` or `<`. For those, use a `where` across two `from` clauses (a cross join filtered down).",
          "`GroupJoin` (`join ... into`) is the hierarchical version: one result per outer element, with the matches grouped.",
          "**With EF you rarely write `Join` at all** — navigation properties are clearer and generate the same SQL: `_db.Orders.Select(o => new { o.Customer.Name, o.Total })`.",
          "Composite keys work by comparing **anonymous types**, which have structural equality. The property names must match on both sides."
        ] }
      ]
    },

    {
      id: "query-vs-method-syntax",
      q: "What are LINQ query syntax and method syntax? Provide examples of both.",
      tldr: "Query syntax is the SQL-like from/where/select form; method syntax is extension-method chaining. The compiler rewrites query syntax into method calls, so they are identical.",
      tags: ["fundamentals", "syntax"],
      seeAlso: ["linq/what-is-linq"],
      a: [
        { code: `var products = new List<Product>();

// QUERY SYNTAX
var q1 = from p in products
         where p.Price > 100
         orderby p.Name
         select new { p.Name, p.Price };

// METHOD SYNTAX — what the compiler produces from the above
var q2 = products
         .Where(p => p.Price > 100)
         .OrderBy(p => p.Name)
         .Select(p => new { p.Name, p.Price });`, lang: "csharp" },
        { table: { head: ["", "Query syntax", "Method syntax"], rows: [
          ["Reads better for", "`join`, `group by`, `let`, multiple `from`", "Simple filters and projections, long chains"],
          ["Operator coverage", "A subset — no `Count`, `Any`, `First`, `Skip`, `Take`", "**All** operators"],
          ["Intermediate variables", "`let` clause", "Extra `Select` or a lambda block"],
          ["Ending", "Must end with `select` or `group`", "Any operator"],
          ["Mixing", "Wrap in parentheses and chain", "Native"]
        ] } },
        { code: `// Query syntax shines with let, join and group
var report = from o in orders
             join c in customers on o.CustomerId equals c.Id
             let tax = o.Total * 0.2m                 // a named intermediate
             where tax > 10
             group new { o, tax } by c.Name into g
             orderby g.Key
             select new { Customer = g.Key, Tax = g.Sum(x => x.tax) };

// Some operators only exist in method syntax, so you mix
var count = (from p in products where p.Price > 100 select p).Count();

// The equivalent method-syntax "let" is clumsier
var report2 = orders
    .Join(customers, o => o.CustomerId, c => c.Id, (o, c) => new { o, c })
    .Select(x => new { x.o, x.c, tax = x.o.Total * 0.2m })
    .Where(x => x.tax > 10);`, lang: "csharp" },
        { note: "They compile to the same IL, so there is no performance difference. The convention most teams settle on: method syntax by default, query syntax when there is a join, a `group by` or a `let` — because that is where it genuinely reads better.", kind: "tip" }
      ]
    },

    {
      id: "group-by",
      q: "How do you perform a group by operation in LINQ? Provide an example.",
      tldr: "GroupBy takes a key selector and returns a sequence of IGrouping<TKey, TElement> — each group exposes its Key and is itself enumerable.",
      tags: ["operators", "grouping"],
      a: [
        { code: `var orders = new List<Order>();

// Method syntax
var byCustomer = orders
    .GroupBy(o => o.CustomerId)
    .Select(g => new
    {
        CustomerId = g.Key,
        Count      = g.Count(),
        Total      = g.Sum(o => o.Total),
        Largest    = g.Max(o => o.Total),
        Latest     = g.OrderByDescending(o => o.CreatedOn).First()
    })
    .OrderByDescending(x => x.Total)
    .ToList();

// Query syntax
var byCustomer2 = from o in orders
                  group o by o.CustomerId into g
                  orderby g.Sum(x => x.Total) descending
                  select new { CustomerId = g.Key, Total = g.Sum(x => x.Total) };`, lang: "csharp" },
        { code: `// Iterating the groups directly
foreach (var group in orders.GroupBy(o => o.Status))
{
    Console.WriteLine($"{group.Key}: {group.Count()}");
    foreach (var order in group)          // IGrouping<TKey,T> IS IEnumerable<T>
        Console.WriteLine("   " + order.Reference);
}`, lang: "csharp" },
        { code: `// Composite key — an anonymous type
var byMonth = orders.GroupBy(o => new { o.CreatedOn.Year, o.CreatedOn.Month })
                    .Select(g => new { g.Key.Year, g.Key.Month,
                                       Total = g.Sum(o => o.Total) });

// Element selector: group by one thing, collect another
var refsByStatus = orders.GroupBy(o => o.Status, o => o.Reference);
// g.Key = Status, and the group contains strings, not Orders

// ToLookup: the IMMEDIATE version of GroupBy
var lookup = orders.ToLookup(o => o.CustomerId);
var adasOrders = lookup[1];               // never null — empty if no match`, lang: "csharp" },
        { ul: [
          "`IGrouping<TKey, TElement>` **is** an `IEnumerable<TElement>` with an added `Key`.",
          "**`GroupBy` is deferred; `ToLookup` is immediate.** A lookup returns an empty sequence for a missing key rather than throwing, unlike a dictionary.",
          "For **LINQ to Objects**, `GroupBy` preserves the order in which keys were first encountered.",
          "Against **EF**, a `GroupBy` that only produces aggregates translates to SQL `GROUP BY`. One that needs the full grouped rows often cannot be translated and falls back to client evaluation — check the generated SQL."
        ] }
      ]
    },

    {
      id: "projection",
      q: "Explain the concept of projection in LINQ. How do you use the Select operator for projection?",
      tldr: "Projection transforms each element into a new shape — Select maps a source element to a different type, anonymous type or computed value.",
      tags: ["operators", "projection"],
      seeAlso: ["linq/select-vs-selectmany"],
      a: [
        { code: `// Single property
IEnumerable<string> names = products.Select(p => p.Name);

// Anonymous type — a shape that exists only here
var summary = products.Select(p => new { p.Name, p.Price });

// Named DTO — use this when it crosses a method or API boundary
var dtos = products.Select(p => new ProductDto
{
    Id = p.Id,
    Name = p.Name,
    PriceText = p.Price.ToString("C"),
    InStock = p.Stock > 0
});

// Computed values
var withTax = products.Select(p => p.Price * 1.2m);

// The index overload — LINQ to Objects only
var numbered = products.Select((p, i) => $"{i + 1}. {p.Name}");

// Query syntax
var summary2 = from p in products select new { p.Name, p.Price };`, lang: "csharp" },
        { p: "**Why projection matters most against a database** — it controls what actually gets selected:" },
        { code: `// Loads every column of every row, then throws most of it away
var bad = _db.Products.ToList().Select(p => new { p.Name, p.Price });

// SELECT Name, Price FROM Products  -- only what is needed
var good = _db.Products.Select(p => new { p.Name, p.Price }).ToList();`, lang: "csharp" },
        { ul: [
          "**Project before materialising.** Calling `ToList()` first turns the projection into an in-memory operation over data you already over-fetched.",
          "Projection also **avoids circular references and lazy-loading surprises** when serialising, which is why API endpoints should return DTOs rather than entities.",
          "**Anonymous types** cannot leave the method — they have no name. Use a named DTO or record if the shape crosses a boundary.",
          "`Select` maps one-to-one; **`SelectMany`** flattens one-to-many.",
          "Related: `Cast<T>()` and `OfType<T>()` project by type, and `Zip` projects two sequences pairwise."
        ] }
      ]
    },

    {
      id: "aggregation",
      q: "How can you perform an aggregation operation using LINQ, such as Sum, Count, or Average?",
      tldr: "Aggregate operators reduce a sequence to a single value and execute immediately — Count, Sum, Average, Min, Max, and Aggregate for anything custom.",
      tags: ["operators", "aggregation"],
      a: [
        { table: { head: ["Operator", "Returns", "Empty sequence"], rows: [
          ["`Count()` / `LongCount()`", "Number of elements", "0"],
          ["`Sum()`", "Total", "0"],
          ["`Average()`", "Mean", "**Throws** `InvalidOperationException`"],
          ["`Min()` / `Max()`", "Smallest / largest", "**Throws** for value types, `null` for nullables"],
          ["`Aggregate()`", "A custom fold", "Throws without a seed"],
          ["`Any()` / `All()`", "`bool`", "`false` / **`true`**"]
        ] } },
        { code: `var orders = new List<Order>();

int count      = orders.Count();
int shipped    = orders.Count(o => o.Status == Status.Shipped);   // with predicate
decimal total  = orders.Sum(o => o.Total);
decimal mean   = orders.Average(o => o.Total);
decimal biggest = orders.Max(o => o.Total);
DateTime first = orders.Min(o => o.CreatedOn);

// MaxBy/MinBy (.NET 6+) return the ELEMENT, not the value
Order largest = orders.MaxBy(o => o.Total);

// Existence checks — cheaper than counting
bool anyLate = orders.Any(o => o.DueDate < DateTime.Today);
bool allPaid = orders.All(o => o.IsPaid);`, lang: "csharp" },
        { code: `// Several aggregates in ONE pass, grouped
var stats = orders
    .GroupBy(o => o.CustomerId)
    .Select(g => new
    {
        CustomerId = g.Key,
        Orders  = g.Count(),
        Revenue = g.Sum(o => o.Total),
        Average = g.Average(o => o.Total)
    });

// Aggregate: a custom fold with a seed
var csv = names.Aggregate(
    new StringBuilder(),
    (sb, n) => sb.Length == 0 ? sb.Append(n) : sb.Append(", ").Append(n),
    sb => sb.ToString());

var runningMax = numbers.Aggregate(0, (max, n) => n > max ? n : max);`, lang: "csharp" },
        { ul: [
          "**Empty-sequence behaviour is the trap.** `Average()` and `Min()`/`Max()` on value types throw; `Sum()` and `Count()` return 0. Guard with `Any()`, or project to a nullable: `orders.Average(o => (decimal?)o.Total)` returns `null` instead of throwing.",
          "**Use `Any()` rather than `Count() > 0`** — `Any` short-circuits at the first element, `Count` enumerates everything.",
          "All aggregates are **immediate** — they force execution.",
          "Against **EF** these translate to SQL `COUNT`, `SUM`, `AVG` and run in the database — but only if the sequence is still `IQueryable`.",
          "Prefer **`MaxBy`/`MinBy`** over `OrderByDescending(...).First()` — one pass instead of a full sort."
        ] }
      ]
    }

  ]
});
