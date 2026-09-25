/* C# — Basic. 32 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "csharp-basic",
  topic: "C#",
  level: "Basic",
  short: "C# Basic",
  accent: "violet",
  desc: "The C# basics every interview starts with: types, classes and OOP, properties, error handling and the everyday syntax you should be able to explain without thinking.",
  questions: [

    {
      id: "what-is-csharp",
      q: "What is C# and what are its main features?",
      tldr: "C# is a modern, object-oriented language from Microsoft. Your code is compiled to IL and runs on .NET, which handles memory for you.",
      tags: ["fundamentals"],
      a: [
        { p: "C# is a **strongly typed** language made by Microsoft. When you build, your code turns into **IL (Intermediate Language)**. When the app runs, .NET (the CLR) converts that IL into machine code. Because .NET runs your code, you get **garbage collection, type safety and exceptions** built in." },
        { ul: [
          "**Object-oriented**: classes, inheritance, interfaces, polymorphism, encapsulation.",
          "**Type-safe**: most mistakes are caught when you build, not when the app runs. `var` still has a fixed type, the compiler just figures it out.",
          "**Automatic memory cleanup**: the garbage collector frees memory, so you never call `free`.",
          "**Lots of useful features**: generics, LINQ, `async`/`await`, delegates and events, pattern matching, records, nullable reference types.",
          "**Cross-platform**: modern .NET runs on Windows, Linux, macOS, mobile and in the browser (WebAssembly).",
          "**Big standard library** plus NuGet packages for everything else."
        ] },
        { note: "If they ask \"why C# over Java?\", a simple answer: LINQ, properties, real generics (type info is kept at runtime), `async`/`await` built into the language, and you can create your own value types (structs).", kind: "tip" }
      ]
    },

    {
      id: "access-modifiers",
      q: "Explain the difference between public, private, protected, and internal access modifiers.",
      tldr: "They decide who can use a member: public means everyone, private means only this class, protected means this class and its child classes, internal means anything in the same project (assembly).",
      tags: ["oop", "encapsulation"],
      a: [
        { table: { head: ["Modifier", "Who can use it"], rows: [
          ["`public`", "Everyone, even other projects."],
          ["`private`", "Only code inside the same class. This is the default for class members."],
          ["`protected`", "The same class and any child class, even in another project."],
          ["`internal`", "Any code in the same project (assembly). This is the default for classes."],
          ["`protected internal`", "Same project **OR** a child class. Easy way to remember: it is the wider one."],
          ["`private protected`", "Child class **AND** only inside the same project. It is the narrower one."]
        ] } },
        { code: `public class Account
{
    private decimal _balance;            // only this class
    protected string AccountNumber;      // this class and child classes
    internal DateTime OpenedOn;          // anywhere in this project
    public decimal Balance => _balance;  // everyone
}`, lang: "csharp" },
        { note: "A common trick question about defaults: a class member with no modifier is `private`. A class with no modifier is `internal`.", kind: "warn" }
      ]
    },

    {
      id: "namespace",
      q: "What is a namespace in C# and why is it important?",
      tldr: "A namespace is like a folder for your classes. It groups related types and gives each one a full unique name, so two classes with the same name do not clash.",
      tags: ["organisation"],
      a: [
        { p: "Think of a namespace as a **folder name for code**. In `System.Collections.Generic.List<T>`, the namespace is `System.Collections.Generic` and the class is `List<T>`." },
        { ul: [
          "**Stops name clashes**: your own `Timer` class and `System.Threading.Timer` can both exist.",
          "**Keeps big projects organised**: it usually matches your folder structure.",
          "**`using` at the top of a file** lets you use the short class name instead of the full one.",
          "It only affects **names**. It has no effect on speed or memory."
        ] },
        { code: `namespace Shop.Billing;   // file-scoped namespace (C# 10+)

using System.Collections.Generic;
using Timer = System.Threading.Timer;   // alias: pick which Timer you mean

public class Invoice { }`, lang: "csharp" },
        { note: "A namespace is not the same as an assembly (a .dll). One .dll can have many namespaces, and one namespace can be spread across many .dll files.", kind: "tip" }
      ]
    },

    {
      id: "class-vs-object",
      q: "What is the difference between a class and an object in C#?",
      tldr: "A class is the blueprint. An object is a real thing built from that blueprint, living in memory.",
      tags: ["oop"],
      a: [
        { p: "Simple example: a **house plan** is the class, and each **house built from it** is an object. One plan, many houses, and each house has its own furniture." },
        { ul: [
          "A **class** describes the data (fields, properties) and the actions (methods). You write it once.",
          "An **object** is created with `new` when the app runs. It gets its own copy of the data, stored on the heap.",
          "You can make many objects from one class. Each has its own values, but they all share the same method code.",
          "`static` members belong to the class itself, not to any object, so all objects share them."
        ] },
        { code: `public class Car          // the class: the blueprint
{
    public string Model { get; set; }
}

var a = new Car { Model = "Civic" };   // object 1
var b = new Car { Model = "Swift" };   // object 2, its own separate data`, lang: "csharp" }
      ]
    },

    {
      id: "inheritance",
      q: "Explain the concept of inheritance in C#.",
      tldr: "Inheritance lets a child class reuse and extend a parent class. It means \"is-a\": a Dog is an Animal. C# allows only one parent class, but many interfaces.",
      tags: ["oop"],
      a: [
        { ul: [
          "The child class gets the parent's members (the ones it can see) and can add its own.",
          "C# allows **only one parent class**, which avoids the \"diamond problem\". But a class can implement **many interfaces**.",
          "Mark a method `virtual` in the parent and `override` it in the child to change its behaviour.",
          "`base` lets the child call the parent's version. `sealed` stops anyone from inheriting further.",
          "Constructors are **not** inherited. The child's constructor always calls a parent constructor first (the parameterless one if you do not say which)."
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
a.Speak();   // "Woof": the real object (Dog) decides, at runtime`, lang: "csharp" },
        { note: "A common follow-up is \"inheritance vs composition\". Safe answer: prefer composition (a class *has* another object), because inheritance ties you tightly to the parent class and is hard to change later.", kind: "tip" }
      ]
    },

    {
      id: "interface-vs-abstract-class",
      q: "What is an interface and how is it different from an abstract class?",
      tldr: "An interface is a contract: it says what a class can do, and a class can implement many of them. An abstract class is a half-built parent class with shared code, and you can inherit only one.",
      tags: ["oop", "design"],
      a: [
        { p: "Easy way to remember: an interface says **\"can do\"** (`IPrintable`, `IComparable`). An abstract class says **\"is a\"** (`Employee` is the base for `Manager` and `Developer`)." },
        { table: { head: ["", "Interface", "Abstract class"], rows: [
          ["How many per class", "As many as you want", "Only one"],
          ["Fields / data", "No instance fields", "Can have fields and data"],
          ["Members", "Public by default. Can have default code since C# 8", "Any access level, abstract and normal members"],
          ["Used for", "A capability many unrelated classes can share", "A shared base with shared code for related classes"],
          ["Constructors", "Not allowed", "Allowed (child classes call them)"]
        ] } },
        { code: `public interface IPayable
{
    decimal CalculatePay();
    string Describe() => "Payable";   // default code, C# 8+
}

public abstract class Employee
{
    protected Employee(string name) => Name = name;   // shared setup
    public string Name { get; }
    public abstract decimal CalculatePay();           // child MUST write this
    public void Print() => Console.WriteLine(Name);   // shared code
}`, lang: "csharp" },
        { p: "Rule of thumb: use an **interface** when unrelated classes need the same ability. Use an **abstract class** when related classes need to share real code and data." }
      ]
    },

    {
      id: "value-vs-reference-types",
      q: "What are value types and reference types in C#?",
      tldr: "A value type holds the data itself, so copying it makes a separate copy. A reference type holds an address pointing to the object, so copying it just copies the address and both point to the same object.",
      tags: ["memory", "fundamentals"],
      seeAlso: ["csharp-advanced/memory-management"],
      a: [
        { p: "Simple way to picture it: a value type is like **giving someone a photocopy** of a paper. A reference type is like **giving someone your house address**. If they change the photocopy, your paper is fine. If they go to your house and paint the wall, your house changes." },
        { ul: [
          "**Value types**: `int`, `double`, `bool`, `char`, `decimal`, every `struct` and `enum`.",
          "**Reference types**: `class`, `interface`, `delegate`, `string`, arrays. The object lives on the heap and the garbage collector cleans it up.",
          "Copying a value type copies the **data**. Copying a reference type copies the **reference**, so both variables see the same object.",
          "Default value: value types get `0` / `false`, reference types get `null`.",
          "**Boxing** means wrapping a value type inside an object on the heap. **Unboxing** takes it back out. Both cost extra work."
        ] },
        { code: `struct Point { public int X; }
class Box   { public int X; }

var p1 = new Point { X = 1 };
var p2 = p1;  p2.X = 99;    // p1.X is still 1 (it was copied)

var b1 = new Box { X = 1 };
var b2 = b1;  b2.X = 99;    // b1.X is now 99 (same object)

object boxed = 42;          // boxing: the int is put into a heap object
int back = (int)boxed;      // unboxing: take it back out`, lang: "csharp" },
        { note: "\"Value types live on the stack\" is not fully true. If a struct is a field inside a class, it lives on the heap together with that class. The correct way to say it: value types are stored **right where they are declared**.", kind: "warn" }
      ]
    },

    {
      id: "using-statement",
      q: "What is the purpose of the using statement in C#?",
      tldr: "`using` does two jobs. At the top of a file it imports a namespace. Around an object it makes sure Dispose() is called at the end, even if an error happens.",
      tags: ["resources", "idisposable"],
      seeAlso: ["csharp-intermediate/using-idisposable"],
      a: [
        { ul: [
          "**Directive**: `using System.Text;` at the top of a file, so you can write `StringBuilder` instead of `System.Text.StringBuilder`.",
          "**Statement**: wraps an object that needs cleanup (a file, a DB connection) and calls `Dispose()` when the block ends, even if an exception is thrown.",
          "**Declaration** (C# 8+): `using var x = ...;` cleans up at the end of the method. Less nesting.",
          "**Alias**: `using Json = System.Text.Json.JsonSerializer;` gives a short name."
        ] },
        { code: `using (var conn = new SqlConnection(cs))
{
    conn.Open();
    // ... work ...
}   // conn.Dispose() runs here, even if something above throws

using var file = File.OpenRead(path);   // closed at the end of the method`, lang: "csharp" },
        { note: "Great line for an interview: \"the compiler turns it into a `try` / `finally` that calls `Dispose()` in the `finally`\". That usually answers the follow-up too.", kind: "tip" }
      ]
    },

    {
      id: "arrays",
      q: "How do you declare and initialize an array in C#?",
      tldr: "An array is a fixed-size list of items of one type. You declare it with `type[]`, create it with `new`, count from index 0 and get the size with `Length`.",
      tags: ["collections"],
      a: [
        { code: `int[] a = new int[5];                 // 5 items, all 0
int[] b = new int[] { 1, 2, 3 };
int[] c = { 1, 2, 3 };                // shorter way
int[] d = [1, 2, 3];                  // collection expression, C# 12+

int[,]  grid   = new int[3, 4];       // 2D grid (like a table)
int[][] jagged = new int[3][];        // jagged: an array of arrays
jagged[0] = new int[5];

int len = c.Length;                   // 3
Array.Sort(c);
int idx = Array.IndexOf(c, 2);`, lang: "csharp" },
        { ul: [
          "Arrays are **reference types**, even an array of `int`.",
          "The size is **fixed** once created. Use `List<T>` if you need it to grow.",
          "Index starts at 0. Using an index outside the range throws `IndexOutOfRangeException`.",
          "`int[,]` is one grid where every row has the same length. `int[][]` is an array of separate arrays, so each row can have a different length."
        ] }
      ]
    },

    {
      id: "method-overloading",
      q: "Explain the concept of method overloading.",
      tldr: "Overloading means many methods with the same name in one class, but with different parameters. The compiler picks the right one based on what you pass in.",
      tags: ["oop", "polymorphism"],
      a: [
        { ul: [
          "The parameters must be different in **number, type or order**.",
          "**Only changing the return type is not allowed.** It will not compile.",
          "It is **compile-time polymorphism**: the compiler decides which method to call.",
          "`ref`, `out` and `in` count as a difference. Default values and `params` do not make a new overload."
        ] },
        { code: `public class Calc
{
    public int Add(int a, int b) => a + b;
    public double Add(double a, double b) => a + b;    // different types
    public int Add(int a, int b, int c) => a + b + c;  // different count
    // public double Add(int a, int b)  <-- error: only return type is different
}`, lang: "csharp" },
        { note: "Often asked together: **overloading** = same name, different parameters, decided at compile time. **Overriding** = same signature, `virtual`/`override`, decided at runtime.", kind: "tip" }
      ]
    },

    {
      id: "constructor",
      q: "What is a constructor and how is it used in C#?",
      tldr: "A constructor is a special method with the same name as the class and no return type. It runs when you create an object, to set it up with valid starting values.",
      tags: ["oop"],
      a: [
        { ul: [
          "**Instance constructor**: runs every time you call `new`. If you write none, C# gives you an empty one.",
          "**Static constructor**: no parameters, no access modifier, runs only once before the class is first used.",
          "**Constructor chaining**: `: this(...)` calls another constructor in the same class. `: base(...)` calls the parent class constructor.",
          "**Private constructor**: stops others from using `new` (used in singletons and helper classes).",
          "**Primary constructor** (C# 12): put the parameters right on the class line."
        ] },
        { code: `public class Order
{
    public Order() : this(0) { }              // calls the one below

    public Order(decimal total)
    {
        Total = total;
        CreatedOn = DateTime.UtcNow;
    }

    static Order() { /* runs once, before first use */ }

    public decimal Total { get; }
    public DateTime CreatedOn { get; }
}`, lang: "csharp" },
        { note: "Once you write any constructor yourself, the free empty one is gone. That is a very common reason for the error \"There is no argument given that corresponds to...\".", kind: "warn" }
      ]
    },

    {
      id: "equality-operators",
      q: "What is the difference between == and Equals() in C#?",
      tldr: "`==` is an operator the compiler picks based on the variable's declared type. `Equals()` is a virtual method, so it uses the object's real type at runtime. Collections like Dictionary use Equals().",
      tags: ["equality"],
      a: [
        { ul: [
          "For **value types** (`int`, structs), both compare the values.",
          "For **reference types**, both check \"is this the same object?\" by default, unless the class changes that.",
          "`string` changes both, so `==` and `Equals()` compare the **text**, not the object.",
          "`==` looks at the **declared type** of the variable. If the variable is `object`, it does a reference check even for strings. `Equals()` always uses the **real type**.",
          "`object.ReferenceEquals(a, b)` always checks \"same object?\", no matter what."
        ] },
        { code: `string a = "hello";
