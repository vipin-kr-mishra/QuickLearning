/* C# — Intermediate. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "csharp-intermediate",
  topic: "C#",
  level: "Intermediate",
  short: "C# Intermediate",
  accent: "violet",
  desc: "The next step after the basics: generics, delegates and events, async and threads, reflection, and the keywords that turn an OK answer into a confident one.",
  questions: [

    {
      id: "async-await-purpose",
      q: "What is the purpose of async and await keywords in C#?",
      tldr: "They let you write non-blocking code that still reads top to bottom. `await` frees the thread while slow work is running, and the method continues when that work is done.",
      tags: ["async", "tasks"],
      seeAlso: ["csharp-basic/async-await", "csharp-intermediate/task-vs-thread"],
      a: [
        { p: "Behind the scenes, the compiler turns an `async` method into a **state machine**. At each `await` on unfinished work, the method pauses and the thread goes back to the pool. When the work finishes, the rest of the method is scheduled to run." },
        { ul: [
          "**No new thread is created.** For I/O (web calls, database, files), the waiting happens in the OS. There is no CPU work to do, so blocking a thread would be a waste.",
          "On a **server**, the win is **scalability** (more requests with the same threads). In a **UI app**, the win is **responsiveness** (the screen does not freeze).",
          "Return `Task` or `Task<T>`. `ValueTask<T>` is for very hot code paths. `async void` is only for event handlers.",
          "`ConfigureAwait(false)` in library code means \"do not come back to the original context\". It is a bit faster and avoids deadlocks.",
          "If the awaited work throws, the exception is stored in the task and thrown again at the `await`, so a normal `try/catch` works."
        ] },
        { code: `public async Task<Report> BuildAsync(int id, CancellationToken ct)
{
    var data  = await _repo.LoadAsync(id, ct).ConfigureAwait(false);
    var extra = await _api.FetchAsync(data.Key, ct).ConfigureAwait(false);
    return new Report(data, extra);
}

// Independent work: start both, then wait for both
var (a, b) = (LoadAAsync(), LoadBAsync());
await Task.WhenAll(a, b);`, lang: "csharp" },
        { note: "Two `await`s in a row run **one after the other**. If the calls do not depend on each other, start both first and then `await Task.WhenAll(...)`. This is a very common follow-up question.", kind: "warn" }
      ]
    },

    {
      id: "delegates-and-events",
      q: "Explain the concept of delegates and events in C#.",
      tldr: "A delegate is a variable that holds a method. An event is a protected delegate: outside code can only subscribe or unsubscribe, and only the owning class can raise it.",
      tags: ["delegates", "events"],
      flag: "doubt",
      seeAlso: ["csharp-intermediate/delegate-vs-event", "csharp-basic/delegate"],
      a: [
        { p: "Think of it in two layers. The **delegate** is the *type*: it says what shape a method must have. The **event** adds *protection* around a delegate: outside code can only do `+=` and `-=`. It cannot replace the list, clear it, or fire it." },
        { p: "Real life example: a **YouTube channel**. You can subscribe and unsubscribe (`+=` / `-=`), but only the channel owner can publish a video (raise the event)." },
        { p: "**The delegate: a method stored as a value**" },
        { code: `public delegate void Notify(string message);   // defines a TYPE

Notify n = Console.WriteLine;   // point it at a method
n += msg => File.AppendAllText("log.txt", msg);   // add a second method
n("started");                   // both run, in the order they were added`, lang: "csharp" },
        { p: "**The event: publish/subscribe built on top**" },
        { code: `public class Downloader
{
    // Standard pattern: EventHandler<T>, with sender + args
    public event EventHandler<ProgressEventArgs> Progress;

    protected virtual void OnProgress(int percent)
        => Progress?.Invoke(this, new ProgressEventArgs(percent));   // safe if no subscribers

    public void Run()
    {
        for (var i = 0; i <= 100; i += 10) OnProgress(i);
    }
}

var d = new Downloader();
d.Progress += (sender, e) => Console.WriteLine(e.Percent);   // subscribe
d.Run();`, lang: "csharp" },
        { ul: [
          "Convention: use `EventHandler` or `EventHandler<TArgs>`, with `(object sender, TArgs e)` and no return value.",
          "Raise it from a `protected virtual OnXxx` method, so child classes can change the behaviour.",
          "Use `?.Invoke(...)`, because if nobody subscribed, the event is `null`.",
          "**Unsubscribe** when the listener is no longer needed. The event keeps a reference to the listener, so it is never garbage collected. This is the classic memory leak in .NET."
        ] },
        { note: "Under the hood, `event` just creates a private delegate field plus `add`/`remove` methods. That is the whole difference between a delegate field and an event.", kind: "tip" }
      ]
    },

    {
      id: "task-vs-thread",
      q: "What is a Task in C#? How does it differ from Thread?",
      tldr: "A Thread is a real OS worker that you manage yourself. A Task is a piece of work that will finish in the future, usually run on the thread pool, with results, errors and cancellation built in.",
      tags: ["async", "threading"],
      seeAlso: ["csharp-intermediate/async-await-purpose"],
      a: [
        { p: "Simple way to picture it: a **Thread is hiring a new worker**, which is expensive. A **Task is giving a job to a team** that already exists (the thread pool). The team decides who does it." },
        { table: { head: ["", "`Thread`", "`Task`"], rows: [
          ["What it is", "A real OS thread (about 1 MB of memory)", "A piece of work, usually run on the thread pool"],
          ["Cost", "Expensive to create and destroy", "Cheap, threads are reused"],
          ["Return value", "None, you build it yourself", "`Task<T>` gives you the result"],
          ["Errors", "An unhandled one crashes the app", "Stored and thrown again at `await`"],
          ["Cancel", "No safe way (`Abort` was removed)", "`CancellationToken`"],
          ["Combining", "Manual", "`WhenAll`, `WhenAny`, `await`"]
        ] } },
        { code: `// CPU-heavy work: move it off the current thread
var result = await Task.Run(() => HeavyCalculation(input));

// I/O work: no thread is used while waiting
var json = await httpClient.GetStringAsync(url);

// Run many at once and wait for all
var all = await Task.WhenAll(ids.Select(id => LoadAsync(id)));`, lang: "csharp" },
        { note: "Key point: use `Task.Run` for **CPU-heavy** work. For **I/O** work, just `await` the async method. Wrapping an I/O call in `Task.Run` wastes a thread for nothing.", kind: "warn" }
      ]
    },

    {
      id: "lock-and-monitor",
      q: "Describe the lock statement and Monitor class in C#.",
      tldr: "`lock` makes sure only one thread at a time runs a block of code. It is a short way of writing `Monitor.Enter` and `Monitor.Exit` inside a try/finally.",
      tags: ["threading", "synchronisation"],
      a: [
        { p: "Think of a **single bathroom key**. Whoever has the key goes in. Everyone else waits until the key is returned. `lock` is that key." },
        { code: `private readonly object _gate = new object();

lock (_gate)
{
    _counter++;      // only one thread in here at a time
}

// the compiler turns it into this:
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
          "`Monitor` can do more than `lock`: `TryEnter` with a timeout, and `Wait`/`Pulse` to signal between threads.",
          "The same thread can take the same lock again without getting stuck (it is **re-entrant**).",
          "Always lock on a **private, readonly object** that only your class can see.",
          "Keep the locked code as small as possible. You cannot `await` inside a `lock` (it will not compile).",
          "For async code, use `SemaphoreSlim` with `WaitAsync()` instead."
        ] },
        { note: "Never lock on `this`, on a `Type` or on a string. Other code can see those and lock on them too, which can cause a deadlock.", kind: "warn" }
      ]
    },

    {
      id: "extension-methods",
      q: "What are extension methods in C# and how are they used?",
      tldr: "Extension methods are static methods with `this` on the first parameter. They let you add methods to a type you do not own and call them like normal instance methods.",
      tags: ["functional", "linq"],
      seeAlso: ["csharp-basic/extension-methods"],
      a: [
        { ul: [
          "Three rules: **static class**, **static method**, **`this` on the first parameter**.",
          "The compiler turns the call into a normal static call. No extra cost, no access to private members, and the original type is not changed.",
          "You must add a **`using` for its namespace**, or the method will not show up.",
          "If the type already has a real method with the same signature, the **real method wins**.",
          "They can extend **interfaces**. That is how LINQ adds around 50 methods to every `IEnumerable<T>` at once."
        ] },
        { code: `public static class EnumerableExtensions
{
    // Split a list into chunks of "size"
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
        { note: "Trick question: you can call an extension method on a `null` value without an error, because it is really just a static call. So `((string)null).IsNullOrEmpty()` works fine.", kind: "tip" }
      ]
    },

    {
      id: "using-idisposable",
      q: "Explain the use of using statement and IDisposable interface in C#.",
      tldr: "IDisposable gives a class a Dispose() method to release things like files and DB connections right away. `using` makes sure Dispose() is always called, even if an error happens.",
      tags: ["resources", "idisposable"],
      seeAlso: ["csharp-basic/using-statement"],
      a: [
        { p: "The garbage collector frees **memory**, but it does not know about files, sockets or database connections. `IDisposable` is how you release those **at the moment you choose**, instead of \"sometime later\"." },
        { code: `public class FileCache : IDisposable
{
    private FileStream _stream;
    private bool _disposed;

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);   // cleanup done, skip the finalizer
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;       // safe to call twice
        if (disposing)
        {
            _stream?.Dispose();      // clean up managed objects
        }
        // release raw OS handles here
        _disposed = true;
    }

    ~FileCache() => Dispose(false);  // only needed if you hold raw OS handles
}`, lang: "csharp", caption: "The full dispose pattern" },
        { ul: [
          "`Dispose()` must be **safe to call twice**. The second call should do nothing.",
          "Only add a **finalizer** (`~ClassName`) if your class holds a raw OS handle directly. Finalizers slow down garbage collection.",
          "`GC.SuppressFinalize(this)` tells the GC \"already cleaned up, skip the finalizer\".",
          "If the cleanup itself is async, implement `IAsyncDisposable` and use `await using`.",
          "If your class has a field that is `IDisposable`, your class should almost always be `IDisposable` too."
        ] }
      ]
    },

    {
      id: "delegate-vs-event",
      q: "What is a delegate in C#? How is it different from an event?",
      tldr: "A delegate is a type that holds methods. An event is a member built on a delegate that only lets outside code subscribe and unsubscribe.",
      tags: ["delegates", "events"],
      flag: "doubt",
      seeAlso: ["csharp-intermediate/delegates-and-events"],
      a: [
        { p: "It is the same idea as **field vs property**. A public delegate field is fully open to everyone. An event is the protected version of it." },
        { table: { head: ["From outside the class", "Public delegate field", "`event`"], rows: [
          ["Subscribe with `+=`", "Yes", "Yes"],
          ["Unsubscribe with `-=`", "Yes", "Yes"],
          ["Assign with `=` (removes all subscribers)", "**Yes (dangerous)**", "No, compile error"],
          ["Call / raise it", "**Yes, anyone can fire it**", "No, only the owning class"],
          ["Set to `null`", "Yes", "No"]
        ] } },
        { code: `public class Publisher
{
    public Action<string> OnFieldStyle;          // plain delegate field
    public event Action<string> OnEventStyle;    // event
}

var p = new Publisher();

p.OnFieldStyle = null;          // allowed: silently removes every subscriber
p.OnFieldStyle("fake");         // allowed: outside code fires your notification

// p.OnEventStyle = null;       // compile error
// p.OnEventStyle("fake");      // compile error
p.OnEventStyle += Handle;       // only this is allowed`, lang: "csharp" },
        { p: "One-line summary: **a delegate is a type, an event is a member**. The `event` keyword wraps a private delegate so only the owner class decides when to fire it." }
      ]
    },

    {
      id: "generics",
      q: "What are Generics in C#? Explain with an example.",
      tldr: "Generics let you write a class or method once with a placeholder type `T`, and use it with any type while keeping full type safety.",
      tags: ["generics"],
      a: [
        { p: "Think of a **lunch box with a label slot**. The box is the same, but you write on the label what goes inside: `Box<Sandwich>`, `Box<Fruit>`. Once labelled, you cannot put the wrong thing in." },
        { ul: [
          "**Type safety**: a `List<int>` cannot hold a `string` by mistake.",
          "**No boxing**: value types are stored directly, unlike the old `ArrayList`.",
          "**Type info is kept at runtime**: unlike Java, .NET knows `T` when the app runs.",
          "**Constraints** (`where T : ...`) limit what `T` can be, and let you use its members."
        ] },
        { table: { head: ["Constraint", "Means"], rows: [
          ["`where T : class`", "T must be a reference type"],
          ["`where T : struct`", "T must be a value type (not nullable)"],
          ["`where T : new()`", "T must have a public empty constructor"],
          ["`where T : BaseType`", "T must inherit from BaseType"],
          ["`where T : IComparable<T>`", "T must implement that interface"],
          ["`where T : notnull`, `unmanaged`", "T cannot be null / T is a simple unmanaged type"]
        ] } },
        { code: `public class Repository<T> where T : class, IEntity, new()
{
    private readonly List<T> _items = new();

    public void Add(T item) => _items.Add(item);
    public T Find(int id) => _items.FirstOrDefault(x => x.Id == id);
    public T CreateNew() => new T();          // allowed because of new()
}

public static T Max<T>(T a, T b) where T : IComparable<T>
    => a.CompareTo(b) >= 0 ? a : b;`, lang: "csharp" }
      ]
    },

    {
      id: "covariance-contravariance",
      q: "Explain covariance and contravariance in C# with examples.",
      tldr: "Covariance (`out`) lets you use a more specific type where a general one is expected, like IEnumerable<Dog> as IEnumerable<Animal>. Contravariance (`in`) is the opposite, like Action<Animal> as Action<Dog>.",
      tags: ["generics", "variance"],
      flag: "doubt",
      a: [
        { p: "The words are scary, the rule is simple. Just ask: **does `T` come OUT of the type, or go IN to it?**" },
        { ul: [
          "`T` only comes **out** (returned): the type is **covariant**, marked `out`. Example: `IEnumerable<out T>`.",
          "`T` only goes **in** (as a parameter): the type is **contravariant**, marked `in`. Example: `IComparer<in T>`, `Action<in T>`.",
          "`T` goes both ways: the type is **invariant**, no conversion allowed. Example: `List<T>`."
        ] },
        { p: "**Covariance (`out`).** A list of dogs only gives you dogs, and every dog is an animal. So it is safe to read it as a list of animals:" },
        { code: `IEnumerable<Dog> dogs = new List<Dog>();
IEnumerable<Animal> animals = dogs;      // OK: IEnumerable<out T>

// Why List<T> cannot do this:
// List<Animal> list = dogs;             // if this were allowed...
// list.Add(new Cat());                  // ...you could put a Cat into a list of Dogs!`, lang: "csharp" },
        { p: "**Contravariance (`in`).** Something that can feed any animal can surely feed a dog. So it is safe to use it where a dog feeder is needed:" },
        { code: `Action<Animal> feedAny = a => Console.WriteLine("fed " + a.Name);
Action<Dog> feedDog = feedAny;            // OK: Action<in T>

IComparer<Animal> byName = new AnimalNameComparer();
var dogs = new List<Dog>();
dogs.Sort(byName);                        // OK: IComparer<in T>`, lang: "csharp" },
        { code: `// Making your own
public interface IProducer<out T> { T Produce(); }        // T only returned
public interface IConsumer<in T> { void Consume(T item); } // T only taken in
// public interface IBoth<out T> { void Set(T x); }       // error: out T used as input`, lang: "csharp" },
        { table: { head: ["", "Keyword", "Direction", "Example"], rows: [
          ["Covariant", "`out`", "Child to Parent", "`IEnumerable<Dog>` to `IEnumerable<Animal>`"],
          ["Contravariant", "`in`", "Parent to Child", "`Action<Animal>` to `Action<Dog>`"],
          ["Invariant", "none", "No conversion", "`List<T>`, `IList<T>`"]
        ] } },
        { note: "Memory trick: **out = output = covariant**, **in = input = contravariant**. Also, this only works on **interfaces and delegates**, never on classes, and not with value types like `int`.", kind: "tip" },
        { note: "Arrays allow this (`Animal[] a = new Dog[5];`) but it is **not safe**. It compiles, then throws `ArrayTypeMismatchException` if you put a Cat in. It is seen as an old design mistake.", kind: "warn" }
      ]
    },

    {
      id: "linq-in-csharp",
      q: "What is LINQ in C#? Provide an example.",
      tldr: "LINQ (Language Integrated Query) lets you filter, group and sort data with normal C# code, and the same style works for lists, databases and XML.",
      tags: ["linq"],
      seeAlso: ["linq/what-is-linq", "linq/query-vs-method-syntax"],
      a: [
        { ul: [
          "The methods work on `IEnumerable<T>` (data in memory) and `IQueryable<T>` (turned into SQL by Entity Framework).",
          "Most queries are **deferred**: writing the query does not run it. It runs when you loop over it or call `ToList()`.",
          "**Query syntax** (SQL-like) and **method syntax** (chained methods) do exactly the same thing. Query syntax is easier to read for joins and grouping.",
          "Methods like `ToList`, `Count`, `First`, `Sum` run the query right away."
        ] },
        { code: `var orders = new List<Order>();

// Top 10 customers by total of shipped orders
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
    .ToList();      // the query runs here`, lang: "csharp" }
      ]
    },

    {
      id: "anonymous-methods",
      q: "What are anonymous methods in C#? Provide an example.",
      tldr: "An anonymous method is a method with no name, written inline with the `delegate` keyword. It is the older (C# 2) version of lambdas, and today we use lambdas instead.",
      tags: ["delegates", "functional"],
      a: [
        { code: `// C# 2 anonymous method
Func<int, int> square = delegate (int x) { return x * x; };

button.Click += delegate (object s, EventArgs e)
{
    MessageBox.Show("clicked");
};

// Modern way: a lambda
Func<int, int> square2 = x => x * x;
button.Click += (s, e) => MessageBox.Show("clicked");`, lang: "csharp" },
        { ul: [
          "Both can use variables from outside (they are **closures**).",
          "One small difference: an anonymous method can **skip the parameter list** completely: `delegate { ... }`. A lambda cannot.",
          "Lambdas are shorter and can become **expression trees** (which EF uses to build SQL). Anonymous methods cannot.",
          "In real code, write lambdas. Just know the `delegate` style because you will see it in older projects."
        ] }
      ]
    },

    {
      id: "yield-keyword",
      q: "What is the yield keyword in C#? Provide an example.",
      tldr: "`yield return` lets a method give back items one at a time, only when asked. The method pauses after each item and continues from the same spot next time.",
      tags: ["iterators", "lazy"],
      a: [
        { p: "Think of a **vending machine** vs a **truck delivery**. A normal method builds the whole list and delivers it all at once (truck). A `yield` method gives you one item each time you press the button (vending machine)." },
        { ul: [
          "`yield return x` gives back one item and **pauses** the method. Local variables are remembered.",
          "`yield break` stops the sequence early.",
          "Nothing runs until someone loops over it. So even a bug at the top of the method will not show up until the first loop.",
          "Memory stays low, because the full list is never built.",
          "Works in methods that return `IEnumerable<T>` or `IEnumerator<T>` (and `IAsyncEnumerable<T>` with `await foreach`)."
        ] },
        { code: `public static IEnumerable<int> Fibonacci(int count)
{
    int a = 0, b = 1;
    for (var i = 0; i < count; i++)
    {
        yield return a;                 // give one item, then pause
        (a, b) = (b, a + b);
    }
}

// Read a huge file one line at a time, without loading it all
public static IEnumerable<string> ReadLines(string path)
{
    using var reader = new StreamReader(path);
    string line;
    while ((line = reader.ReadLine()) != null)
        yield return line;
}

foreach (var n in Fibonacci(10)) Console.Write(n + " ");   // 0 1 1 2 3 5 ...`, lang: "csharp" },
        { note: "Because it runs late, argument checks inside a `yield` method only happen when you start looping, not when you call it. Fix: check arguments in a normal public method, then call a private `yield` method.", kind: "warn" }
      ]
    },

    {
      id: "nullable-types",
      q: "Explain the concept of a Nullable type in C#.",
      tldr: "`int?` (short for `Nullable<int>`) lets a value type also hold null. It wraps the value together with a HasValue flag.",
      tags: ["null-safety"],
      a: [
        { p: "Useful example: a database column `Age` that can be empty. With a plain `int`, you would have to use `0`, but `0` is a real age. `int?` lets you say \"no value\"." },
        { ul: [
          "`int?` is short for `Nullable<int>`. Only **value types** can be wrapped this way.",
          "`HasValue` tells you if there is a value. `Value` throws an exception if there is none.",
          "Safe ways to read it: `??` and `GetValueOrDefault()`.",
          "Math works on nullables: if any side is `null`, the result is `null`. Comparisons with `null` give `false`.",
          "Great for database columns and for \"not given\" values where `0` would be a real answer."
        ] },
        { code: `int? age = null;

if (age.HasValue) Console.WriteLine(age.Value);
int safe = age ?? 0;
int safe2 = age.GetValueOrDefault(18);

int? a = 5, b = null;
int? sum = a + b;            // null
bool eq = (a == b);          // false, no exception

if (age is int years) { /* pattern matching gets the value out */ }`, lang: "csharp" },
        { note: "Do not mix this up with **nullable reference types** (C# 8, `string?`). Those only give compiler warnings. Nothing changes when the app runs, and there is no `Nullable<T>` wrapper.", kind: "warn" }
      ]
    },

    {
      id: "partial-keyword",
      q: "What is the purpose of the partial keyword in C#?",
      tldr: "`partial` lets you split one class (or method) across several files. The compiler joins them into one class when you build.",
      tags: ["organisation", "codegen"],
      a: [
        { ul: [
          "Main use: keep **tool-generated code separate from your own code**. Examples: WinForms designer files, EF models, source generators.",
          "All parts must be in the same project and namespace, and each part must say `partial`.",
          "**Partial methods** let generated code offer an optional hook. If you do not write the body, the compiler removes the call completely.",
          "Old-style partial methods must return `void` and be `private`. Since C# 9 they can be public and return values, but then you must write the body."
        ] },
        { code: `// Order.Generated.cs  (made by a tool, never edit)
