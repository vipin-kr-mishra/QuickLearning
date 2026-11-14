/* Python - Basic. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "python-basic",
  topic: "Python",
  level: "Basic",
  short: "Python Basic",
  accent: "yellow",
  desc: "The starting point: what Python is and how it runs, the built-in types and collections, conditions and loops, functions, modules, errors, files and a first class, all in simple words.",
  questions: [

    {
      id: "what-is-python",
      q: "What is Python and why is it so popular?",
      tldr: "Python is a high-level, general-purpose programming language that is easy to read and write. It is popular because the syntax is simple, it comes with a big standard library, and there is a ready-made package for almost everything: web, data, automation and AI.",
      tags: ["fundamentals"],
      seeAlso: ["python-basic/how-python-runs", "python-basic/dynamic-typing"],
      a: [
        { p: "Python was created by **Guido van Rossum** and first released in **1991**. Today it is looked after by the **Python Software Foundation**, and it is free and open source." },
        { code: `# A complete Python program: no class, no main method, no semicolons
names = ["Asha", "Ravi", "Meera"]

for name in names:
    print(f"Hello, {name}!")`, lang: "python" },
        { p: "**Main features:**" },
        { ul: [
          "**Easy to read**: the code looks close to plain English, and indentation shows the structure.",
          "**Interpreted**: you run the code directly, with no separate build step.",
          "**Dynamically typed**: you do not declare types. A variable can hold any kind of value.",
          "**Batteries included**: a large standard library (files, JSON, dates, HTTP, testing) comes with it.",
          "**Huge ecosystem**: hundreds of thousands of packages on PyPI, such as Django, FastAPI, pandas, NumPy and PyTorch.",
          "**Many styles**: you can write procedural, object-oriented or functional code.",
          "**Cross-platform**: the same code runs on Windows, Linux and macOS."
        ] },
        { p: "**Where it is used:** web backends, data analysis, machine learning and AI, automation scripts, testing and DevOps tools." },
        { note: "The trade-off: Python is slower than compiled languages such as C# or Java for heavy CPU work. Teams accept that because development is fast, and the heavy work is usually done by libraries written in C.", kind: "tip" },
        { note: "💡 Say it like this: 'Python is a simple, readable, general-purpose language. I do not declare types, I write less code than in most languages, and there is a library for almost anything I need.'", kind: "tip" }
      ]
    },

    {
      id: "how-python-runs",
      q: "Is Python compiled or interpreted? How does Python code run?",
      tldr: "Both, in two steps. Python first compiles your source code to bytecode, and then the Python virtual machine runs that bytecode one instruction at a time. We call it interpreted because there is no separate build step and no machine-code file.",
      tags: ["fundamentals", "internals"],
      seeAlso: ["python-advanced/bytecode-and-dis"],
      a: [
        { code: `hello.py  (your source code)
    |
    |  1. compile   (automatic, takes milliseconds)
    v
bytecode  (simple instructions for the Python virtual machine)
    |
    |  2. interpret
    v
Python Virtual Machine runs the bytecode, one instruction at a time`, lang: "text" },
        { ul: [
          "**Bytecode** is a low-level set of instructions for the Python virtual machine. It is not machine code for your CPU.",
          "Python saves the bytecode of **imported modules** in a `__pycache__` folder as `.pyc` files, so the next start is faster. If the source file changes, it is compiled again.",
          "**CPython** is the standard Python you download from python.org. It is written in C. Other implementations exist, for example **PyPy** (has a JIT compiler and is often much faster) and **MicroPython** (for tiny devices).",
          "Because nothing is checked ahead of time, many mistakes (a wrong name, a wrong type) only show up **when that line runs**."
        ] },
        { note: "Syntax errors are different: Python finds them in the compile step, before any line of the file runs.", kind: "tip" },
        { p: "It is the same idea as Java or C#, where the source also becomes an intermediate code first. The difference is the second step: Java and C# turn that code into machine code with a JIT compiler, while standard CPython interprets it." },
        { note: "💡 Say it like this: 'Python compiles my code to bytecode, and then a virtual machine interprets that bytecode. So it is compiled and interpreted, but we call it an interpreted language because there is no separate build step.'", kind: "tip" }
      ]
    },

    {
      id: "dynamic-typing",
      q: "How do variables work in Python? What does 'dynamically typed' mean?",
      tldr: "A variable in Python is just a name that points to an object. The type belongs to the object, not to the name, so you never declare a type and the same name can point to a different type later. Types are checked while the program runs.",
      tags: ["fundamentals", "types"],
      seeAlso: ["python-basic/data-types", "python-intermediate/type-hints"],
      a: [
        { code: `x = 10            # x points to an int
print(type(x))    # <class 'int'>

x = "hello"       # now the same name points to a str
print(type(x))    # <class 'str'>

a, b = 1, 2       # assign several names at once
a, b = b, a       # swap without a temp variable
print(a, b)       # 2 1`, lang: "python" },
        { p: "Python is **dynamically typed** but also **strongly typed**. These are two different things:" },
        { table: { head: ["", "Meaning", "Python"], rows: [
          ["Dynamic typing", "Types are checked at **run time**, not before", "Yes"],
          ["Strong typing", "No silent conversion between unrelated types", "Yes"]
        ] } },
        { code: `print("5" + str(5))   # 55   you must convert yourself
print(int("5") + 5)   # 10

print("5" + 5)        # TypeError: can only concatenate str (not "int") to str`, lang: "python" },
        { ul: [
          "A name is created by assigning to it. There is no `var`, `let` or type keyword.",
          "Using a name that was never assigned gives a `NameError`.",
          "You can add optional **type hints** (`age: int = 30`) for editors and tools, but Python itself does not enforce them."
        ] },
        { note: "💡 Say it like this: 'In Python the type lives on the value, not on the variable. A variable is only a label. That is dynamic typing. But Python is also strongly typed: it will not add a string and a number for me.'", kind: "tip" }
      ]
    },

    {
      id: "indentation-and-pep8",
      q: "Why is indentation important in Python? What is PEP 8?",
      tldr: "Python uses indentation instead of curly braces to mark a block of code, so wrong indentation is an error, not just bad style. PEP 8 is the official style guide that says how Python code should look, for example 4 spaces per level and snake_case names.",
      tags: ["fundamentals", "style"],
      a: [
        { code: `def check(age):
    if age >= 18:
        print("adult")       # inside the if
        print("can vote")    # still inside the if
    print("done")            # outside the if, but inside the function`, lang: "python" },
        { ul: [
          "A block starts after a **colon** (`:`), and every line in it must be indented by the **same amount**.",
          "Wrong indentation gives an `IndentationError`, or worse, code that runs but does the wrong thing.",
          "Use **4 spaces** per level. Do not mix tabs and spaces: Python 3 can stop with a `TabError`."
        ] },
        { p: "**PEP 8** is the style guide most Python teams follow. PEP stands for Python Enhancement Proposal. The main rules:" },
        { table: { head: ["Thing", "PEP 8 style", "Example"], rows: [
          ["Variables and functions", "snake_case", "`total_price`, `get_user()`"],
          ["Classes", "PascalCase", "`OrderItem`"],
          ["Constants", "UPPER_CASE", "`MAX_RETRIES`"],
          ["Indentation", "4 spaces", ""],
          ["Line length", "79 characters (many teams use 88 or 100)", ""],
          ["Imports", "At the top of the file, one per line", "`import os`"]
        ] } },
        { note: "Nobody formats by hand today. Tools such as **Black** or **Ruff** format the code automatically, and a linter such as **Ruff** or **Flake8** reports style problems.", kind: "tip" },
        { note: "💡 Say it like this: 'In Python, indentation is the syntax: it replaces the curly braces. PEP 8 is the style guide: 4 spaces, snake_case for functions, PascalCase for classes. I let a formatter like Black or Ruff apply it.'", kind: "tip" }
      ]
    },

    {
      id: "data-types",
      q: "What are the built-in data types in Python?",
      tldr: "Numbers (int, float, complex), bool, str for text, the four collections list, tuple, set and dict, and None for 'no value'. Everything in Python is an object, and you check a type with type() or isinstance().",
      tags: ["types"],
      seeAlso: ["python-basic/mutable-vs-immutable", "python-basic/list-vs-tuple", "python-basic/none"],
      a: [
        { table: { head: ["Type", "Example", "What it holds", "Can change?"], rows: [
          ["`int`", "`42`", "Whole numbers of any size", "No"],
          ["`float`", "`3.14`", "Decimal numbers", "No"],
          ["`complex`", "`2 + 3j`", "Complex numbers", "No"],
          ["`bool`", "`True`, `False`", "Yes or no", "No"],
          ["`str`", "`'hello'`", "Text", "No"],
          ["`bytes`", "`b'abc'`", "Raw bytes", "No"],
          ["`list`", "`[1, 2, 3]`", "Ordered items", "Yes"],
          ["`tuple`", "`(1, 2, 3)`", "Ordered items, fixed", "No"],
          ["`set`", "`{1, 2, 3}`", "Unique items, no order", "Yes"],
          ["`dict`", "`{'a': 1}`", "Key and value pairs", "Yes"],
          ["`NoneType`", "`None`", "'No value'", "No"]
        ] } },
        { code: `age = 30
print(type(age))               # <class 'int'>
print(isinstance(age, int))    # True

# Converting between types
print(int("42") + 1)       # 43
print(float("3.5"))        # 3.5
print(str(99) + "%")       # 99%
print(list("abc"))         # ['a', 'b', 'c']
print(bool(0), bool(5))    # False True`, lang: "python" },
        { ul: [
          "**Everything is an object**, even a number or a function. An `int` has methods too: `(255).bit_length()` gives `8`.",
          "`bool` is a small subclass of `int`: `True == 1` and `False == 0`.",
          "Prefer `isinstance(x, int)` over `type(x) == int`, because `isinstance` also accepts subclasses."
        ] },
        { note: "💡 Say it like this: 'Python has numbers, strings, booleans and None, plus four main collections: list, tuple, set and dict. Lists, sets and dicts can be changed. The rest cannot.'", kind: "tip" }
      ]
    },

    {
      id: "mutable-vs-immutable",
      q: "What is the difference between mutable and immutable objects?",
      tldr: "A mutable object can be changed after it is created, like a list, dict or set. An immutable object cannot, like an int, str or tuple: any 'change' really makes a new object.",
      tags: ["types", "memory"],
      seeAlso: ["python-basic/list-vs-tuple", "python-intermediate/argument-passing", "python-intermediate/mutable-default-arguments"],
      a: [
        { table: { head: ["Mutable (can change)", "Immutable (cannot change)"], rows: [
          ["`list`, `dict`, `set`, `bytearray`", "`int`, `float`, `bool`, `str`, `tuple`, `frozenset`, `bytes`"],
          ["Objects of your own classes (by default)", "`None`"]
        ] } },
        { code: `# Mutable: the same object changes
nums = [1, 2, 3]
before = id(nums)
nums.append(4)
print(id(nums) == before)     # True: still the same list

# Immutable: a new object is created
name = "asha"
before = id(name)
name = name + "!"
print(id(name) == before)     # False: a brand new string

name[0] = "A"                 # TypeError: 'str' object does not support item assignment`, lang: "python" },
        { p: "Why it matters: two names can point to the **same** object. If that object is mutable, a change made through one name is visible through the other." },
        { code: `a = [1, 2, 3]
b = a              # b is another name for the SAME list
b.append(4)
print(a)           # [1, 2, 3, 4]   a changed too

c = a.copy()       # a real copy
c.append(5)
print(a)           # [1, 2, 3, 4]   a is safe`, lang: "python" },
        { ul: [
          "Only **hashable** objects can be dictionary keys or set items, and the built-in mutable types are not hashable.",
          "A tuple is immutable, but if it holds a list, that list can still change."
        ] },
        { note: "💡 Say it like this: 'Mutable means I can change the object in place, like a list. Immutable means I cannot, like a string or a tuple, so every change gives me a new object. It matters when two variables share one object.'", kind: "tip" }
      ]
    },

    {
      id: "numbers-and-division",
      q: "What is the difference between `/`, `//` and `%` in Python?",
      tldr: "`/` is true division and always returns a float. `//` is floor division: it rounds the result down to a whole number. `%` gives the remainder.",
      tags: ["numbers", "operators"],
      a: [
        { code: `print(7 / 2)          # 3.5      true division, always a float
print(8 / 2)          # 4.0      still a float
print(7 // 2)         # 3        floor division
print(7 % 2)          # 1        remainder (modulo)
print(2 ** 10)        # 1024     power
print(divmod(7, 2))   # (3, 1)   quotient and remainder together`, lang: "python" },
        { p: "Two things that surprise people:" },
        { code: `# 1. Floor division rounds DOWN, not towards zero
print(-7 // 2)     # -4   (not -3)
print(-7 % 2)      # 1    the remainder takes the sign of the divisor

# 2. Floats are not exact
print(0.1 + 0.2)           # 0.30000000000000004
print(0.1 + 0.2 == 0.3)    # False

import math
print(math.isclose(0.1 + 0.2, 0.3))   # True`, lang: "python" },
        { ul: [
          "`int` has **no size limit**. `2 ** 200` just works. There is no overflow.",
          "`float` is a 64-bit double, the same as `double` in C# or Java, so it has the same rounding problems.",
          "For **money**, use `decimal.Decimal` instead of `float`.",
          "Underscores make big numbers readable: `1_000_000`."
        ] },
        { note: "💡 Say it like this: 'A single slash always gives a float. Double slash is floor division, so 7 // 2 is 3. Percent is the remainder. And for money I use Decimal, because floats are not exact.'", kind: "tip" }
      ]
    },

    {
      id: "strings",
      q: "How do strings work in Python?",
      tldr: "A string (str) is an ordered, immutable sequence of Unicode characters. You can write it with single, double or triple quotes, and every string method returns a new string instead of changing the original.",
      tags: ["strings"],
      seeAlso: ["python-basic/string-formatting", "python-basic/indexing-and-slicing", "python-intermediate/str-vs-bytes"],
      a: [
        { code: `a = 'single quotes'
b = "double quotes"            # the same thing: pick one style
c = """triple quotes
can span many lines"""

s = "  Hello, World  "
print(s.strip())                      # Hello, World     spaces removed at both ends
print(s.strip().upper())              # HELLO, WORLD
print(s.replace("World", "Python"))   #   Hello, Python
print("a,b,c".split(","))             # ['a', 'b', 'c']
print("-".join(["a", "b", "c"]))      # a-b-c
print("ell" in "Hello")               # True
print("Hello".startswith("He"))       # True
print(len("Hello"))                   # 5`, lang: "python" },
        { ul: [
          "**Immutable**: `s[0] = 'J'` is an error. A method like `upper()` returns a **new** string.",
          "There is **no separate char type**. One character is just a string of length 1.",
          "Strings are **Unicode**, so text in any language, and emoji, works without extra effort.",
          "To join many pieces, use `''.join(parts)`, not `+` inside a loop. Every `+` builds a whole new string."
        ] },
        { table: { head: ["Method", "What it returns"], rows: [
          ["`strip()`, `lstrip()`, `rstrip()`", "The text without spaces at the ends"],
          ["`lower()`, `upper()`, `title()`", "The text in another case"],
          ["`split(sep)`", "A **list** of the parts"],
          ["`sep.join(list)`", "One string built from a list"],
          ["`replace(old, new)`", "The text with every `old` replaced"],
          ["`find(sub)`", "The index of `sub`, or `-1` if it is not there"],
          ["`isdigit()`, `isalpha()`", "`True` or `False`"]
        ] } },
        { note: "💡 Say it like this: 'A Python string is an immutable sequence of Unicode characters. Any method that looks like it changes the string really returns a new one.'", kind: "tip" }
      ]
    },

    {
      id: "string-formatting",
      q: "What are f-strings? What are the different ways to format a string?",
      tldr: "An f-string is a string with an f in front, where anything inside curly braces is run as Python code and put into the text. It is the shortest and fastest way to format a string. The older ways are the % operator and str.format().",
      tags: ["strings", "formatting"],
      seeAlso: ["python-basic/strings"],
      a: [
        { code: `name, age = "Asha", 30

# 1. Old style: the % operator
print("Name: %s, Age: %d" % (name, age))

# 2. str.format()
print("Name: {}, Age: {}".format(name, age))

# 3. f-string (Python 3.6+): the one to use
print(f"Name: {name}, Age: {age}")`, lang: "python" },
        { p: "Inside the braces you can write any expression, and add a **format spec** after a colon:" },
        { code: `name, age, price = "Asha", 30, 1234.5678

print(f"{price:.2f}")       # 1234.57     2 decimal places
print(f"{price:,.2f}")      # 1,234.57    thousands separator
print(f"{0.256:.1%}")       # 25.6%       percentage
print(f"{42:05d}")          # 00042       padded with zeros
print(f"{name:>8}|")        #     Asha|   right-aligned in 8 characters
print(f"{2 + 3}")           # 5           any expression
print(f"{name.upper()}")    # ASHA        method calls too
print(f"{age=}")            # age=30      handy for debugging (3.8+)`, lang: "python" },
        { note: "Never build an SQL query with an f-string or any other string formatting. Pass the values as query parameters, or you open the door to SQL injection.", kind: "warn" },
        { note: "💡 Say it like this: 'I use f-strings: I put an f before the string and write variables or expressions inside curly braces. They are easier to read and faster than % formatting or .format().'", kind: "tip" }
      ]
    },

    {
      id: "indexing-and-slicing",
      q: "What is slicing? How does negative indexing work?",
      tldr: "Indexing gets one item by its position, starting at 0. A negative index counts from the end, so -1 is the last item. Slicing gets a range with [start:stop:step], where stop is not included.",
      tags: ["sequences", "strings", "lists"],
      a: [
        { code: `text       P    y    t    h    o    n
index      0    1    2    3    4    5
negative  -6   -5   -4   -3   -2   -1`, lang: "text" },
        { code: `text = "Python"

print(text[0])       # P        first
print(text[-1])      # n        last
print(text[1:4])     # yth      index 1 up to, but not including, 4
print(text[:2])      # Py       from the start
print(text[2:])      # thon     to the end
print(text[::2])     # Pto      every 2nd character
print(text[::-1])    # nohtyP   reversed

nums = [10, 20, 30, 40, 50]
print(nums[-2:])     # [40, 50]   the last two
copy = nums[:]       # a shallow copy of the whole list`, lang: "python" },
        { ul: [
          "It works the same way on every sequence: `str`, `list`, `tuple`, `range` and `bytes`.",
          "A slice returns a **new** object. The original is not changed.",
          "An index that is out of range raises `IndexError`, but a **slice never fails**: `text[2:100]` simply returns what exists.",
          "On a list you can also assign to a slice: `nums[1:3] = [0, 0]`."
        ] },
        { note: "💡 Say it like this: 'Slicing is start, stop, step. Start is included, stop is not. Negative numbers count from the end, and [::-1] reverses a sequence.'", kind: "tip" }
      ]
    },

    {
      id: "lists",
      q: "What is a list? What is the difference between `append`, `extend` and `insert`?",
      tldr: "A list is an ordered, changeable collection that can hold items of any type. append adds one item at the end, extend adds every item from another collection, and insert puts one item at a given position.",
      tags: ["lists", "collections"],
      seeAlso: ["python-basic/list-vs-tuple", "python-basic/comprehensions", "python-advanced/list-and-dict-internals"],
      a: [
        { code: `nums = [1, 2, 3]

nums.append(4)           # [1, 2, 3, 4]            one item at the end
nums.append([5, 6])      # [1, 2, 3, 4, [5, 6]]    the whole list as ONE item
nums.pop()               # removes and returns the last item: [5, 6]

nums.extend([5, 6])      # [1, 2, 3, 4, 5, 6]      each item is added
nums.insert(0, 99)       # [99, 1, 2, 3, 4, 5, 6]  at index 0
print(nums)`, lang: "python" },
        { p: "Removing items:" },
        { table: { head: ["Code", "What it does"], rows: [
          ["`nums.remove(99)`", "Removes the first item **equal to** 99. `ValueError` if it is not there"],
          ["`nums.pop()`", "Removes and **returns** the last item"],
          ["`nums.pop(0)`", "Removes and returns the item at index 0"],
          ["`del nums[0]`", "Deletes by index or slice. Returns nothing"],
          ["`nums.clear()`", "Removes everything"]
        ] } },
        { code: `items = ["pen", 3, True, None, [1, 2]]   # mixed types are allowed

print(len(items))            # 5
print(3 in items)            # True
print(items.index("pen"))    # 0
print([1, 2] + [3])          # [1, 2, 3]   a new list
print([0] * 3)               # [0, 0, 0]`, lang: "python" },
        { ul: [
          "Fast at the **end**: `append` and `pop()` take the same time however long the list is. Slow at the **front**: `insert(0, x)` and `pop(0)` must move every item. For a queue, use `collections.deque`.",
          "`x in my_list` checks the items one by one. For many lookups, use a `set` or a `dict`."
        ] },
        { note: "💡 Say it like this: 'append adds one item, extend adds many items one by one, insert adds at a position. If I append a list, I get a list inside a list.'", kind: "tip" }
      ]
    },

    {
      id: "list-vs-tuple",
      q: "What is the difference between a list and a tuple?",
      tldr: "Both are ordered collections, but a list can be changed and a tuple cannot. Use a list for a group of similar items that will grow or shrink, and a tuple for a fixed record, like a point (x, y).",
      tags: ["lists", "tuples", "collections"],
      seeAlso: ["python-basic/mutable-vs-immutable", "python-basic/lists"],
      a: [
        { table: { head: ["", "List", "Tuple"], rows: [
          ["Syntax", "`[1, 2, 3]`", "`(1, 2, 3)`"],
          ["Can change?", "Yes (mutable)", "No (immutable)"],
          ["Methods", "Many: `append`, `remove`, `sort`...", "Only `count` and `index`"],
          ["Can be a dict key?", "No", "Yes, if all its items are hashable"],
          ["Memory and speed", "A bit bigger and slower", "A bit smaller and faster"],
          ["Typical use", "Similar items: a list of users", "A fixed record: `(lat, lng)`"]
        ] } },
        { code: `point = (10, 20)
x, y = point             # tuple unpacking
print(x, y)              # 10 20

single = (5,)            # a one-item tuple NEEDS the trailing comma
not_a_tuple = (5)        # this is just the int 5

def min_max(nums):
    return min(nums), max(nums)      # returns one tuple

low, high = min_max([3, 1, 9])
print(low, high)         # 1 9

cities = {(28.6, 77.2): "Delhi"}     # a tuple as a dictionary key

point[0] = 5             # TypeError: 'tuple' object does not support item assignment`, lang: "python" },
        { note: "A tuple is only immutable on the outside. With `t = ([1, 2], 3)` you cannot replace the first item, but `t[0].append(9)` still works, because the list inside is mutable.", kind: "warn" },
        { note: "💡 Say it like this: 'A list is mutable, a tuple is immutable. I use a list when the data will change, and a tuple for fixed data that belongs together, for returning several values from a function, or as a dictionary key.'", kind: "tip" }
      ]
    },

    {
      id: "dictionaries",
      q: "What is a dictionary in Python and how do you use it?",
      tldr: "A dictionary (dict) stores key and value pairs and finds a value by its key very fast. Keys must be unique and hashable, values can be anything, and since Python 3.7 a dict remembers the order in which items were added.",
      tags: ["dict", "collections"],
      seeAlso: ["python-basic/sets", "python-advanced/list-and-dict-internals", "python-advanced/hashing"],
      a: [
        { code: `user = {"name": "Asha", "age": 30}

print(user["name"])            # Asha
user["city"] = "Pune"          # add
user["age"] = 31               # update
del user["city"]               # delete

# Reading a key that may not exist
print(user.get("email"))               # None, and no error
print(user.get("email", "not set"))    # not set   (a default value)
# user["email"]                        # KeyError: 'email'

print("name" in user)          # True: 'in' checks the KEYS

for key, value in user.items():
    print(key, value)

print(list(user.keys()))       # ['name', 'age']
print(list(user.values()))     # ['Asha', 31]`, lang: "python" },
        { ul: [
          "**Fast**: finding, adding and deleting by key take about the same time for 10 items or 10 million, because a dict is a **hash table**.",
          "**Keys must be hashable**: a `str`, `int` or `tuple` is fine. A `list` or another `dict` is not.",
          "**Keys are unique**: setting an existing key replaces its value.",
          "**Ordered** by insertion since Python 3.7.",
          "Merge two dicts with `a | b` (3.9+) or `{**a, **b}`. If a key is in both, the right side wins."
        ] },
        { note: "`user.get(key)` returns `None` when the key is missing, and `user[key]` raises `KeyError`. Use `get` when a missing key is normal, and `[]` when a missing key would be a bug.", kind: "tip" },
        { note: "💡 Say it like this: 'A dict maps keys to values using a hash table, so lookups are very fast. Keys must be immutable and unique. I use get() when a key might be missing.'", kind: "tip" }
      ]
    },

    {
      id: "sets",
      q: "What is a set and when would you use it?",
      tldr: "A set is an unordered collection of unique items. Use it to remove duplicates, to check very quickly whether an item exists, and for maths-style operations such as union and intersection.",
      tags: ["set", "collections"],
      seeAlso: ["python-basic/dictionaries", "python-advanced/hashing"],
      a: [
        { code: `nums = [1, 2, 2, 3, 3, 3]
unique = set(nums)
print(unique)        # {1, 2, 3}

a = {1, 2, 3}
b = {3, 4, 5}

print(a | b)         # {1, 2, 3, 4, 5}   union: in either one
print(a & b)         # {3}               intersection: in both
print(a - b)         # {1, 2}            difference: in a, but not in b
print(a ^ b)         # {1, 2, 4, 5}      in one, but not in both

a.add(10)
a.discard(99)        # no error if it is missing (remove() would raise KeyError)
print(2 in a)        # True, and very fast`, lang: "python" },
        { ul: [
          "**No duplicates** and **no order**: you cannot use an index like `s[0]`.",
          "**Fast membership**: `x in my_set` does not get slower as the set grows, unlike `x in my_list`.",
          "Items must be **hashable**: no lists or dicts inside a set.",
          "`{}` creates an empty **dict**. An empty set is `set()`.",
          "`frozenset` is the immutable version, so it can be a dict key or sit inside another set."
        ] },
        { note: "💡 Say it like this: 'A set holds unique items with no order. I use it to remove duplicates and for fast lookups, because checking if an item is in a set does not get slower as the set grows.'", kind: "tip" }
      ]
    },

    {
      id: "comprehensions",
      q: "What is a list comprehension?",
      tldr: "A list comprehension builds a new list in one line from another collection: an expression, a for loop and an optional if filter, all inside square brackets. The same idea works for dicts and sets.",
      tags: ["comprehensions", "lists"],
      seeAlso: ["python-intermediate/generators", "python-intermediate/map-filter-reduce"],
      a: [
        { code: `nums = [1, 2, 3, 4, 5, 6]

# The long way
squares = []
for n in nums:
    if n % 2 == 0:
        squares.append(n * n)

# The comprehension: same result
squares = [n * n for n in nums if n % 2 == 0]
print(squares)       # [4, 16, 36]`, lang: "python" },
        { code: `[ expression    for item in iterable    if condition ]
  what to keep   where it comes from     optional filter`, lang: "text" },
        { code: `words = ["apple", "kiwi", "banana"]

lengths = {w: len(w) for w in words}       # dict comprehension
print(lengths)        # {'apple': 5, 'kiwi': 4, 'banana': 6}

first_letters = {w[0] for w in words}      # set comprehension
print(first_letters)  # {'a', 'k', 'b'}   (a set has no order)

labels = ["even" if n % 2 == 0 else "odd" for n in [1, 2, 3]]
print(labels)         # ['odd', 'even', 'odd']

pairs = [(x, y) for x in [1, 2] for y in ["a", "b"]]
print(pairs)          # [(1, 'a'), (1, 'b'), (2, 'a'), (2, 'b')]`, lang: "python" },
        { ul: [
          "It is usually **faster** than a `for` loop with `append`, and it is one clear line.",
          "Keep it simple. If it needs two `for` parts and an `if`, or does not fit on one line, a normal loop is easier to read.",
          "With round brackets `( ... )` you get a **generator expression**: it makes the items one at a time instead of building the whole list."
        ] },
        { note: "💡 Say it like this: 'A list comprehension is a short way to build a list from a loop: what I want, where it comes from, and an optional filter. I use it for simple cases and a normal loop when the logic is bigger.'", kind: "tip" }
      ]
    },

    {
      id: "equality-vs-identity",
      q: "What is the difference between `==` and `is`?",
      tldr: "`==` checks whether two objects have the same value. `is` checks whether two names point to the very same object in memory. Use `is` only for None, True and False.",
      tags: ["operators", "memory"],
      seeAlso: ["python-basic/none", "python-advanced/interning-and-caching"],
      a: [
        { code: `a = [1, 2, 3]
b = [1, 2, 3]
c = a

print(a == b)    # True    same value
print(a is b)    # False   two different list objects
print(a is c)    # True    c is another name for the same object

print(id(a) == id(c))    # True   'is' compares these ids`, lang: "python" },
        { ul: [
          "`==` calls the object's `__eq__` method, so a class can decide what 'equal' means.",
          "`is` compares identity (the `id()`). It cannot be customised, and it is very fast.",
          "Always write `x is None`, not `x == None`."
        ] },
        { note: "Do not use `is` to compare numbers or strings. It sometimes works by accident, because Python reuses small integers (-5 to 256) and some strings, and then it fails for other values. Python even prints a `SyntaxWarning` for code like `x is 5`.", kind: "warn" },
        { note: "💡 Say it like this: 'Double equals compares values, is compares identity. Two lists with the same items are equal, but they are not the same object. I only use is for None.'", kind: "tip" }
      ]
    },

    {
      id: "none",
      q: "What is `None` in Python?",
      tldr: "None is Python's value for 'nothing' or 'no value', like null in other languages. There is only one None object in the whole program, so you check for it with `is None`.",
      tags: ["types", "none"],
      seeAlso: ["python-basic/equality-vs-identity", "python-basic/truthy-and-falsy"],
      a: [
        { code: `result = None

if result is None:
    print("no result yet")

def greet(name):
    print(f"Hello {name}")       # no return statement

value = greet("Asha")
print(value)                     # None: a function without return gives None

print(type(None))                # <class 'NoneType'>`, lang: "python" },
        { ul: [
          "`None` is a **singleton**: there is one object, and its type is `NoneType`.",
          "It is **falsy**, but so are `0`, `''` and `[]`. So `if not x:` is **not** the same as `if x is None:`.",
          "Common uses: 'not set yet', 'nothing found', and as a safe default value for a parameter.",
          "Using it like a real value gives the well-known error `AttributeError: 'NoneType' object has no attribute ...`."
        ] },
        { code: `def find_user(user_id, users):
    return users.get(user_id)        # None when the user is not found

user = find_user(7, {1: "Asha"})
if user is None:
    print("not found")

count = 0
if not count:                        # True, but count is 0, not None
    print("careful: 0 is falsy too")`, lang: "python" },
        { note: "💡 Say it like this: 'None means no value. It is a single object, so I compare with is None. I do not use if not x for that, because zero and an empty string are also falsy.'", kind: "tip" }
      ]
    },

    {
      id: "truthy-and-falsy",
      q: "What are truthy and falsy values in Python?",
      tldr: "Every object can be used in an if. The falsy values are None, False, zero, and anything empty: '', [], (), {} and set(). Everything else is truthy.",
      tags: ["conditions", "types"],
      seeAlso: ["python-basic/none", "python-basic/conditionals"],
      a: [
        { table: { head: ["Falsy", "Truthy"], rows: [
          ["`None`, `False`", "`True`"],
          ["`0`, `0.0`", "Any other number, also `-1`"],
          ["`''` (an empty string)", "Any non-empty string, also `'0'`, `' '` and `'False'`"],
          ["`[]`, `()`, `{}`, `set()`, `range(0)`", "Any collection with at least one item, also `[0]`"]
        ] } },
        { code: `items = []

if not items:                # the Pythonic way to check for empty
    print("the list is empty")

name = ""
display = name or "Guest"    # 'or' returns the first truthy value
print(display)               # Guest

print(bool("False"))         # True: it is a non-empty string
print(bool([0]))             # True: the list has one item
print(0 or 5, 0 and 5)       # 5 0`, lang: "python" },
        { ul: [
          "`and` and `or` **short-circuit**, and they return one of their operands, not always `True` or `False`.",
          "An object of your own class is truthy by default. Define `__bool__` or `__len__` to change that."
        ] },
        { note: "`value or default` also replaces a valid `0` or `''`. When zero is a real value, check `if value is None` instead.", kind: "warn" },
        { note: "💡 Say it like this: 'Empty things and zero are falsy: None, False, 0, an empty string, an empty list, dict or set. Everything else is truthy. So I write if my_list instead of if len(my_list) > 0.'", kind: "tip" }
      ]
    },

    {
      id: "conditionals",
      q: "How do `if`, `elif` and `else` work? Does Python have a ternary operator or a switch statement?",
      tldr: "if, elif and else choose which block runs. The ternary form is `a if condition else b`. For a long time Python had no switch, and since Python 3.10 it has `match` and `case`, which do the same job and more.",
      tags: ["conditions", "control-flow"],
      seeAlso: ["python-basic/truthy-and-falsy"],
      a: [
        { code: `marks = 72

if marks >= 90:
    grade = "A"
elif marks >= 60:
    grade = "B"
else:
    grade = "C"

# Ternary (conditional expression)
status = "pass" if marks >= 40 else "fail"

# Chained comparison: reads like maths
if 60 <= marks < 90:
    print("grade B")

# The logical operators are words: and, or, not
if marks > 0 and not marks > 100:
    print("valid")`, lang: "python" },
        { p: "`match` (Python 3.10+) compares a value against patterns from top to bottom. `case _` is the default:" },
        { code: `def http_message(code):
    match code:
        case 200:
            return "OK"
        case 301 | 302:
            return "Redirect"
        case 404:
            return "Not found"
        case _:
            return "Unknown"

print(http_message(302))     # Redirect`, lang: "python" },
        { ul: [
          "There is no fall-through and no `break`: only the first matching case runs.",
          "`match` can also take apart lists, tuples, dicts and objects. That is why its full name is **structural pattern matching**.",
          "Before 3.10, people used an `if` / `elif` chain, or a **dictionary** that maps each value to a result."
        ] },
        { note: "💡 Say it like this: 'Python uses if, elif and else. The ternary is: value if condition else other value. For a switch, I use match and case, which came in Python 3.10, or a dictionary lookup.'", kind: "tip" }
      ]
    },

    {
      id: "loops",
      q: "How do `for` and `while` loops work? What do `break`, `continue` and `pass` do?",
      tldr: "A for loop goes through the items of a collection one by one. A while loop repeats as long as a condition is true. break stops the loop, continue jumps to the next round, and pass does nothing: it is only a placeholder.",
      tags: ["loops", "control-flow"],
      seeAlso: ["python-basic/range-enumerate-zip", "python-intermediate/iterators-and-iterables"],
      a: [
        { code: `# for: goes over the items directly, no index needed
for fruit in ["apple", "kiwi", "mango"]:
    print(fruit)

# while: repeats until the condition is false
count = 3
while count > 0:
    print(count)
    count -= 1          # Python has no count--`, lang: "python" },
        { code: `for n in range(1, 10):
    if n == 3:
        continue        # skip 3 and go to the next number
    if n == 6:
        break           # stop the whole loop
    print(n)            # prints 1 2 4 5

def todo():
    pass                # a placeholder: a block cannot be empty`, lang: "python" },
        { table: { head: ["Keyword", "What it does"], rows: [
          ["`break`", "Leaves the loop immediately"],
          ["`continue`", "Skips the rest of this round and starts the next one"],
          ["`pass`", "Does nothing. Used where Python needs a statement but you have nothing to write yet"]
        ] } },
        { p: "A loop can also have an `else` block. It runs only if the loop ended **without** a `break`:" },
        { code: `for n in [1, 3, 5]:
    if n % 2 == 0:
        print("found an even number")
        break
else:
    print("no even number")      # this runs: the loop was never broken`, lang: "python" },
        { ul: [
          "Python's `for` is a **for-each** loop. There is no `for (i = 0; i < n; i++)` form. Use `range(n)` when you need numbers.",
          "Do not add or remove items from a list while you loop over it. Loop over a copy (`for x in items[:]`) or build a new list."
        ] },
        { note: "💡 Say it like this: 'for loops over the items of a collection, while loops on a condition. break exits the loop, continue skips to the next item, and pass is an empty placeholder.'", kind: "tip" }
      ]
    },

    {
      id: "range-enumerate-zip",
      q: "What do `range`, `enumerate` and `zip` do?",
      tldr: "range gives a sequence of numbers, enumerate gives each item together with its index, and zip walks through two or more collections side by side. All three are lazy: they produce values only when asked.",
      tags: ["loops", "built-ins"],
      seeAlso: ["python-basic/loops", "python-intermediate/iterators-and-iterables"],
      a: [
        { code: `print(list(range(5)))           # [0, 1, 2, 3, 4]     stop is not included
print(list(range(2, 6)))        # [2, 3, 4, 5]        start, stop
print(list(range(0, 10, 3)))    # [0, 3, 6, 9]        start, stop, step
print(list(range(5, 0, -1)))    # [5, 4, 3, 2, 1]     counting down

names = ["Asha", "Ravi", "Meera"]

# enumerate: index and item together (instead of range(len(names)))
for i, name in enumerate(names, start=1):
    print(i, name)              # 1 Asha, then 2 Ravi, then 3 Meera

# zip: pair up two lists
ages = [30, 25, 35]
for name, age in zip(names, ages):
    print(name, age)

print(dict(zip(names, ages)))   # {'Asha': 30, 'Ravi': 25, 'Meera': 35}`, lang: "python" },
        { ul: [
          "`range` does not build a list in memory. `range(1_000_000_000)` is tiny, because it only stores start, stop and step.",
          "`zip` stops at the **shortest** input. Use `zip(a, b, strict=True)` (3.10+) to get an error when the lengths are different.",
          "`enumerate` and `zip` return iterators: you can loop over them only once. Wrap them in `list()` to see or reuse the values."
        ] },
        { note: "💡 Say it like this: 'range gives numbers, enumerate gives index and value together, and zip pairs up items from several lists. I use enumerate instead of range(len(x)).'", kind: "tip" }
      ]
    },

    {
      id: "functions",
      q: "How do you define a function in Python? What are default and keyword arguments?",
      tldr: "You define a function with def, a name, parameters and an indented body, and send a value back with return. A default argument has a value that is used when the caller does not pass one, and a keyword argument is passed by name instead of by position.",
      tags: ["functions"],
      seeAlso: ["python-basic/args-and-kwargs", "python-intermediate/mutable-default-arguments", "python-intermediate/argument-passing"],
      a: [
        { code: `def greet(name, greeting="Hello"):
    """Return a greeting for one person."""      # the docstring
    return f"{greeting}, {name}!"

print(greet("Asha"))                             # Hello, Asha!     default used
print(greet("Asha", "Hi"))                       # Hi, Asha!        by position
print(greet(greeting="Welcome", name="Ravi"))    # Welcome, Ravi!   by keyword, any order`, lang: "python" },
        { ul: [
          "A function without `return` returns `None`.",
          "It can return several values at once. Python packs them into a **tuple**: `return low, high`.",
          "In a definition, parameters with a default must come **after** the ones without.",
          "In a call, positional arguments come first, then keyword arguments.",
          "The first string in the body is the **docstring**. `help(greet)` shows it.",
          "Functions are **objects**: you can store one in a variable, put it in a list, or pass it to another function."
        ] },
        { code: `def stats(nums):
    return min(nums), max(nums), sum(nums) / len(nums)

low, high, avg = stats([4, 8, 6])
print(low, high, avg)        # 4 8 6.0

shout = str.upper            # a function stored in a variable
print(shout("hi"))           # HI`, lang: "python" },
        { note: "💡 Say it like this: 'I define a function with def. Parameters can have default values, and the caller can pass arguments by position or by name. Without a return statement, the function returns None.'", kind: "tip" }
      ]
    },

    {
      id: "args-and-kwargs",
      q: "What are `*args` and `**kwargs`?",
      tldr: "`*args` collects any extra positional arguments into a tuple, and `**kwargs` collects any extra keyword arguments into a dictionary. They let a function accept any number of arguments.",
      tags: ["functions", "arguments"],
      seeAlso: ["python-basic/functions", "python-intermediate/decorators"],
      a: [
        { code: `def total(*args):
    print(args)              # a tuple: (1, 2, 3)
    return sum(args)

print(total(1, 2, 3))        # 6

def show(**kwargs):
    print(kwargs)            # a dict: {'name': 'Asha', 'age': 30}

show(name="Asha", age=30)

def everything(first, *args, **kwargs):
    print(first, args, kwargs)

everything(1, 2, 3, x=10)    # 1 (2, 3) {'x': 10}`, lang: "python" },
        { p: "The same stars work the other way round in a **call**: they **unpack** a list or a dict into separate arguments." },
        { code: `def add(a, b, c):
    return a + b + c

nums = [1, 2, 3]
print(add(*nums))            # 6    same as add(1, 2, 3)

options = {"a": 1, "b": 2, "c": 3}
print(add(**options))        # 6    same as add(a=1, b=2, c=3)`, lang: "python" },
        { ul: [
          "The names `args` and `kwargs` are only a habit. The stars are what matter.",
          "Order in a definition: normal parameters, then `*args`, then keyword-only parameters, then `**kwargs`.",
          "A bare `*` makes everything after it **keyword-only**: `def connect(host, *, timeout=10)`. A `/` makes everything before it **positional-only**.",
          "They are used most in **decorators** and wrappers that pass every argument on to another function."
        ] },
        { note: "💡 Say it like this: 'One star collects extra positional arguments into a tuple, two stars collect extra keyword arguments into a dict. In a call, the same stars unpack a list or a dict into arguments.'", kind: "tip" }
      ]
    },

    {
      id: "lambda",
      q: "What is a lambda function?",
      tldr: "A lambda is a small function without a name, written in one line: `lambda arguments: expression`. It is mostly used as a short throwaway function that you pass to something like sorted(), map() or filter().",
      tags: ["functions", "lambda"],
      seeAlso: ["python-intermediate/sorting", "python-intermediate/map-filter-reduce"],
      a: [
        { code: `square = lambda x: x * x
print(square(5))             # 25

# The same thing as a normal function
def square2(x):
    return x * x

# The real use: a short function passed as an argument
users = [("Asha", 30), ("Ravi", 25), ("Meera", 35)]

by_age = sorted(users, key=lambda user: user[1])
print(by_age)        # [('Ravi', 25), ('Asha', 30), ('Meera', 35)]

evens = list(filter(lambda n: n % 2 == 0, [1, 2, 3, 4]))
print(evens)         # [2, 4]`, lang: "python" },
        { table: { head: ["", "`lambda`", "`def`"], rows: [
          ["Name", "None (anonymous)", "Has a name"],
          ["Body", "**One expression** only", "Any number of statements"],
          ["`return`", "Automatic: the expression is the result", "You write it"],
          ["Use", "A short, one-off helper", "Anything reusable or longer than a line"]
        ] } },
        { ul: [
          "No statements inside: no assignment, no `if` block, no loop. A conditional **expression** is fine: `lambda n: 'even' if n % 2 == 0 else 'odd'`.",
          "PEP 8 says: do not give a lambda a name (`square = lambda ...`). If it needs a name, write a `def`."
        ] },
        { note: "💡 Say it like this: 'A lambda is a one-line anonymous function. I use it as a small key or callback function, for example in sorted. For anything bigger I write a normal def.'", kind: "tip" }
      ]
    },

    {
      id: "modules-and-packages",
      q: "What are modules and packages? How does `import` work?",
      tldr: "A module is one .py file. A package is a folder of modules. import runs a module once and gives you access to its functions, classes and variables.",
      tags: ["modules", "imports"],
      seeAlso: ["python-basic/name-main", "python-basic/pip-and-venv", "python-advanced/import-system"],
      a: [
        { code: `shop/                    <- a package (a folder)
    __init__.py          <- runs when the package is imported (can be empty)
    cart.py              <- a module
    payments/            <- a sub-package
        __init__.py
        upi.py
main.py`, lang: "text" },
        { code: `import math                       # the whole module
print(math.sqrt(16))              # 4.0

from math import pi, sqrt         # only some names
print(sqrt(16), pi)               # 4.0 3.141592653589793

import datetime as dt             # with a short alias
print(dt.date(2026, 1, 26))       # 2026-01-26`, lang: "python" },
        { code: `# main.py: importing from your own package
from shop.cart import add_item
from shop.payments import upi`, lang: "python" },
        { table: { head: ["Term", "Meaning", "Example"], rows: [
          ["Module", "One `.py` file", "`cart.py`"],
          ["Package", "A folder of modules", "`shop/`"],
          ["Standard library", "Modules that come with Python", "`math`, `json`, `os`"],
          ["Third-party package", "Installed with `pip` from PyPI", "`requests`, `django`"]
        ] } },
        { ul: [
          "A module is **executed only once**, on the first import. After that, Python reuses the cached copy in `sys.modules`.",
          "Python looks for a module in the folders listed in `sys.path`: the folder of your script, the standard library, then installed packages.",
          "Avoid `from module import *`. It fills your file with names and hides where they came from.",
          "Do not give your file the name of a standard module (`random.py`, `json.py`). Your file would be imported instead of the real one."
        ] },
        { note: "💡 Say it like this: 'A module is a single Python file and a package is a folder of modules. import runs the module once, caches it, and gives me its names.'", kind: "tip" }
      ]
    },

    {
      id: "name-main",
      q: "What does `if __name__ == '__main__':` do?",
      tldr: "It lets a file work both as a script and as a module. The code under it runs only when you run the file directly, not when another file imports it.",
      tags: ["modules", "scripts"],
      seeAlso: ["python-basic/modules-and-packages"],
      a: [
        { p: "Python sets a special variable called `__name__` in every module:" },
        { ul: [
          "When you **run** the file (`python calc.py`), `__name__` is `'__main__'`.",
          "When you **import** it (`import calc`), `__name__` is the module name, `'calc'`."
        ] },
        { code: `# calc.py
def add(a, b):
    return a + b

def main():
    print("2 + 3 =", add(2, 3))

if __name__ == "__main__":
    main()          # runs for:      python calc.py
                    # skipped for:   import calc`, lang: "python" },
        { code: `# app.py
import calc                  # nothing is printed here

print(calc.add(10, 5))       # 15: we only reuse the function`, lang: "python" },
        { ul: [
          "Without the check, **importing** the file would also run its script code: printing, reading input, starting a server.",
          "It makes a file easy to **test**: a test can import the functions without side effects.",
          "It is required for `multiprocessing` on Windows and macOS, where each new process imports your main file again."
        ] },
        { note: "💡 Say it like this: 'Every module has a name. It is __main__ only when the file is run directly. So that if block is the entry point of a script, and it does not run when the file is imported.'", kind: "tip" }
      ]
    },

    {
      id: "exception-handling",
      q: "How does exception handling work in Python?",
      tldr: "Code that might fail goes in a try block, and each except block handles one kind of error. else runs only if nothing failed, finally always runs, and raise throws an error yourself.",
      tags: ["exceptions", "errors"],
      seeAlso: ["python-intermediate/custom-exceptions", "python-basic/files-and-with"],
      a: [
        { code: `def divide(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        print("cannot divide by zero")
        return None
    except TypeError as e:
        print(f"wrong type: {e}")
        return None
    else:
        print("no error happened")       # only when try succeeded
        return result
    finally:
        print("always runs")             # cleanup: error or no error

divide(10, 2)      # no error happened, always runs
divide(10, 0)      # cannot divide by zero, always runs`, lang: "python" },
        { table: { head: ["Block", "When it runs"], rows: [
          ["`try`", "The code that might fail"],
          ["`except`", "Only if that kind of error happened"],
          ["`else`", "Only if **no** error happened"],
          ["`finally`", "**Always**, even after a `return` or an error. Used for cleanup"]
        ] } },
        { code: `def set_age(age):
    if age < 0:
        raise ValueError("age cannot be negative")    # throw an error yourself
    return age

try:
    set_age(-5)
except (ValueError, TypeError) as e:      # several types in one except
    print(f"invalid: {e}")                # invalid: age cannot be negative`, lang: "python" },
        { ul: [
          "Catch the **specific** error you expect. A bare `except:`, or an `except Exception:` that does nothing, hides real bugs.",
          "Common built-in errors: `ValueError`, `TypeError`, `KeyError`, `IndexError`, `AttributeError`, `FileNotFoundError`, `ZeroDivisionError`.",
          "A bare `raise` inside an `except` block throws the same error again, for example after you have logged it."
        ] },
        { note: "💡 Say it like this: 'try holds the risky code, except handles a specific error, else runs when there was no error, and finally always runs for cleanup. I catch specific exceptions, never a blank except.'", kind: "tip" }
      ]
    },

    {
      id: "files-and-with",
      q: "How do you read and write files in Python? Why do we use `with`?",
      tldr: "You open a file with open() and a mode such as 'r' for read or 'w' for write. Putting it in a with statement closes the file automatically, even if an error happens in the middle.",
      tags: ["files", "io"],
      seeAlso: ["python-intermediate/context-managers", "python-intermediate/str-vs-bytes"],
      a: [
        { code: `# Write: creates the file, or replaces what was in it
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("first line\\n")
    f.write("second line\\n")

# Read everything at once
with open("notes.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Read line by line: the best way for a big file
with open("notes.txt", encoding="utf-8") as f:
    for line in f:
        print(line.strip())

# Append to the end
with open("notes.txt", "a", encoding="utf-8") as f:
    f.write("third line\\n")`, lang: "python" },
        { table: { head: ["Mode", "Meaning"], rows: [
          ["`'r'`", "Read (the default). Error if the file does not exist"],
          ["`'w'`", "Write. Creates the file, and **erases** it if it already exists"],
          ["`'a'`", "Append. Adds to the end"],
          ["`'x'`", "Create. Error if the file already exists"],
          ["`'b'`", "Binary, added to another mode: `'rb'`, `'wb'` (images, PDFs)"]
        ] } },
        { ul: [
          "`with` calls `f.close()` for you when the block ends, **even if an exception happens**. Without it you need `try` / `finally`.",
          "Pass `encoding='utf-8'` for text files. Before Python 3.15 the default came from the operating system, and on Windows that was often not UTF-8.",
          "`f.read()` loads the whole file into memory. For a big file, loop over the file object line by line.",
          "`pathlib.Path` is the modern way to work with paths: `Path('notes.txt').read_text(encoding='utf-8')`."
        ] },
        { note: "💡 Say it like this: 'I open files with the with statement, so the file is closed automatically even if something fails. I pick the mode, r, w or a, and I always set the encoding.'", kind: "tip" }
      ]
    },

    {
      id: "classes-and-objects",
      q: "How do you create a class in Python? What are `__init__` and `self`?",
      tldr: "A class is a blueprint and an object is one thing built from it. `__init__` is the method that runs automatically when an object is created, to set up its data, and `self` is the object itself, passed as the first parameter of every method.",
      tags: ["oop", "classes"],
      seeAlso: ["python-intermediate/inheritance-and-super", "python-intermediate/class-vs-instance-variables", "python-intermediate/dunder-methods"],
      a: [
        { code: `class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner            # instance attributes
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount
        return self.balance

acc = Account("Asha", 100)            # no 'new' keyword
acc.deposit(50)                       # Python passes acc as self
print(acc.owner, acc.balance)         # Asha 150

other = Account("Ravi")
print(other.balance)                  # 0: each object has its own data`, lang: "python" },
        { ul: [
          "`__init__` is the **initializer** (people often call it the constructor). It runs right after the object is created.",
          "`self` is **not a keyword**, only a strong convention. It is the object the method was called on: `acc.deposit(50)` is really `Account.deposit(acc, 50)`.",
          "Attributes are created by assigning to `self.something`. There is no list of fields to declare.",
          "There is **no `new`**: you call the class like a function.",
          "Everything is **public** by default. A leading underscore (`_balance`) is a polite sign that says 'internal, please do not touch'."
        ] },
        { note: "If you forget `self` in a method definition, calling it gives the classic error `TypeError: ... takes 1 positional argument but 2 were given`.", kind: "warn" },
        { note: "💡 Say it like this: 'A class is the blueprint, an object is an instance of it. __init__ sets up each new object, and self is the current object, which Python passes to every method automatically.'", kind: "tip" }
      ]
    },

    {
      id: "pip-and-venv",
      q: "What are pip and virtual environments?",
      tldr: "pip is the tool that installs Python packages from PyPI. A virtual environment is a private folder with its own Python and its own packages, so each project can use the versions it needs without breaking another project.",
      tags: ["tooling", "packages"],
      seeAlso: ["python-basic/modules-and-packages", "python-advanced/packaging"],
      a: [
        { code: `# Create a virtual environment in a folder called .venv
python -m venv .venv

# Activate it
source .venv/bin/activate        # Linux and macOS
.venv\\Scripts\\activate           # Windows

# Install packages into THIS environment only
pip install requests
pip install "django==5.2"        # an exact version

# Save and restore the list of packages
pip freeze > requirements.txt
pip install -r requirements.txt

deactivate                       # leave the environment`, lang: "bash" },
        { ul: [
          "**Why a virtual environment?** Project A needs Django 4 and project B needs Django 5. With one shared Python they would clash. With one environment per project, they do not.",
          "**PyPI** (the Python Package Index) is the public website that pip downloads from.",
          "**`requirements.txt`** lists the packages and their versions, so a teammate or a server can install the same set.",
          "Do not commit the `.venv` folder to git. Commit `requirements.txt` (or `pyproject.toml`) instead.",
          "Newer tools such as **uv** and **Poetry** do the same job, and more, in one tool. Many teams use them today."
        ] },
        { note: "💡 Say it like this: 'pip installs packages. A virtual environment keeps the packages of each project separate, so two projects can use different versions of the same library. I create one per project and save the versions in requirements.txt.'", kind: "tip" }
      ]
    }

  ]
});
