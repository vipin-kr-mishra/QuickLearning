/* C# — Intermediate. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "csharp-intermediate",
  topic: "C#",
  level: "Intermediate",
  short: "C# Intermediate",
  accent: "violet",
  desc: "Generics, delegates and events, async and threading, reflection and the keywords that separate a working answer from a confident one.",
  questions: [

    {
      id: "async-await-purpose",
      q: "What is the purpose of async and await keywords in C#?",
      tldr: "They let you write non-blocking code sequentially: await frees the calling thread while an operation is in flight and resumes the method when it completes.",
      tags: ["async", "tasks"],
      seeAlso: ["csharp-basic/async-await", "csharp-intermediate/task-vs-thread"],
      a: [
        { p: "The compiler rewrites an `async` method into a **state machine**. Each `await` on an incomplete task registers a continuation and returns; the thread goes back to the pool. When the awaited task completes, the rest of the method is scheduled to run." },
        { ul: [
          "**No thread is created.** For I/O the work happens in the OS/driver; the CPU has nothing to do while it waits, so parking a thread would be pure waste.",
          "The benefit for a server is **scalability** — more concurrent requests per thread; for a UI it is **responsiveness** — the message loop keeps running.",
          "Return `Task`, `Task<T>`, or `ValueTask<T>` on hot paths. `async void` is only for event handlers.",
          "`ConfigureAwait(false)` in library code avoids capturing the synchronisation context, which both speeds things up and avoids deadlocks.",
          "Exceptions are captured in the returned task and rethrown at the `await`."
        ] },
        { code: `public async Task<Report> BuildAsync(int id, CancellationToken ct)
{
    var data  = await _repo.LoadAsync(id, ct).ConfigureAwait(false);
    var extra = await _api.FetchAsync(data.Key, ct).ConfigureAwait(false);
    return new Report(data, extra);
}

// Independent work should run concurrently, not sequentially
var (a, b) = (LoadAAsync(), LoadBAsync());
await Task.WhenAll(a, b);`, lang: "csharp" },
        { note: "Two awaits in a row run **sequentially**. If the calls do not depend on each other, start both tasks first and then `await Task.WhenAll(...)` — a very common interview follow-up.", kind: "warn" }
      ]
    },

    {
      id: "delegates-and-events",
      q: "Explain the concept of delegates and events in C#.",
      tldr: "A delegate is a type-safe reference to a method; an event is a restricted wrapper over a delegate field that only the declaring type can raise.",
      tags: ["delegates", "events"],
      flag: "doubt",
      seeAlso: ["csharp-intermediate/delegate-vs-event", "csharp-basic/delegate"],
      a: [
        { p: "Think of it in two layers. The **delegate** is the *type* — it defines what signature a method must have to be stored. The **event** is an *access modifier for that delegate field*: outside code may only subscribe (`+=`) and unsubscribe (`-=`); it cannot assign over the list, clear it, or invoke it." },
        { p: "**The delegate — a method as a value:**" },
        { code: `public delegate void Notify(string message);   // defines a TYPE

Notify n = Console.WriteLine;   // point it at a method
n += msg => File.AppendAllText("log.txt", msg);   // multicast
n("started");                   // both run, in subscription order`, lang: "csharp" },
        { p: "**The event — publish/subscribe built on top:**" },
        { code: `public class Downloader
{
    // The standard pattern: EventHandler<T>, sender + args
    public event EventHandler<ProgressEventArgs> Progress;

    protected virtual void OnProgress(int percent)
        => Progress?.Invoke(this, new ProgressEventArgs(percent));   // null-safe raise

    public void Run()
    {
        for (var i = 0; i <= 100; i += 10) OnProgress(i);
    }
}

var d = new Downloader();
d.Progress += (sender, e) => Console.WriteLine(e.Percent);   // subscribe
d.Run();`, lang: "csharp" },
        { ul: [
          "Convention: use `EventHandler` or `EventHandler<TArgs>`, with `(object sender, TArgs e)` and a `void` return.",
          "Always raise through a `protected virtual OnXxx` method so derived classes can intervene.",
          "Use `?.Invoke(...)` — if nobody has subscribed the backing field is `null`.",
          "**Unsubscribe** when the subscriber dies. A live event keeps a reference to its handler's target, which is the classic managed memory leak."
        ] },
        { note: "Under the hood `event` generates a private delegate field plus `add`/`remove` accessors — that is literally all the difference between a delegate field and an event.", kind: "tip" }
      ]
    },

    {
      id: "task-vs-thread",
      q: "What is a Task in C#? How does it differ from Thread?",
      tldr: "A Thread is an OS-level worker you manage yourself; a Task is a promise of future work, usually scheduled onto the thread pool, with results, cancellation and composition built in.",
      tags: ["async", "threading"],
      seeAlso: ["csharp-intermediate/async-await-purpose"],
      a: [
        { table: { head: ["", "`Thread`", "`Task`"], rows: [
          ["Level", "OS thread, ~1 MB stack", "Unit of work, usually on the thread pool"],
          ["Cost", "Expensive to create and destroy", "Cheap; threads are pooled and reused"],
          ["Return value", "None — you wire it up yourself", "`Task<T>` carries the result"],
          ["Exceptions", "Crash the process if unhandled", "Captured and rethrown on `await`"],
          ["Cancellation", "`Abort` (unsafe, removed)", "`CancellationToken`, cooperative"],
          ["Composition", "Manual", "`WhenAll`, `WhenAny`, `ContinueWith`, `await`"]
        ] } },
        { code: `// CPU-bound work: push it off the current thread
var result = await Task.Run(() => HeavyCalculation(input));

// I/O-bound work: no thread at all while it waits
var json = await httpClient.GetStringAsync(url);

// Composition
var all = await Task.WhenAll(ids.Select(id => LoadAsync(id)));`, lang: "csharp" },
        { note: "The distinction that matters: use `Task.Run` for **CPU-bound** work, and a naturally async API for **I/O-bound** work. Wrapping an I/O call in `Task.Run` just burns a pool thread for nothing.", kind: "warn" }
      ]
    },

    {
      id: "lock-and-monitor",
      q: "Describe the lock statement and Monitor class in C#.",
      tldr: "`lock` is syntactic sugar for `Monitor.Enter`/`Monitor.Exit` in a try/finally, giving one thread at a time exclusive access to a block.",
      tags: ["threading", "synchronisation"],
      a: [
        { code: `private readonly object _gate = new object();

lock (_gate)
{
    _counter++;      // only one thread in here at a time
}

// exactly equivalent to:
bool taken = false;
try
{
    Monitor.Enter(_gate, ref taken);
    _counter++;
}
finally
{
    if (taken) Monitor.Exit(_gate);
}`, lang: "csharp" },
        { ul: [
          "`Monitor` adds what `lock` cannot express: `TryEnter` with a timeout, and `Wait`/`Pulse`/`PulseAll` for condition signalling.",
          "Locks are **re-entrant** for the same thread — taking the same lock twice does not deadlock.",
          "Always lock on a **private, readonly, reference-type** field.",
          "Keep the locked region as small as possible, and never `await` inside a `lock` — it will not compile, and even if it did the lock is thread-affine.",
          "For async mutual exclusion use `SemaphoreSlim.WaitAsync()`."
        ] },
        { note: "Never lock on `this`, on a `Type`, or on a string literal. All three are visible outside your class — external code can take the same lock and deadlock you.", kind: "warn" }
      ]
    },

    {
      id: "extension-methods",
      q: "What are extension methods in C# and how are they used?",
      tldr: "Static methods whose first parameter is marked `this`, letting you call them with instance syntax on a type you do not own.",
      tags: ["functional", "linq"],
      seeAlso: ["csharp-basic/extension-methods"],
      a: [
        { ul: [
          "Three requirements: **static class**, **static method**, **first parameter marked `this`**.",
          "They are resolved at compile time into an ordinary static call — no runtime cost, no access to private members, no real modification of the type.",
          "The defining **namespace must be imported** for the method to be visible.",
          "An instance method with the same signature always wins over an extension method.",
          "They can extend **interfaces**, which is how LINQ adds ~50 operators to every `IEnumerable<T>` at once."
        ] },
        { code: `public static class EnumerableExtensions
{
    public static IEnumerable<IEnumerable<T>> Batch<T>(
        this IEnumerable<T> source, int size)
    {
        var bucket = new List<T>(size);
        foreach (var item in source)
        {
            bucket.Add(item);
            if (bucket.Count != size) continue;
            yield return bucket;
            bucket = new List<T>(size);
        }
        if (bucket.Count > 0) yield return bucket;
    }
}

foreach (var page in ids.Batch(500)) { await SendAsync(page); }`, lang: "csharp" },
        { note: "An extension method can be called on a `null` reference without throwing, because there is no virtual dispatch — `((string)null).IsNullOrEmpty()` works. Useful, and a favourite trick question.", kind: "tip" }
      ]
    },

    {
      id: "using-idisposable",
      q: "Explain the use of using statement and IDisposable interface in C#.",
      tldr: "IDisposable declares a Dispose() method for releasing unmanaged resources deterministically; `using` guarantees it is called via a compiler-generated finally.",
      tags: ["resources", "idisposable"],
      seeAlso: ["csharp-basic/using-statement"],
      a: [
        { p: "The GC reclaims **memory**, but it knows nothing about file handles, sockets, database connections or GDI objects. `IDisposable` is the contract for releasing those at a moment you choose, rather than whenever a finalizer happens to run." },
        { code: `public class FileCache : IDisposable
{
    private FileStream _stream;
    private bool _disposed;

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);   // no need for the finalizer now
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;
        if (disposing)
        {
            _stream?.Dispose();      // managed resources
        }
        // release unmanaged handles here
        _disposed = true;
    }

    ~FileCache() => Dispose(false);  // only if you own unmanaged resources directly
}`, lang: "csharp", caption: "The full dispose pattern" },
        { ul: [
          "`Dispose()` must be **idempotent** — calling it twice must not throw.",
          "Only write a **finalizer** if the class directly holds an unmanaged handle; finalizers delay collection by a full GC cycle.",
          "`GC.SuppressFinalize(this)` tells the GC to skip the finalizer once you have cleaned up.",
          "Implement `IAsyncDisposable` with `await using` when cleanup itself does I/O.",
          "If a class holds an `IDisposable` field, that class almost always needs to be `IDisposable` too."
        ] }
      ]
    },

    {
      id: "delegate-vs-event",
      q: "What is a delegate in C#? How is it different from an event?",
      tldr: "A delegate is a type; an event is a member built on a delegate that restricts outsiders to only subscribing and unsubscribing.",
      tags: ["delegates", "events"],
      flag: "doubt",
      seeAlso: ["csharp-intermediate/delegates-and-events"],
      a: [
        { p: "This is the same distinction as `field` versus `property`. A **public delegate field** is fully exposed; an **event** is the encapsulated version of it." },
        { table: { head: ["From outside the class", "Public delegate field", "`event`"], rows: [
          ["Subscribe with `+=`", "Yes", "Yes"],
          ["Unsubscribe with `-=`", "Yes", "Yes"],
          ["Assign with `=` (wipes all subscribers)", "**Yes — dangerous**", "No, compiler error"],
          ["Invoke it", "**Yes — anyone can raise it**", "No, only the declaring type"],
          ["Set to `null`", "Yes", "No"]
        ] } },
        { code: `public class Publisher
{
    public Action<string> OnFieldStyle;          // a plain delegate field
    public event Action<string> OnEventStyle;    // an event
}

var p = new Publisher();

p.OnFieldStyle = null;          // legal — silently removes every subscriber
p.OnFieldStyle("fake");         // legal — an outsider raises your notification

// p.OnEventStyle = null;       // compiler error
// p.OnEventStyle("fake");      // compiler error
p.OnEventStyle += Handle;       // only this is allowed`, lang: "csharp" },
        { p: "So the summary line: **a delegate is a type, an event is a member**, and the `event` keyword adds `add`/`remove` accessors around a private delegate field so the publisher keeps control of when the notification is raised." }
      ]
    },

    {
      id: "generics",
      q: "What are Generics in C#? Explain with an example.",
      tldr: "Generics parameterise a type or method by another type, giving you reuse with full compile-time type safety and no boxing.",
      tags: ["generics"],
      a: [
        { ul: [
          "**Type safety** — `List<int>` cannot accidentally hold a `string`.",
          "**No boxing** — value types stay unboxed, unlike `ArrayList`.",
          "**Real reification** — unlike Java, the CLR keeps generic type information at runtime, and produces specialised native code per value type.",
          "**Constraints** narrow what `T` can be and unlock what you can do with it."
        ] },
        { table: { head: ["Constraint", "Means"], rows: [
          ["`where T : class`", "Reference type"],
          ["`where T : struct`", "Non-nullable value type"],
          ["`where T : new()`", "Has a public parameterless constructor"],
          ["`where T : BaseType`", "Derives from BaseType"],
          ["`where T : IComparable<T>`", "Implements the interface"],
          ["`where T : notnull`, `unmanaged`", "Non-nullable / unmanaged type"]
        ] } },
        { code: `public class Repository<T> where T : class, IEntity, new()
{
    private readonly List<T> _items = new();

    public void Add(T item) => _items.Add(item);
    public T Find(int id) => _items.FirstOrDefault(x => x.Id == id);
    public T CreateNew() => new T();          // allowed by the new() constraint
}

public static T Max<T>(T a, T b) where T : IComparable<T>
    => a.CompareTo(b) >= 0 ? a : b;`, lang: "csharp" }
      ]
    },

    {
      id: "covariance-contravariance",
      q: "Explain covariance and contravariance in C# with examples.",
      tldr: "Covariance (out) lets a generic type substitute a more derived type argument; contravariance (in) lets it substitute a less derived one. Out positions vary covariantly, in positions contravariantly.",
      tags: ["generics", "variance"],
      flag: "doubt",
      a: [
        { p: "The rule is easier than the words. Ask: **does `T` come out of the type, or go into it?**" },
        { ul: [
          "`T` only comes **out** (return values) — the type is **covariant**, marked `out`. `IEnumerable<out T>`.",
          "`T` only goes **in** (parameters) — the type is **contravariant**, marked `in`. `IComparer<in T>`, `Action<in T>`.",
          "`T` does both — the type is **invariant** and no substitution is allowed. `List<T>`, `IList<T>`."
        ] },
        { p: "**Covariance — `out`.** Everything a sequence of `Dog` produces is an `Animal`, so it is safe to read it as a sequence of `Animal`:" },
        { code: `IEnumerable<Dog> dogs = new List<Dog>();
IEnumerable<Animal> animals = dogs;      // legal: IEnumerable<out T>

// Why List<T> cannot do this:
// List<Animal> list = dogs;             // if allowed...
// list.Add(new Cat());                  // ...you just put a Cat in a List<Dog>`, lang: "csharp" },
        { p: "**Contravariance — `in`.** Something that can handle any `Animal` can certainly handle a `Dog`, so it is safe to use where a `Dog` handler is expected:" },
        { code: `Action<Animal> feedAny = a => Console.WriteLine("fed " + a.Name);
Action<Dog> feedDog = feedAny;            // legal: Action<in T>

IComparer<Animal> byName = new AnimalNameComparer();
var dogs = new List<Dog>();
dogs.Sort(byName);                        // legal: IComparer<in T>`, lang: "csharp" },
        { code: `// Declaring your own
public interface IProducer<out T> { T Produce(); }        // T only returned
public interface IConsumer<in T> { void Consume(T item); } // T only accepted
// public interface IBoth<out T> { void Set(T x); }       // error: out in an in position`, lang: "csharp" },
        { table: { head: ["", "Keyword", "Direction", "Example"], rows: [
          ["Covariant", "`out`", "Derived → Base", "`IEnumerable<Dog>` → `IEnumerable<Animal>`"],
          ["Contravariant", "`in`", "Base → Derived", "`Action<Animal>` → `Action<Dog>`"],
          ["Invariant", "none", "No conversion", "`List<T>`, `IList<T>`"]
        ] } },
        { note: "Memory hook: **out = output = covariant** (flows out, so more derived is fine), **in = input = contravariant** (flows in, so less derived is fine). Variance also only applies to **interfaces and delegates**, never to classes, and never to value type arguments.", kind: "tip" },
        { note: "Array covariance (`Animal[] a = new Dog[5];`) is legal but **unsafe** — it compiles and then throws `ArrayTypeMismatchException` at runtime. It predates generics and is considered a design mistake.", kind: "warn" }
      ]
    },

    {
      id: "linq-in-csharp",
      q: "What is LINQ in C#? Provide an example.",
      tldr: "Language Integrated Query: a uniform, strongly typed set of query operators over in-memory collections, databases and XML.",
      tags: ["linq"],
      seeAlso: ["linq/what-is-linq", "linq/query-vs-method-syntax"],
      a: [
        { ul: [
          "Operators are extension methods on `IEnumerable<T>` (in-memory) and `IQueryable<T>` (translated to another language, e.g. SQL).",
          "Most operators use **deferred execution** — the query is a recipe until you enumerate it.",
          "**Query syntax** and **method syntax** compile to identical code; query syntax reads better for joins and `group by`.",
          "Terminal operators such as `ToList`, `Count`, `First`, `Sum` force execution."
        ] },
        { code: `var orders = new List<Order>();

var summary = orders
    .Where(o => o.Status == Status.Shipped)
    .GroupBy(o => o.CustomerId)
    .Select(g => new
    {
        CustomerId = g.Key,
        Count      = g.Count(),
        Total      = g.Sum(o => o.Total)
    })
    .OrderByDescending(x => x.Total)
    .Take(10)
    .ToList();      // executes here`, lang: "csharp" }
      ]
    },

    {
      id: "anonymous-methods",
      q: "What are anonymous methods in C#? Provide an example.",
      tldr: "Inline unnamed methods written with the `delegate` keyword — the C# 2 predecessor of lambda expressions, which are now preferred.",
      tags: ["delegates", "functional"],
      a: [
        { code: `// C# 2 anonymous method
Func<int, int> square = delegate (int x) { return x * x; };

button.Click += delegate (object s, EventArgs e)
{
    MessageBox.Show("clicked");
};

// Modern equivalent — a lambda
Func<int, int> square2 = x => x * x;
button.Click += (s, e) => MessageBox.Show("clicked");`, lang: "csharp" },
        { ul: [
          "Both capture enclosing variables — they are **closures**.",
          "An anonymous method can **omit the parameter list entirely** if you ignore the parameters: `delegate { ... }`. A lambda cannot.",
          "Lambdas are shorter, support type inference better, and can become **expression trees**; anonymous methods cannot.",
          "In practice, write lambdas. Know the `delegate` form because it still turns up in older codebases."
        ] }
      ]
    },

    {
      id: "yield-keyword",
      q: "What is the yield keyword in C#? Provide an example.",
      tldr: "`yield return` builds a lazy iterator: the compiler turns the method into a state machine that produces one element at a time, on demand.",
      tags: ["iterators", "lazy"],
      a: [
        { ul: [
          "`yield return x` produces the next element and **suspends** the method, keeping its local state.",
          "`yield break` ends the sequence early.",
          "Nothing runs until the caller enumerates — so a bug in the method body will not surface until the first `MoveNext()`.",
          "Memory stays constant: you never materialise the whole sequence.",
          "Works in methods returning `IEnumerable`, `IEnumerable<T>`, `IEnumerator`, `IEnumerator<T>` (and `IAsyncEnumerable<T>` with `await foreach`)."
        ] },
        { code: `public static IEnumerable<int> Fibonacci(int count)
{
    int a = 0, b = 1;
    for (var i = 0; i < count; i++)
    {
        yield return a;                 // produce and suspend
        (a, b) = (b, a + b);
    }
}

// Streams a huge file without loading it into memory
public static IEnumerable<string> ReadLines(string path)
{
    using var reader = new StreamReader(path);
    string line;
    while ((line = reader.ReadLine()) != null)
        yield return line;
}

foreach (var n in Fibonacci(10)) Console.Write(n + " ");   // 0 1 1 2 3 5 ...`, lang: "csharp" },
        { note: "Because execution is deferred, argument validation should live in a **non-iterator wrapper method** that then calls the private iterator — otherwise `ArgumentNullException` is thrown at the `foreach`, not at the call.", kind: "warn" }
      ]
    },

    {
      id: "nullable-types",
      q: "Explain the concept of a Nullable type in C#.",
      tldr: "`Nullable<T>` (written `T?`) lets a value type also hold null, by wrapping the value with a HasValue flag.",
      tags: ["null-safety"],
      a: [
        { ul: [
          "`int?` is shorthand for `Nullable<int>`; only **value types** can be wrapped.",
          "`HasValue` tells you whether there is a value; `Value` throws `InvalidOperationException` if there is not.",
          "`GetValueOrDefault()` and `??` are the safe ways to read it.",
          "**Lifted operators**: arithmetic and comparisons work on nullables, and any operation involving `null` yields `null` (or `false` for comparisons).",
          "Essential for database columns and any 'not supplied' value where `0` would be a real answer."
        ] },
        { code: `int? age = null;

if (age.HasValue) Console.WriteLine(age.Value);
int safe = age ?? 0;
int safe2 = age.GetValueOrDefault(18);

int? a = 5, b = null;
int? sum = a + b;            // null — lifted operator
bool eq = (a == b);          // false, no exception

if (age is int years) { /* pattern matching unwraps it */ }`, lang: "csharp" },
        { note: "Do not confuse this with **nullable reference types** (C# 8, `string?`). Those are purely compile-time annotations that drive warnings — nothing changes at runtime, and there is no `Nullable<T>` wrapper involved.", kind: "warn" }
      ]
    },

    {
      id: "partial-keyword",
      q: "What is the purpose of the partial keyword in C#?",
      tldr: "`partial` splits one type or method across several files, which the compiler merges into a single type at build time.",
      tags: ["organisation", "codegen"],
      a: [
        { ul: [
          "Its main purpose is **separating generated code from hand-written code** — designer files, EF models, Razor pages, source generators.",
          "All parts must be in the same assembly and namespace, and each must be marked `partial`.",
          "**Partial methods** let generated code declare a hook that your file may optionally implement; if nobody implements it, the compiler removes the call entirely.",
          "A classic partial method must return `void`, be `private` and have no `out` parameters. Since C# 9 partial methods may have accessibility and a return type — but then an implementation becomes mandatory."
        ] },
        { code: `// Order.Generated.cs  (regenerated by a tool — never edit)
