/* TypeScript - Intermediate. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "typescript-intermediate",
  topic: "TypeScript",
  level: "Intermediate",
  short: "TypeScript Intermediate",
  accent: "sky",
  desc: "Generics, narrowing, utility types, mapped and conditional types, declaration files and decorators, explained in simple words you can repeat in an interview.",
  questions: [

    {
      id: "generics",
      q: "What are generics in TypeScript and why are they useful?",
      tldr: "Generics let you write one function, class or type that works with many types while still keeping full type safety, using a type placeholder like <T>.",
      tags: ["generics"],
      a: [
        { p: "Think of `T` as a **variable for a type**. The caller decides what `T` is, and TypeScript remembers it." },
        { code: `// Without generics: we lose the type
function firstAny(list: any[]): any {
  return list[0];
}
const a = firstAny([1, 2, 3]);    // any, no help from the editor

// With generics: the type flows through
function first<T>(list: T[]): T {
  return list[0];
}
const n = first([1, 2, 3]);        // number
const s = first(["a", "b"]);       // string
const u = first<string>(["x"]);    // you can also pass T yourself`, lang: "typescript" },
        { ul: [
          "**Reusable**: one piece of code for many types.",
          "**Type safe**: unlike `any`, the real type is kept.",
          "Used everywhere: `Array<T>`, `Promise<T>`, `Map<K, V>`, React `useState<T>`."
        ] },
        { note: "💡 Say it like this: 'Generics are like function parameters, but for types. I pass the type in, and the function keeps it safe all the way through.'", kind: "tip" }
      ]
    },

    {
      id: "generic-constraints",
      q: "What are generic constraints (`extends` in generics)?",
      tldr: "A constraint limits what T can be, using `T extends Something`, so you can safely use properties of that something inside the function.",
      tags: ["generics"],
      seeAlso: ["typescript-intermediate/generics", "typescript-intermediate/keyof-operator"],
      a: [
        { code: `// Error: T might not have a length
function logLength<T>(item: T) {
  console.log(item.length);
}

// Fix: T must have a length property
function logLength2<T extends { length: number }>(item: T) {
  console.log(item.length);   // OK
}

logLength2("hello");     // OK, string has length
logLength2([1, 2]);      // OK, array has length
logLength2(42);          // Error: number has no length`, lang: "typescript" },
        { p: "A very common pattern combines a constraint with `keyof` to safely read a property:" },
        { code: `function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "Anu", age: 30 };
getProp(user, "name");     // string
getProp(user, "salary");   // Error: not a key of user`, lang: "typescript" }
      ]
    },

    {
      id: "generic-interfaces-classes",
      q: "How do you use generics with interfaces and classes? What are default type parameters?",
      tldr: "Interfaces and classes can take type parameters just like functions, and a default type (T = string) is used when the caller does not pass one.",
      tags: ["generics", "interfaces"],
      a: [
        { code: `// Generic interface: a common API response wrapper
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

const res: ApiResponse<User[]> = await fetchUsers();
res.data[0].name;     // fully typed

// Generic class
class Stack<T> {
  private items: T[] = [];
  push(item: T) { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
}

const numbers = new Stack<number>();
numbers.push(1);
numbers.push("two");    // Error

// Default type parameter
interface Box<T = string> {
  value: T;
}
const b: Box = { value: "hi" };         // T is string by default
const c: Box<number> = { value: 5 };`, lang: "typescript" },
        { note: "A generic `ApiResponse<T>` wrapper is a great real project example to mention in interviews.", kind: "tip" }
      ]
    },

    {
      id: "keyof-operator",
      q: "What does the `keyof` operator do?",
      tldr: "`keyof` takes an object type and gives you a union of its property names as string literal types.",
      tags: ["type-operators"],
      a: [
        { code: `interface User {
  id: number;
  name: string;
  email: string;
}

type UserKeys = keyof User;     // "id" | "name" | "email"

function sortBy(users: User[], key: keyof User) { }

sortBy(list, "name");      // OK
sortBy(list, "phone");     // Error: not a key of User`, lang: "typescript" },
        { p: "`keyof` is the base for many advanced features: generic constraints (`K extends keyof T`), mapped types and utility types like `Pick` and `Omit`." },
        { note: "If you rename a property in `User`, every `keyof User` usage updates automatically. No more broken magic strings.", kind: "tip" }
      ]
    },

    {
      id: "typeof-type-operator",
      q: "What does `typeof` do in a type position?",
      tldr: "In a type, `typeof` takes the type of an existing variable or object, so you do not have to write the type again by hand.",
      tags: ["type-operators"],
      a: [
        { code: `const config = {
  apiUrl: "https://api.site.com",
  retries: 3,
  debug: false
};

type Config = typeof config;
// { apiUrl: string; retries: number; debug: boolean }

function createUser(name: string, age: number) {
  return { name, age, createdAt: new Date() };
}
type NewUser = ReturnType<typeof createUser>;

// Very common combo: keys of an object value
type ConfigKey = keyof typeof config;   // "apiUrl" | "retries" | "debug"`, lang: "typescript" },
        { table: { head: ["Where", "What `typeof` does"], rows: [
          ["In normal code (`typeof x === \"string\"`)", "JavaScript runtime check, returns a string"],
          ["In a type (`type T = typeof x`)", "TypeScript compile-time: gets the type of `x`"]
        ] } }
      ]
    },

    {
      id: "indexed-access-types",
      q: "What are indexed access types?",
      tldr: "An indexed access type like User[\"address\"] reads the type of a property from another type, the same way you read a value from an object.",
      tags: ["type-operators"],
      a: [
        { code: `interface User {
  id: number;
  address: { city: string; pin: string };
  roles: string[];
}

type Address = User["address"];       // { city: string; pin: string }
type City = User["address"]["city"];  // string
type IdOrRoles = User["id" | "roles"];  // number | string[]

// Type of one item in an array
type Role = User["roles"][number];    // string

const statuses = ["active", "blocked"] as const;
type Status = (typeof statuses)[number];   // "active" | "blocked"`, lang: "typescript" },
        { p: "This keeps types **in sync**: if the `address` shape changes, `Address` changes with it." }
      ]
    },

    {
      id: "intersection-types",
      q: "What are intersection types and how are they different from union types?",
      tldr: "An intersection (A & B) means a value must have everything from both types; a union (A | B) means it can be either one.",
      tags: ["types", "unions"],
      a: [
        { code: `type Person = { name: string };
type Employee = { employeeId: number };

// Intersection: must have BOTH
type Staff = Person & Employee;
const s: Staff = { name: "Kiran", employeeId: 7 };

// Union: can be EITHER
type Contact = Person | Employee;
const c1: Contact = { name: "Kiran" };       // OK
const c2: Contact = { employeeId: 7 };       // OK`, lang: "typescript" },
        { table: { head: ["", "Union `A | B`", "Intersection `A & B`"], rows: [
          ["Meaning", "A OR B", "A AND B"],
          ["Value needs", "Fields of at least one", "Fields of both"],
          ["Safe to use directly", "Only shared fields", "All fields"]
        ] } },
        { note: "Intersecting primitives that cannot overlap gives `never`: `string & number` is `never`.", kind: "warn" }
      ]
    },

    {
      id: "type-guards",
      q: "What is type narrowing and what are type guards?",
      tldr: "Narrowing is when TypeScript makes a wide type more specific inside an if block, based on checks like typeof, instanceof, in or equality. Those checks are type guards.",
      tags: ["narrowing", "type-guards"],
      a: [
        { code: `function format(value: string | number | Date) {
  if (typeof value === "string") {
    return value.trim();              // string
  }
  if (value instanceof Date) {
    return value.toISOString();       // Date
  }
  return value.toFixed(2);            // number (only option left)
}

type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    animal.swim();                    // Fish
  } else {
    animal.fly();                     // Bird
  }
}`, lang: "typescript" },
        { table: { head: ["Guard", "Use for"], rows: [
          ["`typeof`", "Primitives: string, number, boolean, function"],
          ["`instanceof`", "Classes: Date, Error, your own classes"],
          ["`in`", "Checking if an object has a property"],
          ["`===` / `!==`", "Literal values and null checks"],
          ["Truthiness (`if (x)`)", "Removing null and undefined"]
        ] } },
        { note: "`typeof null` is `\"object\"` in JavaScript. So `typeof x === \"object\"` does not remove null. Check null separately.", kind: "warn" }
      ]
    },

    {
      id: "user-defined-type-guards",
      q: "What is a user-defined type guard (the `is` keyword)?",
      tldr: "It is a function that returns `value is SomeType`; when it returns true, TypeScript narrows the value to that type in the calling code.",
      tags: ["narrowing", "type-guards"],
      seeAlso: ["typescript-intermediate/type-guards"],
      a: [
        { code: `interface Cat { meow(): void }
interface Dog { bark(): void }

function isCat(pet: Cat | Dog): pet is Cat {
  return (pet as Cat).meow !== undefined;
}

function speak(pet: Cat | Dog) {
  if (isCat(pet)) {
    pet.meow();     // TypeScript knows it is a Cat
  } else {
    pet.bark();     // and here it is a Dog
  }
}

// Handy with filter
const values = [1, null, 2, undefined, 3];
const nums = values.filter((v): v is number => v != null);   // number[]`, lang: "typescript" },
        { p: "This is how you safely check `unknown` data from APIs: write a guard that checks the shape, then use it." },
        { note: "TypeScript trusts your guard completely. If the check inside is wrong, the types will be wrong too. Keep guard logic simple and correct.", kind: "warn" }
      ]
    },

    {
      id: "discriminated-unions",
      q: "What are discriminated unions?",
      tldr: "A discriminated union is a union of object types that all share one common literal field (like `type` or `kind`), so checking that field tells TypeScript exactly which type you have.",
      tags: ["unions", "narrowing"],
      a: [
        { code: `type Loading = { status: "loading" };
type Success = { status: "success"; data: string[] };
type Failed  = { status: "error"; message: string };

type State = Loading | Success | Failed;

function render(state: State) {
  switch (state.status) {
    case "loading":
      return "Loading...";
    case "success":
      return state.data.join(", ");   // data exists here
    case "error":
      return state.message;           // message exists here
  }
}`, lang: "typescript" },
        { ul: [
          "The shared field (`status`) is called the **discriminant** or **tag**.",
          "It makes **impossible states impossible**: you cannot have `data` while `status` is `\"error\"`.",
          "Very common for API states, Redux actions and form states.",
          "Add a `never` check in `default` so the compiler warns you when a new case is added."
        ] },
        { note: "💡 This is one of the most useful TypeScript patterns in real projects. Giving a loading/success/error example in an interview shows practical experience.", kind: "tip" }
      ]
    },

    {
      id: "utility-types-partial-required-readonly",
      q: "What are the Partial, Required and Readonly utility types?",
      tldr: "Partial makes all properties optional, Required makes all properties required, and Readonly makes all properties read-only.",
      tags: ["utility-types"],
      a: [
        { code: `interface User {
  id: number;
  name: string;
  email?: string;
}

// Partial: every field optional, perfect for update functions
function updateUser(id: number, changes: Partial<User>) { }
updateUser(1, { name: "New name" });   // OK, other fields not needed

// Required: every field must be present
const full: Required<User> = { id: 1, name: "A", email: "a@b.com" };

// Readonly: nothing can be changed
const frozen: Readonly<User> = { id: 1, name: "A" };
frozen.name = "B";    // Error`, lang: "typescript" },
        { p: "Utility types are **built-in generic types** that transform another type. They save you from writing the same type many times in slightly different shapes." },
        { note: "All three are **shallow**: they only affect top-level properties, not nested objects.", kind: "warn" }
      ]
    },

    {
      id: "pick-and-omit",
      q: "What are Pick and Omit?",
      tldr: "Pick creates a new type with only the properties you choose; Omit creates a new type with everything except the properties you remove.",
      tags: ["utility-types"],
      a: [
        { code: `interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

// Only these fields
type UserPreview = Pick<User, "id" | "name">;
// { id: number; name: string }

// Everything except password
type PublicUser = Omit<User, "password">;
// { id: number; name: string; email: string }

// Create form: server generates the id
type CreateUserDto = Omit<User, "id">;`, lang: "typescript" },
        { p: "Use **Pick** when you want a few fields, and **Omit** when you want most fields. Both stay linked to the original type, so changes flow automatically." },
        { note: "`Pick` gives an error for keys that do not exist, but `Omit` accepts any string. A typo in `Omit` fails silently.", kind: "warn" }
      ]
    },

    {
      id: "record-type",
      q: "What is the Record utility type?",
      tldr: "Record<K, V> creates an object type where the keys are of type K and every value is of type V.",
      tags: ["utility-types"],
      a: [
        { code: `// Simple dictionary
const scores: Record<string, number> = {
  maths: 90,
  science: 85
};

// Keys from a union: every key is REQUIRED
type Role = "admin" | "editor" | "viewer";

const permissions: Record<Role, string[]> = {
  admin: ["read", "write", "delete"],
  editor: ["read", "write"],
  viewer: ["read"]
};   // missing a role would be an error`, lang: "typescript" },
        { note: "Using a union for the keys is the best part: if someone adds a new `Role`, TypeScript forces them to add its permissions too.", kind: "tip" }
      ]
    },

    {
      id: "exclude-extract-nonnullable",
      q: "What do Exclude, Extract and NonNullable do?",
      tldr: "They filter union types: Exclude removes members, Extract keeps only matching members, and NonNullable removes null and undefined.",
      tags: ["utility-types", "unions"],
      a: [
        { code: `type Status = "active" | "inactive" | "banned" | "deleted";

type VisibleStatus = Exclude<Status, "deleted">;
// "active" | "inactive" | "banned"

type BadStatus = Extract<Status, "banned" | "deleted">;
// "banned" | "deleted"

type MaybeName = string | null | undefined;
type Name = NonNullable<MaybeName>;
// string`, lang: "typescript" },
        { table: { head: ["Utility", "Works on", "Does"], rows: [
          ["`Omit<T, K>`", "Object types", "Removes properties"],
          ["`Exclude<T, U>`", "Union types", "Removes union members"],
          ["`Extract<T, U>`", "Union types", "Keeps matching union members"],
          ["`NonNullable<T>`", "Any type", "Removes null and undefined"]
        ] } },
        { note: "Common confusion: `Omit` is for **object properties**, `Exclude` is for **union members**.", kind: "tip" }
      ]
    },

    {
      id: "returntype-parameters-awaited",
      q: "What are ReturnType, Parameters and Awaited?",
      tldr: "ReturnType gets a function's return type, Parameters gets its parameter types as a tuple, and Awaited gets the value inside a Promise.",
      tags: ["utility-types", "functions"],
      a: [
        { code: `function createOrder(userId: number, items: string[]) {
  return { id: 1, userId, items, total: 500 };
}

type Order = ReturnType<typeof createOrder>;
// { id: number; userId: number; items: string[]; total: number }

type OrderArgs = Parameters<typeof createOrder>;
// [userId: number, items: string[]]

async function fetchUser() {
  return { id: 1, name: "Meera" };
}

type UserResult = Awaited<ReturnType<typeof fetchUser>>;
// { id: number; name: string }   (not the Promise)`, lang: "typescript" },
        { p: "Very handy with **third-party libraries** that do not export their types. You can still get the type straight from the function." }
      ]
    },

    {
      id: "mapped-types",
      q: "What are mapped types?",
      tldr: "A mapped type builds a new type by looping over the keys of another type and changing each property, like a for loop for types.",
      tags: ["mapped-types", "advanced-types"],
      a: [
        { code: `interface User {
  name: string;
  age: number;
}

// Make every property a boolean
type UserFlags = {
  [K in keyof User]: boolean;
};
// { name: boolean; age: boolean }

// This is how Partial is built
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// This is how Readonly is built
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Remove modifiers with a minus sign
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};`, lang: "typescript" },
        { p: "Read `[K in keyof T]` as 'for each key K in T'. Then `T[K]` is the type of that property." },
        { note: "💡 If asked 'how would you write Partial yourself?', this is the answer. It is a very common interview question.", kind: "tip" }
      ]
    },

    {
      id: "conditional-types",
      q: "What are conditional types?",
      tldr: "A conditional type picks one of two types based on a check, written like a ternary: T extends U ? X : Y.",
      tags: ["conditional-types", "advanced-types"],
      a: [
        { code: `type IsString<T> = T extends string ? "yes" : "no";

type A = IsString<"hello">;   // "yes"
type B = IsString<42>;        // "no"

// A useful one: unwrap arrays
type ItemOf<T> = T extends (infer U)[] ? U : T;
type C = ItemOf<string[]>;    // string
type D = ItemOf<number>;      // number

// This is how NonNullable is built
type MyNonNullable<T> = T extends null | undefined ? never : T;`, lang: "typescript" },
        { p: "When `T` is a union, the condition runs **on each member separately** (this is called a distributive conditional type). That is why `Exclude` works:" },
        { code: `type MyExclude<T, U> = T extends U ? never : T;

type R = MyExclude<"a" | "b" | "c", "a">;
// "a" extends "a" ? never : "a"  gives never
// "b" extends "a" ? never : "b"  gives "b"
// "c" extends "a" ? never : "c"  gives "c"
// Result: "b" | "c"`, lang: "typescript" }
      ]
    },

    {
      id: "infer-keyword",
      q: "What does the `infer` keyword do?",
      tldr: "`infer` is used inside a conditional type to capture a part of a type into a new type variable, like pulling the return type out of a function.",
      tags: ["conditional-types", "advanced-types"],
      seeAlso: ["typescript-intermediate/conditional-types"],
      a: [
        { code: `// How ReturnType is built
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type X = MyReturnType<() => number>;   // number

// Get the value inside a Promise
type Unwrap<T> = T extends Promise<infer V> ? V : T;
type Y = Unwrap<Promise<string>>;     // string

// Get the first item type of a tuple
type First<T> = T extends [infer F, ...any[]] ? F : never;
type Z = First<[boolean, string]>;    // boolean`, lang: "typescript" },
        { p: "Simple way to think about it: 'if T looks like this pattern, **grab** this piece and call it R'." },
        { note: "`infer` can only be used in the `extends` part of a conditional type.", kind: "warn" }
      ]
    },

    {
      id: "function-overloads",
      q: "What are function overloads in TypeScript?",
      tldr: "Overloads let one function have several typed call signatures, so the return type can depend on which arguments are passed.",
      tags: ["functions"],
      a: [
        { code: `// Overload signatures (what callers see)
function parse(value: string): number;
function parse(value: number): string;

// Implementation (hidden from callers, must handle all cases)
function parse(value: string | number): string | number {
  return typeof value === "string" ? Number(value) : String(value);
}

const a = parse("42");   // number
const b = parse(42);     // string
parse(true);             // Error: no overload matches`, lang: "typescript" },
        { ul: [
          "Write the **signatures first**, then **one implementation** that covers all of them.",
          "Callers only see the signatures, not the implementation.",
          "Put the most specific overloads first; TypeScript picks the first one that matches."
        ] },
        { note: "If a simple union parameter or a generic works, prefer that. Overloads are best when the return type really changes based on input.", kind: "tip" }
      ]
    },

    {
      id: "index-signatures",
      q: "What is an index signature?",
      tldr: "An index signature describes objects where you do not know the property names in advance, only the type of the keys and values.",
      tags: ["interfaces", "types"],
      a: [
        { code: `interface Dictionary {
  [key: string]: number;
}

const stock: Dictionary = {
  apples: 10,
  mangoes: 25
};
stock["bananas"] = 5;     // OK

// Can mix with known properties, but they must match the value type
interface Headers {
  [name: string]: string;
  contentType: string;    // OK
  length: number;         // Error: number is not string
}`, lang: "typescript" },
        { p: "`Record<string, number>` means the same thing and is often shorter." },
        { note: "`stock[\"anything\"]` is typed as `number`, even if the key does not exist. Turn on `noUncheckedIndexedAccess` to get `number | undefined` and be safe.", kind: "warn" }
      ]
    },

    {
      id: "structural-typing",
      q: "What is structural typing (duck typing) in TypeScript?",
      tldr: "TypeScript checks types by their shape, not by their name: if an object has the required properties, it fits, no matter which class or interface it came from.",
      tags: ["fundamentals", "types"],
      a: [
        { code: `interface Point {
  x: number;
  y: number;
}

class Pixel {
  constructor(public x: number, public y: number, public color: string) { }
}

function draw(p: Point) { }

draw(new Pixel(1, 2, "red"));   // OK, Pixel has x and y
draw({ x: 5, y: 9 });           // OK, plain object with the right shape`, lang: "typescript" },
        { p: "Languages like **C# and Java** use **nominal typing**: types must be declared as related (`implements`, `extends`). TypeScript only cares about the structure." },
        { note: "💡 Simple line: 'If it walks like a duck and quacks like a duck, TypeScript treats it as a duck.'", kind: "tip" }
      ]
    },

    {
      id: "excess-property-checks",
      q: "What are excess property checks?",
      tldr: "When you pass an object literal directly, TypeScript complains about extra properties it does not expect, to catch typos. This check does not apply to variables.",
      tags: ["types", "interfaces"],
      seeAlso: ["typescript-intermediate/structural-typing"],
      a: [
        { code: `interface Options {
  width: number;
  height?: number;
}

function resize(o: Options) { }

resize({ width: 100, heigth: 50 });
// Error: Object literal may only specify known properties.
// Did you mean 'height'?

const opts = { width: 100, heigth: 50 };
resize(opts);   // No error! Not a fresh object literal`, lang: "typescript" },
        { p: "Structural typing normally allows extra properties. But for **fresh object literals**, extra properties are usually a typo, so TypeScript does an extra check." },
        { note: "This explains a classic 'why does this work here but not there?' confusion in interviews.", kind: "tip" }
      ]
    },

    {
      id: "as-const",
      q: "What does `as const` do?",
      tldr: "`as const` makes TypeScript infer the narrowest possible type: exact literal values, readonly properties and readonly tuples instead of general types.",
      tags: ["types", "inference"],
      a: [
        { code: `const a = ["red", "green"];            // string[]
const b = ["red", "green"] as const;   // readonly ["red", "green"]

const settings = { mode: "dark", size: 12 };
// { mode: string; size: number }

const settings2 = { mode: "dark", size: 12 } as const;
// { readonly mode: "dark"; readonly size: 12 }

// Very common: build a union from an array
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = (typeof ROLES)[number];    // "admin" | "editor" | "viewer"`, lang: "typescript" },
        { p: "It gives you one **source of truth**: the array exists at runtime (for dropdowns, validation) and the union type is derived from it automatically." },
        { note: "`as const` is a compile-time thing only. It does not freeze the object at runtime.", kind: "warn" }
      ]
    },

    {
      id: "satisfies-operator",
      q: "What is the `satisfies` operator?",
      tldr: "`satisfies` checks that a value matches a type, but keeps the more specific type TypeScript inferred, instead of widening it to the declared type.",
      tags: ["types", "operators"],
      a: [
        { code: `type Colors = Record<string, string | number[]>;

// With a type annotation: we lose detail
const c1: Colors = { red: "#f00", green: [0, 255, 0] };
c1.red.toUpperCase();     // Error: could be string | number[]

// With satisfies: checked AND detail kept
const c2 = { red: "#f00", green: [0, 255, 0] } satisfies Colors;
c2.red.toUpperCase();     // OK, TypeScript knows red is a string
c2.green.map(n => n);     // OK, green is number[]

const c3 = { red: true } satisfies Colors;   // Error: boolean not allowed`, lang: "typescript" },
        { table: { head: ["", "Checks the value", "Keeps exact type"], rows: [
          ["`const x: T = ...`", "Yes", "No, becomes T"],
          ["`... as T`", "Barely, you override it", "No, becomes T"],
          ["`... satisfies T`", "Yes", "Yes"]
        ] } },
        { note: "Added in TypeScript 4.9. Great for config objects and route maps.", kind: "tip" }
      ]
    },

    {
      id: "declaration-files",
      q: "What are declaration files (.d.ts) and @types packages?",
      tldr: "A .d.ts file only describes types for JavaScript code, with no real logic; @types packages provide these files for libraries written in plain JavaScript.",
      tags: ["tooling", "declarations"],
      a: [
        { p: "Many libraries are written in JavaScript. TypeScript cannot see their types, so a `.d.ts` file tells it what the library looks like." },
        { code: `// math-lib.d.ts
declare module "math-lib" {
  export function add(a: number, b: number): number;
  export const version: string;
}

// Global variable added by a script tag
declare const GOOGLE_MAPS_KEY: string;`, lang: "typescript" },
        { code: `npm install lodash
npm install --save-dev @types/lodash   # types from DefinitelyTyped`, lang: "bash" },
        { ul: [
          "`.d.ts` files contain **only types**, no code that runs.",
          "`declare` says 'this exists somewhere at runtime, trust me'.",
          "Many modern libraries ship their own types, so you do not need `@types` for them.",
          "`tsc` can create `.d.ts` files for your library with `declaration: true`."
        ] }
      ]
    },

    {
      id: "declaration-merging",
      q: "What is declaration merging and module augmentation?",
      tldr: "Declaration merging is when TypeScript combines two declarations with the same name into one; module augmentation uses this to add types to an existing library.",
      tags: ["declarations", "interfaces"],
      a: [
        { code: `// Two interfaces with the same name merge
interface Window {
  appVersion: string;
}
window.appVersion = "1.0.0";   // OK now

// Module augmentation: add a field to Express Request
import "express";

declare module "express" {
  interface Request {
    user?: { id: number; role: string };
  }
}

// Now in any route: req.user?.role is typed`, lang: "typescript" },
        { ul: [
          "Works with **interfaces**, **namespaces** and **enums**.",
          "Does **not** work with `type` aliases (a duplicate name is an error).",
          "Real use: adding custom properties to `Window`, Express `Request`, or a library's theme type."
        ] }
      ]
    },

    {
      id: "decorators",
      q: "What are decorators in TypeScript?",
      tldr: "Decorators are special functions, written with @, that you attach to a class, method or property to add extra behavior or metadata without changing its code.",
      tags: ["decorators", "classes"],
      a: [
        { code: `function log(target: any, context: ClassMethodDecoratorContext) {
  const name = String(context.name);
  return function (this: any, ...args: any[]) {
    console.log("Calling " + name, args);
    return target.apply(this, args);
  };
}

class Calculator {
  @log
  add(a: number, b: number) {
    return a + b;
  }
}

new Calculator().add(2, 3);   // logs: Calling add [2, 3]`, lang: "typescript" },
        { p: "You see them all the time in **Angular** and **NestJS**:" },
        { code: `@Component({
  selector: "app-user",
  templateUrl: "./user.component.html"
})
export class UserComponent {
  @Input() userId!: number;
}`, lang: "typescript" },
        { note: "There are two versions: the older 'experimental' decorators (`experimentalDecorators: true`, used by Angular and NestJS) and the newer standard decorators from TypeScript 5.0. Mentioning this shows you are up to date.", kind: "tip" }
      ]
    },

    {
      id: "async-promise-types",
      q: "How do you type async functions and Promises?",
      tldr: "An async function always returns Promise<T>, where T is the type of the value you return, and `await` gives you that T back.",
      tags: ["async", "functions"],
      a: [
        { code: `interface User { id: number; name: string; }

async function getUser(id: number): Promise<User> {
  const res = await fetch("/api/users/" + id);
  if (!res.ok) throw new Error("Not found");
  return (await res.json()) as User;
}

async function main() {
  const user = await getUser(1);   // User
  console.log(user.name);

  // Run in parallel, types kept for each position
  const [u, count] = await Promise.all([getUser(1), getCount()]);
}`, lang: "typescript" },
        { ul: [
          "Return type of an async function is **always** `Promise<...>`.",
          "`res.json()` returns `Promise<any>`, so the data is **not checked at runtime**. Validate it (for example with Zod) or at least type it clearly.",
          "In `catch (err)`, `err` is `unknown` in strict mode. Check `err instanceof Error` first."
        ] },
        { note: "Forgetting `await` is a common bug. The ESLint rule `no-floating-promises` catches it.", kind: "warn" }
      ]
    },

    {
      id: "namespaces-vs-modules",
      q: "What is the difference between namespaces and modules?",
      tldr: "Modules are the modern, standard way to split code using import and export per file; namespaces are an older TypeScript-only way to group code under one global name.",
      tags: ["modules"],
      a: [
        { code: `// Namespace (old style)
namespace Validation {
  export function isEmail(s: string) { return s.includes("@"); }
}
Validation.isEmail("a@b.com");

// Module (modern style): one file = one module
// validation.ts
export function isEmail(s: string) { return s.includes("@"); }
// app.ts
import { isEmail } from "./validation";`, lang: "typescript" },
        { table: { head: ["", "Namespace", "Module"], rows: [
          ["Standard JavaScript", "No, TypeScript only", "Yes (ES modules)"],
          ["Scope", "Global object", "File"],
          ["Works with bundlers and tree shaking", "Poorly", "Very well"],
          ["Use today", "Mainly in old code and `.d.ts` files", "Always, for new code"]
        ] } },
        { note: "💡 Short answer: 'Use modules. Namespaces are legacy, you mainly see them in older code or type declaration files.'", kind: "tip" }
      ]
    },

    {
      id: "migrate-js-to-ts",
      q: "How would you migrate a JavaScript project to TypeScript?",
      tldr: "Do it step by step: add a tsconfig with allowJs, rename files to .ts one at a time, fix errors, and slowly turn on stricter settings.",
      tags: ["tooling", "migration"],
      a: [
        { ol: [
          "Install TypeScript and add a `tsconfig.json` with `allowJs: true` so JS and TS can live together.",
          "Optionally turn on `checkJs` to get type hints in existing JS files without renaming them.",
          "Install `@types/...` packages for the libraries you use.",
          "Rename files to `.ts` / `.tsx` **one at a time**, starting with small shared utils and models.",
          "Add interfaces for the main data shapes (API responses, models) early; they give the most value.",
          "Start with `strict: false`, then turn on `noImplicitAny`, `strictNullChecks` and finally `strict: true`.",
          "Add `tsc --noEmit` to CI so new type errors cannot be merged."
        ] },
        { note: "Avoid the 'big bang' rewrite. Temporary `any` is fine during migration, but track it (for example with an ESLint rule) and remove it over time.", kind: "tip" }
      ]
    }

  ]
});
