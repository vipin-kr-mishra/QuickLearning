/* C# — Advanced. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "csharp-advanced",
  topic: "C#",
  level: "Advanced",
  short: "C# Advanced",
  accent: "violet",
  desc: "Runtime internals, memory and performance, concurrency primitives, metaprogramming and the low-level types you reach for when the profiler says so.",
  questions: [

    {
      id: "custom-attribute",
      q: "How do you implement a custom attribute in C#?",
      tldr: "Derive a class from System.Attribute, name it XxxAttribute, mark it with [AttributeUsage] to control where it applies, then read it back with reflection.",
      tags: ["metadata", "reflection"],
      seeAlso: ["csharp-intermediate/attributes"],
      a: [
        { ol: [
          "Inherit from `System.Attribute` and end the name with `Attribute` — the suffix is dropped at the usage site.",
          "Apply `[AttributeUsage]` to declare valid targets, whether it may be repeated (`AllowMultiple`) and whether derived types inherit it (`Inherited`).",
          "Expose required data as constructor parameters and optional data as settable properties.",
          "Read it at runtime with `GetCustomAttribute<T>()`."
        ] },
        { code: `[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field,
                AllowMultiple = false, Inherited = true)]
public sealed class ColumnAttribute : Attribute
{
    public ColumnAttribute(string name) => Name = name;   // required

    public string Name { get; }
    public bool IsKey { get; set; }                       // optional
    public int Order { get; set; } = 0;
}

public class Customer
{
    [Column("customer_id", IsKey = true)]
    public int Id { get; set; }

    [Column("full_name", Order = 1)]
    public string Name { get; set; }
}`, lang: "csharp" },
        { code: `foreach (var prop in typeof(Customer).GetProperties())
{
    var col = prop.GetCustomAttribute<ColumnAttribute>();
    if (col is null) continue;
    Console.WriteLine($"{prop.Name} -> {col.Name} (key: {col.IsKey})");
}`, lang: "csharp", caption: "Reading it back" },
        { ul: [
          "Attribute constructor arguments must be **compile-time constants** — literals, `typeof(...)`, enums or arrays of those.",
          "Seal your attributes; it speeds up attribute lookup.",
          "Reflection over attributes is slow — cache the result per `Type` in a static dictionary."
        ] }
      ]
    },

    {
      id: "iequatable",
      q: "What is the purpose of the IEquatable<T> interface?",
      tldr: "It provides a strongly typed Equals(T) so equality checks avoid boxing and casting — collections use it in preference to object.Equals.",
      tags: ["equality", "performance"],
      a: [
        { ul: [
          "`object.Equals(object)` forces a **cast** and, for a struct, a **boxing allocation**. `IEquatable<T>.Equals(T)` avoids both.",
          "`EqualityComparer<T>.Default` checks for `IEquatable<T>` first, so `List<T>.Contains`, `Dictionary<K,V>` and `HashSet<T>` all get the fast path automatically.",
          "Implementing it correctly means overriding `object.Equals` and `GetHashCode` too, so all routes agree.",
          "It matters most for **structs**, where the default `ValueType.Equals` uses reflection and is very slow.",
          "`record` types generate all of this for you."
        ] },
        { code: `public readonly struct Money : IEquatable<Money>
{
    public Money(decimal amount, string currency)
        => (Amount, Currency) = (amount, currency);

    public decimal Amount { get; }
    public string Currency { get; }

    public bool Equals(Money other)                       // no boxing
        => Amount == other.Amount && Currency == other.Currency;

    public override bool Equals(object obj)               // keep consistent
        => obj is Money m && Equals(m);

    public override int GetHashCode()
        => HashCode.Combine(Amount, Currency);

    public static bool operator ==(Money a, Money b) => a.Equals(b);
    public static bool operator !=(Money a, Money b) => !a.Equals(b);
}`, lang: "csharp" },
        { note: "Contract rules for `GetHashCode`: equal objects **must** return the same hash, it must not change while the object is a dictionary key, and unequal objects may collide. Never hash on a mutable property.", kind: "warn" }
      ]
    },

    {
      id: "deep-copy",
      q: "How do you create a deep copy of an object in C#?",
      tldr: "There is no built-in deep clone — you either write a copy constructor, serialize and deserialize, or walk the graph with reflection. A copy constructor is usually the right answer.",
      tags: ["cloning", "serialization"],
      a: [
        { p: "`MemberwiseClone()` is a **shallow** copy: value fields are copied, but reference fields still point at the same objects. A deep copy duplicates the whole object graph." },
        { p: "**1. Copy constructor / manual clone — explicit, fast, type-safe.** The recommended approach:" },
        { code: `public class Address
{
    public string City { get; set; }
    public Address(Address other) => City = other.City;
    public Address() { }
}

public class Person
{
    public string Name { get; set; }
    public Address Home { get; set; }
    public List<string> Tags { get; set; } = new();

    public Person DeepCopy() => new Person
    {
        Name = Name,
        Home = Home is null ? null : new Address(Home),
        Tags = new List<string>(Tags)
    };
}`, lang: "csharp" },
        { p: "**2. Serialize and deserialize — generic, handles the whole graph, slower:**" },
        { code: `public static T DeepCopy<T>(T source)
{
    var json = JsonSerializer.Serialize(source);
    return JsonSerializer.Deserialize<T>(json);
}`, lang: "csharp", caption: "Note: BinaryFormatter is obsolete and insecure — never use it" },
        { p: "**3. Records — `with` gives a shallow copy, so nest it for depth:**" },
        { code: `public record Person(string Name, Address Home);
var copy = original with { Home = original.Home with { } };`, lang: "csharp" },
        { note: "Ask about **cycles**. A naive recursive clone of a graph with a back-reference will stack overflow. A reflection-based cloner needs a visited-set keyed by reference identity.", kind: "warn" }
      ]
    },

    {
      id: "synchronizationcontext",
      q: "What is the purpose of the SynchronizationContext class?",
      tldr: "It abstracts \"where\" a continuation should run, which is how await returns you to the UI thread or an ASP.NET request context automatically.",
      tags: ["async", "threading"],
      a: [
        { ul: [
          "`SynchronizationContext.Post` queues work to a specific context — the WPF/WinForms message loop, the ASP.NET (classic) request context, or nothing at all for a console app.",
          "`await` captures `SynchronizationContext.Current` before suspending and posts the continuation back to it, which is why UI code can touch controls after an `await`.",
          "`ConfigureAwait(false)` opts out of the capture, so the continuation runs on a thread-pool thread. **Library code should use it** — it is faster and avoids deadlocks.",
          "The classic **deadlock**: on a UI or ASP.NET (classic) thread, calling `.Result` blocks the one thread the continuation needs to resume on.",
          "**ASP.NET Core has no SynchronizationContext**, which is why the deadlock does not happen there and `ConfigureAwait(false)` matters less in app code."
        ] },
        { code: `// Deadlocks on WinForms/WPF/classic ASP.NET
public void Button_Click(object s, EventArgs e)
{
    var data = LoadAsync().Result;    // UI thread blocked...
}

private async Task<string> LoadAsync()
{
    await Task.Delay(100);            // ...continuation needs the UI thread
    return "done";
}

// Fixes: await all the way up, or in the library:
await Task.Delay(100).ConfigureAwait(false);`, lang: "csharp" }
      ]
    },

    {
      id: "memory-management",
      q: "Explain the concept of memory management in C#.",
      tldr: "The CLR splits memory into a stack per thread and a generational, compacting managed heap that the GC reclaims automatically; unmanaged resources remain your responsibility via IDisposable.",
      tags: ["memory", "gc"],
      seeAlso: ["csharp-basic/garbage-collection", "csharp-advanced/span-t"],
      a: [
        { ul: [
          "**Stack** — one per thread, ~1 MB, holds locals, parameters and value types. Freed automatically when a frame pops; allocation is a pointer bump.",
          "**Managed heap** — reference types and boxed values. Allocation is also a pointer bump into the current segment, which is why `new` is cheap in .NET.",
          "**Generations** — Gen 0 (new, collected often and cheaply), Gen 1 (a buffer), Gen 2 (long-lived, collected rarely). Most objects die in Gen 0, which is what makes the design work.",
          "**Large Object Heap** — objects over 85,000 bytes. Collected with Gen 2, not compacted by default, and prone to fragmentation.",
          "**Compaction** moves survivors together after a collection so free space stays contiguous.",
          "**Workstation vs Server GC**: server GC uses a heap and a dedicated thread per core — the right choice for a web app."
        ] },
        { table: { head: ["Concept", "Meaning"], rows: [
          ["Root", "Static field, stack local, register or GC handle — the starting point for reachability"],
          ["Finalizer", "`~Type()`, non-deterministic, costs an extra GC cycle; avoid unless you own a native handle"],
          ["`IDisposable`", "Deterministic release of **unmanaged** resources — files, sockets, connections"],
          ["Pinning", "`fixed`/`GCHandle` stops an object moving so native code can hold a pointer; harms compaction"],
          ["Weak reference", "`WeakReference<T>` lets you keep a pointer that does not prevent collection — cache-friendly"]
        ] } },
        { note: "The commonest managed 'leak' is not a leak at all — it is an unintended **live reference**: a static collection that keeps growing, or an event handler that was never unsubscribed.", kind: "warn" }
      ]
    },

    {
      id: "circular-references-serialization",
      q: "How do you handle circular references in serialization?",
      tldr: "Either preserve references so each object is written once and referred to by id, ignore the cycle, or shape the payload with a DTO — the DTO is usually the right answer for an API.",
      tags: ["serialization", "json"],
      a: [
        { p: "A parent holding children that each point back at the parent will make a naive serializer recurse forever and throw (or stack overflow)." },
        { code: `// System.Text.Json — emit $id / $ref metadata
var options = new JsonSerializerOptions
{
    ReferenceHandler = ReferenceHandler.Preserve,
    WriteIndented = true
};
var json = JsonSerializer.Serialize(order, options);

// Or simply stop descending at a fixed depth / drop the cycle
var options2 = new JsonSerializerOptions { MaxDepth = 16 };`, lang: "csharp" },
        { code: `// Newtonsoft.Json equivalents
new JsonSerializerSettings
{
    ReferenceLoopHandling = ReferenceLoopHandling.Ignore,   // skip the back-reference
    PreserveReferencesHandling = PreserveReferencesHandling.Objects
};

// Or annotate the offending property
public class OrderLine
{
    [JsonIgnore]
    public Order Parent { get; set; }
}`, lang: "csharp" },
        { ul: [
          "**`ReferenceHandler.Preserve`** — correct and lossless, but the payload gains `$id`/`$ref` keys that non-.NET clients will not understand.",
          "**Ignore / `[JsonIgnore]`** — simple, but the back-reference is silently lost on deserialization.",
          "**DTO or projection** — map the entity to a flat shape built for the wire. Best for public APIs: no cycles by construction, no over-fetching, and the contract is explicit.",
          "This bites hardest with **EF navigation properties**, which is exactly why serializing entities directly is discouraged."
        ] }
      ]
    },

    {
      id: "caching",
      q: "What are the different ways to implement caching in C#?",
      tldr: "In-process (IMemoryCache / ConcurrentDictionary), distributed (Redis via IDistributedCache), response/output caching, and lazy memoisation — chosen by scope and invalidation needs.",
      tags: ["performance", "caching"],
      a: [
        { table: { head: ["Approach", "Scope", "Use when"], rows: [
          ["`IMemoryCache`", "One process", "Fast lookups, single instance, tolerant of duplication across nodes"],
          ["`IDistributedCache` (Redis, SQL)", "All instances", "Load-balanced apps that must share state or survive restarts"],
          ["`ConcurrentDictionary`", "One process", "Small, permanent lookup tables with no eviction policy"],
          ["`Lazy<T>` / `AsyncLazy`", "One value", "Expensive one-time initialisation, thread-safe by construction"],
          ["Response / output caching", "HTTP layer", "Whole responses that are identical for many users"],
          ["`HybridCache` (.NET 9)", "Both", "L1 in-memory in front of L2 distributed, with stampede protection"]
        ] } },
        { code: `public async Task<Product> GetAsync(int id)
{
    return await _cache.GetOrCreateAsync($"product:{id}", async entry =>
    {
        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
        entry.SlidingExpiration = TimeSpan.FromMinutes(2);
        entry.SetSize(1);
        return await _repo.LoadAsync(id);
    });
}`, lang: "csharp", caption: "IMemoryCache with both expiry styles" },
        { ul: [
          "**Absolute** expiry caps staleness; **sliding** expiry keeps hot items alive; use both together so a hot item still refreshes eventually.",
          "Always set `SizeLimit` plus per-entry `SetSize`, or an in-memory cache will grow until the process is killed.",
          "**Cache stampede**: when a popular key expires, many requests recompute at once. Guard the refresh with a `SemaphoreSlim` per key.",
          "Invalidation strategies: time-based (simplest), event-based eviction on write, or key versioning (`product:42:v7`).",
          "Do not cache per-user data in a shared key — the classic data-leak bug."
        ] }
      ]
    },

    {
      id: "unsafe-code",
      q: "How do you work with unsafe code in C#?",
      tldr: "Mark the code `unsafe`, enable AllowUnsafeBlocks in the project, and use `fixed` to pin managed memory while you hold a pointer to it.",
      tags: ["interop", "performance"],
      seeAlso: ["csharp-advanced/raw-pointers"],
      a: [
        { code: `<PropertyGroup>
  <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
</PropertyGroup>`, lang: "xml", caption: "Required in the .csproj" },
        { code: `public static unsafe int CountZeros(byte[] data)
{
    fixed (byte* p = data)          // pin: the GC may not move it
    {
        var count = 0;
        for (var i = 0; i < data.Length; i++)
            if (p[i] == 0) count++;
        return count;
    }
}                                    // unpinned here

// Stack allocation — no GC involvement at all
Span<byte> buffer = stackalloc byte[256];`, lang: "csharp" },
        { ul: [
          "`fixed` **pins** an object so the GC cannot move it during compaction. Keep the block as short as possible — pinning fragments the heap.",
          "`stackalloc` allocates on the stack; combined with `Span<T>` it is usable in safe code and avoids heap pressure entirely.",
          "Legitimate uses: **P/Invoke and native interop**, image or buffer processing, and parsing hot paths where bounds checks dominate.",
          "You lose bounds checking and type safety, so buffer overruns become possible — this is genuinely unsafe.",
          "Modern alternative: `Span<T>`, `Memory<T>` and `System.Runtime.CompilerServices.Unsafe` give most of the speed while staying verifiable."
        ] }
      ]
    },

    {
      id: "taskcompletionsource",
      q: "What is the purpose of the TaskCompletionSource class?",
      tldr: "It gives you a Task you control manually — you decide when it completes, faults or cancels, which is how callback-based APIs are wrapped as awaitable ones.",
      tags: ["async", "interop"],
      a: [
        { ul: [
          "`TaskCompletionSource<T>` exposes a `.Task` plus `SetResult`, `SetException` and `SetCanceled`.",
          "The primary use is **adapting an event- or callback-based API** into the Task-based pattern.",
          "Also used for signalling between components, and for test doubles that must complete on demand.",
          "Prefer `TrySetResult`/`TrySetException` — the `Set*` methods throw if the task is already completed.",
          "**Always pass `TaskCreationOptions.RunContinuationsAsynchronously`**, otherwise the continuation runs inline on the thread that called `SetResult`, which can deadlock or cause surprising re-entrancy."
        ] },
        { code: `public static Task<string> ReadLineAsync(this SerialPort port,
                                         CancellationToken ct)
{
    var tcs = new TaskCompletionSource<string>(
        TaskCreationOptions.RunContinuationsAsynchronously);

    void Handler(object s, EventArgs e) => tcs.TrySetResult(port.ReadLine());

    port.DataReceived += Handler;
    ct.Register(() => tcs.TrySetCanceled(ct));

    return tcs.Task.ContinueWith(t =>
    {
        port.DataReceived -= Handler;     // always unsubscribe
        return t.GetAwaiter().GetResult();
    }, TaskContinuationOptions.ExecuteSynchronously);
}`, lang: "csharp" }
      ]
    },

    {
      id: "conversion-operators",
      q: "How do you implement custom conversion operators in C#?",
      tldr: "Declare a public static implicit or explicit operator that converts to or from your type; implicit for always-safe conversions, explicit when it can lose data or throw.",
      tags: ["operators", "types"],
      a: [
        { code: `public readonly struct Celsius
{
    public Celsius(double degrees) => Degrees = degrees;
    public double Degrees { get; }

    // Implicit: always safe, never throws, no information lost
    public static implicit operator double(Celsius c) => c.Degrees;

    // Explicit: requires a cast, signals it may lose data or throw
    public static explicit operator Celsius(double d)
        => d < -273.15
            ? throw new ArgumentOutOfRangeException(nameof(d))
            : new Celsius(d);
}

Celsius c = (Celsius)25.0;     // explicit — cast required
double d = c;                  // implicit — just works`, lang: "csharp" },
        { ul: [
          "Must be `public static`, and one of the two types involved must be the declaring type.",
          "**Implicit** for widening, lossless, exception-free conversions. **Explicit** for anything narrowing, lossy or fallible.",
          "You cannot define a conversion between a base class and a derived class — the language already defines those.",
          "Overuse hurts readability: an implicit conversion that silently fires is hard to spot in a code review. `Parse`/`ToX()` methods are often clearer."
        ] },
        { note: "An implicit operator that can throw is the anti-pattern here — the caller wrote no cast, so nothing in the code suggests an exception is possible.", kind: "warn" }
      ]
    },

    {
      id: "caller-info-attributes",
      q: "Explain the purpose of the CallerFilePath and CallerLineNumber attributes.",
      tldr: "Caller-info attributes make the compiler fill in the call site's file, line and member name as default parameter values — free diagnostics with no reflection or stack walking.",
      tags: ["diagnostics", "metadata"],
      a: [
        { ul: [
          "`[CallerMemberName]`, `[CallerFilePath]`, `[CallerLineNumber]` and `[CallerArgumentExpression]` (C# 10).",
          "The values are baked in at **compile time**, so there is no runtime cost — unlike `StackTrace`, which is expensive and unreliable in release builds.",
          "The parameters must be **optional** with a default value; the compiler only substitutes when the caller omits them.",
          "Classic uses: logging, assertions, guard clauses and `INotifyPropertyChanged`."
        ] },
        { code: `public static void Log(string message,
    [CallerMemberName] string member = "",
    [CallerFilePath]   string file   = "",
    [CallerLineNumber] int    line   = 0)
{
    Console.WriteLine($"{Path.GetFileName(file)}:{line} {member} - {message}");
}

public static void NotNull<T>(T value,
    [CallerArgumentExpression(nameof(value))] string expr = "")
{
    if (value is null) throw new ArgumentNullException(expr);
}

NotNull(order.Customer);   // message reads "order.Customer"`, lang: "csharp" },
        { note: "`CallerFilePath` embeds the **build machine's absolute path** into your assembly. That leaks directory structure and usernames — use `<DeterministicSourcePaths>` or strip it before logging in production.", kind: "warn" }
      ]
    },

    {
      id: "plugin-architecture",
      q: "How do you implement a plugin architecture in C#?",
      tldr: "Define the contract in a shared abstractions assembly, discover implementations by loading assemblies at runtime, instantiate via reflection or DI, and isolate each plugin in its own AssemblyLoadContext.",
      tags: ["architecture", "reflection"],
      a: [
        { ol: [
          "Put the interfaces in a **separate abstractions assembly** that both host and plugins reference — never reference the host itself.",
          "Load candidate assemblies from a plugins folder.",
          "Find types implementing the contract, filtering out abstract types.",
          "Instantiate and register them, ideally through the DI container.",
          "Use a collectible `AssemblyLoadContext` so plugins can be unloaded and so their dependency versions do not collide with the host's."
        ] },
        { code: `public interface IExportPlugin
{
    string Name { get; }
    Task ExportAsync(Stream target, CancellationToken ct);
}

public sealed class PluginLoadContext : AssemblyLoadContext
{
    private readonly AssemblyDependencyResolver _resolver;

    public PluginLoadContext(string pluginPath)
        : base(isCollectible: true)
        => _resolver = new AssemblyDependencyResolver(pluginPath);

    protected override Assembly Load(AssemblyName name)
    {
        var path = _resolver.ResolveAssemblyToPath(name);
        return path is null ? null : LoadFromAssemblyPath(path);
    }
}

public static IEnumerable<IExportPlugin> Discover(string folder)
{
    foreach (var dll in Directory.GetFiles(folder, "*.plugin.dll"))
    {
        var asm = new PluginLoadContext(dll).LoadFromAssemblyPath(dll);
        foreach (var t in asm.GetTypes())
        {
            if (!typeof(IExportPlugin).IsAssignableFrom(t) || t.IsAbstract) continue;
            yield return (IExportPlugin)Activator.CreateInstance(t);
        }
    }
}`, lang: "csharp" },
        { note: "Loading arbitrary assemblies executes arbitrary code in your process. In anything security-sensitive, sign plugins and verify them, or run them out-of-process.", kind: "warn" }
      ]
    },

    {
      id: "expression-trees",
      q: "What are expression trees and how are they used?",
      tldr: "An expression tree is code represented as data — a lambda captured as an inspectable object model that a provider can translate (to SQL) or compile into a delegate.",
      tags: ["metaprogramming", "linq"],
      a: [
        { p: "`Func<T, bool> f = x => x.Age > 18;` compiles to **executable IL**. `Expression<Func<T, bool>> e = x => x.Age > 18;` compiles to a **tree of nodes** you can walk: a `LambdaExpression` whose body is a `BinaryExpression` with a `MemberExpression` and a `ConstantExpression`." },
        { code: `Expression<Func<Person, bool>> expr = p => p.Age > 18;

var body  = (BinaryExpression)expr.Body;
var left  = (MemberExpression)body.Left;
Console.WriteLine(left.Member.Name);      // "Age"
Console.WriteLine(body.NodeType);         // GreaterThan

// Compile it to a real delegate
Func<Person, bool> compiled = expr.Compile();`, lang: "csharp" },
        { ul: [
          "**This is how ORMs work.** `IQueryable<T>` takes `Expression<Func<...>>`, and EF walks the tree to emit SQL. `IEnumerable<T>` takes plain delegates, which can only be run in memory.",
          "**Building trees at runtime** lets you generate dynamic filters, sorts or mappers from user input.",
          "**Compiling a tree** produces a fast delegate — the standard trick for replacing slow reflection in a hot path.",
          "Trees are immutable; use `ExpressionVisitor` to produce a modified copy."
        ] },
        { code: `// Build "x => x.Name == value" at runtime for an arbitrary property
public static Expression<Func<T, bool>> Equals<T>(string property, object value)
{
    var param = Expression.Parameter(typeof(T), "x");
    var member = Expression.PropertyOrField(param, property);
    var constant = Expression.Constant(value);
    return Expression.Lambda<Func<T, bool>>(
        Expression.Equal(member, constant), param);
}

var filter = Equals<Person>("Name", "Ada");
var results = people.AsQueryable().Where(filter).ToList();`, lang: "csharp" },
        { note: "Only **expression** lambdas can become trees. A statement lambda with braces cannot — `Expression<Func<int,int>> e = x => { return x; };` will not compile.", kind: "warn" }
      ]
    },

    {
      id: "concurrentdictionary",
      q: "How do you use the ConcurrentDictionary class?",
      tldr: "A thread-safe dictionary using fine-grained striped locking, with atomic GetOrAdd / AddOrUpdate / TryUpdate operations that replace check-then-act races.",
      tags: ["threading", "collections"],
      a: [
        { code: `var cache = new ConcurrentDictionary<int, Product>();

// Atomic get-or-create
var product = cache.GetOrAdd(id, key => _repo.Load(key));

// Atomic insert-or-merge
cache.AddOrUpdate(id,
    addValueFactory:    key => new Product(key),
    updateValueFactory: (key, existing) => existing.WithHit());

// Optimistic concurrency
if (cache.TryGetValue(id, out var current))
    cache.TryUpdate(id, current.WithHit(), current);   // only if unchanged

cache.TryRemove(id, out _);

// Counters
var counts = new ConcurrentDictionary<string, int>();
counts.AddOrUpdate(word, 1, (_, n) => n + 1);`, lang: "csharp" },
        { ul: [
          "Reads are **lock-free**; writes take one of several striped locks, so unrelated keys rarely contend.",
          "The point is **atomicity of the compound operation** — `if (!dict.ContainsKey(k)) dict.Add(k, v)` is a race even on a locked dictionary.",
          "`Count`, `Keys`, `Values` and `ToArray` take **all** locks — avoid them in hot paths.",
          "Enumeration is a **moving snapshot**: safe, but it may or may not show concurrent changes.",
          "Prefer a plain `Dictionary<K,V>` when the collection is built once and then only read — it is faster."
        ] },
        { note: "`GetOrAdd`'s factory is **not** run under a lock. Two threads can both invoke it for the same key; only one result is stored, the other is discarded. If creation is expensive or has side effects, store a `Lazy<T>` as the value instead.", kind: "warn" }
      ]
    },

    {
      id: "lazy-t",
      q: "What is the Lazy<T> class and how is it used?",
      tldr: "Lazy<T> defers creating a value until the first access to .Value, and by default guarantees the factory runs exactly once even under concurrency.",
      tags: ["performance", "threading"],
      a: [
        { code: `public class ReportService
{
    private readonly Lazy<ExpensiveEngine> _engine =
        new(() => new ExpensiveEngine(), LazyThreadSafetyMode.ExecutionAndPublication);

    public void Run() => _engine.Value.Execute();   // built on first use only
}

// Thread-safe singleton, no double-checked locking by hand
public sealed class Config
{
    private static readonly Lazy<Config> _instance = new(() => new Config());
    public static Config Instance => _instance.Value;
    private Config() { }
}`, lang: "csharp" },
        { table: { head: ["`LazyThreadSafetyMode`", "Behaviour"], rows: [
          ["`ExecutionAndPublication`", "Default — factory runs once, others block. Safest."],
          ["`PublicationOnly`", "Several threads may run the factory; the first result wins, the rest are discarded."],
          ["`None`", "No thread safety at all — only for confirmed single-threaded use."]
        ] } },
        { ul: [
          "Use it for expensive objects that are often never needed, and for correct singletons without hand-written double-checked locking.",
          "`IsValueCreated` tells you whether the factory has run, without triggering it.",
          "By default an **exception in the factory is cached** and rethrown on every subsequent access — use `PublicationOnly` if you want retries.",
          "For an async equivalent, wrap a `Task<T>`: `new Lazy<Task<T>>(() => LoadAsync())`."
        ] }
      ]
    },

    {
      id: "custom-linq-provider",
      q: "How do you implement a custom LINQ provider?",
      tldr: "Implement IQueryable<T> and IQueryProvider, then use an ExpressionVisitor to translate the captured expression tree into your target query language.",
      tags: ["linq", "metaprogramming"],
      seeAlso: ["csharp-advanced/expression-trees"],
      a: [
        { p: "There are two levels of answer. **The easy one** is that most 'custom provider' needs are met by writing extension methods over `IEnumerable<T>`. **The real one** is implementing `IQueryable`." },
        { ol: [
          "Implement `IQueryable<T>` — it just carries an `Expression` and a reference to the provider.",
          "Implement `IQueryProvider`. `CreateQuery` wraps a new expression (used by `Where`, `Select`, etc. as the chain is built); `Execute` is called when the query is finally enumerated.",
          "Walk the expression tree with an `ExpressionVisitor` and translate each node into your target syntax.",
          "Execute against the real source, materialise the results and return them."
        ] },
        { code: `public class QueryTranslator : ExpressionVisitor
{
    private readonly StringBuilder _sb = new();

    public string Translate(Expression node)
    {
        Visit(node);
        return _sb.ToString();
    }

    protected override Expression VisitBinary(BinaryExpression node)
    {
        _sb.Append("(");
        Visit(node.Left);
        _sb.Append(node.NodeType == ExpressionType.Equal ? " = " : " > ");
        Visit(node.Right);
        _sb.Append(")");
        return node;
    }

    protected override Expression VisitMember(MemberExpression node)
    {
        _sb.Append(node.Member.Name);
        return node;
    }

    protected override Expression VisitConstant(ConstantExpression node)
    {
        _sb.Append("'").Append(node.Value).Append("'");
        return node;
    }
}`, lang: "csharp", caption: "The heart of it: an ExpressionVisitor that emits query text" },
        { note: "The hard parts are not the plumbing — they are deciding which operators you support, and what to do with the ones you do not. EF Core's answer is to translate what it can and either fall back to client evaluation or throw. Say that and you have answered the real question.", kind: "tip" }
      ]
    },

    {
      id: "exception-best-practices",
      q: "What are the best practices for exception handling in C#?",
      tldr: "Catch only what you can handle, never swallow silently, rethrow with `throw;`, use exception filters, and let a global handler deal with the rest.",
      tags: ["errors", "design"],
      seeAlso: ["csharp-basic/exception-handling"],
      a: [
        { ul: [
          "**Do not catch what you cannot handle.** A `catch` that only logs and rethrows usually belongs one layer up instead.",
          "**`throw;` not `throw ex;`** — the latter resets the stack trace to the rethrow point and destroys the original diagnostics.",
          "**Never swallow** — an empty `catch { }` turns a bug into a mystery. If ignoring is genuinely correct, comment why.",
          "**Use exception filters** (`catch (X e) when (...)`) rather than catch-inspect-rethrow: the filter runs **before** the stack unwinds, so the dump is more useful.",
          "**Preserve the cause** by passing the original as the `innerException` when you wrap.",
          "**Do not use exceptions for control flow** — they cost roughly microseconds each, so a `TryParse`-style method is the right pattern for expected failures.",
          "**Validate arguments eagerly** with `ArgumentNullException.ThrowIfNull(x)` and friends.",
          "**One global handler** at the boundary — middleware in ASP.NET Core — logs and converts to a response.",
          "**Never catch and continue on `StackOverflowException`, `OutOfMemoryException` or `AccessViolationException`** — the process state is not trustworthy."
        ] },
        { code: `try
{
    await _payments.ChargeAsync(order, ct);
}
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.TooManyRequests)
{
    // filter ran before unwinding — we can retry with full context
    await Task.Delay(backoff, ct);
    throw;                                  // preserves the original trace
}
catch (PaymentDeclinedException ex)
{
    throw new OrderFailedException($"Order {order.Id} declined", ex);   // keep the cause
}`, lang: "csharp" },
        { note: "`ExceptionDispatchInfo.Capture(ex).Throw()` rethrows a **stored** exception while preserving its original stack trace — the tool for rethrowing from a different frame than where it was caught.", kind: "tip" }
      ]
    },

    {
      id: "high-performance",
      q: "How do you handle high-performance scenarios in C#?",
      tldr: "Measure first, then cut allocations — Span/Memory, pooling, struct types, pre-sized collections — and only then look at algorithms, parallelism and unsafe tricks.",
      tags: ["performance"],
      seeAlso: ["csharp-advanced/optimize-performance", "csharp-advanced/span-t"],
      a: [
        { ol: [
          "**Measure.** BenchmarkDotNet for micro-benchmarks, a profiler (dotTrace, PerfView, `dotnet-counters`) for real workloads. Never optimise on a hunch.",
          "**Fix the algorithm.** An O(n²) loop beaten down with micro-optimisations is still O(n²).",
          "**Cut allocations**, because GC pressure is usually the real cost in managed code.",
          "**Then** consider parallelism, `unsafe`, SIMD and pooling."
        ] },
        { table: { head: ["Technique", "What it buys"], rows: [
          ["`Span<T>` / `ReadOnlySpan<T>`", "Slicing and parsing with zero allocation"],
          ["`ArrayPool<T>` / `MemoryPool<T>`", "Reuse large buffers instead of allocating per call"],
          ["`StringBuilder`, `string.Create`", "Avoid quadratic string concatenation"],
          ["`struct` + `readonly struct`", "No heap allocation for small values"],
          ["`ValueTask<T>`", "No Task allocation when the result is already available"],
          ["Pre-sized collections", "Avoid repeated internal array growth and copying"],
          ["`System.Text.Json` source generation", "Removes reflection from serialization"],
          ["`Parallel.For` / PLINQ", "Uses all cores for CPU-bound work"],
          ["`System.Numerics.Vector<T>`", "SIMD across a batch of values"]
        ] } },
        { code: `// Allocating: 3 strings created and thrown away
var key = "user:" + id + ":profile";

// Non-allocating parse over an existing string
ReadOnlySpan<char> span = line.AsSpan();
var comma = span.IndexOf(',');
var name = span[..comma];              // no substring allocation

// Rent instead of allocate
var buffer = ArrayPool<byte>.Shared.Rent(8192);
try { /* use buffer */ }
finally { ArrayPool<byte>.Shared.Return(buffer); }`, lang: "csharp" },
        { note: "The strongest thing to say here is a number: 'I benchmarked it, allocations dropped from 4 MB to 40 KB per request and p99 went from 180 ms to 30 ms.' Specifics beat a list of techniques.", kind: "tip" }
      ]
    },

    {
      id: "whenall-vs-waitall",
      q: "What is the difference between await Task.WhenAll and Task.WaitAll?",
      tldr: "WhenAll is asynchronous and returns a Task you await, releasing the thread; WaitAll blocks the calling thread until everything finishes.",
      tags: ["async", "threading"],
      a: [
        { table: { head: ["", "`await Task.WhenAll`", "`Task.WaitAll`"], rows: [
          ["Blocks the caller", "No — the thread is released", "**Yes** — the thread is parked"],
          ["Returns", "`Task` / `Task<T[]>`", "`void`"],
          ["Exceptions", "Rethrows the **first** exception; the rest are on `task.Exception`", "Throws an `AggregateException` with **all** of them"],
          ["Deadlock risk", "None when awaited", "Yes, on a thread with a synchronization context"],
          ["Use in", "Async code — the default", "Console `Main` or genuinely synchronous code"]
        ] } },
        { code: `// Preferred