public partial class Order
{
    public int Id { get; set; }
    partial void OnCreated();          // optional hook
    public Order() { OnCreated(); }
}

// Order.cs  (your code — survives regeneration)
public partial class Order
{
    public decimal Total => Lines.Sum(l => l.Amount);
    partial void OnCreated() => CreatedOn = DateTime.UtcNow;
}`, lang: "csharp" },
        { note: "`partial` is not a way to make a huge class manageable. If a type is too big to fit in one file, the answer is usually to split it into several types.", kind: "tip" }
      ]
    },

    {
      id: "default-keyword",
      q: "Explain the use of the default keyword in C#.",
      tldr: "`default` yields the zero value for a type — 0 for numbers, false for bool, null for reference types — which matters most in generic code where you cannot know T.",
      tags: ["generics", "fundamentals"],
      a: [
        { ul: [
          "`default(T)` gives the type's zero value; since C# 7.1 the bare **`default` literal** infers the type from context.",
          "In a generic method you cannot write `null` or `0` for `T` — `default` is the only correct answer.",
          "It is also the `default:` label in a `switch`, and the default constraint keyword in `switch` expressions is `_`.",
          "`default` for a `struct` returns an instance with every field zeroed, without calling any constructor."
        ] },
        { code: `public T FirstOrDefault<T>(IEnumerable<T> items)
{
    foreach (var i in items) return i;
    return default;              // null for classes, 0 for int, etc.
}

