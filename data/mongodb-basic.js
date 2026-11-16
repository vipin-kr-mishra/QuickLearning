/* MongoDB - Basic. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "mongodb-basic",
  topic: "MongoDB",
  level: "Basic",
  short: "MongoDB Basic",
  accent: "green",
  desc: "The starting point: what MongoDB is and how it differs from SQL, documents and BSON, the mongosh shell, and the everyday create, read, update and delete commands, with a first look at indexes, aggregation and replica sets.",
  questions: [

    {
      id: "what-is-mongodb",
      q: "What is MongoDB and why do teams use it?",
      tldr: "MongoDB is an open-source NoSQL document database. It stores data as JSON-like documents instead of rows in tables, so one record can hold nested objects and arrays, the schema can change easily, and it scales out across many servers.",
      tags: ["fundamentals"],
      seeAlso: ["mongodb-basic/mongodb-vs-sql", "mongodb-basic/terminology"],
      a: [
        { p: "MongoDB was first released in **2009** by the company now called **MongoDB Inc.** The name comes from \"hu**mongo**us\", because it was built for large amounts of data." },
        { code: `// One "user" document. Nested objects and arrays live inside the record.
{
  _id: ObjectId("665f1c2a9b1e8a3d4c7f0a11"),
  name: "Asha",
  email: "asha@example.com",
  address: { city: "Pune", pin: "411001" },
  skills: ["C#", "MongoDB", "React"]
}`, lang: "mongo" },
        { p: "**Main features:**" },
        { ul: [
          "**Document model**: data looks like the objects in your code, so there is less mapping work.",
          "**Flexible schema**: two documents in the same collection can have different fields.",
          "**Rich queries**: filter, sort, project, and do analytics with the aggregation pipeline.",
          "**Indexes**: single-field, compound, text, geospatial and more, just like a relational database.",
          "**High availability**: a **replica set** keeps copies of the data and fails over automatically.",
          "**Horizontal scaling**: **sharding** spreads data across many servers.",
          "**Transactions**: multi-document ACID transactions since version 4.0."
        ] },
        { p: "**Where it is used:** product catalogues, user profiles, content management, IoT and event data, mobile backends and real-time analytics." },
        { note: "💡 Say it like this: 'MongoDB is a document database. Instead of tables and rows, it stores JSON-like documents in collections. The schema is flexible, a record can have nested objects and arrays, and it scales with replica sets and sharding.'", kind: "tip" }
      ]
    },

    {
      id: "mongodb-vs-sql",
      q: "What is the difference between MongoDB and a relational (SQL) database?",
      tldr: "A relational database stores data in tables with a fixed schema and joins tables together. MongoDB stores self-contained documents with a flexible schema, keeps related data together in one document, and is designed to scale out across servers.",
      tags: ["fundamentals", "design"],
      seeAlso: ["mongodb-basic/when-to-use", "mongodb-basic/embed-vs-reference"],
      a: [
        { table: { head: ["", "Relational (SQL Server, MySQL)", "MongoDB"], rows: [
          ["Data shape", "Rows and columns in tables", "JSON-like documents in collections"],
          ["Schema", "Fixed, defined up front (`CREATE TABLE`)", "Flexible, can be enforced with validation"],
          ["Related data", "Split into tables, combined with `JOIN`", "Often **embedded** in one document; `$lookup` when needed"],
          ["Query language", "SQL", "MongoDB Query API (JSON-style filters + aggregation)"],
          ["Scaling", "Mostly vertical (bigger server)", "Horizontal with **sharding** is built in"],
          ["Transactions", "Core feature", "Single-document writes are atomic; multi-document transactions since 4.0"]
        ] } },
        { p: "The same order in both worlds:" },
        { code: `-- SQL: an order is spread over two tables and joined back
SELECT o.Id, o.Total, i.Product, i.Qty
FROM Orders o JOIN OrderItems i ON i.OrderId = o.Id
WHERE o.Id = 101;`, lang: "sql" },
        { code: `// MongoDB: the order and its items are one document, no join
db.orders.findOne({ _id: 101 })
// { _id: 101, total: 950, items: [ { product: "Pen", qty: 10 }, ... ] }`, lang: "mongo" },
        { note: "Neither one is \"better\". Choose by the shape of the data and how you read it, not by fashion.", kind: "tip" },
        { note: "💡 Say it like this: 'SQL databases split data into normalized tables and join them back. MongoDB keeps data that is read together in one document, so most reads need no join. The schema is flexible, and it scales out with sharding.'", kind: "tip" }
      ]
    },

    {
      id: "terminology",
      q: "What are a database, a collection and a document in MongoDB? How do they map to SQL terms?",
      tldr: "A database holds collections, a collection holds documents, and a document is one record made of field-value pairs. In SQL terms: collection is like a table, document is like a row, and field is like a column.",
      tags: ["fundamentals"],
      a: [
        { table: { head: ["SQL", "MongoDB", "Notes"], rows: [
          ["Database", "Database", "A container for collections"],
          ["Table", "Collection", "No fixed columns"],
          ["Row", "Document", "Stored as BSON, can be nested"],
          ["Column", "Field", "Can differ between documents"],
          ["Primary key", "`_id` field", "Every document has one, it is unique and indexed"],
          ["Index", "Index", "Works much the same way"],
          ["JOIN", "Embedding, or `$lookup`", "Embedding is preferred when data is read together"],
          ["View", "View", "Read-only, defined by an aggregation pipeline"]
        ] } },
        { code: `use shop                       // switch to the "shop" database
db.products.insertOne({        // "products" is the collection
  name: "Pen",                 // name, price, tags are fields
  price: 10,
  tags: ["stationery"]
})`, lang: "mongo" },
        { ul: [
          "A database and a collection are created **automatically** the first time you insert into them.",
          "Collection names are usually plural and lower case: `users`, `orders`.",
          "A field name must be a string. `_id` is reserved for the primary key."
        ] },
        { note: "💡 Say it like this: 'Database holds collections, collection holds documents. A collection is like a table without a fixed schema, a document is like a row, and every document has a unique _id like a primary key.'", kind: "tip" }
      ]
    },

    {
      id: "bson",
      q: "What is BSON? How is it different from JSON?",
      tldr: "BSON means Binary JSON. It is the binary format MongoDB uses to store documents and send them over the network. It looks like JSON to you, but it is faster to scan and supports extra types that JSON does not have, such as dates, ObjectId, 64-bit integers and Decimal128.",
      tags: ["fundamentals", "types"],
      seeAlso: ["mongodb-basic/data-types", "mongodb-basic/objectid"],
      a: [
        { table: { head: ["", "JSON", "BSON"], rows: [
          ["Format", "Text, human readable", "Binary, machine friendly"],
          ["Types", "string, number, boolean, null, array, object", "All of those **plus** Date, ObjectId, Int32, Int64, Double, Decimal128, binary data, regex, timestamp"],
          ["Numbers", "Just \"number\"", "Separate integer, double and decimal types"],
          ["Speed", "Must be parsed character by character", "Stores lengths, so the server can skip fields quickly"],
          ["Size", "Often smaller", "Sometimes a little bigger because of the type and length info"]
        ] } },
        { code: `db.events.insertOne({
  name: "launch",
  at: new Date(),                         // BSON Date, not a string
  price: NumberDecimal("199.99"),         // exact decimal for money
  views: NumberLong(5000000000)           // 64-bit integer
})`, lang: "mongo" },
        { ul: [
          "You write documents in JSON-like syntax in mongosh or as objects in your driver. The driver converts them to BSON for you.",
          "**Extended JSON** is the text form of BSON, for example `{ \"$date\": \"2026-01-01T00:00:00Z\" }`. Tools like `mongoexport` use it so the types are not lost."
        ] },
        { note: "💡 Say it like this: 'BSON is binary JSON. MongoDB stores and transfers documents in BSON because it is fast to scan and has richer types: real dates, ObjectId, integers versus doubles, and Decimal128 for money.'", kind: "tip" }
      ]
    },

    {
      id: "objectid",
      q: "What is the _id field and what is an ObjectId?",
      tldr: "Every document must have a unique _id, which acts as its primary key and is indexed automatically. If you do not give one, MongoDB creates an ObjectId: a 12-byte value made of a timestamp, a random part and a counter, so it is unique without asking a central server.",
      tags: ["fundamentals", "types"],
      a: [
        { code: `db.users.insertOne({ name: "Ravi" })
// { acknowledged: true, insertedId: ObjectId("665f1c2a9b1e8a3d4c7f0a11") }

const id = ObjectId("665f1c2a9b1e8a3d4c7f0a11")
id.getTimestamp()        // ISODate("2024-06-04T...")  the creation time is inside the id

// You may also choose your own _id of any type except an array
db.countries.insertOne({ _id: "IN", name: "India" })`, lang: "mongo" },
        { p: "**The 12 bytes of an ObjectId:**" },
        { table: { head: ["Bytes", "Part", "Why"], rows: [
          ["4", "Timestamp (seconds)", "IDs roughly sort by creation time"],
          ["5", "Random value per process", "Different machines do not clash"],
          ["3", "Incrementing counter", "Unique even within the same second"]
        ] } },
        { ul: [
          "The `_id` index is created automatically and is always **unique**. You cannot drop it.",
          "Because the timestamp comes first, sorting by `_id` is roughly sorting by insert time.",
          "`_id` cannot be changed after insert. To \"change\" it, insert a new document and delete the old one.",
          "The ObjectId is generated by the **driver** on the client, not by the server, so no round trip is needed."
        ] },
        { note: "A common bug: searching `{ _id: \"665f...\" }` with a plain string finds nothing, because the stored value is an ObjectId. Wrap it: `{ _id: ObjectId(\"665f...\") }`.", kind: "warn" },
        { note: "💡 Say it like this: '_id is the primary key of every document. By default it is an ObjectId: 12 bytes with a timestamp, a random value and a counter, so the client can create unique ids without asking the server.'", kind: "tip" }
      ]
    },

    {
      id: "mongosh-basics",
      q: "What is mongosh? Which basic shell commands should you know?",
      tldr: "mongosh is the MongoDB Shell: a JavaScript and Node.js based command-line tool to connect to MongoDB, run queries and do admin work. The everyday commands are show dbs, use, show collections, and db.<collection>.<method>().",
      tags: ["tools"],
      seeAlso: ["mongodb-basic/terminology"],
      a: [
        { code: `mongosh "mongodb://localhost:27017"`, lang: "bash", caption: "connect" },
        { code: `show dbs                    // list databases
use shop                    // switch to (or start using) the "shop" database
db                          // print the current database name
show collections            // list collections in the current database

db.products.find()          // read documents
db.products.countDocuments()
db.products.drop()          // delete the whole collection
db.dropDatabase()           // delete the current database

db.products.find().limit(2).pretty()   // output is already pretty in mongosh
help                        // general help
db.products.help()          // methods available on a collection`, lang: "mongo" },
        { ul: [
          "mongosh replaced the old `mongo` shell, which was removed in **MongoDB 6.0**.",
          "It is a real JavaScript environment: you can use variables, loops and functions.",
          "The default port of a MongoDB server is **27017**.",
          "`use shop` does not create the database. It appears in `show dbs` only after you insert some data."
        ] },
        { note: "Other tools: **MongoDB Compass** (desktop GUI), **Atlas** (the cloud service), and the official **drivers** for C#, Java, Python, Node.js and more.", kind: "tip" },
        { note: "💡 Say it like this: 'mongosh is the JavaScript shell for MongoDB. I connect with a connection string, switch database with use, and run commands like db.users.find() or db.users.insertOne().'", kind: "tip" }
      ]
    },

    {
      id: "data-types",
      q: "Which data types does MongoDB support? Why does the number type matter?",
      tldr: "String, the number types (Int32, Int64, Double, Decimal128), Boolean, Date, ObjectId, Array, embedded Object, Null, binary data and a few more. The number type matters because a query compares values by type, and doubles are not exact, so use Decimal128 for money.",
      tags: ["types"],
      seeAlso: ["mongodb-basic/bson", "mongodb-basic/null-exists-type"],
      a: [
        { table: { head: ["Type", "mongosh example", "Use for"], rows: [
          ["String", "`\"Asha\"`", "Text (UTF-8)"],
          ["Double", "`3.14`  (default for JS numbers)", "Measurements"],
          ["Int32", "`NumberInt(42)`", "Small whole numbers"],
          ["Int64", "`NumberLong(42)`", "Large whole numbers, counters"],
          ["Decimal128", "`NumberDecimal(\"9.99\")`", "Money, exact decimals"],
          ["Boolean", "`true`", "Flags"],
          ["Date", "`new Date()` or `ISODate(\"2026-01-01\")`", "Points in time (stored in UTC)"],
          ["ObjectId", "`ObjectId()`", "Ids"],
          ["Array", "`[1, 2, 3]`", "Lists"],
          ["Object", "`{ city: \"Pune\" }`", "Embedded documents"],
          ["Null", "`null`", "\"No value\""],
          ["Binary", "`BinData(...)`, `UUID(...)`", "Files, UUIDs"]
        ] } },
        { code: `db.items.insertOne({ price: 0.1 + 0.2 })                   // 0.30000000000000004 as a double
db.items.insertOne({ price: NumberDecimal("0.30") })       // exactly 0.30

db.items.insertOne({ at: "2026-01-01" })   // a STRING, not a date: date queries will miss it
db.items.insertOne({ at: new Date("2026-01-01") })  // a real Date`, lang: "mongo" },
        { ul: [
          "In mongosh a plain number such as `42` is stored as a **Double**. Drivers in typed languages (C#, Java) use the type of your variable.",
          "Numeric types compare by value in queries, so `{ qty: 5 }` matches Int32 5, Int64 5 and Double 5.0.",
          "Dates are stored as milliseconds since 1970 in **UTC**. Convert to local time in the app or in the aggregation with a `timezone` option."
        ] },
        { note: "💡 Say it like this: 'BSON has separate types for Int32, Int64, Double and Decimal128, plus Date and ObjectId. I store dates as real Date values, not strings, and money as Decimal128 so there are no rounding errors.'", kind: "tip" }
      ]
    },

    {
      id: "insert",
      q: "How do you insert documents? What is the difference between insertOne and insertMany?",
      tldr: "insertOne adds a single document and insertMany adds an array of documents in one call. insertMany is ordered by default, which means it stops at the first error; with ordered: false it carries on and inserts every document it can.",
      tags: ["crud"],
      seeAlso: ["mongodb-intermediate/bulk-write"],
      a: [
        { code: `db.users.insertOne({ name: "Asha", age: 28 })
// { acknowledged: true, insertedId: ObjectId("...") }

db.users.insertMany([
  { name: "Ravi",  age: 31 },
  { name: "Meera", age: 25 }
])
// { acknowledged: true, insertedIds: { '0': ObjectId("..."), '1': ObjectId("...") } }`, lang: "mongo" },
        { p: "**Ordered vs unordered insertMany:**" },
        { code: `db.users.insertMany(
  [ { _id: 1 }, { _id: 1 }, { _id: 2 } ],   // the second one is a duplicate
  { ordered: false }
)
// ordered: true (default)  ->  inserts _id 1, fails on the duplicate, STOPS. _id 2 is not inserted.
// ordered: false           ->  inserts _id 1 and _id 2, then reports the one error.`, lang: "mongo" },
        { ul: [
          "If the collection does not exist, the first insert creates it.",
          "If you leave out `_id`, the driver adds an ObjectId.",
          "Inserting many documents in one call is much faster than a loop of `insertOne`, because it saves network round trips.",
          "Each single document insert is **atomic**. The whole `insertMany` batch is **not**: some documents can succeed while others fail."
        ] },
        { note: "💡 Say it like this: 'insertOne adds one document, insertMany adds a batch in one round trip. insertMany is ordered by default and stops at the first error; I set ordered: false when I want it to insert everything it can.'", kind: "tip" }
      ]
    },

    {
      id: "find-basics",
      q: "How do you read documents? What is the difference between find and findOne?",
      tldr: "find(filter, projection) returns a cursor over every matching document, and findOne returns just the first matching document (or null). An empty filter {} matches everything, and the filter is a document describing the values you want.",
      tags: ["crud", "queries"],
      seeAlso: ["mongodb-basic/projection", "mongodb-basic/comparison-operators"],
      a: [
        { code: `db.users.find()                         // all documents
db.users.find({ city: "Pune" })         // city equals "Pune"
db.users.find({ city: "Pune", age: 28 })  // both conditions (implicit AND)

db.users.findOne({ email: "asha@example.com" })   // one document or null

db.users.find({ city: "Pune" }, { name: 1, _id: 0 })  // second argument = projection`, lang: "mongo" },
        { p: "**What a cursor is:**" },
        { ul: [
          "`find()` does not load everything at once. It returns a **cursor** that fetches results in **batches** from the server.",
          "mongosh shows the first 20 results; type `it` to see the next batch.",
          "In code you loop over the cursor, or call `.toArray()` when you know the result is small.",
          "You can chain `.sort()`, `.limit()` and `.skip()` on the cursor before it runs."
        ] },
        { code: `const cursor = db.users.find({ age: { $gte: 18 } })
while (cursor.hasNext()) {
  printjson(cursor.next())
}

db.users.find({ age: { $gte: 18 } }).toArray()   // fine for small results only`, lang: "mongo" },
        { note: "💡 Say it like this: 'find takes a filter and an optional projection and returns a cursor that streams results in batches. findOne returns just the first match. Putting several fields in the filter means AND.'", kind: "tip" }
      ]
    },

    {
      id: "comparison-operators",
      q: "What are the comparison query operators in MongoDB?",
      tldr: "They compare a field with a value: $eq, $ne, $gt, $gte, $lt, $lte, and $in / $nin for a list of values. You write them as { field: { $operator: value } }.",
      tags: ["queries", "operators"],
      seeAlso: ["mongodb-basic/logical-operators"],
      a: [
        { table: { head: ["Operator", "Meaning", "SQL"], rows: [
          ["`$eq`", "equal (also the default)", "`=`"],
          ["`$ne`", "not equal", "`<>`"],
          ["`$gt` / `$gte`", "greater than / or equal", "`>` / `>=`"],
          ["`$lt` / `$lte`", "less than / or equal", "`<` / `<=`"],
          ["`$in`", "equal to any value in a list", "`IN (...)`"],
          ["`$nin`", "not in the list", "`NOT IN (...)`"]
        ] } },
        { code: `db.products.find({ price: { $gt: 100 } })                 // price > 100
db.products.find({ price: { $gte: 100, $lte: 500 } })     // 100 <= price <= 500
db.products.find({ category: { $in: ["pen", "book"] } })
db.products.find({ status: { $ne: "archived" } })

db.products.find({ price: 100 })            // same as { price: { $eq: 100 } }`, lang: "mongo" },
        { ul: [
          "Several operators on the **same field** in one object are combined with AND, as in the range example.",
          "`$ne` and `$nin` also match documents where the field is **missing**.",
          "`$ne`, `$nin` and `$not` usually cannot use an index well, because almost everything matches."
        ] },
        { note: "💡 Say it like this: 'Comparison operators go inside the field: { price: { $gt: 100 } }. I use $gt, $gte, $lt, $lte for ranges, $in for a list of values, and plain equality needs no operator.'", kind: "tip" }
      ]
    },

    {
      id: "logical-operators",
      q: "How do $and, $or, $nor and $not work? When do you need an explicit $and?",
      tldr: "$or matches if any condition is true, $nor if none is true, $not negates one operator expression, and $and requires all conditions. Fields in one filter are already ANDed, so you need an explicit $and only when you repeat the same field or combine several $or groups.",
      tags: ["queries", "operators"],
      seeAlso: ["mongodb-basic/comparison-operators"],
      a: [
        { code: `// Implicit AND: city is Pune AND age >= 18
db.users.find({ city: "Pune", age: { $gte: 18 } })

// $or: either condition
db.users.find({ $or: [ { city: "Pune" }, { age: { $lt: 18 } } ] })

// $nor: neither condition
db.users.find({ $nor: [ { status: "banned" }, { verified: false } ] })

// $not: negates an operator expression on ONE field
db.products.find({ price: { $not: { $gt: 100 } } })   // price <= 100 OR price missing`, lang: "mongo" },
        { p: "**When you need `$and` explicitly:**" },
        { code: `// Two $or groups. A JS object cannot hold the key "$or" twice, so wrap them in $and.
db.users.find({
  $and: [
    { $or: [ { city: "Pune" }, { city: "Mumbai" } ] },
    { $or: [ { plan: "pro" }, { trialDays: { $gt: 0 } } ] }
  ]
})`, lang: "mongo" },
        { ul: [
          "For many values of the **same field**, `$in` is shorter and faster than `$or`.",
          "`$or` can use indexes, but each branch needs its own usable index, otherwise MongoDB scans the collection."
        ] },
        { note: "💡 Say it like this: 'Fields in a filter are ANDed automatically. I use $or for alternatives, $nor for none of them, $not to negate one condition, and an explicit $and only when the same key would repeat, like two $or groups.'", kind: "tip" }
      ]
    },

    {
      id: "nested-fields",
      q: "How do you query fields inside embedded documents?",
      tldr: "Use dot notation in quotes, for example { \"address.city\": \"Pune\" }. Matching the whole embedded document with { address: { ... } } is different: it needs an exact match of every field and even the field order.",
      tags: ["queries", "embedded"],
      seeAlso: ["mongodb-basic/query-arrays"],
      a: [
        { code: `// Document: { name: "Asha", address: { city: "Pune", pin: "411001" } }

db.users.find({ "address.city": "Pune" })        // ✓ dot notation, matches
db.users.find({ "address.pin": { $regex: /^41/ } })  // operators work too

db.users.find({ address: { city: "Pune" } })                 // ✗ no match: pin is missing
db.users.find({ address: { pin: "411001", city: "Pune" } })  // ✗ no match: different order
db.users.find({ address: { city: "Pune", pin: "411001" } })  // ✓ exact, same order`, lang: "mongo" },
        { ul: [
          "Dot notation must be in **quotes**, because `address.city` is not a valid bare key in JavaScript.",
          "It works at any depth: `\"order.customer.address.city\"`.",
          "The same notation is used in updates (`$set: { \"address.city\": \"Mumbai\" }`), projections, sorts and indexes.",
          "You can index a nested field: `db.users.createIndex({ \"address.city\": 1 })`."
        ] },
        { note: "💡 Say it like this: 'For a field inside an embedded document I use dot notation in quotes, like address.city. Matching the whole sub-document needs an exact match including field order, so I almost never do that.'", kind: "tip" }
      ]
    },

    {
      id: "query-arrays",
      q: "How do you query arrays in MongoDB?",
      tldr: "A plain value matches if any element equals it, so { tags: \"red\" } finds documents whose tags array contains red. Use $all for 'contains all of these', $size for an exact length, and $elemMatch when several conditions must be true for the same element.",
      tags: ["queries", "arrays"],
      seeAlso: ["mongodb-intermediate/elem-match", "mongodb-intermediate/multikey-indexes"],
      a: [
        { code: `// { name: "Shirt", tags: ["red", "cotton", "sale"], sizes: [38, 40, 42] }

db.products.find({ tags: "red" })                      // contains "red"
db.products.find({ tags: { $all: ["red", "sale"] } })  // contains both, any order
db.products.find({ tags: ["red", "cotton", "sale"] })  // the exact array, same order
db.products.find({ tags: { $size: 3 } })               // exactly 3 elements
db.products.find({ "tags.0": "red" })                  // first element is "red"
db.products.find({ sizes: { $gt: 41 } })               // ANY element > 41`, lang: "mongo" },
        { p: "**Arrays of objects:**" },
        { code: `// { _id: 1, items: [ { product: "Pen", qty: 2 }, { product: "Book", qty: 10 } ] }

db.orders.find({ "items.product": "Pen" })   // any item is a Pen

// Is there ONE item that is a Pen with qty > 5?  Use $elemMatch.
db.orders.find({ items: { $elemMatch: { product: "Pen", qty: { $gt: 5 } } } })   // no match, correct

// Without $elemMatch the two conditions can be met by DIFFERENT items:
db.orders.find({ "items.product": "Pen", "items.qty": { $gt: 5 } })   // matches! (Book has qty 10)`, lang: "mongo" },
        { note: "`$size` only takes an exact number. For \"at least 3 elements\" use `{ \"tags.2\": { $exists: true } }`.", kind: "tip" },
        { note: "💡 Say it like this: 'Querying an array field with a value means contains. $all means contains all, $size is the exact length, and $elemMatch makes several conditions apply to the same element.'", kind: "tip" }
      ]
    },

    {
      id: "null-exists-type",
      q: "How do you find documents where a field is missing or null? What do $exists and $type do?",
      tldr: "{ field: null } matches both documents where the field is null and where it is missing. $exists: false finds only missing fields, $exists: true finds present ones (even if null), and $type matches by BSON type, so { field: { $type: \"null\" } } finds only real nulls.",
      tags: ["queries", "types"],
      seeAlso: ["mongodb-basic/flexible-schema"],
      a: [
        { code: `// { _id: 1, phone: "98200" }
// { _id: 2, phone: null }
// { _id: 3 }                       no phone field at all

db.users.find({ phone: null })                     // _id 2 and 3
db.users.find({ phone: { $exists: false } })       // _id 3 only
db.users.find({ phone: { $exists: true } })        // _id 1 and 2
db.users.find({ phone: { $type: "null" } })        // _id 2 only
db.users.find({ phone: { $ne: null } })            // _id 1 only (has a real value)`, lang: "mongo" },
        { p: "**$type** checks the BSON type, by alias or number:" },
        { code: `db.items.find({ price: { $type: "string" } })            // find bad data stored as text
db.items.find({ price: { $type: ["double", "int"] } })   // either type
db.items.find({ price: { $type: "number" } })            // any numeric type`, lang: "mongo" },
        { note: "`$type` is great for cleaning data after a schema change, for example finding prices that were saved as strings.", kind: "tip" },
        { note: "💡 Say it like this: 'Querying for null matches both null and missing fields. If I need only missing ones I use $exists: false, and if I need only real nulls I use $type: \"null\".'", kind: "tip" }
      ]
    },

    {
      id: "regex",
      q: "How do you search with a pattern (like SQL LIKE) in MongoDB?",
      tldr: "Use a regular expression: { name: /^ash/i } or { name: { $regex: \"^ash\", $options: \"i\" } }. A prefix regex anchored with ^ and case-sensitive can use an index; a pattern like /ash/ or a case-insensitive one has to check every index key or document.",
      tags: ["queries", "performance"],
      seeAlso: ["mongodb-intermediate/text-search", "mongodb-advanced/collation"],
      a: [
        { table: { head: ["SQL", "MongoDB"], rows: [
          ["`LIKE 'ash%'`", "`{ name: /^ash/ }`"],
          ["`LIKE '%ash'`", "`{ name: /ash$/ }`"],
          ["`LIKE '%ash%'`", "`{ name: /ash/ }`"],
          ["case-insensitive", "`{ name: /ash/i }`"]
        ] } },
        { code: `db.users.find({ name: /^ash/ })                              // starts with "ash"
db.users.find({ name: { $regex: "^ash", $options: "i" } })   // same, ignoring case
db.users.find({ email: /@example\\.com$/ })                    // ends with @example.com`, lang: "mongo" },
        { p: "**Performance:**" },
        { ul: [
          "`/^ash/` (anchored, case-sensitive) can use an index as a range scan. This is fast.",
          "`/ash/` or `/^ash/i` cannot narrow the index range, so MongoDB checks every key. On big collections that is slow.",
          "For case-insensitive lookups, use an index with a **collation** (strength 2) or store a lower-case copy of the field.",
          "For searching words in text, use a **text index** or **Atlas Search** instead of regex."
        ] },
        { note: "Never build a regex from raw user input. Escape special characters, or a user can send a pattern like `(a+)+$` that takes forever to run.", kind: "warn" },
        { note: "💡 Say it like this: 'LIKE becomes a regex in MongoDB. An anchored, case-sensitive prefix like /^ash/ uses the index; contains-style or case-insensitive regexes scan, so for real search I use a text index or Atlas Search.'", kind: "tip" }
      ]
    },

    {
      id: "projection",
      q: "What is projection? How do you return only some fields?",
      tldr: "Projection is the second argument to find. It chooses which fields come back: 1 to include, 0 to exclude. You cannot mix include and exclude in one projection, except for _id, which is included by default and can be turned off with _id: 0.",
      tags: ["queries"],
      seeAlso: ["mongodb-intermediate/covered-queries"],
      a: [
        { code: `db.users.find({}, { name: 1, email: 1 })           // name, email and _id
db.users.find({}, { name: 1, email: 1, _id: 0 })   // name and email only
db.users.find({}, { password: 0, otp: 0 })         // everything except these

db.users.find({}, { name: 1, password: 0 })        // ✗ error: cannot mix include and exclude`, lang: "mongo" },
        { p: "**Projecting nested fields and arrays:**" },
        { code: `db.users.find({}, { "address.city": 1 })            // only city from address
db.posts.find({}, { title: 1, comments: { $slice: 3 } })      // first 3 comments
db.posts.find({}, { title: 1, comments: { $slice: -3 } })     // last 3 comments

// Computed fields are allowed in find() projections since MongoDB 4.4
db.users.find({}, { name: 1, nameUpper: { $toUpper: "$name" } })`, lang: "mongo" },
        { ul: [
          "Projection sends **less data over the network** and uses less memory in your app.",
          "If the index contains every field you ask for, MongoDB can answer from the index alone (a **covered query**).",
          "It is also a simple security habit: never send fields like `passwordHash` to the client."
        ] },
        { note: "💡 Say it like this: 'Projection is the second argument of find: 1 includes a field, 0 excludes it, and I cannot mix both except for _id. It cuts network traffic and can let the query be covered by an index.'", kind: "tip" }
      ]
    },

    {
      id: "sort-limit-skip",
      q: "How do sort, limit and skip work? In which order are they applied?",
      tldr: "sort orders results (1 ascending, -1 descending), skip jumps over N documents and limit returns at most N. Whatever order you chain them in, MongoDB always applies sort first, then skip, then limit.",
      tags: ["queries", "pagination"],
      seeAlso: ["mongodb-intermediate/pagination"],
      a: [
        { code: `db.products.find().sort({ price: -1 })                  // most expensive first
db.products.find().sort({ category: 1, price: -1 })     // by category, then price desc
db.products.find().sort({ price: -1 }).limit(5)         // top 5

// Page 3 with 10 items per page
db.products.find().sort({ _id: 1 }).skip(20).limit(10)

// Same result: the chain order does not matter
db.products.find().limit(10).skip(20).sort({ _id: 1 })`, lang: "mongo" },
        { ul: [
          "Always **sort on a unique field** (or add `_id` as a tie-breaker) when paging, or the same document can show on two pages.",
          "A sort that has no matching index is done **in memory** with a 100 MB budget. Beyond that, MongoDB 6.0+ spills to temporary files on disk (slow), and older versions fail with an error.",
          "`skip(n)` still walks over the n skipped documents, so very large skips get **slower and slower**."
        ] },
        { note: "For deep pagination, use **range (keyset) pagination**: remember the last value and ask for `{ _id: { $gt: lastId } }` with `limit`.", kind: "tip" },
        { note: "💡 Say it like this: 'sort, skip and limit always run in that order, no matter how I chain them. For paging I sort on a unique, indexed field, and for deep pages I prefer range pagination over a big skip.'", kind: "tip" }
      ]
    },

    {
      id: "count-distinct",
      q: "How do you count documents and get distinct values?",
      tldr: "countDocuments(filter) gives an exact count of matching documents. estimatedDocumentCount() is a very fast count of the whole collection from metadata. distinct(field, filter) returns the unique values of a field as an array.",
      tags: ["queries"],
      a: [
        { code: `db.orders.countDocuments({ status: "shipped" })   // exact, runs a query
db.orders.countDocuments({})                       // exact count of all

db.orders.estimatedDocumentCount()                 // fast, uses collection metadata

db.orders.distinct("status")                       // [ "new", "paid", "shipped" ]
db.orders.distinct("city", { status: "paid" })     // with a filter`, lang: "mongo" },
        { table: { head: ["Method", "Exact?", "Filter?", "Speed"], rows: [
          ["`countDocuments`", "Yes", "Yes", "Depends on the query and indexes"],
          ["`estimatedDocumentCount`", "Usually; may be off after an unclean shutdown or on sharded clusters with orphans", "No", "Instant"],
          ["`count()` (old)", "Deprecated in drivers", "Yes", "—"]
        ] } },
        { ul: [
          "`distinct` returns its result as a single document, so the list of values must fit in **16 MB**. For huge lists, use `$group` in an aggregation.",
          "Counting with a filter is fast when the filter field is indexed."
        ] },
        { note: "💡 Say it like this: 'countDocuments gives an exact count for a filter, estimatedDocumentCount gives an instant total for the whole collection, and distinct returns unique values of a field.'", kind: "tip" }
      ]
    },

    {
      id: "update-operators",
      q: "What are the update operators such as $set, $unset, $inc and $push?",
      tldr: "Update operators change parts of a document instead of replacing it: $set sets a field, $unset removes one, $inc adds a number, $push adds to an array, $pull removes from an array, and $addToSet adds only if the value is not there yet.",
      tags: ["crud", "operators"],
      seeAlso: ["mongodb-basic/update-vs-replace", "mongodb-intermediate/array-updates"],
      a: [
        { table: { head: ["Operator", "What it does"], rows: [
          ["`$set`", "Set a field (creates it if missing)"],
          ["`$unset`", "Remove a field"],
          ["`$inc`", "Add (or subtract) a number"],
          ["`$mul`", "Multiply a number"],
          ["`$rename`", "Rename a field"],
          ["`$min` / `$max`", "Update only if the new value is smaller / bigger"],
          ["`$currentDate`", "Set a field to the current date"],
          ["`$push`", "Add an element to an array"],
          ["`$addToSet`", "Add to an array only if not already present"],
          ["`$pull`", "Remove matching elements from an array"],
          ["`$pop`", "Remove the first (-1) or last (1) element"]
        ] } },
        { code: `db.users.updateOne(
  { _id: 1 },
  {
    $set:   { city: "Mumbai", "address.pin": "400001" },
    $unset: { tempToken: "" },
    $inc:   { loginCount: 1 },
    $push:  { history: "moved" },
    $currentDate: { updatedAt: true }
  }
)
// { acknowledged: true, matchedCount: 1, modifiedCount: 1 }

db.users.updateOne({ _id: 1 }, { $addToSet: { roles: "admin" } })  // no duplicates
db.users.updateOne({ _id: 1 }, { $pull: { roles: "guest" } })`, lang: "mongo" },
        { ul: [
          "All changes in one update on one document are **atomic**: other readers see all of them or none.",
          "`$inc` is safe under concurrency: two clients doing `$inc: { stock: -1 }` never lose an update, unlike read-modify-write in the app.",
          "You cannot change the same field with two operators in one update (a conflict error)."
        ] },
        { note: "💡 Say it like this: 'Update operators change only the parts I name: $set and $unset for fields, $inc for counters, $push, $addToSet and $pull for arrays. Everything in one update to one document is atomic.'", kind: "tip" }
      ]
    },

    {
      id: "update-vs-replace",
      q: "What is the difference between updateOne, updateMany and replaceOne?",
      tldr: "updateOne changes the first matching document and updateMany changes every match, both using update operators like $set. replaceOne swaps the whole document (except _id) for a new one, so any field you do not include is lost.",
      tags: ["crud"],
      seeAlso: ["mongodb-basic/update-operators", "mongodb-basic/upsert"],
      a: [
        { code: `// updateOne: first match only
db.users.updateOne({ city: "Pune" }, { $set: { region: "West" } })

// updateMany: every match
db.users.updateMany({ city: "Pune" }, { $set: { region: "West" } })
// { matchedCount: 120, modifiedCount: 118 }   2 already had region "West"

// replaceOne: the new document REPLACES the old one
db.users.replaceOne({ _id: 1 }, { name: "Asha", city: "Mumbai" })
// all other fields of _id 1 (email, age, ...) are now gone`, lang: "mongo" },
        { table: { head: ["Method", "Matches", "Second argument"], rows: [
          ["`updateOne`", "First match", "Update operators (or a pipeline)"],
          ["`updateMany`", "All matches", "Update operators (or a pipeline)"],
          ["`replaceOne`", "First match", "A full document, **no** operators"]
        ] } },
        { ul: [
          "`matchedCount` is how many matched; `modifiedCount` is how many really changed.",
          "Passing a plain document (no `$set`) to `updateOne` is an **error** in mongosh and modern drivers. That protects you from replacing by mistake.",
          "`updateMany` is atomic **per document**, not for the whole set. If it fails half-way, some documents are already updated."
        ] },
        { note: "💡 Say it like this: 'updateOne and updateMany modify fields with operators like $set, for one or all matches. replaceOne swaps the whole document, so anything I leave out is deleted.'", kind: "tip" }
      ]
    },

    {
      id: "upsert",
      q: "What is an upsert?",
      tldr: "Upsert means update or insert. With { upsert: true }, if a document matches the filter it is updated, and if nothing matches a new document is inserted, built from the filter's equality fields plus the update.",
      tags: ["crud"],
      seeAlso: ["mongodb-basic/update-vs-replace"],
      a: [
        { code: `db.stats.updateOne(
  { page: "/home", day: "2026-11-16" },    // filter
  { $inc: { views: 1 } },                  // update
  { upsert: true }
)
// First call: nothing matches, so it INSERTS
//   { _id: ..., page: "/home", day: "2026-11-16", views: 1 }
// Later calls: it matches, so it UPDATES views to 2, 3, ...`, lang: "mongo" },
        { p: "**$setOnInsert** sets fields only when a new document is created:" },
        { code: `db.users.updateOne(
  { email: "asha@example.com" },
  {
    $set:         { lastLogin: new Date() },        // every time
    $setOnInsert: { createdAt: new Date(), plan: "free" }   // only on insert
  },
  { upsert: true }
)`, lang: "mongo" },
        { ul: [
          "Upsert works with `updateOne`, `updateMany`, `replaceOne` and `findOneAndUpdate`.",
          "The result has `upsertedId` when a document was inserted.",
          "Two clients can upsert at the same moment and both insert. Put a **unique index** on the filter fields so the second one fails (and retry it) instead of creating a duplicate."
        ] },
        { note: "💡 Say it like this: 'An upsert updates the document if it exists and inserts it if it does not, in one command. I use $setOnInsert for fields that should only be set on creation, and a unique index to avoid duplicates under concurrency.'", kind: "tip" }
      ]
    },

    {
      id: "find-one-and-update",
      q: "What does findOneAndUpdate do, and how is it different from updateOne?",
      tldr: "findOneAndUpdate updates one document atomically and returns the document itself, either before or after the change. updateOne only returns counts. Use it when you need the result, for example to take the next job from a queue or get the new value of a counter.",
      tags: ["crud", "concurrency"],
      seeAlso: ["mongodb-basic/update-operators"],
      a: [
        { code: `// A sequence counter: increment and read the new value in one atomic step
db.counters.findOneAndUpdate(
  { _id: "invoice" },
  { $inc: { seq: 1 } },
  { upsert: true, returnDocument: "after" }
)
// { _id: "invoice", seq: 1043 }

// Claim the oldest pending job; no two workers can get the same one
db.jobs.findOneAndUpdate(
  { status: "pending" },
  { $set: { status: "running", startedAt: new Date() } },
  { sort: { createdAt: 1 }, returnDocument: "after" }
)`, lang: "mongo" },
        { table: { head: ["", "updateOne", "findOneAndUpdate"], rows: [
          ["Returns", "matchedCount, modifiedCount", "The document"],
          ["Sort to choose which one", "Supports `sort` only from MongoDB 8.0", "Yes, `sort` option"],
          ["Projection", "No", "Yes"],
          ["Atomic", "Yes", "Yes"]
        ] } },
        { ul: [
          "`returnDocument: \"before\"` (default) returns the old version, `\"after\"` returns the new one.",
          "Related methods: `findOneAndReplace` and `findOneAndDelete`.",
          "It is atomic: finding and changing happen as one step, so there is no race between read and write."
        ] },
        { note: "💡 Say it like this: 'findOneAndUpdate finds, updates and returns one document in a single atomic step. I use it for counters and job queues, where I need the updated document back without a race.'", kind: "tip" }
      ]
    },

    {
      id: "delete",
      q: "How do you delete documents, collections and databases?",
      tldr: "deleteOne removes the first matching document, deleteMany removes all matches, drop() removes a whole collection with its indexes, and dropDatabase() removes the current database. deleteMany({}) empties a collection but keeps its indexes.",
      tags: ["crud"],
      seeAlso: ["mongodb-intermediate/ttl-indexes"],
      a: [
        { code: `db.users.deleteOne({ _id: 1 })                  // { acknowledged: true, deletedCount: 1 }
db.users.deleteMany({ status: "inactive" })      // every match
db.users.deleteMany({})                          // ALL documents, indexes stay

db.users.drop()                                  // the collection + its indexes
db.dropDatabase()                                // the current database`, lang: "mongo" },
        { ul: [
          "`drop()` is much faster than `deleteMany({})` on a big collection, because it does not delete document by document.",
          "`findOneAndDelete` removes one document and returns it, handy for a queue.",
          "To delete old data automatically, use a **TTL index** instead of a cron job.",
          "Many apps do a **soft delete**: `$set: { deletedAt: new Date() }` and filter those out, so data can be restored."
        ] },
        { note: "Always run the same filter with `find()` or `countDocuments()` first. An empty or wrong filter in `deleteMany` deletes everything.", kind: "warn" },
        { note: "💡 Say it like this: 'deleteOne and deleteMany remove documents by filter, drop removes the whole collection with its indexes. I check the filter with a count first, and for automatic expiry I use a TTL index.'", kind: "tip" }
      ]
    },

    {
      id: "flexible-schema",
      q: "Is MongoDB schemaless? What does 'flexible schema' really mean?",
      tldr: "Not really. The database does not force a schema by default, so documents in one collection can have different fields. But your application still expects a shape, so in practice you design a schema and can enforce it with JSON Schema validation.",
      tags: ["design", "schema"],
      seeAlso: ["mongodb-intermediate/schema-validation", "mongodb-advanced/schema-patterns"],
      a: [
        { code: `// Both are valid in the same collection
db.products.insertOne({ name: "T-shirt", size: "M", color: "red" })
db.products.insertOne({ name: "Laptop",  ram: "16GB", cpu: "i7", warranty: 2 })`, lang: "mongo" },
        { p: "**Why flexible is useful:**" },
        { ul: [
          "Products, events or forms with **different attributes** fit naturally.",
          "Adding a new field needs **no migration**: new documents simply have it.",
          "Changes can be rolled out step by step, and the app handles old and new shapes for a while."
        ] },
        { p: "**The risks:**" },
        { ul: [
          "Typos create silent new fields (`emial` instead of `email`).",
          "Wrong types sneak in (a price stored as the string `\"10\"`).",
          "Code has to cope with missing fields."
        ] },
        { p: "So teams use **schema validation** on the server, typed models in the app (C# classes, Mongoose schemas), and add a `schemaVersion` field when the shape changes." },
        { note: "💡 Say it like this: 'MongoDB has a flexible schema, not no schema. The database does not force one shape, which helps with varied data and easy changes, but I still design the schema and enforce the important rules with JSON Schema validation.'", kind: "tip" }
      ]
    },

    {
      id: "embed-vs-reference",
      q: "What is the difference between embedding and referencing? When do you use each?",
      tldr: "Embedding puts related data inside the same document, so it is read in one query and updated atomically. Referencing stores an _id that points to a document in another collection, like a foreign key. Embed what is read together and bounded in size; reference what is large, shared, or grows without limit.",
      tags: ["design", "schema"],
      seeAlso: ["mongodb-intermediate/one-to-many", "mongodb-intermediate/lookup", "mongodb-advanced/schema-patterns"],
      a: [
        { code: `// EMBEDDED: the address lives inside the user
{ _id: 1, name: "Asha", address: { city: "Pune", pin: "411001" } }

// REFERENCED: orders point to the user by id
// users:  { _id: 1, name: "Asha" }
// orders: { _id: 501, userId: 1, total: 950 }
db.orders.find({ userId: 1 })`, lang: "mongo" },
        { table: { head: ["Embed when...", "Reference when..."], rows: [
          ["Data is read **together** (user + address)", "Data is often read **on its own**"],
          ["It is \"owned\" by the parent (order items)", "It is **shared** by many parents (a product in many orders)"],
          ["The list is **small and bounded** (a few addresses)", "The list can **grow without limit** (comments, logs)"],
          ["You want **atomic** updates of both", "The child is large or changes very often"]
        ] } },
        { ul: [
          "The golden rule of MongoDB design: **data that is accessed together should be stored together.**",
          "Embedding many-to-many data copies it. That is fine for values that rarely change (a product name on an old order), but every copy must be updated if it changes.",
          "A document can never be bigger than **16 MB**, so unbounded arrays must be referenced."
        ] },
        { note: "💡 Say it like this: 'I embed data that is read together, owned by the parent and bounded in size, so one query gets it all and updates are atomic. I reference data that is shared, large, or grows without limit, and join with $lookup or a second query.'", kind: "tip" }
      ]
    },

    {
      id: "indexes-intro",
      q: "What is an index in MongoDB and why do you need one?",
      tldr: "An index is a sorted structure (a B-tree) on one or more fields that lets MongoDB find documents without reading the whole collection. Without an index, a query does a collection scan. Indexes make reads fast but cost disk, memory and some write speed.",
      tags: ["indexes", "performance"],
      seeAlso: ["mongodb-intermediate/compound-indexes", "mongodb-intermediate/explain"],
      a: [
        { code: `db.users.createIndex({ email: 1 })                    // ascending
db.users.createIndex({ email: 1 }, { unique: true })  // no duplicate emails
db.orders.createIndex({ createdAt: -1 })              // descending

db.users.getIndexes()          // list indexes
db.users.dropIndex("email_1")  // drop by name`, lang: "mongo" },
        { p: "**With and without an index:**" },
        { table: { head: ["", "No index (COLLSCAN)", "With index (IXSCAN)"], rows: [
          ["How", "Reads every document", "Walks the B-tree to the matches"],
          ["1 million docs, 1 match", "Reads 1,000,000", "Reads about 1"],
          ["Sort", "In memory", "Can read already in order"]
        ] } },
        { ul: [
          "Every collection has an index on `_id` automatically.",
          "Each index slows writes a little, because inserts and updates must change it too.",
          "Indexes work best when they **fit in RAM**.",
          "Check if a query uses an index with `.explain(\"executionStats\")`: look for `IXSCAN` instead of `COLLSCAN`."
        ] },
        { note: "💡 Say it like this: 'An index is a B-tree on chosen fields so MongoDB can jump to matching documents instead of scanning the whole collection. I index fields I filter and sort on, and I check with explain that the query uses it.'", kind: "tip" }
      ]
    },

    {
      id: "aggregation-intro",
      q: "What is the aggregation pipeline?",
      tldr: "The aggregation pipeline is MongoDB's way to transform and analyse data. Documents flow through a list of stages, such as $match to filter, $group to summarise and $sort to order, and each stage passes its output to the next, like a pipe in the shell or a LINQ chain.",
      tags: ["aggregation"],
      seeAlso: ["mongodb-intermediate/aggregation-stages", "mongodb-intermediate/group-accumulators"],
      a: [
        { code: `// Total sales per city for paid orders, biggest first
db.orders.aggregate([
  { $match: { status: "paid" } },                                  // like WHERE
  { $group: { _id: "$city", total: { $sum: "$amount" }, orders: { $sum: 1 } } },  // like GROUP BY
  { $sort:  { total: -1 } },                                       // like ORDER BY
  { $limit: 5 }
])
// [ { _id: "Pune", total: 125000, orders: 340 }, ... ]`, lang: "mongo" },
        { table: { head: ["SQL", "Aggregation stage"], rows: [
          ["`WHERE`", "`$match`"],
          ["`GROUP BY`", "`$group`"],
          ["`HAVING`", "`$match` after `$group`"],
          ["`SELECT` columns", "`$project` / `$addFields`"],
          ["`ORDER BY`", "`$sort`"],
          ["`LIMIT`", "`$limit`"],
          ["`JOIN`", "`$lookup`"]
        ] } },
        { ul: [
          "`\"$city\"` with a dollar sign means \"the value of the field city\".",
          "Put `$match` **first** so fewer documents flow on, and so it can use an index.",
          "The pipeline runs **on the server**, so only the result is sent to your app."
        ] },
        { note: "💡 Say it like this: 'The aggregation pipeline is a list of stages that documents flow through, like a LINQ chain: $match filters, $group summarises, $sort orders, $project shapes. It runs on the server and replaces most GROUP BY and JOIN work from SQL.'", kind: "tip" }
      ]
    },

    {
      id: "document-size-limit",
      q: "What is the maximum document size? How do you store large files?",
      tldr: "A single BSON document can be at most 16 MB, and nesting is limited to 100 levels. That limit stops one document from using too much RAM or bandwidth. For larger files, use GridFS, or better, put the file in object storage like S3 and keep only its URL in MongoDB.",
      tags: ["limits", "design"],
      seeAlso: ["mongodb-advanced/anti-patterns"],
      a: [
        { ul: [
          "**16 MB** per document, including field names.",
          "**100 levels** of nested documents and arrays at most.",
          "If a document keeps growing (an ever-longer array), you are likely to hit the limit, and performance suffers long before that."
        ] },
        { p: "**GridFS** splits a big file into chunks (255 KB by default) stored in two collections:" },
        { code: `fs.files    ->  one document per file: filename, length, uploadDate, metadata
fs.chunks   ->  many documents per file: { files_id, n, data }`, lang: "text" },
        { code: `mongofiles --db=media put intro.mp4     # upload a file with the CLI tool
mongofiles --db=media get intro.mp4     # download it`, lang: "bash" },
        { ul: [
          "GridFS is useful when you want files in the same backups and replication as the data.",
          "For most web apps, **object storage** (S3, Azure Blob) plus a URL in the document is cheaper and faster."
        ] },
        { note: "💡 Say it like this: 'A MongoDB document is limited to 16 MB. If I hit that I am usually modelling it wrong, for example an unbounded array. For large files I use GridFS, or more often S3 or blob storage with the URL saved in the document.'", kind: "tip" }
      ]
    },

    {
      id: "replication-intro",
      q: "What is a replica set?",
      tldr: "A replica set is a group of MongoDB servers that keep the same data: one primary takes all writes, and secondaries copy its changes. If the primary fails, the others elect a new primary automatically, usually within seconds. This gives high availability and data redundancy.",
      tags: ["replication", "availability"],
      seeAlso: ["mongodb-intermediate/replica-set-elections", "mongodb-intermediate/oplog"],
      a: [
        { code: `            writes + reads
   App  ───────────────►  PRIMARY
                             │  replicates (oplog)
                 ┌───────────┴───────────┐
                 ▼                       ▼
             SECONDARY               SECONDARY
          (copy, can serve reads)  (copy, can serve reads)

   Primary goes down  ->  secondaries hold an election  ->  one becomes PRIMARY`, lang: "text" },
        { ul: [
          "The usual size is **3 members** (an odd number, so a majority can always be found).",
          "Writes go to the **primary**. The primary writes each change to its **oplog**, and secondaries replay it.",
          "By default reads go to the primary too. You can read from secondaries with a **read preference**, but that data may be a little behind.",
          "Drivers find the new primary on their own after a failover; with **retryable writes** a failed write is retried once.",
          "A replica set is **required** for transactions and change streams. MongoDB Atlas always runs one."
        ] },
        { note: "Replication is for **availability**, not for scaling writes. To spread writes over more machines you need **sharding**.", kind: "tip" },
        { note: "💡 Say it like this: 'A replica set is a primary and usually two secondaries with copies of the data. All writes go to the primary and are replicated through the oplog. If the primary dies, the members elect a new one automatically.'", kind: "tip" }
      ]
    },

    {
      id: "when-to-use",
      q: "When should you choose MongoDB, and when is a relational database a better fit?",
      tldr: "Choose MongoDB when data is naturally document-shaped, the schema changes often, and you read whole objects at once or need to scale out. Choose a relational database when the data is highly connected with many joins, or the business depends on complex multi-table transactions and strict constraints.",
      tags: ["design", "fundamentals"],
      seeAlso: ["mongodb-basic/mongodb-vs-sql"],
      a: [
        { table: { head: ["Good fit for MongoDB", "Better in a relational database"], rows: [
          ["Product catalogue with different attributes per product", "Accounting ledgers, double-entry bookkeeping"],
          ["User profiles, settings, carts", "Many-to-many data queried from every side"],
          ["Content and CMS data", "Heavy ad-hoc reporting with many joins"],
          ["IoT, logs, events, time series", "Strict foreign keys and constraints everywhere"],
          ["Mobile and real-time apps", "Teams with deep SQL skills and SQL tools"],
          ["Huge data that must be sharded", ""]
        ] } },
        { ul: [
          "MongoDB **does** support ACID transactions, joins (`$lookup`) and schema validation. The question is what the design is **optimised** for.",
          "Many systems use both: SQL for billing, MongoDB for the catalogue and user activity (\"polyglot persistence\")."
        ] },
        { note: "💡 Say it like this: 'I choose MongoDB when the data is document-shaped, read as whole objects, changes shape often, or needs to scale out. If the data is very relational with lots of joins and cross-table transactions, a SQL database is usually simpler.'", kind: "tip" }
      ]
    }

  ]
});