var results = await Task.WhenAll(ids.Select(id => LoadAsync(id)));

// To see every failure rather than just the first
var all = Task.WhenAll(tasks);
try { await all; }
catch { foreach (var ex in all.Exception.InnerExceptions) Log(ex); }

// Blocking equivalent — avoid in async code
Task.WaitAll(tasks.ToArray());`, lang: "csharp" },
        { note: "The pairing extends: `WhenAny` vs `WaitAny`, and `await task` vs `task.Wait()`/`task.Result`. In every case the `When`/`await` form is the non-blocking one.", kind: "tip" }
      ]
    },

    {
      id: "thread-pool",
      q: "How do you create and manage a thread pool in C#?",
      tldr: "You almost never create one — the CLR maintains a managed ThreadPool, and Task.Run / TPL queue work onto it; you tune it rather than build it.",
      tags: ["threading"],
      a: [
        { ul: [
          "The pool exists per process, reuses threads, and grows slowly (roughly one extra thread per 0.5–1 s) once the minimum is exceeded — deliberately, to avoid thrashing.",
          "`Task.Run`, `Task.Factory.StartNew`, `Parallel.*`, PLINQ, timers and async continuations all queue onto it.",
          "`ThreadPool.SetMinThreads` raises the number of threads created without the injection delay — the standard mitigation for a burst workload or a legacy blocking library.",
          "Use a **dedicated `Thread`** (`IsBackground = true`) only for genuinely long-running or blocking work, or set `TaskCreationOptions.LongRunning`.",
          "**Never block a pool thread.** `.Result`, `.Wait()` or `lock` contention on pool threads causes **thread-pool starvation**: work is queued but nothing drains it, and latency collapses."
        ] },
        { code: `ThreadPool.GetMinThreads(out var workers, out var io);
