/* C# — Basic. 32 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "csharp-basic",
  topic: "C#",
  level: "Basic",
  short: "C# Basic",
  accent: "violet",
  desc: "Language fundamentals: types, OOP, members, error handling and the everyday syntax you are expected to explain without hesitation.",
  questions: [

    {
      id: "what-is-csharp",
      q: "What is C# and what are its main features?",
      tldr: "C# is a statically typed, object-oriented, managed language from Microsoft that compiles to IL and runs on the .NET runtime.",
      tags: ["fundamentals"],
      a: [
        { p: "C# is a **general-purpose, strongly typed** language designed by Microsoft. Source compiles to **IL (Intermediate Language)**, which the CLR JIT-compiles to native code at runtime. That managed execution is what gives you garbage collection, type safety and exceptions for free." },
        { ul: [
          "**Object-oriented** — classes, inheritance, interfaces, polymorphism, encapsulation.",
          "**Type-safe and statically typed** — most errors surface at compile time; `var` is inferred, not dynamic.",
          "**Automatic memory management** via the garbage collector, so no manual `free`.",
          "**Rich language features** — generics, LINQ, `async`/`await`, delegates and events, pattern matching, records, nullable reference types.",
          "**Cross-platform** on modern .NET — Windows, Linux, macOS, mobile and WebAssembly.",
          "**Huge BCL** plus NuGet for everything else."
        ] },
        { note: "If asked 'why C# over Java', the honest short answer is: LINQ, properties, real generics (no type erasure), `async`/`await` built into the language, and value types you can define yourself.", kind: "tip" }
      ]
    },

    {
      id: "access-modifiers",
      q: "Explain the difference between public, private, protected, and internal access modifiers.",
      tldr: "They control who can see a member: public everywhere, private only inside the type, protected the type plus derived types, internal anywhere in the same assembly.",
      tags: ["oop", "encapsulation"],
      a: [
        { table: { head: ["Modifier", "Visible from"], rows: [
          ["`public`", "Anywhere, including other assemblies."],
          ["`private`", "Only inside the declaring type. Default for class members."],
          ["`protected`", "The declaring type and any derived type, even in another assembly."],
          ["`internal`", "Anywhere in the same assembly. Default for top-level types."],
          ["`protected internal`", "Same assembly **OR** any derived type — the union, so it is wider than either."],
          ["`private protected`", "Derived types **AND** only within the same assembly — the intersection, so it is narrower."]
        ] } },
        { code: `public class Account
{
    private decimal _balance;            // only this class
    protected string AccountNumber;      // this class and subclasses
    internal DateTime OpenedOn;          // anywhere in this assembly
    public decimal Balance => _balance;  // everyone
}`, lang: "csharp" },
        { note: "Defaults are a favourite trick question: a class member with no modifier is `private`; a top-level type with no modifier is `internal`.", kind: "warn" }
      ]
    },

    {
      id: "namespace",
      q: "What is a namespace in C# and why is it important?",
      tldr: "A namespace is a logical container that groups related types and gives them a unique fully-qualified name, preventing naming collisions.",
      tags: ["organisation"],
      a: [
        { p: "A namespace organises types into a hierarchy. `System.Collections.Generic.List<T>` is the fully-qualified name; the namespace is everything before the type name." },
        { ul: [
          "**Avoids name clashes** — your `Timer` and `System.Threading.Timer` can coexist.",
          "**Organises large codebases** into meaningful areas, usually mirroring folder structure.",
          "**Controls what you pull in** with `using` directives at the top of a file.",
          "It is purely a **compile-time/naming construct** — it does not affect performance or memory."
        ] },
        { code: `namespace Shop.Billing;   // file-scoped namespace (C# 10+)

using System.Collections.Generic;
using Timer = System.Threading.Timer;   // alias resolves an ambiguity

public class Invoice { }`, lang: "csharp" },
        { note: "An assembly and a namespace are not the same thing: one assembly can contain many namespaces, and one namespace can be spread across many assemblies.", kind: "tip" }
      ]
    },

    {
      id: "class-vs-object",
      q: "What is the difference between a class and an object in C#?",
      tldr: "A class is the blueprint — the type definition; an object is a concrete instance of that blueprint living in memory.",
      tags: ["oop"],
      a: [
        { ul: [
          "A **class** describes state (fields, properties) and behaviour (methods, events). It exists once, at compile time.",
          "An **object** is what `new` produces at runtime — its own copy of the instance data, allocated on the heap.",
          "You can create many objects from one class; each has independent field values but shares the same method code.",
          "`static` members belong to the class itself, so they are shared and exist without any object."
        ] },
        { code: `public class Car          // the class: one definition
{
    public string Model { get; set; }
}

var a = new Car { Model = "Civic" };   // object 1
var b = new Car { Model = "Swift" };   // object 2 — separate state`, lang: "csharp" }
      ]
    },

    {
      id: "inheritance",
      q: "Explain the concept of inheritance in C#.",
      tldr: "Inheritance lets a class reuse and extend another class's members, modelling an \"is-a\" relationship; C# allows single class inheritance but multiple interface implementation.",
      tags: ["oop"],
      a: [
        { ul: [
          "The derived class gets all accessible members of the base class and can add its own.",
          "C# has **single inheritance** for classes — no diamond problem — but a class can implement **many interfaces**.",
          "Use `virtual` in the base and `override` in the derived class to change behaviour polymorphically.",
          "`base` calls back into the base implementation; `sealed` stops further inheritance or overriding.",
          "Constructors are **not** inherited — the derived constructor always runs a base constructor, implicitly the parameterless one."
        ] },
        { code: `public class Animal
{
    public virtual string Speak() => "...";
}

public class Dog : Animal
{
    public override string Speak() => "Woof";
}

Animal a = new Dog();
a.Speak();   // "Woof" — resolved at runtime`, lang: "csharp" },
        { note: "Interviewers often follow up with 'inheritance vs composition'. The safe answer: prefer composition, because inheritance couples you to the base class's implementation and is hard to change later.", kind: "tip" }
      ]
    },

    {
      id: "interface-vs-abstract-class",
      q: "What is an interface and how is it different from an abstract class?",
      tldr: "An interface is a pure contract a type can implement any number of, while an abstract class is a partial base implementation you can only inherit once.",
      tags: ["oop", "design"],
      a: [
        { table: { head: ["", "Interface", "Abstract class"], rows: [
          ["Multiple", "A class can implement many", "Only one base class"],
          ["State", "No instance fields", "Fields, constructors, state"],
          ["Members", "Public by default; may have default implementations (C# 8+)", "Any accessibility, abstract and concrete members"],
          ["Purpose", "\"Can do\" — a capability contract", "\"Is a\" — shared base with shared code"],
          ["Constructors", "Not allowed", "Allowed (called by derived types)"]
        ] } },
        { code: `public interface IPayable
{
    decimal CalculatePay();
    string Describe() => "Payable";   // default implementation, C# 8+
}

public abstract class Employee
{
    protected Employee(string name) => Name = name;   // shared construction
    public string Name { get; }
    public abstract decimal CalculatePay();           // must be overridden
    public void Print() => Console.WriteLine(Name);   // shared behaviour
}`, lang: "csharp" },
        { p: "Rule of thumb: reach for an **interface** when unrelated types need the same capability, and an **abstract class** when related types need to share real code and state." }
      ]
    },

    {
      id: "value-vs-reference-types",
      q: "What are value types and reference types in C#?",
      tldr: "Value types hold their data directly and copy on assignment; reference types hold a reference to data on the heap, so assignment copies the reference.",
      tags: ["memory", "fundamentals"],
      seeAlso: ["csharp-advanced/memory-management"],
      a: [
        { ul: [
          "**Value types** — `int`, `double`, `bool`, `char`, `decimal`, all `struct`s and `enum`s. Derive from `System.ValueType`. Stored inline: on the stack as a local, or inside the containing object on the heap.",
          "**Reference types** — `class`, `interface`, `delegate`, `string`, arrays. The variable holds a pointer; the object lives on the heap and is garbage collected.",
          "Assigning a value type copies the **data**; assigning a reference type copies the **reference**, so both variables see the same object.",
          "Default value: value types get zero/`false`/`default`, reference types get `null`.",
          "**Boxing** wraps a value type in an object on the heap; **unboxing** extracts it. Both cost an allocation and a cast."
        ] },
        { code: `struct Point { public int X; }
class Box   { public int X; }

var p1 = new Point { X = 1 };
var p2 = p1;  p2.X = 99;    // p1.X is still 1 — copied

var b1 = new Box { X = 1 };
var b2 = b1;  b2.X = 99;    // b1.X is now 99 — same object

object boxed = 42;          // boxing: allocation on the heap
int back = (int)boxed;      // unboxing`, lang: "csharp" },
        { note: "\"Value types live on the stack\" is the classic oversimplification. A value type that is a field of a class lives on the heap inside that object. What is actually true is that value types are stored **inline, wherever they are declared**.", kind: "warn" }
      ]
    },

    {
      id: "using-statement",
      q: "What is the purpose of the using statement in C#?",
      tldr: "`using` has two jobs: as a directive it imports a namespace, and as a statement it guarantees Dispose() is called on an IDisposable even if an exception is thrown.",
      tags: ["resources", "idisposable"],
      seeAlso: ["csharp-intermediate/using-idisposable"],
      a: [
        { ul: [
          "**Directive** — `using System.Text;` at the top of a file so you can write `StringBuilder` instead of the full name.",
          "**Statement** — scopes an `IDisposable` and calls `Dispose()` in a compiler-generated `finally`, so unmanaged resources are released even on an exception.",
          "**Declaration** (C# 8+) — `using var x = ...;` disposes at the end of the enclosing scope, with less nesting.",
          "**Alias** — `using Json = System.Text.Json.JsonSerializer;`."
        ] },
        { code: `using (var conn = new SqlConnection(cs))
{
    conn.Open();
    // ... work ...
}   // conn.Dispose() runs here, even if the body throws

using var file = File.OpenRead(path);   // disposed at end of method`, lang: "csharp" },
        { note: "It compiles to `try { ... } finally { if (x != null) x.Dispose(); }` — saying that sentence in an interview usually ends the follow-up questions.", kind: "tip" }
      ]
    },

    {
      id: "arrays",
      q: "How do you declare and initialize an array in C#?",
      tldr: "Arrays are fixed-size reference types declared with `type[]`, created with `new`, indexed from zero and sized via `Length`.",
      tags: ["collections"],
      a: [
        { code: `int[] a = new int[5];                 // 5 elements, all 0
int[] b = new int[] { 1, 2, 3 };
int[] c = { 1, 2, 3 };                // shorthand at declaration
int[] d = [1, 2, 3];                  // collection expression, C# 12+

int[,]  grid   = new int[3, 4];       // rectangular (multi-dimensional)
int[][] jagged = new int[3][];        // jagged: array of arrays
jagged[0] = new int[5];

int len = c.Length;                   // 3
Array.Sort(c);
int idx = Array.IndexOf(c, 2);`, lang: "csharp" },
        { ul: [
          "Arrays are **reference types** even when the elements are value types.",
          "The size is fixed at creation — use `List<T>` when you need to grow.",
          "Indices are zero-based; an out-of-range index throws `IndexOutOfRangeException`.",
          "`int[,]` is a single rectangular block; `int[][]` is an array of independent row arrays that can each have a different length."
        ] }
      ]
    },

    {
      id: "method-overloading",
      q: "Explain the concept of method overloading.",
      tldr: "Overloading is defining several methods with the same name in one type, distinguished by their parameter list; the compiler picks one at compile time.",
      tags: ["oop", "polymorphism"],
      a: [
        { ul: [
          "Signatures must differ in **number, type or order** of parameters.",
          "**Return type alone is not enough** — that will not compile.",
          "It is **compile-time (static) polymorphism**: resolved by the compiler from the argument types.",
          "`ref`, `out` and `in` do count as part of the signature; `params` and default values do not create a new overload but do affect resolution."
        ] },
        { code: `public class Calc
{
    public int Add(int a, int b) => a + b;
    public double Add(double a, double b) => a + b;    // different types
    public int Add(int a, int b, int c) => a + b + c;  // different count
    // public double Add(int a, int b)  <-- will not compile: return type only
}`, lang: "csharp" },
        { note: "Overloading (same name, different parameters, compile time) versus overriding (same signature, `virtual`/`override`, runtime) is one of the most common pairs asked back-to-back.", kind: "tip" }
      ]
    },

    {
      id: "constructor",
      q: "What is a constructor and how is it used in C#?",
      tldr: "A constructor is a special method with the type's name and no return type that runs when an instance is created, to put the object into a valid initial state.",
      tags: ["oop"],
      a: [
        { ul: [
          "**Instance constructor** — runs on `new`. If you declare none, the compiler supplies a parameterless one.",
          "**Static constructor** — parameterless, no modifier, runs once before the type's first use.",
          "**Constructor chaining** — `: this(...)` calls another constructor in the same class, `: base(...)` calls the base class.",
          "**Private constructor** blocks external instantiation (singletons, static helper classes).",
          "**Primary constructors** (C# 12) let you put parameters on the class declaration itself."
        ] },
        { code: `public class Order
{
    public Order() : this(0) { }              // chains to the one below

    public Order(decimal total)
    {
        Total = total;
        CreatedOn = DateTime.UtcNow;
    }

    static Order() { /* runs once, before first use */ }

    public decimal Total { get; }
    public DateTime CreatedOn { get; }
}`, lang: "csharp" },
        { note: "As soon as you declare any constructor, the implicit parameterless one disappears — a very common cause of \"no argument given that corresponds to...\" errors.", kind: "warn" }
      ]
    },

    {
      id: "equality-operators",
      q: "What is the difference between == and Equals() in C#?",
      tldr: "`==` is a static operator resolved at compile time and can be overloaded; `Equals()` is a virtual method resolved at runtime and is what collections use.",
      tags: ["equality"],
      a: [
        { ul: [
          "For **value types**, both compare the contained values.",
          "For **reference types**, `==` defaults to reference identity unless the type overloads it; `Equals()` defaults to reference identity unless the type overrides it.",
          "`string` does both — it overloads `==` and overrides `Equals()` to compare **contents**.",
          "`==` binds to the **static type** of the variables, so it can silently do the wrong thing through an `object` reference; `Equals()` is virtual and dispatches on the **runtime type**.",
          "`object.ReferenceEquals(a, b)` always compares identity, whatever the type does."
        ] },
        { code: `string a = "hello";
