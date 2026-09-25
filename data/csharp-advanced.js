/* C# — Advanced. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "csharp-advanced",
  topic: "C#",
  level: "Advanced",
  short: "C# Advanced",
  accent: "violet",
  desc: "How .NET works under the hood: memory and performance, threads and async internals, generating code at runtime, and the low-level tools you use when the profiler tells you to.",
  questions: [

    {
      id: "custom-attribute",
      q: "How do you implement a custom attribute in C#?",
      tldr: "Create a class that inherits from System.Attribute, name it XxxAttribute, add [AttributeUsage] to say where it can be used, then read it at runtime with reflection.",
      tags: ["metadata", "reflection"],
      seeAlso: ["csharp-intermediate/attributes"],
      a: [
        { ol: [
          "Inherit from `System.Attribute` and end the name with `Attribute`. When you use it, you can skip that word: `[Column]` instead of `[ColumnAttribute]`.",
          "Add `[AttributeUsage]` to say where it is allowed (property, class...), if it can be used more than once (`AllowMultiple`), and if child classes get it too (`Inherited`).",
          "Put **required** values in the constructor and **optional** values in properties.",
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
          "Values passed to an attribute must be **known at compile time**: literals, `typeof(...)`, enums, or arrays of those.",
          "Mark your attribute `sealed`. It makes looking it up a bit faster.",
          "Reading attributes with reflection is slow, so cache the result per `Type` (for example in a static dictionary)."
        ] }
      ]
    },

    {
      id: "iequatable",
      q: "What is the purpose of the IEquatable<T> interface?",
      tldr: "It adds a typed Equals(T) method, so comparing objects needs no casting and no boxing. Dictionary, HashSet and List use it automatically when it exists.",
      tags: ["equality", "performance"],
      a: [
        { ul: [
          "`object.Equals(object)` needs a **cast**, and for a struct it also **boxes** it (extra memory). `IEquatable<T>.Equals(T)` avoids both.",
          "`Dictionary`, `HashSet` and `List.Contains` check for `IEquatable<T>` first, so they get the faster path for free.",
          "If you implement it, also override `object.Equals` and `GetHashCode`, so every way of comparing gives the same answer.",
          "It matters most for **structs**. The default struct `Equals` uses reflection and is very slow.",
          "`record` types write all of this for you."
        ] },
        { code: `public readonly struct Money : IEquatable<Money>
{
    public Money(decimal amount, string currency)
        => (Amount, Currency) = (amount, currency);

    public decimal Amount { get; }
    public string Currency { get; }

    public bool Equals(Money other)                       // typed, no boxing
        => Amount == other.Amount && Currency == other.Currency;

    public override bool Equals(object obj)               // keep them in sync
        => obj is Money m && Equals(m);

    public override int GetHashCode()
        => HashCode.Combine(Amount, Currency);

    public static bool operator ==(Money a, Money b) => a.Equals(b);
    public static bool operator !=(Money a, Money b) => !a.Equals(b);
}`, lang: "csharp" },
        { note: "`GetHashCode` rules: equal objects **must** give the same hash. The hash must not change while the object is used as a dictionary key. Different objects are allowed to have the same hash. So never build the hash from a property that can change.", kind: "warn" }
      ]
    },

    {
      id: "deep-copy",
      q: "How do you create a deep copy of an object in C#?",
      tldr: "C# has no built-in deep clone. You can write a copy method yourself, serialize and deserialize, or use reflection. Writing a copy method is usually the best answer.",
      tags: ["cloning", "serialization"],
      a: [
        { p: "First, the difference. `MemberwiseClone()` makes a **shallow copy**: simple values are copied, but objects inside still point to the **same** objects. A **deep copy** copies everything, including the objects inside." },
        { p: "Example: you copy a `Person`. With a shallow copy, both people share the same `Address` object. Change the city on one, and the other one changes too." },
        { p: "**1. Copy constructor / manual copy.** Clear, fast and type-safe. The recommended way:" },
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
        Home = Home is null ? null : new Address(Home),   // new Address object
        Tags = new List<string>(Tags)                     // new list
    };
}`, lang: "csharp" },
        { p: "**2. Serialize and deserialize.** Works for any type and copies the whole thing, but it is slower:" },
        { code: `public static T DeepCopy<T>(T source)
{
    var json = JsonSerializer.Serialize(source);
    return JsonSerializer.Deserialize<T>(json);
}`, lang: "csharp", caption: "Note: BinaryFormatter is obsolete and unsafe. Never use it" },
        { p: "**3. Records.** `with` makes a shallow copy, so use `with` on the inner objects too:" },
        { code: `public record Person(string Name, Address Home);
var copy = original with { Home = original.Home with { } };`, lang: "csharp" },
        { note: "Watch out for **loops**: if a child points back to its parent, a simple recursive copy will go round forever and crash with a stack overflow. A reflection-based copier must remember which objects it already copied.", kind: "warn" }
      ]
    },

    {
      id: "synchronizationcontext",
      q: "What is the purpose of the SynchronizationContext class?",
      tldr: "It decides WHERE the code after an `await` runs. That is how, in a UI app, `await` brings you back to the UI thread automatically.",
      tags: ["async", "threading"],
      a: [
        { p: "Simple picture: in a UI app, only the **UI thread** is allowed to touch buttons and text boxes. The SynchronizationContext is the thing that says \"when the await finishes, send the rest of the code back to the UI thread\"." },
        { ul: [
          "`SynchronizationContext.Post` sends work to a specific place: the WPF/WinForms UI thread, the old ASP.NET request context, or nowhere special in a console app.",
          "`await` remembers the current context before pausing, and continues on it afterwards. That is why UI code can update controls after an `await`.",
          "`ConfigureAwait(false)` says \"do not come back to the context, any thread is fine\". **Library code should use it**: it is faster and avoids deadlocks.",
          "The classic **deadlock**: on the UI thread you call `.Result`. The UI thread is now blocked, waiting. But the rest of the async method needs the UI thread to finish. Both wait on each other forever.",
          "**ASP.NET Core has no SynchronizationContext**, so this deadlock does not happen there, and `ConfigureAwait(false)` matters less in app code."
        ] },
        { code: `// Deadlocks in WinForms / WPF / old ASP.NET
public void Button_Click(object s, EventArgs e)
{
    var data = LoadAsync().Result;    // UI thread is blocked, waiting...
}

private async Task<string> LoadAsync()
{
    await Task.Delay(100);            // ...but this needs the UI thread to continue
    return "done";
}

// Fixes: use await all the way up, or in library code:
await Task.Delay(100).ConfigureAwait(false);`, lang: "csharp" }
      ]
    },

    {
      id: "memory-management",
      q: "Explain the concept of memory management in C#.",
      tldr: "Each thread has a stack for local values, and objects live on the managed heap. The garbage collector cleans the heap automatically. Things like files and connections you still clean up yourself with IDisposable.",
      tags: ["memory", "gc"],
      seeAlso: ["csharp-basic/garbage-collection", "csharp-advanced/span-t"],
      a: [
        { ul: [
          "**Stack**: one per thread, about 1 MB. Holds local variables and parameters. Freed automatically when a method returns. Very fast.",
          "**Managed heap**: where objects (reference types) and boxed values live. Creating an object is also very fast, it just moves a pointer forward. That is why `new` is cheap in .NET.",
          "**Generations**: Gen 0 (new objects, cleaned often and cheaply), Gen 1 (a middle step), Gen 2 (long-lived, cleaned rarely). Most objects die young in Gen 0, and the whole design is built on that fact.",
          "**Large Object Heap (LOH)**: objects over 85,000 bytes. Cleaned only with Gen 2 and not compacted by default, so it can get fragmented.",
          "**Compaction**: after cleaning, the GC moves the living objects together, so the free space is in one big block.",
          "**Workstation vs Server GC**: Server GC uses one heap and one GC thread per CPU core. It is the right choice for web apps."
        ] },
        { table: { head: ["Term", "Meaning"], rows: [
          ["Root", "Where the GC starts looking: static fields, local variables, CPU registers, GC handles"],
          ["Finalizer", "`~Type()`, runs at an unknown time and costs an extra GC cycle. Avoid unless you hold a raw OS handle"],
          ["`IDisposable`", "Release **non-memory** resources (files, sockets, connections) at a moment you choose"],
          ["Pinning", "`fixed` / `GCHandle` stops the GC from moving an object, so native code can use its address. Hurts compaction"],
          ["Weak reference", "`WeakReference<T>` keeps a pointer that does not stop the GC from collecting the object. Good for caches"]
        ] } },
        { note: "Most \"memory leaks\" in .NET are not real leaks. They are objects still being **referenced by mistake**: a static list that keeps growing, or an event handler that was never unsubscribed.", kind: "warn" }
      ]
    },

    {
      id: "circular-references-serialization",
      q: "How do you handle circular references in serialization?",
      tldr: "Three options: keep references (each object is written once with an id), ignore the loop, or send a DTO without the loop. For APIs, the DTO is usually the right answer.",
      tags: ["serialization", "json"],
      a: [
        { p: "The problem: an `Order` has `Lines`, and each `OrderLine` points back to its `Order`. A simple serializer goes Order, Line, Order, Line... forever, until it throws an error." },
        { code: `// System.Text.Json: write $id / $ref markers
var options = new JsonSerializerOptions
{
    ReferenceHandler = ReferenceHandler.Preserve,
    WriteIndented = true
};
var json = JsonSerializer.Serialize(order, options);

// Or just skip the loop
var options2 = new JsonSerializerOptions
{
    ReferenceHandler = ReferenceHandler.IgnoreCycles
};`, lang: "csharp" },
        { code: `// Newtonsoft.Json versions
new JsonSerializerSettings
{
    ReferenceLoopHandling = ReferenceLoopHandling.Ignore,   // skip the back-reference
    PreserveReferencesHandling = PreserveReferencesHandling.Objects
};

// Or mark the property that causes the loop
public class OrderLine
{
    [JsonIgnore]
    public Order Parent { get; set; }
}`, lang: "csharp" },
        { ul: [
          "**`ReferenceHandler.Preserve`**: nothing is lost, but the JSON gets `$id`/`$ref` keys that non-.NET clients (like a JavaScript app) will not understand.",
          "**Ignore / `[JsonIgnore]`**: simple, but the back-reference is lost when you read the JSON back.",
          "**DTO (a simple class just for the API)**: copy only the fields you need into a flat class. Best for public APIs: no loops, no extra data, and a clear contract.",
          "This happens most with **Entity Framework navigation properties**. That is exactly why returning EF entities straight from an API is a bad idea."
        ] }
      ]
    },

    {
      id: "caching",
      q: "What are the different ways to implement caching in C#?",
      tldr: "In-memory cache (IMemoryCache), shared cache across servers (Redis with IDistributedCache), HTTP response caching, and Lazy<T> for one-time values. Pick based on how many servers you have and how fresh the data must be.",
      tags: ["performance", "caching"],
      a: [
        { table: { head: ["Approach", "Shared by", "Use when"], rows: [
          ["`IMemoryCache`", "One app instance", "Fast lookups, single server, OK if each server has its own copy"],
          ["`IDistributedCache` (Redis, SQL)", "All servers", "Many servers behind a load balancer, or cache must survive restarts"],
          ["`ConcurrentDictionary`", "One app instance", "Small lookup tables that never need to expire"],
          ["`Lazy<T>`", "One value", "Expensive value that is built once, thread-safe"],
          ["Response / output caching", "HTTP layer", "The same full response for many users"],
          ["`HybridCache` (.NET 9)", "Both", "Memory cache in front of Redis, with protection when many requests miss at once"]
        ] } },
        { code: `public async Task<Product> GetAsync(int id)
{
    return await _cache.GetOrCreateAsync($"product:{id}", async entry =>
    {
        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);  // max age
        entry.SlidingExpiration = TimeSpan.FromMinutes(2);                 // idle timeout
        entry.SetSize(1);
        return await _repo.LoadAsync(id);
    });
}`, lang: "csharp", caption: "IMemoryCache with both kinds of expiry" },
        { ul: [
          "**Absolute** expiry = maximum age. **Sliding** expiry = removed if not used for a while. Use both, so a popular item still refreshes at some point.",
          "Always set a `SizeLimit` (and `SetSize` on each entry), otherwise the cache can grow until the app runs out of memory.",
          "**Cache stampede**: a popular key expires and 1,000 requests all rebuild it at once. Fix: let only one request rebuild it (for example with a `SemaphoreSlim` per key).",
          "Ways to invalidate: time-based (simplest), remove the key when data is saved, or add a version to the key (`product:42:v7`).",
          "Never cache per-user data under a shared key. One user will see another user's data."
        ] }
      ]
    },

    {
      id: "unsafe-code",
      q: "How do you work with unsafe code in C#?",
      tldr: "Mark the code `unsafe`, turn on AllowUnsafeBlocks in the project file, and use `fixed` to stop the GC from moving an object while you hold a pointer to it.",
      tags: ["interop", "performance"],
      seeAlso: ["csharp-advanced/raw-pointers"],
      a: [
        { code: `<PropertyGroup>
  <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
</PropertyGroup>`, lang: "xml", caption: "Needed in the .csproj" },
        { code: `public static unsafe int CountZeros(byte[] data)
{
    fixed (byte* p = data)          // pin: the GC cannot move it now
    {
        var count = 0;
        for (var i = 0; i < data.Length; i++)
            if (p[i] == 0) count++;
        return count;
    }
}                                    // unpinned here

// Memory on the stack: the GC is not involved at all
Span<byte> buffer = stackalloc byte[256];`, lang: "csharp" },
        { ul: [
          "`fixed` **pins** an object so the GC cannot move it. Keep it short, because pinned objects make the heap messy.",
          "`stackalloc` puts memory on the stack. With `Span<T>` you can use it even without `unsafe`, and it creates no GC work.",
          "Good reasons to use unsafe: **calling native (C/C++) code**, image or buffer processing, and very hot parsing code.",
          "You lose bounds checking and type safety, so you can write past the end of a buffer. It really is unsafe.",
          "Modern alternative: `Span<T>`, `Memory<T>` and the `Unsafe` class give you most of the speed while staying safe."
        ] }
      ]
    },

    {
      id: "taskcompletionsource",
      q: "What is the purpose of the TaskCompletionSource class?",
      tldr: "It gives you a Task that YOU decide when to finish (with a result, an error, or cancel). It is mostly used to turn old callback or event-based code into code you can `await`.",
      tags: ["async", "interop"],
      a: [
        { p: "Think of it as a **restaurant buzzer**. You give the customer the buzzer (the `Task`) right away. Later, when the food is ready, you press the button (`SetResult`) and the customer's `await` wakes up." },
        { ul: [
          "`TaskCompletionSource<T>` gives you a `.Task`, plus `SetResult`, `SetException` and `SetCanceled`.",
          "Main use: **wrapping an event or callback API** so callers can simply `await` it.",
          "Also used for signalling between parts of your app, and in tests where you want to finish a task on demand.",
          "Prefer `TrySetResult` / `TrySetException`. The normal `Set*` methods throw if the task is already finished.",
          "**Always pass `TaskCreationOptions.RunContinuationsAsynchronously`.** Without it, the code after `await` runs right inside your `SetResult` call, which can cause deadlocks or strange behaviour."
        ] },
        { code: `public static Task<string> ReadLineAsync(this SerialPort port,
                                         CancellationToken ct)
{
    var tcs = new TaskCompletionSource<string>(
        TaskCreationOptions.RunContinuationsAsynchronously);

    void Handler(object s, EventArgs e) => tcs.TrySetResult(port.ReadLine());

    port.DataReceived += Handler;                   // event fires later...
    ct.Register(() => tcs.TrySetCanceled(ct));

    return tcs.Task.ContinueWith(t =>
    {
        port.DataReceived -= Handler;               // always unsubscribe
        return t.GetAwaiter().GetResult();
    }, TaskContinuationOptions.ExecuteSynchronously);
}`, lang: "csharp" }
      ]
    },

    {
      id: "conversion-operators",
      q: "How do you implement custom conversion operators in C#?",
      tldr: "Write a `public static implicit operator` or `explicit operator` in your type. Use implicit when the conversion is always safe, and explicit (needs a cast) when it can lose data or fail.",
      tags: ["operators", "types"],
      a: [
        { code: `public readonly struct Celsius
{
    public Celsius(double degrees) => Degrees = degrees;
    public double Degrees { get; }

    // Implicit: always safe, never throws, nothing lost
    public static implicit operator double(Celsius c) => c.Degrees;

    // Explicit: needs a cast, because it can throw
    public static explicit operator Celsius(double d)
        => d < -273.15
            ? throw new ArgumentOutOfRangeException(nameof(d))
            : new Celsius(d);
}

Celsius c = (Celsius)25.0;     // explicit: cast needed
double d = c;                  // implicit: just works`, lang: "csharp" },
        { ul: [
          "It must be `public static`, and one of the two types must be your own type.",
          "**Implicit** for safe conversions that never lose data or throw (like `int` to `long`). **Explicit** for anything that might (like `double` to `int`).",
          "You cannot write a conversion between a parent and child class. C# already handles those.",
          "Do not overuse it. A hidden implicit conversion is hard to spot in code review. Sometimes a `Parse` or `ToX()` method is clearer."
        ] },
        { note: "Biggest mistake: an **implicit** operator that can throw. The caller wrote no cast, so nothing in their code warns them an exception is possible.", kind: "warn" }
      ]
    },

    {
      id: "caller-info-attributes",
      q: "Explain the purpose of the CallerFilePath and CallerLineNumber attributes.",
      tldr: "They make the compiler automatically fill in the caller's file name, line number and method name. Great for logging, with zero runtime cost.",
      tags: ["diagnostics", "metadata"],
      a: [
        { ul: [
          "The four attributes: `[CallerMemberName]`, `[CallerFilePath]`, `[CallerLineNumber]` and `[CallerArgumentExpression]` (C# 10).",
          "The values are filled in **when you build**, so they cost nothing at runtime. Using `StackTrace` instead is slow and not reliable in release builds.",
          "The parameters must be **optional** with a default value. The compiler fills them in only when the caller does not pass them.",
          "Common uses: logging, guard checks, and `INotifyPropertyChanged`."
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

NotNull(order.Customer);   // error message says "order.Customer"`, lang: "csharp" },
        { note: "`CallerFilePath` puts the **full path from the build machine** into your DLL (for example `C:/Users/john/src/...`). That can leak folder names and usernames. Use `<DeterministicSourcePaths>` or trim the path before logging in production.", kind: "warn" }
      ]
    },

    {
      id: "plugin-architecture",
      q: "How do you implement a plugin architecture in C#?",
      tldr: "Put the plugin interface in a shared project, load plugin DLLs from a folder at runtime, create the classes with reflection or DI, and give each plugin its own AssemblyLoadContext.",
      tags: ["architecture", "reflection"],
      a: [
        { p: "Think of **browser extensions**: the browser defines what an extension must look like, and anyone can build one and drop it in without changing the browser." },
        { ol: [
          "Put the interfaces in a **separate shared project** that both the main app and the plugins use. Plugins should never reference the main app.",
          "Load the plugin DLLs from a plugins folder.",
          "Find the classes that implement your interface (skip abstract ones).",
          "Create them and register them, ideally through the DI container.",
          "Load each plugin in its own `AssemblyLoadContext`, so it can be unloaded and its dependency versions do not clash with the main app's."
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
        : base(isCollectible: true)                      // can be unloaded
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
        { note: "Loading a DLL means running its code inside your app. If security matters, only load signed and verified plugins, or run them in a separate process.", kind: "warn" }
      ]
    },

    {
      id: "expression-trees",
      q: "What are expression trees and how are they used?",
      tldr: "An expression tree is code stored as data. Instead of running the lambda, you can read it piece by piece. That is how Entity Framework turns your C# lambda into SQL.",
      tags: ["metaprogramming", "linq"],
      a: [
        { p: "The difference: `Func<T, bool> f = x => x.Age > 18;` becomes **code you can run**. `Expression<Func<T, bool>> e = x => x.Age > 18;` becomes a **tree of objects you can read**: \"a greater-than check, left side is the Age property, right side is the number 18\"." },
        { p: "Think of a **recipe card vs a cooked dish**. A `Func` is the cooked dish, you can only eat it (run it). An `Expression` is the recipe card, you can read it, change it, or translate it into another language (SQL)." },
        { code: `Expression<Func<Person, bool>> expr = p => p.Age > 18;

var body  = (BinaryExpression)expr.Body;
var left  = (MemberExpression)body.Left;
Console.WriteLine(left.Member.Name);      // "Age"
Console.WriteLine(body.NodeType);         // GreaterThan

// Turn it into real runnable code
Func<Person, bool> compiled = expr.Compile();`, lang: "csharp" },
        { ul: [
          "**This is how ORMs work.** `IQueryable<T>` takes an `Expression`, and EF reads the tree to write SQL. `IEnumerable<T>` takes a normal `Func`, which can only run in memory.",
          "**Build trees at runtime** to create dynamic filters or sorts from user input.",
          "**Compile a tree once** to get a fast delegate. A common trick to replace slow reflection.",
          "Trees cannot be changed. Use an `ExpressionVisitor` to make a modified copy."
        ] },
        { code: `// Build "x => x.Name == value" at runtime, for any property name
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
        { note: "Only one-line **expression** lambdas can become trees. A lambda with curly braces cannot: `Expression<Func<int,int>> e = x => { return x; };` will not compile.", kind: "warn" }
      ]
    },

    {
      id: "concurrentdictionary",
      q: "How do you use the ConcurrentDictionary class?",
      tldr: "ConcurrentDictionary is a dictionary that many threads can use at the same time safely. Methods like GetOrAdd and AddOrUpdate do \"check and change\" in one safe step.",
      tags: ["threading", "collections"],
      a: [
        { code: `var cache = new ConcurrentDictionary<int, Product>();

// Get it, or create it if missing (one safe step)
var product = cache.GetOrAdd(id, key => _repo.Load(key));

// Add if missing, update if present
cache.AddOrUpdate(id,
    addValueFactory:    key => new Product(key),
    updateValueFactory: (key, existing) => existing.WithHit());

// Update only if nobody changed it in the meantime
if (cache.TryGetValue(id, out var current))
    cache.TryUpdate(id, current.WithHit(), current);

cache.TryRemove(id, out _);

// Word counter
var counts = new ConcurrentDictionary<string, int>();
counts.AddOrUpdate(word, 1, (_, n) => n + 1);`, lang: "csharp" },
        { ul: [
          "Reads use **no lock**. Writes lock only a small part of the dictionary, so threads working on different keys rarely wait for each other.",
          "The real value is the **one-step methods**. `if (!dict.ContainsKey(k)) dict.Add(k, v)` is two steps, and another thread can sneak in between them.",
          "`Count`, `Keys`, `Values` and `ToArray` lock **everything**. Avoid them in hot code.",
          "Looping over it is safe, but you may or may not see changes made by other threads during the loop.",
          "If the dictionary is filled once and then only read, a normal `Dictionary` is faster."
        ] },
        { note: "Trap: the factory in `GetOrAdd` is **not** run under a lock. Two threads can both run it for the same key. Only one result is kept, the other is thrown away. If creating the value is expensive or has side effects, store a `Lazy<T>` as the value.", kind: "warn" }
      ]
    },

    {
      id: "lazy-t",
      q: "What is the Lazy<T> class and how is it used?",
      tldr: "Lazy<T> waits to create an object until the first time you use `.Value`. By default it also makes sure the object is created only once, even with many threads.",
      tags: ["performance", "threading"],
      a: [
        { p: "Simple idea: **do not cook until someone orders**. If nobody asks for the value, it is never created, and you save time and memory." },
        { code: `public class ReportService
{
    private readonly Lazy<ExpensiveEngine> _engine =
        new(() => new ExpensiveEngine(), LazyThreadSafetyMode.ExecutionAndPublication);

    public void Run() => _engine.Value.Execute();   // created the first time only
}

// Thread-safe singleton, the easy way
public sealed class Config
{
    private static readonly Lazy<Config> _instance = new(() => new Config());
    public static Config Instance => _instance.Value;
    private Config() { }
}`, lang: "csharp" },
        { table: { head: ["`LazyThreadSafetyMode`", "What it does"], rows: [
          ["`ExecutionAndPublication`", "Default. Created only once, other threads wait. Safest."],
          ["`PublicationOnly`", "Many threads may create it at the same time. The first result wins, the others are thrown away."],
          ["`None`", "No thread safety. Only when you are sure there is one thread."]
        ] } },
        { ul: [
          "Use it for expensive objects that are often not needed, and for simple, correct singletons.",
          "`IsValueCreated` tells you if it has been created yet, without creating it.",
          "By default, if the factory **throws, that error is remembered** and thrown again every time. Use `PublicationOnly` if you want it to retry.",
          "Async version: `new Lazy<Task<T>>(() => LoadAsync())`."
        ] }
      ]
    },

    {
      id: "custom-linq-provider",
      q: "How do you implement a custom LINQ provider?",
      tldr: "Implement IQueryable<T> and IQueryProvider, then use an ExpressionVisitor to read the query's expression tree and translate it into your target language (like SQL or an API call).",
      tags: ["linq", "metaprogramming"],
      seeAlso: ["csharp-advanced/expression-trees"],
      a: [
        { p: "Two levels of answer. **The simple one**: most of the time you do not need a provider, a few extension methods on `IEnumerable<T>` are enough. **The real one**: implement `IQueryable`. This is what Entity Framework does." },
        { ol: [
          "Implement `IQueryable<T>`. It just holds an `Expression` and a link to the provider.",
          "Implement `IQueryProvider`. `CreateQuery` is called by `Where`, `Select` etc. to build up the query. `Execute` is called when the query finally runs.",
          "Walk the expression tree with an `ExpressionVisitor` and turn each piece into your target language.",
          "Run it against the real data source, turn the results into objects and return them."
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
        _sb.Append(node.Member.Name);         // property name -> column name
        return node;
    }

    protected override Expression VisitConstant(ConstantExpression node)
    {
        _sb.Append("'").Append(node.Value).Append("'");
        return node;
    }
}`, lang: "csharp", caption: "The core: an ExpressionVisitor that writes query text" },
        { note: "The hard part is not the plumbing. It is deciding which LINQ methods you support, and what to do with the ones you do not. EF Core translates what it can, and throws an error for what it cannot. Saying that shows you understand the real problem.", kind: "tip" }
      ]
    },

    {
      id: "exception-best-practices",
      q: "What are the best practices for exception handling in C#?",
      tldr: "Catch only what you can handle, never hide errors silently, rethrow with `throw;`, use exception filters, and let one global handler deal with everything else.",
      tags: ["errors", "design"],
      seeAlso: ["csharp-basic/exception-handling"],
      a: [
        { ul: [
          "**Do not catch what you cannot fix.** A `catch` that only logs and rethrows usually belongs one layer higher.",
          "**Use `throw;`, not `throw ex;`**. `throw ex;` loses the original stack trace, so you cannot see where the error really started.",
          "**Never swallow errors.** An empty `catch { }` turns a bug into a mystery. If ignoring is really correct, add a comment saying why.",
          "**Use exception filters** (`catch (X e) when (...)`). The filter runs **before** the stack is unwound, so crash dumps show more.",
          "**Keep the original error** by passing it as `innerException` when you wrap it in a new one.",
          "**Do not use exceptions for normal flow.** They are slow. For expected failures, use a `TryParse`-style method.",
          "**Check arguments early** with `ArgumentNullException.ThrowIfNull(x)` and similar helpers.",
          "**One global handler** at the edge of the app (middleware in ASP.NET Core) logs the error and returns a proper response.",
          "**Never try to continue after `StackOverflowException`, `OutOfMemoryException` or `AccessViolationException`.** The app is in a broken state."
        ] },
        { code: `try
{
    await _payments.ChargeAsync(order, ct);
}
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.TooManyRequests)
{
    // filter checked the status code first
    await Task.Delay(backoff, ct);
    throw;                                  // keeps the original stack trace
}
catch (PaymentDeclinedException ex)
{
    throw new OrderFailedException($"Order {order.Id} declined", ex);   // keep the cause
}`, lang: "csharp" },
        { note: "`ExceptionDispatchInfo.Capture(ex).Throw()` rethrows a **saved** exception and keeps its original stack trace. Useful when you rethrow it from a different place than where it was caught.", kind: "tip" }
      ]
    },

    {
      id: "high-performance",
      q: "How do you handle high-performance scenarios in C#?",
      tldr: "Measure first. Then reduce memory allocations (Span, pooling, structs, pre-sized lists). Only after that look at algorithms, parallel code and unsafe tricks.",
      tags: ["performance"],
      seeAlso: ["csharp-advanced/optimize-performance", "csharp-advanced/span-t"],
      a: [
        { ol: [
          "**Measure.** BenchmarkDotNet for small code pieces, a profiler (dotTrace, PerfView, `dotnet-counters`) for the real app. Never optimise on a guess.",
          "**Fix the algorithm.** A slow O(n²) loop with tiny tweaks is still O(n²).",
          "**Reduce allocations.** In .NET the real cost is often GC pressure from creating too many objects.",
          "**Then** think about parallel code, `unsafe`, SIMD and pooling."
        ] },
        { table: { head: ["Technique", "What you gain"], rows: [
          ["`Span<T>` / `ReadOnlySpan<T>`", "Slice and parse data without creating new objects"],
          ["`ArrayPool<T>` / `MemoryPool<T>`", "Reuse big buffers instead of creating new ones every call"],
          ["`StringBuilder`, `string.Create`", "Avoid slow string joining in loops"],
          ["`struct` + `readonly struct`", "No heap allocation for small values"],
          ["`ValueTask<T>`", "No Task object when the result is already ready"],
          ["Pre-sized collections", "`new List<T>(1000)` avoids growing and copying again and again"],
          ["`System.Text.Json` source generation", "JSON without slow reflection"],
          ["`Parallel.For` / PLINQ", "Use all CPU cores for heavy calculations"],
          ["`System.Numerics.Vector<T>`", "SIMD: process many numbers in one CPU instruction"]
        ] } },
        { code: `// Allocates: 3 strings created and thrown away
var key = "user:" + id + ":profile";

// No allocation: parse inside the existing string
ReadOnlySpan<char> span = line.AsSpan();
var comma = span.IndexOf(',');
var name = span[..comma];              // no Substring, no new string

// Borrow a buffer instead of creating one
var buffer = ArrayPool<byte>.Shared.Rent(8192);
try { /* use buffer */ }
finally { ArrayPool<byte>.Shared.Return(buffer); }`, lang: "csharp" },
        { note: "The strongest answer has a real number in it: \"I benchmarked it. Memory per request went from 4 MB to 40 KB, and p99 latency went from 180 ms to 30 ms.\" A real example beats a list of techniques.", kind: "tip" }
      ]
    },

    {
      id: "whenall-vs-waitall",
      q: "What is the difference between await Task.WhenAll and Task.WaitAll?",
      tldr: "`await Task.WhenAll` waits without blocking the thread (the thread is free to do other work). `Task.WaitAll` blocks the thread until everything finishes.",
      tags: ["async", "threading"],
      a: [
        { p: "Simple picture: **WhenAll** is ordering three dishes and sitting down with a buzzer. **WaitAll** is standing at the counter, doing nothing, until all three are ready." },
        { table: { head: ["", "`await Task.WhenAll`", "`Task.WaitAll`"], rows: [
          ["Blocks the thread?", "No, the thread is freed", "**Yes**, the thread just waits"],
          ["Returns", "`Task` / `Task<T[]>` (results)", "`void`"],
          ["Errors", "Throws the **first** error. The rest are in `task.Exception`", "Throws an `AggregateException` with **all** errors"],
          ["Deadlock risk", "None when awaited", "Yes, on a UI thread or old ASP.NET"],
          ["Use it in", "Async code (the normal choice)", "Console `Main` or truly synchronous code"]
        ] } },
        { code: `// Preferred
