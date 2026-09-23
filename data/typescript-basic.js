/* TypeScript - Basic. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "typescript-basic",
  topic: "TypeScript",
  level: "Basic",
  short: "TypeScript Basic",
  accent: "sky",
  desc: "The starting point: what TypeScript is, the basic types, interfaces, functions, classes and the everyday syntax you should be able to explain in simple words.",
  questions: [

    {
      id: "what-is-typescript",
      q: "What is TypeScript and why do we use it?",
      tldr: "TypeScript is JavaScript with types. You write code with types, the compiler checks it, and then it turns into plain JavaScript that runs anywhere.",
      tags: ["fundamentals"],
      a: [
        { p: "TypeScript is a language made by **Microsoft**. It is a **superset of JavaScript**, which means every valid JavaScript file is also valid TypeScript. On top of JavaScript it adds **static types**." },
        { p: "Browsers and Node.js do not run TypeScript directly. The TypeScript compiler (`tsc`) checks your code for type mistakes and then removes the types, giving you normal JavaScript." },
        { ul: [
          "**Catches bugs early**: a typo or a wrong type shows up while you type, not when the user clicks a button.",
          "**Better editor help**: autocomplete, go to definition and safe rename all work much better.",
          "**Code is easier to read**: types act like documentation that never goes out of date.",
          "**Safer refactoring**: change a function and the compiler shows every place that breaks.",
          "**Great for big teams and big projects**, where nobody remembers every object shape."
        ] },
        { code: `function add(a: number, b: number): number {
  return a + b;
}

add(2, 3);      // OK
add("2", 3);    // Error: Argument of type 'string' is not assignable to 'number'`, lang: "typescript" },
        { note: "💡 Say it like this: 'TypeScript is JavaScript plus a type checker. It finds mistakes before the code runs, and at the end it is still just JavaScript.'", kind: "tip" }
      ]
    },

    {
      id: "typescript-vs-javascript",
      q: "What is the difference between TypeScript and JavaScript?",
      tldr: "JavaScript checks types only while the code runs; TypeScript checks them before the code runs, then compiles down to JavaScript.",
      tags: ["fundamentals"],
      a: [
        { table: { head: ["", "JavaScript", "TypeScript"], rows: [
          ["Typing", "Dynamic (checked at runtime)", "Static (checked at compile time)"],
          ["Runs directly?", "Yes, in browser and Node", "No, it is compiled to JavaScript first"],
          ["Errors found", "When the code runs", "While you write or build"],
          ["Extra features", "None", "Types, interfaces, enums, generics, access modifiers"],
          ["File extension", "`.js`", "`.ts` (and `.tsx` for React)"],
          ["Learning curve", "Lower", "A bit higher, but pays off in bigger apps"]
        ] } },
        { code: `// JavaScript: no error until this line actually runs
let user = { name: "Asha" };
user.nmae.toUpperCase();   // crashes at runtime

// TypeScript: error right away in the editor
let user2 = { name: "Asha" };
user2.nmae;   // Error: Property 'nmae' does not exist. Did you mean 'name'?`, lang: "typescript" },
        { note: "Types exist only at compile time. After compiling, all type information is gone, so TypeScript adds **zero runtime cost**.", kind: "tip" }
      ]
    },

    {
      id: "how-typescript-compiles",
      q: "How does TypeScript code run? What does the compiler do?",
      tldr: "The TypeScript compiler (tsc) checks the types and then removes them, producing plain JavaScript that the browser or Node runs.",
      tags: ["compiler", "tooling"],
      a: [
        { ol: [
          "You write `.ts` files.",
          "`tsc` reads them and **checks the types**. If something is wrong, it shows errors.",
          "It **strips out the types** and converts the code to the JavaScript version you chose (for example ES2020).",
          "The output `.js` files run in the browser or in Node.js."
        ] },
        { code: `npm install -g typescript
tsc --init          # creates tsconfig.json
tsc                 # compiles the whole project
tsc --watch         # recompiles on every save`, lang: "bash" },
        { note: "By default `tsc` still writes the JavaScript file even if there are type errors. Use `noEmitOnError: true` in tsconfig if you want it to stop.", kind: "warn" },
        { p: "Many tools today (Vite, esbuild, Babel) just remove types very fast without checking them. That is why projects usually still run `tsc --noEmit` in CI to do the real type check." }
      ]
    },

    {
      id: "basic-types",
      q: "What are the basic types in TypeScript?",
      tldr: "The main ones are string, number, boolean, null, undefined, arrays, tuples, enums, any, unknown, void and never.",
      tags: ["types"],
      a: [
        { table: { head: ["Type", "Example", "Meaning"], rows: [
          ["`string`", "`\"hello\"`", "Text"],
          ["`number`", "`42`, `3.14`", "All numbers (no separate int or float)"],
          ["`boolean`", "`true`, `false`", "Yes or no"],
          ["`null` / `undefined`", "`null`", "No value"],
          ["`string[]`", "`[\"a\", \"b\"]`", "Array of strings"],
          ["`[string, number]`", "`[\"age\", 30]`", "Tuple: fixed length and order"],
          ["`any`", "anything", "Turns type checking off"],
          ["`unknown`", "anything", "Safe version of any, must check before use"],
          ["`void`", "function returns nothing", "No return value"],
          ["`never`", "function never returns", "Throws or loops forever"]
        ] } },
        { code: `let userName: string = "Ravi";
let age: number = 28;
let isActive: boolean = true;
let scores: number[] = [90, 85, 70];
let point: [number, number] = [10, 20];`, lang: "typescript" },
        { note: "Use lowercase `string`, `number`, `boolean`. The uppercase `String`, `Number`, `Boolean` are wrapper objects and you almost never want them.", kind: "warn" }
      ]
    },

    {
      id: "type-inference",
      q: "What is type inference in TypeScript?",
      tldr: "Type inference means TypeScript guesses the type from the value, so you do not have to write the type everywhere.",
      tags: ["types", "inference"],
      a: [
        { p: "If you give a variable a value, TypeScript already knows its type. You only need to write types where TypeScript cannot figure them out, like function parameters." },
        { code: `let city = "Pune";        // inferred as string
city = 10;                // Error: number is not assignable to string

const count = 5;          // inferred as the literal type 5 (const never changes)

const nums = [1, 2, 3];   // inferred as number[]

function double(n: number) {
  return n * 2;           // return type inferred as number
}`, lang: "typescript" },
        { ul: [
          "**Write types** for function parameters, public APIs and empty values like `let list: string[] = []`.",
          "**Let TypeScript infer** for simple local variables. It keeps the code short and clean."
        ] },
        { note: "💡 A good line for interviews: 'I annotate the boundaries (function inputs and outputs) and let inference handle the inside.'", kind: "tip" }
      ]
    },

    {
      id: "any-type",
      q: "What is the `any` type and why should we avoid it?",
      tldr: "`any` switches off type checking for that value. It is an escape hatch, but using it a lot removes all the benefits of TypeScript.",
      tags: ["types", "any"],
      a: [
        { p: "A value of type `any` can be anything, and TypeScript lets you do anything with it: call it, read any property, pass it anywhere. No errors, no help." },
        { code: `let data: any = "hello";
data.foo.bar();       // no error at compile time... crashes at runtime
data = 42;            // fine
let n: number = data; // fine, any flows into everything`, lang: "typescript" },
        { ul: [
          "It **hides bugs**, which is the opposite of why we use TypeScript.",
          "It **spreads**: anything you assign it to also loses safety.",
          "Autocomplete stops working for that value."
        ] },
        { p: "When is it OK? Moving an old JavaScript project to TypeScript step by step, or a quick prototype. Otherwise prefer `unknown` or a proper type." },
        { note: "Turn on `noImplicitAny` (part of `strict`) so TypeScript complains when it would silently fall back to `any`.", kind: "tip" }
      ]
    },

    {
      id: "unknown-vs-any",
      q: "What is the difference between `unknown` and `any`?",
      tldr: "Both accept any value, but `unknown` forces you to check the type before you use it, while `any` lets you do anything without checks.",
      tags: ["types", "any", "unknown"],
      seeAlso: ["typescript-basic/any-type", "typescript-intermediate/type-guards"],
      a: [
        { code: `let a: any = getData();
a.toUpperCase();          // allowed, even if it is not a string

let u: unknown = getData();
u.toUpperCase();          // Error: 'u' is of type 'unknown'

if (typeof u === "string") {
  u.toUpperCase();        // OK, TypeScript now knows it is a string
}`, lang: "typescript" },
        { table: { head: ["", "`any`", "`unknown`"], rows: [
          ["Can hold any value", "Yes", "Yes"],
          ["Can use it without checking", "Yes", "No"],
          ["Can assign to other types", "Yes", "Only to `unknown` or `any`"],
          ["Safe?", "No", "Yes"]
        ] } },
        { note: "💡 Simple way to explain: '`any` says trust me. `unknown` says I do not know yet, so prove it first.' Use `unknown` for API responses, `JSON.parse` results and caught errors.", kind: "tip" }
      ]
    },

    {
      id: "void-and-never",
      q: "What are the `void` and `never` types?",
      tldr: "`void` means a function finishes but returns nothing useful; `never` means a function never finishes normally, because it always throws or loops forever.",
      tags: ["types"],
      a: [
        { code: `function logMessage(msg: string): void {
  console.log(msg);       // finishes, returns nothing
}

function fail(msg: string): never {
  throw new Error(msg);   // never reaches the end
}

function runForever(): never {
  while (true) { }
}`, lang: "typescript" },
        { ul: [
          "**`void`**: the function returns, just without a value (really it returns `undefined`).",
          "**`never`**: the function **never returns at all**. Also used for values that can never exist."
        ] },
        { p: "`never` is also very useful for **exhaustive checks** in a switch. If you forget a case, the compiler tells you." },
        { code: `type Shape = "circle" | "square";

function area(s: Shape) {
  switch (s) {
    case "circle": return 1;
    case "square": return 2;
    default:
      const check: never = s;   // Error here if a new Shape is added and not handled
      return check;
  }
}`, lang: "typescript" }
      ]
    },

    {
      id: "null-and-undefined",
      q: "What is the difference between `null` and `undefined` in TypeScript?",
      tldr: "`undefined` means a value was never set; `null` means it was set to 'no value' on purpose. With strictNullChecks, TypeScript makes you handle both.",
      tags: ["types", "null"],
      a: [
        { ul: [
          "**`undefined`**: a variable declared but not assigned, a missing property, a missing function argument.",
          "**`null`**: a developer set it to empty on purpose, for example 'no user selected'."
        ] },
        { code: `let a: string;
console.log(a);            // undefined (and an error in strict mode: used before assigned)

let selected: string | null = null;   // clearly means 'nothing selected'`, lang: "typescript" },
        { p: "With **`strictNullChecks`** on (part of `strict`), `null` and `undefined` are not allowed in a `string` unless you say so. This removes the classic 'cannot read property of undefined' error." },
        { code: `function greet(name: string | undefined) {
  name.toUpperCase();          // Error: 'name' is possibly 'undefined'
  name?.toUpperCase();         // OK, optional chaining
  (name ?? "Guest").toUpperCase();  // OK, default value
}`, lang: "typescript" },
        { note: "Always keep `strict: true` in tsconfig. Most of TypeScript's real value comes from strict null checks.", kind: "tip" }
      ]
    },

    {
      id: "arrays-and-tuples",
      q: "What is the difference between an array and a tuple in TypeScript?",
      tldr: "An array holds any number of items of the same type; a tuple holds a fixed number of items where each position has its own type.",
      tags: ["types", "arrays"],
      a: [
        { code: `// Array: any length, same type
let fruits: string[] = ["apple", "mango"];
let ids: Array<number> = [1, 2, 3];      // same thing, generic style

// Tuple: fixed length, type per position
let person: [string, number] = ["Neha", 25];
person = [25, "Neha"];     // Error: wrong order

// Named tuple elements (easier to read)
type Range = [start: number, end: number];

// Common real example: React useState returns a tuple
const [count, setCount] = useState(0);`, lang: "typescript" },
        { ul: [
          "Use an **array** for a list of similar things.",
          "Use a **tuple** when position matters, like a coordinate `[x, y]` or a key/value pair.",
          "Add `readonly` to stop changes: `readonly string[]` or `readonly [number, number]`."
        ] },
        { note: "If a tuple gets more than 2 or 3 items, use an object instead. `user.age` is much clearer than `user[3]`.", kind: "tip" }
      ]
    },

    {
      id: "enums",
      q: "What are enums in TypeScript?",
      tldr: "An enum is a set of named constants, like Direction.Up or Status.Active, that makes code more readable than raw numbers or strings.",
      tags: ["enums"],
      a: [
        { code: `// Numeric enum: values start at 0 and go up
enum Direction {
  Up,      // 0
  Down,    // 1
  Left,    // 2
  Right    // 3
}

// String enum: each value set by hand (easier to debug)
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE"
}

let move: Direction = Direction.Up;
if (user.status === Status.Active) { }`, lang: "typescript" },
        { ul: [
          "**Numeric enums** auto-increment and allow reverse lookup (`Direction[0]` gives `\"Up\"`).",
          "**String enums** are clearer in logs and API data.",
          "**`const enum`** is removed at compile time and the values are inlined, so no extra code is generated."
        ] },
        { p: "Unlike most TypeScript features, a normal enum **does produce real JavaScript code** (an object)." },
        { note: "Many teams now prefer a union of strings instead: `type Status = \"active\" | \"inactive\"`. It is simpler and adds no runtime code. Mention this; it shows you know the trade-off.", kind: "tip" }
      ]
    },

    {
      id: "union-types",
      q: "What are union types?",
      tldr: "A union type means a value can be one of several types, written with a pipe, like string | number.",
      tags: ["types", "unions"],
      a: [
        { code: `let id: string | number;
id = 101;       // OK
id = "A101";    // OK
id = true;      // Error

function printId(id: string | number) {
  if (typeof id === "string") {
    console.log(id.toUpperCase());   // here id is string
  } else {
    console.log(id.toFixed(0));      // here id is number
  }
}`, lang: "typescript" },
        { p: "Before you narrow it, you can only use things that exist on **every** member of the union. Checking with `typeof`, `in` or `instanceof` narrows the type inside that block." },
        { note: "💡 Think of `|` as 'OR'. The value is this OR that.", kind: "tip" }
      ]
    },

    {
      id: "literal-types",
      q: "What are literal types?",
      tldr: "A literal type is an exact value used as a type, like \"GET\" or 404, so the variable can only be that specific value.",
      tags: ["types", "unions"],
      a: [
        { code: `type Method = "GET" | "POST" | "PUT" | "DELETE";

function request(url: string, method: Method) { }

request("/users", "GET");     // OK
request("/users", "FETCH");   // Error: not one of the allowed values

type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;`, lang: "typescript" },
        { p: "Combining literal types with a union gives you a simple and safe **list of allowed values**, with autocomplete in the editor. It works a lot like an enum, but with no extra JavaScript." },
        { note: "`const x = \"GET\"` is inferred as the literal type `\"GET\"`, but `let x = \"GET\"` is inferred as `string`, because a `let` can change later.", kind: "tip" }
      ]
    },

    {
      id: "type-alias",
      q: "What is a type alias?",
      tldr: "A type alias gives a name to any type using the `type` keyword, so you can reuse it instead of writing the same type again and again.",
      tags: ["types", "type-alias"],
      a: [
        { code: `type UserId = string | number;

type User = {
  id: UserId;
  name: string;
  email?: string;
};

type Callback = (error: Error | null, data?: string) => void;

function getUser(id: UserId): User { ... }`, lang: "typescript" },
        { p: "A type alias does not create a new type. It is just a **nickname** for an existing one. It can name anything: objects, unions, tuples, functions or primitives." },
        { note: "Next question is almost always 'type vs interface?'. Be ready for it.", kind: "tip" }
      ]
    },

    {
      id: "interfaces",
      q: "What is an interface in TypeScript?",
      tldr: "An interface describes the shape of an object: which properties and methods it must have and their types.",
      tags: ["interfaces", "oop"],
      a: [
        { code: `interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;          // optional
  readonly createdAt: Date;      // cannot be changed after creation
  getLabel(): string;            // method
}

const p: Product = {
  id: 1,
  name: "Pen",
  price: 10,
  createdAt: new Date(),
  getLabel() { return this.name + " - " + this.price; }
};`, lang: "typescript" },
        { ul: [
          "It is a **contract**: any object of this type must follow it.",
          "Interfaces can **extend** other interfaces.",
          "A class can **implement** an interface.",
          "Interfaces are **removed after compile**. They exist only for type checking."
        ] },
        { note: "TypeScript uses **structural typing**: if an object has the right shape, it fits the interface. It does not need to say 'implements'.", kind: "tip" }
      ]
    },

    {
      id: "type-vs-interface",
      q: "What is the difference between `type` and `interface`?",
      tldr: "Both can describe object shapes. Interfaces can be extended and merged, and are best for object contracts; types can also describe unions, tuples and primitives.",
      tags: ["interfaces", "type-alias"],
      seeAlso: ["typescript-basic/interfaces", "typescript-basic/type-alias"],
      a: [
        { table: { head: ["", "`interface`", "`type`"], rows: [
          ["Object shapes", "Yes", "Yes"],
          ["Union types (`A | B`)", "No", "Yes"],
          ["Tuples and primitives", "No", "Yes"],
          ["Extend", "`extends` keyword", "`&` (intersection)"],
          ["Declaration merging", "Yes (same name merges)", "No (same name is an error)"],
          ["Class can implement it", "Yes", "Yes (if it is an object type)"]
        ] } },
        { code: `// interface can be declared twice and it merges
interface Car { brand: string; }
interface Car { year: number; }
const c: Car = { brand: "Tata", year: 2024 };   // needs both

// type can do unions, interface cannot
type Result = "success" | "error";`, lang: "typescript" },
        { note: "💡 Simple rule to say: 'I use interface for object shapes and class contracts, and type for unions, tuples and more complex combinations.' Both are fine; being consistent matters more.", kind: "tip" }
      ]
    },

    {
      id: "optional-and-readonly",
      q: "What are optional and readonly properties?",
      tldr: "A `?` after a property name makes it optional (it may be missing); `readonly` means it can be set once and never changed after that.",
      tags: ["interfaces"],
      a: [
        { code: `interface Config {
  readonly apiUrl: string;   // set once, cannot change
  timeout?: number;          // may or may not be there
}

const cfg: Config = { apiUrl: "https://api.site.com" };   // OK, timeout missing

cfg.apiUrl = "other";       // Error: cannot assign to 'apiUrl' because it is read-only
cfg.timeout?.toFixed();     // timeout is number | undefined, so check first`, lang: "typescript" },
        { ul: [
          "An optional property has type `T | undefined`, so you must handle `undefined`.",
          "`readonly` is only checked at **compile time**. It does not freeze the object at runtime (use `Object.freeze` for that).",
          "`readonly` is **shallow**: a readonly array property can still have items pushed unless the array type is also readonly."
        ] }
      ]
    },

    {
      id: "function-types",
      q: "How do you add types to functions in TypeScript?",
      tldr: "You add a type to each parameter and, optionally, to the return value. You can also describe the whole function with a function type.",
      tags: ["functions"],
      a: [
        { code: `// Normal function
function add(a: number, b: number): number {
  return a + b;
}

// Arrow function
const multiply = (a: number, b: number): number => a * b;

// A function type, useful for callbacks
type MathOp = (a: number, b: number) => number;
const subtract: MathOp = (a, b) => a - b;    // a and b are inferred

// Function that returns nothing
function log(msg: string): void {
  console.log(msg);
}`, lang: "typescript" },
        { ul: [
          "Parameters **must** be typed (otherwise they become `any`, an error in strict mode).",
          "The return type is usually inferred, but writing it on public functions makes intent clear and catches mistakes.",
          "TypeScript checks the **number** of arguments too; passing extra or missing arguments is an error."
        ] }
      ]
    },

    {
      id: "optional-default-rest-params",
      q: "What are optional, default and rest parameters?",
      tldr: "Optional parameters use `?` and may be skipped, default parameters get a value if skipped, and rest parameters collect any number of arguments into an array.",
      tags: ["functions"],
      a: [
        { code: `// Optional: may be undefined
function greet(name: string, title?: string) {
  return title ? title + " " + name : name;
}
greet("Amit");            // OK
greet("Amit", "Dr.");     // OK

// Default: gets a value when not passed
function connect(host: string, port: number = 3000) { }
connect("localhost");     // port is 3000

// Rest: any number of values, collected into an array
function sum(...numbers: number[]): number {
  return numbers.reduce((total, n) => total + n, 0);
}
sum(1, 2, 3, 4);          // 10`, lang: "typescript" },
        { note: "Optional parameters must come **after** required ones. A rest parameter must be the **last** one.", kind: "warn" }
      ]
    },

    {
      id: "classes",
      q: "How do classes work in TypeScript?",
      tldr: "Classes work like JavaScript classes, but TypeScript adds typed properties, access modifiers, readonly, abstract classes and interface implementation.",
      tags: ["oop", "classes"],
      a: [
        { code: `class Employee {
  name: string;
  private salary: number;

  constructor(name: string, salary: number) {
    this.name = name;
    this.salary = salary;
  }

  getDetails(): string {
    return this.name + " earns " + this.salary;
  }
}

class Manager extends Employee {
  constructor(name: string, salary: number, public team: string) {
    super(name, salary);    // must call parent constructor first
  }
}

const m = new Manager("Priya", 90000, "Sales");`, lang: "typescript" },
        { ul: [
          "Every property must be **declared** with a type.",
          "`extends` for inheritance; `super()` calls the parent constructor.",
          "`implements` checks that a class follows an interface.",
          "Supports `public`, `private`, `protected`, `readonly`, `static` and `abstract`."
        ] }
      ]
    },

    {
      id: "access-modifiers",
      q: "What are access modifiers in TypeScript?",
      tldr: "public means anyone can use it, private means only inside the class, and protected means inside the class and its child classes.",
      tags: ["oop", "classes"],
      a: [
        { table: { head: ["Modifier", "Who can access"], rows: [
          ["`public` (default)", "Everyone"],
          ["`private`", "Only inside the same class"],
          ["`protected`", "The class and classes that extend it"],
          ["`readonly`", "Anyone can read, only the constructor can set"]
        ] } },
        { code: `class BankAccount {
  public owner: string;
  private balance: number = 0;
  protected bankCode = "HDFC";
  readonly accountNo: string;

  constructor(owner: string, accountNo: string) {
    this.owner = owner;
    this.accountNo = accountNo;
  }
}

const acc = new BankAccount("Raj", "123");
acc.balance;      // Error: 'balance' is private`, lang: "typescript" },
        { note: "TypeScript's `private` is only checked at compile time. In the JavaScript output, it is a normal property. For real runtime privacy use JavaScript's `#balance` private fields.", kind: "warn" }
      ]
    },

    {
      id: "parameter-properties",
      q: "What are parameter properties (constructor shorthand)?",
      tldr: "Adding an access modifier to a constructor parameter creates and assigns the class property automatically, which saves a lot of boilerplate.",
      tags: ["oop", "classes"],
      a: [
        { code: `// Long way
class User {
  private name: string;
  private age: number;
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
}

// Short way: same result
class User2 {
  constructor(private name: string, private age: number) { }
}`, lang: "typescript" },
        { p: "Any of `public`, `private`, `protected` or `readonly` on a constructor parameter does this. You see it everywhere in **Angular**, especially for dependency injection: `constructor(private http: HttpClient) {}`." }
      ]
    },

    {
      id: "abstract-classes",
      q: "What is an abstract class?",
      tldr: "An abstract class is a base class that cannot be created directly; it can have shared code plus abstract methods that child classes must write.",
      tags: ["oop", "classes"],
      a: [
        { code: `abstract class Shape {
  constructor(public name: string) { }

  abstract area(): number;          // no body, child must implement

  describe(): string {              // normal shared method
    return this.name + " has area " + this.area();
  }
}

class Circle extends Shape {
  constructor(private r: number) { super("Circle"); }
  area() { return Math.PI * this.r * this.r; }
}

new Shape("x");        // Error: cannot create an instance of an abstract class
new Circle(2).describe();`, lang: "typescript" },
        { table: { head: ["", "Abstract class", "Interface"], rows: [
          ["Has real code", "Yes", "No, only shape"],
          ["Has constructor", "Yes", "No"],
          ["How many can you use", "Extend only one", "Implement many"],
          ["Exists at runtime", "Yes", "No"]
        ] } }
      ]
    },

    {
      id: "implements-interface",
      q: "How does a class implement an interface?",
      tldr: "Using `implements`, a class promises to have every property and method the interface describes, and the compiler checks that promise.",
      tags: ["oop", "interfaces"],
      a: [
        { code: `interface Logger {
  log(message: string): void;
}

interface Closeable {
  close(): void;
}

class FileLogger implements Logger, Closeable {
  log(message: string) {
    console.log("[file] " + message);
  }
  close() {
    console.log("closed");
  }
}`, lang: "typescript" },
        { ul: [
          "A class can implement **many** interfaces, but extend only **one** class.",
          "`implements` only checks the class. It does **not** add any code or types to it.",
          "This lets you write code against the interface (`Logger`) and swap the real class later, which is great for testing."
        ] }
      ]
    },

    {
      id: "type-assertion",
      q: "What is type assertion in TypeScript?",
      tldr: "Type assertion (using `as`) tells the compiler 'trust me, I know the type'. It does not convert or check anything at runtime.",
      tags: ["types", "casting"],
      a: [
        { code: `const input = document.getElementById("email") as HTMLInputElement;
input.value;    // OK, TypeScript now treats it as an input element

// Older syntax, not allowed in .tsx files
const input2 = <HTMLInputElement>document.getElementById("email");`, lang: "typescript" },
        { ul: [
          "It is only a **compile-time hint**. No runtime conversion, no runtime check.",
          "If you are wrong, the code can still crash at runtime.",
          "TypeScript blocks obviously wrong assertions like `\"hello\" as number`."
        ] },
        { note: "Prefer checking the type (narrowing) over asserting it. Use `as` only when you really know more than the compiler, like with DOM elements.", kind: "warn" }
      ]
    },

    {
      id: "non-null-assertion",
      q: "What is the non-null assertion operator (`!`)?",
      tldr: "Putting `!` after a value tells TypeScript 'this is not null or undefined', which removes the error but also removes the safety.",
      tags: ["null", "operators"],
      a: [
        { code: `const btn = document.getElementById("save");   // HTMLElement | null
btn.addEventListener("click", save);              // Error: possibly null

btn!.addEventListener("click", save);             // OK, you promise it exists

// Safer ways
btn?.addEventListener("click", save);             // skip if null
if (btn) btn.addEventListener("click", save);     // check first`, lang: "typescript" },
        { note: "If you are wrong, you get the same runtime crash TypeScript was trying to prevent. Use `!` rarely, and only when you are 100% sure.", kind: "warn" }
      ]
    },

    {
      id: "optional-chaining-nullish",
      q: "What are optional chaining (`?.`) and nullish coalescing (`??`)?",
      tldr: "`?.` safely reads a property and stops if something is null or undefined; `??` gives a default value only when the left side is null or undefined.",
      tags: ["operators", "null"],
      a: [
        { code: `const city = user?.address?.city;      // undefined if user or address is missing
user.getName?.();                      // call only if the method exists

const pageSize = settings.pageSize ?? 20;   // 20 only if null or undefined`, lang: "typescript" },
        { p: "The big difference between `??` and `||`:" },
        { code: `const count = 0;
count || 10;    // 10  (because 0 is falsy)
count ?? 10;    // 0   (because 0 is not null or undefined)

const title = "";
title || "Untitled";   // "Untitled"
title ?? "Untitled";   // ""`, lang: "typescript" },
        { note: "💡 Say: 'Use `??` when 0, empty string or false are valid values. Use `||` when any falsy value should be replaced.'", kind: "tip" }
      ]
    },

    {
      id: "tsconfig",
      q: "What is tsconfig.json and what are its important options?",
      tldr: "tsconfig.json is the settings file for the TypeScript compiler: which files to compile, what JavaScript version to output, and how strict the checks are.",
      tags: ["tooling", "compiler"],
      a: [
        { code: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}`, lang: "json" },
        { table: { head: ["Option", "What it does"], rows: [
          ["`target`", "Which JavaScript version to output"],
          ["`module`", "Which module system to use (ESNext, CommonJS)"],
          ["`strict`", "Turns on all strict checks. Always keep it on."],
          ["`outDir` / `rootDir`", "Where output goes / where source lives"],
          ["`sourceMap`", "Lets you debug the TypeScript code in the browser"],
          ["`noEmit`", "Only type check, do not write any files"],
          ["`include` / `exclude`", "Which files are part of the project"]
        ] } }
      ]
    },

    {
      id: "strict-mode",
      q: "What does `strict` mode do in TypeScript?",
      tldr: "`strict: true` turns on a group of stricter checks, like no implicit any and strict null checks, that catch far more bugs.",
      tags: ["tooling", "compiler"],
      a: [
        { ul: [
          "**`noImplicitAny`**: error when a type cannot be inferred and would silently become `any`.",
          "**`strictNullChecks`**: `null` and `undefined` must be handled explicitly.",
          "**`strictPropertyInitialization`**: class properties must be set in the constructor.",
          "**`strictFunctionTypes`**: stricter checks on function parameter types.",
          "**`useUnknownInCatchVariables`**: the error in `catch (e)` is `unknown`, not `any`.",
          "**`alwaysStrict`**: adds 'use strict' to every output file."
        ] },
        { code: `// With strict on, this is an error: 'err' is of type 'unknown'
try { run(); }
catch (err) {
  console.log(err.message);          // Error
  if (err instanceof Error) {
    console.log(err.message);        // OK
  }
}`, lang: "typescript" },
        { note: "For new projects, always start with `strict: true`. For old JavaScript projects, turn checks on one by one.", kind: "tip" }
      ]
    },

    {
      id: "modules",
      q: "How do modules (import and export) work in TypeScript?",
      tldr: "Any file with a top-level import or export is a module; you export what you want to share and import it in other files, just like modern JavaScript.",
      tags: ["modules"],
      a: [
        { code: `// math.ts
export function add(a: number, b: number) { return a + b; }
export const PI = 3.14;
export default class Calculator { }

// types.ts
export interface User { id: number; name: string; }

// app.ts
import Calculator, { add, PI } from "./math";
import type { User } from "./types";    // type-only import, removed after compile`, lang: "typescript" },
        { ul: [
          "**Named exports** can be many per file; **default export** is one per file.",
          "`import type` makes it clear you only need the type, so it is fully removed from the JavaScript.",
          "A file **without** any import or export is a global script, and its variables leak into the global scope."
        ] },
        { note: "Many teams avoid default exports because named exports give better autocomplete and safer renaming.", kind: "tip" }
      ]
    }

  ]
});