ThreadPool.SetMinThreads(workers * 4, io);

ThreadPool.QueueUserWorkItem(_ => DoWork());     // fire and forget, low level
await Task.Run(() => DoWork());                  // preferred

// Long-running: keep it off the pool
var t = new Thread(Consume) { IsBackground = true, Name = "consumer" };
t.Start();

// Bounded concurrency without exhausting the pool
var gate = new SemaphoreSlim(8);
await Task.WhenAll(items.Select(async item =>
{
    await gate.WaitAsync();
    try { await ProcessAsync(item); }
    finally { gate.Release(); }
}));`, lang: "csharp" },
        { note: "If asked to diagnose starvation: symptoms are rising latency with low CPU, and a growing `ThreadPool.PendingWorkItemCount`. The cause is nearly always sync-over-async somewhere.", kind: "tip" }
      ]
    },

    {
      id: "reentrant-methods",
      q: "Explain the concept of re-entrant methods in C#.",
      tldr: "A re-entrant method can be safely entered again before a previous invocation has finished — by the same thread via recursion or callback, or by another thread.",
      tags: ["threading", "design"],
      a: [
        { ul: [
          "Re-entrancy is broken by **shared mutable state** — statics, instance fields, or an object captured in a closure.",
          "A method that only touches parameters and locals is naturally re-entrant.",
          "**`lock` is re-entrant for the same thread** — taking a lock you already hold succeeds. That prevents self-deadlock but does **not** make your method re-entrancy-safe: the invariant your lock protects may be half-updated when the recursive call sees it.",
          "Common triggers: raising an event whose handler calls back into you; a UI message pump processing input during a long operation; recursion; `async` continuations interleaving.",
          "Defences: keep state local, take a snapshot before invoking callbacks, use a re-entrancy guard flag, or make the type immutable."
        ] },
        { code: `public class Grid
{
    private bool _updating;                 // re-entrancy guard
    public event EventHandler Changed;

    public void Update()
    {
        if (_updating) return;              // a handler called us back
        _updating = true;
        try
        {
            Recalculate();
            Changed?.Invoke(this, EventArgs.Empty);   // may re-enter Update()
        }
        finally { _updating = false; }
    }
}`, lang: "csharp" },
        { note: "Re-entrant and thread-safe are different properties. A method guarded by a single `lock` is thread-safe but can still be re-entered by the same thread and see a broken invariant.", kind: "warn" }
      ]
    },

    {
      id: "raw-pointers",
      q: "How do you work with raw pointers in C#?",
      tldr: "In an unsafe context you can declare T* pointers, take addresses with &, dereference with *, and must pin managed memory with fixed while a pointer to it exists.",
      tags: ["interop", "unsafe"],
      seeAlso: ["csharp-advanced/unsafe-code"],
      a: [
        { code: `public static unsafe void Demo()
{
    int value = 42;
    int* p = &value;          // address-of
    *p = 99;                  // dereference and assign
    Console.WriteLine(value); // 99

    var array = new int[] { 1, 2, 3 };
    fixed (int* first = array)          // pin while we hold the pointer
    {
        int* cursor = first;
        for (var i = 0; i < array.Length; i++, cursor++)
            *cursor *= 2;               // pointer arithmetic in element units
    }

    // Struct member access through a pointer
    Point pt = new Point { X = 1 };
    Point* pp = &pt;
    pp->X = 5;

    // Unmanaged allocation — you own the free
    IntPtr block = Marshal.AllocHGlobal(1024);
    try { /* ... */ }
    finally { Marshal.FreeHGlobal(block); }
}`, lang: "csharp" },
        { ul: [
          "Only **unmanaged types** can be pointed at — primitives, enums, pointers, and structs containing only those. No pointer to a class or to a struct with a reference field.",
          "Pointer arithmetic advances by `sizeof(T)`, not by bytes.",
          "`fixed` pins for the duration of the block. Pinning across a long operation fragments the heap and hurts the GC.",
          "`stackalloc` gives a pointer into stack memory that needs no pinning and no freeing.",
          "There is **no bounds checking** — this is where buffer overruns become possible in C#."
        ] },
        { note: "Modern code should reach for `Span<T>`, `ref` returns and `System.Runtime.CompilerServices.Unsafe` first. Raw pointers are for P/Invoke marshalling and the last few percent in a proven hot path.", kind: "tip" }
      ]
    },

    {
      id: "gc-collect-advanced",
      q: "What is the purpose of the GC.Collect method?",
      tldr: "It requests an immediate collection. It exists for diagnostics and rare cleanup points, and calling it in normal application code almost always makes performance worse.",
      tags: ["memory", "gc"],
      seeAlso: ["csharp-intermediate/gc-collect", "csharp-advanced/memory-management"],
      a: [
        { code: `GC.Collect();                               // all generations, blocking