var results = await Task.WhenAll(ids.Select(id => LoadAsync(id)));

// To see every error, not only the first
var all = Task.WhenAll(tasks);
try { await all; }
catch { foreach (var ex in all.Exception.InnerExceptions) Log(ex); }

// Blocking version: avoid in async code
Task.WaitAll(tasks.ToArray());`, lang: "csharp" },
        { note: "Same pattern everywhere: `WhenAny` vs `WaitAny`, and `await task` vs `task.Wait()` / `task.Result`. The `When` / `await` version is always the non-blocking one.", kind: "tip" }
      ]
    },

    {
      id: "thread-pool",
      q: "How do you create and manage a thread pool in C#?",
      tldr: "You almost never create one. .NET already has a shared ThreadPool, and Task.Run and async code use it. Your job is to use it correctly and tune it if needed, not to build one.",
      tags: ["threading"],
      a: [
        { p: "Think of the thread pool as a **team of workers waiting for jobs**. Instead of hiring a new worker for every small job (expensive), you give the job to the team, and a free worker picks it up." },
        { ul: [
          "There is one pool per app. It reuses threads, and once it passes its minimum it adds new threads **slowly** (about one every 0.5 to 1 second), on purpose, to avoid chaos.",
          "`Task.Run`, `Parallel.*`, PLINQ, timers and async continuations all use the pool.",
          "`ThreadPool.SetMinThreads` lets the pool create more threads right away without that delay. Useful for sudden bursts of work or old blocking libraries.",
          "For **long-running or blocking** work, use a dedicated `Thread` (`IsBackground = true`) or `TaskCreationOptions.LongRunning`, so it does not tie up a pool thread.",
          "**Never block a pool thread.** `.Result`, `.Wait()` or long locks on pool threads cause **thread-pool starvation**: work keeps queuing, nobody is free to do it, and everything gets slow."
        ] },
        { code: `ThreadPool.GetMinThreads(out var workers, out var io);