string b = "hel" + "lo";
object oa = a, ob = b;

a  == b;              // true:  string == compares text
a.Equals(b);          // true
oa == ob;             // compares references (may be false)
oa.Equals(ob);        // true:  virtual, so it calls string.Equals`, lang: "csharp" },
        { note: "If you override `Equals()`, always override `GetHashCode()` too. Otherwise your class will act strangely inside `Dictionary` and `HashSet`.", kind: "warn" }
      ]
    },

    {
      id: "static-keyword",
      q: "Explain the purpose of the static keyword.",
      tldr: "`static` means the member belongs to the class itself, not to an object. There is only one copy, shared by everyone, and you use it through the class name.",
      tags: ["fundamentals"],
      a: [
        { ul: [
          "**Static field**: one copy shared by all objects.",
          "**Static method**: called on the class (`Math.Max(1, 2)`). It cannot use `this` or instance members.",
          "**Static class**: you cannot create or inherit it, and it holds only static members (like `Math`, `Console`).",
          "**Static constructor**: runs once, automatically, before the class is first used.",
          "**Static lambda / local function** (C# 8/9): cannot use outside variables, so you avoid accidental captures."
        ] },
        { code: `public static class Config
{
    private static int _reads;
    public static string Environment { get; } = "Production";

    public static string Read(string key)
    {
        _reads++;              // shared by every caller
        return "...";
    }
}`, lang: "csharp" },
        { note: "A static field that can change is shared by every thread in the app. That is a common source of hard-to-find bugs. Keep static data read-only, or protect it with a lock.", kind: "warn" }
      ]
    },

    {
      id: "delegate",
      q: "What is a delegate in C#?",
      tldr: "A delegate is a variable that holds a method. It lets you pass a method around like a value, and call it later. It is type-safe: the method must match the delegate's signature.",
      tags: ["delegates", "functional"],
      seeAlso: ["csharp-intermediate/delegates-and-events", "csharp-intermediate/func-and-action"],
      a: [
        { p: "Think of a delegate as a **TV remote**: the remote does not know how the TV works, it just holds a button that calls something. You can point it at any method that has the right shape." },
        { ul: [
          "Declaring a delegate creates a **type** that can point to any method with the same parameters and return type.",
          "It can hold **many methods**: `+=` adds one, `-=` removes one, and calling it runs all of them in order.",
          "Delegates are the base of **events**, **callbacks** and **LINQ**.",
          "You rarely write your own today. Use the built-in `Action<...>` (returns nothing) and `Func<..., TResult>` (returns a value)."
        ] },
        { code: `public delegate int Transform(int x);

Transform square = x => x * x;
Transform twice  = x => x * 2;

Transform chain = square;
chain += twice;             // now holds two methods
int result = chain(3);      // runs both, returns the LAST result: 6

// The modern, everyday way
Func<int, int> f = x => x * x;
Action<string> log = Console.WriteLine;`, lang: "csharp" },
        { note: "When a delegate holds many methods and returns a value, you only get the **last** method's result. That is why events use `Action` (no return value).", kind: "warn" }
      ]
    },

    {
      id: "exception-handling",
      q: "How does exception handling work in C#?",
      tldr: "Put risky code in `try`, handle errors in `catch` (most specific type first), and put cleanup in `finally`, which always runs.",
      tags: ["errors"],
      seeAlso: ["csharp-advanced/exception-best-practices"],
      a: [
        { ul: [
          "Every exception comes from `System.Exception`. Catch the **most specific type first**. Putting `catch (Exception)` above a specific one will not compile.",
          "`finally` runs whether there was an error or not. It is the place for cleanup (a `using` block does this for you).",
          "`throw;` rethrows and **keeps the original stack trace**. `throw ex;` **loses it**, so avoid it.",
          "**Exception filters** like `catch (SqlException ex) when (ex.Number == 1205)` let you catch only when a condition is true.",
          "Only catch what you can actually handle. Let everything else go up to a global handler."
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
      tldr: "A property looks like a field from outside, but inside it is a pair of get/set methods. So you get the easy syntax of a field plus control over reading and writing.",
      tags: ["oop", "encapsulation"],
      a: [
        { ul: [
          "**Auto-property**: `public string Name { get; set; }`. The compiler creates the hidden field for you.",
          "**Full property**: write `get`/`set` yourself when you need validation or extra logic.",
          "**Read-only**: `{ get; }` can only be set in the constructor. `{ get; init; }` (C# 9) can also be set with `new Person { ... }`.",
          "**Different access**: `public string Name { get; private set; }` means everyone can read, only the class can write.",
          "**Computed**: `public string Full => First + \" \" + Last;` has no stored value, it is worked out each time.",
          "Because properties are really methods, they can be `virtual` and can be in interfaces. Fields cannot. That is why public APIs use properties, not public fields."
        ] },
        { code: `public class Person
{
    private string _email = "";

    public string Name { get; set; } = "";          // auto
    public DateTime CreatedOn { get; init; }        // set only when creating
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
      tldr: "`const` is fixed when you build and can never change. `readonly` is set when the app runs (at declaration or in the constructor) and cannot change after that.",
      tags: ["fundamentals", "immutability"],
      seeAlso: ["csharp-intermediate/const-vs-readonly"],
      a: [
        { table: { head: ["", "`const`", "`readonly`"] , rows: [
          ["Value decided", "When you build", "When the app runs"],
          ["Where you can set it", "Only where you declare it", "Where you declare it, or in the constructor"],
          ["Static?", "Always (automatically)", "Per object, or `static readonly`"],
          ["Allowed types", "Numbers, `string`, `enum`, `null`", "Any type"],
          ["Different value per object?", "No", "Yes"]
        ] } },
        { code: `public class Circle
{
    public const double Pi = 3.14159;          // fixed forever
    public static readonly DateTime Started = DateTime.UtcNow;   // set at runtime
    public readonly int Radius;                 // each object has its own

    public Circle(int radius) => Radius = radius;   // allowed for readonly
}`, lang: "csharp" },
        { note: "A `const` value is **copied into** every project that uses it. If library A changes a `const` and only A is redeployed, project B still has the old value until it is rebuilt. `static readonly` does not have this problem, so use it for anything that might change.", kind: "warn" }
      ]
    },

    {
      id: "polymorphism",
      q: "Explain the concept of polymorphism in C#.",
      tldr: "Polymorphism means \"many forms\": the same method call does different things depending on the real object behind it.",
      tags: ["oop"],
      a: [
        { p: "Example: you call `shape.Area()` on a list of shapes. A circle works out a circle's area, a square works out a square's area. Your code does not need to know which one it has." },
        { ul: [
          "**Compile-time** polymorphism: method overloading and operator overloading. The compiler picks the method.",
          "**Runtime** polymorphism: `virtual`/`override` and interfaces. The real object type decides at runtime.",
          "It lets you write code against `Shape` or `IRepository` without caring about the exact class.",
          "Watch out for `new` on a method: it **hides** the parent method instead of overriding it. Then the variable's type decides, not the object. Usually a bug."
        ] },
        { code: `public class Shape        { public virtual double Area() => 0; }
public class Circle : Shape { public override double Area() => Math.PI * 4; }
public class Square : Shape { public override double Area() => 16; }

var shapes = new List<Shape> { new Circle(), new Square() };
foreach (var s in shapes)
    Console.WriteLine(s.Area());   // each one runs its own version`, lang: "csharp" },
        { code: `public class Base    { public virtual void Go() => Console.WriteLine("Base"); }
public class Hides : Base { public new void Go() => Console.WriteLine("Hides"); }

Base b = new Hides();
b.Go();   // "Base"  <-- hiding, not overriding`, lang: "csharp", caption: "The new keyword hides instead of overriding" }
      ]
    },

    {
      id: "collections",
      q: "What is a collection in C#? Give examples.",
      tldr: "A collection is a class that holds a group of items, like an array but smarter: it can grow, search and sort. Most live in System.Collections.Generic.",
      tags: ["collections"],
      a: [
        { table: { head: ["Collection", "Use it for", "Speed of finding an item"], rows: [
          ["`List<T>`", "A normal list that can grow. Your default choice", "Slow by value, fast by index"],
          ["`Dictionary<K,V>`", "Find a value by a key", "Very fast"],
          ["`HashSet<T>`", "Only unique items", "Very fast"],
          ["`Queue<T>`", "First in, first out (like a line at a shop)", "Fast add/remove"],
          ["`Stack<T>`", "Last in, first out (like a stack of plates)", "Fast push/pop"],
          ["`SortedDictionary<K,V>` / `SortedList<K,V>`", "Keys kept in sorted order", "Fast (log n)"],
          ["`LinkedList<T>`", "Lots of adding/removing in the middle", "Slow to find"],
          ["`ConcurrentDictionary<K,V>`", "Dictionary used by many threads at once", "Very fast"]
        ] } },
        { code: `var names  = new List<string> { "Ann", "Bob" };
var ages   = new Dictionary<string, int> { ["Ann"] = 30 };
var unique = new HashSet<int> { 1, 2, 2 };     // Count == 2

if (ages.TryGetValue("Ann", out var age)) { /* no exception if the key is missing */ }`, lang: "csharp" },
        { ul: [
          "Use the **generic** ones (`List<T>`, `Dictionary<K,V>`). The old `ArrayList` and `Hashtable` are not type-safe and are slower.",
          "From your methods, return the simplest type that works: `IEnumerable<T>` if the caller only loops, `IReadOnlyList<T>` if they need index access."
        ] }
      ]
    },

    {
      id: "linq-intro",
      q: "What is LINQ and why is it useful?",
      tldr: "LINQ lets you filter, sort and shape data with normal C# code, and the same style works for lists, databases and XML.",
      tags: ["linq"],
      seeAlso: ["linq/what-is-linq", "linq/ienumerable-vs-iqueryable"],
      a: [
        { ul: [
          "One way to query many sources: **lists** (LINQ to Objects), **databases** (LINQ to Entities with EF) and **XML**.",
          "**Errors are caught when you build**, and IntelliSense helps you. A SQL string only fails when the app runs.",
          "The methods (`Where`, `Select`, `OrderBy`, `GroupBy`, `Join`, `Any`, `First`, `Sum`) are extension methods on `IEnumerable<T>` / `IQueryable<T>`.",
          "Two styles: **query syntax** (looks like SQL) and **method syntax** (chained methods). Both do exactly the same thing.",
          "Most queries are **deferred**: they only run when you loop over them or call `ToList()`."
        ] },
        { code: `var orders = new List<Order>();

// method syntax
var recent = orders.Where(o => o.Total > 100)
                   .OrderByDescending(o => o.CreatedOn)
                   .Select(o => new { o.Id, o.Total })
                   .ToList();

// query syntax: same result
var recent2 = (from o in orders
               where o.Total > 100
               orderby o.CreatedOn descending
               select new { o.Id, o.Total }).ToList();`, lang: "csharp" }
      ]
    },

    {
      id: "sealed-basic",
      q: "Explain the purpose of the sealed keyword.",
      tldr: "`sealed` stops inheritance. On a class, no one can inherit from it. On an overridden method, no child class can override it again.",
      tags: ["oop"],
      seeAlso: ["csharp-intermediate/sealed-keyword"],
      a: [
        { ul: [
          "`sealed class`: no class can inherit from it.",
          "`sealed override`: child classes further down cannot override this method again.",
          "Why seal: protect important rules in the class, stop misuse of security-sensitive code, or simply say \"this was not built to be extended\".",
          "Small bonus: .NET can call methods on sealed classes a bit faster.",
          "`string` is the most famous sealed class."
        ] },
        { code: `public sealed class AuditLog { }          // no one can inherit

public class Base { public virtual void Run() { } }
public class Mid : Base { public sealed override void Run() { } }
// public class Leaf : Mid { public override void Run() { } }  <-- error`, lang: "csharp" }
      ]
    },

    {
      id: "out-keyword",
      q: "What is the out keyword used for in C#?",
      tldr: "`out` lets a method send a value back through a parameter. The caller does not need to set it first, but the method must set it before it returns.",
      tags: ["parameters"],
      a: [
        { ul: [
          "The caller does not need to give it a value. The **method must set it** before returning.",
          "It lets a method return **more than one value**. The classic example is `int.TryParse`.",
          "Since C# 7 you can declare it inline: `int.TryParse(s, out int n)`.",
          "`out _` means \"I do not care about this value\"."
        ] },
        { table: { head: ["", "`ref`", "`out`", "`in`"], rows: [
          ["Caller must set a value first", "Yes", "No", "Yes"],
          ["Method must set a value", "No", "Yes", "No, it is read-only"],
          ["Direction", "In and out", "Out only", "In only (passed by reference, no copy)"]
        ] } },
        { code: `if (int.TryParse(input, out int value))
    Console.WriteLine(value * 2);
else
    Console.WriteLine("Not a number");

dictionary.TryGetValue(key, out _);   // ignore the value`, lang: "csharp" },
        { note: "You cannot use `out` or `ref` parameters in `async` methods. Return a tuple instead.", kind: "warn" }
      ]
    },

    {
      id: "garbage-collection",
      q: "How does garbage collection work in C#?",
      tldr: "The garbage collector (GC) automatically frees memory for objects your code can no longer reach. It groups objects by age (Gen 0, 1, 2) so it can clean new objects quickly.",
      tags: ["memory", "gc"],
      seeAlso: ["csharp-advanced/memory-management"],
      a: [
        { p: "Simple idea: the GC starts from things your code is using right now (**roots**: static fields, local variables, etc.) and follows every reference. Anything it **cannot reach** is garbage and gets freed." },
        { ul: [
          "**Mark** the objects still in use, **sweep** away the rest, then **compact** (move objects together) so new memory is easy to hand out.",
          "**Generations**: new objects start in **Gen 0**. If they survive a cleanup they move to **Gen 1**, then **Gen 2**. Most objects die young, so Gen 0 cleanups are frequent and cheap. Gen 2 cleanups are rare and expensive.",
          "**Large Object Heap (LOH)**: objects over 85,000 bytes go here. It is cleaned with Gen 2 and not compacted by default.",
          "**Finalizers** (`~MyClass`) run at an unknown time and slow things down. Use `IDisposable` for cleanup instead."
        ] },
        { note: "Key point to say: the GC only cleans **memory**. Files, database connections and sockets are not memory. They need `IDisposable` and a `using` block.", kind: "tip" }
      ]
    },

    {
      id: "string-vs-string-alias",
      q: "What is the difference between String and string in C#?",
      tldr: "No difference. `string` is just the C# nickname for `System.String`. Both compile to exactly the same thing.",
      tags: ["strings", "fundamentals"],
      a: [
        { p: "`string` is a **keyword alias**, the same way `int` means `System.Int32` and `bool` means `System.Boolean`. The only small difference: `string` works without `using System;`, while `String` needs it." },
        { code: `string a = "hello";
String b = "hello";
System.String c = "hello";
// all three are System.String

// Common style: lowercase for variables, and for static methods too
string name = string.Empty;
bool ok = string.IsNullOrWhiteSpace(name);`, lang: "csharp" },
        { note: "Common follow-up: strings are **immutable** (cannot change). Every change creates a new string. That is why `StringBuilder` is used when you join strings inside a loop.", kind: "tip" }
      ]
    },

    {
      id: "indexers",
      q: "What are indexers in C#?",
      tldr: "An indexer lets you use square brackets on your own class, like `obj[0]` or `obj[\"key\"]`, just like an array or dictionary.",
      tags: ["oop"],
      a: [
        { ul: [
          "Written as `public T this[TIndex index] { get; set; }`. It is a property named `this`.",
          "The index can be **any type**, not only `int`. You can have more than one indexer with different index types.",
          "You can use more than one parameter: `this[int row, int col]`.",
          "This is exactly how `list[0]` and `dictionary[key]` work."
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
      tldr: "They let you write code that waits for slow work (web calls, database, files) without blocking the thread. `await` frees the thread while waiting and continues when the work is done.",
      tags: ["async"],
      seeAlso: ["csharp-intermediate/async-await-purpose", "csharp-intermediate/task-vs-thread"],
      a: [
        { p: "Think of ordering food at a counter. **Blocking** is standing at the counter doing nothing until the food is ready. **Await** is taking a token, sitting down, and coming back when your number is called. Meanwhile the counter can serve other people." },
        { ul: [
          "`async` marks a method that uses `await`. The compiler turns it into a **state machine** behind the scenes.",
          "`await` on unfinished work **gives the thread back** so it can do other things. When the work finishes, the method continues. It does **not** create a new thread.",
          "Return `Task` (no result) or `Task<T>` (with a result). `async void` is only for event handlers, because its errors cannot be caught.",
          "The big win is **scalability**: a web server can handle many more requests because threads are not stuck waiting."
        ] },
        { code: `public async Task<string> GetUserNameAsync(int id)
{
    using var http = new HttpClient();
    var json = await http.GetStringAsync($"/api/users/{id}");   // thread is freed here
    var user = JsonSerializer.Deserialize<User>(json);
    return user.Name;                                            // continues here
}`, lang: "csharp" },
        { note: "Using `.Result` or `.Wait()` instead of `await` can **deadlock** in older ASP.NET and in WinForms/WPF apps. Rule: use async all the way up.", kind: "warn" }
      ]
    },

    {
      id: "null-coalescing",
      q: "What is a null coalescing operator (??) in C#?",
      tldr: "`a ?? b` means \"use a, but if it is null, use b\". It is a short way to give a default value.",
      tags: ["null-safety", "operators"],
      a: [
        { ul: [
          "`a ?? b` gives `a` if it is not null, otherwise `b`. `b` is only evaluated if needed.",
          "`??=` (C# 8) means \"assign only if it is currently null\".",
          "Works with nullable value types (`int?`) and reference types. You can chain it: `a ?? b ?? c`.",
          "Handy for throwing an error on a null argument in one line."
        ] },
        { code: `string name = input ?? "Anonymous";

int? maybe = null;
int value = maybe ?? 0;              // 0

_cache ??= BuildCache();             // only build if _cache is null

public Service(ILogger logger)
    => _logger = logger ?? throw new ArgumentNullException(nameof(logger));`, lang: "csharp" }
      ]
    },

    {
      id: "null-conditional",
      q: "What is null conditional operator (?. and ?[]) in C#?",
      tldr: "`?.` and `?[]` mean \"only continue if this is not null\". If it is null, you get null back instead of a NullReferenceException.",
      tags: ["null-safety", "operators"],
      a: [
        { ul: [
          "`a?.B` returns `null` if `a` is null, otherwise returns `a.B`. `a?[0]` does the same for indexes.",
          "The **whole chain stops** at the first null, so the rest is skipped safely.",
          "The result can be null, so `int` becomes `int?`. You often add `??` to give a default.",
          "`?.Invoke(...)` is the standard safe way to raise an event.",
          "Do not use it everywhere to hide nulls. Sometimes a null is a real bug you want to see."
        ] },
        { code: `int? len = customer?.Address?.City?.Length;   // null if any part is null
int  safe = customer?.Orders?.Count ?? 0;     // 0 if null

var first = list?[0];

PropertyChanged?.Invoke(this, args);          // raise event only if someone is listening`, lang: "csharp" }
      ]
    },

    {
      id: "custom-exception",
      q: "How do you create a custom exception in C#?",
      tldr: "Make a class that inherits from `Exception`, end its name with \"Exception\", and add the three standard constructors (the one with an inner exception is the important one).",
      tags: ["errors"],
      a: [
        { ol: [
          "Inherit from `System.Exception` (not `ApplicationException`, that is old advice).",
          "Name it `SomethingException`.",
          "Add three constructors: empty, with a message, and with a message plus inner exception.",
          "Add extra properties if the caller needs more details (like an amount or an ID)."
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
        { note: "Only make a custom exception if someone will actually catch it separately. Otherwise a built-in one like `InvalidOperationException` or `ArgumentException` is better.", kind: "tip" }
      ]
    },

    {
      id: "extension-methods",
      q: "What are extension methods in C#?",
      tldr: "Extension methods let you add new methods to an existing type without changing it. You write a static method with `this` on the first parameter, and then call it like a normal method.",
      tags: ["functional"],
      seeAlso: ["csharp-intermediate/extension-methods"],
      a: [
        { ul: [
          "Rules: put it in a **static class**, make the method **static**, and put **`this`** before the first parameter.",
          "Useful for types you cannot change: `string`, sealed classes, interfaces, classes from a library.",
          "It is just a nice way to write a static call. The compiler turns `x.Truncate(6)` into `StringExtensions.Truncate(x, 6)`. It cannot see private members.",
          "All of LINQ (`Where`, `Select`...) is built with extension methods on `IEnumerable<T>`.",
          "If the type already has a normal method with the same name, the **normal method wins**."
        ] },
        { code: `public static class StringExtensions
{
    public static bool IsNullOrEmpty(this string value)
        => string.IsNullOrEmpty(value);

    public static string Truncate(this string value, int max)
        => value.Length <= max ? value : value.Substring(0, max) + "...";
}

"a long sentence".Truncate(6);   // "a long..."`, lang: "csharp" },
        { note: "You need a `using` for the namespace where the extension class lives. If you forget it, the method simply does not show up.", kind: "warn" }
      ]
    },

    {
      id: "lambda-expression",
      q: "What is a lambda expression in C#?",
      tldr: "A lambda is a short, nameless function written with `=>`, like `x => x * 2`. You usually pass it to a method or store it in a Func or Action.",
      tags: ["functional", "delegates"],
      a: [
        { p: "Read `x => x * 2` as **\"x goes to x times 2\"**. Left side: the input. Right side: what to do with it." },
        { ul: [
          "**Expression lambda**: `x => x * 2`. One expression, its value is returned.",
          "**Statement lambda**: `x => { ...; return y; }` when you need more lines.",
          "Types are usually figured out by the compiler.",
          "A lambda can **use variables from outside** it. This is called a **closure**. The variable stays alive as long as the lambda does.",
          "Stored in `Func`/`Action` it becomes normal code. Stored in `Expression<Func<...>>` it becomes a **data structure** that EF can read and turn into SQL."
        ] },
        { code: `Func<int, int> square = x => x * x;
Action<string> log = msg => Console.WriteLine(msg);
Func<int, int, int> add = (a, b) => a + b;

var adults = people.Where(p => p.Age >= 18)
                   .Select(p => p.Name);

int factor = 3;
Func<int, int> scale = x => x * factor;   // uses factor from outside (closure)`, lang: "csharp" }
      ]
    },

    {
      id: "constructor-execution-order",
      q: "What is constructor order of execution of static and non-static?",
      tldr: "Static parts run first and only once. Then, for each new object: fields are set up from child to parent, and constructor bodies run from parent to child.",
      tags: ["oop", "initialisation"],
      a: [
        { p: "For one class: **static fields, then the static constructor** (only once, on first use). Then for every `new`: **instance fields, then the constructor body**." },
        { p: "With a parent and child class, `new Derived()` runs in this order:" },
        { ol: [
          "Static fields and static constructor run once per class, the first time each class is used.",
          "**Child** field initialisers.",
          "**Parent** field initialisers.",
          "**Parent** constructor body.",
          "**Child** constructor body."
        ] },
        { p: "Easy way to remember: **fields go child to parent, constructors go parent to child**. The parent must be fully built before the child's constructor body runs." },
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
        { note: "This is why calling a `virtual` method inside a constructor is risky: the child's override runs **before** the child's constructor body, so its fields may not be set yet.", kind: "warn" }
      ]
    }

  ]
});