GC.Collect(0);                              // Gen 0 only
GC.Collect(2, GCCollectionMode.Optimized);  // let the GC decide if it is worthwhile
GC.Collect(2, GCCollectionMode.Forced, blocking: true, compacting: true);

// The "collect everything including finalizable objects" idiom
GC.Collect();
GC.WaitForPendingFinalizers();
GC.Collect();

// Measuring in a test
var before = GC.GetTotalMemory(forceFullCollection: true);`, lang: "csharp" },
        { ul: [
          "**Why it hurts**: it overrides heuristics tuned on real allocation rates, **promotes** objects that would have died in Gen 0 into Gen 1/Gen 2 (making them far more expensive to collect later), and pauses threads.",
          "It does **not** free unmanaged resources, and it does **not** guarantee finalizers have run — hence the two-collect idiom.",
          "**Defensible uses**: establishing a clean baseline in a memory test or benchmark; a single point after releasing a genuinely huge cache; before entering a latency-critical region using `GCSettings.LatencyMode`.",
          "`GC.TryStartNoGCRegion(bytes)` is the better tool for 'do not collect during this critical section'.",
          "`GC.AddMemoryPressure` / `RemoveMemoryPressure` tells the GC about unmanaged memory your object owns, so it schedules collections sensibly."
        ] },
        { note: "If a candidate says they call `GC.Collect()` to fix a leak, the follow-up is: a managed leak is a **live reference**, and no amount of collecting will free something that is still reachable.", kind: "warn" }
      ]
    },

    {
      id: "state-machine",
      q: "How do you implement a state machine in C#?",
      tldr: "Model states and triggers as enums with a transition table, or use the State pattern with one class per state; the compiler already does this for async and iterators.",
      tags: ["patterns", "design"],
      a: [
        { p: "**1. Enum plus transition table** — compact, easy to test, easy to visualise. Best default:" },
        { code: `public enum State  { Draft, Submitted, Approved, Rejected }