ThreadPool.SetMinThreads(workers * 4, io);

ThreadPool.QueueUserWorkItem(_ => DoWork());     // old, low-level way
await Task.Run(() => DoWork());                  // preferred

// Long-running: keep it out of the pool
var t = new Thread(Consume) { IsBackground = true, Name = "consumer" };
t.Start();

// Limit to 8 at a time, without flooding the pool
var gate = new SemaphoreSlim(8);
await Task.WhenAll(items.Select(async item =>
{
    await gate.WaitAsync();
    try { await ProcessAsync(item); }
    finally { gate.Release(); }
}));`, lang: "csharp" },
        { note: "How to spot starvation: response times go up but CPU stays low, and `ThreadPool.PendingWorkItemCount` keeps growing. The cause is almost always blocking on async code (`.Result`, `.Wait()`) somewhere.", kind: "tip" }
      ]
    },

    {
      id: "reentrant-methods",
      q: "Explain the concept of re-entrant methods in C#.",
      tldr: "A re-entrant method can be safely called again while an earlier call is still running, either by the same thread (recursion, callbacks) or by another thread.",
      tags: ["threading", "design"],
      a: [
        { p: "Example: your method raises an event, and the event handler calls your method again **before the first call has finished**. If your method was in the middle of changing some data, the second call sees half-updated data." },
        { ul: [
          "What breaks re-entrancy: **shared data that can change**, like static fields, instance fields, or objects captured in a lambda.",
          "A method that only uses its parameters and local variables is re-entrant automatically.",
          "**`lock` lets the same thread enter again.** That stops the thread from deadlocking itself, but it does **not** protect your data: the second call may see it half-updated.",
          "Common causes: an event handler that calls back into you, a UI that processes clicks during a long task, recursion, and async code interleaving.",
          "How to protect: keep state local, take a copy before calling callbacks, use a \"busy\" flag (a re-entrancy guard), or make the type immutable."
        ] },
        { code: `public class Grid
{
    private bool _updating;                 // re-entrancy guard
    public event EventHandler Changed;

    public void Update()
    {
        if (_updating) return;              // a handler called us again: stop
        _updating = true;
        try
        {
            Recalculate();
            Changed?.Invoke(this, EventArgs.Empty);   // handler may call Update() again
        }
        finally { _updating = false; }
    }
}`, lang: "csharp" },
        { note: "Re-entrant and thread-safe are **not** the same thing. A method with a `lock` is thread-safe, but the same thread can still re-enter it and see broken data.", kind: "warn" }
      ]
    },

    {
      id: "raw-pointers",
      q: "How do you work with raw pointers in C#?",
      tldr: "Inside `unsafe` code you can use pointers like in C: `T*` to declare, `&` to get an address, `*` to read or write. Use `fixed` to stop the GC from moving the object while you point to it.",
      tags: ["interop", "unsafe"],
      seeAlso: ["csharp-advanced/unsafe-code"],
      a: [
        { code: `public static unsafe void Demo()
{
    int value = 42;
    int* p = &value;          // get the address
    *p = 99;                  // write through the pointer
    Console.WriteLine(value); // 99

    var array = new int[] { 1, 2, 3 };
    fixed (int* first = array)          // pin while we use the pointer
    {
        int* cursor = first;
        for (var i = 0; i < array.Length; i++, cursor++)
            *cursor *= 2;               // cursor++ moves one int forward
    }

    // Struct field through a pointer
    Point pt = new Point { X = 1 };
    Point* pp = &pt;
    pp->X = 5;

    // Native memory: you must free it yourself
    IntPtr block = Marshal.AllocHGlobal(1024);
    try { /* ... */ }
    finally { Marshal.FreeHGlobal(block); }
}`, lang: "csharp" },
        { ul: [
          "You can only point to **simple (unmanaged) types**: numbers, enums, pointers, and structs that contain only those. Not classes, and not structs with a string or object inside.",
          "`p++` moves forward by the **size of the type** (4 bytes for `int`), not by 1 byte.",
          "`fixed` pins the object for the block. Pinning for a long time makes the heap messy and slows the GC.",
          "`stackalloc` gives stack memory that needs no pinning and no freeing.",
          "There is **no bounds checking**. This is where buffer overruns become possible in C#."
        ] },
        { note: "In modern code, try `Span<T>`, `ref` returns and the `Unsafe` class first. Raw pointers are for calling native code and for squeezing the last bit of speed from proven hot code.", kind: "tip" }
      ]
    },

    {
      id: "gc-collect-advanced",
      q: "What is the purpose of the GC.Collect method?",
      tldr: "It asks the GC to run right now. It is meant for testing and rare special cases. In normal app code, calling it almost always makes performance worse.",
      tags: ["memory", "gc"],
      seeAlso: ["csharp-intermediate/gc-collect", "csharp-advanced/memory-management"],
      a: [
        { code: `GC.Collect();                               // all generations, waits for it
