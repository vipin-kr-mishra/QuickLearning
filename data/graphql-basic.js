/* GraphQL - Basic. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "graphql-basic",
  topic: "GraphQL",
  level: "Basic",
  short: "GraphQL Basic",
  accent: "pink",
  desc: "The starting point: what GraphQL is, how it compares with REST, the schema and types, queries and mutations, resolvers, and a first Apollo server and client in TypeScript, all in simple words.",
  questions: [

    {
      id: "what-is-graphql",
      q: "What is GraphQL and why do we use it?",
      tldr: "GraphQL is a query language for APIs. The client asks for exactly the data it needs in one request, and the server sends back JSON in exactly that shape.",
      tags: ["fundamentals"],
      seeAlso: ["graphql-basic/graphql-vs-rest", "graphql-basic/over-and-under-fetching"],
      a: [
        { p: "GraphQL was created at **Facebook** in 2012 and made open source in 2015. Today it is looked after by the **GraphQL Foundation**. It has two parts:" },
        { ul: [
          "**A query language** that the client uses to ask for data.",
          "**A runtime on the server** that reads the query, gets the data and sends it back."
        ] },
        { p: "The server publishes a **schema**: a typed list of everything you can ask for. The client writes a query that picks only the fields it needs, and the response has the same shape as the query." },
        { code: `# The client asks for a user's name and the titles of their posts
query {
  user(id: "1") {
    name
    posts {
      title
    }
  }
}`, lang: "graphql" },
        { code: `{
  "data": {
    "user": {
      "name": "Asha",
      "posts": [
        { "title": "Hello GraphQL" },
        { "title": "Learning Apollo" }
      ]
    }
  }
}`, lang: "json", caption: "The response has the same shape" },
        { p: "**Why teams use it:**" },
        { ul: [
          "**Exactly the data you need**: no extra fields and no missing fields.",
          "**Related data in one request**: a user and their posts come back together.",
          "**Strongly typed**: the schema says what exists, so tools can check queries and give autocomplete.",
          "**One endpoint** (usually `/graphql`) instead of many URLs.",
          "**Front-end teams move faster**: they change what they fetch without waiting for a new backend endpoint."
        ] },
        { note: "💡 Say it like this: 'With REST, the server decides what each URL returns. With GraphQL, the client sends a query that says exactly what it wants, and gets back JSON in the same shape.'", kind: "tip" }
      ]
    },

    {
      id: "graphql-vs-rest",
      q: "What is the difference between GraphQL and REST?",
      tldr: "REST has many URLs and each one returns a fixed shape of data. GraphQL usually has one URL, and the client decides the shape of the data in its query.",
      tags: ["fundamentals", "rest"],
      seeAlso: ["graphql-basic/pros-and-cons", "graphql-basic/http-request"],
      a: [
        { table: { head: ["", "REST", "GraphQL"], rows: [
          ["Endpoints", "Many: `/users/1`, `/users/1/posts`", "Usually one: `/graphql`"],
          ["Who decides the data shape", "The server", "The client, in the query"],
          ["Related data", "Often several calls", "One query can follow the links"],
          ["Over-fetching / under-fetching", "Common", "Avoided: you ask for exact fields"],
          ["Type system", "Optional (for example OpenAPI)", "Built in: the schema"],
          ["Versioning", "Often `/v1`, `/v2`", "Usually none: add new fields, deprecate old ones"],
          ["HTTP caching", "Easy: each URL can be cached", "Harder: one URL, mostly POST"],
          ["Errors", "HTTP status codes (404, 500)", "An `errors` list in the JSON, often with status 200"]
        ] } },
        { p: "Example: a screen shows a user's name and the titles of their posts." },
        { code: `REST: 2 calls, and each one returns every field
  GET /users/1          ->  { id, name, email, address, phone, ... }
  GET /users/1/posts    ->  [ { id, title, body, tags, ... }, ... ]`, lang: "text" },
        { code: `# GraphQL: 1 call, only the fields the screen needs
query {
  user(id: "1") {
    name
    posts {
      title
    }
  }
}`, lang: "graphql" },
        { note: "GraphQL does not have to replace REST. Many companies run both, and a GraphQL server often sits **in front of** existing REST services and combines them into one API.", kind: "tip" },
        { note: "💡 Simple line: 'REST is like a fixed set menu: each URL gives you a fixed plate. GraphQL is like ordering item by item: you list exactly what you want, on one order.'", kind: "tip" }
      ]
    },

    {
      id: "over-and-under-fetching",
      q: "What are over-fetching and under-fetching? How does GraphQL fix them?",
      tldr: "Over-fetching means getting more data than you need. Under-fetching means getting too little, so you must make extra calls. GraphQL fixes both because you ask for exactly the fields you need, in one request.",
      tags: ["fundamentals", "performance"],
      seeAlso: ["graphql-basic/graphql-vs-rest"],
      a: [
        { ul: [
          "**Over-fetching**: you only need a user's name, but `GET /users/1` returns 30 fields. The extra data wastes bandwidth and time, which hurts most on slow mobile networks.",
          "**Under-fetching**: one call is not enough. You get the user, then call again for their posts, then again for each post's comments. Many round trips make the screen slow."
        ] },
        { code: `# Exactly what the screen needs, in one round trip
query {
  user(id: "1") {
    name                  # no email, address or phone that we do not need
    posts(first: 3) {
      title
      comments(first: 2) {
        text
      }
    }
  }
}`, lang: "graphql" },
        { p: "In REST, teams often fix this by building special endpoints for each screen, like `/users/1/summary`. GraphQL gives that flexibility to every client automatically." },
        { note: "💡 Say it like this: 'Over-fetching is too much data. Under-fetching is too little data and too many calls. In GraphQL the client lists the exact fields, so it gets just enough data in one go.'", kind: "tip" }
      ]
    },

    {
      id: "pros-and-cons",
      q: "What are the advantages and disadvantages of GraphQL? When would you choose REST instead?",
      tldr: "GraphQL gives clients exactly the data they need through a typed schema, but it makes caching, security and server work harder. For a small, simple or very cache-friendly API, REST is often the better choice.",
      tags: ["fundamentals", "design"],
      seeAlso: ["graphql-basic/graphql-vs-rest", "graphql-intermediate/n-plus-one-problem", "graphql-intermediate/server-caching"],
      a: [
        { table: { head: ["Advantages", "Disadvantages"], rows: [
          ["Client gets exactly the fields it needs", "HTTP caching is harder (one URL, mostly POST)"],
          ["Related data in one request", "Easy to cause the **N+1 query** problem on the server"],
          ["Strong typing: the schema is a clear contract", "Clients can send very heavy queries, so you need limits"],
          ["Self-documenting: tools read the schema", "More setup: schema, resolvers, extra libraries"],
          ["Add fields without new API versions", "File uploads are awkward"],
          ["Great tooling: autocomplete, code generation", "Errors often come back with HTTP 200, so monitoring needs care"]
        ] } },
        { p: "**Choose GraphQL when** you have several clients (web, mobile) that need different data, screens that combine data from many sources, or a front-end team that changes screens often." },
        { p: "**Choose REST when** the API is small and simple (basic CRUD), you need strong HTTP caching (public data behind a CDN), you mostly send files, or the team is new to GraphQL and the benefit would be small." },
        { note: "💡 A balanced answer impresses interviewers: 'GraphQL is great for flexible, data-rich front ends. But it is not free: I have to handle caching, N+1 queries and query limits myself. For a simple API, REST is fine.'", kind: "tip" }
      ]
    },

    {
      id: "not-a-database",
      q: "Is GraphQL a database? Does it depend on a programming language?",
      tldr: "No. GraphQL is a specification for an API layer, not a database. It works with any programming language and any data source: SQL, NoSQL, REST APIs or other services.",
      tags: ["fundamentals"],
      seeAlso: ["graphql-basic/resolvers"],
      a: [
        { p: "A common beginner mix-up is thinking GraphQL is like SQL for a database. It is not. GraphQL is an **API layer** that sits between the client and your data." },
        { code: `Browser / mobile app
        |
        |   one GraphQL query
        v
GraphQL server  (schema + resolvers)
        |
        +-->  SQL database
        +-->  REST API
        +-->  another service`, lang: "text" },
        { ul: [
          "**It is a specification**: a document that says how queries, types and responses must work. Anyone can implement it.",
          "**Any language**: JavaScript and TypeScript (Apollo Server, GraphQL Yoga), .NET (Hot Chocolate), Java (Spring for GraphQL), Python (Strawberry), Go (gqlgen).",
          "**Any data source**: the server function that fills each field (a **resolver**) can read a database, call a REST API, read a file or call another service.",
          "**The schema does not have to match your database tables.** You design it around what the client needs."
        ] },
        { note: "💡 Simple line: 'GraphQL is a contract for the API, not a database. Behind it, my resolvers can talk to anything.'", kind: "tip" }
      ]
    },

    {
      id: "schema-and-sdl",
      q: "What is a GraphQL schema? What is SDL?",
      tldr: "The schema is the contract of a GraphQL API: it lists every type, field and operation the client can use. SDL (Schema Definition Language) is the simple syntax used to write it.",
      tags: ["schema"],
      seeAlso: ["graphql-basic/operation-types", "graphql-basic/scalar-types"],
      a: [
        { p: "Think of the schema as the **menu** of the API. If something is not on the menu, the client cannot ask for it, and the server rejects the query before running any code." },
        { code: `"A person who writes posts"
type User {
  id: ID!
  name: String!
  email: String
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  body: String!
  author: User!
}

# Starting points for reading data
type Query {
  user(id: ID!): User
  posts: [Post!]!
}

# Starting points for changing data
type Mutation {
  createPost(title: String!, body: String!): Post!
}`, lang: "graphql" },
        { ul: [
          "`type User { ... }` defines an **object type** with fields.",
          "`String`, `ID` and so on are the **types** of the fields. `!` means the value is never null.",
          "`Query` and `Mutation` are special **root types**: the starting point of every request.",
          "Text in quotes above a type or field is a **description**. Tools like GraphiQL show it as documentation."
        ] },
        { note: "Because the schema is typed and public, tools can use it to give autocomplete, check queries before they run, and even generate TypeScript types.", kind: "tip" },
        { note: "💡 Say it like this: 'The schema is the menu and the contract of the API. SDL is just the language I write that menu in.'", kind: "tip" }
      ]
    },

    {
      id: "object-types-and-graph",
      q: "What are object types and fields? Why is it called a 'graph'?",
      tldr: "An object type is a named group of fields, like User or Post. A field can point to another type, so all the types link together like a graph, and one query can walk from one type to the next.",
      tags: ["schema", "types"],
      seeAlso: ["graphql-basic/schema-and-sdl", "graphql-intermediate/protect-from-expensive-queries"],
      a: [
        { p: "A **field** is one piece of data on a type. A field's type can be a simple value (a **scalar** like `String`) or another **object type**. When fields point to other types, the types link together." },
        { code: `type User {
  name: String!          # a simple value
  posts: [Post!]!        # points to Post
}

type Post {
  title: String!
  author: User!          # points back to User
  comments: [Comment!]!
}

type Comment {
  text: String!
  author: User!
}`, lang: "graphql" },
        { p: "Because of these links, one query can travel through the graph: a user, their posts, the comments on each post, and who wrote each comment." },
        { code: `query {
  user(id: "1") {
    name
    posts {
      title
      comments {
        text
        author {
          name
        }
      }
    }
  }
}`, lang: "graphql" },
        { note: "Links can go in circles (User → Post → User → ...), so a client could write a very deep query. Real servers limit query depth to stay safe.", kind: "warn" }
      ]
    },

    {
      id: "scalar-types",
      q: "What are the built-in scalar types in GraphQL?",
      tldr: "There are five: Int, Float, String, Boolean and ID. They are the simple values at the end of every query, and you can add your own custom scalars, like DateTime.",
      tags: ["types", "schema"],
      seeAlso: ["graphql-intermediate/custom-scalars"],
      a: [
        { table: { head: ["Scalar", "What it holds", "Example"], rows: [
          ["`Int`", "A whole number (32-bit)", "`42`"],
          ["`Float`", "A number with decimals", "`4.5`"],
          ["`String`", "Text", "`\"Hello\"`"],
          ["`Boolean`", "Yes or no", "`true`"],
          ["`ID`", "A unique identifier, always sent as a string in JSON", "`\"42\"`, `\"user_abc\"`"]
        ] } },
        { code: `type Product {
  id: ID!
  name: String!
  price: Float!
  stock: Int!
  inStock: Boolean!
}`, lang: "graphql" },
        { ul: [
          "A **scalar** is a leaf: it has no sub-fields. Every branch of a query must end in scalars (or enums).",
          "`ID` is for identifiers. It is always sent as a string, but it also accepts a number as input. Use it for keys, not for maths.",
          "`Int` is only 32-bit (up to about 2.1 billion). For bigger numbers, teams use a `String` or a custom scalar.",
          "You can create **custom scalars** like `DateTime`, `Email` or `URL` when you need your own rules."
        ] },
        { note: "💡 Quick line: 'GraphQL has five built-in scalars: Int, Float, String, Boolean and ID. For anything else, like dates, I add a custom scalar.'", kind: "tip" }
      ]
    },

    {
      id: "non-null-and-lists",
      q: "What do `!` and `[ ]` mean in a GraphQL schema?",
      tldr: "`!` means the value can never be null, and `[ ]` means a list. In GraphQL every field can be null by default, so you add `!` when a value is always there.",
      tags: ["types", "nullability"],
      seeAlso: ["graphql-intermediate/null-propagation"],
      a: [
        { table: { head: ["Type", "List can be null?", "Item can be null?", "Allowed values"], rows: [
          ["`[String]`", "Yes", "Yes", "`null`, `[]`, `[\"a\", null]`"],
          ["`[String!]`", "Yes", "No", "`null`, `[]`, `[\"a\", \"b\"]`"],
          ["`[String]!`", "No", "Yes", "`[]`, `[\"a\", null]`"],
          ["`[String!]!`", "No", "No", "`[]`, `[\"a\", \"b\"]`"]
        ] } },
        { code: `type User {
  id: ID!               # always there
  nickname: String      # may be null
  tags: [String!]!      # always a list with no null items (it can be empty)
}

type Query {
  user(id: ID!): User   # the argument is required, the result may be null
}`, lang: "graphql" },
        { ul: [
          "On **output** fields, `!` is a promise from the server: 'this will never be null'.",
          "On **input** arguments, `!` means **required**: the client must send it.",
          "`[String!]!` is the most common choice for lists: always a list, never a null item. It can still be **empty**."
        ] },
        { note: "Be careful with `!` on output fields. If a non-null field fails, GraphQL cannot put null there, so the null moves up to the parent and you can lose more data than you expected.", kind: "warn" },
        { note: "💡 Easy way to remember: 'Exclamation mark means never null (or required). Square brackets mean a list.'", kind: "tip" }
      ]
    },

    {
      id: "enum-types",
      q: "What is an enum type in GraphQL?",
      tldr: "An enum is a type with a fixed list of allowed values, like DRAFT, PUBLISHED or ARCHIVED. GraphQL rejects any other value automatically.",
      tags: ["types", "schema"],
      a: [
        { code: `enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

type Post {
  title: String!
  status: PostStatus!
}

type Query {
  posts(status: PostStatus): [Post!]!
}`, lang: "graphql" },
        { code: `query {
  posts(status: PUBLISHED) {    # no quotes around enum values
    title
    status
  }
}`, lang: "graphql", caption: "Using it in a query" },
        { ul: [
          "In the JSON response, an enum value is just a string: `\"status\": \"PUBLISHED\"`.",
          "In **variables** (which are JSON) you also send it as a string: `{ \"status\": \"DRAFT\" }`.",
          "If the client sends `PUBLISH` (a typo), the query fails validation before any code runs.",
          "By convention, enum values are written in `ALL_CAPS`."
        ] },
        { note: "Use enums instead of plain strings for things like status, role or sort order. The schema then documents every allowed value, and tools can autocomplete them.", kind: "tip" }
      ]
    },

    {
      id: "input-types",
      q: "What is an input type? Why can't we use a normal type as an argument?",
      tldr: "An input type groups several values into one argument, mainly for mutations, like CreatePostInput. Normal object types are only for output, because their fields can have resolvers, arguments and links that make no sense as input.",
      tags: ["types", "mutations"],
      seeAlso: ["graphql-basic/mutations"],
      a: [
        { p: "When a mutation needs many values, listing them all as separate arguments gets messy. An **input type** groups them into one object." },
        { code: `input CreatePostInput {
  title: String!
  body: String!
  tags: [String!]
  status: PostStatus = DRAFT     # default value
}

type Mutation {
  createPost(input: CreatePostInput!): Post!
}`, lang: "graphql" },
        { code: `mutation {
  createPost(input: { title: "Hello", body: "My first post", tags: ["intro"] }) {
    id
    title
  }
}`, lang: "graphql", caption: "Calling it" },
        { p: "**Why a separate keyword?** Output types (`type`) and input types (`input`) follow different rules:" },
        { ul: [
          "Input fields can only be **scalars, enums or other input types**. They cannot point to an output type like `User`.",
          "Output fields can have **arguments** and **resolvers**. Input fields are just plain data.",
          "Output types can use interfaces and unions. Input types cannot."
        ] },
        { note: "A common naming style: `CreatePostInput` for the argument and `CreatePostPayload` for the result. One input object per mutation makes it easy to add new fields later without breaking clients.", kind: "tip" }
      ]
    },

    {
      id: "operation-types",
      q: "What are the three operation types in GraphQL?",
      tldr: "Query reads data, Mutation changes data, and Subscription keeps a connection open so the server can push new data when something happens.",
      tags: ["fundamentals", "operations"],
      seeAlso: ["graphql-basic/mutations", "graphql-basic/subscriptions"],
      a: [
        { table: { head: ["Operation", "Used for", "Like in REST", "Example"], rows: [
          ["`query`", "Reading data", "`GET`", "Get a post and its comments"],
          ["`mutation`", "Creating, updating, deleting", "`POST`, `PUT`, `PATCH`, `DELETE`", "Create a post"],
          ["`subscription`", "Real-time updates pushed by the server", "WebSockets", "A new comment was added"]
        ] } },
        { code: `type Query {
  post(id: ID!): Post
}

type Mutation {
  createPost(title: String!, body: String!): Post!
}

type Subscription {
  commentAdded(postId: ID!): Comment!
}`, lang: "graphql", caption: "In the schema" },
        { code: `query GetPost {
  post(id: "1") { title }
}

mutation AddPost {
  createPost(title: "Hi", body: "My first post") { id }
}

subscription OnCommentAdded {
  commentAdded(postId: "1") { text }
}`, lang: "graphql", caption: "What the client sends" },
        { p: "`Query`, `Mutation` and `Subscription` are called **root types**, because every request starts from one of them. A schema must have `Query`. The other two are optional." },
        { note: "💡 Easy way to remember: 'Query = read, Mutation = write, Subscription = listen.'", kind: "tip" }
      ]
    },

    {
      id: "writing-a-query",
      q: "How do you write a GraphQL query? What is a selection set?",
      tldr: "You write the query keyword, a name, and then the fields you want inside curly braces. That list of fields is called a selection set, and the response comes back in exactly the same shape.",
      tags: ["queries", "syntax"],
      seeAlso: ["graphql-basic/arguments", "graphql-basic/response-format"],
      a: [
        { code: `query GetPostWithAuthor {     # operation type + name
  post(id: "1") {             # a field with an argument
    title                     # the selection set of post
    createdAt
    author {                  # a nested selection set
      name
    }
  }
}`, lang: "graphql" },
        { code: `{
  "data": {
    "post": {
      "title": "Hello GraphQL",
      "createdAt": "2026-01-15",
      "author": { "name": "Asha" }
    }
  }
}`, lang: "json", caption: "Response" },
        { ul: [
          "The **selection set** is the part inside `{ }`: the list of fields you want.",
          "If a field is an **object** (like `author`), you must pick its sub-fields. Asking for just `author` is an error.",
          "Every branch must end in **scalars** or **enums** (like `title` and `name`).",
          "For a quick test you can skip the keyword and the name: `{ post(id: \"1\") { title } }`. In real code, always give a name."
        ] },
        { note: "💡 Say it like this: 'A query is a shape. I write the shape of the JSON I want, and GraphQL fills it in.'", kind: "tip" }
      ]
    },

    {
      id: "arguments",
      q: "How do arguments work in GraphQL?",
      tldr: "Any field can take arguments, not only the top-level ones. You use them to filter, sort, page through data or change a field's format, and the schema defines their types and default values.",
      tags: ["queries", "syntax"],
      seeAlso: ["graphql-basic/variables"],
      a: [
        { code: `type Query {
  user(id: ID!): User                          # required argument
  posts(first: Int = 10, status: PostStatus): [Post!]!
}

type User {
  name: String!
  avatarUrl(size: Int = 64): String!           # argument on a normal field
  posts(first: Int = 5): [Post!]!
}`, lang: "graphql", caption: "Schema" },
        { code: `query {
  user(id: "1") {
    name
    avatarUrl(size: 128)
    posts(first: 3) {
      title
    }
  }
}`, lang: "graphql", caption: "Query" },
        { ul: [
          "`ID!` means the argument is **required**. Without `!` it is optional.",
          "`= 10` is a **default value**, used when the client does not send one.",
          "Arguments work on **nested fields** too, like `avatarUrl(size: 128)`. In REST you would need extra query-string options on every URL for this.",
          "On the server, the resolver receives them in its `args` parameter."
        ] },
        { note: "In real apps, do not type values straight into the query text. Use **variables**, so the query text stays the same and only the values change.", kind: "tip" }
      ]
    },

    {
      id: "variables",
      q: "What are variables in GraphQL and why should we use them?",
      tldr: "Variables keep the query text fixed and send the changing values separately as JSON, using names that start with $. This is safer and cleaner, and the same query can be reused and cached.",
      tags: ["queries", "syntax", "security"],
      seeAlso: ["graphql-basic/arguments", "graphql-intermediate/persisted-queries"],
      a: [
        { code: `query GetPosts($status: PostStatus!, $first: Int = 10) {
  posts(status: $status, first: $first) {
    id
    title
  }
}`, lang: "graphql", caption: "The query declares the variables and their types" },
        { code: `{
  "status": "PUBLISHED",
  "first": 5
}`, lang: "json", caption: "The values travel separately" },
        { ul: [
          "**No string building**: you never glue user input into the query text, so there are no escaping bugs or injection tricks.",
          "**Type checked**: `$status: PostStatus!` means the server checks the value before running anything.",
          "**Reusable**: the query text never changes, so it can be cached, saved as a **persisted query** and reused across the app.",
          "**Defaults**: `$first: Int = 10` is used when the value is not sent."
        ] },
        { code: `// Bad: building the query text with string joining
const badQuery = "{ posts(status: " + status + ") { title } }";

// Good: fixed query text + variables
const query = "query GetPosts($status: PostStatus!) { posts(status: $status) { title } }";
const body = JSON.stringify({ query, variables: { status } });`, lang: "typescript", caption: "Bad vs good" },
        { note: "💡 Say it like this: 'Variables are like parameters in a SQL prepared statement. The query stays fixed, and the values travel separately and are type-checked.'", kind: "tip" }
      ]
    },

    {
      id: "operation-name",
      q: "What is an operation name and why should you always give one?",
      tldr: "The operation name is the name after the query or mutation keyword, like GetPosts. It is optional, but it makes logs, debugging and monitoring much easier, and it is required when one document has several operations.",
      tags: ["queries", "best practice"],
      a: [
        { code: `# Anonymous: works, but hard to find in logs
{
  posts { title }
}

# Named: easy to track
query GetRecentPosts {
  posts(first: 5) { title }
}`, lang: "graphql" },
        { ul: [
          "**Debugging**: server logs and browser dev tools show `GetRecentPosts` instead of a wall of query text.",
          "**Monitoring**: tools like Apollo GraphOS group errors and timings by operation name.",
          "**Several operations in one document**: the request must say which one to run, using `operationName`.",
          "**Tooling**: code generators use the name to create types, like `GetRecentPostsQuery`."
        ] },
        { note: "Common convention: PascalCase, start with a verb, and keep names unique across the app: `GetPost`, `CreateComment`, `OnCommentAdded`.", kind: "tip" }
      ]
    },

    {
      id: "aliases",
      q: "What are aliases in GraphQL?",
      tldr: "An alias renames a field in the response. You need it when you ask for the same field twice with different arguments, because a JSON object cannot have two keys with the same name.",
      tags: ["queries", "syntax"],
      a: [
        { code: `query {
  user(id: "1") {
    smallPic: avatarUrl(size: 32)
    bigPic: avatarUrl(size: 256)
  }
  published: posts(status: PUBLISHED) { title }
  drafts: posts(status: DRAFT) { title }
}`, lang: "graphql" },
        { code: `{
  "data": {
    "user": {
      "smallPic": "https://cdn.example.com/asha-32.png",
      "bigPic": "https://cdn.example.com/asha-256.png"
    },
    "published": [ { "title": "Hello GraphQL" } ],
    "drafts": [ { "title": "Coming soon" } ]
  }
}`, lang: "json", caption: "Response" },
        { p: "Without aliases, asking for `avatarUrl` twice with different arguments is an error, because the response would need two `avatarUrl` keys." },
        { note: "Aliases are also handy to match the names your UI code expects, for example `fullName: name`.", kind: "tip" }
      ]
    },

    {
      id: "fragments",
      q: "What are fragments in GraphQL? Why use them?",
      tldr: "A fragment is a reusable, named set of fields. You write the fields once and spread them with ... wherever you need them, so many queries stay short and consistent.",
      tags: ["queries", "syntax", "reuse"],
      seeAlso: ["graphql-intermediate/inline-fragments-typename"],
      a: [
        { code: `fragment PostCard on Post {
  id
  title
  author {
    name
  }
}

query HomePage {
  featured: post(id: "1") {
    ...PostCard
  }
  latest: posts(first: 5) {
    ...PostCard
    createdAt          # you can still add extra fields
  }
}`, lang: "graphql" },
        { ul: [
          "`on Post` says which type the fragment belongs to.",
          "`...PostCard` (three dots) **spreads** the fragment's fields into that place.",
          "Change the fragment once, and every query that uses it gets the change, just like a shared component in UI code.",
          "In React apps, each component often defines a fragment for the data it shows. This is called **fragment colocation**."
        ] },
        { note: "💡 Say it like this: 'A fragment is like a reusable function for fields. I define the fields once and spread them wherever I need them.'", kind: "tip" }
      ]
    },

    {
      id: "directives",
      q: "What are directives in GraphQL? Name the built-in ones.",
      tldr: "A directive starts with @ and changes how part of a query or schema behaves. The built-in ones are @include and @skip (used in queries), @deprecated (used in the schema) and @specifiedBy (for custom scalars).",
      tags: ["directives", "syntax"],
      seeAlso: ["graphql-intermediate/custom-directives", "graphql-intermediate/versioning-and-deprecation"],
      a: [
        { code: `query GetPost($id: ID!, $withComments: Boolean!, $hideStats: Boolean = false) {
  post(id: $id) {
    title
    comments @include(if: $withComments) {
      text
    }
    likeCount @skip(if: $hideStats)
  }
}`, lang: "graphql", caption: "@include and @skip: decided at request time" },
        { code: `type User {
  name: String!
  fullName: String! @deprecated(reason: "Use name instead.")
}`, lang: "graphql", caption: "@deprecated: mark old fields in the schema" },
        { table: { head: ["Directive", "Used in", "What it does"], rows: [
          ["`@include(if: Boolean)`", "Query", "Include the field only if the condition is true"],
          ["`@skip(if: Boolean)`", "Query", "Skip the field if the condition is true"],
          ["`@deprecated(reason: String)`", "Schema", "Marks a field or enum value as old; tools show a warning"],
          ["`@specifiedBy(url: String!)`", "Schema", "Links a custom scalar to a page that describes its format"]
        ] } },
        { note: "You can also write **custom directives**, like `@auth(requires: ADMIN)` or `@cacheControl(maxAge: 60)`. Servers use them to add behaviour such as access checks or caching.", kind: "tip" }
      ]
    },

    {
      id: "mutations",
      q: "What is a mutation? How is it different from a query?",
      tldr: "A mutation is an operation that changes data: create, update or delete. It looks like a query, but it is expected to have side effects, and its top-level fields run one after another instead of in parallel.",
      tags: ["mutations", "operations"],
      seeAlso: ["graphql-basic/input-types", "graphql-intermediate/update-after-mutation"],
      a: [
        { code: `type Mutation {
  createPost(input: CreatePostInput!): Post!
  deletePost(id: ID!): Boolean!
}`, lang: "graphql", caption: "Schema" },
        { code: `mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id            # ask for the new data back
    title
    createdAt
  }
}`, lang: "graphql", caption: "Client" },
        { table: { head: ["", "Query", "Mutation"], rows: [
          ["Purpose", "Read data", "Change data"],
          ["Side effects", "Should have none", "Expected"],
          ["Top-level fields run", "Possibly in parallel", "**One by one, in order**"],
          ["HTTP method", "POST or GET", "POST only"]
        ] } },
        { ul: [
          "A mutation **returns data**, just like a query. Ask for the changed object back, so the UI and the cache can update without another request.",
          "The 'one by one' rule matters when you send two mutations in one request: the second starts only after the first has finished.",
          "Technically a query resolver could change data, but that breaks the rule everyone relies on. Never do it."
        ] },
        { note: "💡 Say it like this: 'Queries read, mutations write. Mutations also return data, so I always ask for the updated object back.'", kind: "tip" }
      ]
    },

    {
      id: "subscriptions",
      q: "What is a subscription in GraphQL?",
      tldr: "A subscription is a long-lived request where the server pushes new data to the client every time an event happens, like a new chat message. It usually runs over WebSockets.",
      tags: ["subscriptions", "real-time"],
      seeAlso: ["graphql-intermediate/subscriptions-under-the-hood"],
      a: [
        { code: `type Subscription {
  commentAdded(postId: ID!): Comment!
}`, lang: "graphql", caption: "Schema" },
        { code: `subscription OnCommentAdded($postId: ID!) {
  commentAdded(postId: $postId) {
    id
    text
    author { name }
  }
}`, lang: "graphql", caption: "Client" },
        { p: "The client sends this once. The connection stays open, and every time someone adds a comment to that post, the server sends a new result in the same shape." },
        { ul: [
          "**Good for**: chat, notifications, live scores, stock prices, editing a document together.",
          "**Transport**: usually WebSockets (the `graphql-ws` protocol). Server-Sent Events also work.",
          "**Not always needed**: if data changes rarely, simply running the query again every few seconds (**polling**) is often simpler."
        ] },
        { note: "💡 Simple line: 'A query asks once and gets one answer. A subscription asks once and keeps getting answers as things change.'", kind: "tip" }
      ]
    },

    {
      id: "resolvers",
      q: "What is a resolver?",
      tldr: "A resolver is a function on the server that returns the data for one field. The schema says what can be asked, and the resolvers say how to get it.",
      tags: ["resolvers", "server"],
      seeAlso: ["graphql-basic/resolver-arguments", "graphql-intermediate/default-resolvers"],
      a: [
        { p: "Every field in the schema can have a resolver. When a query arrives, GraphQL calls the resolvers for the requested fields and builds the response from what they return." },
        { code: `type Query {
  post(id: ID!): Post
}

type Post {
  id: ID!
  title: String!
  author: User!
}`, lang: "graphql", caption: "Schema" },
        { code: `const resolvers = {
  Query: {
    // Runs for: query { post(id: "1") { ... } }
    post: async (_parent, args, context) => {
      return context.db.getPostById(args.id);
    },
  },
  Post: {
    // Runs for each post, but only if the query asks for "author"
    author: async (post, _args, context) => {
      return context.db.getUserById(post.authorId);
    },
  },
};`, lang: "typescript", caption: "Resolvers (Apollo Server)" },
        { ul: [
          "Resolvers can be **async**: return a value or a Promise.",
          "They can get data from **anywhere**: a database, a REST API, a cache or a file.",
          "If you do not write a resolver for a field, GraphQL uses a **default resolver** that reads the property with the same name from the parent object. That is why `id` and `title` above need no code.",
          "A resolver runs **only if its field is requested**. If the query does not ask for `author`, that code never runs."
        ] },
        { note: "💡 Say it like this: 'The schema is the what, resolvers are the how. Each field has a small function that knows how to fetch its value.'", kind: "tip" }
      ]
    },

    {
      id: "resolver-arguments",
      q: "What are the four arguments a resolver receives?",
      tldr: "parent (the result of the parent field), args (the arguments of this field), context (shared data for the request, like the logged-in user and the database) and info (details about the query itself).",
      tags: ["resolvers", "server"],
      seeAlso: ["graphql-basic/resolvers", "graphql-intermediate/context-object"],
      a: [
        { code: `const resolvers = {
  User: {
    posts: (parent, args, context, info) => {
      // parent  = the User object returned one level up
      // args    = { first: 5 } from posts(first: 5)
      // context = { user, db, loaders }, the same object for the whole request
      // info    = the field name, its path, the parsed query and the schema
      return context.db.getPostsByAuthor(parent.id, args.first);
    },
  },
};`, lang: "typescript" },
        { table: { head: ["Argument", "Also called", "What it holds", "Typical use"], rows: [
          ["`parent`", "`root`, `source`, `obj`", "The value returned by the parent field's resolver", "Read `parent.id` to load related data"],
          ["`args`", "—", "The arguments passed to this field", "Ids, filters, page size"],
          ["`context`", "`ctx`", "One object shared by all resolvers in a request", "Logged-in user, database, DataLoaders"],
          ["`info`", "—", "Details about the query and the schema", "Rarely needed: advanced optimisation, logging"]
        ] } },
        { note: "💡 Easy way to remember: 'parent, args, context, info: where I came from, what was asked, who is asking, and the details of the query.'", kind: "tip" }
      ]
    },

    {
      id: "http-request",
      q: "How is a GraphQL request sent over HTTP? Why is there only one endpoint?",
      tldr: "Usually the client sends a POST request to one URL, like /graphql, with a JSON body that holds the query text and its variables. The query itself says what to do, so one URL is enough.",
      tags: ["http", "fundamentals"],
      seeAlso: ["graphql-basic/variables", "graphql-basic/response-format"],
      a: [
        { p: "In REST, the URL and the HTTP method say what you want (`GET /posts/1`). In GraphQL, the **query text** says what you want, so every request can go to the same URL." },
        { code: `{
  "query": "query GetPost($id: ID!) { post(id: $id) { title } }",
  "variables": { "id": "1" },
  "operationName": "GetPost"
}`, lang: "json", caption: "The request body" },
        { code: `const res = await fetch("http://localhost:4000/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "query GetPost($id: ID!) { post(id: $id) { title } }",
    variables: { id: "1" },
  }),
});

const { data, errors } = await res.json();
console.log(data.post.title);`, lang: "typescript", caption: "Calling it with plain fetch, no library needed" },
        { ul: [
          "`query` is required. `variables` and `operationName` are optional.",
          "**GET** also works for queries (the query goes in the URL), which helps caching. Mutations always use **POST**.",
          "The response is always JSON with a `data` key and, if something went wrong, an `errors` key."
        ] },
        { note: "💡 Say it like this: 'GraphQL is usually one POST endpoint. The body carries the query and the variables, and the query decides what data comes back.'", kind: "tip" }
      ]
    },

    {
      id: "response-format",
      q: "What does a GraphQL response look like?",
      tldr: "It is a JSON object with a data key in exactly the same shape as the query. If something went wrong, it also has an errors list, and servers can add extra details under extensions.",
      tags: ["responses", "fundamentals"],
      seeAlso: ["graphql-basic/errors-basics", "graphql-basic/writing-a-query"],
      a: [
        { code: `query {
  post(id: "1") {
    title
    author { name }
  }
}`, lang: "graphql" },
        { code: `{
  "data": {
    "post": {
      "title": "Hello GraphQL",
      "author": { "name": "Asha" }
    }
  }
}`, lang: "json", caption: "Response" },
        { table: { head: ["Key", "When it is there", "What it holds"], rows: [
          ["`data`", "When the query ran", "The result, in the **same shape** as the query"],
          ["`errors`", "Only if something failed", "A list of errors, each with a `message`, a `path` and more"],
          ["`extensions`", "Optional", "Extra server details, like timing or query cost"]
        ] } },
        { ul: [
          "Fields come back **in the same order** you asked for them.",
          "You can get **partial data**: `data` with some fields filled in, plus an `errors` list that explains the missing ones.",
          "If the query itself is invalid (a syntax error or an unknown field), there is **no** `data` key at all, only `errors`."
        ] },
        { note: "💡 Say it like this: 'The response mirrors the query. I always check both data and errors, because GraphQL can return some data and some errors together.'", kind: "tip" }
      ]
    },

    {
      id: "errors-basics",
      q: "How does GraphQL return errors? Why can the HTTP status be 200 even when there is an error?",
      tldr: "Errors go into an errors list in the JSON body, next to any data that did work. The HTTP request itself succeeded, so the status is often 200, which means the client must always check the errors list.",
      tags: ["errors", "responses"],
      seeAlso: ["graphql-intermediate/error-handling", "graphql-intermediate/errors-as-data"],
      a: [
        { code: `{
  "data": {
    "post": {
      "title": "Hello GraphQL",
      "viewCount": null
    }
  },
  "errors": [
    {
      "message": "Stats service is down",
      "path": ["post", "viewCount"],
      "locations": [{ "line": 4, "column": 5 }],
      "extensions": { "code": "INTERNAL_SERVER_ERROR" }
    }
  ]
}`, lang: "json", caption: "One field failed, the rest worked" },
        { table: { head: ["Error field", "Meaning"], rows: [
          ["`message`", "A readable description of the problem"],
          ["`path`", "Which field failed, as a path in the response"],
          ["`locations`", "Line and column in the query text"],
          ["`extensions`", "Extra details, usually a `code` like `UNAUTHENTICATED` or `BAD_USER_INPUT`"]
        ] } },
        { p: "**Why 200?** One GraphQL request can fetch many things. If 9 fields work and 1 fails, the request as a whole still produced useful data, so many servers answer 200 and describe the problem in `errors`." },
        { ul: [
          "If the request itself is broken (bad JSON, a syntax error, an unknown field), servers like Apollo answer with **400**.",
          "Newer servers follow the **GraphQL over HTTP** specification and the `application/graphql-response+json` content type, which use status codes more clearly.",
          "Either way: **never trust the status code alone**. Always check `errors`."
        ] },
        { note: "This matters for monitoring too: a dashboard that only counts HTTP 5xx responses will miss most GraphQL failures. Track the `errors` list as well.", kind: "warn" }
      ]
    },

    {
      id: "introspection",
      q: "What is introspection in GraphQL?",
      tldr: "Introspection means asking a GraphQL API about its own schema, using special fields like __schema and __type. Tools use it for autocomplete, documentation and code generation.",
      tags: ["schema", "tooling"],
      seeAlso: ["graphql-basic/graphiql-and-tools", "graphql-intermediate/protect-from-expensive-queries"],
      a: [
        { code: `query {
  __type(name: "PostStatus") {
    kind
    enumValues {
      name
    }
  }
}`, lang: "graphql", caption: "Ask the API which values the PostStatus enum has" },
        { code: `{
  "data": {
    "__type": {
      "kind": "ENUM",
      "enumValues": [
        { "name": "DRAFT" },
        { "name": "PUBLISHED" },
        { "name": "ARCHIVED" }
      ]
    }
  }
}`, lang: "json", caption: "Response" },
        { table: { head: ["Special field", "What it gives you"], rows: [
          ["`__schema`", "The whole schema: every type, the root types and the directives"],
          ["`__type(name: ...)`", "One type and its fields"],
          ["`__typename`", "The type name of any object, inside a normal query"]
        ] } },
        { p: "This is how **GraphiQL** and **Apollo Sandbox** know every field to autocomplete, and how **GraphQL Code Generator** can build TypeScript types from a running server." },
        { note: "Many teams **turn introspection off in production** for public APIs, so outsiders cannot easily map the whole API. It is not real security on its own, but it gives attackers less help.", kind: "warn" }
      ]
    },

    {
      id: "graphiql-and-tools",
      q: "What is GraphiQL? Which tools help you work with GraphQL?",
      tldr: "GraphiQL is an in-browser editor for GraphQL: you write queries with autocomplete, run them and read the schema docs. Similar tools are Apollo Sandbox and Postman, and GraphQL Code Generator creates TypeScript types from the schema.",
      tags: ["tooling"],
      seeAlso: ["graphql-basic/introspection", "graphql-intermediate/typescript-codegen"],
      a: [
        { table: { head: ["Tool", "What it is for"], rows: [
          ["**GraphiQL**", "The original browser editor: write, run and explore queries, with docs"],
          ["**Apollo Sandbox / Explorer**", "Apollo's richer editor. Apollo Server shows it on its landing page during development"],
          ["**Postman / Insomnia**", "API clients with GraphQL support and schema-aware autocomplete"],
          ["**GraphQL Code Generator**", "Creates TypeScript types and typed hooks from your schema and queries"],
          ["**VS Code GraphQL extension**", "Highlighting, autocomplete and validation in `.graphql` files"],
          ["**Apollo Client Devtools**", "A browser extension that shows the queries and the cache of a running app"]
        ] } },
        { p: "A quick way to try any GraphQL API: open it in GraphiQL or Apollo Sandbox, press `Ctrl` + `Space` for autocomplete, and use the docs panel to explore the types." },
        { note: "All of these tools work because of **introspection**: they ask the server for its schema and use it to guide you.", kind: "tip" }
      ]
    },

    {
      id: "apollo-server-setup",
      q: "How do you create a simple GraphQL server in Node.js with Apollo Server?",
      tldr: "Install @apollo/server and graphql, write the schema (typeDefs) and the resolvers, pass both to new ApolloServer, and start it with startStandaloneServer.",
      tags: ["apollo", "server", "typescript"],
      seeAlso: ["graphql-basic/resolvers", "graphql-basic/apollo-client-setup"],
      a: [
        { code: `npm install @apollo/server graphql`, lang: "bash" },
        { code: `import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

// 1. The schema: what clients can ask for
const typeDefs = \`
  type Post {
    id: ID!
    title: String!
  }

  type Query {
    posts: [Post!]!
  }
\`;

// 2. Some data (a database in a real app)
const posts = [
  { id: "1", title: "Hello GraphQL" },
  { id: "2", title: "Learning Apollo" },
];

// 3. Resolvers: how to get the data for each field
const resolvers = {
  Query: {
    posts: () => posts,
  },
};

// 4. Connect them and start the server
const server = new ApolloServer({ typeDefs, resolvers });
const { url } = await startStandaloneServer(server, { listen: { port: 4000 } });
console.log("Server ready at " + url);`, lang: "typescript", caption: "index.ts" },
        { ol: [
          "**typeDefs** is the schema in SDL. It is just a string.",
          "**resolvers** is an object with the same shape as the schema: `Query.posts` resolves the `posts` field.",
          "**new ApolloServer(...)** connects the schema and the resolvers.",
          "**startStandaloneServer** starts an HTTP server. Open `http://localhost:4000` to try queries in Apollo Sandbox."
        ] },
        { p: "Other popular Node.js options are **GraphQL Yoga**, **Mercurius** (for Fastify) and **NestJS**, which runs Apollo or Mercurius underneath." },
        { note: "The example uses `await` at the top level, so the project must use ES modules (`\"type\": \"module\"` in package.json). In a bigger app you usually plug Apollo Server into Express or another framework instead of the standalone server.", kind: "tip" }
      ]
    },

    {
      id: "apollo-client-setup",
      q: "How do you call a GraphQL API from a React app with Apollo Client?",
      tldr: "Create an ApolloClient with the server URL and an InMemoryCache, wrap the app in ApolloProvider, write the query with gql, and call the useQuery hook to get loading, error and data.",
      tags: ["apollo", "client", "typescript"],
      seeAlso: ["graphql-intermediate/apollo-client-cache", "graphql-basic/http-request"],
      a: [
        { code: `npm install @apollo/client graphql`, lang: "bash" },
        { code: `import { createRoot } from "react-dom/client";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";

const client = new ApolloClient({
  link: new HttpLink({ uri: "http://localhost:4000/graphql" }),
  cache: new InMemoryCache(),
});

createRoot(document.getElementById("root")!).render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);`, lang: "typescript", caption: "1. Set up the client once" },
        { code: `import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

const GET_POSTS = gql\`
  query GetPosts {
    posts {
      id
      title
    }
  }
\`;

type GetPostsData = { posts: { id: string; title: string }[] };

function PostList() {
  const { loading, error, data } = useQuery<GetPostsData>(GET_POSTS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Something went wrong: {error.message}</p>;

  return (
    <ul>
      {data?.posts.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}`, lang: "typescript", caption: "2. Use a query in a component" },
        { ul: [
          "`gql` turns the query text into a document that Apollo can read.",
          "`useQuery` sends the query, re-renders the component when the result arrives, and gives you `loading`, `error` and `data`.",
          "Results are saved in the **cache**, so another component that asks for the same data gets it instantly.",
          "For changes use `useMutation`. For live data use `useSubscription`."
        ] },
        { note: "You do not need Apollo to use GraphQL: a plain `fetch` POST works. Apollo adds caching, loading states and devtools. Other clients are **urql**, **Relay** and **graphql-request**.", kind: "tip" }
      ]
    }

  ]
});