int    a = default;              // 0
bool   b = default;              // false
string s = default;              // null
Point  p = default;              // Point with X = 0, Y = 0

if (EqualityComparer<T>.Default.Equals(value, default)) { /* is it unset? */ }`, lang: "csharp" },
        { note: "`default` for a nullable value type is `null`, not `0` — `default(int?)` is `null`. Easy to get wrong under pressure.", kind: "warn" }
      ]
    },

    {
      id: "tuples",
      q: "What are tuples in C#? Provide an example.",
      tldr: "A lightweight way to group several values without declaring a type — ValueTuple (C# 7) is a mutable struct with optional element names.",
      tags: ["types"],
      a: [
        { ul: [
          "**`ValueTuple`** — `(int, string)`, C# 7+. A **struct**, no allocation, mutable, supports element names and deconstruction. This is the one you want.",
          "**`System.Tuple`** — the old C# 4 class. Reference type, allocates, and its members are the unhelpful `Item1`, `Item2`.",
          "The main use is returning multiple values from a **private or internal** method without inventing a type.",
          "**Deconstruction** unpacks a tuple into separate variables, and any type can support it by defining a `Deconstruct` method."
        ] },
        { code: `public (bool Success, string Error) Validate(Order o)
{
    if (o.Total <= 0) return (false, "Total must be positive");
    return (true, null);
}