public enum Trigger { Submit, Approve, Reject, Revise }

public class Workflow
{
    private static readonly Dictionary<(State, Trigger), State> Map = new()
    {
        [(State.Draft,     Trigger.Submit)]  = State.Submitted,
        [(State.Submitted, Trigger.Approve)] = State.Approved,
        [(State.Submitted, Trigger.Reject)]  = State.Rejected,
        [(State.Rejected,  Trigger.Revise)]  = State.Draft
    };

    public State Current { get; private set; } = State.Draft;

    public bool CanFire(Trigger t) => Map.ContainsKey((Current, t));

    public void Fire(Trigger t)
    {
        if (!Map.TryGetValue((Current, t), out var next))
            throw new InvalidOperationException($"Cannot {t} from {Current}");
        Current = next;
    }
}`, lang: "csharp" },
        { p: "**2. State pattern** — one class per state. Better when each state carries a lot of distinct behaviour:" },
        { code: `public interface IOrderState
{
    IOrderState Handle(Order order, Trigger trigger);
}

public sealed class DraftState : IOrderState
{
    public IOrderState Handle(Order order, Trigger t)
        => t == Trigger.Submit ? new SubmittedState() : this;
}`, lang: "csharp" },
        { ul: [
          "A `switch` expression over `(state, trigger)` tuples is a clean middle ground in modern C#.",
          "For anything with guards, entry/exit actions, hierarchical or parallel states, use the **Stateless** library rather than hand-rolling.",
          "Persist the state as a value and rebuild the machine — never serialise the machine object itself.",
          "Worth mentioning: `async`/`await` and `yield return` are both compiled into state machines, so you use them constantly without noticing."
        ] }
      ]
    },

    {
      id: "span-t",
      q: "What is the Span<T> type and how is it used?",
      tldr: "Span<T> is a ref struct giving a type-safe, bounds-checked window over contiguous memory — array, string, stack or native — allowing slicing and parsing with zero allocation.",
      tags: ["performance", "memory"],
      seeAlso: ["csharp-advanced/high-performance"],
      a: [
        { ul: [
          "It is a **`ref struct`**: it can only live on the stack. That is what makes it safe, and also what constrains it.",
          "It unifies **array, string, `stackalloc` and native memory** behind one API.",
          "**Slicing is free** — a slice is a pointer plus a length, no copying and no allocation.",
          "`ReadOnlySpan<char>` is what `string.AsSpan()` gives you, replacing `Substring` allocations in parsers.",
          "**Restrictions**, all consequences of being stack-only: cannot be a field of a class, cannot be boxed, cannot be used in an `async` method or a lambda, cannot be a generic type argument. Use **`Memory<T>`** when you need to cross an `await`."
        ] },
        { code: `// Parse "name,age" without allocating a single substring