public partial class Order
{
    public int Id { get; set; }
    partial void OnCreated();          // optional hook
    public Order() { OnCreated(); }
}

// Order.cs  (your code, safe when the tool regenerates)
public partial class Order
{
    public decimal Total => Lines.Sum(l => l.Amount);
    partial void OnCreated() => CreatedOn = DateTime.UtcNow;
}`, lang: "csharp" },
        { note: "`partial` is not a fix for a class that is too big. If a class does not fit in one file, it usually should be split into several classes.", kind: "tip" }
      ]
    },

    {
      id: "default-keyword",
      q: "Explain the use of the default keyword in C#.",
      tldr: "`default` gives the \"empty\" value of a type: 0 for numbers, false for bool, null for classes. It is most useful in generic code where you do not know what T is.",
      tags: ["generics", "fundamentals"],
      a: [
        { ul: [
          "`default(T)` gives the type's empty value. Since C# 7.1 you can just write `default` and the compiler figures out the type.",
          "In a generic method you cannot write `null` or `0` for `T`, because you do not know what `T` is. `default` is the answer.",
          "It is also the `default:` case in a `switch`. In a `switch` expression, `_` plays that role.",
          "For a `struct`, `default` gives an instance with all fields set to zero, without running any constructor."
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

if (EqualityComparer<T>.Default.Equals(value, default)) { /* is it empty? */ }`, lang: "csharp" },
        { note: "For a nullable type, `default` is `null`, not `0`. So `default(int?)` is `null`. Easy to get wrong under pressure.", kind: "warn" }
      ]
    },

    {
      id: "tuples",
      q: "What are tuples in C#? Provide an example.",
      tldr: "A tuple is a quick way to group a few values together without creating a class. Modern tuples (C# 7) are light structs and you can name each item.",
      tags: ["types"],
      a: [
        { ul: [
          "**`ValueTuple`**, written `(int, string)`, C# 7+. A **struct**, fast, and you can name items and unpack them. Use this one.",
          "**`System.Tuple`**: the old C# 4 class. Slower, and the items are called `Item1`, `Item2`, which is hard to read.",
          "Main use: returning **more than one value** from a private or internal method without making a new class.",
          "**Deconstruction** unpacks a tuple into separate variables in one line."
        ] },
        { code: `public (bool Success, string Error) Validate(Order o)
{
    if (o.Total <= 0) return (false, "Total must be positive");
    return (true, null);
}

var result = Validate(order);
if (!result.Success) Console.WriteLine(result.Error);

var (ok, error) = Validate(order);      // unpack into two variables

(int x, int y) point = (3, 4);
(x, y) = (y, x);                        // swap without a temp variable`, lang: "csharp" },
        { note: "For a **public API**, prefer a proper record or class. Tuple names are only a compiler hint, so they give no documentation or validation.", kind: "tip" }
      ]
    },

    {
      id: "reflection",
      q: "Explain the concept of reflection in C#.",
      tldr: "Reflection lets your code look at itself while running: find classes, read properties and attributes, create objects and call methods by name.",
      tags: ["reflection", "metadata"],
      a: [
        { p: "Think of it as your code **reading its own X-ray**. At runtime it can ask \"what properties does this class have?\" or \"does this method have a [Test] attribute?\"." },
        { ul: [
          "Every compiled .dll keeps information about its types, and `System.Reflection` can read it.",
          "Used by **JSON serializers, Entity Framework, DI containers, test runners, validators, AutoMapper**: any tool that must work with classes it has never seen before.",
          "It can read **attributes**, which is how `[Required]` or `[Test]` are found.",
          "It can even reach private members with `BindingFlags.NonPublic`.",
          "It is **slow** compared to normal code. Cache the `Type` and `PropertyInfo` objects, or build a compiled delegate once."
        ] },
        { code: `Type t = typeof(Order);                     // or order.GetType()

foreach (var p in t.GetProperties())
    Console.WriteLine($"{p.Name} : {p.PropertyType.Name}");

var instance = (Order)Activator.CreateInstance(t);   // create an object
t.GetProperty("Total").SetValue(instance, 99m);      // set a property by name

var method = t.GetMethod("Recalculate");
method.Invoke(instance, null);                       // call a method by name

// Read an attribute
var attr = t.GetCustomAttribute<TableAttribute>();`, lang: "csharp" },
        { note: "In code that runs very often, replace `PropertyInfo.GetValue` with a compiled `Func<T, object>` built once from an expression tree. It is usually around 100 times faster.", kind: "tip" }
      ]
    },

    {
      id: "attributes",
      q: "What are attributes in C#? Provide an example.",
      tldr: "Attributes are labels in square brackets, like `[Required]`, that add extra info to your code. Frameworks read these labels (using reflection) and act on them.",
      tags: ["metadata", "reflection"],
      seeAlso: ["csharp-advanced/custom-attribute"],
      a: [
        { ul: [
          "Written in square brackets above a class, method or property: `[Obsolete]`, `[Serializable]`, `[Required]`, `[HttpGet]`.",
          "They do **nothing by themselves**. Something has to **read** them, usually a framework using reflection.",
          "Common built-in ones: `[Obsolete]` (compiler warning), `[Conditional(\"DEBUG\")]` (call removed in release), `[CallerMemberName]`, `[DebuggerDisplay]`.",
          "You can make your own by inheriting from `System.Attribute`."
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
      tldr: "`nameof(x)` gives you the name of a variable, property or method as a string, checked at compile time. If you rename it, the string updates too.",
      tags: ["fundamentals"],
      a: [
        { ul: [
          "Turned into a plain string **at compile time**, so it costs nothing at runtime.",
          "**Safe to rename**: rename the property and the string updates. A hard-coded `\"Name\"` would silently be wrong.",
          "Returns only the **last part**: `nameof(person.Address.City)` is `\"City\"`.",
          "Common uses: argument exceptions, `INotifyPropertyChanged`, logging, MVC action names."
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
      tldr: "They are ready-made delegates so you rarely need your own. Action returns nothing. Func returns a value (the last type is the return type). Predicate returns bool.",
      tags: ["delegates", "functional"],
      seeAlso: ["csharp-basic/delegate"],
      a: [
        { table: { head: ["Delegate", "Looks like", "Use"], rows: [
          ["`Action`", "`void ()`", "No input, no result"],
          ["`Action<T1..T16>`", "`void (T1..T16)`", "Takes inputs, returns nothing"],
          ["`Func<TResult>`", "`TResult ()`", "Returns a value"],
          ["`Func<T1..T16, TResult>`", "`TResult (T1..T16)`", "The **last** type is always the return type"],
          ["`Predicate<T>`", "`bool (T)`", "A yes/no test, same as `Func<T, bool>`"]
        ] } },
        { code: `Action<string> log = Console.WriteLine;
Func<int, int, int> add = (a, b) => a + b;
Predicate<Order> isLarge = o => o.Total > 1000;

// Pass behaviour into a method without an interface
public T Retry<T>(Func<T> operation, int attempts = 3)
{
    for (var i = 1; ; i++)
    {
        try { return operation(); }
        catch when (i < attempts) { Thread.Sleep(200 * i); }
    }
}

var data = Retry(() => _api.Fetch(id));`, lang: "csharp" },
        { note: "Only create your own delegate type when the name adds meaning, or when you need `ref`/`out` parameters. `Func` and `Action` cannot do those.", kind: "tip" }
      ]
    },

    {
      id: "gc-collect",
      q: "What is the purpose of GC.Collect method in C#?",
      tldr: "It forces the garbage collector to run right now. In real production code you should almost never call it.",
      tags: ["memory", "gc"],
      seeAlso: ["csharp-advanced/gc-collect-advanced", "csharp-basic/garbage-collection"],
      a: [
        { ul: [
          "`GC.Collect()` cleans all generations. `GC.Collect(0)` cleans only Gen 0.",
          "It usually **makes things slower**: it ignores the GC's own smart timing, pushes living objects into older generations too early, and pauses threads.",
          "It does **not** close files or connections. That is the job of `IDisposable`.",
          "People copy `GC.Collect(); GC.WaitForPendingFinalizers(); GC.Collect();` to also run finalizers. Needing this is usually a sign of a design problem.",
          "The only fair uses: **benchmarks or memory tests** that need a clean start, or right after releasing a really big, long-lived cache."
        ] },
        { note: "Good interview answer: \"It forces a collection, and I would not call it. If memory is a problem, I would fix the allocations or the disposal, not push the GC.\"", kind: "tip" }
      ]
    },

    {
      id: "readonly-keyword",
      q: "Explain the readonly keyword in C#.",
      tldr: "A readonly field can only be set where it is declared or in the constructor. After that it cannot point to something else, but the object it points to can still change.",
      tags: ["immutability"],
      seeAlso: ["csharp-intermediate/const-vs-readonly"],
      a: [
        { ul: [
          "**`readonly` field**: can be set only at the declaration or in a constructor.",
          "It locks the **reference**, not the object. You can still `Add` items to a `readonly List<T>`. You just cannot assign a new list.",
          "**`static readonly`** is the right choice for a constant that is calculated at runtime or might change in a future version.",
          "**`readonly struct`** (C# 7.2) makes the whole struct unchangeable, and helps the compiler avoid extra copies.",
          "**`readonly` members** on a struct (C# 8) promise that method will not change the struct.",
          "It is the standard way to store injected services in a class."
        ] },
        { code: `public class OrderService
{
    private readonly IRepository _repo;              // set once, in the constructor
    private readonly List<string> _log = new();      // the reference is fixed

    public OrderService(IRepository repo) => _repo = repo;

    public void Do()
    {
        _log.Add("x");        // allowed: changing the list's content
        // _log = new List<string>();   // not allowed: pointing to a new list
    }
}

public readonly struct Money
{
    public Money(decimal amount) => Amount = amount;
    public decimal Amount { get; }        // whole struct cannot change
}`, lang: "csharp" }
      ]
    },

    {
      id: "volatile-keyword",
      q: "What is volatile keyword in C#?",
      tldr: "`volatile` makes sure every thread always reads the latest value of a field, not an old cached copy. But it does not make operations like `++` thread-safe.",
      tags: ["threading", "memory-model"],
      a: [
        { ul: [
          "Without it, the compiler or CPU may keep a copy of a field in a register for speed. Then one thread may never see another thread's change.",
          "`volatile` stops that caching and stops reads/writes from being reordered around it.",
          "It does **not** make things atomic. `_counter++` on a volatile field is still unsafe, because it is really three steps: read, add, write.",
          "Only allowed on some types: reference types, `int`, `bool`, `char`, `float`, enums and similar small types. Not on `long`, `double` or structs.",
          "In real code, prefer `Interlocked`, `lock`, or `Volatile.Read`/`Volatile.Write`. They make the intent clearer."
        ] },
        { code: `private volatile bool _stopRequested;

// Thread A
public void Stop() => _stopRequested = true;

// Thread B: without volatile this loop might never stop
public void Work()
{
    while (!_stopRequested) { DoChunk(); }
}

// For counters, volatile is NOT enough:
private int _count;
Interlocked.Increment(ref _count);      // this is the right tool`, lang: "csharp" },
        { note: "To stop work in modern code, use a `CancellationToken`. The volatile bool flag is mostly a teaching example.", kind: "tip" }
      ]
    },

    {
      id: "in-keyword",
      q: "Explain the purpose of the in keyword in C#.",
      tldr: "`in` has three different jobs: a read-only parameter passed by reference, the \"in\" of foreach and LINQ, and marking a generic type as contravariant.",
      tags: ["parameters", "generics"],
      a: [
        { p: "**1. Read-only parameter by reference** (C# 7.2). Pass a big struct without copying it, and the method is not allowed to change it:" },
        { code: `public static double Distance(in Vector3 a, in Vector3 b)
{
    // a and b are not copied, and they are read-only here
    // a.X = 0;   // compile error
    return Math.Sqrt((a.X - b.X) * (a.X - b.X));
}`, lang: "csharp" },
        { p: "**2. The source of a loop**, in `foreach` and LINQ query syntax:" },
        { code: `foreach (var item in items) { }

var q = from o in orders where o.Total > 10 select o;`, lang: "csharp" },
        { p: "**3. Contravariance on a generic type**. `T` can only be used as input:" },
        { code: `public interface IComparer<in T> { int Compare(T x, T y); }`, lang: "csharp" },
        { table: { head: ["", "`in`", "`ref`", "`out`"], rows: [
          ["Passed by reference", "Yes", "Yes", "Yes"],
          ["Method can change it", "No", "Yes", "Must set it"],
          ["Caller must set it first", "Yes", "Yes", "No"]
        ] } },
        { note: "`in` only helps for **big structs**. For small ones it can even be slower, and the compiler may make hidden copies unless the struct is a `readonly struct`.", kind: "warn" }
      ]
    },

    {
      id: "const-vs-readonly",
      q: "What is the difference between const and readonly in C#?",
      tldr: "`const` is fixed when you build and gets copied into every place that uses it. `readonly` is set when the app runs, at declaration or in the constructor.",
      tags: ["immutability"],
      seeAlso: ["csharp-basic/readonly-vs-const", "csharp-intermediate/readonly-keyword"],
      a: [
        { table: { head: ["", "`const`", "`readonly`"], rows: [
          ["Value decided", "When you build", "When the app runs"],
          ["Where you can set it", "Only at the declaration", "Declaration or constructor"],
          ["Static?", "Always", "No (write `static readonly` if you want it)"],
          ["Allowed types", "Numbers, `string`, `enum`, `null`", "Any type"],
          ["Different per object?", "No", "Yes"],
          ["Usable in attributes / `case` labels", "Yes", "No"]
        ] } },
        { p: "The difference that causes real bugs is **versioning**. A `const` value is copied into every project that uses it:" },
        { code: `// Library A, v1
public class Config { public const int MaxRetries = 3; }

// App B is built against v1: the number 3 is copied into B

// Library A, v2
public class Config { public const int MaxRetries = 5; }

// Deploy only A. B still uses 3 until B is rebuilt.
// With "public static readonly int MaxRetries = 5;" B would get 5 right away.`, lang: "csharp" },
        { note: "Simple rule: use `const` only for values that never change, like `Pi` or `DaysInWeek`. Use `static readonly` for anything that feels like a setting.", kind: "tip" }
      ]
    },

    {
      id: "dynamic-type",
      q: "What is the dynamic type in C#?",
      tldr: "`dynamic` turns off type checking at compile time. The compiler trusts you, and the member is looked up only when the code runs.",
      tags: ["types", "dlr"],
      a: [
        { ul: [
          "Everything on a `dynamic` value is checked **at runtime**. A wrong method name compiles fine, then throws `RuntimeBinderException` when it runs.",
          "It is **not** `var`. `var` is still fully typed, the compiler just figures out the type. It is **not** `object` either. With `object` you must cast before calling anything.",
          "Real uses: COM / Office interop, dynamic JSON, `ExpandoObject`, and talking to dynamic languages like Python.",
          "It is slower and you lose IntelliSense and safe renaming."
        ] },
        { code: `dynamic d = "hello";
Console.WriteLine(d.Length);        // 5, checked at runtime
Console.WriteLine(d.Nonsense());    // compiles, but throws at runtime

var v = "hello";                    // v is a string, checked when you build
object o = "hello";
// o.Length;                        // compile error, you need a cast first

dynamic expando = new ExpandoObject();
expando.Anything = 42;              // add properties at runtime`, lang: "csharp" },
        { note: "Quick comparison for the follow-up: `var` = compiler figures out the type. `object` = base type, needs a cast. `dynamic` = no compile-time checks at all.", kind: "tip" }
      ]
    },

    {
      id: "params-keyword",
      q: "Explain the params keyword in C#.",
      tldr: "`params` lets a method take any number of arguments. You can pass them separated by commas, or pass an array.",
      tags: ["parameters"],
      a: [
        { ul: [
          "It must be the **last parameter**, and you can only have one.",
          "The caller can pass zero, one or many values, or an existing array.",
          "Each call creates a new array. In very hot code, add normal overloads for the common cases (that is what `string.Format` does).",
          "C# 13 allows `params` on `Span<T>`, `IEnumerable<T>` and other collections, which can avoid that array."
        ] },
        { code: `public static int Sum(params int[] numbers)
{
    var total = 0;
    foreach (var n in numbers) total += n;
    return total;
}

Sum();                       // 0 (empty array)
Sum(1, 2, 3);                // 6
Sum(new[] { 1, 2, 3 });      // 6 (array passed directly)

public void Log(string format, params object[] args) { }`, lang: "csharp" },
        { note: "A normal overload always wins over the `params` one. So `Sum(int a, int b)` is picked over `Sum(params int[])` when you pass two numbers. That is usually why a `params` method \"never gets called\".", kind: "warn" }
      ]
    },

    {
      id: "arraylist-vs-list",
      q: "What is the difference between ArrayList and List<T> in C#?",
      tldr: "ArrayList is the old list that stores everything as object, so it is not type-safe. List<T> is the generic, type-safe and faster version, and you should always use it.",
      tags: ["collections", "generics"],
      a: [
        { table: { head: ["", "`ArrayList`", "`List<T>`"], rows: [
          ["Namespace", "`System.Collections`", "`System.Collections.Generic`"],
          ["Type safety", "None, everything is `object`", "Checked when you build"],
          ["Value types (`int` etc.)", "**Boxed** when added, unboxed when read", "Stored directly"],
          ["Reading an item", "Needs a cast", "No cast"],
          ["Speed", "Slower (boxing + extra memory)", "Faster"],
          ["When to use", "Only in old code", "Always"]
        ] } },
        { code: `var old = new ArrayList();
old.Add(1);
old.Add("two");                   // compiles: no type safety
int x = (int)old[0];              // needs a cast (and unboxing)
// int y = (int)old[1];           // crashes at runtime: InvalidCastException

var list = new List<int>();
list.Add(1);
// list.Add("two");               // compile error, caught right away
int z = list[0];                  // no cast, no boxing`, lang: "csharp" },
        { note: "Same story for `Hashtable` vs `Dictionary<K,V>`, and the old `Queue`/`Stack` vs the generic ones. The generic version is always the answer.", kind: "tip" }
      ]
    },

    {
      id: "sealed-keyword",
      q: "What is the sealed keyword in C#?",
      tldr: "`sealed` on a class means no one can inherit from it. On an overridden method, it means child classes cannot override it again.",
      tags: ["oop"],
      seeAlso: ["csharp-basic/sealed-basic"],
      a: [
        { ul: [
          "`sealed class`: no class can inherit from it. `string` is sealed, and all structs are too.",
          "`sealed override`: the chain of overriding stops here.",
          "You cannot mark a class both `sealed` and `abstract`. No one could ever use it.",
          "**Design reason**: the class was not built to be extended, and a child class could break its rules or its security.",
          "**Speed reason**: .NET knows no child can override the method, so it can call it more directly and faster."
        ] },
        { code: `public sealed class ConnectionString
{
    // Important and security-sensitive: a child class could skip the validation
}

public class Repo         { public virtual void Save() { } }
public class SqlRepo : Repo { public sealed override void Save() { } }
// public class Fast : SqlRepo { public override void Save() { } }  // error`, lang: "csharp" },
        { note: "A common guideline: \"seal by default, open on purpose\". Unsealing later does not break anyone. Sealing later can break code that already inherits from it.", kind: "tip" }
      ]
    },

    {
      id: "obj-vs-bin",
      q: "What is the difference between obj and bin folder?",
      tldr: "`obj` is the build's working area with temporary files. `bin` has the final output that you actually run or deploy.",
      tags: ["tooling", "build"],
      a: [
        { p: "Think of a kitchen: `obj` is the **kitchen counter** with half-prepared ingredients. `bin` is the **plate that goes to the table**." },
        { table: { head: ["", "`obj/`", "`bin/`"], rows: [
          ["Contains", "Temporary build files: the compiled DLL for this project, `.pdb`, generated files, NuGet info (`project.assets.json`)", "Final output: your DLL/EXE plus all the DLLs it needs, and config files"],
          ["Purpose", "Working area for the build, makes the next build faster", "What you run, debug or deploy"],
          ["Comes from", "The compiler", "Copied from `obj`, then dependencies are added"],
          ["Safe to delete?", "Yes, the next build recreates it", "Yes, the next build recreates it"],
          ["In Git?", "No, ignored", "No, ignored"]
        ] } },
        { ul: [
          "Build order: compile into `obj/<Configuration>/<Framework>/`, then copy to `bin/<Configuration>/<Framework>/` along with referenced DLLs.",
          "`obj` makes the second build fast: MSBuild sees what did not change and skips it.",
          "**Clean** deletes both. It is the standard fix for a strange or broken build.",
          "Both should be in `.gitignore`. The standard Visual Studio template already does that."
        ] },
        { note: "Common follow-up: \"why does my build still fail after I fixed the code?\" Answer: an old `obj` folder. Delete `bin` and `obj`, then rebuild.", kind: "tip" }
      ]
    }

  ]
});
