/* Python - Intermediate. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "python-intermediate",
  topic: "Python",
  level: "Intermediate",
  short: "Python Intermediate",
  accent: "yellow",
  desc: "The next step after the basics: object-oriented Python, scope and closures, decorators, iterators and generators, context managers, copying, type hints, the GIL and testing, in words you can repeat in an interview.",
  questions: [

    {
      id: "inheritance-and-super",
      q: "How does inheritance work in Python? What does `super()` do?",
      tldr: "A child class gets all the attributes and methods of its parent, and can add new ones or override existing ones. `super()` calls the parent's version of a method, most often inside `__init__` so the parent can set up its own part of the object.",
      tags: ["oop", "inheritance"],
      seeAlso: ["python-basic/classes-and-objects", "python-intermediate/multiple-inheritance-mro", "python-intermediate/abstract-base-classes"],
      a: [
        { code: `class Employee:
    def __init__(self, name, salary):
        self.name = name
        self.salary = salary

    def describe(self):
        return f"{self.name} earns {self.salary}"

class Manager(Employee):                     # Manager inherits from Employee
    def __init__(self, name, salary, team_size):
        super().__init__(name, salary)       # let the parent set name and salary
        self.team_size = team_size

    def describe(self):                      # override
        base = super().describe()            # reuse the parent's version
        return f"{base} and leads {self.team_size} people"

m = Manager("Asha", 90000, 5)
print(m.describe())                     # Asha earns 90000 and leads 5 people
print(isinstance(m, Employee))          # True: a Manager IS an Employee
print(issubclass(Manager, Employee))    # True`, lang: "python" },
        { ul: [
          "The parent goes in brackets after the class name. Every class inherits from `object`, even when you write nothing.",
          "If the child defines `__init__`, the parent's `__init__` is **not** called automatically. You must call `super().__init__(...)` yourself, or the parent's attributes will be missing.",
          "**Overriding** means defining a method with the same name in the child. Python has no `virtual` or `override` keyword: every method can be overridden.",
          "There is **no method overloading** by parameter types. A second `def` with the same name simply replaces the first one. Use default arguments instead.",
          "`super()` does not simply mean 'my parent'. It means 'the next class in the MRO', which matters with multiple inheritance."
        ] },
        { note: "💡 Say it like this: 'A child class reuses everything from its parent and can override methods. I call super().__init__() so the parent sets up its own attributes, and super().method() when I want to extend the behaviour of the parent instead of replacing it.'", kind: "tip" }
      ]
    },

    {
      id: "multiple-inheritance-mro",
      q: "What is multiple inheritance? What is the MRO (Method Resolution Order)?",
      tldr: "A Python class can inherit from several parents. The MRO is the fixed order in which Python searches those classes for a method or attribute: the class itself first, then its parents from left to right, with every class appearing only once.",
      tags: ["oop", "inheritance", "mro"],
      seeAlso: ["python-intermediate/inheritance-and-super"],
      a: [
        { code: `class A:
    def hello(self):
        return "A"

class B(A):
    def hello(self):
        return "B"

class C(A):
    def hello(self):
        return "C"

class D(B, C):        # the 'diamond': D -> B and C -> A
    pass

print(D().hello())                            # B: found in B first
print([cls.__name__ for cls in D.__mro__])    # ['D', 'B', 'C', 'A', 'object']`, lang: "python" },
        { ul: [
          "Python builds the MRO with the **C3 linearization** algorithm. In simple words: a child comes before its parents, parents keep the left-to-right order you wrote, and every class appears once.",
          "Look at it with `ClassName.__mro__` or `ClassName.mro()`.",
          "`super()` follows the MRO of the **object's** class, not the parent of the class where it is written. For a `D` object, `super()` inside `B` goes to `C`, not to `A`."
        ] },
        { code: `class Base:
    def __init__(self):
        print("Base")

class Left(Base):
    def __init__(self):
        print("Left")
        super().__init__()

class Right(Base):
    def __init__(self):
        print("Right")
        super().__init__()

class Child(Left, Right):
    def __init__(self):
        print("Child")
        super().__init__()

Child()      # prints Child, Left, Right, Base: each one runs exactly once`, lang: "python" },
        { ul: [
          "This solves the **diamond problem**: `Base.__init__` runs once, not twice.",
          "The most common real use is a **mixin**: a small class that adds one feature, such as `LoggingMixin` or `JsonMixin`.",
          "If the order you ask for is impossible, Python refuses to create the class: `TypeError: Cannot create a consistent method resolution order`."
        ] },
        { note: "💡 Say it like this: 'Python allows multiple inheritance. The MRO is the search order for methods: the class, then its parents left to right, each class once, worked out by the C3 algorithm. super() follows that order, so in a diamond every class runs only once.'", kind: "tip" }
      ]
    },

    {
      id: "instance-class-static-methods",
      q: "What is the difference between an instance method, a `@classmethod` and a `@staticmethod`?",
      tldr: "An instance method gets the object as `self` and works with that object's data. A class method gets the class as `cls` and is mostly used as an alternative constructor. A static method gets neither: it is a plain function that lives inside the class because it belongs there logically.",
      tags: ["oop", "methods", "decorators"],
      seeAlso: ["python-basic/classes-and-objects", "python-intermediate/class-vs-instance-variables"],
      a: [
        { table: { head: ["", "First argument", "Can use", "Typical use"], rows: [
          ["Instance method", "`self` (the object)", "Object data and class data", "The normal behaviour of an object"],
          ["`@classmethod`", "`cls` (the class)", "Class data only", "Alternative constructors, factory methods"],
          ["`@staticmethod`", "Nothing", "Neither", "A helper function grouped with the class"]
        ] } },
        { code: `class Pizza:
    base_price = 100                        # class attribute

    def __init__(self, toppings):
        self.toppings = toppings

    def price(self):                        # instance method
        return self.base_price + 20 * len(self.toppings)

    @classmethod
    def margherita(cls):                    # an alternative constructor
        return cls(["cheese", "tomato"])

    @staticmethod
    def is_valid_topping(name):             # no self, no cls
        return name in {"cheese", "tomato", "corn", "olive"}

p = Pizza.margherita()                      # called on the class
print(p.price())                            # 140
print(Pizza.is_valid_topping("corn"))       # True`, lang: "python" },
        { ul: [
          "A class method builds the object with `cls(...)` instead of the class name, so it also works for **subclasses**: `VegPizza.margherita()` returns a `VegPizza`.",
          "Real class methods you already know: `dict.fromkeys()`, `datetime.now()`, `int.from_bytes()`.",
          "Use a static method when the code needs nothing from the object or the class. If it does not really belong to the class, a plain function in the module is simpler.",
          "All three can be called on the class or on an object."
        ] },
        { note: "💡 Say it like this: 'Instance methods take self and work on one object. Class methods take cls and work on the class, and I mainly use them as alternative constructors. Static methods take neither and are just helper functions kept inside the class.'", kind: "tip" }
      ]
    },

    {
      id: "class-vs-instance-variables",
      q: "What is the difference between class variables and instance variables?",
      tldr: "A class variable is defined in the class body and is shared by all objects. An instance variable is set on self, usually in `__init__`, and belongs to one object only.",
      tags: ["oop", "attributes", "gotchas"],
      seeAlso: ["python-intermediate/mutable-default-arguments", "python-advanced/attribute-lookup"],
      a: [
        { code: `class Employee:
    company = "Acme"                # class variable: one copy, shared by everyone

    def __init__(self, name):
        self.name = name            # instance variable: one per object

a, b = Employee("Asha"), Employee("Ravi")
print(a.company, b.company)         # Acme Acme       both read the shared value

Employee.company = "Globex"         # change it on the CLASS: everyone sees it
print(a.company, b.company)         # Globex Globex

a.company = "Initech"               # this creates a NEW instance variable, on a only
print(a.company, b.company)         # Initech Globex
print(a.__dict__)                   # {'name': 'Asha', 'company': 'Initech'}`, lang: "python" },
        { p: "Reading `obj.x` looks on the **object first**, then on the class. Assigning `obj.x = ...` always writes to the object. That is why the last assignment did not change `b`." },
        { p: "The classic bug is a **mutable** class variable:" },
        { code: `class Team:
    members = []                       # shared by EVERY team (a bug)

    def add(self, name):
        self.members.append(name)      # changes the shared list in place

t1, t2 = Team(), Team()
t1.add("Asha")
print(t2.members)                      # ['Asha']   t2 got a member it never added

class FixedTeam:
    def __init__(self):
        self.members = []              # a new list for each object`, lang: "python" },
        { ul: [
          "Use class variables for constants and defaults shared by all objects, or for a counter such as the number of objects created.",
          "Use instance variables for anything that is different per object.",
          "`obj.__dict__` shows the instance variables. `ClassName.__dict__` shows the class variables and the methods."
        ] },
        { note: "💡 Say it like this: 'Class variables are shared by all instances, instance variables belong to one object. Python looks on the object first and then on the class. So I never put a mutable value like a list at class level, because every object would share it.'", kind: "tip" }
      ]
    },

    {
      id: "private-and-name-mangling",
      q: "Does Python have private variables? What do `_x` and `__x` mean?",
      tldr: "Python has no truly private members. A single leading underscore is a convention that means 'internal, do not use from outside'. A double leading underscore makes Python rename the attribute (name mangling), which mostly protects it from being overwritten by a subclass by accident.",
      tags: ["oop", "encapsulation"],
      seeAlso: ["python-intermediate/property"],
      a: [
        { table: { head: ["Name", "Meaning"], rows: [
          ["`name`", "Public"],
          ["`_name`", "Internal by **convention**. Python does not stop you"],
          ["`__name`", "**Name mangling**: stored as `_ClassName__name`"],
          ["`__name__`", "A special 'dunder' name defined by Python, such as `__init__`. Do not invent your own"],
          ["`name_`", "Avoids a clash with a keyword or built-in: `class_`, `type_`"]
        ] } },
        { code: `class Account:
    def __init__(self):
        self.owner = "Asha"        # public
        self._bank = "SBI"         # internal by convention
        self.__pin = 1234          # name-mangled

acc = Account()
print(acc.owner)               # Asha
print(acc._bank)               # SBI    works, but you are breaking the convention
print(acc._Account__pin)       # 1234   still reachable under the mangled name

print(acc.__pin)               # AttributeError: 'Account' object has no attribute '__pin'`, lang: "python" },
        { ul: [
          "The Python saying is: 'we are all consenting adults here'. The language trusts you instead of locking things.",
          "Name mangling is **not security**. Its real job is to avoid a clash when a subclass happens to use the same attribute name.",
          "For controlled access, keep the data in `_name` and expose it through a `@property`.",
          "A leading underscore on a module-level name also keeps it out of `from module import *`."
        ] },
        { note: "💡 Say it like this: 'Python has no private keyword. One underscore means internal by convention. Two underscores trigger name mangling, so the attribute is renamed with the class name in front. It avoids accidental clashes in subclasses, but it is not real privacy.'", kind: "tip" }
      ]
    },

    {
      id: "dunder-methods",
      q: "What are magic (dunder) methods?",
      tldr: "Dunder methods are special methods with double underscores on both sides, such as `__init__`, `__len__` or `__add__`. Python calls them for you when you use built-in syntax, so they let your own objects work with operators, len(), print(), loops and more.",
      tags: ["oop", "dunder", "operators"],
      seeAlso: ["python-intermediate/str-vs-repr", "python-intermediate/iterators-and-iterables", "python-advanced/hashing"],
      a: [
        { table: { head: ["You write", "Python calls"], rows: [
          ["`Vector(1, 2)`", "`__init__`"],
          ["`print(v)`, `str(v)`", "`__str__`"],
          ["`repr(v)`", "`__repr__`"],
          ["`a + b`", "`__add__`"],
          ["`a == b`", "`__eq__`"],
          ["`a < b`", "`__lt__`"],
          ["`len(v)`", "`__len__`"],
          ["`v[0]`", "`__getitem__`"],
          ["`x in v`", "`__contains__`"],
          ["`for x in v`", "`__iter__`"],
          ["`v()`", "`__call__`"],
          ["`with v:`", "`__enter__` and `__exit__`"]
        ] } },
        { code: `class Vector:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __repr__(self):
        return f"Vector({self.x}, {self.y})"

    def __add__(self, other):             # v1 + v2
        return Vector(self.x + other.x, self.y + other.y)

    def __eq__(self, other):              # v1 == v2
        return (self.x, self.y) == (other.x, other.y)

    def __len__(self):                    # len(v)
        return 2

    def __getitem__(self, index):         # v[0]
        return (self.x, self.y)[index]

v = Vector(1, 2) + Vector(3, 4)
print(v)                         # Vector(4, 6)
print(v == Vector(4, 6))         # True
print(len(v), v[0])              # 2 4`, lang: "python" },
        { ul: [
          "'Dunder' is short for **d**ouble **under**score.",
          "You do not call them directly. You write `len(v)`, not `v.__len__()`.",
          "This is how Python does **operator overloading**.",
          "If you define `__eq__`, Python sets `__hash__` to `None`, so the objects can no longer be dict keys or set items unless you also define `__hash__`."
        ] },
        { note: "💡 Say it like this: 'Dunder methods are hooks that Python calls for built-in operations. If my class defines __len__, then len() works on it. If it defines __add__, the plus operator works. That is how I make my own objects behave like built-in ones.'", kind: "tip" }
      ]
    },

    {
      id: "str-vs-repr",
      q: "What is the difference between `__str__` and `__repr__`?",
      tldr: "`__str__` gives a friendly, readable text for end users and is used by print() and str(). `__repr__` gives a precise text for developers and is used in the console, in debuggers and inside containers. If you only write one, write `__repr__`.",
      tags: ["oop", "dunder", "strings"],
      seeAlso: ["python-intermediate/dunder-methods"],
      a: [
        { table: { head: ["", "`__str__`", "`__repr__`"], rows: [
          ["For whom", "End users", "Developers"],
          ["Goal", "Readable", "Unambiguous. Ideally it looks like the code that creates the object"],
          ["Used by", "`print(x)`, `str(x)`, `f'{x}'`", "`repr(x)`, the interactive console, debuggers, `f'{x!r}'`"],
          ["If it is missing", "Python uses `__repr__`", "You get the default: `<__main__.Point object at 0x...>`"]
        ] } },
        { code: `class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __str__(self):
        return f"({self.x}, {self.y})"

    def __repr__(self):
        return f"Point(x={self.x}, y={self.y})"

p = Point(1, 2)
print(str(p))         # (1, 2)
print(repr(p))        # Point(x=1, y=2)
print(f"{p}")         # (1, 2)
print(f"{p!r}")       # Point(x=1, y=2)
print([p, p])         # [Point(x=1, y=2), Point(x=1, y=2)]   containers use repr`, lang: "python" },
        { code: `import datetime

d = datetime.date(2026, 1, 26)
print(str(d))         # 2026-01-26
print(repr(d))        # datetime.date(2026, 1, 26)

print(str("hi"))      # hi
print(repr("hi"))     # 'hi'   the quotes show that it is a string`, lang: "python", caption: "The same idea in built-in types" },
        { note: "💡 Say it like this: '__str__ is the nice version for users, __repr__ is the exact version for developers. print uses __str__ and falls back to __repr__, so I always write __repr__ first.'", kind: "tip" }
      ]
    },

    {
      id: "property",
      q: "What is the `@property` decorator?",
      tldr: "`@property` turns a method into something you read like a normal attribute, with no brackets. With a setter you can also run code, such as validation, when a value is assigned. It is the Pythonic replacement for getX() and setX() methods.",
      tags: ["oop", "property", "decorators"],
      seeAlso: ["python-intermediate/private-and-name-mangling", "python-advanced/descriptors"],
      a: [
        { code: `class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius             # goes through the setter below

    @property
    def celsius(self):                     # the getter
        return self._celsius

    @celsius.setter
    def celsius(self, value):              # the setter, with validation
        if value < -273.15:
            raise ValueError("below absolute zero")
        self._celsius = value

    @property
    def fahrenheit(self):                  # computed and read-only
        return self._celsius * 9 / 5 + 32

t = Temperature(25)
print(t.celsius)           # 25      looks like an attribute, runs the getter
print(t.fahrenheit)        # 77.0    calculated on every read
t.celsius = 30             # runs the setter
t.celsius = -500           # ValueError: below absolute zero`, lang: "python" },
        { ul: [
          "The real value lives under a different name, by convention `_celsius`. The property is the public door to it.",
          "A property **without a setter is read-only**: `t.fahrenheit = 100` raises `AttributeError`.",
          "Start with a plain public attribute. If you need validation later, turn it into a property and **no calling code has to change**. That is why Python code does not start with getters and setters.",
          "Keep a property cheap. If it does slow work, make it a method so the brackets warn the caller, or use `functools.cached_property`."
        ] },
        { note: "💡 Say it like this: 'A property lets me expose a method as an attribute. I use it for computed values and for validation in a setter. The caller still writes obj.x, so I can add logic later without breaking any code.'", kind: "tip" }
      ]
    },

    {
      id: "abstract-base-classes",
      q: "What is an abstract class in Python? How do you create one?",
      tldr: "An abstract class is a base class that cannot be created directly and that forces its subclasses to implement certain methods. You make one by inheriting from ABC and marking those methods with `@abstractmethod`.",
      tags: ["oop", "abc", "interfaces"],
      seeAlso: ["python-intermediate/duck-typing", "python-advanced/protocols"],
      a: [
        { code: `from abc import ABC, abstractmethod

class PaymentGateway(ABC):
    @abstractmethod
    def pay(self, amount):
        """Every gateway must implement this."""

    def refund(self, amount):                  # a normal method is allowed too
        print(f"refunding {amount}")

class UpiGateway(PaymentGateway):
    def pay(self, amount):
        print(f"paid {amount} by UPI")

UpiGateway().pay(500)        # paid 500 by UPI

PaymentGateway()             # TypeError: Can't instantiate abstract class PaymentGateway ...`, lang: "python" },
        { ul: [
          "A subclass that forgets to implement an abstract method **cannot be created** either. You get the error when you create the object, not later when you call the method.",
          "Python has **no `interface` keyword**. An abstract class with only abstract methods plays that role.",
          "An abstract class can also have normal methods with real code, so subclasses share behaviour.",
          "The standard library has ready-made ones in `collections.abc`, such as `Iterable`, `Sequence` and `Mapping`.",
          "If you want 'anything that has these methods, no inheritance needed', use `typing.Protocol` instead."
        ] },
        { note: "💡 Say it like this: 'An abstract base class defines methods that every subclass must implement. I inherit from ABC and mark the methods with abstractmethod. Python then refuses to create an object of any class that has not implemented them. It is how I write an interface in Python.'", kind: "tip" }
      ]
    },

    {
      id: "dataclasses",
      q: "What is a dataclass?",
      tldr: "A dataclass is a class decorated with `@dataclass`. You list the fields with their types, and Python writes `__init__`, `__repr__` and `__eq__` for you. It removes the boilerplate from classes that mostly hold data.",
      tags: ["oop", "dataclasses"],
      seeAlso: ["python-intermediate/type-hints", "python-intermediate/mutable-default-arguments", "python-advanced/slots"],
      a: [
        { code: `from dataclasses import dataclass, field

@dataclass
class Product:
    name: str
    price: float
    qty: int = 1                                     # a default value
    tags: list[str] = field(default_factory=list)    # a safe mutable default

    def total(self):
        return self.price * self.qty

p = Product("Pen", 10.0, qty=3)
print(p)                               # Product(name='Pen', price=10.0, qty=3, tags=[])
print(p == Product("Pen", 10.0, 3))    # True: compared field by field
print(p.total())                       # 30.0`, lang: "python" },
        { table: { head: ["Option", "What you get"], rows: [
          ["`@dataclass(frozen=True)`", "Immutable objects: assigning to a field raises an error, and the object becomes hashable"],
          ["`@dataclass(order=True)`", "`<`, `>` and sorting, comparing field by field"],
          ["`@dataclass(slots=True)`", "Less memory and faster attribute access (3.10+)"],
          ["`@dataclass(kw_only=True)`", "Every field must be passed by name (3.10+)"]
        ] } },
        { code: `from dataclasses import dataclass, asdict

@dataclass(frozen=True)
class Point:
    x: int
    y: int

pt = Point(1, 2)
print(asdict(pt))             # {'x': 1, 'y': 2}
places = {pt: "home"}         # works: a frozen dataclass is hashable

pt.x = 5                      # FrozenInstanceError: cannot assign to field 'x'`, lang: "python" },
        { ul: [
          "The type hints are **needed to declare a field**, but they are not checked at run time.",
          "A mutable default such as `tags: list = []` is refused with a `ValueError`. Use `field(default_factory=list)`.",
          "Use `__post_init__` for validation, or for a value calculated from other fields.",
          "Similar tools: `typing.NamedTuple` (an immutable tuple with names) and **Pydantic** (also validates and converts the data, popular with FastAPI)."
        ] },
        { note: "💡 Say it like this: 'A dataclass generates __init__, __repr__ and __eq__ from the fields I declare. I use it for classes that mainly hold data, and I add frozen=True when I want them immutable.'", kind: "tip" }
      ]
    },

    {
      id: "duck-typing",
      q: "What is duck typing? What do EAFP and LBYL mean?",
      tldr: "Duck typing means Python cares about what an object can do, not what type it is: if it has the method you call, it works. EAFP means 'try it and handle the error', and LBYL means 'check first'. Python code usually prefers EAFP.",
      tags: ["typing", "style"],
      seeAlso: ["python-intermediate/abstract-base-classes", "python-advanced/protocols"],
      a: [
        { p: "The name comes from the saying: 'If it walks like a duck and quacks like a duck, it is a duck.'" },
        { code: `class Duck:
    def speak(self):
        return "Quack"

class Robot:
    def speak(self):
        return "Beep"

def talk(thing):
    return thing.speak()       # no type check: anything with speak() works

print(talk(Duck()))            # Quack
print(talk(Robot()))           # Beep    no common base class needed`, lang: "python" },
        { p: "The same idea is everywhere in Python: `len()` works on anything with `__len__`, and a `for` loop works on anything with `__iter__`." },
        { table: { head: ["", "EAFP", "LBYL"], rows: [
          ["Stands for", "Easier to Ask Forgiveness than Permission", "Look Before You Leap"],
          ["Style", "Just do it, and catch the exception", "Check first with `if`"],
          ["In Python", "Preferred", "Fine for simple, cheap checks"]
        ] } },
        { code: `user = {"name": "Asha"}

# LBYL: check, then act
if "email" in user:
    email = user["email"]
else:
    email = None

# EAFP: act, and handle the failure
try:
    email = user["email"]
except KeyError:
    email = None`, lang: "python" },
        { ul: [
          "EAFP avoids a **race condition**: between 'does the file exist?' and 'open it', another process can delete the file. Just open it and catch `FileNotFoundError`.",
          "The price of duck typing is that mistakes show up at run time. **Type hints**, `Protocol` and tests give that safety back."
        ] },
        { note: "💡 Say it like this: 'Duck typing means I do not check the type of an object, I just use the method I need. If the object supports it, it works. So Python code prefers try and except over checking types first.'", kind: "tip" }
      ]
    },

    {
      id: "scope-legb",
      q: "What is variable scope in Python? What is the LEGB rule?",
      tldr: "Scope is where a name can be seen. Python looks for a name in four places, in this order: Local, Enclosing function, Global (the module) and Built-in. You need `global` or `nonlocal` only when you assign to a name from an outer scope.",
      tags: ["scope", "functions"],
      seeAlso: ["python-intermediate/closures"],
      a: [
        { table: { head: ["Letter", "Scope", "Example"], rows: [
          ["**L**", "Local: inside the current function", "A parameter, or a variable created in the function"],
          ["**E**", "Enclosing: the outer function around a nested function", "Used by closures"],
          ["**G**", "Global: the top level of the module (the file)", "Imports, functions, constants"],
          ["**B**", "Built-in: names Python always provides", "`len`, `print`, `range`"]
        ] } },
        { code: `x = "global"

def outer():
    x = "enclosing"

    def inner():
        x = "local"
        print(x)         # local: found in L first

    inner()
    print(x)             # enclosing

outer()
print(x)                 # global`, lang: "python" },
        { p: "You can always **read** an outer variable. But **assigning** creates a new local variable, unless you say otherwise:" },
        { code: `count = 0

def bad():
    count += 1           # UnboundLocalError: the assignment makes count local here

def good():
    global count         # use the module-level name
    count += 1

def make_counter():
    total = 0
    def add():
        nonlocal total   # use the name from the enclosing function
        total += 1
        return total
    return add

good()
print(count)                    # 1
counter = make_counter()
print(counter(), counter())     # 1 2`, lang: "python" },
        { ul: [
          "Only **functions, classes and modules** create a scope. An `if` block or a `for` loop does **not**: a variable created inside one is still visible after it.",
          "Whether a name is local is decided when the function is **compiled**: if a function assigns to a name anywhere, that name is local in the whole function.",
          "Avoid `global` in real code. Pass values in and return results, or keep the state in a class.",
          "Do not name a variable `list`, `str`, `id` or `max`. You would hide the built-in."
        ] },
        { note: "💡 Say it like this: 'Python resolves names with LEGB: local, enclosing, global, built-in. I can read outer variables freely, but to assign to one I need global or nonlocal. And only functions, classes and modules create a scope, not if blocks or loops.'", kind: "tip" }
      ]
    },

    {
      id: "closures",
      q: "What is a closure?",
      tldr: "A closure is an inner function that remembers the variables of the outer function where it was created, even after the outer function has finished. It is how a function can carry some private state with it.",
      tags: ["functions", "closures"],
      seeAlso: ["python-intermediate/scope-legb", "python-intermediate/decorators"],
      a: [
        { code: `def make_multiplier(factor):
    def multiply(n):
        return n * factor           # 'factor' comes from the outer function
    return multiply                 # return the function itself, not a call

double = make_multiplier(2)
triple = make_multiplier(3)

print(double(10))         # 20   make_multiplier has finished, but 2 is remembered
print(triple(10))         # 30   each closure has its own factor
print(double.__closure__[0].cell_contents)     # 2    this is where it is kept`, lang: "python" },
        { p: "Three things make a closure: a nested function, that uses a variable from the outer function, and that is returned or passed somewhere else." },
        { code: `def make_counter():
    count = 0
    def increment():
        nonlocal count              # needed because we ASSIGN to count
        count += 1
        return count
    return increment

counter = make_counter()
print(counter(), counter(), counter())     # 1 2 3`, lang: "python", caption: "A closure that keeps state" },
        { note: "**Late binding**: a closure remembers the **variable**, not the value it had at that moment. Functions created in a loop all see the last value of the loop variable.", kind: "warn" },
        { code: `funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])       # [2, 2, 2]   not [0, 1, 2]

funcs = [lambda i=i: i for i in range(3)]     # the fix: capture the value as a default
print([f() for f in funcs])       # [0, 1, 2]`, lang: "python" },
        { p: "Closures are used for **decorators**, function factories, callbacks, and for keeping a little state without writing a class." },
        { note: "💡 Say it like this: 'A closure is a function that remembers variables from the scope where it was defined. I return an inner function, and it keeps access to the outer variables even after the outer function has returned. Decorators are built on this.'", kind: "tip" }
      ]
    },

    {
      id: "decorators",
      q: "What is a decorator and how do you write one?",
      tldr: "A decorator is a function that takes another function, wraps it with extra behaviour, and returns the wrapped version. You apply it with the @ sign above a function, so you can add things like logging, timing or access checks without changing the code of the function itself.",
      tags: ["decorators", "functions"],
      seeAlso: ["python-intermediate/closures", "python-basic/args-and-kwargs", "python-advanced/advanced-decorators"],
      a: [
        { code: `import functools
import time

def timer(func):
    @functools.wraps(func)                  # keep the name and docstring of func
    def wrapper(*args, **kwargs):           # accept any arguments
        start = time.perf_counter()
        result = func(*args, **kwargs)      # call the real function
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.3f}s")
        return result                       # do not forget the result
    return wrapper

@timer
def build_report(rows):
    """Build the monthly report."""
    return sum(range(rows))

total = build_report(1_000_000)      # prints something like: build_report took 0.015s
print(total)                         # 499999500000
print(build_report.__name__)         # build_report   (thanks to functools.wraps)`, lang: "python" },
        { p: "The `@` line is only a shortcut. These two do the same thing:" },
        { code: `@timer
def build_report(rows): ...

def build_report(rows): ...
build_report = timer(build_report)`, lang: "python" },
        { ul: [
          "It works because functions are **objects**: you can pass them around and return them. The wrapper is a **closure** that remembers `func`.",
          "`*args, **kwargs` let the wrapper work for a function with any parameters.",
          "Without `functools.wraps`, the decorated function would be called `wrapper` and lose its docstring, which confuses debugging and tools.",
          "Decorators can be stacked. The one closest to the function is applied first.",
          "Decorators you already use: `@property`, `@staticmethod`, `@classmethod`, `@dataclass`, `@functools.lru_cache`, and `@app.get('/users')` in FastAPI."
        ] },
        { note: "💡 Say it like this: 'A decorator is a function that takes a function and returns a new one that adds behaviour before or after the original. I write an inner wrapper that accepts any arguments and calls the original, and I use functools.wraps to keep its name. Typical uses are logging, timing, caching and authentication.'", kind: "tip" }
      ]
    },

    {
      id: "mutable-default-arguments",
      q: "What is the problem with mutable default arguments?",
      tldr: "A default value is created only once, when the function is defined, not on every call. So a mutable default such as a list or dict is shared between calls and keeps its changes. The fix is to use None as the default and create the list inside the function.",
      tags: ["functions", "gotchas"],
      seeAlso: ["python-basic/functions", "python-basic/mutable-vs-immutable", "python-intermediate/class-vs-instance-variables"],
      a: [
        { code: `def add_item(item, basket=[]):        # the list is created ONCE
    basket.append(item)
    return basket

print(add_item("pen"))            # ['pen']
print(add_item("book"))           # ['pen', 'book']     surprise: the old item is still there
print(add_item.__defaults__)      # (['pen', 'book'],)  the default itself has changed`, lang: "python", caption: "The bug" },
        { code: `def add_item(item, basket=None):
    if basket is None:
        basket = []                   # a new list on every call
    basket.append(item)
    return basket

print(add_item("pen"))            # ['pen']
print(add_item("book"))           # ['book']`, lang: "python", caption: "The fix" },
        { ul: [
          "Default values are evaluated when the `def` line runs, and they are stored on the function object.",
          "It only hurts for **mutable** defaults: `[]`, `{}`, `set()`, or an object of your own class. Immutable defaults such as `0`, `''`, `None` or a tuple are safe.",
          "The same trap exists for any value worked out at that moment: `def log(msg, when=datetime.now())` keeps the time at which the function was **defined**.",
          "Linters such as Ruff and Pylint warn about it."
        ] },
        { note: "💡 Say it like this: 'Default arguments are evaluated once, when the function is defined. So a default list is shared by every call. I use None as the default and create the list inside the function.'", kind: "tip" }
      ]
    },

    {
      id: "argument-passing",
      q: "Is Python pass-by-value or pass-by-reference?",
      tldr: "Neither exactly. Python passes a reference to the object, and the parameter becomes a new name for that same object. So changing a mutable object inside a function is visible outside, but assigning a new object to the parameter is not.",
      tags: ["functions", "memory"],
      seeAlso: ["python-basic/mutable-vs-immutable", "python-intermediate/shallow-vs-deep-copy"],
      a: [
        { p: "The proper names are **pass by object reference** or **call by sharing**. There are two cases to remember:" },
        { code: `def add_item(items):
    items.append(99)           # MUTATES the object that the caller also sees

def replace(items):
    items = [0, 0, 0]          # REBINDS the local name only

nums = [1, 2, 3]

add_item(nums)
print(nums)                    # [1, 2, 3, 99]   changed

replace(nums)
print(nums)                    # [1, 2, 3, 99]   not changed`, lang: "python" },
        { code: `def increment(n):
    n += 1                     # int is immutable: this makes a new int, locally
    return n

x = 5
increment(x)
print(x)                       # 5   the caller's x is untouched

x = increment(x)               # to 'change' it, use the returned value
print(x)                       # 6`, lang: "python" },
        { table: { head: ["Inside the function", "Does the caller see it?"], rows: [
          ["Change a mutable object in place: `items.append(1)`, `d[k] = v`, `obj.x = 1`", "**Yes**"],
          ["Assign a new object to the parameter: `items = [...]`", "No"],
          ["Any 'change' to an immutable object: `n += 1`, `s += 'x'`", "No. A new object is created"]
        ] } },
        { ul: [
          "If a function must not change your list, pass a copy: `process(nums.copy())`.",
          "A good function either changes its argument in place and returns `None` (like `list.sort()`), or leaves it alone and returns a new object (like `sorted()`). Avoid doing both."
        ] },
        { note: "💡 Say it like this: 'Python passes object references. The function gets a new name for the same object. If I mutate the object, the caller sees it. If I assign a new object to the parameter, the caller does not.'", kind: "tip" }
      ]
    },

    {
      id: "map-filter-reduce",
      q: "What do `map`, `filter` and `reduce` do?",
      tldr: "map applies a function to every item, filter keeps only the items for which a function returns true, and reduce combines all items into a single value. In modern Python a comprehension often replaces map and filter.",
      tags: ["functional", "built-ins"],
      seeAlso: ["python-basic/comprehensions", "python-basic/lambda"],
      a: [
        { code: `from functools import reduce

nums = [1, 2, 3, 4, 5]

squares = list(map(lambda n: n * n, nums))
print(squares)                  # [1, 4, 9, 16, 25]

evens = list(filter(lambda n: n % 2 == 0, nums))
print(evens)                    # [2, 4]

total = reduce(lambda acc, n: acc + n, nums, 0)
print(total)                    # 15

# The same with comprehensions and built-ins: usually easier to read
squares = [n * n for n in nums]
evens = [n for n in nums if n % 2 == 0]
total = sum(nums)`, lang: "python" },
        { ul: [
          "`map` and `filter` are **lazy**: they return an iterator, and nothing runs until you loop over it or call `list()`.",
          "`reduce` is not a built-in in Python 3. Import it from `functools`.",
          "`map` is neat when the function already exists: `list(map(int, ['1', '2', '3']))` or `map(str.strip, lines)`.",
          "Before you reach for `reduce`, look for a built-in: `sum`, `min`, `max`, `any`, `all` or `''.join()`.",
          "`map` can take several iterables: `map(pow, [2, 3], [5, 2])` gives `32` and `9`."
        ] },
        { note: "💡 Say it like this: 'map transforms each item, filter selects items, and reduce folds everything into one value. They are lazy in Python 3. In practice I mostly write a list comprehension, because it is easier to read.'", kind: "tip" }
      ]
    },

    {
      id: "iterators-and-iterables",
      q: "What is the difference between an iterable and an iterator?",
      tldr: "An iterable is anything you can loop over, such as a list, string or dict. An iterator is the object that does the looping: it remembers its position and gives the next item each time next() is called. You get an iterator from an iterable with iter().",
      tags: ["iteration", "dunder"],
      seeAlso: ["python-intermediate/generators", "python-basic/loops"],
      a: [
        { table: { head: ["", "Iterable", "Iterator"], rows: [
          ["Has", "`__iter__()`", "`__iter__()` and `__next__()`"],
          ["Examples", "`list`, `str`, `tuple`, `dict`, `set`, `range`", "The result of `iter(x)`, a generator, a file object, `zip`, `map`"],
          ["Loop over it many times?", "Yes", "No. It is used up after one pass"],
          ["Remembers a position?", "No", "Yes"]
        ] } },
        { code: `nums = [10, 20, 30]           # an iterable
it = iter(nums)               # ask it for an iterator

print(next(it))               # 10
print(next(it))               # 20
print(next(it))               # 30
print(next(it, "done"))       # done   a default value instead of an error
next(it)                      # StopIteration: nothing is left`, lang: "python" },
        { p: "This is exactly what a `for` loop does for you: it calls `iter()` once, then `next()` again and again, and stops quietly when it sees `StopIteration`." },
        { code: `class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):            # an iterator returns itself
        return self

    def __next__(self):
        if self.current <= 0:
            raise StopIteration    # the signal that it is finished
        value = self.current
        self.current -= 1
        return value

print(list(Countdown(3)))          # [3, 2, 1]

pairs = zip("ab", [1, 2])          # zip returns an iterator
print(list(pairs))                 # [('a', 1), ('b', 2)]
print(list(pairs))                 # []   already used up`, lang: "python", caption: "Writing an iterator by hand" },
        { ul: [
          "Iterators are **lazy**: they produce one item at a time, so they can work through a huge file, or even an endless sequence, without loading it all.",
          "In practice you rarely write `__iter__` and `__next__` by hand. A **generator** function does the same thing in a few lines."
        ] },
        { note: "💡 Say it like this: 'An iterable is something I can loop over. An iterator is the object that keeps the position and returns the next item. A for loop calls iter() to get an iterator, and then next() until StopIteration.'", kind: "tip" }
      ]
    },

    {
      id: "generators",
      q: "What is a generator? What does `yield` do?",
      tldr: "A generator is a function that uses `yield` instead of `return`. Each time it yields, it hands back one value and pauses, and it continues from the same place when the next value is asked for. It creates values one at a time, so it uses very little memory.",
      tags: ["generators", "iteration", "memory"],
      seeAlso: ["python-intermediate/iterators-and-iterables", "python-advanced/generators-advanced", "python-advanced/lazy-pipelines"],
      a: [
        { code: `def countdown(n):
    while n > 0:
        yield n             # hand back one value and PAUSE here
        n -= 1

gen = countdown(3)          # nothing runs yet: we only get a generator object
print(next(gen))            # 3
print(next(gen))            # 2     it continued right after the yield
print(list(gen))            # [1]   the rest
print(list(gen))            # []    a generator can be used only once

for value in countdown(3):  # the normal way to use one
    print(value)            # 3, then 2, then 1`, lang: "python" },
        { table: { head: ["", "Normal function", "Generator function"], rows: [
          ["Keyword", "`return`", "`yield`"],
          ["Calling it", "Runs the body", "Returns a generator object. The body has not started yet"],
          ["Values", "All at once", "One at a time, on demand (lazy)"],
          ["State", "Lost after `return`", "Kept between values: local variables and position"],
          ["Memory", "The whole result", "One item at a time"]
        ] } },
        { code: `import sys

as_list = [n * n for n in range(1_000_000)]     # builds a million items now
as_gen = (n * n for n in range(1_000_000))      # generator expression: builds nothing yet

print(sys.getsizeof(as_list) > 8_000_000)       # True: megabytes
print(sys.getsizeof(as_gen) < 300)              # True: a couple of hundred bytes
print(sum(n * n for n in range(1_000_000)))     # 333332833333500000`, lang: "python", caption: "List comprehension vs generator expression" },
        { ul: [
          "Use a generator for big files, database rows, streams, or any sequence you only need to walk through once.",
          "A generator is an **iterator**, so it can be used only once. Call the function again to start over.",
          "Round brackets instead of square brackets give a **generator expression**, the lazy version of a list comprehension."
        ] },
        { note: "💡 Say it like this: 'A generator is a function with yield. It returns values one at a time and pauses in between, keeping its state. Because nothing is built in advance, I can process millions of rows with almost no memory.'", kind: "tip" }
      ]
    },

    {
      id: "context-managers",
      q: "What is a context manager? How does the `with` statement work?",
      tldr: "A context manager is an object that sets something up when a with block starts and cleans it up when the block ends, even if an error happens. It works through two methods, `__enter__` and `__exit__`, and it is used for files, locks, database connections and transactions.",
      tags: ["context-managers", "resources"],
      seeAlso: ["python-basic/files-and-with", "python-intermediate/generators"],
      a: [
        { code: `with open("data.txt", "w") as f:
    f.write("hello")

# is roughly the same as
f = open("data.txt", "w")
try:
    f.write("hello")
finally:
    f.close()              # always runs`, lang: "python" },
        { p: "**Way 1: a class** with `__enter__` and `__exit__`:" },
        { code: `import time

class Timer:
    def __enter__(self):
        self.start = time.perf_counter()
        return self                         # this becomes the 'as' variable

    def __exit__(self, exc_type, exc, tb):
        self.elapsed = time.perf_counter() - self.start
        print(f"took {self.elapsed:.3f}s")
        return False                        # False: do not hide an exception

with Timer() as t:
    total = sum(range(1_000_000))`, lang: "python" },
        { p: "**Way 2: a generator** with `@contextmanager`. It is shorter, and it is the usual choice:" },
        { code: `from contextlib import contextmanager

@contextmanager
def transaction(db):
    db.begin()                  # setup: runs when the block starts
    try:
        yield db                # the body of the with block runs here
        db.commit()             # no error: commit
    except Exception:
        db.rollback()           # error: roll back, then pass the error on
        raise

# with transaction(db) as tx:
#     tx.save(order)`, lang: "python" },
        { ul: [
          "`__exit__` receives the exception, if there was one. Returning `True` swallows it. Returning `False` or `None` lets it continue.",
          "You can open several in one statement: `with open(a) as src, open(b, 'w') as dst:`.",
          "Ready-made helpers in `contextlib`: `suppress(FileNotFoundError)`, `closing(thing)`, and `ExitStack` for a changing number of resources.",
          "Async code has `async with`, which uses `__aenter__` and `__aexit__`."
        ] },
        { note: "💡 Say it like this: 'A context manager guarantees cleanup. __enter__ runs at the start of the with block and __exit__ runs at the end, even when there is an exception. I write one as a class, or more often as a generator with the contextmanager decorator.'", kind: "tip" }
      ]
    },

    {
      id: "shallow-vs-deep-copy",
      q: "What is the difference between a shallow copy and a deep copy?",
      tldr: "A shallow copy makes a new outer object but still shares the inner objects with the original. A deep copy copies everything, at every level, so the two are fully independent. Plain assignment copies nothing: it only adds another name.",
      tags: ["copying", "memory"],
      seeAlso: ["python-basic/mutable-vs-immutable", "python-intermediate/argument-passing"],
      a: [
        { code: `import copy

original = [[1, 2], [3, 4]]

alias = original                     # no copy: the same object
shallow = copy.copy(original)        # new outer list, shared inner lists
deep = copy.deepcopy(original)       # everything is new

original[0].append(99)               # change an INNER list
original.append([5, 6])              # change the OUTER list

print(alias)        # [[1, 2, 99], [3, 4], [5, 6]]   sees everything
print(shallow)      # [[1, 2, 99], [3, 4]]           shares the inner lists only
print(deep)         # [[1, 2], [3, 4]]               fully independent`, lang: "python" },
        { table: { head: ["", "Assignment", "Shallow copy", "Deep copy"], rows: [
          ["New outer object?", "No", "Yes", "Yes"],
          ["New inner objects?", "No", "No, they are shared", "Yes"],
          ["How", "`b = a`", "`copy.copy(a)`, `a.copy()`, `a[:]`, `list(a)`, `dict(a)`", "`copy.deepcopy(a)`"],
          ["Speed", "Instant", "Fast", "Slower"]
        ] } },
        { ul: [
          "For a **flat** list of numbers or strings, a shallow copy is all you need, because immutable items cannot be changed anyway.",
          "The difference only shows with **nested mutable** objects: a list of lists, a dict of lists, objects that hold other objects.",
          "`deepcopy` copes with objects that point to each other in a circle, because it remembers what it has already copied.",
          "A class can control how it is copied with `__copy__` and `__deepcopy__`."
        ] },
        { note: "💡 Say it like this: 'Assignment just adds another name. A shallow copy creates a new container, but the items inside are still shared. A deep copy recursively copies everything. I need deepcopy only when the object has nested mutable data.'", kind: "tip" }
      ]
    },

    {
      id: "sorting",
      q: "What is the difference between `sort()` and `sorted()`? How do you sort by a custom key?",
      tldr: "`list.sort()` sorts the list in place and returns None. `sorted()` works on any iterable and returns a new list, leaving the original alone. Both take a `key` function that says what to sort by, and `reverse=True` for descending order.",
      tags: ["sorting", "lists"],
      seeAlso: ["python-basic/lambda", "python-basic/lists"],
      a: [
        { code: `nums = [3, 1, 2]

result = sorted(nums)         # a NEW list
print(result, nums)           # [1, 2, 3] [3, 1, 2]

nums.sort()                   # changes nums itself
print(nums)                   # [1, 2, 3]

print(nums.sort())            # None   so never write: nums = nums.sort()`, lang: "python" },
        { code: `users = [
    {"name": "Meera", "age": 35},
    {"name": "asha", "age": 30},
    {"name": "Ravi", "age": 30},
]

by_age = sorted(users, key=lambda u: u["age"])
oldest_first = sorted(users, key=lambda u: u["age"], reverse=True)
by_name = sorted(users, key=lambda u: u["name"].lower())       # ignore case

# Several keys: age first, then name
by_age_name = sorted(users, key=lambda u: (u["age"], u["name"].lower()))
print([u["name"] for u in by_age_name])        # ['asha', 'Ravi', 'Meera']

# Age descending, name ascending
mixed = sorted(users, key=lambda u: (-u["age"], u["name"].lower()))
print([u["name"] for u in mixed])              # ['Meera', 'asha', 'Ravi']`, lang: "python", caption: "Sorting with a key function" },
        { ul: [
          "The sort is **stable**: items with the same key keep their original order. That is why sorting by several keys works.",
          "The algorithm is **Timsort**: O(n log n) in the worst case, and very fast on data that is already partly sorted.",
          "The `key` function is called **once per item**, not once per comparison.",
          "You cannot sort mixed types that do not compare, such as `[1, 'a']`. That is a `TypeError`.",
          "`sorted()` accepts any iterable (a tuple, a set, a dict, a generator) and always returns a **list**.",
          "`min()` and `max()` take the same `key` argument: `max(users, key=lambda u: u['age'])`."
        ] },
        { note: "💡 Say it like this: 'sort() is a list method that sorts in place and returns None. sorted() is a built-in that returns a new list from any iterable. For custom ordering I pass a key function, and for several fields I return a tuple from the key.'", kind: "tip" }
      ]
    },

    {
      id: "collections-module",
      q: "What is in the `collections` module? When do you use `Counter`, `defaultdict` and `deque`?",
      tldr: "collections has special container types that go beyond list, dict and tuple. Counter counts things, defaultdict creates missing keys automatically, deque is a fast queue at both ends, and namedtuple is a tuple with field names.",
      tags: ["collections", "standard-library"],
      seeAlso: ["python-basic/dictionaries", "python-basic/lists"],
      a: [
        { code: `from collections import Counter, defaultdict, deque, namedtuple

# Counter: count how often each item appears
words = ["apple", "kiwi", "apple", "mango", "apple", "kiwi"]
counts = Counter(words)
print(counts["apple"])            # 3
print(counts.most_common(2))      # [('apple', 3), ('kiwi', 2)]
print(counts["grape"])            # 0   a missing key gives 0, not an error

# defaultdict: a missing key gets a default value automatically
groups = defaultdict(list)
for word in words:
    groups[len(word)].append(word)       # no 'if key not in groups' needed
print(dict(groups))    # {5: ['apple', 'apple', 'mango', 'apple'], 4: ['kiwi', 'kiwi']}

# deque: fast add and remove at BOTH ends
queue = deque([1, 2, 3])
queue.append(4)                   # add on the right
queue.appendleft(0)               # add on the left
print(queue.popleft())            # 0   fast, unlike list.pop(0)
recent = deque(maxlen=3)          # keeps only the newest 3 items

# namedtuple: a tuple with names
Point = namedtuple("Point", ["x", "y"])
p = Point(3, 4)
print(p.x, p[1])                  # 3 4`, lang: "python" },
        { table: { head: ["Type", "Use it for"], rows: [
          ["`Counter`", "Counting items and finding the most common ones"],
          ["`defaultdict`", "Grouping, or building a list or a count per key without checking first"],
          ["`deque`", "Queues, stacks, sliding windows, 'the last N items'"],
          ["`namedtuple`", "Small immutable records that read better than `t[0]`"],
          ["`OrderedDict`", "Rarely needed now that `dict` keeps its order. It still has `move_to_end()`"],
          ["`ChainMap`", "Looking up a key in several dicts in turn, for example overrides and then defaults"]
        ] } },
        { note: "💡 Say it like this: 'Counter for counting, defaultdict for grouping without key checks, deque for a fast queue at both ends, and namedtuple for a small record with named fields. They save me from writing the same helper code again and again.'", kind: "tip" }
      ]
    },

    {
      id: "str-vs-bytes",
      q: "What is the difference between `str` and `bytes`? What are encoding and decoding?",
      tldr: "A str is text: a sequence of Unicode characters. bytes is raw data: a sequence of numbers from 0 to 255. Encoding turns text into bytes and decoding turns bytes back into text, and both sides must use the same encoding, normally UTF-8.",
      tags: ["strings", "bytes", "encoding"],
      seeAlso: ["python-basic/strings", "python-basic/files-and-with"],
      a: [
        { code: `text = "café"                        # str: 4 characters
data = text.encode("utf-8")          # str -> bytes
print(data)                          # b'caf\\xc3\\xa9'   5 bytes: the é needs two
print(len(text), len(data))          # 4 5

back = data.decode("utf-8")          # bytes -> str
print(back == text)                  # True

print(data[0])                       # 99   one item of bytes is an int`, lang: "python" },
        { code: `          .encode("utf-8")
 str   ------------------->   bytes
 text                         raw data: files, network, database drivers
 str   <-------------------   bytes
          .decode("utf-8")`, lang: "text" },
        { ul: [
          "Everything outside your program is bytes: files on disk, network sockets, HTTP bodies. Text exists only inside the program.",
          "The rule of thumb: **decode as soon as data comes in, work with `str` inside, encode when data goes out**.",
          "Python 3 never mixes them silently: `'a' + b'a'` is a `TypeError`.",
          "Open text files with `open(path, encoding='utf-8')`, and binary files (images, PDFs) with `'rb'` or `'wb'`.",
          "`bytes` is immutable. `bytearray` is the mutable version.",
          "The wrong encoding gives a `UnicodeDecodeError`, or strange characters such as `cafÃ©`."
        ] },
        { note: "💡 Say it like this: 'str is Unicode text and bytes is raw data. I encode a string to bytes to save or send it, and decode bytes back to a string to work with it. I always name the encoding, and it is almost always UTF-8.'", kind: "tip" }
      ]
    },

    {
      id: "json-and-pickle",
      q: "How do you work with JSON in Python? What is pickling?",
      tldr: "The json module converts between Python objects and JSON text: dumps and loads for strings, dump and load for files. Pickling is Python's own binary format that can save almost any Python object, but you must never unpickle data you do not trust.",
      tags: ["serialization", "json", "pickle"],
      seeAlso: ["python-intermediate/str-vs-bytes", "python-advanced/security"],
      a: [
        { code: `import json

user = {
    "name": "Asha",
    "skills": ["python", "sql"],
    "active": True,
    "manager": None,
}

text = json.dumps(user)                 # Python -> JSON string
print(text)   # {"name": "Asha", "skills": ["python", "sql"], "active": true, "manager": null}

back = json.loads(text)                 # JSON string -> Python
print(back["skills"][0])                # python

with open("user.json", "w", encoding="utf-8") as f:
    json.dump(user, f, indent=2)        # write to a file, nicely indented

with open("user.json", encoding="utf-8") as f:
    loaded = json.load(f)               # read from a file
print(loaded == user)                   # True`, lang: "python" },
        { table: { head: ["Python", "JSON"], rows: [
          ["`dict`", "object"],
          ["`list`, `tuple`", "array"],
          ["`str`", "string"],
          ["`int`, `float`", "number"],
          ["`True`, `False`", "`true`, `false`"],
          ["`None`", "`null`"]
        ] } },
        { ul: [
          "Easy to remember: the functions with an **s** (`dumps`, `loads`) work with **s**trings. The ones without it work with files.",
          "JSON only knows the types in the table. A `datetime`, a `set`, a `Decimal` or your own class gives a `TypeError`. Convert it first, or pass `default=str`.",
          "A tuple comes back as a list, and dict keys always come back as strings."
        ] },
        { p: "**Pickle** saves Python objects in a binary format:" },
        { table: { head: ["", "JSON", "pickle"], rows: [
          ["Format", "Text, readable", "Binary"],
          ["Works with", "Every language", "Python only"],
          ["Can store", "Basic types", "Almost any Python object, including your own classes"],
          ["Safe to load from strangers?", "Yes", "**No**"]
        ] } },
        { code: `import pickle

data = pickle.dumps({"scores": {1, 2, 3}})     # a set works here, unlike in JSON
print(pickle.loads(data))                      # {'scores': {1, 2, 3}}`, lang: "python" },
        { note: "Loading a pickle can **run any code** hidden inside it. Only unpickle data that your own program created. For anything that crosses a trust boundary (an API, an upload, a queue), use JSON.", kind: "warn" },
        { note: "💡 Say it like this: 'For JSON I use json.dumps and json.loads for strings, and dump and load for files. Pickle can serialize almost any Python object, but it is Python-only and unsafe with untrusted data, so I use JSON for anything that leaves my system.'", kind: "tip" }
      ]
    },

    {
      id: "custom-exceptions",
      q: "How do you create a custom exception? What is exception chaining?",
      tldr: "You create a custom exception by writing a class that inherits from Exception. It gives your errors a clear name that callers can catch on purpose. Chaining with `raise ... from ...` wraps a low-level error in your own one while keeping the original as the cause.",
      tags: ["exceptions", "errors"],
      seeAlso: ["python-basic/exception-handling", "python-advanced/exception-groups"],
      a: [
        { code: `class PaymentError(Exception):
    """Base class for all payment problems."""

class InsufficientFunds(PaymentError):
    def __init__(self, balance, amount):
        super().__init__(f"balance {balance} is less than {amount}")
        self.balance = balance
        self.amount = amount

def withdraw(balance, amount):
    if amount > balance:
        raise InsufficientFunds(balance, amount)
    return balance - amount

try:
    withdraw(100, 500)
except InsufficientFunds as e:
    print(e)                  # balance 100 is less than 500
    print(e.amount)           # 500: extra data travels with the error
except PaymentError:
    print("some other payment problem")`, lang: "python" },
        { p: "**Exception chaining** turns a low-level error into one that makes sense to the caller, without losing the original:" },
        { code: `class ConfigError(Exception):
    pass

def load_port(settings):
    try:
        return int(settings["port"])
    except (KeyError, ValueError) as e:
        raise ConfigError("invalid port in settings") from e

try:
    load_port({"port": "eighty"})
except ConfigError as e:
    print(e)                               # invalid port in settings
    print(type(e.__cause__).__name__)      # ValueError: the original error is kept`, lang: "python" },
        { code: `BaseException
 +-- KeyboardInterrupt         Ctrl+C
 +-- SystemExit                sys.exit()
 +-- Exception                 <- inherit from this one
      +-- ValueError
      +-- TypeError
      +-- LookupError
      |    +-- KeyError
      |    +-- IndexError
      +-- OSError
           +-- FileNotFoundError`, lang: "text", caption: "A small part of the built-in hierarchy" },
        { ul: [
          "Inherit from `Exception`, not from `BaseException`. Otherwise `except Exception` will not catch your error.",
          "Give a library or an app **one base exception**, and derive the specific ones from it. Callers can then catch one of them, or all of them.",
          "Put `except` blocks from the most specific to the most general. The first match wins.",
          "`raise X from None` hides the original error when it would only confuse the reader."
        ] },
        { note: "💡 Say it like this: 'I create a custom exception by subclassing Exception, usually with one base class per application and the specific errors under it. When I convert a low-level error, I use raise from, so the original cause stays in the traceback.'", kind: "tip" }
      ]
    },

    {
      id: "type-hints",
      q: "What are type hints in Python? Does Python check them?",
      tldr: "Type hints are optional annotations that say which types a function expects and returns. Python itself ignores them when the program runs. They are for humans, editors and type checkers such as mypy or Pyright, which find type mistakes before you run the code.",
      tags: ["typing", "tooling"],
      seeAlso: ["python-basic/dynamic-typing", "python-advanced/generics", "python-advanced/protocols"],
      a: [
        { code: `def greet(name: str, times: int = 1) -> str:
    return f"Hello {name}! " * times

age: int = 30
scores: list[int] = [90, 85]
prices: dict[str, float] = {"pen": 10.5}
point: tuple[int, int] = (3, 4)

def find_user(user_id: int) -> str | None:       # may return None (3.10+)
    return None

def parse(value: int | str) -> int:              # either type is accepted
    return int(value)

print(greet("Asha", 2))           # Hello Asha! Hello Asha!
print(greet(42))                  # Hello 42!   Python does NOT stop you`, lang: "python" },
        { table: { head: ["Hint", "Meaning"], rows: [
          ["`int`, `str`, `bool`", "A simple type"],
          ["`list[int]`, `dict[str, float]`", "A collection and what is inside it (3.9+)"],
          ["`str | None`", "A string or `None`. The older spelling is `Optional[str]`"],
          ["`int | str`", "Either one. The older spelling is `Union[int, str]`"],
          ["`Any`", "Anything. It turns checking off for this value"],
          ["`Callable[[int], str]`", "A function that takes an `int` and returns a `str`"],
          ["`Literal['asc', 'desc']`", "Only these exact values"]
        ] } },
        { ul: [
          "**No effect at run time**: a wrong type does not raise an error. A **type checker** (mypy, Pyright) reads the hints and reports problems, usually in the editor and in CI.",
          "They also power autocomplete, and they are documentation that cannot silently go out of date.",
          "Some libraries **do** use the hints at run time: **Pydantic** and **FastAPI** validate data with them, and `dataclasses` uses them to find the fields.",
          "You can add them step by step. Code without hints still works."
        ] },
        { note: "💡 Say it like this: 'Type hints are optional annotations. Python does not enforce them at run time, but tools like mypy and my editor use them to catch bugs early and give better autocomplete. So I get much of the safety of static typing and keep the flexibility of Python.'", kind: "tip" }
      ]
    },

    {
      id: "gil",
      q: "What is the GIL (Global Interpreter Lock)?",
      tldr: "The GIL is a lock inside CPython that lets only one thread run Python code at a time. So threads do not make CPU-heavy Python code faster, but they still help with I/O work such as network calls, because the lock is released while a thread waits.",
      tags: ["concurrency", "gil", "threads"],
      seeAlso: ["python-intermediate/threads-processes-asyncio", "python-advanced/free-threading", "python-advanced/memory-management"],
      a: [
        { ul: [
          "**What it is**: one global lock (a mutex). A thread must hold it to run Python bytecode.",
          "**Why it exists**: CPython manages memory with reference counts. The GIL keeps those counts safe without a lock on every object, which keeps single-threaded code fast and C extensions simple.",
          "**The effect**: even on an 8-core machine, only **one thread runs Python code at any moment**. The threads take turns.",
          "**When it does not hurt**: a thread **releases** the GIL while it waits for I/O (network, disk, `time.sleep`). Other threads run during that time."
        ] },
        { table: { head: ["Kind of work", "Do threads help?", "What to use"], rows: [
          ["**I/O-bound**: API calls, database queries, files", "Yes", "Threads or `asyncio`"],
          ["**CPU-bound**: maths, parsing, image work in pure Python", "No", "`multiprocessing`: each process has its own interpreter and its own GIL"],
          ["Heavy maths in NumPy or pandas", "Often yes", "These libraries release the GIL inside their C code"]
        ] } },
        { code: `import threading
import time

def count_down(n):
    while n > 0:
        n -= 1

N = 10_000_000

start = time.perf_counter()
count_down(N)
count_down(N)
print(f"one after the other: {time.perf_counter() - start:.2f}s")

start = time.perf_counter()
t1 = threading.Thread(target=count_down, args=(N,))
t2 = threading.Thread(target=count_down, args=(N,))
t1.start()
t2.start()
t1.join()
t2.join()
print(f"two threads:         {time.perf_counter() - start:.2f}s")     # about the same, not half`, lang: "python", caption: "CPU-bound work does not get faster with threads" },
        { ul: [
          "The GIL belongs to **CPython**, not to the Python language. Jython and IronPython never had one.",
          "The GIL does **not** make your code thread-safe. A thread can be paused between the steps of `count += 1`, so shared data still needs a `Lock`.",
          "Since Python 3.13 there is an optional **free-threaded** build of CPython without the GIL, and 3.14 made it officially supported. The normal build still has the GIL."
        ] },
        { note: "💡 Say it like this: 'The GIL is a lock in CPython that allows only one thread to execute Python bytecode at a time. So threads are fine for I/O-bound work but give no speed-up for CPU-bound work. For that I use multiprocessing, or a library like NumPy that releases the GIL.'", kind: "tip" }
      ]
    },

    {
      id: "threads-processes-asyncio",
      q: "What is the difference between threading, multiprocessing and asyncio? When do you use each?",
      tldr: "Threading and asyncio are for work that mostly waits (I/O), and multiprocessing is for work that mostly computes (CPU). Threads are switched by the operating system, asyncio switches tasks itself inside one thread at each await, and multiprocessing runs separate processes on separate CPU cores.",
      tags: ["concurrency", "threads", "asyncio"],
      seeAlso: ["python-intermediate/gil", "python-advanced/asyncio-basics", "python-advanced/multiprocessing", "python-advanced/thread-safety"],
      a: [
        { table: { head: ["", "threading", "asyncio", "multiprocessing"], rows: [
          ["Best for", "I/O-bound work", "I/O-bound work with very many connections", "CPU-bound work"],
          ["Runs on", "Many threads, one process", "One thread, one event loop", "Many processes"],
          ["Real parallelism?", "No (GIL)", "No", "**Yes**: one core per process"],
          ["Who switches tasks", "The operating system, at any moment", "Your code, at each `await`", "The operating system"],
          ["Memory", "Shared", "Shared", "Separate: data is pickled and copied"],
          ["Cost per task", "Medium", "Very low: thousands of tasks are fine", "High"],
          ["Main risk", "Race conditions, so you need locks", "One blocking call freezes everything", "Slow start, and data must be picklable"]
        ] } },
        { code: `from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import time

def download(url):                  # I/O-bound: mostly waiting
    time.sleep(1)                   # stands in for a network call
    return f"{url} done"

def crunch(n):                      # CPU-bound: mostly calculating
    return sum(i * i for i in range(n))

if __name__ == "__main__":
    urls = ["a", "b", "c", "d"]

    # Threads: 4 downloads take about 1 second instead of 4
    with ThreadPoolExecutor(max_workers=4) as pool:
        print(list(pool.map(download, urls)))

    # Processes: real parallel CPU work, one core each
    with ProcessPoolExecutor() as pool:
        print(list(pool.map(crunch, [2_000_000] * 4)))`, lang: "python", caption: "Threads and processes with concurrent.futures" },
        { code: `import asyncio

async def download(url):
    await asyncio.sleep(1)          # 'await' gives control back to the event loop
    return f"{url} done"

async def main():
    results = await asyncio.gather(*(download(u) for u in ["a", "b", "c", "d"]))
    print(results)                  # all four finish after about 1 second

asyncio.run(main())`, lang: "python", caption: "asyncio: one thread, many tasks waiting at the same time" },
        { p: "**How to choose:**" },
        { ul: [
          "Mostly waiting on the network or disk, with normal blocking libraries (`requests`, a database driver)? Use **threads**.",
          "Thousands of connections at once (a web server, a chat service, a crawler), with async libraries (`httpx`, `aiohttp`, `asyncpg`)? Use **asyncio**.",
          "Heavy calculation in pure Python? Use **multiprocessing**.",
          "`concurrent.futures` gives threads and processes the same simple interface, so it is the easiest place to start."
        ] },
        { note: "💡 Say it like this: 'I first ask if the work is I/O-bound or CPU-bound. For I/O I use threads or asyncio, because the time is spent waiting. For CPU work I use multiprocessing, because the GIL stops threads from running Python code in parallel.'", kind: "tip" }
      ]
    },

    {
      id: "unit-testing",
      q: "How do you write unit tests in Python? What is the difference between unittest and pytest?",
      tldr: "A unit test is a small function that calls your code and checks the result. unittest comes with Python and uses test classes with assert methods. pytest is a third-party tool that most teams prefer: a test is a plain function with a plain assert, plus fixtures and parametrization.",
      tags: ["testing", "pytest", "tooling"],
      seeAlso: ["python-basic/name-main", "python-advanced/monkey-patching"],
      a: [
        { code: `# cart.py
def total(prices, discount=0):
    if not 0 <= discount <= 100:
        raise ValueError("discount must be between 0 and 100")
    return sum(prices) * (100 - discount) / 100`, lang: "python" },
        { code: `# test_cart.py        run it with:  pytest
import pytest
from cart import total

def test_total_without_discount():
    assert total([100, 50]) == 150

def test_total_with_discount():
    assert total([200], discount=10) == 180

def test_invalid_discount_raises():
    with pytest.raises(ValueError):
        total([100], discount=150)

@pytest.mark.parametrize("prices, expected", [
    ([], 0),
    ([10], 10),
    ([10, 20, 30], 60),
])
def test_total_many_cases(prices, expected):      # runs 3 times
    assert total(prices) == expected

@pytest.fixture
def sample_prices():                              # shared setup
    return [100, 200, 300]

def test_total_of_sample(sample_prices):          # pytest passes the fixture in by name
    assert total(sample_prices) == 600`, lang: "python" },
        { table: { head: ["", "unittest", "pytest"], rows: [
          ["Comes with Python?", "Yes", "No: `pip install pytest`"],
          ["A test is", "A method in a class that inherits `unittest.TestCase`", "A plain function named `test_...`"],
          ["Checking", "`self.assertEqual(a, b)`, `self.assertTrue(x)`", "A plain `assert a == b`, with a detailed failure message"],
          ["Setup", "`setUp()` and `tearDown()` methods", "**Fixtures**: reusable, and passed in by name"],
          ["Many inputs", "`subTest`", "`@pytest.mark.parametrize`"],
          ["Runs the other's tests?", "No", "Yes: pytest also runs unittest tests"]
        ] } },
        { code: `from unittest.mock import patch

def test_checkout_sends_one_email():
    # Replace the real function with a fake for the length of this block
    with patch("shop.checkout.send_email") as fake_send:
        checkout(order_id=7)
        fake_send.assert_called_once()      # it was called, but no real email went out`, lang: "python", caption: "Mocking an external dependency" },
        { ul: [
          "Structure each test as **Arrange, Act, Assert**: set up the data, call the code, check the result.",
          "A unit test should be **fast and isolated**: no real network, database or clock. Replace those with **mocks** (`unittest.mock`) or fakes.",
          "Name the files `test_*.py` and the functions `test_*`, and pytest finds them by itself.",
          "Measure what the tests cover with `coverage` or `pytest-cov`, and run the tests on every push in CI."
        ] },
        { note: "💡 Say it like this: 'I write tests with pytest: plain functions with assert. I use fixtures for shared setup, parametrize to run one test with many inputs, and mock to replace external things like an API or the database. unittest is the built-in alternative with test classes.'", kind: "tip" }
      ]
    }

  ]
});