string b = "hel" + "lo";
object oa = a, ob = b;

a  == b;              // true  — string overloads == to compare contents
a.Equals(b);          // true
oa == ob;             // reference comparison: may be false
oa.Equals(ob);        // true  — virtual, calls string.Equals`, lang: "csharp" },
        { note: "If you override `Equals()`, always override `GetHashCode()` too, otherwise the type breaks inside `Dictionary` and `HashSet`.", kind: "warn" }
      ]
    },

    {
      id: "static-keyword",
      q: "Explain the purpose of the static keyword.",
      tldr: "`static` binds a member to the type rather than to any instance, so it is shared by all instances and accessed through the type name.",
      tags: ["fundamentals"],
      a: [
        { ul: [
          "**Static field** — one copy shared by every instance, initialised once.",
          "**Static method** — called on the type; cannot use `this` or touch instance members directly.",
          "**Static class** — cannot be instantiated or inherited, and can only contain static members (e.g. `Math`, `Console`).",
          "**Static constructor** — runs once, automatically, before the first access to the type.",
          "**Static local function / `static` lambda** (C# 8/9) — cannot capture surrounding state, which prevents accidental closures and allocations."
        ] },
        { code: `public static class Config
{
    private static int _reads;
    public static string Environment { get; } = "Production";

    public static string Read(string key)
    {
        _reads++;              // shared across all callers
        return "...";
    }
}`, lang: "csharp" },
        { note: "Mutable static state is shared across every thread in the process — the usual source of hard-to-reproduce concurrency bugs. Keep statics immutable or synchronised.", kind: "warn" }
      ]
    },

    {
      id: "delegate",
      q: "What is a delegate in C#?",
      tldr: "A delegate is a type-safe function pointer: a type that holds a reference to one or more methods with a matching signature, so methods can be passed around as values.",
      tags: ["delegates", "functional"],
      seeAlso: ["csharp-intermediate/delegates-and-events", "csharp-intermediate/func-and-action"],
      a: [
        { ul: [
          "Declaring a delegate defines a **type** whose instances point at methods with the same signature and return type.",
          "It is **multicast** — `+=` chains handlers, `-=` removes them, and invoking runs them in order.",
          "Delegates underpin **events**, **callbacks** and **LINQ**.",
          "In practice you rarely declare your own: use the built-in `Action<...>` (returns void) and `Func<...,TResult>` (returns a value)."
        ] },
        { code: `public delegate int Transform(int x);

Transform square = x => x * x;
Transform twice  = x => x * 2;

Transform chain = square;
chain += twice;             // multicast
int result = chain(3);      // runs both, returns the LAST result: 6

// Idiomatic modern equivalent
Func<int, int> f = x => x * x;
Action<string> log = Console.WriteLine;`, lang: "csharp" },
        { note: "For a multicast delegate with a return value, only the **last** invocation's result is returned. That is why `Action` is the norm for multicast and events.", kind: "warn" }
      ]
    },

    {
      id: "exception-handling",
      q: "How does exception handling work in C#?",
      tldr: "`try` guards a block, `catch` handles specific exception types most-derived-first, and `finally` always runs for cleanup.",
      tags: ["errors"],
      seeAlso: ["csharp-advanced/exception-best-practices"],
      a: [
        { ul: [
          "All exceptions derive from `System.Exception`. Catch the **most specific type first** — a `catch (Exception)` before a specific one will not compile.",
          "`finally` runs whether or not an exception was thrown, and is where cleanup belongs (a `using` block is the sugar for that).",
          "`throw;` **rethrows and preserves the original stack trace**; `throw ex;` resets it.",
          "**Exception filters** — `catch (SqlException ex) when (ex.Number == 1205)` — let you inspect before deciding to handle, without unwinding the stack.",
          "Only catch what you can actually do something about; let everything else bubble up."
        ] },
        { code: `try
{
    var text = File.ReadAllText(path);
    Process(text);
}
catch (FileNotFoundException ex)
{
    _logger.LogWarning(ex, "Missing file {Path}", path);
}
catch (IOException ex) when (ex.HResult == -2147024864)   // filter
{
    throw new InvalidOperationException("File is locked", ex);
}
finally
{
    _stopwatch.Stop();     // always runs
}`, lang: "csharp" }
      ]
    },

    {
      id: "properties",
      q: "What are properties in C# and how do they work?",
      tldr: "A property is a member that looks like a field but compiles to get/set accessor methods, giving you encapsulation with field-like syntax.",
      tags: ["oop", "encapsulation"],
      a: [
        { ul: [
          "**Auto-implemented** — `public string Name { get; set; }` — the compiler generates a hidden backing field.",
          "**Full property** — write the accessors yourself when you need validation, lazy loading or change notification.",
          "**Read-only** — `{ get; }` can only be assigned in the constructor or an initialiser. `{ get; init; }` (C# 9) also allows object-initialiser syntax.",
          "**Asymmetric accessibility** — `public string Name { get; private set; }`.",
          "**Expression-bodied** — `public string Full => First + \" \" + Last;` is a computed, get-only property.",
          "Properties are methods under the hood, so they can be `virtual`, appear on interfaces, and be intercepted — a field can do none of that. This is why public fields are avoided in public APIs."
        ] },
        { code: `public class Person
{
    private string _email = "";

    public string Name { get; set; } = "";          // auto
    public DateTime CreatedOn { get; init; }        // set only at construction
    public string Display => $"{Name} <{_email}>";  // computed

    public string Email                              // full property
    {
        get => _email;
        set => _email = value?.Trim().ToLowerInvariant()
                        ?? throw new ArgumentNullException(nameof(value));
    }
}`, lang: "csharp" }
      ]
    },

    {
      id: "readonly-vs-const",
      q: "What is the difference between readonly and const in C#?",
      tldr: "`const` is a compile-time constant baked into the callers' IL; `readonly` is a runtime constant that can be assigned in a constructor.",
      tags: ["fundamentals", "immutability"],
      seeAlso: ["csharp-intermediate/const-vs-readonly"],
      a: [
        { table: { head: ["", "`const`", "`readonly`"] , rows: [
          ["Evaluated", "Compile time", "Runtime"],
          ["Assigned", "At declaration only", "Declaration or constructor"],
          ["Implicitly", "`static`", "Instance (can be `static readonly`)"],
          ["Types allowed", "Primitives, `string`, `enum`, `null`", "Any type"],
          ["Per-instance values", "No", "Yes — each instance can differ"]
        ] } },
        { code: `public class Circle
{
    public const double Pi = 3.14159;          // fixed forever, compile time
    public static readonly DateTime Started = DateTime.UtcNow;   // runtime
    public readonly int Radius;                 // per instance

    public Circle(int radius) => Radius = radius;   // legal for readonly
}`, lang: "csharp" },
        { note: "The versioning trap: a `const` in library A is **copied into** the compiled code of consumer B. Change it and ship only A, and B keeps the old value until it is recompiled. `static readonly` does not have this problem — prefer it for anything that might change.", kind: "warn" }
      ]
    },

    {
      id: "polymorphism",
      q: "Explain the concept of polymorphism in C#.",
      tldr: "Polymorphism lets one reference to a base type behave differently depending on the actual object it points to.",
      tags: ["oop"],
      a: [
        { ul: [
          "**Compile-time (static)** polymorphism — method overloading and operator overloading; the compiler picks the target.",
          "**Runtime (dynamic)** polymorphism — `virtual`/`override` and interface implementations; the CLR picks the target from the object's real type.",
          "It is what lets you write code against `IRepository` or `Shape` and stay ignorant of the concrete type.",
          "`new` **hides** a base member instead of overriding it — the call then depends on the *variable's* type, not the object's. Almost always a bug."
        ] },
        { code: `public class Shape        { public virtual double Area() => 0; }
public class Circle : Shape { public override double Area() => Math.PI * 4; }
public class Square : Shape { public override double Area() => 16; }

var shapes = new List<Shape> { new Circle(), new Square() };
foreach (var s in shapes)
    Console.WriteLine(s.Area());   // each runs its own override`, lang: "csharp" },
        { code: `public class Base    { public virtual void Go() => Console.WriteLine("Base"); }
public class Hides : Base { public new void Go() => Console.WriteLine("Hides"); }

Base b = new Hides();
b.Go();   // "Base"  <-- hiding, not overriding`, lang: "csharp", caption: "The new keyword hides rather than overrides" }
      ]
    },

    {
      id: "collections",
      q: "What is a collection in C#? Give examples.",
      tldr: "A collection is a class for holding groups of objects with a richer API than arrays — most of them live in System.Collections.Generic and are strongly typed.",
      tags: ["collections"],
      a: [
        { table: { head: ["Collection", "Use it for", "Lookup"], rows: [
          ["`List<T>`", "Ordered, resizable list — the default choice", "O(n) by value, O(1) by index"],
          ["`Dictionary<K,V>`", "Key/value lookup", "O(1) average"],
          ["`HashSet<T>`", "Unique items, set operations", "O(1) average"],
          ["`Queue<T>`", "FIFO processing", "O(1) enqueue/dequeue"],
          ["`Stack<T>`", "LIFO processing", "O(1) push/pop"],
          ["`SortedDictionary<K,V>` / `SortedList<K,V>`", "Kept in key order", "O(log n)"],
          ["`LinkedList<T>`", "Frequent inserts/removals in the middle", "O(n) to find"],
          ["`ConcurrentDictionary<K,V>`", "Thread-safe key/value access", "O(1) average"]
        ] } },
        { code: `var names  = new List<string> { "Ann", "Bob" };
var ages   = new Dictionary<string, int> { ["Ann"] = 30 };
var unique = new HashSet<int> { 1, 2, 2 };     // Count == 2

if (ages.TryGetValue("Ann", out var age)) { /* no exception if missing */ }`, lang: "csharp" },
        { ul: [
          "Prefer the **generic** collections in `System.Collections.Generic` — the old `ArrayList`/`Hashtable` box value types and are not type-safe.",
          "Expose the narrowest useful interface from your APIs: `IEnumerable<T>` to iterate, `IReadOnlyList<T>` to index, `ICollection<T>` to modify."
        ] }
      ]
    },

    {
      id: "linq-intro",
      q: "What is LINQ and why is it useful?",
      tldr: "LINQ is a set of language features and standard operators that let you query collections, databases and XML with the same strongly typed syntax.",
      tags: ["linq"],
      seeAlso: ["linq/what-is-linq", "linq/ienumerable-vs-iqueryable"],
      a: [
        { ul: [
          "One query language over many sources: **LINQ to Objects**, **LINQ to Entities** (EF), **LINQ to XML**.",
          "**Compile-time checked and IntelliSense-friendly**, unlike hand-written SQL strings.",
          "Operators are extension methods on `IEnumerable<T>` / `IQueryable<T>`: `Where`, `Select`, `OrderBy`, `GroupBy`, `Join`, `Any`, `First`, `Sum`.",
          "Two syntaxes — **query syntax** and **method syntax** — that compile to exactly the same thing.",
          "Most operators are **deferred**: nothing executes until you enumerate."
        ] },
        { code: `var orders = new List<Order>();

// method syntax
var recent = orders.Where(o => o.Total > 100)
                   .OrderByDescending(o => o.CreatedOn)
                   .Select(o => new { o.Id, o.Total })
                   .ToList();

// query syntax — identical result
var recent2 = (from o in orders
               where o.Total > 100
               orderby o.CreatedOn descending
               select new { o.Id, o.Total }).ToList();`, lang: "csharp" }
      ]
    },

    {
      id: "sealed-basic",
      q: "Explain the purpose of the sealed keyword.",
      tldr: "`sealed` stops inheritance: on a class nothing can derive from it, and on an overridden member nothing further down can override it again.",
      tags: ["oop"],
      seeAlso: ["csharp-intermediate/sealed-keyword"],
      a: [
        { ul: [
          "`sealed class` — the class cannot be used as a base class.",
          "`sealed override` — the member can no longer be overridden by classes further down the chain.",
          "Reasons to seal: protect an invariant, keep a security-sensitive type from being subverted, or express that the design was never meant to be extended.",
          "The JIT can devirtualise calls on sealed types, so there is a small performance benefit as well.",
          "`string` is the best-known sealed class in the BCL."
        ] },
        { code: `public sealed class AuditLog { }          // nothing may inherit

public class Base { public virtual void Run() { } }
public class Mid : Base { public sealed override void Run() { } }
// public class Leaf : Mid { public override void Run() { } }  <-- will not compile`, lang: "csharp" }
      ]
    },

    {
      id: "out-keyword",
      q: "What is the out keyword used for in C#?",
      tldr: "`out` passes an argument by reference for output only — the method must assign it before returning, and the caller does not need to initialise it.",
      tags: ["parameters"],
      a: [
        { ul: [
          "The caller need not initialise the variable; the **method is required to assign** it on every path.",
          "It lets a method return more than one value — the classic `TryParse` pattern.",
          "**Out variables** can be declared inline since C# 7: `int.TryParse(s, out int n)`.",
          "`out _` discards a value you do not care about."
        ] },
        { table: { head: ["", "`ref`", "`out`", "`in`"], rows: [
          ["Caller must initialise", "Yes", "No", "Yes"],
          ["Method must assign", "No", "Yes", "No — it is read-only"],
          ["Direction", "In and out", "Out only", "In only, passed by reference"]
        ] } },
        { code: `if (int.TryParse(input, out int value))
    Console.WriteLine(value * 2);
else
    Console.WriteLine("Not a number");

dictionary.TryGetValue(key, out _);   // discard the result`, lang: "csharp" },
        { note: "`out`/`ref` parameters are not allowed on `async` methods or iterators, because the stack frame does not survive the suspension.", kind: "warn" }
      ]
    },

    {
      id: "garbage-collection",
      q: "How does garbage collection work in C#?",
      tldr: "The GC automatically reclaims managed heap memory that is no longer reachable from any root, using a generational mark-and-sweep-and-compact algorithm.",
      tags: ["memory", "gc"],
      seeAlso: ["csharp-advanced/memory-management"],
      a: [
        { ul: [
          "**Roots** are static fields, locals on the stack, CPU registers and GC handles. Anything not reachable from a root is garbage.",
          "**Mark** reachable objects, **sweep** the rest, then **compact** the heap so allocation stays a cheap pointer bump.",
          "**Generational**: new objects start in **Gen 0**, survivors are promoted to **Gen 1** then **Gen 2**. Gen 0 collections are frequent and cheap; Gen 2 collections are rare and expensive.",
          "The **Large Object Heap (LOH)** holds objects over 85,000 bytes; it is collected with Gen 2 and is not compacted by default.",
          "**Finalizers** (`~MyClass`) run non-deterministically and cost an extra collection cycle. Use `IDisposable` for deterministic cleanup instead."
        ] },
        { note: "The GC only manages **memory**. File handles, sockets and database connections are unmanaged resources — they need `IDisposable` and a `using` block. That distinction is the point of the question.", kind: "tip" }
      ]
    },

    {
      id: "string-vs-string-alias",
      q: "What is the difference between String and string in C#?",
      tldr: "There is no difference — `string` is a C# language alias for the .NET type `System.String`, and they compile to identical IL.",
      tags: ["strings", "fundamentals"],
      a: [
        { p: "`string` is a **keyword alias**, exactly like `int` for `System.Int32` and `bool` for `System.Boolean`. `string` works without a `using System;` directive because it is a language keyword, whereas `String` needs the namespace imported." },
        { code: `string a = "hello";
String b = "hello";
System.String c = "hello";
// all three are System.String

// Convention: alias for variables, framework name for static members
string name = string.Empty;
bool ok = string.IsNullOrWhiteSpace(name);`, lang: "csharp" },
        { note: "The usual follow-up is about strings being **immutable** and **reference types**: every modification allocates a new string, which is why `StringBuilder` exists for loops that concatenate.", kind: "tip" }
      ]
    },

    {
      id: "indexers",
      q: "What are indexers in C#?",
      tldr: "An indexer lets instances of a class be accessed with array-style bracket syntax by defining a `this[...]` property.",
      tags: ["oop"],
      a: [
        { ul: [
          "Declared as `public T this[TIndex index] { get; set; }` — a property whose name is `this`.",
          "The index can be **any type**, not just `int`, and you can **overload** indexers by index type.",
          "Multiple parameters are allowed: `this[int row, int col]`.",
          "This is how `List<T>[0]` and `Dictionary<K,V>[key]` work."
        ] },
        { code: `public class Settings
{
    private readonly Dictionary<string, string> _values = new();

    public string this[string key]
    {
        get => _values.TryGetValue(key, out var v) ? v : "";
        set => _values[key] = value;
    }
}

var s = new Settings();
s["theme"] = "dark";
Console.WriteLine(s["theme"]);`, lang: "csharp" }
      ]
    },

    {
      id: "async-await",
      q: "Explain the purpose of the async and await keywords.",
      tldr: "They let you write asynchronous, non-blocking code in a sequential style — `await` releases the thread while the operation is in flight and resumes afterwards.",
      tags: ["async"],
      seeAlso: ["csharp-intermediate/async-await-purpose", "csharp-intermediate/task-vs-thread"],
      a: [
        { ul: [
          "`async` marks a method whose body may contain `await`; the compiler rewrites it into a **state machine**.",
          "`await` on an incomplete task **returns the thread to the pool** and schedules the rest of the method as a continuation. It does not create a thread.",
          "Return `Task` (no result), `Task<T>` (a result), or `ValueTask<T>` on hot paths. `async void` is only for event handlers — its exceptions cannot be caught.",
          "The win is **scalability**: a web server can serve far more concurrent requests because threads are not parked on I/O."
        ] },
        { code: `public async Task<string> GetUserNameAsync(int id)
{
    using var http = new HttpClient();
    var json = await http.GetStringAsync($"/api/users/{id}");   // thread released
    var user = JsonSerializer.Deserialize<User>(json);
    return user.Name;                                            // resumes here
}`, lang: "csharp" },
        { note: "Calling `.Result` or `.Wait()` on a task instead of awaiting it can **deadlock** in ASP.NET (classic) and WinForms/WPF, because the continuation needs the context the blocked thread is holding. Async all the way up.", kind: "warn" }
      ]
    },

    {
      id: "null-coalescing",
      q: "What is a null coalescing operator (??) in C#?",
      tldr: "`??` returns its left operand unless it is null, in which case it returns the right one — a compact fallback for null values.",
      tags: ["null-safety", "operators"],
      a: [
        { ul: [
          "`a ?? b` evaluates to `a` when `a` is not null, otherwise to `b`. The right side is only evaluated if needed.",
          "`??=` (C# 8) is the **null-coalescing assignment**: assign only if the target is currently null.",
          "It works on nullable value types and reference types, and chains left to right.",
          "Handy for throwing on a null argument in one line."
        ] },
        { code: `string name = input ?? "Anonymous";

int? maybe = null;
int value = maybe ?? 0;              // 0

_cache ??= BuildCache();             // assign only if null

public Service(ILogger logger)
    => _logger = logger ?? throw new ArgumentNullException(nameof(logger));`, lang: "csharp" }
      ]
    },

    {
      id: "null-conditional",
      q: "What is null conditional operator (?. and ?[]) in C#?",
      tldr: "`?.` and `?[]` short-circuit to null instead of throwing when the thing on the left is null, so you can navigate a chain safely.",
      tags: ["null-safety", "operators"],
      a: [
        { ul: [
          "`a?.B` returns `null` if `a` is null; otherwise it evaluates `a.B`. `a?[0]` does the same for indexers.",
          "The **whole chain short-circuits** — as soon as one link is null, the rest is skipped.",
          "The result is always nullable, so a value-type member comes back as `int?` and usually pairs with `??`.",
          "`?.Invoke(...)` is the standard thread-safe way to raise an event.",
          "It is not a substitute for validating input — silently swallowing nulls can hide real bugs."
        ] },
        { code: `int? len = customer?.Address?.City?.Length;   // null if any link is null
int  safe = customer?.Orders?.Count ?? 0;

var first = list?[0];

PropertyChanged?.Invoke(this, args);          // no race, no null check needed`, lang: "csharp" }
      ]
    },

    {
      id: "custom-exception",
      q: "How do you create a custom exception in C#?",
      tldr: "Derive from `Exception`, suffix the name with \"Exception\", and supply the three standard constructors — especially the one taking an inner exception.",
      tags: ["errors"],
      a: [
        { ol: [
          "Inherit from `System.Exception` (not `ApplicationException`, which is obsolete guidance).",
          "Name it `SomethingException`.",
          "Provide the parameterless, message, and message + inner-exception constructors.",
          "Add domain-specific properties if callers need to react programmatically."
        ] },
        { code: `public class InsufficientFundsException : Exception
{
    public InsufficientFundsException() { }

    public InsufficientFundsException(string message)
        : base(message) { }

    public InsufficientFundsException(string message, Exception inner)
        : base(message, inner) { }

    public decimal Shortfall { get; init; }
}

throw new InsufficientFundsException($"Short by {shortfall:C}")
{
    Shortfall = shortfall
};`, lang: "csharp" },
        { note: "Only create a custom exception if callers would genuinely catch it separately. Otherwise a built-in type such as `InvalidOperationException` or `ArgumentException` is the better answer.", kind: "tip" }
      ]
    },

    {
      id: "extension-methods",
      q: "What are extension methods in C#?",
      tldr: "Static methods in a static class whose first parameter is marked `this`, letting you call them as if they were instance methods on an existing type.",
      tags: ["functional"],
      seeAlso: ["csharp-intermediate/extension-methods"],
      a: [
        { ul: [
          "Must be in a **static, non-nested class**, be a **static method**, and mark the **first parameter with `this`**.",
          "They add behaviour to types you cannot modify — sealed classes, interfaces, types from another assembly.",
          "They are compile-time sugar: the compiler emits a plain static call, so there is no runtime cost and no real access to private members.",
          "The whole of LINQ is extension methods on `IEnumerable<T>`.",
          "An **instance method always wins** over an extension method with the same signature."
        ] },
        { code: `public static class StringExtensions
{
    public static bool IsNullOrEmpty(this string value)
        => string.IsNullOrEmpty(value);

    public static string Truncate(this string value, int max)
        => value.Length <= max ? value : value.Substring(0, max) + "...";
}

"a long sentence".Truncate(6);   // "a long..."`, lang: "csharp" },
        { note: "The extension method's namespace must be in scope with a `using` directive, otherwise it is invisible — the usual reason \"the method does not exist\" on something you know you wrote.", kind: "warn" }
      ]
    },

    {
      id: "lambda-expression",
      q: "What is a lambda expression in C#?",
      tldr: "An inline anonymous function written with `=>`, usually assigned to a delegate or passed to a method that takes one.",
      tags: ["functional", "delegates"],
      a: [
        { ul: [
          "**Expression lambda** — `x => x * 2`; the body is a single expression and its value is returned.",
          "**Statement lambda** — `x => { ... return y; }` for multiple statements.",
          "Parameter types are usually inferred; write them when the compiler cannot tell.",
          "A lambda **captures** variables from the enclosing scope — that is a closure, and the captured variable is kept alive by the compiler-generated class.",
          "Assigned to `Func`/`Action` it becomes a delegate; assigned to `Expression<Func<...>>` it becomes an **expression tree** that a provider like EF can translate to SQL."
        ] },
        { code: `Func<int, int> square = x => x * x;
Action<string> log = msg => Console.WriteLine(msg);
Func<int, int, int> add = (a, b) => a + b;

var adults = people.Where(p => p.Age >= 18)
                   .Select(p => p.Name);

int factor = 3;
Func<int, int> scale = x => x * factor;   // captures factor (a closure)`, lang: "csharp" }
      ]
    },

    {
      id: "constructor-execution-order",
      q: "What is constructor order of execution of static and non-static?",
      tldr: "Field initialisers then constructor bodies, running derived-to-base for initialisers but base-to-derived for constructor bodies; the static constructor runs once before any of it.",
      tags: ["oop", "initialisation"],
      a: [
        { p: "For a single class the order is: **static field initialisers → static constructor** (once, on first use), then **instance field initialisers → instance constructor body**." },
        { p: "With inheritance, `new Derived()` produces this sequence:" },
        { ol: [
          "Static initialisers and static constructor of the **base**, then of the **derived** — each only once, on first use.",
          "**Derived** instance field initialisers.",
          "**Base** instance field initialisers.",
          "**Base** constructor body.",
          "**Derived** constructor body."
        ] },
        { code: `public class Base
{
    private string _b = Log("Base field");
    public Base() => Log("Base ctor");
    protected static string Log(string s) { Console.WriteLine(s); return s; }
}

public class Derived : Base
{
    private string _d = Log("Derived field");
    public Derived() => Log("Derived ctor");
}

// new Derived() prints:
// Derived field
// Base field
// Base ctor
// Derived ctor`, lang: "csharp" },
        { note: "This is why calling a `virtual` method from a constructor is dangerous: the derived override runs **before** the derived constructor body, so it sees fields that have not been assigned yet.", kind: "warn" }
      ]
    }

  ]
});