GC.Collect(0);                              // Gen 0 only
GC.Collect(2, GCCollectionMode.Optimized);  // let the GC decide if it is worth it
GC.Collect(2, GCCollectionMode.Forced, blocking: true, compacting: true);

// "Clean everything, including objects with finalizers"
GC.Collect();
GC.WaitForPendingFinalizers();
GC.Collect();

// Measuring memory in a test
var before = GC.GetTotalMemory(forceFullCollection: true);`, lang: "csharp" },
        { ul: [
          "**Why it hurts**: the GC already picks good times based on real usage. Forcing it early **pushes short-lived objects into Gen 1/Gen 2**, where they are much more expensive to clean later. It also pauses your threads.",
          "It does **not** free files or connections, and does **not** promise finalizers have run. That is why the \"collect twice\" pattern exists.",
          "**Fair uses**: a clean starting point in a memory test or benchmark, once after releasing a really huge cache, or before a latency-critical section.",
          "`GC.TryStartNoGCRegion(bytes)` is the better tool for \"please do not run the GC during this critical part\".",
          "`GC.AddMemoryPressure` / `RemoveMemoryPressure` tells the GC about native memory your object uses, so it plans collections better."
        ] },
        { note: "If someone says they call `GC.Collect()` to fix a memory leak: a .NET leak is an object that is **still referenced**. No amount of collecting will free something that is still in use.", kind: "warn" }
      ]
    },

    {
      id: "state-machine",
      q: "How do you implement a state machine in C#?",
      tldr: "Use enums for states and triggers plus a table of allowed moves, or use the State pattern with one class per state. Fun fact: the compiler already builds state machines for async and yield.",
      tags: ["patterns", "design"],
      a: [
        { p: "A state machine is like a **traffic light** or an **order status**: it is always in one state, and only certain moves are allowed. A Draft can be Submitted, but a Draft cannot jump straight to Approved." },
        { p: "**1. Enum + table of moves.** Short, easy to test, easy to draw. Best default choice:" },
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
        { p: "**2. State pattern.** One class per state. Better when each state has a lot of its own behaviour:" },
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
          "A `switch` expression on `(state, trigger)` is a nice middle ground in modern C#.",
          "For complex needs (conditions, enter/exit actions, nested states), use the **Stateless** library instead of writing your own.",
          "Save only the **current state value** to the database, and rebuild the machine when loading. Never save the machine object itself.",
          "Good point to mention: `async`/`await` and `yield return` are both turned into state machines by the compiler, so you use them every day without noticing."
        ] }
      ]
    },

    {
      id: "span-t",
      q: "What is the Span<T> type and how is it used?",
      tldr: "Span<T> is a safe \"window\" over a block of memory (an array, a string, stack memory). You can slice and read it without copying and without creating new objects.",
      tags: ["performance", "memory"],
      seeAlso: ["csharp-advanced/high-performance"],
      a: [
        { p: "Think of it as **a highlighter on a page**. `Substring` photocopies part of the page (new string, new memory). `Span` just highlights the part you want on the original page (no copy)." },
        { ul: [
          "It is a **`ref struct`**, which means it can only live on the stack. That is what makes it safe, and also what limits it.",
          "One API for **arrays, strings, `stackalloc` memory and native memory**.",
          "**Slicing is free**: a slice is just a start position and a length. No copying, no allocation.",
          "`string.AsSpan()` gives a `ReadOnlySpan<char>`, which replaces `Substring` in parsers.",
          "**Limits** (because it must stay on the stack): it cannot be a field in a class, cannot be boxed, cannot be used across `await` or inside a lambda, cannot be a generic type argument. Use **`Memory<T>`** when you need it across an `await`."
        ] },
        { code: `// Parse "name,age" without creating any substring
