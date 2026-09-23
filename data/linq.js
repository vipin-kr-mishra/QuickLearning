/* LINQ. 10 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "linq",
  topic: "LINQ",
  level: "Core",
  short: "LINQ",
  accent: "teal",
  desc: "Querying lists and databases in C#: when a query actually runs, the operators you use every day, and the IEnumerable vs IQueryable difference that decides whether filtering happens in the database or in memory.",
  questions: [

    {
      id: "what-is-linq",
      q: "What is LINQ, and how does it improve data querying in C#?",
      tldr: "LINQ (Language Integrated Query) lets you filter, sort and shape data using normal C# code — and the same style works for lists, databases and XML.",
      tags: ["fundamentals"],
      seeAlso: ["csharp-basic/linq-intro", "linq/ienumerable-vs-iqueryable"],
      a: [
        { p: "Before LINQ, you wrote a `foreach` loop with `if` checks for lists, and a SQL string for the database. LINQ gives you **one way to write queries** for both." },
        { ul: [
          "**Same syntax everywhere** — works on lists (LINQ to Objects), databases via Entity Framework (LINQ to Entities) and XML (LINQ to XML).",
          "**Errors show up at compile time.** A typo in a SQL string only fails when the app runs. A typo in LINQ fails when you build.",
          "**IntelliSense helps you** — Visual Studio suggests property names as you type.",
          "**Short and readable** — you say *what* you want (\"orders over 100, sorted by name\"), not *how* to loop through them.",
          "**Safe to rename** — if you rename a property, the query updates too. A SQL string would silently break."
        ] },
        { code: `// Without LINQ — a manual loop
var result = new List<string>();
foreach (var o in orders)
    if (o.Total > 100 && o.Status == Status.Shipped)
        result.Add(o.Reference);
result.Sort();

// With LINQ — one readable chain
var result = orders
    .Where(o => o.Total > 100 && o.Status == Status.Shipped)
    .OrderBy(o => o.Reference)
    .Select(o => o.Reference)
    .ToList();`, lang: "csharp" },
        { p: "LINQ is built on four C# features: **extension methods** (like `.Where()`), **lambda expressions** (like `o => o.Total > 100`), **anonymous types** (like `new { o.Name }`) and **expression trees** (which let EF turn your C# into SQL)." },
        { note: "A good honest point to add in an interview: LINQ on a list is a tiny bit slower than a hand-written loop, and a badly written LINQ query against a database can produce slow SQL. But in most code, the readability is worth it.", kind: "tip" }
      ]
    },

    {
      id: "deferred-vs-immediate-execution",
      q: "Explain the difference between deferred execution and immediate execution in LINQ.",
      tldr: "Deferred means the query does not run when you write it — it runs later, when you loop over it or call ToList. Immediate means it runs right away and gives you the result.",
      tags: ["execution"],
      a: [
        { p: "Think of a deferred query as a **recipe**: writing it down does not cook anything. Cooking happens only when you actually ask for the food (loop over it or call `ToList()`)." },
        { table: { head: ["", "Deferred", "Immediate"], rows: [
          ["When it runs", "Later — when you loop over it or call `ToList()`", "Right away"],
          ["What you get back", "A query (`IEnumerable<T>` / `IQueryable<T>`)", "A real value or a filled list"],
          ["Examples", "`Where`, `Select`, `OrderBy`, `Take`, `Skip`, `GroupBy`, `Join`", "`ToList`, `ToArray`, `ToDictionary`, `Count`, `Sum`, `First`, `Any`, `Max`"],
          ["Loop over it twice?", "**It runs again** each time", "Uses the result it already has"]
        ] } },
        { code: `var query = numbers.Where(n => n > 2);   // nothing runs yet — just a recipe

numbers.Add(10);                        // we change the list...

foreach (var n in query) { }            // ...runs NOW, so 10 IS included

var list = numbers.Where(n => n > 2).ToList();   // runs immediately
numbers.Add(20);                                  // list does not change`, lang: "csharp" },
        { p: "**Why deferred is useful:** you can build a query step by step, and it only runs once at the end. With a database, that means **one SQL query** with all your filters." },
        { code: `IQueryable<Order> q = _db.Orders;

if (from.HasValue) q = q.Where(o => o.CreatedOn >= from);
if (status != null) q = q.Where(o => o.Status == status);

var page = q.OrderBy(o => o.CreatedOn)
            .Skip(skip).Take(size)
            .ToList();          // runs here — ONE SQL query with all filters`, lang: "csharp" },
        { note: "Two common mistakes. **1) Looping twice** over a deferred query runs it twice — two database calls instead of one. **2) Changing a variable** used inside the query before it runs — the query uses the value at the time it runs, not when you wrote it. Calling `ToList()` once you are done building the query fixes both.", kind: "warn" }
      ]
    },

    {
      id: "select-vs-selectmany",
      q: "What is the difference between Select and SelectMany in LINQ? Provide examples.",
      tldr: "Select gives one result for each item. If that result is a list, you end up with a list of lists. SelectMany does the same but flattens everything into one single list.",
      tags: ["operators", "projection"],
      a: [
        { p: "Simple example: each author has a list of books. `Select` gives you **a list of book-lists**. `SelectMany` gives you **one list of all books**." },
        { code: `var authors = new[]
{
    new Author { Name = "Ada",  Books = new[] { "A1", "A2" } },
    new Author { Name = "Brian", Books = new[] { "B1" } }
};

// Select: one result per author -> a list of lists
IEnumerable<string[]> nested = authors.Select(a => a.Books);
// [ ["A1","A2"], ["B1"] ]  -- you need two loops to read this

// SelectMany: everything in ONE flat list
IEnumerable<string> flat = authors.SelectMany(a => a.Books);
// [ "A1", "A2", "B1" ]`, lang: "csharp" },
        { p: "`SelectMany` can also keep the parent (the author) next to each child (the book), which is very common:" },
        { code: `var pairs = authors.SelectMany(
    a => a.Books,                                          // which list to flatten
    (author, book) => new { author.Name, Book = book });   // what to return for each

// { Name = "Ada", Book = "A1" }
// { Name = "Ada", Book = "A2" }
// { Name = "Brian", Book = "B1" }`, lang: "csharp" },
        { code: `// In query syntax, a second "from" means SelectMany
var pairs2 = from a in authors
             from b in a.Books
             select new { a.Name, Book = b };

// Real-world: all order lines from orders over 100
var lines = orders.Where(o => o.Total > 100)
                  .SelectMany(o => o.Lines)
                  .ToList();`, lang: "csharp" },
        { table: { head: ["", "`Select`", "`SelectMany`"], rows: [
          ["Number of results", "Same as the number of items", "Total of all the inner lists"],
          ["Shape", "Can be a list of lists", "Always one flat list"],
          ["Query syntax", "`select`", "A second `from`"],
          ["Use when", "One item → one result", "One item → many results, and you want them in one list"]
        ] } },
        { note: "If an author has no books, `SelectMany` simply leaves them out. If you need to keep them, you want a left join (`GroupJoin` + `DefaultIfEmpty`), not `SelectMany`.", kind: "warn" }
      ]
    },

    {
      id: "where-clause",
      q: "How do you use LINQ to filter data with the Where clause?",
      tldr: "Where takes a condition and keeps only the items that match it. You can chain several Where calls, and they work like AND.",
      tags: ["operators", "filtering"],
      a: [
        { code: `var adults = people.Where(p => p.Age >= 18);

// Two Where calls = AND
var target = people.Where(p => p.Age >= 18)
                   .Where(p => p.City == "Pune");

// Same thing in one condition
var target2 = people.Where(p => p.Age >= 18 && p.City == "Pune");

// Query syntax
var target3 = from p in people
              where p.Age >= 18 && p.City == "Pune"
              select p;

// With the item's position (index) — works on lists only, not EF
var everyOther = people.Where((p, index) => index % 2 == 0);`, lang: "csharp" },
        { p: "**Adding filters only when needed** is a very common real-world pattern — for example, a search page where the user may or may not fill each box:" },
        { code: `IQueryable<Product> q = _db.Products;

if (!string.IsNullOrWhiteSpace(search))
    q = q.Where(p => p.Name.Contains(search));

if (categoryId.HasValue)
    q = q.Where(p => p.CategoryId == categoryId.Value);

if (inStockOnly)
    q = q.Where(p => p.Stock > 0);

var results = q.OrderBy(p => p.Name).Take(50).ToList();   // one SQL query`, lang: "csharp" },
        { ul: [
          "`Where` is **deferred** — it does not run until you loop over it or call `ToList()`.",
          "**Filter first, then sort or select.** Sorting fewer items is faster, and with a database it gives better SQL.",
          "`Where(x => ...).FirstOrDefault()` and `FirstOrDefault(x => ...)` do the same thing — the second is shorter.",
          "Related: `OfType<T>()` keeps items of a certain type, `Distinct()` removes duplicates, `Any(x => ...)` just checks if at least one matches.",
          "Use **`Any()` instead of `Count() > 0`** — `Any` stops as soon as it finds one match, while `Count` checks every item."
        ] },
        { note: "With Entity Framework, your condition must be something EF can turn into SQL. If you call your own C# method inside `Where`, EF will either throw an error or load the whole table into memory first. If a query is slow, check the SQL it produces.", kind: "warn" }
      ]
    },

    {
      id: "ienumerable-vs-iqueryable",
      q: "Explain the difference between IEnumerable<T> and IQueryable<T> in the context of LINQ.",
      tldr: "IEnumerable filters data in memory, inside your app. IQueryable turns the query into SQL, so the database does the filtering and sends back only the rows you need.",
      tags: ["execution", "performance"],
      seeAlso: ["csharp-advanced/expression-trees", "linq/deferred-vs-immediate-execution"],
      a: [
        { p: "Easy way to explain it: with **IEnumerable**, you bring all the data home and then pick what you want. With **IQueryable**, you tell the database what you want, and it sends only that." },
        { table: { head: ["", "`IEnumerable<T>`", "`IQueryable<T>`"], rows: [
          ["Namespace", "`System.Collections.Generic`", "`System.Linq`"],
          ["Where the filtering happens", "**In memory**, in your app", "**In the database** — converted to SQL"],
          ["How it works", "Runs your lambda as normal C# code", "Reads your lambda as data (an expression tree) and turns it into SQL"],
          ["Best for", "Lists and arrays already in memory", "Databases (Entity Framework), remote data"],
          ["Custom C# methods in the query", "Anything works", "Only what EF can turn into SQL"]
        ] } },
        { p: "**This is the most costly LINQ mistake:**" },
        { code: `// BAD: AsEnumerable() switches to in-memory mode.
// SQL sent: SELECT * FROM Orders  -- the WHOLE table is loaded,
// then C# filters it in memory.
var bad = _db.Orders
    .AsEnumerable()
    .Where(o => o.Total > 1000)
    .Take(10)
    .ToList();

// GOOD: stays IQueryable, so the filter goes into the SQL.
// SQL sent: SELECT TOP 10 * FROM Orders WHERE Total > 1000
var good = _db.Orders
    .Where(o => o.Total > 1000)
    .Take(10)
    .ToList();`, lang: "csharp" },
        { code: `// The same mistake hidden in a method's return type
public IEnumerable<Order> GetOrders() => _db.Orders;   // callers filter in memory
public IQueryable<Order>  GetOrders() => _db.Orders;   // callers' filters go into SQL`, lang: "csharp" },
        { ul: [
          "`IQueryable<T>` **inherits from** `IEnumerable<T>`. That is why the mistake is so easy — the code compiles either way.",
          "Use `AsEnumerable()` only when you really need C# code that SQL cannot do — and do it **after** filtering and paging, not before.",
          "Should a repository return `IQueryable`? It is flexible, but it lets database details leak out to callers. Returning a list is safer. Both answers are fine in an interview if you explain why."
        ] }
      ]
    },

    {
      id: "join",
      q: "How can you use LINQ to join two collections? Provide an example using Join.",
      tldr: "Join matches items from two lists using a common key, like CustomerId — just like an INNER JOIN in SQL. For a LEFT JOIN, use GroupJoin with DefaultIfEmpty.",
      tags: ["operators", "joins"],
      a: [
        { p: "`Join` needs four things: **the other list**, **the key from the first list**, **the key from the second list**, and **what to return** when they match." },
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

// INNER JOIN — Cleo is left out because she has no orders
var joined = customers.Join(
    orders,                          // 1. the other list
    c => c.Id,                       // 2. key from customers
    o => o.CustomerId,               // 3. key from orders
    (c, o) => new { c.Name, o.Id, o.Total });   // 4. what to return

// Ada 10 100 / Ada 11 250 / Brian 12 75`, lang: "csharp" },
        { code: `// Query syntax — usually easier to read for joins
var joined2 = from c in customers
              join o in orders on c.Id equals o.CustomerId
              select new { c.Name, o.Id, o.Total };`, lang: "csharp" },
        { code: `// LEFT JOIN — keep every customer, even with no orders
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
        { code: `// GROUP JOIN — one row per customer, with their orders grouped together
var grouped = customers.GroupJoin(
    orders,
    c => c.Id,
    o => o.CustomerId,
    (c, os) => new { c.Name, Count = os.Count(), Total = os.Sum(x => x.Total) });

// Joining on two columns — use new { } on both sides
var composite = from a in listA
                join b in listB
                  on new { a.Year, a.Code } equals new { b.Year, b.Code }
                select new { a, b };`, lang: "csharp" },
        { ul: [
          "`Join` only works with **equals** — you cannot join on `>` or `<`. For that, use two `from` clauses with a `where`.",
          "`GroupJoin` (`join ... into`) gives **one result per customer**, with all their matching orders grouped together.",
          "**With Entity Framework you rarely need `Join`** — navigation properties are simpler and produce the same SQL: `_db.Orders.Select(o => new { o.Customer.Name, o.Total })`.",
          "For a two-column join, the property names inside `new { }` **must be the same** on both sides, or it will not compile."
        ] }
      ]
    },

    {
      id: "query-vs-method-syntax",
      q: "What are LINQ query syntax and method syntax? Provide examples of both.",
      tldr: "Query syntax looks like SQL (from, where, select). Method syntax uses dot-chained methods (.Where().Select()). The compiler turns query syntax into method syntax, so both work exactly the same.",
      tags: ["fundamentals", "syntax"],
      seeAlso: ["linq/what-is-linq"],
      a: [
        { code: `var products = new List<Product>();

// QUERY SYNTAX — looks like SQL
var q1 = from p in products
         where p.Price > 100
         orderby p.Name
         select new { p.Name, p.Price };

// METHOD SYNTAX — the compiler converts the above into this
var q2 = products
         .Where(p => p.Price > 100)
         .OrderBy(p => p.Name)
         .Select(p => new { p.Name, p.Price });`, lang: "csharp" },
        { table: { head: ["", "Query syntax", "Method syntax"], rows: [
          ["Easier to read for", "`join`, `group by`, `let`, multiple `from`", "Simple filters and long chains"],
          ["Operators available", "Only some — no `Count`, `Any`, `First`, `Skip`, `Take`", "**All** of them"],
          ["Storing a temporary value", "`let` keyword", "An extra `Select`"],
          ["Must end with", "`select` or `group`", "Anything"],
          ["Mixing both", "Wrap in brackets, then add methods", "Works naturally"]
        ] } },
        { code: `// Query syntax is nicer with let, join and group
var report = from o in orders
             join c in customers on o.CustomerId equals c.Id
             let tax = o.Total * 0.2m                 // a temporary value
             where tax > 10
             group new { o, tax } by c.Name into g
             orderby g.Key
             select new { Customer = g.Key, Tax = g.Sum(x => x.tax) };

// Some operators exist only in method syntax, so you mix them
var count = (from p in products where p.Price > 100 select p).Count();

// The same "let" in method syntax is harder to read
var report2 = orders
    .Join(customers, o => o.CustomerId, c => c.Id, (o, c) => new { o, c })
    .Select(x => new { x.o, x.c, tax = x.o.Total * 0.2m })
    .Where(x => x.tax > 10);`, lang: "csharp" },
        { note: "There is **no performance difference** — both become the same code. What most teams do: use method syntax normally, and switch to query syntax when there is a `join`, `group by` or `let`, because that is where it is easier to read.", kind: "tip" }
      ]
    },

    {
      id: "group-by",
      q: "How do you perform a group by operation in LINQ? Provide an example.",
      tldr: "GroupBy puts items with the same key into groups. Each group has a Key (the shared value) and the list of items in that group.",
      tags: ["operators", "grouping"],
      a: [
        { p: "Example: group orders by customer. You get one group per customer. `g.Key` is the customer ID, and the group itself holds that customer's orders — so you can count, sum, etc." },
        { code: `var orders = new List<Order>();

// Method syntax
var byCustomer = orders
    .GroupBy(o => o.CustomerId)
    .Select(g => new
    {
        CustomerId = g.Key,                  // the value we grouped by
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
        { code: `// Looping through the groups
foreach (var group in orders.GroupBy(o => o.Status))
{
    Console.WriteLine($"{group.Key}: {group.Count()}");
    foreach (var order in group)          // a group is also a list you can loop over
        Console.WriteLine("   " + order.Reference);
}`, lang: "csharp" },
        { code: `// Group by two values — use new { }
var byMonth = orders.GroupBy(o => new { o.CreatedOn.Year, o.CreatedOn.Month })
                    .Select(g => new { g.Key.Year, g.Key.Month,
                                       Total = g.Sum(o => o.Total) });

// Group by one thing, but keep only another value in each group
var refsByStatus = orders.GroupBy(o => o.Status, o => o.Reference);
// g.Key = Status, and each group holds strings, not Orders

// ToLookup: like GroupBy, but runs immediately
var lookup = orders.ToLookup(o => o.CustomerId);
var adasOrders = lookup[1];               // never null — empty if not found`, lang: "csharp" },
        { ul: [
          "Each group is an `IGrouping<TKey, TElement>` — basically **a list with a `Key`**.",
          "**`GroupBy` is deferred; `ToLookup` runs immediately.** A lookup gives you an empty list for a missing key instead of throwing an error like a dictionary does.",
          "On a normal list, groups come out **in the order their keys first appear**.",
          "With **Entity Framework**, a `GroupBy` that only returns totals (Count, Sum…) becomes SQL `GROUP BY`. If you need the full rows of each group, EF may not be able to translate it — check the SQL."
        ] }
      ]
    },

    {
      id: "projection",
      q: "Explain the concept of projection in LINQ. How do you use the Select operator for projection?",
      tldr: "Projection means changing each item into a new shape — for example, picking only a few properties or building a DTO. In LINQ, you do this with Select.",
      tags: ["operators", "projection"],
      seeAlso: ["linq/select-vs-selectmany"],
      a: [
        { p: "Simple way to say it: you have a `Product` with 20 properties, but you only need `Name` and `Price`. `Select` lets you **pick just what you need** or **turn it into something else**." },
        { code: `// Just one property
IEnumerable<string> names = products.Select(p => p.Name);

// Anonymous type — a quick shape used only in this method
var summary = products.Select(p => new { p.Name, p.Price });

// A named DTO class — use this when returning from a method or API
var dtos = products.Select(p => new ProductDto
{
    Id = p.Id,
    Name = p.Name,
    PriceText = p.Price.ToString("C"),
    InStock = p.Stock > 0
});

// A calculated value
var withTax = products.Select(p => p.Price * 1.2m);

// With the item's position (index) — works on lists only, not EF
var numbered = products.Select((p, i) => $"{i + 1}. {p.Name}");

// Query syntax
var summary2 = from p in products select new { p.Name, p.Price };`, lang: "csharp" },
        { p: "**Why this matters a lot with a database** — `Select` decides which columns are fetched:" },
        { code: `// BAD: loads ALL columns of ALL rows, then keeps only two
var bad = _db.Products.ToList().Select(p => new { p.Name, p.Price });

// GOOD: SQL sent is SELECT Name, Price FROM Products
var good = _db.Products.Select(p => new { p.Name, p.Price }).ToList();`, lang: "csharp" },
        { ul: [
          "**Call `Select` before `ToList()`.** If you call `ToList()` first, you have already loaded everything from the database.",
          "Returning DTOs instead of full entities from an API also **avoids serialization problems** like circular references.",
          "**Anonymous types cannot be returned from a method** because they have no name. Use a DTO class or record instead.",
          "`Select` = one item → one result. **`SelectMany`** = one item → many results, flattened into one list.",
          "Related: `Cast<T>()` and `OfType<T>()` change the type, and `Zip` combines two lists item by item."
        ] }
      ]
    },

    {
      id: "aggregation",
      q: "How can you perform an aggregation operation using LINQ, such as Sum, Count, or Average?",
      tldr: "Aggregation methods turn a whole list into one value — Count, Sum, Average, Min and Max. They run immediately, and Aggregate lets you write your own custom calculation.",
      tags: ["operators", "aggregation"],
      a: [
        { table: { head: ["Method", "Returns", "If the list is empty"], rows: [
          ["`Count()` / `LongCount()`", "How many items", "0"],
          ["`Sum()`", "The total", "0"],
          ["`Average()`", "The average", "**Throws an error**"],
          ["`Min()` / `Max()`", "Smallest / largest", "**Throws an error** for `int`, `decimal` etc. Returns `null` for nullable types"],
          ["`Aggregate()`", "Your own custom result", "Throws, unless you give a starting value"],
          ["`Any()` / `All()`", "`true` or `false`", "`false` / **`true`**"]
        ] } },
        { code: `var orders = new List<Order>();

int count      = orders.Count();
int shipped    = orders.Count(o => o.Status == Status.Shipped);   // count with a condition
decimal total  = orders.Sum(o => o.Total);
decimal mean   = orders.Average(o => o.Total);
decimal biggest = orders.Max(o => o.Total);
DateTime first = orders.Min(o => o.CreatedOn);

// MaxBy/MinBy (.NET 6+) return the whole ORDER, not just the number
Order largest = orders.MaxBy(o => o.Total);

// Yes/no checks — faster than counting
bool anyLate = orders.Any(o => o.DueDate < DateTime.Today);
bool allPaid = orders.All(o => o.IsPaid);`, lang: "csharp" },
        { code: `// Totals per customer, using GroupBy
var stats = orders
    .GroupBy(o => o.CustomerId)
    .Select(g => new
    {
        CustomerId = g.Key,
        Orders  = g.Count(),
        Revenue = g.Sum(o => o.Total),
        Average = g.Average(o => o.Total)
    });

// Aggregate: your own calculation, with a starting value
var csv = names.Aggregate(
    new StringBuilder(),                                                  // start with an empty builder
    (sb, n) => sb.Length == 0 ? sb.Append(n) : sb.Append(", ").Append(n), // add each name
    sb => sb.ToString());                                                 // final result

var runningMax = numbers.Aggregate(0, (max, n) => n > max ? n : max);`, lang: "csharp" },
        { ul: [
          "**Watch out for empty lists.** `Average()`, `Min()` and `Max()` throw an error on an empty list, but `Sum()` and `Count()` return 0. To be safe, check `Any()` first, or cast to nullable: `orders.Average(o => (decimal?)o.Total)` returns `null` instead of crashing.",
          "**Use `Any()` instead of `Count() > 0`** — `Any` stops at the first item, `Count` checks all of them.",
          "All these methods **run immediately** — they are not deferred.",
          "With **Entity Framework**, they become SQL `COUNT`, `SUM`, `AVG` and run in the database — as long as you have not called `ToList()` before them.",
          "Use **`MaxBy`/`MinBy`** instead of `OrderByDescending(...).First()` — it just scans once instead of sorting the whole list."
        ] }
      ]
    }

  ]
});