static (string Name, int Age) Parse(string line)
{
    ReadOnlySpan<char> span = line.AsSpan();
    var comma = span.IndexOf(',');
    var name  = span[..comma];
    var age   = span[(comma + 1)..];
    return (name.ToString(), int.Parse(age));
}

// Stack buffer, no heap allocation at all
Span<byte> buffer = stackalloc byte[128];
random.NextBytes(buffer);

// A window over an existing array — no copy
var numbers = new int[1000];
Span<int> middle = numbers.AsSpan(100, 50);
middle.Fill(7);        // writes through to the original array`, lang: "csharp" },
        { table: { head: ["", "`Span<T>`", "`Memory<T>`"], rows: [
          ["Lives on", "Stack only (`ref struct`)", "Heap allowed"],
          ["Async / fields", "No", "Yes"],
          ["Sources", "Array, string, `stackalloc`, native", "Array, string, `MemoryPool`"],
          ["Access", "Direct", "Via `.Span`"]
        ] } }
      ]
    },

    {
      id: "optimize-performance",
      q: "How do you optimize performance in C# applications?",
      tldr: "Profile to find the real bottleneck, then work outward: algorithms and database access first, allocations second, concurrency third, micro-optimisation last.",
      tags: ["performance"],
      seeAlso: ["csharp-advanced/high-performance"],
      a: [
        { ol: [
          "**Profile before changing anything.** Most guesses are wrong, and in a typical line-of-business app the bottleneck is I/O or the database, not C#.",
          "**Fix data access** — N+1 queries, missing indexes, `SELECT *`, fetching rows you then filter in memory. Usually the single biggest win.",
          "**Fix algorithms and data structures** — a `Dictionary` lookup instead of a `List.FirstOrDefault` inside a loop.",
          "**Reduce allocations** — `StringBuilder`, `Span<T>`, pooling, pre-sized collections, structs for small values.",
          "**Cache** what is expensive and stable.",
          "**Parallelise** genuinely CPU-bound work; make I/O async so threads are not parked.",
          "**Then** micro-optimise, and re-measure after every step."
        ] },
        { table: { head: ["Symptom", "Usual cause"], rows: [
          ["High CPU, low throughput", "An O(n²) loop, or serialization/reflection in a hot path"],
          ["Low CPU, high latency", "Blocking I/O, thread-pool starvation, sync-over-async"],
          ["Sawtooth memory, frequent Gen 2", "Allocation churn, or large objects on the LOH"],
          ["Memory grows and never drops", "A live reference — static collection or unremoved event handler"],
          ["Slow first request only", "JIT warm-up; consider ReadyToRun or AOT"]
        ] } },
        { note: "Tools worth naming: **BenchmarkDotNet** for micro-benchmarks, **dotnet-counters** and **dotnet-trace** in production, **PerfView** or **dotMemory** for allocations, and the EF Core logs or SQL Profiler for the database.", kind: "tip" }
      ]
    },

    {
      id: "asparallel-vs-parallel-foreach",
      q: "What is the difference between AsParallel and Parallel.ForEach?",
      tldr: "AsParallel (PLINQ) parallelises a query pipeline and produces a result sequence; Parallel.ForEach parallelises a loop body for its side effects.",
      tags: ["parallelism", "linq"],
      a: [
        { table: { head: ["", "`AsParallel()` (PLINQ)", "`Parallel.ForEach`"], rows: [
          ["Shape", "A query that **returns** data", "A loop executed for **side effects**"],
          ["Composition", "Chains with `Where`, `Select`, `OrderBy`", "One delegate body"],
          ["Ordering", "Unordered by default; `AsOrdered()` restores it", "No ordering concept"],
          ["Control", "`WithDegreeOfParallelism`, `WithCancellation`", "`ParallelOptions`, `ParallelLoopState` for break/stop"],
          ["Early exit", "`Take`, `First`", "`state.Break()` / `state.Stop()`"],
          ["Best for", "Transform-and-collect pipelines", "Independent work per item"]
        ] } },
        { code: `// PLINQ — produces a result
var primes = numbers
    .AsParallel()
    .WithDegreeOfParallelism(4)
    .Where(IsPrime)
    .OrderBy(n => n)        // needs a merge step
    .ToList();

// Parallel.ForEach — side effects per item
Parallel.ForEach(files, new ParallelOptions { MaxDegreeOfParallelism = 8 },
    file => Process(file));

// Async work per item: neither of the above — this
await Parallel.ForEachAsync(urls, ct, async (url, token) =>
{
    await DownloadAsync(url, token);
});`, lang: "csharp" },
        { note: "Both are for **CPU-bound** work. For I/O-bound work use `Task.WhenAll` or `Parallel.ForEachAsync` — `Parallel.ForEach` with a blocking call inside just occupies pool threads. And parallelising a cheap loop body is usually slower than the sequential version, because partitioning and merging are not free.", kind: "warn" }
      ]
    },

    {
      id: "aspect-oriented-programming",
      q: "How do you implement aspect-oriented programming in C#?",
      tldr: "Factor cross-cutting concerns out with interception — DI decorators, a dynamic proxy library, middleware/filters, or compile-time weaving.",
      tags: ["architecture", "patterns"],
      a: [
        { p: "AOP separates **cross-cutting concerns** — logging, caching, retries, validation, transactions, authorisation — from business logic. C# has no `aspect` keyword, so it is done with interception." },
        { table: { head: ["Approach", "How", "Trade-off"], rows: [
          ["**Decorator + DI**", "Wrap the interface, register the decorator", "No dependencies, fully explicit, but manual per interface"],
          ["**Dynamic proxy**", "Castle DynamicProxy, Autofac interceptors", "Automatic, but runtime cost and virtual/interface only"],
          ["**Compile-time weaving**", "PostSharp, Fody, Metalama", "No runtime cost, but an extra build step and tooling"],
          ["**Source generators**", "Generate the decorator at compile time", "Fast and debuggable; you write the generator"],
          ["**Framework hooks**", "ASP.NET middleware, action filters, EF interceptors", "Free and idiomatic — but only at those boundaries"]
        ] } },
        { code: `// The decorator approach — plain C#, no library needed
public class CachingOrderService : IOrderService
{
    private readonly IOrderService _inner;
    private readonly IMemoryCache _cache;

    public CachingOrderService(IOrderService inner, IMemoryCache cache)
        => (_inner, _cache) = (inner, cache);

    public Task<Order> GetAsync(int id) =>
        _cache.GetOrCreateAsync($"order:{id}", e =>
        {
            e.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return _inner.GetAsync(id);
        });
}

services.AddScoped<IOrderService, OrderService>();
services.Decorate<IOrderService, CachingOrderService>();   // Scrutor`, lang: "csharp" },
        { note: "The honest senior answer: prefer explicit decorators and framework hooks. Magic weaving makes stack traces and debugging much harder, and juniors cannot tell what code will actually run.", kind: "tip" }
      ]
    },

    {
      id: "methodimpl-attribute",
      q: "What is the purpose of the MethodImpl attribute?",
      tldr: "It gives the JIT and runtime instructions about how a method should be compiled or synchronised — most usefully AggressiveInlining and NoInlining.",
      tags: ["performance", "metadata"],
      a: [
        { table: { head: ["`MethodImplOptions`", "Effect"], rows: [
          ["`AggressiveInlining`", "Strongly hint the JIT to inline, even past its size heuristic"],
          ["`NoInlining`", "Never inline — needed for stack-walking, benchmarks and `[Conditional]` tricks"],
          ["`NoOptimization`", "Skip JIT optimisation — debugging only"],
          ["`Synchronized`", "Wrap the whole method in a lock on `this` (or the `Type` if static)"],
          ["`AggressiveOptimization`", "Skip tiered compilation and compile fully optimised immediately"],
          ["`InternalCall`", "Implemented inside the runtime itself"]
        ] } },
        { code: `[MethodImpl(MethodImplOptions.AggressiveInlining)]
public static int Clamp(int v, int lo, int hi)
    => v < lo ? lo : (v > hi ? hi : v);

[MethodImpl(MethodImplOptions.NoInlining)]
public static string CallerName()
    => new StackTrace().GetFrame(1).GetMethod().Name;   // must not be inlined`, lang: "csharp" },
        { note: "**Do not use `Synchronized`.** It locks on `this` for instance methods and on the `Type` for static ones — both are publicly visible, which is exactly the locking mistake everyone warns about. Use an explicit `lock` on a private object.", kind: "warn" },
        { note: "`AggressiveInlining` only pays off on very small, very hot methods. Applied broadly it bloats code size and hurts the instruction cache — measure it.", kind: "tip" }
      ]
    },

    {
      id: "reflection-emit",
      q: "How do you use reflection emit to dynamically create types at runtime?",
      tldr: "System.Reflection.Emit builds an assembly, module, type and method at runtime and writes raw IL through an ILGenerator, producing a real Type you can instantiate.",
      tags: ["metaprogramming", "reflection"],
      a: [
        { code: `var asmName = new AssemblyName("Dynamic");
var asm = AssemblyBuilder.DefineDynamicAssembly(asmName, AssemblyBuilderAccess.Run);
var module = asm.DefineDynamicModule("Main");

var type = module.DefineType("Greeter", TypeAttributes.Public | TypeAttributes.Class);

var method = type.DefineMethod("Greet",
    MethodAttributes.Public | MethodAttributes.Static,
    returnType: typeof(string),
    parameterTypes: new[] { typeof(string) });

var il = method.GetILGenerator();
il.Emit(OpCodes.Ldstr, "Hello, ");
il.Emit(OpCodes.Ldarg_0);
il.Emit(OpCodes.Call, typeof(string).GetMethod("Concat",
    new[] { typeof(string), typeof(string) }));
il.Emit(OpCodes.Ret);

Type built = type.CreateType();
var result = built.GetMethod("Greet").Invoke(null, new object[] { "Ada" });`, lang: "csharp" },
        { ul: [
          "The build order is always **AssemblyBuilder → ModuleBuilder → TypeBuilder → MethodBuilder → ILGenerator → CreateType()**.",
          "`DynamicMethod` is the lighter-weight option when you only need one method rather than a whole type, and it can be collected.",
          "Real uses: **dynamic proxies** (Castle, Moq), ORM materialisers, high-speed serializers, and replacing slow reflection with a generated delegate.",
          "You are writing raw IL, so a wrong opcode or an unbalanced stack fails at runtime with an unhelpful `InvalidProgramException`.",
          "It does **not work under AOT** (`PublishAot`, iOS), because there is no JIT to compile the emitted IL."
        ] },
        { note: "Almost always reach for something else first: **expression trees** (`Expression.Lambda(...).Compile()`) for generating a delegate, or a **source generator** for compile-time codegen that is debuggable, AOT-safe and visible in the IDE. Reflection.Emit is the answer only when you truly need a new `Type` at runtime.", kind: "tip" }
      ]
    }

  ]
});
