/* Python - Advanced. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "python-advanced",
  topic: "Python",
  level: "Advanced",
  short: "Python Advanced",
  accent: "yellow",
  desc: "How Python works under the hood: memory and the GIL, the object model and metaprogramming, asyncio and parallelism, generics and protocols, plus the profiling, packaging and security questions asked in senior interviews.",
  questions: [

    {
      id: "memory-management",
      q: "How does Python manage memory?",
      tldr: "CPython uses reference counting as its main tool: every object keeps a count of how many references point to it, and it is freed the moment that count drops to zero. A separate cyclic garbage collector finds groups of objects that only point to each other, which reference counting alone can never free.",
      tags: ["memory", "internals", "gc"],
      seeAlso: ["python-advanced/memory-leaks", "python-intermediate/gil", "python-advanced/interning-and-caching"],
      a: [
        { p: "There are three parts to the answer:" },
        { ol: [
          "**Reference counting.** Each object has a counter. Giving it a name, putting it in a list or passing it to a function adds one. `del`, reassigning the name or leaving a function removes one. At zero, the object is destroyed **immediately**.",
          "**The cyclic garbage collector.** If `a` points to `b` and `b` points back to `a`, their counts never reach zero. The `gc` module looks for such unreachable groups from time to time and frees them.",
          "**The memory allocator.** Python does not ask the operating system for memory for every small object. Its own allocator (`pymalloc`) takes big blocks and hands out small pieces of them, which is much faster."
        ] },
        { code: `import sys

a = [1, 2, 3]
print(sys.getrefcount(a))     # 2   the name a, plus the temporary argument of getrefcount

b = a                         # one more reference
print(sys.getrefcount(a))     # 3

del b                         # one less
print(sys.getrefcount(a))     # 2`, lang: "python", caption: "Reference counting (the exact numbers can differ between versions)" },
        { code: `import gc

class Node:
    def __init__(self, name):
        self.name = name
        self.other = None

    def __del__(self):
        print(f"{self.name} freed")

a, b = Node("a"), Node("b")
a.other, b.other = b, a       # a cycle: each one points to the other

del a, b                      # nothing is printed: both counts are still 1
gc.collect()                  # now the cyclic collector finds and frees both`, lang: "python", caption: "A reference cycle needs the garbage collector" },
        { ul: [
          "The collector is **generational**: new objects are checked often, and objects that survive move to an older generation that is checked rarely. Most objects die young, so this saves work.",
          "It only tracks **containers** (lists, dicts, objects of classes). A number or a string cannot be part of a cycle.",
          "Reference counting is why resources are released promptly in CPython, but do not rely on that for cleanup. Use `with`.",
          "A `weakref` is a reference that does **not** add to the count. It is used for caches and listener lists that must not keep objects alive.",
          "Freed memory is often kept by Python for reuse instead of going back to the operating system, so the memory of a process does not always shrink."
        ] },
        { note: "This describes **CPython**. Other implementations differ: PyPy has no reference counting and uses only a tracing garbage collector.", kind: "tip" },
        { note: "💡 Say it like this: 'CPython frees most objects through reference counting, the moment the count reaches zero. Reference cycles cannot be freed that way, so a generational garbage collector runs from time to time to find them. Under both sits a private allocator that makes small objects cheap.'", kind: "tip" }
      ]
    },

    {
      id: "interning-and-caching",
      q: "What are integer caching and string interning? Why does `is` sometimes give surprising results?",
      tldr: "To save memory and time, CPython keeps one shared object for each small integer from -5 to 256 and reuses some strings, mainly those that look like identifiers. Two variables with such a value point to the same object, so `is` returns True by accident. It is an implementation detail, which is why you compare values with `==`.",
      tags: ["memory", "internals", "gotchas"],
      seeAlso: ["python-basic/equality-vs-identity", "python-advanced/memory-management"],
      a: [
        { code: `a = 256
b = 256
print(a is b)          # True: both names point to the one cached 256

x = int("1000")        # built at run time, so not taken from the cache
y = int("1000")
print(x == y)          # True: the same value
print(x is y)          # False: two separate int objects`, lang: "python", caption: "Small integers are cached" },
        { code: `import sys

s1 = "hello"
s2 = "hello"
print(s1 is s2)        # True: identifier-like literals are shared

parts = ["hel", "lo"]
s3 = "".join(parts)    # built at run time
print(s3 == s1)        # True
print(s3 is s1)        # False: an equal string, but a different object

s4 = sys.intern(s3)    # ask for the shared copy
print(s4 is s1)        # True`, lang: "python", caption: "Some strings are interned" },
        { ul: [
          "**Small integers**: -5 to 256 are created once when Python starts and are reused everywhere.",
          "**Strings**: names used in your code (variables, attributes, keys written as literals) are interned, so looking them up can compare addresses instead of characters.",
          "**Constants in one piece of code** are also shared by the compiler. That is why `a = 1000` and `b = 1000` in the same file can give `a is b`, while typing the two lines separately in the console does not.",
          "`None`, `True` and `False` are singletons, so `is` is correct for them.",
          "`sys.intern()` is worth using only when a program holds a very large number of repeated strings, such as millions of identical keys or tags."
        ] },
        { note: "None of this is guaranteed by the language. It changes between versions and between implementations. Use `==` for values and keep `is` for `None`.", kind: "warn" },
        { note: "💡 Say it like this: 'CPython caches small integers from -5 to 256 and interns identifier-like strings, so two variables can share one object and is returns True. It is an optimisation, not a rule, so I never rely on it. I compare values with double equals.'", kind: "tip" }
      ]
    },

    {
      id: "list-and-dict-internals",
      q: "How are `list` and `dict` implemented internally? What are their time complexities?",
      tldr: "A list is a dynamic array of references: fast by index and at the end, slow in the middle and at the front. A dict is a hash table: finding, adding and deleting by key take constant time on average. A set is a hash table with keys only.",
      tags: ["internals", "performance", "collections"],
      seeAlso: ["python-advanced/hashing", "python-basic/lists", "python-basic/dictionaries"],
      a: [
        { p: "**list: a dynamic array.** It holds one continuous block of pointers to the objects, plus some spare room at the end. When the room is used up, Python allocates a bigger block (about one eighth bigger) and copies the pointers across. Because that happens rarely, `append` is O(1) on average." },
        { table: { head: ["List operation", "Cost", "Why"], rows: [
          ["`lst[i]`, `lst[i] = x`", "O(1)", "A direct position in the array"],
          ["`lst.append(x)`, `lst.pop()`", "O(1) on average", "Spare room at the end"],
          ["`lst.insert(0, x)`, `lst.pop(0)`, `del lst[i]`", "O(n)", "Every later item must move"],
          ["`x in lst`, `lst.index(x)`", "O(n)", "Checks item by item"],
          ["`lst[a:b]`", "O(k)", "Copies k items"],
          ["`lst.sort()`", "O(n log n)", "Timsort"]
        ] } },
        { p: "**dict: a hash table.** Python calls `hash(key)`, uses that number to pick a slot, and stores the key, its hash and the value. If two keys land on the same slot (a **collision**), it tries other slots in a fixed pattern until it finds the key or an empty slot. When the table is about two thirds full, it is made bigger." },
        { table: { head: ["Dict or set operation", "Average", "Worst case"], rows: [
          ["`d[key]`, `d.get(key)`, `key in d`", "O(1)", "O(n), with very many collisions"],
          ["`d[key] = value`", "O(1)", "O(n)"],
          ["`del d[key]`", "O(1)", "O(n)"],
          ["Looping over all items", "O(n)", "O(n)"]
        ] } },
        { code: `import sys

nums = []
sizes = []
for i in range(20):
    nums.append(i)
    size = sys.getsizeof(nums)
    if size not in sizes:
        sizes.append(size)

print(len(sizes))     # 4   only 4 different sizes for 20 appends: it grows in steps`, lang: "python", caption: "A list grows in steps, not on every append" },
        { ul: [
          "Since Python 3.6 the dict uses a **compact layout**: a small index table plus a dense array of entries kept in insertion order. That is what makes a dict **ordered** (guaranteed since 3.7) and smaller than before.",
          "A `set` is the same hash table without values, so `x in my_set` is O(1) while `x in my_list` is O(n).",
          "A `tuple` is a fixed-size array: no spare room, and a little smaller and faster to create than a list.",
          "`collections.deque` is a linked list of blocks: O(1) at both ends, but O(n) by index in the middle."
        ] },
        { note: "💡 Say it like this: 'A list is a dynamic array, so index access and append are O(1), but inserting at the front is O(n). A dict is a hash table with O(1) average lookup, and it keeps insertion order. So for membership tests on large data I use a set or a dict, not a list.'", kind: "tip" }
      ]
    },

    {
      id: "hashing",
      q: "What makes an object hashable? How are `__hash__` and `__eq__` related?",
      tldr: "An object is hashable if it has a hash value that never changes during its life and it can be compared for equality. The rule is: objects that are equal must have the same hash. That is why immutable types can be dict keys and set items, and a list cannot.",
      tags: ["hashing", "dunder", "dict"],
      seeAlso: ["python-advanced/list-and-dict-internals", "python-intermediate/dunder-methods", "python-basic/dictionaries"],
      a: [
        { p: "A dict or a set uses the hash to pick a slot, and then `==` to confirm that it found the right key. The two must agree, and the hash must stay the same while the object is in the collection." },
        { code: `print(hash("python") == hash("python"))       # True: equal values, equal hashes
print(hash((1, 2)) == hash((1, 2)))           # True
print(hash(1) == hash(1.0) == hash(True))     # True: 1 == 1.0 == True, so the hashes match

hash([1, 2])                                  # TypeError: unhashable type: 'list'`, lang: "python" },
        { table: { head: ["Hashable", "Not hashable"], rows: [
          ["`int`, `float`, `str`, `bytes`, `bool`, `None`", "`list`, `dict`, `set`, `bytearray`"],
          ["A `tuple` or `frozenset`, if everything inside is hashable", "A tuple that contains a list"],
          ["Objects of your own classes (by identity, by default)", "Objects of a class that defines `__eq__` but not `__hash__`"]
        ] } },
        { code: `class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __eq__(self, other):
        return isinstance(other, Point) and (self.x, self.y) == (other.x, other.y)

    def __hash__(self):
        return hash((self.x, self.y))       # built from the SAME fields as __eq__

seen = {Point(1, 2)}
print(Point(1, 2) in seen)                  # True: equal, and the same hash`, lang: "python", caption: "Making your own class hashable" },
        { code: `class Tag:
    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        return self.name == other.name

    def __hash__(self):
        return hash(self.name)

tag = Tag("python")
tags = {tag}
tag.name = "java"             # the hash changes while the object sits in the set
print(tag in tags)            # False: the set looks in the wrong slot`, lang: "python", caption: "Why the hash must never change" },
        { ul: [
          "**The contract**: if `a == b`, then `hash(a) == hash(b)`. The opposite is not required: different objects may share a hash (a collision).",
          "If you define `__eq__` and not `__hash__`, Python sets `__hash__` to `None` and the objects become unhashable. This stops you from breaking the contract by accident.",
          "**Never hash a field that can change.** That is the real reason the mutable built-ins are unhashable.",
          "The easy way: `@dataclass(frozen=True)` writes a correct `__eq__` and `__hash__` for you.",
          "String hashes are **randomised per process**, so that attackers cannot force collisions. `hash('abc')` is different on every run, so never store it or send it anywhere. Use `hashlib` for a stable hash."
        ] },
        { note: "💡 Say it like this: 'Hashable means the object has a stable hash and supports equality, and equal objects must have equal hashes. Dicts and sets depend on that. So if I override __eq__, I also override __hash__ using the same immutable fields, or I use a frozen dataclass.'", kind: "tip" }
      ]
    },

    {
      id: "bytecode-and-dis",
      q: "What is Python bytecode? How can you look at it?",
      tldr: "Bytecode is the list of simple instructions that the Python compiler produces from your source code and that the CPython virtual machine executes. You can see it with the `dis` module, and Python caches it in `.pyc` files so that modules do not have to be compiled again on the next run.",
      tags: ["internals", "bytecode", "performance"],
      seeAlso: ["python-basic/how-python-runs", "python-advanced/profiling-and-performance"],
      a: [
        { code: `import dis

def add(a, b):
    return a + b

dis.dis(add)`, lang: "python" },
        { code: `LOAD_FAST      a        push the value of a on the stack
LOAD_FAST      b        push the value of b
BINARY_OP      +        pop both, add them, push the result
RETURN_VALUE            pop the result and return it`, lang: "text", caption: "The output, simplified. The exact instructions change between versions" },
        { ul: [
          "The virtual machine is a **stack machine**: instructions push values on a stack, and operations pop them and push the result.",
          "Compiling is automatic. For imported modules the result is saved as a `.pyc` file in `__pycache__`, and it is reused as long as the source file has not changed.",
          "A `.pyc` file is **not machine code**, and it does not make the program run faster. It only makes it **start** faster.",
          "Bytecode is an implementation detail of CPython. It changes in every release, so a `.pyc` from one version does not work in another.",
          "`func.__code__` is the **code object**: it holds the bytecode (`co_code`), the constants (`co_consts`) and the variable names (`co_varnames`)."
        ] },
        { p: "**Why it matters for performance:**" },
        { ul: [
          "Since Python 3.11 the interpreter is **specialising and adaptive**: when an instruction keeps seeing the same types, for example `int + int`, it is quietly replaced by a faster version made for those types. This made 3.11 about 25% faster than 3.10 on average.",
          "Python 3.13 added an **experimental JIT compiler** that turns hot bytecode into machine code. It is still experimental.",
          "`dis` explains small surprises, such as why a local variable is faster than a global one: `LOAD_FAST` reads from an array, while `LOAD_GLOBAL` looks a name up in a dictionary."
        ] },
        { note: "💡 Say it like this: 'Python compiles source to bytecode, which is a set of instructions for a stack-based virtual machine. I can inspect it with the dis module. It is cached in pyc files for a faster start, and since 3.11 the interpreter specialises hot instructions for the types it sees.'", kind: "tip" }
      ]
    },

    {
      id: "new-vs-init",
      q: "What is the difference between `__new__` and `__init__`?",
      tldr: "`__new__` creates the object and returns it. `__init__` then receives that object and fills it in. You almost always write only `__init__`. You override `__new__` in special cases: subclassing an immutable type such as int, str or tuple, or controlling which object is returned, as in a singleton.",
      tags: ["oop", "dunder", "object-model"],
      seeAlso: ["python-basic/classes-and-objects", "python-advanced/metaclasses"],
      a: [
        { table: { head: ["", "`__new__`", "`__init__`"], rows: [
          ["Job", "**Create** the object", "**Initialise** the object"],
          ["First argument", "`cls` (the class)", "`self` (the new object)"],
          ["Returns", "The new object", "Nothing (`None`)"],
          ["Runs", "First", "Second, and only if `__new__` returned an object of that class"],
          ["How often you write it", "Rarely", "Almost always"]
        ] } },
        { code: `class Demo:
    def __new__(cls, *args, **kwargs):
        print("1. __new__ creates the object")
        return super().__new__(cls)

    def __init__(self, value):
        print("2. __init__ fills it in")
        self.value = value

d = Demo(42)     # means: obj = Demo.__new__(Demo, 42), and then obj.__init__(42)`, lang: "python" },
        { p: "**Use 1: an immutable type.** By the time `__init__` runs, an `int`, `str` or `tuple` already has its value and cannot be changed. So the value must be set in `__new__`:" },
        { code: `class Celsius(float):
    def __new__(cls, value):
        if value < -273.15:
            raise ValueError("below absolute zero")
        return super().__new__(cls, value)

t = Celsius(21.5)
print(t + 1)                     # 22.5   it still behaves like a float
print(isinstance(t, float))      # True`, lang: "python" },
        { p: "**Use 2: a singleton**, where every call returns the same object:" },
        { code: `class Settings:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

print(Settings() is Settings())      # True`, lang: "python" },
        { ul: [
          "`__init__` still runs on **every** `Settings()` call, even though the object is the same one. Keep that in mind if `__init__` resets attributes.",
          "In Python the simplest singleton is a **module**: a module is created once and shared by every import. Put the object in a module and import it.",
          "Other uses of `__new__`: caching instances, and returning a different class from a factory."
        ] },
        { note: "💡 Say it like this: '__new__ is the real constructor: it allocates and returns the instance. __init__ is the initializer that sets attributes on it. I override __new__ only for immutable types, or when I must control instance creation, like a singleton.'", kind: "tip" }
      ]
    },

    {
      id: "metaclasses",
      q: "What is a metaclass?",
      tldr: "A metaclass is the class of a class. A class creates objects, and a metaclass creates classes. The default metaclass is `type`. You write your own to change or check a class at the moment it is defined. It is rarely needed, because class decorators and `__init_subclass__` cover most cases.",
      tags: ["metaprogramming", "object-model"],
      seeAlso: ["python-advanced/new-vs-init", "python-advanced/descriptors", "python-intermediate/abstract-base-classes"],
      a: [
        { code: `class Dog:
    pass

d = Dog()
print(type(d))        # <class '__main__.Dog'>   d is an instance of Dog
print(type(Dog))      # <class 'type'>           Dog is an instance of type

# A class statement is the same as calling type() with three arguments
Cat = type("Cat", (), {"sound": "meow"})      # name, base classes, attributes
print(Cat().sound)    # meow`, lang: "python" },
        { p: "So `type` is a class whose instances are classes. A **custom metaclass** inherits from `type` and hooks into the creation of a class:" },
        { code: `class PluginMeta(type):
    registry = {}

    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        if bases:                                # skip the base class itself
            mcs.registry[name.lower()] = cls     # register every subclass
        return cls

class Plugin(metaclass=PluginMeta):
    pass

class CsvExport(Plugin):
    pass

class PdfExport(Plugin):
    pass

print(list(PluginMeta.registry))      # ['csvexport', 'pdfexport']`, lang: "python" },
        { p: "The same result without a metaclass, with `__init_subclass__`. This is what you should try first:" },
        { code: `class Plugin:
    registry = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        Plugin.registry[cls.__name__.lower()] = cls

class CsvExport(Plugin):
    pass

print(list(Plugin.registry))          # ['csvexport']`, lang: "python" },
        { ul: [
          "**Where metaclasses are used**: frameworks and the standard library. Django models, `abc.ABC` (its metaclass is `ABCMeta`) and `Enum` all use one to turn a simple class body into something richer.",
          "**What a metaclass can do**: register classes, check that required methods or attributes exist, add or change methods, and change how instances are created (by defining `__call__`).",
          "**The cost**: the code is harder to read and debug, and two different metaclasses on one class conflict.",
          "The order to try things: a plain function, then a **class decorator**, then `__init_subclass__`, and only then a metaclass."
        ] },
        { note: "A well-known piece of advice from the Python core team: metaclasses are deeper magic than most people ever need. If you are not sure that you need one, you do not.", kind: "tip" },
        { note: "💡 Say it like this: 'A metaclass is the class of a class, and type is the default one. It lets me hook into class creation, for example to register or validate subclasses. Frameworks like Django use it. In my own code I prefer a class decorator or __init_subclass__, which solve most of the same problems more simply.'", kind: "tip" }
      ]
    },

    {
      id: "descriptors",
      q: "What is a descriptor?",
      tldr: "A descriptor is an object with `__get__`, `__set__` or `__delete__` methods that is stored as a class attribute. When you read or write that attribute on an instance, Python calls those methods instead. Properties, methods, classmethod and staticmethod are all built on descriptors.",
      tags: ["metaprogramming", "object-model", "dunder"],
      seeAlso: ["python-intermediate/property", "python-advanced/attribute-lookup"],
      a: [
        { p: "A `@property` handles **one** attribute. A descriptor is the reusable version: write the logic once and use it for many attributes, in many classes." },
        { code: `class Positive:
    def __set_name__(self, owner, name):         # called once, when the class is created
        self.name = "_" + name

    def __get__(self, obj, objtype=None):
        if obj is None:                          # accessed on the class itself
            return self
        return getattr(obj, self.name)

    def __set__(self, obj, value):
        if value <= 0:
            raise ValueError("must be positive")
        setattr(obj, self.name, value)

class Product:
    price = Positive()               # one descriptor object per attribute
    quantity = Positive()

    def __init__(self, price, quantity):
        self.price = price           # runs Positive.__set__
        self.quantity = quantity

p = Product(100, 2)
print(p.price * p.quantity)          # 200   runs Positive.__get__ twice
p.price = -5                         # ValueError: must be positive`, lang: "python" },
        { table: { head: ["Kind", "Has", "Wins over the instance's own `__dict__`?", "Examples"], rows: [
          ["**Data descriptor**", "`__set__` or `__delete__`", "Yes", "`property`, and the example above"],
          ["**Non-data descriptor**", "Only `__get__`", "No", "Functions (methods), `classmethod`, `staticmethod`"]
        ] } },
        { ul: [
          "**How methods work**: a function is a non-data descriptor. `obj.method` calls the function's `__get__`, which returns a **bound method** with `self` already filled in. That is the whole mechanism behind `self`.",
          "A descriptor only works as a **class** attribute. Stored on an instance, it is just an ordinary object.",
          "`__set_name__` (3.6+) tells the descriptor which attribute name it was given.",
          "Store the data **on the instance**, not on the descriptor. The descriptor object is shared by all instances of the class.",
          "Real uses: `property`, ORM fields (`models.CharField` in Django), validated fields, and lazy or cached attributes (`functools.cached_property`)."
        ] },
        { note: "💡 Say it like this: 'A descriptor is an object that customises attribute access through __get__ and __set__. It lives on the class, and Python calls it when the attribute is used on an instance. property is one, and methods are too. I write my own when I need the same validation or computed logic on many attributes.'", kind: "tip" }
      ]
    },

    {
      id: "attribute-lookup",
      q: "How does attribute lookup work? What is the difference between `__getattr__` and `__getattribute__`?",
      tldr: "`__getattribute__` runs on every attribute access and does the normal search: data descriptors on the class, then the instance's own `__dict__`, then the rest of the class and its parents. `__getattr__` is only the fallback, which runs when that normal search finds nothing.",
      tags: ["object-model", "dunder", "metaprogramming"],
      seeAlso: ["python-advanced/descriptors", "python-intermediate/class-vs-instance-variables", "python-advanced/slots"],
      a: [
        { p: "When you write `obj.name`, Python looks in this order:" },
        { ol: [
          "A **data descriptor** called `name` on the class or one of its parents (in MRO order), for example a `property`.",
          "The instance's own `obj.__dict__`.",
          "A **non-data descriptor** or a plain attribute on the class or its parents: methods and class variables.",
          "If nothing was found: `__getattr__(name)`, if the class defines it.",
          "Otherwise: `AttributeError`."
        ] },
        { table: { head: ["", "`__getattribute__`", "`__getattr__`"], rows: [
          ["Called", "On **every** attribute access", "**Only** when the normal lookup fails"],
          ["By default", "Does the search above", "Does not exist"],
          ["Risk", "Easy to cause endless recursion", "Low"],
          ["Use", "Very rare", "Proxies, wrappers, lazy loading, dynamic attributes"]
        ] } },
        { code: `class LoggingProxy:
    """Wraps another object and logs every attribute that is passed on to it."""

    def __init__(self, real):
        self._real = real

    def __getattr__(self, name):          # only for names that are not found normally
        print(f"forwarding {name}")
        return getattr(self._real, name)

proxy = LoggingProxy("hello")     # a str stands in for the real object
print(proxy._real)                # hello   found normally: __getattr__ is NOT called
shout = proxy.upper               # prints: forwarding upper
print(shout())                    # HELLO`, lang: "python", caption: "__getattr__: a simple proxy" },
        { code: `class Tracked:
    def __getattribute__(self, name):
        print(f"reading {name}")
        return super().__getattribute__(name)     # never write self.name here: endless loop

t = Tracked()
t.x = 1
t.x                    # prints: reading x`, lang: "python", caption: "__getattribute__: sees everything" },
        { ul: [
          "The matching hooks for writing and deleting are `__setattr__` and `__delattr__`. They run on **every** assignment, so inside them use `super().__setattr__(...)`.",
          "`getattr(obj, 'name', default)`, `setattr`, `hasattr` and `delattr` do the same things with the name as a string.",
          "Lookups made by syntax, such as `len(obj)` or `obj + 1`, look for the special method on the **class** and skip both hooks.",
          "Inside `__getattr__`, be careful with an attribute that may not exist yet, such as `self._real` during copying or unpickling. The lookup calls `__getattr__` again and recurses forever.",
          "A module can have its own `__getattr__` function (3.7+), used for lazy loading and deprecation warnings."
        ] },
        { note: "💡 Say it like this: '__getattribute__ is called for every attribute access and implements the normal lookup: data descriptors, then the instance dictionary, then the class. __getattr__ is only the fallback when nothing is found, which makes it the safe one to override for proxies and dynamic attributes.'", kind: "tip" }
      ]
    },

    {
      id: "slots",
      q: "What is `__slots__` and when would you use it?",
      tldr: "`__slots__` is a class attribute that lists the only attribute names an instance may have. Python then stores them in fixed positions instead of a per-instance dictionary, which saves memory and makes attribute access slightly faster. The price is that you cannot add other attributes later.",
      tags: ["memory", "performance", "object-model"],
      seeAlso: ["python-advanced/attribute-lookup", "python-intermediate/dataclasses", "python-advanced/memory-leaks"],
      a: [
        { code: `class PointDict:
    def __init__(self, x, y):
        self.x, self.y = x, y

class PointSlots:
    __slots__ = ("x", "y")

    def __init__(self, x, y):
        self.x, self.y = x, y

a = PointDict(1, 2)
b = PointSlots(1, 2)

print(hasattr(a, "__dict__"))      # True
print(hasattr(b, "__dict__"))      # False: there is no per-instance dictionary

a.z = 3                            # fine: a normal object accepts new attributes
b.z = 3                            # AttributeError: 'PointSlots' object has no attribute 'z'`, lang: "python" },
        { code: `import tracemalloc

def bytes_per_object(cls, count=100_000):
    tracemalloc.start()
    items = [cls(1.5, 2.5) for _ in range(count)]
    size, _ = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return round(size / count)

print(bytes_per_object(PointDict))      # 104   on Python 3.11
print(bytes_per_object(PointSlots))     # 56    about half`, lang: "python", caption: "Measuring the saving (the numbers differ between versions)" },
        { ul: [
          "**Why it saves memory**: a normal object carries a `__dict__` that can hold any attribute. With slots, Python reserves room for exactly the named attributes.",
          "**When it is worth it**: a class with **very many instances** (hundreds of thousands of points, rows, nodes or events). For a few objects it makes no difference.",
          "**What you lose**: no new attributes at run time, no weak references unless you add `'__weakref__'` to the slots, and tools that need `__dict__` may not work.",
          "**Inheritance**: every class in the chain must define `__slots__`. If one parent does not, the instances get a `__dict__` again and the saving is gone.",
          "A useful side effect: a typo such as `obj.nmae = 1` raises an error instead of silently creating a new attribute.",
          "The easy way: `@dataclass(slots=True)` (3.10+)."
        ] },
        { note: "💡 Say it like this: '__slots__ replaces the per-instance dictionary with fixed storage for the listed attributes. I use it when I create a huge number of small objects, to cut memory and speed up attribute access. The trade-off is that I cannot add new attributes dynamically.'", kind: "tip" }
      ]
    },

    {
      id: "monkey-patching",
      q: "What is monkey patching? When is it acceptable?",
      tldr: "Monkey patching means replacing or adding a function, method or attribute of an existing module or class while the program is running, without touching its source code. It is fine in tests, where you swap a real dependency for a fake one, and risky in production code, because it changes behaviour for everyone in a hidden way.",
      tags: ["metaprogramming", "testing"],
      seeAlso: ["python-intermediate/unit-testing", "python-advanced/attribute-lookup"],
      a: [
        { code: `class Greeter:
    def greet(self):
        return "Hello"

def excited_greet(self):
    return "HELLO!!!"

g = Greeter()
print(g.greet())                   # Hello

Greeter.greet = excited_greet      # replace the method on the class, at run time
print(g.greet())                   # HELLO!!!   even existing objects change`, lang: "python" },
        { p: "It works because classes and modules are ordinary mutable objects, and a method is looked up by name at the moment it is called." },
        { p: "**The good use: tests.** Replace something slow or external for the length of one test, and let the tool put the original back afterwards:" },
        { code: `import time
from unittest.mock import patch

def seconds_since(start):
    return time.time() - start

with patch("time.time", return_value=1000.0):      # time.time() is fake inside this block
    print(seconds_since(990.0))                     # 10.0

print(time.time() > 1_000_000)                      # True: the real function is back`, lang: "python" },
        { ul: [
          "With pytest, the `monkeypatch` fixture does the same: `monkeypatch.setattr(module, 'name', fake)` or `monkeypatch.setenv('KEY', 'value')`, and it undoes everything after the test.",
          "**Patch where the name is looked up**, not where it is defined. If `orders.py` does `from payments import charge`, patch `orders.charge`.",
          "Other real uses: a hot fix for a bug in a third-party library until the real fix is released, and libraries such as `gevent` that patch the standard library to make it cooperative."
        ] },
        { p: "**Why to avoid it in production code:**" },
        { ul: [
          "The behaviour no longer matches the source code that a reader sees.",
          "It is global: every user of that class or module is affected, including other libraries.",
          "It can break silently when the patched library is upgraded.",
          "It does not work on built-in types written in C: `str.upper = ...` raises `TypeError`."
        ] },
        { note: "💡 Say it like this: 'Monkey patching is changing a class or module at run time, for example replacing a method. I use it in tests through unittest.mock.patch or the monkeypatch fixture of pytest, which restore the original afterwards. In production code I avoid it and prefer subclassing or dependency injection.'", kind: "tip" }
      ]
    },

    {
      id: "advanced-decorators",
      q: "How do you write a decorator that takes arguments? What is a class-based decorator?",
      tldr: "A decorator with arguments needs one more level of nesting: an outer function takes the arguments and returns the real decorator. A class-based decorator is a class whose instances are callable through `__call__`, which is handy when the decorator needs to keep state.",
      tags: ["decorators", "functions", "metaprogramming"],
      seeAlso: ["python-intermediate/decorators", "python-intermediate/closures", "python-advanced/functools-tools"],
      a: [
        { code: `import functools
import time

def retry(times=3, delay=0.0):                  # 1. takes the arguments
    def decorator(func):                        # 2. takes the function
        @functools.wraps(func)
        def wrapper(*args, **kwargs):           # 3. takes the call
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except ConnectionError:
                    if attempt == times:
                        raise                   # out of attempts: pass the error on
                    time.sleep(delay)
        return wrapper
    return decorator

calls = 0

@retry(times=3)
def fetch():
    global calls
    calls += 1
    if calls < 3:
        raise ConnectionError("network down")
    return "data"

print(fetch(), calls)         # data 3   it failed twice and worked the third time`, lang: "python" },
        { p: "Read `@retry(times=3)` in two steps: first `retry(times=3)` runs and returns `decorator`, and then `decorator(fetch)` runs. So it means `fetch = retry(times=3)(fetch)`." },
        { p: "**A class-based decorator** keeps its state in the instance:" },
        { code: `import functools

class CountCalls:
    def __init__(self, func):
        functools.update_wrapper(self, func)      # the class version of functools.wraps
        self.func = func
        self.count = 0

    def __call__(self, *args, **kwargs):          # makes the instance callable
        self.count += 1
        return self.func(*args, **kwargs)

@CountCalls
def greet(name):
    return f"Hello {name}"

greet("Asha")
greet("Ravi")
print(greet.count)            # 2`, lang: "python" },
        { p: "**Stacking**: decorators are applied from the bottom up, so the top one becomes the outer layer." },
        { code: `def bold(func):
    return lambda: "<b>" + func() + "</b>"

def italic(func):
    return lambda: "<i>" + func() + "</i>"

@bold            # applied second: the outer layer
@italic          # applied first: the inner layer
def text():
    return "hi"

print(text())    # <b><i>hi</i></b>     the same as: text = bold(italic(text))`, lang: "python" },
        { ul: [
          "A decorator can also be put on a **class**: it receives the class and returns it, changed or wrapped. `@dataclass` is one.",
          "For type checkers, use `ParamSpec` and `TypeVar` so that the wrapper keeps the parameter and return types of the original function.",
          "A simple class-based decorator does not work on **methods** without extra code, because the object is not passed in as `self`. A function-based decorator is the safer default."
        ] },
        { note: "💡 Say it like this: 'A decorator with arguments is a function that returns a decorator, so there are three levels: arguments, function, call. For a decorator that keeps state I can use a class with __call__. When decorators are stacked, the one nearest the function is applied first.'", kind: "tip" }
      ]
    },

    {
      id: "functools-tools",
      q: "What does `functools` offer? Explain `lru_cache`, `partial` and `singledispatch`.",
      tldr: "functools holds helpers for working with functions. lru_cache remembers the results of a function so that repeated calls with the same arguments are instant, partial pre-fills some arguments of a function, and singledispatch picks an implementation based on the type of the first argument.",
      tags: ["functools", "caching", "standard-library"],
      seeAlso: ["python-advanced/advanced-decorators", "python-advanced/profiling-and-performance", "python-advanced/memory-leaks"],
      a: [
        { code: `from functools import lru_cache

@lru_cache(maxsize=None)           # or simply @functools.cache (3.9+)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(80))                     # 23416728348467685   instant: each fib(n) runs only once
print(fib.cache_info())            # CacheInfo(hits=78, misses=81, maxsize=None, currsize=81)
fib.cache_clear()`, lang: "python", caption: "lru_cache: memoization" },
        { ul: [
          "The arguments are used as a dictionary key, so they must be **hashable**: no lists or dicts.",
          "`maxsize` limits how many results are kept (128 by default). The **l**east **r**ecently **u**sed ones are thrown away first.",
          "Only cache **pure** functions: the same input gives the same output, with no side effects.",
          "On a **method** the cache holds a reference to `self`, so those objects are never freed while the cache is alive. For a value per object, use `cached_property`."
        ] },
        { code: `from functools import partial, singledispatch, cached_property

# partial: fix some arguments now, pass the rest later
def power(base, exponent):
    return base ** exponent

square = partial(power, exponent=2)
print(square(7))                   # 49

# singledispatch: one function name, a different body per argument type
@singledispatch
def describe(value):
    return "something"

@describe.register
def _(value: int):
    return "a number"

@describe.register
def _(value: list):
    return f"a list of {len(value)} items"

print(describe(5))                 # a number
print(describe([1, 2]))            # a list of 2 items
print(describe("hi"))              # something

# cached_property: worked out once per object, then stored on it
class Report:
    def __init__(self, rows):
        self.rows = rows

    @cached_property
    def total(self):
        print("calculating")
        return sum(self.rows)

r = Report([1, 2, 3])
first = r.total                    # prints: calculating
print(first, r.total)              # 6 6   the second read does not calculate again`, lang: "python" },
        { table: { head: ["Tool", "What it does"], rows: [
          ["`lru_cache`, `cache`", "Memoization: remember results by argument"],
          ["`cached_property`", "A property that is computed once per instance"],
          ["`partial`", "A new function with some arguments already filled in"],
          ["`wraps`", "Makes the wrapper in a decorator keep the name and docstring of the original"],
          ["`reduce`", "Folds a sequence into one value"],
          ["`singledispatch`", "Function overloading on the type of the first argument"],
          ["`total_ordering`", "Write `__eq__` and `__lt__`, and get the other comparisons for free"]
        ] } },
        { note: "💡 Say it like this: 'functools is the toolbox for higher-order functions. I use lru_cache to memoize expensive pure functions, partial to pre-fill arguments, wraps in every decorator, and singledispatch when I want one function to behave differently per type.'", kind: "tip" }
      ]
    },

    {
      id: "generators-advanced",
      q: "What do `send()`, `throw()`, `close()` and `yield from` do in a generator?",
      tldr: "A generator is not only a producer of values. `send()` passes a value into it at the point where it paused, `throw()` raises an exception there, and `close()` stops it. `yield from` hands control to another generator and passes values, sent values and the final return value through.",
      tags: ["generators", "coroutines"],
      seeAlso: ["python-intermediate/generators", "python-advanced/asyncio-basics", "python-advanced/lazy-pipelines"],
      a: [
        { p: "`yield` is an **expression**: it gives a value out, and when the generator is resumed it evaluates to whatever was sent in." },
        { code: `def running_average():
    total, count, average = 0, 0, None
    while True:
        value = yield average         # give out the average, then wait for a value
        total += value
        count += 1
        average = total / count

avg = running_average()
next(avg)                     # 'prime' it: run up to the first yield
print(avg.send(10))           # 10.0
print(avg.send(20))           # 15.0
print(avg.send(60))           # 30.0
avg.close()                   # raises GeneratorExit inside the generator, so it stops`, lang: "python" },
        { table: { head: ["Call", "What happens inside the generator"], rows: [
          ["`next(gen)`", "It resumes. The paused `yield` evaluates to `None`"],
          ["`gen.send(x)`", "It resumes. The paused `yield` evaluates to `x`"],
          ["`gen.throw(Error)`", "`Error` is raised at the paused `yield`"],
          ["`gen.close()`", "`GeneratorExit` is raised at the paused `yield`, so `finally` and `with` blocks can clean up"]
        ] } },
        { p: "**`yield from`** delegates to another iterable or generator:" },
        { code: `def flatten(items):
    for item in items:
        if isinstance(item, list):
            yield from flatten(item)      # hand over to a sub-generator
        else:
            yield item

print(list(flatten([1, [2, [3, 4]], 5])))      # [1, 2, 3, 4, 5]

def inner():
    yield 1
    yield 2
    return "inner is done"                # becomes the value of 'yield from'

def outer():
    result = yield from inner()
    yield result

print(list(outer()))                      # [1, 2, 'inner is done']`, lang: "python" },
        { ul: [
          "`yield from x` is more than `for v in x: yield v`. It also forwards `send()`, `throw()` and `close()` to the inner generator, and it captures its `return` value.",
          "A `return value` inside a generator ends it and attaches the value to the `StopIteration` exception.",
          "A generator that receives values through `send()` is a **coroutine** in the old sense. This is the mechanism that `async` and `await` were built on: `await` is the modern, cleaner form of `yield from`.",
          "Async code has **async generators** too: an `async def` with `yield` in it, consumed with `async for`."
        ] },
        { note: "💡 Say it like this: 'send() resumes a generator and makes the paused yield return a value, so data can flow in as well as out. yield from delegates to a sub-generator and forwards everything, including its return value. That two-way pausing is the idea that async and await grew out of.'", kind: "tip" }
      ]
    },

    {
      id: "lazy-pipelines",
      q: "How do you process a very large file or data stream without running out of memory?",
      tldr: "Do not load it all. Read it lazily, one line or one chunk at a time, and pass the data through a chain of generators, so that only one item is in memory at any moment. itertools gives ready-made building blocks for such pipelines.",
      tags: ["generators", "itertools", "memory"],
      seeAlso: ["python-intermediate/generators", "python-advanced/generators-advanced", "python-advanced/memory-leaks"],
      a: [
        { code: `def read_lines(path):
    with open(path, encoding="utf-8") as f:
        for line in f:                    # a file object is lazy: one line at a time
            yield line.rstrip("\\n")

def only_errors(lines):
    return (line for line in lines if " ERROR " in line)

def parse(lines):
    for line in lines:
        timestamp, level, message = line.split(" ", 2)
        yield {"time": timestamp, "level": level, "message": message}

# Nothing has been read yet: these are only connected stages
pipeline = parse(only_errors(read_lines("app.log")))

for record in pipeline:                   # each line flows through every stage, one by one
    print(record["message"])`, lang: "python" },
        { p: "The memory used is the size of **one line**, whether the file has a thousand lines or a billion." },
        { table: { head: ["Instead of", "Use", "Why"], rows: [
          ["`f.read()`, `f.readlines()`", "`for line in f`", "The whole file is not loaded"],
          ["A list comprehension `[...]`", "A generator expression `(...)`", "The whole result is not built"],
          ["`cursor.fetchall()`", "Looping over the cursor, or `fetchmany(1000)`", "Rows arrive in batches"],
          ["`json.load()` on a huge file", "JSON Lines (one object per line), or a streaming parser such as `ijson`", "No giant tree in memory"],
          ["`pandas.read_csv(path)`", "`read_csv(path, chunksize=100_000)`", "One chunk at a time"],
          ["`requests.get(url).content`", "`stream=True` with `iter_content()`", "The download is not held in memory"]
        ] } },
        { code: `from itertools import islice, chain, groupby

squares = (n * n for n in range(1_000_000_000))      # a billion squares, none built yet

print(list(islice(squares, 5)))            # [0, 1, 4, 9, 16]   take only the first five
print(list(chain([1, 2], (3, 4))))         # [1, 2, 3, 4]       several iterables as one

for size, group in groupby(["a", "b", "cc", "dd", "eee"], key=len):
    print(size, list(group))               # 1 ['a', 'b'], then 2 ['cc', 'dd'], then 3 ['eee']

from itertools import batched              # Python 3.12+
for chunk in batched(range(7), 3):
    print(chunk)                           # (0, 1, 2), then (3, 4, 5), then (6,)`, lang: "python", caption: "itertools: lazy building blocks" },
        { ul: [
          "For binary data, read **fixed-size chunks**: `while chunk := f.read(64 * 1024):`.",
          "Aggregate **as you go** (a running sum, a `Counter`, `heapq.nlargest`) instead of collecting everything first and calculating afterwards.",
          "A generator can be consumed only **once**, and you cannot ask for its length or index into it. If you need those, the data has to be in memory or in a database.",
          "If the data really must be sorted or joined and does not fit in memory, that is a job for a database or a tool such as DuckDB, Polars or Spark."
        ] },
        { note: "💡 Say it like this: 'I never read a huge file at once. I iterate over it line by line and chain generators, so each record flows through the whole pipeline before the next one is read. Memory stays constant however big the input is. itertools gives me islice, chain and groupby for the common steps.'", kind: "tip" }
      ]
    },

    {
      id: "free-threading",
      q: "How does the GIL actually work? What is free-threaded (no-GIL) Python?",
      tldr: "In the normal build, a thread must hold the GIL to run bytecode. It gives the lock up when it blocks on I/O, and it is asked to give it up after a short time slice (5 ms by default) so that another thread can run. Free-threaded Python is a separate build of CPython, available since 3.13, that removes the GIL so that threads can use several CPU cores at once.",
      tags: ["concurrency", "gil", "internals"],
      seeAlso: ["python-intermediate/gil", "python-advanced/thread-safety", "python-advanced/multiprocessing"],
      a: [
        { p: "**How the GIL is handed over:**" },
        { ul: [
          "**Blocking calls release it.** Reading a socket or a file, `time.sleep()`, waiting for a lock: the C code releases the GIL around the wait, so other threads run.",
          "**A time slice forces it.** A thread that keeps computing is asked to drop the GIL after the **switch interval**, which is 5 milliseconds by default. It can only be switched between bytecode instructions, never in the middle of one.",
          "**C extensions can release it** around long calculations that do not touch Python objects. NumPy, compression and hashing libraries do this, which is why they scale across threads."
        ] },
        { code: `import sys

print(sys.getswitchinterval())            # 0.005   seconds: the time slice of a thread

# Python 3.13+: is this interpreter running with the GIL right now?
if hasattr(sys, "_is_gil_enabled"):
    print(sys._is_gil_enabled())          # True on the normal build, False without the GIL`, lang: "python" },
        { p: "**Free-threaded Python (PEP 703):**" },
        { table: { head: ["Version", "Status"], rows: [
          ["3.12 and older", "GIL only"],
          ["3.13", "A free-threaded build is available, marked **experimental**"],
          ["3.14", "The free-threaded build is **officially supported**, and still optional"],
          ["The default `python` you install", "Still has the GIL"]
        ] } },
        { ul: [
          "It is a **separate executable**, often named `python3.13t` or `python3.14t`. You choose it when you install Python.",
          "**What you gain**: threads run Python code on several cores at the same time, so CPU-bound work can scale with threads instead of processes, and with shared memory.",
          "**What it costs**: single-threaded code is somewhat slower and uses more memory, because reference counting must now be safe across threads.",
          "**Extensions must opt in.** If you import a C extension that has not declared itself safe, the interpreter turns the GIL back on for that process.",
          "**Your code needs more care.** Built-in types have their own internal locks, so a list will not be corrupted. But logic that only worked because of the GIL (check then act, unprotected counters) now races for real. Use locks."
        ] },
        { p: "Another route to parallelism is **sub-interpreters**: several isolated interpreters in one process, each with its own GIL (since 3.12), usable from Python code through `concurrent.interpreters` since 3.14." },
        { note: "💡 Say it like this: 'A thread holds the GIL to run bytecode. It releases it on blocking I/O, and after a five-millisecond switch interval so that other threads get a turn. Since 3.13 there is a free-threaded build without the GIL, officially supported from 3.14, where threads really run in parallel, at some cost in single-thread speed, and extensions have to support it.'", kind: "tip" }
      ]
    },

    {
      id: "asyncio-basics",
      q: "How does asyncio work? What are coroutines, tasks and the event loop?",
      tldr: "asyncio runs many pieces of work in one thread by switching between them whenever one of them is waiting. A coroutine is a function defined with async def that can pause at an await. The event loop is the scheduler that runs coroutines and wakes them up when what they wait for is ready. A task is a coroutine that has been handed to the loop to run alongside the others.",
      tags: ["asyncio", "concurrency", "async"],
      seeAlso: ["python-intermediate/threads-processes-asyncio", "python-advanced/asyncio-patterns", "python-advanced/generators-advanced"],
      a: [
        { table: { head: ["Term", "What it is"], rows: [
          ["**Coroutine function**", "A function defined with `async def`"],
          ["**Coroutine object**", "What you get by calling it. Nothing runs until it is awaited or made into a task"],
          ["**`await`**", "'Pause me here until this is finished, and let other work run in the meantime'"],
          ["**Event loop**", "The scheduler: it runs ready coroutines one at a time, and watches for finished I/O and timers"],
          ["**Task**", "A coroutine scheduled on the loop, so it runs concurrently with the others"],
          ["**Awaitable**", "Anything that can be awaited: a coroutine, a task or a future"]
        ] } },
        { code: `import asyncio
import time

async def fetch(name, seconds):
    print(f"{name} started")
    await asyncio.sleep(seconds)           # pause here: the loop runs other tasks
    print(f"{name} finished")
    return name.upper()

async def main():
    start = time.perf_counter()

    # One after the other: 2 seconds in total
    await fetch("a", 1)
    await fetch("b", 1)

    # Concurrently, as tasks: 1 second in total
    task1 = asyncio.create_task(fetch("c", 1))
    task2 = asyncio.create_task(fetch("d", 1))
    results = [await task1, await task2]

    print(results, f"{time.perf_counter() - start:.0f}s")      # ['C', 'D'] 3s

asyncio.run(main())                        # start the loop, run main(), close the loop`, lang: "python" },
        { ul: [
          "**One thread, cooperative switching.** A task runs until it reaches an `await` that has to wait. Only then can the loop run something else. Nothing is interrupted in the middle.",
          "**Calling a coroutine function does not run it.** `fetch('a', 1)` on its own only creates a coroutine object, and Python warns that it 'was never awaited'.",
          "**`await` alone is not concurrency.** Awaiting one coroutine after another is sequential. You need tasks (`create_task`, `gather`, `TaskGroup`) to make them overlap.",
          "`await` is only allowed inside `async def`. `asyncio.run()` is the bridge from normal code into async code."
        ] },
        { note: "**Never block the event loop.** One `time.sleep(5)`, one `requests.get()` or one heavy calculation inside a coroutine freezes **every** task, because there is only one thread. Use the async version (`asyncio.sleep`, `httpx`, `asyncpg`), or move the blocking call to a thread with `await asyncio.to_thread(func)`.", kind: "warn" },
        { p: "asyncio shines when there are **many slow connections at once**: web servers such as FastAPI, API gateways, chat and WebSocket servers, crawlers. It does nothing for CPU-bound work." },
        { note: "💡 Say it like this: 'asyncio is single-threaded cooperative concurrency. A coroutine runs until it awaits something, then the event loop switches to another task and comes back when the awaited thing is ready. It is ideal for many concurrent I/O operations, as long as I never block the loop with a synchronous call.'", kind: "tip" }
      ]
    },

    {
      id: "asyncio-patterns",
      q: "How do you run many coroutines together and handle timeouts, cancellation and errors?",
      tldr: "Use asyncio.gather or, in modern code, a TaskGroup to run coroutines concurrently and wait for all of them. Put slow work inside asyncio.timeout, limit how many run at once with a Semaphore, and remember that cancelling a task raises CancelledError inside it at its next await.",
      tags: ["asyncio", "concurrency", "async"],
      seeAlso: ["python-advanced/asyncio-basics", "python-advanced/exception-groups", "python-advanced/thread-safety"],
      a: [
        { code: `import asyncio

async def fetch(n):
    await asyncio.sleep(0.1)
    if n == 3:
        raise ValueError("bad item 3")
    return n * 10

async def main():
    # gather: the results come back in the order you passed the coroutines
    print(await asyncio.gather(fetch(1), fetch(2)))                 # [10, 20]

    # return_exceptions=True: an error is returned as a value instead of raised
    print(await asyncio.gather(fetch(1), fetch(3), return_exceptions=True))
    # [10, ValueError('bad item 3')]

    # TaskGroup (3.11+): if one task fails, the others are cancelled
    async with asyncio.TaskGroup() as tg:
        t1 = tg.create_task(fetch(1))
        t2 = tg.create_task(fetch(2))
    print(t1.result(), t2.result())                                 # 10 20

asyncio.run(main())`, lang: "python" },
        { table: { head: ["", "`asyncio.gather()`", "`asyncio.TaskGroup` (3.11+)"], rows: [
          ["One task fails", "The error is raised, but the **other tasks keep running**", "The other tasks are **cancelled**, and all the errors are raised together as an `ExceptionGroup`"],
          ["Results", "A list, in call order", "Read `task.result()` after the block"],
          ["Style", "A function call", "An `async with` block: no task outlives the block"],
          ["Use", "A simple fan-out, or when you want every result with `return_exceptions=True`", "The default choice in new code. This style is called **structured concurrency**"]
        ] } },
        { code: `import asyncio

async def slow():
    await asyncio.sleep(10)

async def limited(sem, n):
    async with sem:                        # at most 5 inside this block at a time
        await asyncio.sleep(0.1)
        return n

async def main():
    # Timeout (3.11+): cancels the work inside the block and raises TimeoutError
    try:
        async with asyncio.timeout(0.2):
            await slow()
    except TimeoutError:
        print("too slow")

    # Limit concurrency: 20 jobs, 5 at a time
    sem = asyncio.Semaphore(5)
    print(sum(await asyncio.gather(*(limited(sem, n) for n in range(20)))))     # 190

    # Run blocking code in a thread, without freezing the loop
    print(await asyncio.to_thread(sum, range(1_000_000)))                      # 499999500000

    # Cancellation
    task = asyncio.create_task(slow())
    await asyncio.sleep(0)                 # let it start
    task.cancel()                          # raises CancelledError inside slow(), at its await
    try:
        await task
    except asyncio.CancelledError:
        print("cancelled")

asyncio.run(main())`, lang: "python", caption: "Timeouts, limits, threads and cancellation" },
        { ul: [
          "**Keep a reference to every task.** The loop holds tasks only weakly, so a task made with `create_task()` and not stored anywhere can be garbage-collected before it finishes. A `TaskGroup` keeps them for you.",
          "**Cancellation is a normal exception.** If you catch `CancelledError` to clean up, raise it again. Better still, clean up with `try` / `finally` or `async with`.",
          "`asyncio.wait_for(coro, timeout)` is the older way to set a timeout. `asyncio.as_completed()` gives results as they finish.",
          "Shared state is safe **between** awaits, because nothing else runs then. If a change spans an `await`, protect it with `asyncio.Lock`.",
          "For a pipeline of producers and consumers, use `asyncio.Queue`."
        ] },
        { note: "💡 Say it like this: 'I run coroutines concurrently with a TaskGroup, or with gather in older code. TaskGroup cancels the other tasks when one fails and reports all the errors together. I put timeouts around network calls, cap concurrency with a Semaphore, and move blocking calls to a thread with asyncio.to_thread.'", kind: "tip" }
      ]
    },

    {
      id: "thread-safety",
      q: "What is a race condition? How do you make Python code thread-safe?",
      tldr: "A race condition happens when two threads read and change the same data at the same time, and the result depends on which one gets there first. The GIL does not prevent it. You protect shared data with a Lock, or better, you avoid sharing by passing messages through a thread-safe queue.",
      tags: ["threads", "concurrency", "locks"],
      seeAlso: ["python-intermediate/gil", "python-advanced/free-threading", "python-advanced/asyncio-patterns"],
      a: [
        { p: "The classic shape is **check, then act**: a thread checks something, gets paused, and acts later on an answer that is no longer true." },
        { code: `import threading
import time

balance = 100
lock = threading.Lock()

def withdraw_unsafe(amount):
    global balance
    if balance >= amount:             # 1. check
        time.sleep(0.01)              #    slow work: other threads run here
        balance -= amount             # 2. act on an old answer

def withdraw_safe(amount):
    global balance
    with lock:                        # check and act as ONE step
        if balance >= amount:
            time.sleep(0.01)
            balance -= amount

def run(func):
    threads = [threading.Thread(target=func, args=(100,)) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

run(withdraw_unsafe)
print(balance)         # -400   all five passed the check before any of them withdrew

balance = 100
run(withdraw_safe)
print(balance)         # 0      only the first one withdrew`, lang: "python" },
        { table: { head: ["Tool", "Use it for"], rows: [
          ["`threading.Lock`", "Protecting a small critical section. Always use it with `with`"],
          ["`threading.RLock`", "A lock that the **same** thread may take again, for methods that call each other"],
          ["`queue.Queue`", "Passing work between threads safely. Often the best design: no shared state at all"],
          ["`threading.Event`", "One thread signalling others: 'you can start', 'please stop'"],
          ["`threading.Semaphore`", "Allowing at most N threads in a section, for example N connections"],
          ["`threading.local()`", "Data that is separate for each thread"],
          ["`concurrent.futures`", "Thread pools that hand results back, so you rarely need to share anything"]
        ] } },
        { ul: [
          "**The GIL does not make your code thread-safe.** It protects the internals of the interpreter. One operation on a built-in, such as `items.append(x)` or `d[k] = v`, will not corrupt the object, but any **sequence** of steps can be interleaved with another thread.",
          "`counter += 1` is such a sequence: read, add, write. Two threads can read the same value, and then one update is lost. On the free-threaded build, where threads truly run in parallel, bugs like this show up far more often.",
          "**Deadlock**: thread A holds lock 1 and waits for lock 2, while thread B holds lock 2 and waits for lock 1. Avoid it by always taking locks in the **same order**, holding them briefly, and using timeouts.",
          "Keep the locked section **small**, and do not do slow I/O while you hold a lock.",
          "The safest shared data is **immutable** data. The safest design shares nothing: each thread gets its own data and sends results through a queue."
        ] },
        { note: "💡 Say it like this: 'A race condition is when the result depends on the timing of threads touching shared data. The GIL does not save me, because a read-modify-write is several steps. I protect shared state with a Lock used as a context manager, or I avoid shared state and communicate through a Queue. I prevent deadlocks by always acquiring locks in the same order.'", kind: "tip" }
      ]
    },

    {
      id: "multiprocessing",
      q: "How does multiprocessing work? How do processes share data?",
      tldr: "multiprocessing starts separate Python processes, each with its own interpreter, memory and GIL, so CPU-bound work really runs in parallel on several cores. Processes do not share memory: arguments and results are pickled and copied between them, and anything shared must go through a queue, a pipe or shared memory.",
      tags: ["multiprocessing", "concurrency", "performance"],
      seeAlso: ["python-intermediate/threads-processes-asyncio", "python-intermediate/gil", "python-basic/name-main"],
      a: [
        { code: `from concurrent.futures import ProcessPoolExecutor
import math

def is_prime(n):
    if n < 2:
        return False
    return all(n % i for i in range(2, math.isqrt(n) + 1))

def count_primes(bounds):
    start, stop = bounds
    return sum(is_prime(n) for n in range(start, stop))

if __name__ == "__main__":                 # required: see below
    chunks = [(0, 250_000), (250_000, 500_000), (500_000, 750_000), (750_000, 1_000_000)]

    with ProcessPoolExecutor(max_workers=4) as pool:
        print(sum(pool.map(count_primes, chunks)))     # 78498 primes below one million`, lang: "python", caption: "Four chunks of CPU work on four cores" },
        { table: { head: ["Start method", "How a child starts", "Default on", "Notes"], rows: [
          ["`spawn`", "A fresh interpreter that imports your main module again", "Windows and macOS", "Safe, but slower to start. Needs the `__main__` guard"],
          ["`fork`", "A copy of the parent process", "Linux, before 3.14", "Fast, but unsafe if the parent has threads"],
          ["`forkserver`", "A clean helper process forks the children", "Linux, from 3.14", "A safer middle way"]
        ] } },
        { p: "**Sharing data between processes:**" },
        { table: { head: ["Tool", "How it works", "Good for"], rows: [
          ["Arguments and return values", "Pickled, sent, unpickled", "The normal case: send work in, get results out"],
          ["`multiprocessing.Queue`, `Pipe`", "Pickled messages", "Streams of work or results"],
          ["`Value`, `Array`", "A small piece of shared memory with a lock", "Counters, flags, arrays of numbers"],
          ["`shared_memory.SharedMemory`", "A raw block of memory that several processes map", "Big NumPy arrays, with no copying"],
          ["`Manager()`", "A server process owns the objects, and the others use proxies", "Shared dicts and lists. Convenient, but slow"]
        ] } },
        { ul: [
          "**The `if __name__ == '__main__':` guard is required** with `spawn`: each child imports your script again, and without the guard it would start children of its own.",
          "**Everything you send must be picklable.** A lambda, a nested function, an open file or a database connection cannot be sent. Use functions defined at the top level of a module.",
          "**Processes are expensive**: starting one costs time and memory, and so does copying data. For small tasks the overhead is bigger than the gain, so send **big chunks** of work.",
          "For CPU work, use about one worker per core: `os.cpu_count()`.",
          "Global variables are **not** shared. A child that changes one changes only its own copy."
        ] },
        { note: "💡 Say it like this: 'multiprocessing gets around the GIL with separate processes, each with its own interpreter. Data is pickled between them, so I send large chunks of work and keep the functions at module level. On Windows and macOS the spawn start method imports my script again, so the entry point must be under the main guard.'", kind: "tip" }
      ]
    },

    {
      id: "generics",
      q: "What are generics in Python? What is a `TypeVar`?",
      tldr: "Generics let you write a function or class that works with any type while the type checker still knows exactly which type goes in and comes out. A TypeVar is the placeholder for that type. Since Python 3.12 there is a short syntax: `def first[T](items: list[T]) -> T`.",
      tags: ["typing", "generics"],
      seeAlso: ["python-intermediate/type-hints", "python-advanced/protocols"],
      a: [
        { code: `# Python 3.12+: the type parameter goes in square brackets
def first[T](items: list[T]) -> T:
    return items[0]

n = first([1, 2, 3])           # the checker knows: int
s = first(["a", "b"])          # the checker knows: str

class Stack[T]:
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

numbers = Stack[int]()
numbers.push(1)
numbers.push("two")            # the type checker reports an error here. Python still runs it

type Pair[K, V] = tuple[K, V]  # a generic type alias`, lang: "python" },
        { code: `from typing import Generic, TypeVar

T = TypeVar("T")

def first(items: list[T]) -> T:
    return items[0]

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

numbers = Stack[int]()
numbers.push(1)
print(numbers.pop())           # 1`, lang: "python", caption: "The same thing before 3.12. Still very common" },
        { p: "**Limiting what `T` can be:**" },
        { code: `from collections.abc import Hashable
from typing import TypeVar

# A bound: K must be this type or a subclass of it
K = TypeVar("K", bound=Hashable)

def count_items(items: list[K]) -> dict[K, int]:
    counts: dict[K, int] = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts

print(count_items(["a", "b", "a"]))       # {'a': 2, 'b': 1}

# Constraints: Text must be exactly one of these types
Text = TypeVar("Text", str, bytes)

def shout(value: Text) -> Text:
    return value.upper()

print(shout("hi"), shout(b"hi"))          # HI b'HI'`, lang: "python" },
        { ul: [
          "Without generics you would write `list[Any] -> Any` and lose the type. With `T`, the checker connects the input type to the output type.",
          "In the 3.12 syntax, a bound is written `[K: Hashable]` and constraints are written `[Text: (str, bytes)]`.",
          "Generics exist **only for the type checker**. At run time `Stack[int]()` and `Stack[str]()` build the same class, and nothing is checked.",
          "The built-in containers are already generic: `list[int]`, `dict[str, float]`, `tuple[int, ...]`.",
          "Related tools: `ParamSpec` keeps the parameters of a wrapped function (for decorators), `Self` is for methods that return their own class (3.11+), `TypedDict` describes a dict with known keys, and `@overload` declares several signatures."
        ] },
        { note: "💡 Say it like this: 'Generics let me write code that works for any type and still keeps the type information. A TypeVar is a placeholder that links the input type to the output type, like T in a Stack of T. From Python 3.12 I write it in square brackets after the name. It is only for static checking: nothing is enforced at run time.'", kind: "tip" }
      ]
    },

    {
      id: "protocols",
      q: "What is a `Protocol`? How is it different from an abstract base class?",
      tldr: "A Protocol describes which methods and attributes an object must have, and any class that has them matches it without inheriting from anything. It is duck typing that a type checker can verify. An abstract base class is the opposite style: a class matches only if it explicitly inherits from the ABC.",
      tags: ["typing", "protocols", "interfaces"],
      seeAlso: ["python-intermediate/duck-typing", "python-intermediate/abstract-base-classes", "python-advanced/generics"],
      a: [
        { code: `from typing import Protocol

class Notifier(Protocol):
    def send(self, to: str, message: str) -> None: ...

class EmailNotifier:                        # no inheritance from Notifier
    def send(self, to: str, message: str) -> None:
        print(f"email to {to}: {message}")

class SmsNotifier:
    def send(self, to: str, message: str) -> None:
        print(f"sms to {to}: {message}")

def notify_all(notifier: Notifier, users: list[str]) -> None:
    for user in users:
        notifier.send(user, "Your order has shipped")

notify_all(EmailNotifier(), ["Asha"])       # accepted: it has the right send()
notify_all(SmsNotifier(), ["Ravi"])         # accepted too`, lang: "python" },
        { table: { head: ["", "`Protocol`", "Abstract base class (`ABC`)"], rows: [
          ["Kind of typing", "**Structural**: 'has the right shape'", "**Nominal**: 'inherits from me'"],
          ["Must the class inherit?", "No", "Yes"],
          ["Classes you cannot change", "Third-party and built-in classes match automatically", "Only if you register them"],
          ["Checked", "By the type checker (mypy, Pyright)", "At run time: an object cannot be created if a method is missing"],
          ["Shared code", "Usually none. It is a pure interface", "Can hold real methods that subclasses reuse"],
          ["Best for", "Describing what a function **needs** from its argument", "A family of classes you own, with common behaviour"]
        ] } },
        { code: `import io
from typing import Protocol, runtime_checkable

@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None: ...

print(isinstance(io.StringIO(), Closeable))     # True: it has a close() method
print(isinstance(42, Closeable))                # False`, lang: "python", caption: "Checking a Protocol at run time" },
        { ul: [
          "Without `@runtime_checkable`, a Protocol cannot be used with `isinstance()`. With it, the check only looks at whether the **names exist**, not at their signatures.",
          "It is the same idea as an **interface in Go or TypeScript**, where a type satisfies an interface just by having the right members.",
          "Many standard 'interfaces' are protocols in this sense: `Iterable`, `Sized`, `SupportsInt`, `SupportsFloat`.",
          "Define the Protocol next to the code that **uses** it, and keep it small: one or two methods. Your functions then do not depend on concrete classes, and they are easy to test with a fake."
        ] },
        { note: "💡 Say it like this: 'A Protocol is static duck typing: I describe the methods I need, and any class that has them is accepted by the type checker, with no inheritance. An ABC is nominal: a class must inherit from it, and Python enforces the abstract methods at run time. I use a Protocol to describe what a function needs, and an ABC when I own a class hierarchy and want to share code.'", kind: "tip" }
      ]
    },

    {
      id: "profiling-and-performance",
      q: "How do you find and fix a performance problem in Python code?",
      tldr: "Measure first. Use a profiler such as cProfile or py-spy to find where the time really goes, and then fix that hot spot: usually with a better algorithm or data structure, then with built-ins and caching, and only then with heavier tools such as NumPy, multiprocessing or compiled code.",
      tags: ["performance", "profiling"],
      seeAlso: ["python-advanced/memory-leaks", "python-advanced/c-extensions", "python-advanced/functools-tools", "python-advanced/list-and-dict-internals"],
      a: [
        { p: "**Step 1: measure.** Guessing is usually wrong." },
        { code: `# The whole program: which functions take the time?
python -m cProfile -s cumulative app.py

# A running process, with no code change and almost no overhead (pip install py-spy)
py-spy top --pid 12345
py-spy record -o profile.svg -- python app.py      # draws a flame graph`, lang: "bash" },
        { code: `import cProfile
import pstats
import timeit

def slow_unique(items):
    result = []
    for item in items:
        if item not in result:         # 'in' on a list scans the whole list every time
            result.append(item)
    return result

def fast_unique(items):
    return list(dict.fromkeys(items))  # a dict: instant lookups, and it keeps the order

data = list(range(2_000)) * 2

print(timeit.timeit(lambda: slow_unique(data), number=5))     # about 0.5 seconds
print(timeit.timeit(lambda: fast_unique(data), number=5))     # about 0.001 seconds

with cProfile.Profile() as profiler:   # profile one part of the code
    slow_unique(data)
pstats.Stats(profiler).sort_stats("cumulative").print_stats(5)`, lang: "python", caption: "timeit for a small comparison, cProfile for where the time goes" },
        { p: "**Step 2: fix the biggest cost first.** In rough order of payoff:" },
        { table: { head: ["Fix", "Example"], rows: [
          ["A better **algorithm or data structure**", "A `set` or `dict` for lookups instead of a list. A `deque` for a queue. One query instead of one query per row"],
          ["**Built-ins and the standard library**", "`sum`, `min`, `sorted`, `''.join()`, `Counter`, `itertools`: they run in C"],
          ["**Do less work**", "Cache with `lru_cache`. Move calculations out of loops. Stop early. Process lazily with generators"],
          ["**Vectorise** numeric work", "NumPy, pandas or Polars: one loop in C instead of a million steps in Python"],
          ["**Concurrency**", "`asyncio` or threads for I/O waits. `multiprocessing` for CPU work"],
          ["**Compiled code**", "Cython, Numba, an extension in Rust or C, or running on PyPy"],
          ["**A newer Python**", "3.11 and later are much faster than 3.10, with no code change"]
        ] } },
        { ul: [
          "`timeit` is for **small benchmarks**: it runs a snippet many times and avoids the common timing mistakes.",
          "`cProfile` records **every function call**, so it slows the program down and is best in development. `py-spy` and `Scalene` take **samples** of the stack, so they are safe on a production process.",
          "Python 3.15 added a built-in sampling profiler too, in the new `profiling.sampling` module.",
          "Most slow services are slow because of **I/O**: the database, another API, the disk. Check query counts and timings before you optimise Python code.",
          "Measure again after every change, and keep the readable version unless the faster one really matters."
        ] },
        { note: "💡 Say it like this: 'I profile before I optimise, with cProfile in development or py-spy on a live process, and I fix the biggest hot spot first. Most wins come from a better algorithm or data structure, then built-ins and caching. Only after that do I reach for NumPy, multiprocessing or compiled code.'", kind: "tip" }
      ]
    },

    {
      id: "memory-leaks",
      q: "How do you find and fix a memory leak in Python?",
      tldr: "Python has a garbage collector, so a leak almost always means your program still holds a reference to objects it no longer needs: a cache or list that only grows, a global registry, a closure. Use tracemalloc to compare memory snapshots and see which line allocated the memory that keeps growing.",
      tags: ["memory", "debugging", "performance"],
      seeAlso: ["python-advanced/memory-management", "python-advanced/slots", "python-advanced/lazy-pipelines"],
      a: [
        { p: "**The usual causes:**" },
        { ul: [
          "**Unbounded caches**: a dict used as a cache with no size limit, or `@lru_cache(maxsize=None)` on a function that keeps getting new arguments.",
          "**Global or class-level collections** that are only ever added to: a list of 'recent' events, a registry of handlers, listeners that are never removed.",
          "**`lru_cache` on a method**: the cache holds `self`, so no instance is ever freed.",
          "**Closures and callbacks** that capture a big object and are kept alive by a long-lived owner.",
          "**Forgotten tasks, threads and timers**, each holding on to its arguments.",
          "**Stored exceptions**: an exception object keeps its traceback, and the traceback keeps every local variable of every frame alive.",
          "**C extensions** that leak memory which Python cannot see."
        ] },
        { code: `import tracemalloc

cache = {}

def handle_request(n):
    cache[n] = "x" * 10_000           # the bug: the cache grows forever

tracemalloc.start()
before = tracemalloc.take_snapshot()

for i in range(1_000):
    handle_request(i)

after = tracemalloc.take_snapshot()
for stat in after.compare_to(before, "lineno")[:3]:
    print(stat)                       # the top entry points at the line: cache[n] = ...`, lang: "python", caption: "Comparing two snapshots with tracemalloc" },
        { table: { head: ["Tool", "What it tells you"], rows: [
          ["`tracemalloc` (standard library)", "Which **line of code** allocated the memory, and how that changed between two snapshots"],
          ["`gc.get_objects()`, `objgraph`", "How many objects of each **type** exist, and **who** still refers to one"],
          ["`memray`, `Scalene`", "Full memory profiles with flame graphs, including native (C) memory"],
          ["`sys.getsizeof(obj)`", "The size of one object itself, not of what it points to"],
          ["Process memory over time", "Whether there is a leak at all: steady growth under a steady load"]
        ] } },
        { p: "**The fixes:**" },
        { ul: [
          "Give every cache a **limit and an expiry**: `lru_cache(maxsize=1024)`, a cache with a time limit, or an external cache such as Redis.",
          "Use `weakref.WeakValueDictionary` or `WeakSet` for registries and caches that must not keep objects alive.",
          "**Remove** listeners and callbacks when their owner goes away, and close resources with `with`.",
          "Process big data as a **stream** instead of collecting it in a list.",
          "For millions of small objects, make them smaller: `__slots__`, tuples, arrays or NumPy."
        ] },
        { note: "Growing memory is not always a leak. Python keeps freed memory for reuse, so the size of the process can stay high after a peak. A leak is memory that keeps **growing** under a steady workload.", kind: "tip" },
        { note: "💡 Say it like this: 'In Python a leak is usually an object that is still referenced by mistake: an unbounded cache, a global list, a listener that was never removed. I confirm the growth, then take two tracemalloc snapshots and compare them to find the allocating line. The fix is normally a bounded cache, a weak reference, or releasing the reference.'", kind: "tip" }
      ]
    },

    {
      id: "c-extensions",
      q: "How can Python call C or other native code? How do you speed up a hot loop?",
      tldr: "Python can call compiled code in several ways: ctypes and cffi load an existing shared library, Cython compiles Python-like code to C, and pybind11 or PyO3 let you write an extension module in C++ or Rust. In practice you often do not write any of this yourself: you use NumPy, which already runs its loops in C.",
      tags: ["performance", "c-extensions", "interop"],
      seeAlso: ["python-advanced/profiling-and-performance", "python-advanced/free-threading", "python-advanced/packaging"],
      a: [
        { table: { head: ["Tool", "What it is", "Use it when"], rows: [
          ["**NumPy, pandas, Polars**", "Libraries whose loops are already written in C or Rust", "The work is numeric or tabular. Try this first"],
          ["**Numba**", "A JIT compiler: add `@njit` to a numeric function", "A numeric loop that cannot be vectorised"],
          ["**Cython**", "Python with optional C types, compiled to a C extension", "Speeding up a module step by step, or wrapping a C library"],
          ["**ctypes**", "Standard library: load a `.dll` or `.so` and call its functions", "Calling an existing C library, with no compiler needed"],
          ["**cffi**", "Like ctypes, but you give it the C declarations", "The same job with a cleaner interface. Works well on PyPy"],
          ["**pybind11**", "Write the extension in C++", "You have, or want, C++ code"],
          ["**PyO3 with maturin**", "Write the extension in Rust", "New native code with memory safety. Pydantic and Polars are built this way"],
          ["**The C API**", "Write C against `Python.h` directly", "Rarely: the most control and the most work"],
          ["**PyPy**", "A different Python interpreter with a JIT", "Pure-Python code with long-running loops and few C extensions"]
        ] } },
        { code: `import ctypes
import ctypes.util

# Load the C standard library and call its strlen() function
path = ctypes.util.find_library("c") or "msvcrt"      # msvcrt is the name on Windows
libc = ctypes.CDLL(path)

libc.strlen.argtypes = [ctypes.c_char_p]       # declare the C signature
libc.strlen.restype = ctypes.c_size_t

print(libc.strlen(b"hello"))                   # 5   worked out by C code`, lang: "python", caption: "Calling a C function with ctypes" },
        { code: `import numpy as np

values = list(range(1_000_000))
total = sum(v * v for v in values)             # a million steps in the interpreter

arr = np.arange(1_000_000, dtype=np.int64)
total = int((arr * arr).sum())                 # one loop in C: many times faster`, lang: "python", caption: "Usually the answer is a library that is already compiled" },
        { ul: [
          "**Why native code is faster**: no interpreter overhead per step, real machine numbers instead of Python objects, and data packed closely together in memory.",
          "**Crossing the boundary costs time.** Calling a tiny C function a million times from Python can be slower than staying in Python. Move the **whole loop** to the native side.",
          "**The GIL**: native code can release the GIL while it works, so several threads can run it in parallel.",
          "**The cost**: you now need a build step and compiled **wheels** for every platform and Python version, and a bug can crash the whole process instead of raising an exception.",
          "The stable ABI (`abi3`) lets one compiled wheel work on many Python versions."
        ] },
        { note: "💡 Say it like this: 'First I profile, and see if NumPy or a better algorithm solves it. If I really need native code, I use ctypes or cffi to call an existing C library, Cython or Numba to compile a hot loop, and pybind11 or PyO3 to write an extension in C++ or Rust. I move the whole loop across, because each call over the boundary has a cost.'", kind: "tip" }
      ]
    },

    {
      id: "import-system",
      q: "How does the import system work? How do you fix a circular import?",
      tldr: "import first looks in the sys.modules cache. If the module is not there, Python searches the folders in sys.path, creates a module object, puts it in the cache, and only then runs the module's code from top to bottom. A circular import fails when module A needs a name from module B while B is still halfway through importing A.",
      tags: ["imports", "modules", "internals"],
      seeAlso: ["python-basic/modules-and-packages", "python-basic/name-main", "python-advanced/packaging"],
      a: [
        { p: "What `import orders` does:" },
        { ol: [
          "**Check the cache.** If `'orders'` is in `sys.modules`, use that object and stop. This is why a module runs only once.",
          "**Find it.** Python tries the built-in modules, then each folder in `sys.path` in order: the folder of the script, `PYTHONPATH`, the standard library, then `site-packages`.",
          "**Create and cache.** An empty module object is created and stored in `sys.modules` **before** its code runs.",
          "**Execute.** The code of the module runs from top to bottom, filling the module with names.",
          "**Bind the name** `orders` in the file that imported it."
        ] },
        { code: `import sys
import json

print("json" in sys.modules)           # True: the cache of loaded modules
print(sys.modules["json"] is json)     # True: another 'import json' returns this same object
print(json.__file__)                   # the file it was loaded from
print(sys.path[:2])                    # the first folders that are searched

import importlib
mod = importlib.import_module("math")       # import by name, from a string
print(mod.sqrt(16))                         # 4.0`, lang: "python" },
        { p: "**Circular imports.** `a.py` imports `b`, and `b.py` imports `a`:" },
        { code: `# a.py
from b import helper_b         # 1. Python starts running b.py ...

def helper_a():
    return "A"

# b.py
from a import helper_a         # 2. a is in sys.modules, but only HALF executed:
                               #    helper_a does not exist yet
def helper_b():
    return "B"

# ImportError: cannot import name 'helper_a' from partially initialized module 'a'
#              (most likely due to a circular import)`, lang: "python" },
        { table: { head: ["Fix", "How"], rows: [
          ["**Restructure** (the real fix)", "Move the shared code into a third module that both import, so the dependency goes one way only"],
          ["Import the **module**, not the name", "Write `import a` and call `a.helper_a()` later. The name is then looked up when it is called, when `a` is complete"],
          ["Import **inside the function**", "Put the import in the function that needs it, so it runs later"],
          ["Needed only for type hints", "Put the import under `if TYPE_CHECKING:`, so it never runs at run time"]
        ] } },
        { ul: [
          "**Absolute imports** (`from shop.cart import add`) are the default choice. **Relative imports** (`from .cart import add`, `from ..utils import x`) work only inside a package.",
          "Running a file inside a package directly (`python shop/cart.py`) breaks its relative imports. Run it as a module: `python -m shop.cart`.",
          "A file named like a standard module (`random.py`, `email.py`) **shadows** the real one, because the folder of the script comes first in `sys.path`.",
          "`importlib.reload(module)` runs a module again, but objects made from the old version are not updated. Use it for interactive work only.",
          "Python 3.15 added **explicit lazy imports**: `lazy import json` delays loading the module until it is first used, which makes programs start faster."
        ] },
        { note: "💡 Say it like this: 'import checks sys.modules first. Otherwise it finds the module on sys.path, registers it in sys.modules and then executes it. A circular import breaks because one module sees the other half-initialised. I fix it by moving the shared code into a third module, or by importing the module instead of the name, or by importing inside the function.'", kind: "tip" }
      ]
    },

    {
      id: "packaging",
      q: "How do you package and distribute a Python project? What is `pyproject.toml`?",
      tldr: "pyproject.toml is the one standard file that describes a Python project: its name, version, dependencies and how to build it. A build tool turns the project into a wheel, which is a ready-to-install archive, and you upload that to PyPI or to a private index so that others can pip install it.",
      tags: ["packaging", "tooling", "dependencies"],
      seeAlso: ["python-basic/pip-and-venv", "python-advanced/import-system", "python-advanced/c-extensions"],
      a: [
        { code: `[project]
name = "invoice-tools"
version = "1.2.0"
description = "Create and send invoices"
requires-python = ">=3.11"
dependencies = [
    "requests>=2.31",
    "pydantic>=2.0,<3",
]

[project.optional-dependencies]
dev = ["pytest", "ruff", "mypy"]

[project.scripts]
invoice = "invoice_tools.cli:main"       # installs an 'invoice' command

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"`, lang: "text", caption: "pyproject.toml" },
        { code: `invoice-tools/
    pyproject.toml
    README.md
    src/
        invoice_tools/          <- the package that gets installed
            __init__.py
            cli.py
    tests/
        test_cli.py`, lang: "text", caption: "A typical project layout" },
        { code: `pip install -e ".[dev]"         # install your project in editable mode, with the dev extras

python -m build                 # creates dist/*.whl and dist/*.tar.gz    (pip install build)
twine upload dist/*             # publishes them to PyPI                  (pip install twine)

uv sync                         # the same workflow with uv: install from the lock file
uv build                        # build the wheel and the sdist`, lang: "bash" },
        { table: { head: ["Term", "Meaning"], rows: [
          ["**sdist**", "Source distribution (`.tar.gz`): the source code, which is built on the user's machine when it is installed"],
          ["**wheel**", "Built distribution (`.whl`): ready to unpack, with no build step. Fast and reliable to install"],
          ["**Build backend**", "The tool that builds them: setuptools, hatchling, flit-core, poetry-core or maturin"],
          ["**PyPI**", "The public package index. Many companies run a private one as well"],
          ["**Lock file**", "The exact version of every direct and indirect dependency, for repeatable installs: `uv.lock`, `poetry.lock` or a pinned `requirements.txt`"],
          ["**Entry point**", "A command that is installed with the package, declared under `[project.scripts]`"]
        ] } },
        { ul: [
          "`pyproject.toml` replaced `setup.py`, `setup.cfg` and many separate tool config files. Tools such as Ruff, pytest and mypy read their settings from it too.",
          "A **library** declares loose version ranges (`requests>=2.31`) so that it fits into many projects. An **application** also commits a **lock file**, so that every deploy installs exactly the same versions.",
          "A pure-Python project needs **one wheel** for all platforms. A project with compiled code needs a wheel per platform and Python version, usually built in CI.",
          "Use **semantic versioning**, `MAJOR.MINOR.PATCH`: a breaking change, a new feature, a bug fix.",
          "The `src/` layout stops tests from importing the project folder by accident instead of the installed package.",
          "An **application** is usually deployed as a Docker image built from the lock file, not as a package on PyPI."
        ] },
        { note: "💡 Say it like this: 'I describe the project in pyproject.toml: metadata, dependencies and the build backend. A build produces a wheel and an sdist, and I publish those to PyPI or a private index. For applications I also commit a lock file, so every environment gets exactly the same dependency versions.'", kind: "tip" }
      ]
    },

    {
      id: "exception-groups",
      q: "What are exception groups and `except*`?",
      tldr: "An ExceptionGroup, added in Python 3.11, is one exception that carries several other exceptions. It exists because concurrent code can fail in several places at once. `except*` handles the matching exceptions inside a group and lets the rest continue, and more than one `except*` block can run.",
      tags: ["exceptions", "asyncio", "errors"],
      seeAlso: ["python-intermediate/custom-exceptions", "python-advanced/asyncio-patterns"],
      a: [
        { code: `def run_all():
    errors = [ValueError("bad price"), TypeError("bad type"), ValueError("bad date")]
    raise ExceptionGroup("3 tasks failed", errors)

try:
    run_all()
except* ValueError as group:                   # gets a group with ONLY the ValueErrors
    print("value errors:", [str(e) for e in group.exceptions])
except* TypeError as group:                    # this block runs too
    print("type errors:", [str(e) for e in group.exceptions])

# value errors: ['bad price', 'bad date']
# type errors: ['bad type']`, lang: "python" },
        { table: { head: ["", "`except`", "`except*`"], rows: [
          ["Works on", "One exception", "An exception **group**"],
          ["How many blocks run", "At most one: the first that matches", "**Every** block that matches something in the group"],
          ["What `as e` gives you", "The exception", "A new group that holds only the matching exceptions (`e.exceptions`)"],
          ["Exceptions that match nothing", "Keep going up", "Are raised again together, in a smaller group"]
        ] } },
        { p: "Where they come from in real code: `asyncio.TaskGroup`. If several tasks fail, you get all the errors, not only the first one." },
        { code: `import asyncio

async def job(n):
    await asyncio.sleep(0.01)
    if n % 2:
        raise ValueError(f"job {n} failed")

async def main():
    try:
        async with asyncio.TaskGroup() as tg:
            for n in range(4):
                tg.create_task(job(n))
    except* ValueError as group:
        print(len(group.exceptions), "jobs failed")      # 2 jobs failed

asyncio.run(main())`, lang: "python" },
        { ul: [
          "`ExceptionGroup` inherits from `Exception`. `BaseExceptionGroup` can also hold things like `KeyboardInterrupt`.",
          "A plain `except ExceptionGroup:` catches the whole group as one object. `except*` is what lets you handle its members by type.",
          "You cannot mix `except` and `except*` in the same `try`.",
          "Groups can be **nested**, and `except*` looks through every level.",
          "`group.subgroup(condition)` and `group.split(condition)` filter a group by hand.",
          "Also new in 3.11: `e.add_note('while importing row 7')` attaches extra context to any exception, and it is shown in the traceback."
        ] },
        { note: "💡 Say it like this: 'An ExceptionGroup bundles several exceptions that happened together, typically from concurrent tasks in an asyncio TaskGroup. `except*` lets me handle each type inside the group separately, and unlike a normal except, several `except*` blocks can run for one group.'", kind: "tip" }
      ]
    },

    {
      id: "security",
      q: "What are common security mistakes in Python code?",
      tldr: "The classics are: building SQL or shell commands from user input, loading untrusted data with pickle or eval, secrets written in the code, using random for tokens, and outdated dependencies. The fix is nearly always the same idea: never let untrusted input be treated as code, and use the safe API that was made for the job.",
      tags: ["security", "best-practices"],
      seeAlso: ["python-intermediate/json-and-pickle", "python-basic/string-formatting", "python-advanced/packaging"],
      a: [
        { table: { head: ["Mistake", "Why it is dangerous", "Do this instead"], rows: [
          ["SQL built with f-strings or `+`", "**SQL injection**: the input becomes part of the query", "Query parameters, or an ORM"],
          ["`subprocess.run(cmd, shell=True)` with user input", "**Command injection**", "Pass a list of arguments, and leave `shell` off"],
          ["`eval()` or `exec()` on input", "Runs any code", "`ast.literal_eval()` for simple values, or a real parser"],
          ["`pickle.loads()` on untrusted data", "Runs any code while loading", "JSON, or another format with a schema"],
          ["`yaml.load(data)`", "Can build arbitrary objects", "`yaml.safe_load(data)`"],
          ["Secrets in the source code or in git", "Everyone with the repository has them", "Environment variables or a secret manager"],
          ["`random` for tokens or passwords", "Predictable", "The `secrets` module"],
          ["Passwords hashed with MD5 or SHA-256", "Far too fast, so easy to brute-force", "`argon2`, `bcrypt` or `scrypt`, with a salt"],
          ["A filename from the user joined to a path", "**Path traversal**: `../../etc/passwd`", "Resolve the path, and check that it stays inside the allowed folder"],
          ["`verify=False` in `requests`", "Turns off TLS certificate checks", "Leave verification on"],
          ["`assert` for validation or permission checks", "Asserts are removed when Python runs with `-O`", "A normal `if` that raises an exception"],
          ["`DEBUG = True` in production", "Leaks code and settings to visitors", "Turn it off, and log errors on the server"]
        ] } },
        { code: `import secrets
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (name TEXT)")
name = "x' OR '1'='1"                     # hostile input

# Wrong: the input is pasted into the SQL text
# conn.execute(f"SELECT * FROM users WHERE name = '{name}'")

# Right: the driver sends the value separately, as data
rows = conn.execute("SELECT * FROM users WHERE name = ?", (name,)).fetchall()
print(rows)                               # []

# Wrong: a shell parses the string, so input can add a second command
# subprocess.run(f"ping {host}", shell=True)

# Right: a list of arguments, and no shell
# subprocess.run(["ping", "-c", "1", host], check=True)

token = secrets.token_urlsafe(32)         # for sessions, API keys, password-reset links
print(len(token))                         # 43`, lang: "python" },
        { ul: [
          "**Validate input at the edge** with a schema (Pydantic, marshmallow), and treat everything from outside as untrusted: request bodies, headers, filenames, uploaded files.",
          "**Dependencies are part of your code.** Pin versions with a lock file, scan them with `pip-audit` or Dependabot, and watch out for look-alike package names on PyPI.",
          "Compare secrets with `hmac.compare_digest()`, so that the time taken does not leak information.",
          "Limit sizes and add timeouts. An upload with no size limit, or a `requests.get()` with no `timeout`, lets one slow or huge request tie up your service.",
          "Run a security linter such as **Bandit**, or the security rules of Ruff, in CI."
        ] },
        { note: "💡 Say it like this: 'Most Python security bugs come from treating input as code: SQL injection, shell injection, eval and pickle. I use parameterised queries, pass subprocess arguments as a list, never unpickle untrusted data, keep secrets out of the code, use the secrets module for tokens, and keep dependencies pinned and scanned.'", kind: "tip" }
      ]
    },

    {
      id: "modern-python-features",
      q: "Which recent Python features should you know about?",
      tldr: "Each yearly release adds a few headline features. The ones interviewers ask about most are the walrus operator (3.8), structural pattern matching (3.10), the big speed-up with exception groups and TaskGroup (3.11), the new generics syntax (3.12), the free-threaded build and the JIT (3.13), template strings and lazy annotations (3.14), and lazy imports (3.15).",
      tags: ["versions", "language"],
      seeAlso: ["python-basic/conditionals", "python-advanced/free-threading", "python-advanced/generics", "python-advanced/exception-groups"],
      a: [
        { table: { head: ["Version", "Year", "Worth knowing"], rows: [
          ["3.8", "2019", "The walrus operator `:=`, positional-only parameters (`/`), `f'{x=}'`"],
          ["3.9", "2020", "`list[int]` and `dict[str, int]` as type hints, dict merge with `a | b`, `str.removeprefix()`"],
          ["3.10", "2021", "`match` and `case`, `int | None` in type hints, much better error messages"],
          ["3.11", "2022", "About 25% faster, `ExceptionGroup` and `except*`, `asyncio.TaskGroup`, `tomllib`, `Self`"],
          ["3.12", "2023", "Generics syntax `def f[T](x: T)`, the `type` statement, fewer limits inside f-strings, `itertools.batched`"],
          ["3.13", "2024", "An experimental **free-threaded** build (no GIL), an experimental **JIT**, a new interactive shell with colour"],
          ["3.14", "2025", "The free-threaded build is officially supported, **t-strings** (template strings), annotations are evaluated lazily, `concurrent.interpreters`"],
          ["3.15", "2026", "Explicit **lazy imports** (`lazy import x`), a built-in `frozendict`, UTF-8 as the default encoding, a built-in sampling profiler"]
        ] } },
        { code: `import re

# Walrus (3.8): assign and test in one expression
text = "order 4521 shipped"
if (found := re.search(r"\\d+", text)) is not None:
    print(found.group())                  # 4521

# Structural pattern matching (3.10)
def describe(event):
    match event:
        case {"type": "click", "x": x, "y": y}:
            return f"click at {x},{y}"
        case {"type": "key", "key": "Enter"}:
            return "enter pressed"
        case [first, *rest]:
            return f"a list starting with {first}"
        case _:
            return "unknown"

print(describe({"type": "click", "x": 3, "y": 7}))      # click at 3,7
print(describe([1, 2, 3]))                              # a list starting with 1

# Positional-only and keyword-only parameters (3.8)
def connect(host, /, *, timeout=10):
    return f"{host} with timeout {timeout}"

print(connect("db", timeout=5))                         # db with timeout 5

# Merging dicts and removeprefix (3.9)
print({"a": 1} | {"b": 2})                              # {'a': 1, 'b': 2}
print("test_login".removeprefix("test_"))               # login`, lang: "python" },
        { code: `# Generics syntax and the type statement (3.12)
def first[T](items: list[T]) -> T:
    return items[0]

type UserId = int

# Template strings (3.14): like an f-string, but you get the parts instead of the final
# text, so a library can escape the values safely (HTML, SQL)
name = "<script>"
template = t"Hello {name}"

# Lazy imports (3.15): the module is loaded on first use, not at start-up
lazy import json`, lang: "python", caption: "Newer syntax" },
        { ul: [
          "A new version comes out **every October**, and each one is supported for **five years**: about two years of bug fixes, then security fixes only.",
          "Know which version your project runs, and why. Many companies stay one or two versions behind the newest.",
          "New features are opt-in: old code keeps working. The usual breakages come from **removed deprecated modules**, and from C extensions that need a new build.",
          "`from __future__ import annotations` was the old way to stop annotations from being evaluated early. Since 3.14 that is the normal behaviour."
        ] },
        { note: "💡 Say it like this: 'I follow the yearly releases. The features I use most are f-strings, the walrus operator, pattern matching, the modern type hint syntax, and TaskGroup with exception groups. I also know the direction: 3.11 made Python much faster, and 3.13 and 3.14 brought the free-threaded build without the GIL.'", kind: "tip" }
      ]
    }

  ]
});