static (string Name, int Age) Parse(string line)
{
    ReadOnlySpan<char> span = line.AsSpan();
    var comma = span.IndexOf(',');
    var name  = span[..comma];
    var age   = span[(comma + 1)..];
    return (name.ToString(), int.Parse(age));
}

// Buffer on the stack: no heap allocation at all
Span<byte> buffer = stackalloc byte[128];
random.NextBytes(buffer);

// A window on part of an array: no copy
var numbers = new int[1000];
Span<int> middle = numbers.AsSpan(100, 50);
middle.Fill(7);        // changes the original array`, lang: "csharp" },
        { table: { head: ["", "`Span<T>`", "`Memory<T>`"], rows: [
          ["Where it can live", "Stack only (`ref struct`)", "Heap too"],
          ["Across `await` / in class fields", "No", "Yes"],
          ["Can wrap", "Array, string, `stackalloc`, native memory", "Array, string, `MemoryPool`"],
          ["How you read it", "Directly", "Through `.Span`"]
        ] } }
      ]
    },

    {
      id: "optimize-performance",
      q: "How do you optimize performance in C# applications?",
      tldr: "Use a profiler to find the real slow part first. Then fix in this order: database and algorithms, then memory allocations, then parallel code, and small tweaks last.",
      tags: ["performance"],
      seeAlso: ["csharp-advanced/high-performance"],
      a: [
        { ol: [
          "**Profile before you change anything.** Guesses are usually wrong. In most business apps, the slow part is the database or network, not the C# code.",
          "**Fix data access**: N+1 queries, missing indexes, `SELECT *`, loading rows and then filtering them in memory. Usually the biggest win.",
          "**Fix algorithms and data structures**: for example, use a `Dictionary` lookup instead of `List.FirstOrDefault` inside a loop.",
          "**Reduce allocations**: `StringBuilder`, `Span<T>`, pooling, pre-sized lists, structs for small values.",
          "**Cache** things that are expensive and do not change often.",
          "**Run CPU-heavy work in parallel**, and make I/O async so threads are not stuck waiting.",
          "**Then** do small tweaks, and measure again after every change."
        ] },
        { table: { head: ["What you see", "Usual cause"], rows: [
          ["High CPU, slow", "An O(n²) loop, or serialization/reflection in hot code"],
          ["Low CPU, but slow responses", "Blocking I/O, thread-pool starvation, `.Result` on async code"],
          ["Memory goes up and down a lot, many Gen 2 GCs", "Too many objects created, or big objects on the LOH"],
          ["Memory only goes up", "Something still holds a reference: a static list or an event handler never removed"],
          ["Only the first request is slow", "JIT warm-up. Consider ReadyToRun or Native AOT"]
        ] } },
        { note: "Tools to mention: **BenchmarkDotNet** for small benchmarks, **dotnet-counters** and **dotnet-trace** in production, **PerfView** or **dotMemory** for memory, and EF Core logs or SQL Profiler for the database.", kind: "tip" }
      ]
    },

    {
      id: "asparallel-vs-parallel-foreach",
      q: "What is the difference between AsParallel and Parallel.ForEach?",
      tldr: "AsParallel (PLINQ) runs a LINQ query on many cores and gives you back results. Parallel.ForEach runs a loop body on many cores to DO something with each item.",
      tags: ["parallelism", "linq"],
      a: [
        { p: "Easy way to remember: **AsParallel = \"give me a result\"** (filter, transform, collect). **Parallel.ForEach = \"do this for each item\"** (save a file, send an email)." },
        { table: { head: ["", "`AsParallel()` (PLINQ)", "`Parallel.ForEach`"], rows: [
          ["Shape", "A query that **returns** data", "A loop that **does work** for each item"],
          ["Chaining", "Works with `Where`, `Select`, `OrderBy`", "One method body"],
          ["Order", "Not kept by default, `AsOrdered()` keeps it", "No order"],
          ["Settings", "`WithDegreeOfParallelism`, `WithCancellation`", "`ParallelOptions`, plus `Break` / `Stop`"],
          ["Stop early", "`Take`, `First`", "`state.Break()` / `state.Stop()`"],
          ["Best for", "Transform and collect data", "Independent work for each item"]
        ] } },
        { code: `// PLINQ: gives back a result
var primes = numbers
    .AsParallel()
    .WithDegreeOfParallelism(4)
    .Where(IsPrime)
    .OrderBy(n => n)        // needs to merge results back in order
    .ToList();

// Parallel.ForEach: do something with each item
Parallel.ForEach(files, new ParallelOptions { MaxDegreeOfParallelism = 8 },
    file => Process(file));

// Async work for each item: use this instead
await Parallel.ForEachAsync(urls, ct, async (url, token) =>
{
    await DownloadAsync(url, token);
});`, lang: "csharp" },
        { note: "Both are for **CPU-heavy** work. For I/O work (web calls, DB), use `Task.WhenAll` or `Parallel.ForEachAsync`. Also, running a very small loop in parallel is often **slower** than a normal loop, because splitting and merging the work has a cost.", kind: "warn" }
      ]
    },

    {
      id: "aspect-oriented-programming",
      q: "How do you implement aspect-oriented programming in C#?",
      tldr: "AOP moves shared concerns (logging, caching, retries) out of business code. In C# you do it with decorators through DI, proxy libraries, middleware/filters, or compile-time code weaving.",
      tags: ["architecture", "patterns"],
      a: [
        { p: "AOP means pulling out **cross-cutting concerns**: things needed in many places, like logging, caching, retries, validation, transactions and security. Your business code stays clean. C# has no special keyword for it, so it is done by **wrapping** your code." },
        { table: { head: ["Approach", "How", "Trade-off"], rows: [
          ["**Decorator + DI**", "Wrap the interface in another class, register it in DI", "No libraries, very clear, but you write one per interface"],
          ["**Dynamic proxy**", "Castle DynamicProxy, Autofac interceptors", "Automatic, but has a runtime cost and only works on interfaces/virtual methods"],
          ["**Compile-time weaving**", "PostSharp, Fody, Metalama", "No runtime cost, but an extra build step and tools"],
          ["**Source generators**", "Generate the decorator when you build", "Fast and debuggable, but you write the generator"],
          ["**Framework hooks**", "ASP.NET middleware, action filters, EF interceptors", "Free and standard, but only at those points"]
        ] } },
        { code: `// Decorator: plain C#, no library needed
public class CachingOrderService : IOrderService
{
    private readonly IOrderService _inner;      // the real service
    private readonly IMemoryCache _cache;

    public CachingOrderService(IOrderService inner, IMemoryCache cache)
        => (_inner, _cache) = (inner, cache);

    public Task<Order> GetAsync(int id) =>
        _cache.GetOrCreateAsync($"order:{id}", e =>
        {
            e.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return _inner.GetAsync(id);          // only called on a cache miss
        });
}

services.AddScoped<IOrderService, OrderService>();
services.Decorate<IOrderService, CachingOrderService>();   // Scrutor library`, lang: "csharp" },
        { note: "Honest senior answer: prefer clear decorators and framework hooks. \"Magic\" weaving makes stack traces and debugging much harder, and new team members cannot tell what code will actually run.", kind: "tip" }
      ]
    },

    {
      id: "methodimpl-attribute",
      q: "What is the purpose of the MethodImpl attribute?",
      tldr: "It gives instructions to the JIT compiler about a method. The useful ones are AggressiveInlining (try hard to inline it) and NoInlining (never inline it).",
      tags: ["performance", "metadata"],
      a: [
        { p: "**Inlining** means the JIT copies the method's code directly into the caller, so there is no method call at all. Faster for tiny methods." },
        { table: { head: ["`MethodImplOptions`", "What it does"], rows: [
          ["`AggressiveInlining`", "Asks the JIT strongly to inline it, even if it is a bit big"],
          ["`NoInlining`", "Never inline. Needed for stack traces, benchmarks and some tricks"],
          ["`NoOptimization`", "Turn off JIT optimisation. For debugging only"],
          ["`Synchronized`", "Puts a lock around the whole method, on `this` (or on the `Type` if static)"],
          ["`AggressiveOptimization`", "Skip the quick first compile and fully optimise right away"],
          ["`InternalCall`", "The method is built into the .NET runtime itself"]
        ] } },
        { code: `[MethodImpl(MethodImplOptions.AggressiveInlining)]
public static int Clamp(int v, int lo, int hi)
    => v < lo ? lo : (v > hi ? hi : v);

[MethodImpl(MethodImplOptions.NoInlining)]
public static string CallerName()
    => new StackTrace().GetFrame(1).GetMethod().Name;   // must not be inlined`, lang: "csharp" },
        { note: "**Do not use `Synchronized`.** It locks on `this` or on the `Type`, which outside code can also see and lock on. That is exactly the locking mistake everyone warns about. Use a normal `lock` on a private object.", kind: "warn" },
        { note: "`AggressiveInlining` only helps on very small, very frequently called methods. Used everywhere, it makes the code bigger and can slow things down. Measure it.", kind: "tip" }
      ]
    },

    {
      id: "reflection-emit",
      q: "How do you use reflection emit to dynamically create types at runtime?",
      tldr: "System.Reflection.Emit lets you create a brand new class while the app is running, by writing raw IL instructions with an ILGenerator. You get a real Type you can create and use.",
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

// Write the IL: return "Hello, " + name;
var il = method.GetILGenerator();
il.Emit(OpCodes.Ldstr, "Hello, ");
il.Emit(OpCodes.Ldarg_0);
il.Emit(OpCodes.Call, typeof(string).GetMethod("Concat",
    new[] { typeof(string), typeof(string) }));
il.Emit(OpCodes.Ret);

Type built = type.CreateType();
var result = built.GetMethod("Greet").Invoke(null, new object[] { "Ada" });`, lang: "csharp" },
        { ul: [
          "The steps are always the same: **AssemblyBuilder, then ModuleBuilder, then TypeBuilder, then MethodBuilder, then ILGenerator, then CreateType()**.",
          "`DynamicMethod` is a lighter option when you only need one method, not a whole class.",
          "Real uses: **mocking and proxy libraries** (Moq, Castle), ORMs, fast serializers, and replacing slow reflection with generated code.",
          "You are writing raw IL, so one wrong instruction fails at runtime with an unclear `InvalidProgramException`.",
          "It does **not work with Native AOT** (or on iOS), because there is no JIT to compile the new IL."
        ] },
        { note: "Almost always try something else first: **expression trees** (`Expression.Lambda(...).Compile()`) to generate a method, or a **source generator** to generate code at build time (easy to debug, AOT-safe, visible in the IDE). Use Reflection.Emit only when you truly need a brand new `Type` at runtime.", kind: "tip" }
      ]
    }

  ]
});
