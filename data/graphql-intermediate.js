/* GraphQL - Intermediate. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "graphql-intermediate",
  topic: "GraphQL",
  level: "Intermediate",
  short: "GraphQL Intermediate",
  accent: "pink",
  desc: "How GraphQL works under the hood: execution, context, the N+1 problem and DataLoader, errors, pagination, auth, security, caching, subscriptions, schema design and federation, with Apollo examples in TypeScript.",
  questions: [

    {
      id: "execution-flow",
      q: "What happens on the server when a GraphQL query arrives?",
      tldr: "The server parses the query text into a tree, validates it against the schema, then executes it by calling the resolver for each requested field from the top down, and finally sends back JSON in the same shape.",
      tags: ["execution", "server"],
      seeAlso: ["graphql-intermediate/default-resolvers", "graphql-basic/resolvers"],
      a: [
        { ol: [
          "**Parse**: the query string is turned into a tree (called an AST). A typo here gives a syntax error.",
          "**Validate**: the tree is checked against the schema. Does each field exist? Are the argument types right? Were the required variables sent? If this fails, no resolver runs.",
          "**Execute**: GraphQL walks the tree. It calls the resolver for each top-level field, then passes each result down as `parent` to the resolvers of its child fields.",
          "**Respond**: the results are put together in the same shape as the query, plus any `errors`."
        ] },
        { code: `query { post(id: "1") { title author { name } } }

Query.post(id: "1")        ->  { id: "1", title: "Hi", authorId: "7" }
  Post.title  (default)    ->  "Hi"
  Post.author              ->  { id: "7", name: "Asha" }
    User.name  (default)   ->  "Asha"`, lang: "text", caption: "How the resolvers run for one query" },
        { ul: [
          "Sibling fields in a **query** can be resolved **in parallel**: two slow async resolvers next to each other run at the same time.",
          "Top-level fields in a **mutation** run **one after another**, in order.",
          "A child resolver always waits for its parent, because it needs the parent's result."
        ] },
        { note: "💡 Say it like this: 'Parse, validate, execute. Execution is a walk down the tree: each resolver gets its parent's result and returns the data for its own field.'", kind: "tip" }
      ]
    },

    {
      id: "default-resolvers",
      q: "What is a default resolver, and how do resolvers chain together?",
      tldr: "If a field has no resolver, GraphQL uses a default one that simply returns the property with the same name from the parent object. Each resolver's return value becomes the parent of the next level, which forms a resolver chain.",
      tags: ["resolvers", "execution"],
      seeAlso: ["graphql-basic/resolvers", "graphql-intermediate/execution-flow"],
      a: [
        { code: `const resolvers = {
  Query: {
    // Returns a plain database row:
    // { id: "1", title: "Hi", author_id: "7", created_at: "2026-01-15" }
    post: (_parent, args, ctx) => ctx.db.getPostById(args.id),
  },
  Post: {
    // id and title: no resolver needed, the default reads parent.id and parent.title

    // createdAt: the column has a different name, so map it
    createdAt: (post) => post.created_at,

    // author: not in the row at all, so load it using the parent's data
    author: (post, _args, ctx) => ctx.db.getUserById(post.author_id),
  },
};`, lang: "typescript" },
        { ul: [
          "The **default resolver** returns `parent[fieldName]`. If that value is a function, it calls it.",
          "You only write a resolver where the data is **missing, renamed or needs work** (formatting, loading from somewhere else).",
          "Each resolver passes its result **down**: whatever `Query.post` returns becomes the `parent` of every `Post` field resolver."
        ] },
        { note: "This is why your database rows do not have to match the schema. Small field resolvers can rename, calculate or load whatever is different.", kind: "tip" }
      ]
    },

    {
      id: "context-object",
      q: "What is the context object in GraphQL, and what should you put in it?",
      tldr: "Context is an object created once per request and shared with every resolver in that request. It usually holds the logged-in user, the database or API clients, and the DataLoaders.",
      tags: ["resolvers", "server", "apollo"],
      seeAlso: ["graphql-basic/resolver-arguments", "graphql-intermediate/dataloader", "graphql-intermediate/authentication-authorization"],
      a: [
        { code: `import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

interface MyContext {
  user: User | null;
  db: Database;
  loaders: Loaders;
}

const server = new ApolloServer<MyContext>({ typeDefs, resolvers });

await startStandaloneServer(server, {
  // This function runs once for EVERY request
  context: async ({ req }) => ({
    user: await getUserFromToken(req.headers.authorization),
    db,                          // one shared database client
    loaders: createLoaders(db),  // NEW loaders for every request
  }),
});`, lang: "typescript" },
        { ul: [
          "**The logged-in user**: read the token once, here, instead of in every resolver.",
          "**Data access**: the database client, REST API clients, services.",
          "**DataLoaders**: created fresh for each request, so their cache is never shared between users.",
          "**Request details**: a request id for logs, the user's language, and so on."
        ] },
        { note: "Never keep per-user data in a global variable, and never reuse one context object for several requests. Requests could mix, and one user could see another user's data.", kind: "warn" },
        { note: "💡 Say it like this: 'Context is a per-request backpack that every resolver can open: the current user, the database and the loaders.'", kind: "tip" }
      ]
    },

    {
      id: "n-plus-one-problem",
      q: "What is the N+1 problem in GraphQL?",
      tldr: "It happens when a query loads a list of N items and a nested field then makes one more database call for each item, so you make 1 + N calls instead of 2. It is easy to hit in GraphQL because each field resolver runs on its own.",
      tags: ["performance", "resolvers"],
      seeAlso: ["graphql-intermediate/dataloader"],
      a: [
        { code: `query {
  posts(first: 50) {     # 1 call: get 50 posts
    title
    author {             # then 1 call PER post to get its author
      name
    }
  }
}`, lang: "graphql" },
        { code: `const resolvers = {
  Query: {
    posts: (_p, args, ctx) => ctx.db.getPosts(args.first),          // 1 query
  },
  Post: {
    author: (post, _args, ctx) => ctx.db.getUserById(post.authorId), // runs 50 times!
  },
};`, lang: "typescript" },
        { code: `SELECT * FROM posts LIMIT 50;
SELECT * FROM users WHERE id = 7;
SELECT * FROM users WHERE id = 3;
SELECT * FROM users WHERE id = 7;   -- the same user again!
-- ... 51 queries in total`, lang: "sql", caption: "What the database sees" },
        { p: "**Why GraphQL makes this easy to hit:** each `Post.author` resolver runs on its own and does not know that 49 others are doing the same thing. With nested lists (posts → comments → author) it gets much worse." },
        { p: "**The fix** is batching: collect all the author ids first, then load them with **one** query (`WHERE id IN (...)`). The standard tool for this is **DataLoader**." },
        { note: "💡 Say it like this: 'N+1 is one query for the list plus one query per item. In GraphQL I fix it with DataLoader, which batches those per-item calls into one.'", kind: "tip" }
      ]
    },

    {
      id: "dataloader",
      q: "What is DataLoader and how does it solve the N+1 problem?",
      tldr: "DataLoader is a small library that collects all the load(id) calls made at the same moment, sends them to your batch function as one list, and caches the results for the rest of the request. So 50 author lookups become one query.",
      tags: ["performance", "dataloader"],
      seeAlso: ["graphql-intermediate/n-plus-one-problem", "graphql-intermediate/context-object"],
      a: [
        { code: `npm install dataloader`, lang: "bash" },
        { code: `import DataLoader from "dataloader";

export function createLoaders(db: Database) {
  return {
    user: new DataLoader(async (ids: readonly string[]) => {
      // ONE query for all ids: SELECT * FROM users WHERE id IN (...)
      const users = await db.getUsersByIds(ids);

      // Results MUST be in the same order as the ids (null if not found)
      return ids.map((id) => users.find((u) => u.id === id) ?? null);
    }),
  };
}`, lang: "typescript", caption: "1. Write a batch function" },
        { code: `// In the context: new loaders for every request
context: async () => ({ db, loaders: createLoaders(db) }),

// In the resolver: ask the loader instead of the database
Post: {
  author: (post, _args, ctx) => ctx.loaders.user.load(post.authorId),
},`, lang: "typescript", caption: "2. Create it per request and use it" },
        { ul: [
          "**Batching**: every `load()` call made in the same tick of the event loop is collected and passed to the batch function together.",
          "**Caching**: asking for the same id twice in one request returns the same result, so user 7 is loaded only once.",
          "**Order rule**: the batch function must return results in the **same order and the same length** as the ids it received.",
          "**One per request**: create new loaders for every request, so cached data never leaks between users."
        ] },
        { p: "Result: 1 query for the posts + 1 query for all the authors = **2 queries** instead of 51." },
        { note: "💡 Say it like this: 'DataLoader waits a tiny moment, collects all the ids the resolvers asked for, loads them in one query, and remembers them for the rest of that request.'", kind: "tip" }
      ]
    },

    {
      id: "interfaces-vs-unions",
      q: "What are interfaces and union types? What is the difference?",
      tldr: "Both let a field return more than one type. An interface is a set of fields that every type using it must have; a union is just a list of possible types that do not need to share any fields.",
      tags: ["types", "schema"],
      seeAlso: ["graphql-intermediate/inline-fragments-typename"],
      a: [
        { code: `interface Media {
  id: ID!
  title: String!
}

type Video implements Media {
  id: ID!
  title: String!
  durationSeconds: Int!
}

type Article implements Media {
  id: ID!
  title: String!
  wordCount: Int!
}

type Query {
  feed: [Media!]!
}`, lang: "graphql", caption: "Interface: shared fields" },
        { code: `union SearchResult = User | Post | Comment

type Query {
  search(text: String!): [SearchResult!]!
}`, lang: "graphql", caption: "Union: one of these types" },
        { table: { head: ["", "Interface", "Union"], rows: [
          ["Shared fields", "Required: every type must have them", "None needed"],
          ["Ask for common fields directly", "Yes: `feed { id title }`", "No: every field needs `... on Type`"],
          ["Good for", "Types that are the same kind of thing", "Unrelated types, like search results or error results"]
        ] } },
        { code: `const resolvers = {
  // Tell GraphQL which real type each object is
  SearchResult: {
    __resolveType: (obj) => obj.kind,      // "User", "Post" or "Comment"
  },
  Media: {
    __resolveType: (obj) => ("durationSeconds" in obj ? "Video" : "Article"),
  },
};`, lang: "typescript", caption: "The server must say which concrete type each object is" },
        { note: "💡 Simple line: 'An interface says these types share these fields. A union says it is one of these types, with nothing in common needed.'", kind: "tip" }
      ]
    },

    {
      id: "inline-fragments-typename",
      q: "What are inline fragments and `__typename`?",
      tldr: "An inline fragment, written ... on TypeName, selects fields that exist only on one specific type; you need it when you query an interface or a union. __typename tells you which type each object really is.",
      tags: ["queries", "types"],
      seeAlso: ["graphql-intermediate/interfaces-vs-unions", "graphql-basic/fragments"],
      a: [
        { code: `query Search($text: String!) {
  search(text: $text) {
    __typename
    ... on User {
      name
    }
    ... on Post {
      title
    }
    ... on Comment {
      text
    }
  }
}`, lang: "graphql" },
        { code: `{
  "data": {
    "search": [
      { "__typename": "User", "name": "Asha" },
      { "__typename": "Post", "title": "Hello GraphQL" },
      { "__typename": "Comment", "text": "Nice post!" }
    ]
  }
}`, lang: "json", caption: "Response" },
        { ul: [
          "`... on Post { title }` means 'if this item is a Post, also give me its `title`'.",
          "`__typename` is a built-in field you can ask for on **any** object. The UI uses it to decide how to show each item.",
          "Inline fragments can also carry directives: `... @include(if: $full) { body }`.",
          "Apollo Client adds `__typename` to every query automatically, because its cache needs it."
        ] },
        { code: `function SearchItem({ item }: { item: SearchResult }) {
  switch (item.__typename) {
    case "User":    return <UserRow user={item} />;
    case "Post":    return <PostRow post={item} />;
    case "Comment": return <CommentRow comment={item} />;
  }
}`, lang: "typescript", caption: "Using __typename in the UI" },
        { note: "With generated TypeScript types, `__typename` works as a **discriminated union**: inside each `case`, TypeScript knows the exact type and its fields.", kind: "tip" }
      ]
    },

    {
      id: "custom-scalars",
      q: "How do you create a custom scalar type, like DateTime?",
      tldr: "Declare it in the schema with scalar DateTime, then give the server a GraphQLScalarType with three functions: serialize (server to client), parseValue (from variables) and parseLiteral (from values written in the query).",
      tags: ["types", "schema", "apollo"],
      seeAlso: ["graphql-basic/scalar-types", "graphql-intermediate/input-validation"],
      a: [
        { code: `scalar DateTime     # an ISO-8601 date-time string, like 2026-01-15T10:30:00Z

type Post {
  title: String!
  createdAt: DateTime!
}`, lang: "graphql" },
        { code: `import { GraphQLScalarType, Kind } from "graphql";

const DateTime = new GraphQLScalarType({
  name: "DateTime",
  description: "An ISO-8601 date-time string",

  // Server -> client: turn a Date into a string for the JSON response
  serialize(value) {
    return (value as Date).toISOString();
  },

  // Client -> server, from variables: "2026-01-15T10:30:00Z" -> Date
  parseValue(value) {
    if (typeof value !== "string") throw new TypeError("DateTime must be a string");
    return new Date(value);
  },

  // Client -> server, when the value is written inside the query text
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) throw new TypeError("DateTime must be a string");
    return new Date(ast.value);
  },
});

const resolvers = {
  DateTime,            // register it under the same name as in the schema
  Query: { /* ... */ },
};`, lang: "typescript" },
        { table: { head: ["Function", "Direction", "Example"], rows: [
          ["`serialize`", "Server → client (output)", "`Date` → `\"2026-01-15T10:30:00.000Z\"`"],
          ["`parseValue`", "Client → server, from variables", "`\"2026-01-15T10:30:00Z\"` → `Date`"],
          ["`parseLiteral`", "Client → server, written in the query", "`after: \"2026-01-01\"` → `Date`"]
        ] } },
        { ul: [
          "**Why**: a custom scalar keeps validation and formatting in one place: `DateTime`, `Email`, `URL`, `BigInt`.",
          "Bad input is rejected **before** your resolver runs.",
          "**Do not reinvent them**: the `graphql-scalars` package has many ready-made, well-tested scalars. A real `DateTime` should also reject invalid dates."
        ] },
        { note: "💡 Say it like this: 'A custom scalar is a new leaf type with my own rules. I define how it goes out and how it comes in, and GraphQL checks it for me.'", kind: "tip" }
      ]
    },

    {
      id: "custom-directives",
      q: "How do you create a custom directive in GraphQL?",
      tldr: "Declare the directive in the schema (for example directive @auth on FIELD_DEFINITION), put it on fields, and then write server code that finds those fields and wraps their resolvers with the extra behaviour.",
      tags: ["directives", "schema", "apollo"],
      seeAlso: ["graphql-basic/directives", "graphql-intermediate/authentication-authorization"],
      a: [
        { code: `enum Role {
  USER
  ADMIN
}

directive @auth(requires: Role = USER) on FIELD_DEFINITION

type Query {
  me: User @auth
  allUsers: [User!]! @auth(requires: ADMIN)
}`, lang: "graphql", caption: "1. Declare it and use it" },
        { code: `import { mapSchema, getDirective, MapperKind } from "@graphql-tools/utils";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { defaultFieldResolver, GraphQLError } from "graphql";

function authDirective(schema) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (field) => {
      const auth = getDirective(schema, field, "auth")?.[0];
      if (!auth) return field;                       // no @auth: leave it alone

      const resolve = field.resolve ?? defaultFieldResolver;
      field.resolve = (parent, args, ctx, info) => {
        if (!ctx.user) {
          throw new GraphQLError("Please log in", { extensions: { code: "UNAUTHENTICATED" } });
        }
        if (auth.requires === "ADMIN" && ctx.user.role !== "ADMIN") {
          throw new GraphQLError("Not allowed", { extensions: { code: "FORBIDDEN" } });
        }
        return resolve(parent, args, ctx, info);     // run the real resolver
      };
      return field;
    },
  });
}

let schema = makeExecutableSchema({ typeDefs, resolvers });
schema = authDirective(schema);
const server = new ApolloServer({ schema });`, lang: "typescript", caption: "2. Wrap every field that has @auth" },
        { ul: [
          "**Schema directives** (like `@auth`) change how the server builds or runs the schema. This is the common kind.",
          "**Executable directives** (like the built-in `@include`) are written by the client inside the query. Custom ones of this kind are rare.",
          "Real examples: `@auth`, `@cacheControl`, formatting like `@upper`, and Apollo Federation's `@key`."
        ] },
        { note: "Directives are handy, but they hide logic inside the schema. Many teams prefer plain, visible checks in resolvers or a service layer for important rules like permissions. Pick what your team finds easier to read and test.", kind: "warn" }
      ]
    },

    {
      id: "error-handling",
      q: "How do you handle errors properly in a GraphQL server?",
      tldr: "Throw a GraphQLError with a clear message and a code in extensions, like BAD_USER_INPUT or FORBIDDEN, so clients can react to the code. Hide the details of unexpected errors before they leave the server.",
      tags: ["errors", "apollo"],
      seeAlso: ["graphql-basic/errors-basics", "graphql-intermediate/errors-as-data", "graphql-intermediate/null-propagation"],
      a: [
        { code: `import { GraphQLError } from "graphql";

const resolvers = {
  Mutation: {
    deletePost: async (_p, { id }, ctx) => {
      if (!ctx.user) {
        throw new GraphQLError("You must be logged in", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      const post = await ctx.db.getPostById(id);
      if (!post) {
        throw new GraphQLError("Post not found", {
          extensions: { code: "NOT_FOUND", postId: id },
        });
      }
      if (post.authorId !== ctx.user.id) {
        throw new GraphQLError("You can only delete your own posts", {
          extensions: { code: "FORBIDDEN" },
        });
      }
      await ctx.db.deletePost(id);
      return true;
    },
  },
};`, lang: "typescript", caption: "Throw errors with a code" },
        { code: `const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    console.error(error);    // log the full error on the server

    // Hide unexpected errors (database messages, stack traces) from clients
    if (formattedError.extensions?.code === "INTERNAL_SERVER_ERROR") {
      return { ...formattedError, message: "Something went wrong. Please try again." };
    }
    return formattedError;
  },
});`, lang: "typescript", caption: "Hide internal details" },
        { ul: [
          "**Use codes, not messages**: clients should check `extensions.code`, because the message text can change.",
          "Apollo has built-in codes like `GRAPHQL_PARSE_FAILED`, `GRAPHQL_VALIDATION_FAILED`, `BAD_USER_INPUT` and `INTERNAL_SERVER_ERROR`. You add your own, like `UNAUTHENTICATED`, `FORBIDDEN` and `NOT_FOUND`.",
          "Any normal `Error` thrown in a resolver becomes `INTERNAL_SERVER_ERROR`.",
          "Apollo adds stack traces only when `NODE_ENV` is not `production`, so make sure production really runs with that setting."
        ] },
        { note: "💡 Say it like this: 'I throw GraphQLError with a code in extensions, the client reacts to the code, and I mask unexpected errors in formatError so internal details never leak.'", kind: "tip" }
      ]
    },

    {
      id: "errors-as-data",
      q: "What is the 'errors as data' pattern in GraphQL?",
      tldr: "Instead of throwing, a mutation returns expected problems (like 'email already taken') as normal, typed fields in its result, for example a userErrors list or a union of success and error types. The errors list is kept for unexpected failures.",
      tags: ["errors", "schema design"],
      seeAlso: ["graphql-intermediate/error-handling", "graphql-intermediate/schema-design-tips"],
      a: [
        { p: "Some errors are **expected** and part of normal use: invalid input, a username that is taken, a product that is sold out. Putting them in the schema makes them typed, documented and easy for the UI to show next to the right form field." },
        { code: `type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
}

type CreateUserPayload {
  user: User                    # null when it failed
  userErrors: [UserError!]!     # empty when it worked
}

type UserError {
  field: String                 # which input field, for example "email"
  message: String!
}`, lang: "graphql", caption: "Option 1: a payload with userErrors" },
        { code: `union CreateUserResult = User | EmailTakenError | InvalidInputError

type EmailTakenError {
  message: String!
  suggestedEmail: String
}

type InvalidInputError {
  message: String!
  field: String!
}

type Mutation {
  createUser(input: CreateUserInput!): CreateUserResult!
}`, lang: "graphql", caption: "Option 2: a result union" },
        { code: `mutation SignUp($input: CreateUserInput!) {
  createUser(input: $input) {
    __typename
    ... on User { id name }
    ... on EmailTakenError { message suggestedEmail }
    ... on InvalidInputError { message field }
  }
}`, lang: "graphql", caption: "The client handles each case" },
        { table: { head: ["", "The `errors` list", "Errors as data"], rows: [
          ["Best for", "Unexpected problems: server down, a bug, not logged in", "Expected business problems: validation, conflicts"],
          ["Typed in the schema", "No", "Yes"],
          ["Easy to show in the UI", "Harder", "Easy, even per form field"]
        ] } },
        { note: "💡 Interview line: 'I use the errors list for things that should not happen, and errors as data for things that are a normal part of the flow, like a username already being taken.'", kind: "tip" }
      ]
    },

    {
      id: "null-propagation",
      q: "What happens when a non-null field throws an error? (null propagation)",
      tldr: "A non-null field cannot be null, so when it fails, GraphQL sets its nearest nullable parent to null instead. The null 'bubbles up' until it reaches a field that is allowed to be null, which can wipe out more data than you expect.",
      tags: ["errors", "nullability"],
      seeAlso: ["graphql-basic/non-null-and-lists", "graphql-intermediate/error-handling"],
      a: [
        { code: `type Query {
  post(id: ID!): Post         # nullable
}

type Post {
  title: String!
  author: User!               # non-null
}`, lang: "graphql" },
        { p: "Now the `author` resolver fails. `author` is not allowed to be null, so its parent `post` becomes null instead:" },
        { code: `{
  "data": { "post": null },
  "errors": [
    {
      "message": "User service timed out",
      "path": ["post", "author"]
    }
  ]
}`, lang: "json" },
        { p: "We lost the `title` too, even though it loaded fine. If every field up to the root were non-null, the whole `data` would become `null`." },
        { ul: [
          "Use `!` where a value is **truly always there** and comes from the same place as its parent (like `id`).",
          "Keep fields **nullable** when they come from another service or can fail on their own. Then one failure stays small.",
          "Lists: in `[Post!]`, one failed item makes the **whole list** null. With `[Post!]!` the null goes even further up, to the parent."
        ] },
        { note: "💡 Say it like this: 'Non-null is a promise. If the server breaks the promise, the null bubbles up to the nearest nullable parent. So I use the exclamation mark carefully, especially on fields that call other services.'", kind: "tip" }
      ]
    },

    {
      id: "input-validation",
      q: "How do you validate input in GraphQL beyond the basic types?",
      tldr: "GraphQL only checks types and required fields. For real rules, like length, format or business rules, validate in the resolver or service layer (for example with zod) and return a BAD_USER_INPUT error or a userErrors list.",
      tags: ["validation", "mutations"],
      seeAlso: ["graphql-intermediate/errors-as-data", "graphql-intermediate/custom-scalars"],
      a: [
        { p: "GraphQL already rejects wrong types, unknown fields and missing required values before your code runs. It does **not** know that a title must be 3 to 120 characters long, or that an email must be unique." },
        { code: `import { z } from "zod";
import { GraphQLError } from "graphql";

const CreatePostRules = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().min(1),
  tags: z.array(z.string()).max(5).optional(),
});

const resolvers = {
  Mutation: {
    createPost: async (_p, { input }, ctx) => {
      const result = CreatePostRules.safeParse(input);
      if (!result.success) {
        throw new GraphQLError("Invalid input", {
          extensions: {
            code: "BAD_USER_INPUT",
            issues: result.error.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          },
        });
      }
      return ctx.db.createPost(result.data);    // clean, checked data
    },
  },
};`, lang: "typescript" },
        { ul: [
          "**Layer 1, the schema**: types, `!`, enums and input types catch the basic mistakes.",
          "**Layer 2, custom scalars**: `Email`, `URL` and `DateTime` check the format of single values.",
          "**Layer 3, the resolver or service**: rules about several fields, the database (is it unique?) or the user (are they allowed?).",
          "Return problems as a `BAD_USER_INPUT` error, or as `userErrors` in the payload so the UI can show them next to each form field."
        ] },
        { note: "Keep business rules in a **service layer** that the resolvers call. Then the same rules work for GraphQL, REST, background jobs and tests.", kind: "tip" }
      ]
    },

    {
      id: "authentication-authorization",
      q: "How do you handle authentication and authorization in GraphQL?",
      tldr: "Authentication (who are you?) is done once per request, usually by reading the token in the context function. Authorization (what are you allowed to do?) is checked close to the data, in resolvers, a service layer or directives, field by field.",
      tags: ["security", "auth"],
      seeAlso: ["graphql-intermediate/context-object", "graphql-intermediate/custom-directives"],
      a: [
        { code: `await startStandaloneServer(server, {
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace("Bearer ", "") ?? "";
    const user = token ? await verifyToken(token) : null;   // null = not logged in
    return { user, db, loaders: createLoaders(db) };
  },
});`, lang: "typescript", caption: "Authentication: find the user once, in context" },
        { code: `import { GraphQLError } from "graphql";

function requireRole(ctx, role) {
  if (!ctx.user) {
    throw new GraphQLError("Please log in", { extensions: { code: "UNAUTHENTICATED" } });
  }
  if (ctx.user.role !== role) {
    throw new GraphQLError("Not allowed", { extensions: { code: "FORBIDDEN" } });
  }
}

const resolvers = {
  Query: {
    users: (_p, _args, ctx) => {
      requireRole(ctx, "ADMIN");
      return ctx.db.getAllUsers();
    },
  },
  User: {
    // Field rule: only the user themselves or an admin can see the email
    email: (user, _args, ctx) =>
      ctx.user?.id === user.id || ctx.user?.role === "ADMIN" ? user.email : null,
  },
};`, lang: "typescript", caption: "Authorization: check in resolvers" },
        { ul: [
          "**Do not block the whole endpoint** for logged-out users if some data is public. Decide per field instead.",
          "**Protect fields, not just queries**: a `User` can be reached from many paths (`post.author`, `comment.author`), so the check belongs on the field or in the service that loads it.",
          "The best home for rules is often the **business/service layer**, so every API path uses the same check.",
          "Logging in itself can be a normal REST endpoint or a `login` mutation that returns a token."
        ] },
        { note: "A common mistake is checking permissions only on top-level queries. Someone can then reach the same data through a nested field.", kind: "warn" },
        { note: "💡 Say it like this: 'Authentication happens once per request, in context. Authorization happens close to the data, in resolvers or the service layer, so every path to a field is protected.'", kind: "tip" }
      ]
    },

    {
      id: "pagination",
      q: "How do you do pagination in GraphQL? Offset vs cursor.",
      tldr: "Offset pagination uses limit and offset (page 3 = skip 20, take 10); it is simple but can skip or repeat items when data changes. Cursor pagination asks for '10 items after this bookmark'; it is stable and fast, which is why feeds and infinite scroll use it.",
      tags: ["pagination", "schema design"],
      seeAlso: ["graphql-intermediate/cursor-connections"],
      a: [
        { code: `type Query {
  posts(limit: Int = 10, offset: Int = 0): [Post!]!
}

# page 3, with 10 per page
query {
  posts(limit: 10, offset: 20) { title }
}`, lang: "graphql", caption: "Offset based" },
        { code: `type Query {
  posts(first: Int = 10, after: String): PostPage!
}

type PostPage {
  items: [Post!]!
  nextCursor: String       # null when there are no more pages
}

# next page: send the nextCursor from the previous response
query {
  posts(first: 10, after: "cG9zdDoyMA==") {
    items { title }
    nextCursor
  }
}`, lang: "graphql", caption: "Cursor based" },
        { table: { head: ["", "Offset", "Cursor"], rows: [
          ["How it works", "Skip N rows, take M", "Take M rows after a known item"],
          ["Jump to page 7", "Easy", "Not directly"],
          ["New items added while reading", "Items can repeat or be skipped", "Stable"],
          ["Speed on big tables", "Slow for big offsets (the database still reads the skipped rows)", "Fast with an index (`WHERE id > cursor`)"],
          ["Good for", "Admin tables with page numbers", "Feeds, infinite scroll, real-time lists"]
        ] } },
        { ul: [
          "A **cursor** is an opaque string from the server (often Base64 of an id or a date). The client should not build or read it, only send it back.",
          "Always set a **maximum** for `first` or `limit` (like 100), or a client can ask for a million rows."
        ] },
        { note: "💡 Say it like this: 'Offset is page numbers, cursor is a bookmark. For feeds I use cursors, usually in the Relay connection style.'", kind: "tip" }
      ]
    },

    {
      id: "cursor-connections",
      q: "What is the Relay cursor connection pattern (edges, node, pageInfo)?",
      tldr: "It is a standard shape for paginated lists: a Connection type with edges (each edge holds a node and its cursor) and pageInfo (hasNextPage and endCursor). To get the next page, the client asks for first: 10, after: endCursor.",
      tags: ["pagination", "schema design"],
      seeAlso: ["graphql-intermediate/pagination"],
      a: [
        { code: `type Query {
  posts(first: Int, after: String, last: Int, before: String): PostConnection!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int            # a common extra, not part of the standard
}

type PostEdge {
  node: Post!                # the actual item
  cursor: String!            # the bookmark for this item
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}`, lang: "graphql" },
        { code: `query Feed($after: String) {
  posts(first: 10, after: $after) {
    edges {
      node { id title }
    }
    pageInfo {
      hasNextPage
      endCursor          # send this as $after to get the next page
    }
  }
}`, lang: "graphql", caption: "Fetching page after page" },
        { ul: [
          "**Why edges and not just a list?** An edge can hold data about the **relationship**, not the item. For example, in a `friends` list the edge can have `friendsSince`.",
          "`first` and `after` move forward; `last` and `before` move backward.",
          "It is a well-known standard, so Relay, Apollo Client helpers and many server libraries understand it out of the box.",
          "The downside is more nesting and more types. For simple cases, a plain `items` + `nextCursor` shape is fine."
        ] },
        { note: "💡 Say it like this: 'A connection is a list wrapper. Edges hold each node and its cursor, and pageInfo tells me if there is a next page and where to continue from.'", kind: "tip" }
      ]
    },

    {
      id: "protect-from-expensive-queries",
      q: "How do you protect a GraphQL API from very expensive or malicious queries?",
      tldr: "Because clients write their own queries, you must set limits: maximum depth, a cost (complexity) budget, page size caps, timeouts and rate limits. For your own apps, the strongest option is to allow only known, pre-registered queries (trusted documents).",
      tags: ["security", "performance"],
      seeAlso: ["graphql-intermediate/persisted-queries", "graphql-basic/introspection"],
      a: [
        { code: `query TooExpensive {
  posts(first: 100) {
    author {
      posts(first: 100) {
        author {
          posts(first: 100) {      # 100 x 100 x 100 = 1,000,000 posts
            title
          }
        }
      }
    }
  }
}`, lang: "graphql", caption: "A small query that explodes" },
        { table: { head: ["Protection", "What it does"], rows: [
          ["**Depth limit**", "Reject queries nested deeper than, say, 10 levels"],
          ["**Cost (complexity) limit**", "Give each field a cost, multiply by list sizes, and reject queries over a budget"],
          ["**Page size caps**", "`first` can never be more than 100"],
          ["**Timeouts**", "Stop work that runs too long"],
          ["**Rate limits by cost**", "Limit how much query cost each user can spend per minute, not just the number of requests"],
          ["**Limit aliases and batching**", "Stop one request from repeating an expensive field 1,000 times"],
          ["**Trusted documents**", "Run only the queries your own apps registered at build time"],
          ["**No introspection in production**", "Make a public API harder to explore for attackers"]
        ] } },
        { code: `import depthLimit from "graphql-depth-limit";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(10)],                      // reject deep queries
  introspection: process.env.NODE_ENV !== "production",   // off in production
});`, lang: "typescript" },
        { p: "Useful libraries: `graphql-depth-limit`, `graphql-query-complexity`, and **GraphQL Armor**, which bundles several of these protections." },
        { note: "💡 Say it like this: 'In GraphQL the client writes the query, so I limit depth and cost, cap page sizes, add timeouts and rate limits, and for our own apps I allow only persisted queries.'", kind: "tip" }
      ]
    },

    {
      id: "server-caching",
      q: "Why is caching harder in GraphQL than in REST, and how do you cache on the server?",
      tldr: "REST can cache by URL, but GraphQL sends many different queries to one URL, usually with POST, so normal HTTP caching does not help much. Instead you cache inside the server (DataLoader, Redis, a response cache) and use GET with persisted queries when you want CDN caching.",
      tags: ["caching", "performance"],
      seeAlso: ["graphql-intermediate/persisted-queries", "graphql-intermediate/apollo-client-cache", "graphql-intermediate/dataloader"],
      a: [
        { p: "In REST, `GET /posts/1` is a unique URL, so the browser, a CDN or a proxy can cache it. In GraphQL every request goes to `POST /graphql` with a different body, so those caches cannot tell the requests apart." },
        { table: { head: ["Cache level", "How", "Example"], rows: [
          ["Per request", "DataLoader removes duplicate loads in one request", "User 7 is loaded once, even if 20 posts need it"],
          ["Data", "Keep slow lookups in memory or Redis", "Cache an exchange-rate API call for 5 minutes"],
          ["Whole response", "Cache full results by query + variables", "Apollo's response cache plugin"],
          ["CDN / HTTP", "Use GET + persisted queries so URLs are short and stable, then set `Cache-Control`", "Public product pages"],
          ["Client", "Apollo Client's normalised cache", "See the next questions"]
        ] } },
        { code: `type Post @cacheControl(maxAge: 60) {          # cache posts for 60 seconds
  id: ID!
  title: String!
  viewCount: Int! @cacheControl(maxAge: 5)       # this field changes faster
  myNotes: String @cacheControl(scope: PRIVATE)  # per user, never shared
}`, lang: "graphql", caption: "Cache hints in Apollo Server" },
        { p: "Apollo Server works out the cache time for the whole response from the **smallest** hint in the query and sends it in a `Cache-Control` header. CDNs usually cache only **GET** requests. (The `@cacheControl` directive must be declared in your schema first; the Apollo docs give the exact lines.)" },
        { note: "Be very careful not to put **private, per-user** data in a shared cache. Mark it `PRIVATE`, or do not cache it at all.", kind: "warn" }
      ]
    },

    {
      id: "persisted-queries",
      q: "What are persisted queries (APQ) and trusted documents?",
      tldr: "Persisted queries send a short hash instead of the full query text. APQ (automatic persisted queries) is mainly for speed and caching; trusted documents (a safelist) also add security, because the server runs only queries it already knows.",
      tags: ["performance", "security", "caching"],
      seeAlso: ["graphql-intermediate/server-caching", "graphql-intermediate/protect-from-expensive-queries"],
      a: [
        { p: "**How APQ works:**" },
        { ol: [
          "The client sends only a **SHA-256 hash** of the query.",
          "If the server knows that hash, it runs the query. Done, with a tiny request.",
          "If not, it answers `PERSISTED_QUERY_NOT_FOUND`. The client then sends the hash **plus** the full query once, and the server saves it.",
          "From then on, every client sends only the hash."
        ] },
        { code: `{
  "operationName": "GetPost",
  "variables": { "id": "1" },
  "extensions": {
    "persistedQuery": {
      "version": 1,
      "sha256Hash": "ecf4edb46db40b5132295c0291d62fb65d6759a9eedfa4d5d612dd5ec54a6b38"
    }
  }
}`, lang: "json", caption: "An APQ request: no query text, just the hash" },
        { table: { head: ["", "APQ (automatic)", "Trusted documents (safelist)"], rows: [
          ["Who registers the queries", "The server learns them while running", "Your build step registers them before deploy"],
          ["Unknown queries", "Still allowed (sent in full once)", "**Rejected**"],
          ["Main benefit", "Smaller requests, GET + CDN caching", "Security: only your own apps' queries can run"],
          ["Good for", "Public APIs, a quick performance win", "First-party apps (your own web and mobile apps)"]
        ] } },
        { ul: [
          "Apollo Server supports APQ out of the box. On the client, Apollo Client turns it on with its persisted-queries link.",
          "Because the hash is short, queries can be sent with **GET**, so a CDN can cache them."
        ] },
        { note: "💡 Say it like this: 'Persisted queries swap the query text for a hash. APQ is mainly for speed and caching. A safelist of trusted documents is also a security feature, because the server refuses any query it does not know.'", kind: "tip" }
      ]
    },

    {
      id: "apollo-client-cache",
      q: "How does Apollo Client's cache work? What are fetch policies?",
      tldr: "Apollo Client keeps a normalised cache: it splits each response into objects and stores each object once, under a key like Post:1 (made from __typename and id). Fetch policies decide whether a query reads from the cache, the network, or both.",
      tags: ["apollo", "client", "caching"],
      seeAlso: ["graphql-intermediate/update-after-mutation", "graphql-basic/apollo-client-setup"],
      a: [
        { code: `ROOT_QUERY
  posts: [ ref(Post:1), ref(Post:2) ]

Post:1   { id: "1", title: "Hello GraphQL",   author: ref(User:7) }
Post:2   { id: "2", title: "Learning Apollo", author: ref(User:7) }
User:7   { id: "7", name: "Asha" }      <- stored ONCE, shared by both posts`, lang: "text", caption: "One response, stored as separate objects" },
        { ul: [
          "**Normalised** means every object is stored once. If `User:7` changes anywhere, every screen that shows it updates.",
          "The key is `__typename` + `id` (or `_id`). For a different key, set `keyFields` in `typePolicies`.",
          "Objects **without** an id cannot be normalised, so they are stored inside their parent."
        ] },
        { code: `const cache = new InMemoryCache({
  typePolicies: {
    Product: { keyFields: ["sku"] },     // Product is identified by sku, not id
  },
});

// Choose cache vs network per query
const { data } = useQuery(GET_POSTS, { fetchPolicy: "cache-and-network" });`, lang: "typescript" },
        { table: { head: ["Fetch policy", "What it does"], rows: [
          ["`cache-first` (default)", "Use the cache if every field is there, otherwise ask the network"],
          ["`cache-and-network`", "Show cached data now, also ask the network, then update"],
          ["`network-only`", "Always ask the network, then save the result in the cache"],
          ["`no-cache`", "Always ask the network and do not save the result"],
          ["`cache-only`", "Only read the cache, never the network"]
        ] } },
        { note: "💡 Say it like this: 'Apollo splits responses into objects keyed by type and id, stores each one once, and every query reads from that shared store. Fetch policies decide cache versus network.'", kind: "tip" }
      ]
    },

    {
      id: "update-after-mutation",
      q: "How do you update the UI after a mutation in Apollo Client?",
      tldr: "If the mutation returns the changed object with its id, Apollo updates the cache, and so the UI, automatically. For added or deleted items, you refetch the affected queries or update the cache yourself, and optimisticResponse can update the screen before the server even replies.",
      tags: ["apollo", "client", "mutations"],
      seeAlso: ["graphql-intermediate/apollo-client-cache", "graphql-basic/mutations"],
      a: [
        { p: "**Case 1, editing an object:** return the `id` and the changed fields. Apollo finds `Post:1` in the cache and updates it. Nothing else to do." },
        { code: `const RENAME_POST = gql\`
  mutation RenamePost($id: ID!, $title: String!) {
    renamePost(id: $id, title: $title) {
      id          # needed so Apollo can find Post:1 in the cache
      title       # the new value
    }
  }
\`;`, lang: "typescript" },
        { p: "**Case 2, adding or removing items:** Apollo cannot know which lists should change. Pick one of these:" },
        { code: `const [createPost] = useMutation(CREATE_POST, {
  refetchQueries: ["GetPosts"],     // run the list query again
});`, lang: "typescript", caption: "Option A: refetch (simple)" },
        { code: `const [createPost] = useMutation(CREATE_POST, {
  update(cache, { data }) {
    if (!data) return;
    cache.modify({
      fields: {
        posts(existing = []) {
          const newRef = cache.writeFragment({
            data: data.createPost,
            fragment: gql\`fragment NewPost on Post { id title }\`,
          });
          return [newRef, ...existing];     // put the new post at the top
        },
      },
    });
  },
});`, lang: "typescript", caption: "Option B: update the cache yourself (no extra request)" },
        { p: "**Case 3, make it feel instant:** `optimisticResponse` writes a guessed result into the cache straight away. When the real answer arrives, Apollo replaces it, or rolls it back if there was an error." },
        { code: `renamePost({
  variables: { id: "1", title: "New title" },
  optimisticResponse: {
    renamePost: { __typename: "Post", id: "1", title: "New title" },
  },
});`, lang: "typescript" },
        { note: "💡 Say it like this: 'If I return the id and the changed fields, Apollo updates the cache by itself. For new or deleted items I refetch or update the cache, and I use an optimistic response to make the UI feel instant.'", kind: "tip" }
      ]
    },

    {
      id: "subscriptions-under-the-hood",
      q: "How do GraphQL subscriptions work under the hood?",
      tldr: "The client opens a WebSocket and sends the subscription. The server keeps it open and listens to a pub/sub system; every time a mutation publishes an event, the server runs the client's selection on that event and pushes the result down the socket.",
      tags: ["subscriptions", "real-time", "apollo"],
      seeAlso: ["graphql-basic/subscriptions"],
      a: [
        { ol: [
          "The client opens a **WebSocket** (usually with the `graphql-ws` protocol) and sends the subscription.",
          "The server calls the subscription's `subscribe` function, which returns an **async iterator** linked to a topic, like `COMMENT_ADDED`.",
          "Somewhere else, a mutation **publishes** an event to that topic.",
          "For each event, the server runs the client's selection set on it and **pushes** the result.",
          "When the client unsubscribes or disconnects, the iterator is closed."
        ] },
        { code: `import { PubSub, withFilter } from "graphql-subscriptions";

const pubsub = new PubSub();

const resolvers = {
  Mutation: {
    addComment: async (_p, { postId, text }, ctx) => {
      const comment = await ctx.db.addComment(postId, text);
      await pubsub.publish("COMMENT_ADDED", { commentAdded: comment });  // send the event
      return comment;
    },
  },
  Subscription: {
    commentAdded: {
      // Only send events for the post this client is watching
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator(["COMMENT_ADDED"]),  // older versions: asyncIterator
        (payload, variables) => payload.commentAdded.postId === variables.postId,
      ),
    },
  },
};`, lang: "typescript" },
        { ul: [
          "**Apollo Server does not include a WebSocket server.** You add one with the `graphql-ws` and `ws` packages next to your HTTP server. (GraphQL Yoga uses Server-Sent Events by default.)",
          "The in-memory `PubSub` works on **one server only**. With several server instances, use Redis, Kafka or similar, so every instance gets every event.",
          "Check the user's token when the WebSocket **connects** (it has its own connection parameters), not on every message.",
          "Every open subscription holds a connection and some memory, so plan for scale."
        ] },
        { note: "💡 Say it like this: 'A subscription is a resolver that returns a stream instead of one value. Mutations publish events, pub/sub delivers them, and the server pushes each result over a WebSocket.'", kind: "tip" }
      ]
    },

    {
      id: "schema-first-vs-code-first",
      q: "What is the difference between schema-first and code-first GraphQL?",
      tldr: "Schema-first means you write the SDL by hand and then write resolvers that match it. Code-first means you write types and resolvers in TypeScript code, and the library generates the SDL from that code.",
      tags: ["schema", "design", "typescript"],
      seeAlso: ["graphql-intermediate/typescript-codegen"],
      a: [
        { code: `type Post {
  id: ID!
  title: String!
}

type Query {
  post(id: ID!): Post
}`, lang: "graphql", caption: "Schema-first (Apollo Server, GraphQL Yoga): you write the SDL" },
        { code: `import { ObjectType, Field, ID, Resolver, Query, Args } from "@nestjs/graphql";

@ObjectType()
export class Post {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;
}

@Resolver(() => Post)
export class PostResolver {
  constructor(private readonly posts: PostService) {}

  @Query(() => Post, { nullable: true })
  post(@Args("id", { type: () => ID }) id: string) {
    return this.posts.findById(id);
  }
}`, lang: "typescript", caption: "Code-first (NestJS): you write classes, the SDL is generated" },
        { table: { head: ["", "Schema-first", "Code-first"], rows: [
          ["Source of truth", "The `.graphql` SDL files", "Your TypeScript code"],
          ["Reading the API", "Very clear, easy to review", "Spread across classes"],
          ["Type safety", "Needs codegen to keep resolvers in sync", "Built in: the types come from the code"],
          ["Good for", "Design-first teams, sharing the contract early", "Big TypeScript codebases, less duplication"],
          ["Examples", "Apollo Server, GraphQL Yoga", "NestJS (it supports both), TypeGraphQL, Pothos"]
        ] } },
        { note: "💡 Say it like this: 'Schema-first: SDL first, then resolvers. Code-first: code first, and the SDL is generated. Both end with the same schema; the difference is which one is the source of truth.'", kind: "tip" }
      ]
    },

    {
      id: "schema-design-tips",
      q: "What are good practices for designing a GraphQL schema?",
      tldr: "Design the schema around what clients need, not around database tables. Use clear names, one input and one payload type per mutation, enums for fixed values and pagination for lists, and choose nullability on purpose.",
      tags: ["schema", "design", "best practice"],
      seeAlso: ["graphql-intermediate/errors-as-data", "graphql-intermediate/versioning-and-deprecation"],
      a: [
        { ul: [
          "**Client first**: model what screens need (`post.author.name`), not your tables (`post.author_id`). Hide foreign keys and join tables.",
          "**Clear names**: `camelCase` fields, `PascalCase` types, `ALL_CAPS` enum values.",
          "**Specific mutations**: `publishPost`, `addComment` and `archivePost` say what happens. Avoid one generic `updatePost` with 20 optional fields.",
          "**One input, one payload**: `createPost(input: CreatePostInput!): CreatePostPayload!` is easy to extend later without breaking clients.",
          "**Paginate every list** that can grow.",
          "**Nullability on purpose**: non-null for things that are always there (`id`), nullable for things that can fail or be missing.",
          "**Enums instead of strings** for fixed sets, like status or role.",
          "**Avoid a generic `JSON` scalar**: it hides the shape and loses all type safety.",
          "**Deprecate, do not delete**: mark old fields with `@deprecated` and remove them only when nobody uses them."
        ] },
        { code: `# Avoid: shaped like the database
type Post {
  post_id: Int
  author_id: Int
  status_code: String
}

# Better: shaped for the client
type Post {
  id: ID!
  author: User!
  status: PostStatus!
}

type Mutation {
  publishPost(input: PublishPostInput!): PublishPostPayload!
}`, lang: "graphql", caption: "Before and after" },
        { note: "💡 Interview line: 'I design the schema from the client's point of view, keep it explicit and typed, and change it by adding and deprecating fields instead of breaking them.'", kind: "tip" }
      ]
    },

    {
      id: "versioning-and-deprecation",
      q: "How do you version a GraphQL API? What is schema evolution?",
      tldr: "GraphQL APIs usually do not use versions like /v1 and /v2. You evolve one schema: add new fields freely, mark old ones with @deprecated, watch who still uses them, and remove them only when nobody does.",
      tags: ["design", "versioning"],
      seeAlso: ["graphql-basic/directives", "graphql-intermediate/schema-design-tips"],
      a: [
        { p: "In REST, changing a response can break clients, so teams create `/v2`. In GraphQL, clients only get the fields they ask for, so **adding** a field never breaks anyone." },
        { code: `type User {
  name: String! @deprecated(reason: "Use firstName and lastName.")
  firstName: String!
  lastName: String!
}`, lang: "graphql" },
        { table: { head: ["Change", "Safe?"], rows: [
          ["Add a new type, field or optional argument", "✅ Safe"],
          ["Add a new enum value", "⚠️ Usually safe, but old clients may not handle the new value"],
          ["Deprecate a field", "✅ Safe, tools show a warning"],
          ["Make a nullable output field non-null", "✅ Safe"],
          ["Make a non-null output field nullable", "❌ Breaking: clients may not expect null"],
          ["Make an optional argument required", "❌ Breaking"],
          ["Remove or rename a field", "❌ Breaking"]
        ] } },
        { ol: [
          "Add the new field.",
          "Mark the old field `@deprecated` with a reason that says what to use instead.",
          "Track field usage (Apollo GraphOS, logs) to see which clients still use it.",
          "Remove it when usage reaches zero, or after an announced date."
        ] },
        { note: "Run **schema checks** in CI (for example `graphql-inspector`, or Apollo's schema checks) so a breaking change is caught in the pull request, not in production.", kind: "tip" }
      ]
    },

    {
      id: "federation",
      q: "What is Apollo Federation? How is it different from schema stitching?",
      tldr: "Federation lets several teams each own a part of the graph (a subgraph) as a separate service, and a router combines them into one supergraph that clients query like a single API. Schema stitching is an older way to merge schemas, where the gateway holds all the joining logic.",
      tags: ["architecture", "microservices", "apollo"],
      a: [
        { code: `             Client
               |
           one query
               v
      Router (the supergraph)
         |               |
         v               v
  Users subgraph    Posts subgraph
  (owns User)       (owns Post, adds User.posts)`, lang: "text" },
        { code: `extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

type User @key(fields: "id") {
  id: ID!
  name: String!
}

type Query {
  me: User
}`, lang: "graphql", caption: "Users subgraph" },
        { code: `extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

type Post @key(fields: "id") {
  id: ID!
  title: String!
  author: User!
}

type User @key(fields: "id") {
  id: ID!
  posts: [Post!]!          # the Posts team adds this field to User
}`, lang: "graphql", caption: "Posts subgraph" },
        { code: `// Users subgraph: how to load a User when another subgraph points to one
const resolvers = {
  User: {
    __resolveReference: (ref, ctx) => ctx.loaders.user.load(ref.id),
  },
};`, lang: "typescript" },
        { ul: [
          "**Subgraph**: a normal GraphQL service owned by one team (built with `@apollo/subgraph`).",
          "**Entity**: a type with `@key`, like `User`, that several subgraphs can share and extend.",
          "**Router**: plans each query, calls the subgraphs it needs and merges the results.",
          "**Supergraph**: the combined schema that clients see."
        ] },
        { table: { head: ["", "Federation", "Schema stitching"], rows: [
          ["Who defines how types join", "Each subgraph, with directives like `@key`", "The gateway, with stitching config"],
          ["Team ownership", "Strong: each team owns its subgraph", "The gateway team must know everything"],
          ["Tooling", "Apollo Router and GraphOS; open-source routers also exist", "`@graphql-tools/stitch`"]
        ] } },
        { note: "💡 Say it like this: 'Federation is microservices for GraphQL: each team owns a subgraph, and a router joins them into one supergraph that clients query as one API.'", kind: "tip" }
      ]
    },

    {
      id: "file-uploads",
      q: "How do you upload files with GraphQL?",
      tldr: "GraphQL itself only sends JSON, so files are awkward. The usual best practice is a mutation that returns a signed upload URL, and then the client uploads the file straight to storage like S3. The other option is the GraphQL multipart request spec (graphql-upload).",
      tags: ["files", "design"],
      a: [
        { p: "**Option 1 (recommended): a signed upload URL**" },
        { ol: [
          "The client calls a mutation: 'I want to upload `photo.png`, type `image/png`'.",
          "The server checks permissions and returns a short-lived **signed URL** for S3, Azure Blob Storage or similar.",
          "The client uploads the file **directly** to storage with a normal HTTP PUT.",
          "The client calls another mutation to save the file's key on the user or the post."
        ] },
        { code: `type Mutation {
  createUploadUrl(fileName: String!, contentType: String!): UploadTarget!
  setAvatar(fileKey: String!): User!
}

type UploadTarget {
  uploadUrl: String!     # PUT the file here
  fileKey: String!       # keep this to save it later
  expiresAt: String!
}`, lang: "graphql" },
        { p: "**Option 2: a multipart request** (the `graphql-upload` package). The file travels in the same HTTP request as the mutation, as `multipart/form-data`, using an `Upload` scalar." },
        { table: { head: ["", "Signed URL", "Multipart (graphql-upload)"], rows: [
          ["File passes through your GraphQL server", "No", "Yes"],
          ["Server load and memory", "Low", "Higher"],
          ["Big files, resumable uploads", "Easy (the storage service handles it)", "Hard"],
          ["Setup", "Needs cloud storage", "Extra middleware and CSRF settings"]
        ] } },
        { note: "With multipart, Apollo Server's CSRF protection blocks the request unless the client sends a special header (like `Apollo-Require-Preflight`). This surprises many people.", kind: "warn" }
      ]
    },

    {
      id: "typescript-codegen",
      q: "How do you get TypeScript types for your GraphQL schema and queries?",
      tldr: "Use GraphQL Code Generator. It reads the schema and your queries and generates TypeScript types: typed resolvers on the server, and typed results and variables on the client, so everything stays in sync.",
      tags: ["typescript", "tooling", "codegen"],
      seeAlso: ["graphql-intermediate/schema-first-vs-code-first", "graphql-basic/graphiql-and-tools"],
      a: [
        { code: `npm install -D @graphql-codegen/cli @graphql-codegen/client-preset @graphql-codegen/typescript @graphql-codegen/typescript-resolvers`, lang: "bash" },
        { code: `import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "http://localhost:4000/graphql",     // or "./schema.graphql"
  documents: ["src/**/*.tsx"],                 // where your queries live
  generates: {
    // Client: typed queries and results
    "./src/gql/": { preset: "client" },

    // Server: typed resolvers
    "./src/generated/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
    },
  },
};

export default config;`, lang: "typescript", caption: "codegen.ts" },
        { code: `import { graphql } from "./gql";
import { useQuery } from "@apollo/client/react";

const GET_POST = graphql(\`
  query GetPost($id: ID!) {
    post(id: $id) {
      title
    }
  }
\`);

const { data } = useQuery(GET_POST, { variables: { id: "1" } });
data?.post?.title;      // string, with autocomplete
data?.post?.body;       // Error: body was not selected in the query`, lang: "typescript", caption: "Client: the result is fully typed" },
        { code: `import type { Resolvers } from "./generated/resolvers-types";

const resolvers: Resolvers = {
  Query: {
    post: (_parent, args, ctx) => ctx.db.getPostById(args.id),   // args.id is typed
  },
};`, lang: "typescript", caption: "Server: typed resolvers" },
        { note: "Run codegen in watch mode while developing, and again in CI. If someone changes the schema, the TypeScript build fails exactly in the places that need updating, which is what you want.", kind: "tip" }
      ]
    },

    {
      id: "testing",
      q: "How do you test a GraphQL API?",
      tldr: "Unit-test the business logic and resolvers as normal functions, run whole operations against the server in integration tests with Apollo Server's executeOperation, and check the schema for breaking changes in CI. On the client, mock the GraphQL responses.",
      tags: ["testing", "apollo"],
      seeAlso: ["graphql-intermediate/versioning-and-deprecation"],
      a: [
        { code: `import { ApolloServer } from "@apollo/server";
import { typeDefs, resolvers } from "./schema";

it("returns a post by id", async () => {
  const server = new ApolloServer({ typeDefs, resolvers });

  const response = await server.executeOperation(
    {
      query: "query GetPost($id: ID!) { post(id: $id) { title } }",
      variables: { id: "1" },
    },
    { contextValue: { user: null, db: fakeDb, loaders: createLoaders(fakeDb) } },
  );

  // "single" means a normal, one-part result
  if (response.body.kind !== "single") throw new Error("Expected a single result");
  expect(response.body.singleResult.errors).toBeUndefined();
  expect(response.body.singleResult.data?.post).toEqual({ title: "Hello GraphQL" });
});`, lang: "typescript", caption: "Integration test with executeOperation (Jest or Vitest)" },
        { table: { head: ["Level", "What to test", "How"], rows: [
          ["Unit", "Business rules and resolver logic", "Call the functions directly with fake data"],
          ["Integration", "A whole query: schema + resolvers + context", "`server.executeOperation`, no HTTP server needed"],
          ["End-to-end", "The real HTTP endpoint", "Send POST requests (supertest, Postman collections)"],
          ["Schema", "No accidental breaking changes", "Schema checks in CI (`graphql-inspector`, Apollo)"],
          ["Client", "Components that run queries", "Apollo's `MockedProvider`, or MSW to fake responses"]
        ] } },
        { ul: [
          "Test **errors and permissions** too: a logged-out user, a forbidden field, invalid input.",
          "Count the **database calls** in tests to catch N+1 problems early."
        ] },
        { note: "💡 Say it like this: 'I unit-test the business logic, integration-test whole operations with executeOperation, run schema checks in CI to catch breaking changes, and mock GraphQL on the client.'", kind: "tip" }
      ]
    },

    {
      id: "performance-checklist",
      q: "How do you improve the performance of a GraphQL API? (Summary)",
      tldr: "Fix N+1 with DataLoader, paginate lists, cache at the right levels, limit query depth and cost, use persisted queries, and measure resolver timings so you fix the fields that are really slow.",
      tags: ["performance", "summary"],
      seeAlso: ["graphql-intermediate/dataloader", "graphql-intermediate/server-caching", "graphql-intermediate/protect-from-expensive-queries", "graphql-intermediate/persisted-queries"],
      a: [
        { table: { head: ["Problem", "Fix"], rows: [
          ["Many small database calls (N+1)", "**DataLoader**: batching and per-request caching"],
          ["Huge lists", "**Pagination** with a maximum page size"],
          ["The same data loaded again and again", "**Caching**: Redis for slow lookups, a response cache, a CDN via GET"],
          ["Large request bodies", "**Persisted queries** (send a hash)"],
          ["Heavy queries, on purpose or by accident", "**Depth and cost limits**, timeouts, rate limits"],
          ["One slow field", "**Tracing**: timings per resolver (Apollo usage reporting, OpenTelemetry)"],
          ["Reading too many columns", "Look at the requested fields (the `info` argument), only when it really matters"],
          ["Slow first paint on big pages", "Incremental delivery with `@defer`, where the server and client support it (Apollo does), to send the important part first"]
        ] } },
        { ul: [
          "**Measure first**: find the slow resolvers before you optimise anything.",
          "**Keep resolvers thin** and push heavy work into the service layer, where it is easier to cache and batch.",
          "**On the client**: use Apollo's cache well, fetch only what each screen needs, and use fragments so components do not over-fetch."
        ] },
        { note: "💡 Interview line: 'My first three checks are N+1 with DataLoader, pagination limits and caching. Then I add depth and cost limits, and use tracing to find the fields that are really slow.'", kind: "tip" }
      ]
    }

  ]
});