var result = Validate(order);
if (!result.Success) Console.WriteLine(result.Error);

var (ok, error) = Validate(order);      // deconstruction

(int x, int y) point = (3, 4);
(x, y) = (y, x);                        // swap without a temp`, lang: "csharp" },
        { note: "For a **public API**, prefer a named record or class. Tuple element names are compiler metadata only, so they carry no documentation, validation or behaviour.", kind: "tip" }
      ]
    },

    {
      id: "reflection",
      q: "Explain the concept of reflection in C#.",
      tldr: "Reflection inspects and manipulates type metadata at runtime — discovering types, reading attributes, and creating instances or invoking members dynamically.",
      tags: ["reflection", "metadata"],
      a: [
        { ul: [
          "Everything compiled into an assembly keeps its metadata, and `System.Reflection` reads it.",
          "Used by **serializers, ORMs, DI containers, test runners, validators and mappers** — anything that must work with types it was not compiled against.",
          "It can read **custom attributes**, which is how `[Required]` or `[Test]` are discovered.",
          "It can bypass accessibility with `BindingFlags.NonPublic`, which is why it needs full trust.",
          "It is **slow** relative to direct calls — cache `Type`/`PropertyInfo` lookups, or compile a delegate once with expression trees."
        ] },
        { code: `Type t = typeof(Order);                     // or order.GetType()

foreach (var p in t.GetProperties())
    Console.WriteLine($"{p.Name} : {p.PropertyType.Name}");

var instance = (Order)Activator.CreateInstance(t);
t.GetProperty("Total").SetValue(instance, 99m);

var method = t.GetMethod("Recalculate");
method.Invoke(instance, null);

// Reading an attribute
var attr = t.GetCustomAttribute<TableAttribute>();`, lang: "csharp" },
        { note: "In a hot path, replace repeated `PropertyInfo.GetValue` with a compiled `Func<T, object>` built from an expression tree — typically two orders of magnitude faster.", kind: "tip" }
      ]
    },

    {
      id: "attributes",
      q: "What are attributes in C#? Provide an example.",
      tldr: "Attributes attach declarative metadata to code elements, which tools and frameworks read at runtime via reflection.",
      tags: ["metadata", "reflection"],
      seeAlso: ["csharp-advanced/custom-attribute"],
      a: [
        { ul: [
          "Written in square brackets above the target: `[Obsolete]`, `[Serializable]`, `[Required]`, `[HttpGet]`.",
          "They do nothing on their own — something has to **read** them, usually with reflection.",
          "Common built-ins: `[Obsolete]` (compiler warning), `[Conditional(\"DEBUG\")]` (call removed in release), `[CallerMemberName]`, `[DebuggerDisplay]`.",
          "You can write your own by deriving from `System.Attribute`."
        ] },
        { code: `public class Customer
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; }

    [Obsolete("Use ContactEmail instead", error: false)]
    public string Email { get; set; }
}

// Reading them back
var prop = typeof(Customer).GetProperty("Name");
var attrs = prop.GetCustomAttributes<ValidationAttribute>();`, lang: "csharp" }
      ]
    },

    {
      id: "nameof-operator",
      q: "What is the purpose of the nameof operator in C#?",
      tldr: "`nameof(x)` returns the simple name of a symbol as a compile-time string constant, so renaming stays safe and there is no runtime cost.",
      tags: ["fundamentals"],
      a: [
        { ul: [
          "Resolved at **compile time** into a literal — zero runtime cost, and no reflection.",
          "**Refactor-safe**: renaming the symbol updates the string; a hard-coded `\"Name\"` silently rots.",
          "Returns only the **last segment**: `nameof(person.Address.City)` is `\"City\"`.",
          "Standard uses: argument exception messages, `INotifyPropertyChanged`, logging, and MVC route/view references."
        ] },
        { code: `public void Save(Order order)
{
    if (order is null) throw new ArgumentNullException(nameof(order));
    _logger.LogInformation("Entering {Method}", nameof(Save));
}

// INotifyPropertyChanged
private string _name;
public string Name
{
    get => _name;
    set { _name = value; OnPropertyChanged(nameof(Name)); }
}`, lang: "csharp" }
      ]
    },

    {
      id: "func-and-action",
      q: "Explain the use of Func and Action delegates in C#.",
      tldr: "Built-in generic delegates so you rarely need to declare your own: Action returns void, Func returns a value as its last type argument, Predicate returns bool.",
      tags: ["delegates", "functional"],
      seeAlso: ["csharp-basic/delegate"],
      a: [
        { table: { head: ["Delegate", "Signature", "Use"], rows: [
          ["`Action`", "`void ()`", "No input, no result"],
          ["`Action<T1..T16>`", "`void (T1..T16)`", "Takes arguments, returns nothing"],
          ["`Func<TResult>`", "`TResult ()`", "Returns a value"],
          ["`Func<T1..T16, TResult>`", "`TResult (T1..T16)`", "**Last** type argument is always the return type"],
          ["`Predicate<T>`", "`bool (T)`", "A test — same as `Func<T, bool>`"]
        ] } },
        { code: `Action<string> log = Console.WriteLine;
Func<int, int, int> add = (a, b) => a + b;
Predicate<Order> isLarge = o => o.Total > 1000;

// Injecting behaviour without an interface
public T Retry<T>(Func<T> operation, int attempts = 3)
{
    for (var i = 1; ; i++)
    {
        try { return operation(); }
        catch when (i < attempts) { Thread.Sleep(200 * i); }
    }
}

var data = Retry(() => _api.Fetch(id));`, lang: "csharp" },
        { note: "Only declare a custom delegate type when the name carries meaning the signature does not, or when you need `ref`/`out` parameters — `Func`/`Action` cannot express those.", kind: "tip" }
      ]
    },

    {
      id: "gc-collect",
      q: "What is the purpose of GC.Collect method in C#?",
      tldr: "It forces an immediate garbage collection — and in production code you should almost never call it.",
      tags: ["memory", "gc"],
      seeAlso: ["csharp-advanced/gc-collect-advanced", "csharp-basic/garbage-collection"],
      a: [
        { ul: [
          "`GC.Collect()` collects all generations; `GC.Collect(0)` only Gen 0.",
          "It **hurts performance**: it defeats the GC's tuned heuristics, promotes surviving objects prematurely, and blocks threads.",
          "It does **not** release unmanaged resources — that is what `IDisposable` is for.",
          "`GC.Collect(); GC.WaitForPendingFinalizers(); GC.Collect();` is the pattern people copy to also run finalizers. The need for it is usually a design smell.",
          "The two defensible uses: a **benchmark or memory test** that needs a clean baseline, and a one-off point where a genuinely large, long-lived cache was just released."
        ] },
        { note: "The right answer in an interview is: 'It forces a collection, and I would not call it — if memory is a problem I would fix the allocations or the disposal, not poke the GC.'", kind: "tip" }
      ]
    },

    {
      id: "readonly-keyword",
      q: "Explain the readonly keyword in C#.",
      tldr: "A readonly field can only be assigned at its declaration or in a constructor, making the reference (not necessarily the object) immutable after construction.",
      tags: ["immutability"],
      seeAlso: ["csharp-intermediate/const-vs-readonly"],
      a: [
        { ul: [
          "**`readonly` field** — assignable only in the declaration or a constructor of the same class.",
          "It freezes the **reference**, not the object. A `readonly List<T>` can still have items added — only reassigning the field is blocked.",
          "**`static readonly`** is the right way to express a constant whose value is computed at runtime or might change between versions.",
          "**`readonly struct`** (C# 7.2) makes the whole struct immutable and lets the compiler skip defensive copies.",
          "**`readonly` members** on a struct (C# 8) promise the member does not mutate the instance.",
          "It is the standard way to hold injected dependencies."
        ] },
        { code: `public class OrderService
{
    private readonly IRepository _repo;              // set once, in the ctor
    private readonly List<string> _log = new();      // reference is fixed

    public OrderService(IRepository repo) => _repo = repo;

    public void Do()
    {
        _log.Add("x");        // allowed — mutating the object
        // _log = new List<string>();   // not allowed — reassigning the field
    }
}

public readonly struct Money
{
    public Money(decimal amount) => Amount = amount;
    public decimal Amount { get; }        // whole struct is immutable
}`, lang: "csharp" }
      ]
    },

    {
      id: "volatile-keyword",
      q: "What is volatile keyword in C#?",
      tldr: "`volatile` tells the compiler and CPU not to reorder or cache reads and writes of a field, so every thread sees the latest value — but it gives no atomicity.",
      tags: ["threading", "memory-model"],
      a: [
        { ul: [
          "Without it, a compiler or CPU optimisation may cache a field in a register, so one thread never observes another thread's write.",
          "It enforces **acquire semantics on reads and release semantics on writes** — a memory fence that prevents reordering across the access.",
          "It provides **no atomicity**. `_counter++` on a volatile field is still a race — that is a read, an add and a write.",
          "Allowed only on fields of reference types, pointers, and primitives up to 32 bits (plus `bool`, `enum` with those bases). Not on `double`, `long` or `struct`.",
          "In practice prefer `Interlocked`, `lock`, or `Volatile.Read`/`Volatile.Write`, which express the intent more clearly."
        ] },
        { code: `private volatile bool _stopRequested;

// Thread A
public void Stop() => _stopRequested = true;

// Thread B — without volatile this loop can spin forever
public void Work()
{
    while (!_stopRequested) { DoChunk(); }
}

// For counters, volatile is NOT enough:
private int _count;
Interlocked.Increment(ref _count);      // this is the correct tool`, lang: "csharp" },
        { note: "For cancelling work, `CancellationToken` is the idiomatic modern answer — the volatile bool flag is mainly a teaching example.", kind: "tip" }
      ]
    },

    {
      id: "in-keyword",
      q: "Explain the purpose of the in keyword in C#.",
      tldr: "`in` has three unrelated jobs: a read-only by-reference parameter, the source in a foreach/LINQ query, and contravariance on a generic type parameter.",
      tags: ["parameters", "generics"],
      a: [
        { p: "**1. Read-only reference parameter** (C# 7.2) — pass a large struct by reference to avoid copying it, while guaranteeing the method cannot modify it:" },
        { code: `public static double Distance(in Vector3 a, in Vector3 b)
{
    // a and b are passed by reference, but are read-only here
    // a.X = 0;   // compiler error
    return Math.Sqrt((a.X - b.X) * (a.X - b.X));
}`, lang: "csharp" },
        { p: "**2. Iteration source** — in `foreach` and in LINQ query syntax:" },
        { code: `foreach (var item in items) { }

var q = from o in orders where o.Total > 10 select o;`, lang: "csharp" },
        { p: "**3. Contravariant type parameter** — `T` may only appear in input positions:" },
        { code: `public interface IComparer<in T> { int Compare(T x, T y); }`, lang: "csharp" },
        { table: { head: ["", "`in`", "`ref`", "`out`"], rows: [
          ["Passed by reference", "Yes", "Yes", "Yes"],
          ["Callee may modify", "No", "Yes", "Must assign"],
          ["Caller must initialise", "Yes", "Yes", "No"]
        ] } },
        { note: "`in` only pays off for structs larger than a pointer. On a small struct the extra indirection can make it slower, and the compiler may insert defensive copies unless the struct is a `readonly struct`.", kind: "warn" }
      ]
    },

    {
      id: "const-vs-readonly",
      q: "What is the difference between const and readonly in C#?",
      tldr: "const is a compile-time literal inlined into every caller; readonly is a runtime value assigned in the constructor.",
      tags: ["immutability"],
      seeAlso: ["csharp-basic/readonly-vs-const", "csharp-intermediate/readonly-keyword"],
      a: [
        { table: { head: ["", "`const`", "`readonly`"], rows: [
          ["Value fixed at", "Compile time", "Runtime"],
          ["Where assignable", "Declaration only", "Declaration or constructor"],
          ["Implicitly static", "Yes", "No (`static readonly` is explicit)"],
          ["Allowed types", "Primitives, `string`, `enum`, `null`", "Any type"],
          ["Can differ per instance", "No", "Yes"],
          ["Usable in attributes / `case` labels", "Yes", "No"]
        ] } },
        { p: "The difference that actually causes bugs is **versioning**. A `const` is copied into the IL of everything that references it:" },
        { code: `// Assembly A, v1
public class Config { public const int MaxRetries = 3; }

// Assembly B compiled against v1 — the value 3 is baked into B's IL

// Assembly A, v2
public class Config { public const int MaxRetries = 5; }

// Ship only A. B still uses 3 until B is recompiled.
// With "public static readonly int MaxRetries = 5;" B would pick up 5 immediately.`, lang: "csharp" },
        { note: "Guidance: use `const` only for values that are true forever by definition — `Pi`, `DaysInWeek`. Use `static readonly` for anything configuration-shaped.", kind: "tip" }
      ]
    },

    {
      id: "dynamic-type",
      q: "What is the dynamic type in C#?",
      tldr: "`dynamic` turns off compile-time type checking for an expression and resolves members at runtime through the DLR.",
      tags: ["types", "dlr"],
      a: [
        { ul: [
          "Everything about a `dynamic` expression is bound at **runtime**; a wrong member name compiles fine and throws `RuntimeBinderException` when executed.",
          "It is not `var`: `var` is **compile-time inference** and stays fully typed. It is not `object` either — `object` requires a cast before you can call anything.",
          "Real uses: COM interop, dynamic JSON/`ExpandoObject`, IronPython interop, and simplifying deep reflection code.",
          "It costs performance (call-site caching helps, but it is still far slower) and loses IntelliSense and refactoring."
        ] },
        { code: `dynamic d = "hello";
Console.WriteLine(d.Length);        // 5 — resolved at runtime
Console.WriteLine(d.Nonsense());    // compiles; throws RuntimeBinderException

var v = "hello";                    // v is string, checked at compile time
object o = "hello";
// o.Length;                        // compiler error — needs a cast

dynamic expando = new ExpandoObject();
expando.Anything = 42;              // properties added at runtime`, lang: "csharp" },
        { note: "Comparison table for the follow-up: `var` = compile-time inference, `object` = compile-time base type needing a cast, `dynamic` = no compile-time checking at all.", kind: "tip" }
      ]
    },

    {
      id: "params-keyword",
      q: "Explain the params keyword in C#.",
      tldr: "`params` lets a method accept a variable number of arguments as an array, called with a comma-separated list or an array.",
      tags: ["parameters"],
      a: [
        { ul: [
          "Must be the **last parameter**, and there can be only one.",
          "The caller may pass zero or more arguments, or an existing array.",
          "The compiler allocates an array on each call — in a hot path, provide non-params overloads for the common arities (which is what `string.Format` does).",
          "C# 13 extends `params` to `Span<T>`, `IEnumerable<T>` and other collection types, avoiding the allocation."
        ] },
        { code: `public static int Sum(params int[] numbers)
{
    var total = 0;
    foreach (var n in numbers) total += n;
    return total;
}

Sum();                       // 0   — empty array
Sum(1, 2, 3);                // 6
Sum(new[] { 1, 2, 3 });      // 6   — array passed directly

public void Log(string format, params object[] args) { }`, lang: "csharp" },
        { note: "A non-params overload always wins over the params one, so `Sum(int a, int b)` beats `Sum(params int[])` when called with two arguments — the usual reason a params overload is 'never hit'.", kind: "warn" }
      ]
    },

    {
      id: "arraylist-vs-list",
      q: "What is the difference between ArrayList and List<T> in C#?",
      tldr: "ArrayList is the pre-generics, untyped collection that stores everything as object; List<T> is strongly typed with no boxing and should always be preferred.",
      tags: ["collections", "generics"],
      a: [
        { table: { head: ["", "`ArrayList`", "`List<T>`"], rows: [
          ["Namespace", "`System.Collections`", "`System.Collections.Generic`"],
          ["Type safety", "None — everything is `object`", "Compile-time checked"],
          ["Value types", "**Boxed** on add, unboxed on read", "Stored directly"],
          ["Reading an item", "Needs a cast", "No cast"],
          ["Performance", "Slower — boxing plus allocations", "Faster"],
          ["When to use", "Legacy code only", "Always"]
        ] } },
        { code: `var old = new ArrayList();
old.Add(1);
old.Add("two");                   // compiles — no type safety at all
int x = (int)old[0];              // cast, and unboxing
// int y = (int)old[1];           // runtime InvalidCastException

var list = new List<int>();
list.Add(1);
// list.Add("two");               // compiler error — caught immediately
int z = list[0];                  // no cast, no boxing`, lang: "csharp" },
        { note: "The same pairing applies to `Hashtable` vs `Dictionary<K,V>` and `Queue`/`Stack` vs their generic versions. The generic ones are the answer every time.", kind: "tip" }
      ]
    },

    {
      id: "sealed-keyword",
      q: "What is the sealed keyword in C#?",
      tldr: "sealed prevents inheritance on a class, or prevents further overriding of a member that is already an override.",
      tags: ["oop"],
      seeAlso: ["csharp-basic/sealed-basic"],
      a: [
        { ul: [
          "`sealed class` — nothing can derive from it. `string`, `int` and every other `struct` are effectively sealed.",
          "`sealed override` — the override chain stops here; classes further down cannot override it again.",
          "You cannot combine `sealed` with `abstract` on a class — that would be a type nobody could ever use.",
          "**Design reason**: the class was never designed to be extended, and inheriting from it would break its invariants or its security model.",
          "**Performance reason**: the JIT can devirtualise and inline calls on a sealed type, because there is no possibility of a more derived override."
        ] },
        { code: `public sealed class ConnectionString
{
    // Immutable and security-sensitive — inheritance could subvert validation
}

public class Repo         { public virtual void Save() { } }
public class SqlRepo : Repo { public sealed override void Save() { } }
// public class Fast : SqlRepo { public override void Save() { } }  // error`, lang: "csharp" },
        { note: "\"Seal by default, open deliberately\" is a common framework guideline: unsealing later is a non-breaking change, sealing later is not.", kind: "tip" }
      ]
    },

    {
      id: "obj-vs-bin",
      q: "What is the difference between obj and bin folder?",
      tldr: "obj holds intermediate build artefacts for a single project; bin holds the final, runnable output including referenced assemblies.",
      tags: ["tooling", "build"],
      a: [
        { table: { head: ["", "`obj/`", "`bin/`"], rows: [
          ["Contains", "Intermediate output: per-project compiled DLL, `.pdb`, generated `AssemblyInfo`, `project.assets.json`, NuGet resolution, source-generator output", "Final output: your DLL/EXE plus every referenced assembly, config files, runtime config"],
          ["Purpose", "Working area for MSBuild, enables **incremental builds**", "What you actually run, debug or deploy"],
          ["Copied from", "Compiler output", "`obj` is copied here, then dependencies are added"],
          ["Safe to delete", "Yes — a rebuild recreates it", "Yes — a rebuild recreates it"],
          ["Source control", "Ignored", "Ignored"]
        ] } },
        { ul: [
          "The build order is: compile into `obj/<Configuration>/<TFM>/`, then copy to `bin/<Configuration>/<TFM>/` and pull in referenced assemblies.",
          "`obj` is what makes a second build fast — MSBuild compares timestamps and skips unchanged work.",
          "Deleting both is what **Clean** does, and is the standard fix for a stale or corrupted build.",
          "Both belong in `.gitignore` — the standard Visual Studio template already excludes them."
        ] },
        { note: "The usual follow-up: 'why does my build still fail after fixing the code?' — a stale `obj` folder. Delete `bin` and `obj` and rebuild.", kind: "tip" }
      ]
    }

  ]
});
