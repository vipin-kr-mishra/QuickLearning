/* MongoDB - Intermediate. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "mongodb-intermediate",
  topic: "MongoDB",
  level: "Intermediate",
  short: "MongoDB Intermediate",
  accent: "green",
  desc: "The next step after CRUD: the aggregation pipeline in depth, index types and explain plans, array updates, schema validation and design, plus how replica sets, write concern, read concern and read preference really work.",
  questions: [

    {
      id: "aggregation-stages",
      q: "Which aggregation stages are used most often, and what does each one do?",
      tldr: "$match filters, $project and $addFields (or $set) shape documents, $group summarises, $sort, $skip and $limit order and cut, $unwind flattens arrays, $lookup joins another collection, and $count, $facet, $out and $merge handle counting, multi-results and saving output.",
      tags: ["aggregation"],
      seeAlso: ["mongodb-basic/aggregation-intro", "mongodb-intermediate/pipeline-optimization"],
      a: [
        { table: { head: ["Stage", "What it does", "SQL feel"], rows: [
          ["`$match`", "Keep documents that match a filter", "`WHERE` / `HAVING`"],
          ["`$project`", "Include, exclude or compute fields", "`SELECT` list"],
          ["`$addFields` / `$set`", "Add or overwrite fields, keep the rest", "computed column"],
          ["`$unset`", "Remove fields", ""],
          ["`$group`", "Group by a key and run accumulators", "`GROUP BY`"],
          ["`$sort`, `$skip`, `$limit`", "Order and page", "`ORDER BY`, `OFFSET`, `LIMIT`"],
          ["`$unwind`", "One output document per array element", "un-nesting"],
          ["`$lookup`", "Join documents from another collection", "`LEFT OUTER JOIN`"],
          ["`$count`", "Count documents at this point", "`COUNT(*)`"],
          ["`$facet`", "Run several sub-pipelines on the same input", "several queries at once"],
          ["`$bucket`", "Group into ranges", "`CASE` ranges + `GROUP BY`"],
          ["`$replaceRoot`", "Promote a sub-document to the top", ""],
          ["`$out` / `$merge`", "Write the results to a collection", "`INSERT INTO ... SELECT`"]
        ] } },
        { code: `// Top 3 customers by spend in 2026, with their name
db.orders.aggregate([
  { $match: { createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2027-01-01") } } },
  { $group: { _id: "$customerId", spend: { $sum: "$total" } } },
  { $sort:  { spend: -1 } },
  { $limit: 3 },
  { $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "customer" } },
  { $set:   { name: { $first: "$customer.name" } } },
  { $project: { _id: 0, name: 1, spend: 1 } }
])`, lang: "mongo" },
        { ul: [
          "A stage can appear many times, in any order. The order is important for correctness **and** speed.",
          "Inside a stage, `\"$field\"` reads a field value and `\"$$var\"` reads a variable such as `$$ROOT` (the whole document)."
        ] },
        { note: "💡 Say it like this: 'The core stages are $match to filter, $group to summarise, $project or $set to shape, $sort and $limit to order and cut, $unwind for arrays and $lookup for joins. I put $match and $limit as early as I can.'", kind: "tip" }
      ]
    },

    {
      id: "group-accumulators",
      q: "How does $group work? Which accumulators can you use?",
      tldr: "$group collects documents with the same _id (the group key) into one output document and computes values with accumulators such as $sum, $avg, $min, $max, $first, $last, $push and $addToSet. Use _id: null to aggregate the whole collection into one result.",
      tags: ["aggregation"],
      seeAlso: ["mongodb-intermediate/aggregation-stages"],
      a: [
        { code: `db.orders.aggregate([
  { $group: {
      _id: { city: "$city", status: "$status" },   // group by two fields
      orders:  { $sum: 1 },                         // count
      revenue: { $sum: "$total" },
      avgOrder:{ $avg: "$total" },
      biggest: { $max: "$total" },
      customers: { $addToSet: "$customerId" }       // unique list
  } }
])

// One summary for the whole collection
db.orders.aggregate([ { $group: { _id: null, revenue: { $sum: "$total" } } } ])`, lang: "mongo" },
        { table: { head: ["Accumulator", "Result"], rows: [
          ["`$sum`", "Total (use `1` to count)"],
          ["`$avg`, `$min`, `$max`", "Average, smallest, biggest"],
          ["`$first`, `$last`", "From the first / last document in the group (sort first!)"],
          ["`$push`", "Array of all values (duplicates kept)"],
          ["`$addToSet`", "Array of unique values"],
          ["`$count`", "Count of documents (`{ $count: {} }`, since 5.0)"],
          ["`$top`, `$bottom`, `$topN`, `$maxN`", "Best N by a sort order (since 5.2)"]
        ] } },
        { ul: [
          "Grouped output has **only** `_id` and your accumulated fields. Other fields are dropped.",
          "`$first` and `$last` are meaningful only after a `$sort`.",
          "`$group` uses up to 100 MB of RAM; bigger groups spill to disk (default since 6.0), which is slower.",
          "`$push` can build a huge array. The output document must still fit in 16 MB."
        ] },
        { note: "💡 Say it like this: '$group is GROUP BY: _id is the key, which can be one field, several fields, or null for everything, and accumulators like $sum, $avg, $max and $push compute the values per group.'", kind: "tip" }
      ]
    },

    {
      id: "unwind",
      q: "What does $unwind do? When do you need it?",
      tldr: "$unwind turns one document with an array into one document per array element, each with a single value in that field. You need it to group, sort or join by individual array elements. By default it drops documents whose array is empty or missing, unless you set preserveNullAndEmptyArrays.",
      tags: ["aggregation", "arrays"],
      seeAlso: ["mongodb-intermediate/lookup"],
      a: [
        { code: `// { _id: 1, customer: "Asha", items: [ { sku: "PEN", qty: 2 }, { sku: "BOOK", qty: 1 } ] }

db.orders.aggregate([ { $unwind: "$items" } ])
// { _id: 1, customer: "Asha", items: { sku: "PEN",  qty: 2 } }
// { _id: 1, customer: "Asha", items: { sku: "BOOK", qty: 1 } }

// Best-selling products across all orders
db.orders.aggregate([
  { $unwind: "$items" },
  { $group:  { _id: "$items.sku", sold: { $sum: "$items.qty" } } },
  { $sort:   { sold: -1 } }
])`, lang: "mongo" },
        { code: `{ $unwind: {
    path: "$items",
    preserveNullAndEmptyArrays: true,   // keep orders with no items (items becomes missing)
    includeArrayIndex: "position"       // add the element's index as a field
} }`, lang: "mongo" },
        { ul: [
          "One document with 1,000 elements becomes 1,000 documents, so `$match` **before** `$unwind` to keep the pipeline small.",
          "If you only need to filter or reshape the array, array expressions like `$filter`, `$map` and `$reduce` avoid unwinding at all.",
          "A common pair: `$lookup` returns an array, then `$unwind` turns a one-element array into a single object."
        ] },
        { note: "💡 Say it like this: '$unwind flattens an array: one output document per element. I use it to group or join by array items. Empty arrays are dropped unless I set preserveNullAndEmptyArrays, and I filter first because it multiplies documents.'", kind: "tip" }
      ]
    },

    {
      id: "lookup",
      q: "How do you join collections with $lookup?",
      tldr: "$lookup does a left outer join: for each input document it finds matching documents in another collection and puts them in an array field. The simple form matches localField to foreignField; the pipeline form lets you add extra conditions, projections and limits on the joined side.",
      tags: ["aggregation", "joins"],
      seeAlso: ["mongodb-basic/embed-vs-reference", "mongodb-intermediate/unwind"],
      a: [
        { code: `// Simple equality join
db.orders.aggregate([
  { $lookup: {
      from: "customers",          // the other collection
      localField: "customerId",   // field in orders
      foreignField: "_id",        // field in customers
      as: "customer"              // output array field
  } },
  { $unwind: "$customer" }        // array of one -> object
])`, lang: "mongo" },
        { code: `// Pipeline form: only the last 3 paid orders of each customer
db.customers.aggregate([
  { $lookup: {
      from: "orders",
      localField: "_id",
      foreignField: "customerId",          // concise form with both, since 5.0
      pipeline: [
        { $match: { status: "paid" } },
        { $sort:  { createdAt: -1 } },
        { $limit: 3 },
        { $project: { total: 1, createdAt: 1 } }
      ],
      as: "recentOrders"
  } }
])`, lang: "mongo" },
        { ul: [
          "Customers with no orders still appear, with an **empty array**. That is the \"left outer\" part.",
          "**Index the `foreignField`**. Without it, every input document scans the other collection.",
          "Use `let` and `$expr` in the pipeline form for non-equality conditions (dates, ranges).",
          "`$lookup` into a sharded collection is supported from MongoDB 5.1."
        ] },
        { note: "If you `$lookup` on every request for your main screen, your schema is probably too normalised. Consider embedding or copying the few fields you need (the **extended reference** pattern).", kind: "tip" },
        { note: "💡 Say it like this: '$lookup is a left outer join that puts matches into an array. I use the simple form for equality, the pipeline form to filter or limit the joined side, and I always index the foreign field. If I need it on every read, I rethink the schema.'", kind: "tip" }
      ]
    },

    {
      id: "facet",
      q: "What is $facet and when is it useful?",
      tldr: "$facet runs several sub-pipelines on the same set of input documents in one aggregation and returns all their results in one document. It is ideal for a search page that needs the results, the total count and filter counts (by brand, by price range) in a single round trip.",
      tags: ["aggregation"],
      seeAlso: ["mongodb-intermediate/pagination"],
      a: [
        { code: `db.products.aggregate([
  { $match: { category: "phones", price: { $lte: 30000 } } },
  { $facet: {
      results:  [ { $sort: { price: 1 } }, { $skip: 0 }, { $limit: 20 },
                  { $project: { name: 1, price: 1 } } ],
      total:    [ { $count: "count" } ],
      byBrand:  [ { $group: { _id: "$brand", n: { $sum: 1 } } }, { $sort: { n: -1 } } ],
      byPrice:  [ { $bucket: { groupBy: "$price", boundaries: [0, 10000, 20000, 30001],
                               default: "other" } } ]
  } }
])
// { results: [...20 items], total: [ { count: 143 } ], byBrand: [...], byPrice: [...] }`, lang: "mongo" },
        { ul: [
          "The `$match` before `$facet` can use an index. Stages **inside** `$facet` cannot use indexes.",
          "The whole output is **one document**, so it must fit in **16 MB**. Always `$limit` the result list.",
          "Each facet processes the same input, so heavy facets on big inputs get expensive."
        ] },
        { note: "💡 Say it like this: '$facet runs several pipelines on the same input and returns them together, so one query gives me a page of results, the total count and filter counts. I filter with an indexed $match first and keep the output under 16 MB.'", kind: "tip" }
      ]
    },

    {
      id: "aggregation-expressions",
      q: "How do you write conditional logic and calculations inside an aggregation?",
      tldr: "With expression operators: $cond for if-then-else, $switch for several branches, $ifNull for defaults, arithmetic like $add and $multiply, string operators like $concat, date operators like $dateToString, and type conversion like $toInt. They are used inside $project, $set, $group and $expr.",
      tags: ["aggregation", "operators"],
      seeAlso: ["mongodb-intermediate/update-pipeline"],
      a: [
        { code: `db.orders.aggregate([
  { $set: {
      fullName: { $concat: ["$firstName", " ", "$lastName"] },
      amount:   { $multiply: ["$price", "$qty"] },
      discount: { $ifNull: ["$discount", 0] },              // default when null or missing
      size:     { $cond: { if: { $gte: ["$total", 10000] }, then: "big", else: "small" } },
      tier: { $switch: {
        branches: [
          { case: { $gte: ["$total", 50000] }, then: "gold" },
          { case: { $gte: ["$total", 10000] }, then: "silver" }
        ],
        default: "bronze"
      } },
      day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }
  } }
])`, lang: "mongo" },
        { p: "**$expr** lets you use these expressions in a normal query, for example to compare two fields of the same document:" },
        { code: `db.budgets.find({ $expr: { $gt: ["$spent", "$limit"] } })   // spent > limit`, lang: "mongo" },
        { ul: [
          "Expression operators take an **array of arguments**: `{ $gt: [a, b] }`, unlike query operators `{ field: { $gt: value } }`.",
          "Array helpers: `$filter`, `$map`, `$reduce`, `$size`, `$in`, `$arrayElemAt`.",
          "Conversion: `$toInt`, `$toDouble`, `$toDecimal`, `$toDate`, `$toString`, or `$convert` with `onError`."
        ] },
        { note: "💡 Say it like this: 'Inside a pipeline I use expression operators: $cond and $switch for conditions, $ifNull for defaults, $concat and $dateToString for formatting, $toInt for conversion. With $expr I can use them in a query, like comparing two fields.'", kind: "tip" }
      ]
    },

    {
      id: "pipeline-optimization",
      q: "How do you make an aggregation pipeline fast?",
      tldr: "Filter early with $match and sort early with $sort so they can use indexes, cut data early with $limit and $project, avoid $unwind and $lookup on big inputs, and check with explain. Only the stages at the start of the pipeline can use an index.",
      tags: ["aggregation", "performance"],
      seeAlso: ["mongodb-intermediate/explain", "mongodb-advanced/aggregation-limits"],
      a: [
        { ol: [
          "**`$match` first.** It reduces documents for every later stage and can use an index. A `$match` after `$group` or `$project` cannot.",
          "**`$sort` near the start, on an indexed field**, so no in-memory sort is needed.",
          "**`$sort` + `$limit` together.** The optimiser does a top-N sort that keeps only N documents in memory.",
          "**Project away big fields early** if later stages do not need them.",
          "**`$lookup` after you have reduced the documents**, with an index on `foreignField`.",
          "**Avoid `$unwind` + `$group` to work on one document's array**; use `$filter`, `$map`, `$reduce` instead."
        ] },
        { code: `// ✗ Slow: groups every order, then filters
db.orders.aggregate([
  { $group: { _id: "$city", total: { $sum: "$amount" }, status: { $first: "$status" } } },
  { $match: { status: "paid" } }
])

// ✓ Fast: the index on status narrows the input first
db.orders.aggregate([
  { $match: { status: "paid" } },
  { $group: { _id: "$city", total: { $sum: "$amount" } } }
])

db.orders.explain("executionStats").aggregate([ ... ])   // check IXSCAN and docs examined`, lang: "mongo" },
        { note: "The optimiser already moves some stages for you (for example a `$match` that only uses original fields is moved before a `$project`). Still, write the pipeline in the right order; it makes the intent clear.", kind: "tip" },
        { note: "💡 Say it like this: 'I put an indexed $match and $sort at the start, cut data early with $limit and $project, join only after reducing, and confirm with explain that the first stage uses an IXSCAN.'", kind: "tip" }
      ]
    },

    {
      id: "compound-indexes",
      q: "What is a compound index? What is the ESR rule?",
      tldr: "A compound index is one index on several fields, sorted by the first field, then the second and so on. It helps queries on its prefix fields. The ESR rule gives the best field order: Equality fields first, then Sort fields, then Range fields.",
      tags: ["indexes", "performance"],
      seeAlso: ["mongodb-basic/indexes-intro", "mongodb-intermediate/explain", "mongodb-advanced/index-strategy"],
      a: [
        { code: `db.orders.createIndex({ status: 1, createdAt: -1, total: 1 })`, lang: "mongo" },
        { p: "**Prefixes:** this index can serve queries on `status`, on `status + createdAt`, and on all three, but **not** a query on only `createdAt` or only `total`." },
        { p: "**The ESR rule** for the order of fields:" },
        { table: { head: ["Order", "Kind", "Example", "Why"], rows: [
          ["1", "**E**quality", "`status: \"paid\"`", "Narrows to one exact part of the index"],
          ["2", "**S**ort", "`sort({ createdAt: -1 })`", "Results within that part are already in order, no in-memory sort"],
          ["3", "**R**ange", "`total: { $gt: 1000 }`", "Scans a range last, so the sort is not broken"]
        ] } },
        { code: `// Query
db.orders.find({ status: "paid", total: { $gt: 1000 } }).sort({ createdAt: -1 })

// ✓ ESR: equality, sort, range
db.orders.createIndex({ status: 1, createdAt: -1, total: 1 })

// ✗ range before sort: MongoDB must sort the matches in memory
db.orders.createIndex({ status: 1, total: 1, createdAt: -1 })`, lang: "mongo" },
        { ul: [
          "**Sort direction** matters only with several sort fields: an index `{ a: 1, b: -1 }` can serve `sort({ a: 1, b: -1 })` and its exact reverse, but not `sort({ a: 1, b: 1 })`.",
          "One good compound index usually beats several single-field indexes.",
          "A compound index on `{ a, b }` makes a separate single index on `{ a }` redundant."
        ] },
        { note: "💡 Say it like this: 'A compound index covers several fields in order, and queries can use any prefix of it. I order the fields by the ESR rule: equality first, then sort, then range, so the query avoids an in-memory sort.'", kind: "tip" }
      ]
    },

    {
      id: "multikey-indexes",
      q: "What is a multikey index?",
      tldr: "When you index a field that holds an array, MongoDB creates a multikey index with one index entry per array element, so queries for any element are fast. It happens automatically. The limit is that a compound index can have at most one array field per document.",
      tags: ["indexes", "arrays"],
      seeAlso: ["mongodb-basic/query-arrays", "mongodb-intermediate/covered-queries"],
      a: [
        { code: `// { _id: 1, title: "Mongo tips", tags: ["db", "nosql", "mongo"] }
db.posts.createIndex({ tags: 1 })        // becomes multikey automatically
// index entries: "db" -> 1, "mongo" -> 1, "nosql" -> 1

db.posts.find({ tags: "nosql" })         // uses the index

db.orders.createIndex({ "items.sku": 1 })   // works for arrays of objects too`, lang: "mongo" },
        { ul: [
          "No special syntax: the index becomes multikey the first time an indexed field contains an array.",
          "A document with 500 tags adds **500 index entries**. Large arrays make writes and the index heavy.",
          "**Compound limit:** in `{ tags: 1, categories: 1 }`, a single document may not have arrays in **both** fields. Inserting such a document fails.",
          "Multikey indexes usually **cannot cover** a query, so MongoDB still reads the documents.",
          "`explain()` shows `isMultiKey: true` for these indexes."
        ] },
        { note: "💡 Say it like this: 'Indexing an array field gives a multikey index with one entry per element, so contains queries are fast. A compound index can have only one array field per document, and big arrays make the index expensive.'", kind: "tip" }
      ]
    },

    {
      id: "index-types",
      q: "Which special index types does MongoDB have besides normal single and compound indexes?",
      tldr: "Text indexes for word search, 2dsphere indexes for geospatial queries, hashed indexes for hash-based sharding, wildcard indexes for unknown or dynamic field names, plus clustered and time series indexes. Atlas adds Atlas Search and Vector Search indexes.",
      tags: ["indexes"],
      seeAlso: ["mongodb-intermediate/text-search", "mongodb-intermediate/index-options", "mongodb-advanced/hashed-vs-ranged"],
      a: [
        { table: { head: ["Type", "Created with", "For"], rows: [
          ["Single / compound", "`{ a: 1, b: -1 }`", "Normal equality, range and sort"],
          ["Multikey", "Automatic on arrays", "Array elements"],
          ["Text", "`{ body: \"text\" }`", "Searching words with `$text`"],
          ["2dsphere", "`{ location: \"2dsphere\" }`", "`$near`, `$geoWithin` on a globe"],
          ["Hashed", "`{ userId: \"hashed\" }`", "Hashed shard keys, equality only"],
          ["Wildcard", "`{ \"attributes.$**\": 1 }`", "Fields whose names you do not know ahead (since 4.2)"]
        ] } },
        { code: `// Geospatial: shops within 2 km of a point (longitude first!)
db.shops.createIndex({ location: "2dsphere" })
db.shops.find({
  location: { $near: {
    $geometry: { type: "Point", coordinates: [73.8567, 18.5204] },
    $maxDistance: 2000          // metres
  } }
})

// Wildcard: products with arbitrary attributes
db.products.createIndex({ "attributes.$**": 1 })
db.products.find({ "attributes.color": "red" })`, lang: "mongo" },
        { ul: [
          "GeoJSON coordinates are **[longitude, latitude]**, the opposite of most maps. A very common bug.",
          "Wildcard indexes are flexible but bigger and less efficient than a targeted index. Prefer a real index when you know the fields.",
          "Index **options** (unique, partial, sparse, TTL, collation, hidden) can be added to most of these types."
        ] },
        { note: "💡 Say it like this: 'Besides normal and compound indexes, MongoDB has text indexes for word search, 2dsphere for location queries, hashed for sharding, and wildcard indexes for dynamic field names. On Atlas I also get Search and Vector Search indexes.'", kind: "tip" }
      ]
    },

    {
      id: "index-options",
      q: "What are unique, sparse and partial indexes?",
      tldr: "A unique index rejects duplicate values. A sparse index only includes documents that have the field. A partial index only includes documents that match a filter you choose, which is more flexible than sparse, keeps the index small, and lets you make a value unique only for some documents.",
      tags: ["indexes"],
      seeAlso: ["mongodb-intermediate/index-types", "mongodb-intermediate/ttl-indexes"],
      a: [
        { code: `// Unique: no two users with the same email
db.users.createIndex({ email: 1 }, { unique: true })

// Sparse: skip documents with no "phone" field
db.users.createIndex({ phone: 1 }, { sparse: true })

// Partial: index only active orders (small and hot)
db.orders.createIndex(
  { customerId: 1, createdAt: -1 },
  { partialFilterExpression: { status: "active" } }
)

// Unique only where the field exists: optional but unique usernames
db.users.createIndex(
  { username: 1 },
  { unique: true, partialFilterExpression: { username: { $exists: true } } }
)`, lang: "mongo" },
        { ul: [
          "With a plain unique index, a **missing field counts as null**, so only one document may lack it. Use a partial index to allow many.",
          "A partial index is used only when the query filter is **guaranteed to be within** the index filter (here the query must include `status: \"active\"`).",
          "MongoDB recommends **partial over sparse** for new indexes; it does everything sparse does and more.",
          "Creating a unique index fails if duplicates already exist. Clean them up first."
        ] },
        { note: "💡 Say it like this: 'Unique blocks duplicates, sparse skips documents without the field, and partial indexes only documents matching a filter, which keeps the index small. I use unique plus partial when a field is optional but must be unique when present.'", kind: "tip" }
      ]
    },

    {
      id: "ttl-indexes",
      q: "What is a TTL index?",
      tldr: "A TTL (time to live) index is a single-field index on a date field with expireAfterSeconds. A background job deletes documents automatically once that date plus the given seconds has passed. It is ideal for sessions, OTPs, logs and caches.",
      tags: ["indexes", "data-lifecycle"],
      seeAlso: ["mongodb-basic/delete", "mongodb-intermediate/capped-collections"],
      a: [
        { code: `// Delete sessions 30 minutes after createdAt
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 1800 })
db.sessions.insertOne({ userId: 1, createdAt: new Date() })

// Expire at an exact time per document: expireAfterSeconds 0 + a future date
db.otps.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 })
db.otps.insertOne({ code: "4821", expireAt: new Date(Date.now() + 5 * 60 * 1000) })

// Change the TTL later without rebuilding
db.runCommand({ collMod: "sessions",
  index: { keyPattern: { createdAt: 1 }, expireAfterSeconds: 3600 } })`, lang: "mongo" },
        { ul: [
          "The TTL monitor runs about **every 60 seconds**, so documents can live a little longer than the TTL. Do not rely on second-level precision; also filter by date in queries if it matters.",
          "The field must hold a **Date** (or an array of dates; the earliest one counts). A string or a missing field means the document never expires.",
          "TTL works on a **single-field** index only.",
          "Deletes happen on the primary and replicate like normal deletes."
        ] },
        { note: "💡 Say it like this: 'A TTL index is an index on a date field with expireAfterSeconds, and MongoDB deletes expired documents in the background about once a minute. I use it for sessions, OTPs and logs instead of writing a cleanup job.'", kind: "tip" }
      ]
    },

    {
      id: "explain",
      q: "How do you use explain() to analyse a query?",
      tldr: "Add .explain(\"executionStats\") to a query to see the winning plan and what it really did. Look for IXSCAN (index) versus COLLSCAN (full scan), an in-memory SORT stage, and compare nReturned with totalKeysExamined and totalDocsExamined; ideally all three are close.",
      tags: ["performance", "indexes"],
      seeAlso: ["mongodb-intermediate/compound-indexes", "mongodb-advanced/performance-troubleshooting"],
      a: [
        { code: `db.orders.find({ status: "paid" }).sort({ createdAt: -1 }).explain("executionStats")`, lang: "mongo" },
        { code: `{
  queryPlanner: {
    winningPlan: { stage: "FETCH",
      inputStage: { stage: "IXSCAN", indexName: "status_1_createdAt_-1" } },
    rejectedPlans: [ ... ]
  },
  executionStats: {
    nReturned: 120,
    totalKeysExamined: 120,
    totalDocsExamined: 120,
    executionTimeMillis: 3
  }
}`, lang: "json", caption: "a healthy result (simplified)" },
        { table: { head: ["What you see", "Meaning"], rows: [
          ["`COLLSCAN`", "No index used: every document was read"],
          ["`IXSCAN`", "An index was used"],
          ["`FETCH`", "Documents were loaded after the index scan (normal)"],
          ["`SORT` stage", "Sort done in memory: the index does not match the sort"],
          ["`PROJECTION_COVERED`, 0 docs examined", "A covered query: answered from the index alone"],
          ["docsExamined much bigger than nReturned", "Poor index: it reads lots of documents it throws away"]
        ] } },
        { p: "**Verbosity modes:** `\"queryPlanner\"` (default, does not run the query), `\"executionStats\"` (runs it and shows real numbers), `\"allPlansExecution\"` (also shows the rejected plans' trial runs)." },
        { note: "MongoDB caches the winning plan for each query shape. The `planCacheKey` in explain output helps when a query suddenly becomes slow after the plan changes.", kind: "tip" },
        { note: "💡 Say it like this: 'I run explain with executionStats and check three things: IXSCAN instead of COLLSCAN, no in-memory SORT stage, and keys and docs examined close to nReturned. If docs examined is much higher, the index is wrong.'", kind: "tip" }
      ]
    },

    {
      id: "covered-queries",
      q: "What is a covered query?",
      tldr: "A covered query is answered entirely from an index, without reading any documents: every field in the filter and in the projection is part of the index, and _id is excluded unless it is in the index. It is the fastest kind of read, and explain shows totalDocsExamined: 0.",
      tags: ["performance", "indexes"],
      seeAlso: ["mongodb-basic/projection", "mongodb-intermediate/explain"],
      a: [
        { code: `db.users.createIndex({ city: 1, name: 1 })

// ✓ Covered: filter and projection use only city and name, _id is excluded
db.users.find({ city: "Pune" }, { name: 1, _id: 0 })
// explain: PROJECTION_COVERED + IXSCAN, totalDocsExamined: 0

// ✗ Not covered: _id is returned by default and is not in the index
db.users.find({ city: "Pune" }, { name: 1 })

// ✗ Not covered: email is not in the index
db.users.find({ city: "Pune" }, { name: 1, email: 1, _id: 0 })`, lang: "mongo" },
        { ul: [
          "Remember to exclude `_id` (`_id: 0`); it is the most common reason a query is not covered.",
          "**Multikey** indexes generally cannot cover a query on the array field.",
          "Covered queries help most on hot, simple lookups: \"get the names of users in a city\", \"does this email exist?\".",
          "Do not add many fields to an index just to cover queries; a bigger index costs RAM and write speed."
        ] },
        { note: "💡 Say it like this: 'A covered query is answered only from the index, so no documents are read. Every filtered and returned field must be in the index and I exclude _id. Explain then shows zero docs examined.'", kind: "tip" }
      ]
    },

    {
      id: "elem-match",
      q: "When do you need $elemMatch?",
      tldr: "Use $elemMatch when several conditions must all be true for the same array element. Without it, each condition can be satisfied by a different element. In a projection, $elemMatch returns only the first matching element of the array.",
      tags: ["queries", "arrays"],
      seeAlso: ["mongodb-basic/query-arrays", "mongodb-intermediate/array-updates"],
      a: [
        { code: `// { _id: 1, scores: [ 55, 95 ] }       no score is between 80 and 90
// { _id: 2, scores: [ 85 ] }

db.results.find({ scores: { $gt: 80, $lt: 90 } })
// returns _id 1 AND _id 2 -> 95 is > 80, 55 is < 90 (different elements!)

db.results.find({ scores: { $elemMatch: { $gt: 80, $lt: 90 } } })
// returns _id 2 only -> one element must satisfy both`, lang: "mongo" },
        { code: `// Arrays of objects: one item must be both "PEN" and qty >= 10
db.orders.find({ items: { $elemMatch: { sku: "PEN", qty: { $gte: 10 } } } })

// Projection: return only the matching grade, not the whole array
db.students.find(
  { _id: 7 },
  { grades: { $elemMatch: { subject: "math" } } }
)`, lang: "mongo" },
        { ul: [
          "With only **one** condition, `$elemMatch` is not needed: `{ \"items.sku\": \"PEN\" }` is the same.",
          "`$elemMatch` queries can use a multikey index on the array fields.",
          "The positional projection `\"items.$\": 1` also returns the first element matched by the query."
        ] },
        { note: "💡 Say it like this: 'When I have two or more conditions on an array, $elemMatch makes them apply to the same element. Without it, one element can satisfy one condition and another element the other, which gives wrong matches.'", kind: "tip" }
      ]
    },

    {
      id: "array-updates",
      q: "How do you update elements inside an array? What are $, $[] and $[identifier]?",
      tldr: "The positional $ updates the first element that matched the query, $[] updates every element, and $[name] with arrayFilters updates only the elements matching a condition. $push with $each, $sort and $slice adds several elements and keeps the array sorted and bounded.",
      tags: ["crud", "arrays"],
      seeAlso: ["mongodb-basic/update-operators", "mongodb-intermediate/elem-match"],
      a: [
        { code: `// { _id: 1, items: [ { sku: "PEN", qty: 2 }, { sku: "BOOK", qty: 1 }, { sku: "INK", qty: 0 } ] }

// $  -> the first element matched by the filter
db.carts.updateOne({ _id: 1, "items.sku": "PEN" }, { $inc: { "items.$.qty": 1 } })

// $[] -> every element
db.carts.updateOne({ _id: 1 }, { $set: { "items.$[].checked": true } })

// $[x] + arrayFilters -> only elements matching the condition
db.carts.updateOne(
  { _id: 1 },
  { $set: { "items.$[x].outOfStock": true } },
  { arrayFilters: [ { "x.qty": 0 } ] }
)

// Remove matching elements
db.carts.updateOne({ _id: 1 }, { $pull: { items: { qty: 0 } } })`, lang: "mongo" },
        { p: "**Keep an array bounded** with `$push` modifiers:" },
        { code: `// Add two scores, keep the array sorted descending, keep only the top 10
db.players.updateOne(
  { _id: 9 },
  { $push: { scores: { $each: [88, 72], $sort: -1, $slice: 10 } } }
)`, lang: "mongo" },
        { note: "The `$slice` trick is the standard answer to \"how do you stop an array from growing forever?\", for example keeping only the last 50 notifications.", kind: "tip" },
        { note: "💡 Say it like this: 'For arrays, $ updates the first element the query matched, $[] updates all of them, and $[x] with arrayFilters updates only the matching ones. $push with $each, $sort and $slice keeps an array sorted and capped.'", kind: "tip" }
      ]
    },

    {
      id: "one-to-many",
      q: "How do you model one-to-many relationships in MongoDB?",
      tldr: "It depends on how many 'many' is. One-to-few: embed the children in the parent. One-to-many (hundreds or thousands): keep an array of child ids in the parent, or a parent id in each child. One-to-squillions (unbounded): always store the parent id in each child document.",
      tags: ["design", "schema"],
      seeAlso: ["mongodb-basic/embed-vs-reference", "mongodb-advanced/schema-patterns"],
      a: [
        { table: { head: ["Case", "Example", "Design"], rows: [
          ["One-to-few", "A person's addresses", "Embed an array of objects"],
          ["One-to-many", "A product's parts (up to a few hundred)", "Array of child `_id`s in the parent"],
          ["One-to-squillions", "A server's log lines", "Parent `_id` stored in every child"]
        ] } },
        { code: `// One-to-few: embedded
{ _id: 1, name: "Asha", addresses: [ { type: "home", city: "Pune" }, { type: "work", city: "Mumbai" } ] }

// One-to-many: child ids in the parent
{ _id: "P-100", name: "Bicycle", partIds: [ ObjectId("..."), ObjectId("...") ] }
db.parts.find({ _id: { $in: product.partIds } })

// One-to-squillions: parent id in the child
{ _id: ObjectId("..."), hostId: "web-01", at: ISODate("..."), msg: "disk 91%" }
db.logs.createIndex({ hostId: 1, at: -1 })
db.logs.find({ hostId: "web-01" }).sort({ at: -1 }).limit(100)`, lang: "mongo" },
        { p: "Questions to ask before you choose:" },
        { ul: [
          "How many children can there be, **at most**? Can it grow without limit?",
          "Do I read the children **with** the parent, or on their own?",
          "Are children shared between parents (many-to-many)?",
          "How often do children change compared with how often they are read?"
        ] },
        { note: "💡 Say it like this: 'For one-to-few I embed. For one-to-many I keep an array of child ids, or the parent id in each child. For one-to-squillions, like logs, the child always holds the parent id, because the array would grow without limit.'", kind: "tip" }
      ]
    },

    {
      id: "schema-validation",
      q: "How do you enforce a schema in MongoDB?",
      tldr: "Add a validator to the collection, usually a $jsonSchema that lists required fields, types, allowed values and ranges. validationLevel decides which documents are checked (strict or moderate) and validationAction decides whether a bad write is rejected (error) or only logged (warn).",
      tags: ["schema", "data-quality"],
      seeAlso: ["mongodb-basic/flexible-schema"],
      a: [
        { code: `db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name", "createdAt"],
      properties: {
        email:     { bsonType: "string", pattern: "^.+@.+$" },
        name:      { bsonType: "string", minLength: 1 },
        age:       { bsonType: "int", minimum: 0, maximum: 150 },
        role:      { enum: ["user", "admin"] },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",     // check all inserts and updates
  validationAction: "error"      // reject invalid writes
})

// Add or change rules on an existing collection
db.runCommand({ collMod: "users", validator: { $jsonSchema: { ... } }, validationLevel: "moderate" })`, lang: "mongo" },
        { table: { head: ["Setting", "Values"], rows: [
          ["`validationLevel`", "`strict` (all writes) · `moderate` (skip updates to documents that were already invalid) · `off`"],
          ["`validationAction`", "`error` (reject) · `warn` (allow, but write a log entry)"]
        ] } },
        { ul: [
          "Rejected writes return error `DocumentValidationFailure` with details of which rule failed.",
          "Use `moderate` + `warn` when adding rules to an old collection with messy data, then tighten later.",
          "You can also use query operators instead of `$jsonSchema`, for example `{ $expr: { $lte: [\"$discount\", \"$price\"] } }`."
        ] },
        { note: "💡 Say it like this: 'I enforce structure with a $jsonSchema validator: required fields, bsonTypes, enums and ranges. validationLevel controls which writes are checked and validationAction whether they are rejected or only logged.'", kind: "tip" }
      ]
    },

    {
      id: "bulk-write",
      q: "What is bulkWrite and why use it?",
      tldr: "bulkWrite sends many insert, update, replace and delete operations to the server in one request, which saves network round trips and is much faster than one call per operation. It can be ordered (stop at the first error) or unordered (carry on, and the server may run them in parallel).",
      tags: ["crud", "performance"],
      seeAlso: ["mongodb-basic/insert"],
      a: [
        { code: `db.products.bulkWrite([
  { insertOne:  { document: { _id: 10, name: "Pen", stock: 100 } } },
  { updateOne:  { filter: { _id: 2 }, update: { $inc: { stock: -5 } } } },
  { updateMany: { filter: { stock: 0 }, update: { $set: { status: "out" } } } },
  { replaceOne: { filter: { _id: 3 }, replacement: { name: "Ink", stock: 20 } } },
  { deleteOne:  { filter: { _id: 4 } } }
], { ordered: false })
// { insertedCount: 1, matchedCount: ..., modifiedCount: ..., deletedCount: 1, upsertedCount: 0 }`, lang: "mongo" },
        { ul: [
          "**Ordered** (default): runs in sequence, stops at the first error. Use when later operations depend on earlier ones.",
          "**Unordered**: continues after errors and reports them all at the end. Usually faster.",
          "It is **not a transaction**: if operation 3 fails, operations 1 and 2 are still applied. Use a transaction if you need all-or-nothing.",
          "Drivers split very large bulks into batches automatically (up to 100,000 operations per batch).",
          "MongoDB 8.0 adds a client-level `bulkWrite` that can write to **several collections** in one request."
        ] },
        { note: "💡 Say it like this: 'bulkWrite batches many inserts, updates and deletes into one round trip, which is great for imports and syncs. Ordered stops at the first error, unordered keeps going, and it is not atomic unless I wrap it in a transaction.'", kind: "tip" }
      ]
    },

    {
      id: "write-concern",
      q: "What is write concern?",
      tldr: "Write concern says how many replica set members must confirm a write before MongoDB reports success. w: 1 means only the primary, w: \"majority\" means most voting members, and j: true means it must also be in the on-disk journal. Higher write concern is safer but slower.",
      tags: ["replication", "durability"],
      seeAlso: ["mongodb-intermediate/read-concern", "mongodb-advanced/rollbacks"],
      a: [
        { code: `db.orders.insertOne(
  { _id: 1, total: 950 },
  { writeConcern: { w: "majority", j: true, wtimeout: 5000 } }
)`, lang: "mongo" },
        { table: { head: ["Setting", "Acknowledged when...", "Risk"], rows: [
          ["`w: 0`", "Not at all (fire and forget)", "You never know if it failed"],
          ["`w: 1`", "The primary has applied it", "Lost if the primary crashes before replicating (rollback)"],
          ["`w: \"majority\"`", "A majority of voting members have it", "Survives failover. **Default since 5.0**"],
          ["`w: 3`", "Exactly 3 members have it", "Fails or waits if a member is down"],
          ["`j: true`", "...and it is in the journal on disk", "Survives a process crash"],
          ["`wtimeout`", "Give up waiting after N ms", "The write may **still** succeed later"]
        ] } },
        { ul: [
          "Use `majority` for anything you cannot lose: orders, payments, user accounts.",
          "`w: 1` is acceptable for data you can afford to lose, like analytics clicks.",
          "A `wtimeout` error does **not** undo the write; it only stops waiting."
        ] },
        { note: "💡 Say it like this: 'Write concern is how many members must acknowledge a write. w: 1 is just the primary, w: majority means it survives a failover, and j: true means it is on disk. Since 5.0 majority is the default, and I keep it for important data.'", kind: "tip" }
      ]
    },

    {
      id: "read-concern",
      q: "What is read concern? What are the levels?",
      tldr: "Read concern controls how committed the data you read must be. \"local\" returns the newest data on that node even if it could still be rolled back, \"majority\" returns only data acknowledged by a majority, \"snapshot\" gives a consistent point-in-time view in transactions, and \"linearizable\" guarantees you see every write that finished before the read.",
      tags: ["replication", "consistency"],
      seeAlso: ["mongodb-intermediate/write-concern", "mongodb-intermediate/read-preference", "mongodb-advanced/causal-consistency"],
      a: [
        { table: { head: ["Level", "You read...", "Use for"], rows: [
          ["`local` (default)", "Latest data on this node, may be rolled back", "Most reads"],
          ["`available`", "Like local; on sharded clusters may return orphaned documents", "Lowest latency, rarely used"],
          ["`majority`", "Only majority-committed data, never rolled back", "Reads that must not see data that might disappear"],
          ["`snapshot`", "A consistent snapshot across documents", "Multi-document transactions, consistent reports"],
          ["`linearizable`", "All writes acknowledged before the read, from the primary", "Strictest; single-document reads, slow"]
        ] } },
        { code: `db.accounts.find({ _id: 7 }).readConcern("majority")

db.runCommand({
  find: "accounts", filter: { _id: 7 },
  readConcern: { level: "linearizable" }, maxTimeMS: 10000
})`, lang: "mongo" },
        { ul: [
          "**Write concern** is about when a write is confirmed; **read concern** is about which data a read may see. They work together: write with `majority` and read with `majority` to never see rolled-back data.",
          "Read concern is not \"read uncommitted\" in the SQL sense: you never see half of a single-document write."
        ] },
        { note: "💡 Say it like this: 'Read concern decides how durable the data I read must be. local gives the newest data on the node, majority only data that cannot be rolled back, snapshot a consistent view for transactions, and linearizable the strictest, read-your-latest-write guarantee.'", kind: "tip" }
      ]
    },

    {
      id: "read-preference",
      q: "What is read preference?",
      tldr: "Read preference tells the driver which replica set member to read from: primary (default), primaryPreferred, secondary, secondaryPreferred or nearest. Reading from secondaries spreads load or lowers latency, but the data can be slightly stale.",
      tags: ["replication"],
      seeAlso: ["mongodb-intermediate/read-concern", "mongodb-basic/replication-intro"],
      a: [
        { table: { head: ["Mode", "Reads from"], rows: [
          ["`primary` (default)", "Only the primary: always the latest data"],
          ["`primaryPreferred`", "Primary; a secondary only if the primary is down"],
          ["`secondary`", "Only secondaries"],
          ["`secondaryPreferred`", "Secondaries; the primary if none is available"],
          ["`nearest`", "The member with the lowest network latency"]
        ] } },
        { code: `mongodb://host1,host2,host3/shop?replicaSet=rs0&readPreference=secondaryPreferred&maxStalenessSeconds=90`, lang: "text", caption: "in the connection string" },
        { code: `db.orders.find({ status: "paid" }).readPref("secondary")   // per query in mongosh`, lang: "mongo" },
        { ul: [
          "**Good uses**: reports and analytics that should not load the primary, and `nearest` for users in another region.",
          "**Not for scaling writes**: every secondary still applies all writes.",
          "A user may not see their own update if the next read hits a lagging secondary. Use **causal consistency** sessions, or read from the primary for that flow.",
          "`maxStalenessSeconds` skips secondaries that are too far behind; **tag sets** pick members by label (for example a dedicated analytics node)."
        ] },
        { note: "💡 Say it like this: 'Read preference picks which member serves reads. The default is primary for the freshest data. I use secondaryPreferred or a tagged analytics node for reports, and nearest for low latency, knowing the data can be a little stale.'", kind: "tip" }
      ]
    },

    {
      id: "replica-set-elections",
      q: "How does failover work in a replica set? What are arbiters, hidden and delayed members?",
      tldr: "Members send heartbeats every 2 seconds. If the primary is unreachable for longer than the election timeout (10 seconds by default), an eligible secondary calls an election and becomes primary if a majority of voting members agree. Arbiters vote but hold no data, hidden members are invisible to apps, and delayed members keep an older copy as a safety net.",
      tags: ["replication", "availability"],
      seeAlso: ["mongodb-basic/replication-intro", "mongodb-intermediate/oplog"],
      a: [
        { ol: [
          "The primary stops answering heartbeats (crash, network split, maintenance).",
          "After `electionTimeoutMillis` (10 s by default) a secondary stands for election.",
          "It wins if a **majority of voting members** vote for it and its data is up to date enough.",
          "Drivers discover the new primary; retryable writes resend a failed write once.",
          "When the old primary comes back, it rejoins as a secondary (rolling back any writes that never reached a majority)."
        ] },
        { table: { head: ["Member type", "Holds data", "Votes", "Can be primary", "Use"], rows: [
          ["Normal", "Yes", "Yes", "Yes", "Usual member"],
          ["Arbiter", "No", "Yes", "No", "Tie-breaker with little hardware (avoid if you can)"],
          ["Priority 0", "Yes", "Yes", "No", "A member in a DR data centre"],
          ["Hidden", "Yes", "Yes", "No", "Backups, analytics; apps never read from it"],
          ["Delayed", "Yes", "Yes", "No", "Copy that is e.g. 1 hour behind, to recover from mistakes"]
        ] } },
        { ul: [
          "Use an **odd** number of voting members (3 or 5). A replica set can have up to 50 members but at most **7 voting** members.",
          "If a majority is not reachable (say 2 of 3 members are down), there is **no primary** and writes stop. This prevents a \"split brain\".",
          "`priority` decides who is preferred as primary."
        ] },
        { note: "Arbiters weaken `w: \"majority\"`: in a primary + secondary + arbiter set, losing the secondary means majority writes cannot be acknowledged. Prefer three data-bearing members.", kind: "warn" },
        { note: "💡 Say it like this: 'Members heartbeat every two seconds. If the primary is gone for about ten seconds, a secondary runs an election and needs a majority of votes. Arbiters only vote, hidden members serve backups or analytics, and delayed members protect against human mistakes.'", kind: "tip" }
      ]
    },

    {
      id: "oplog",
      q: "What is the oplog?",
      tldr: "The oplog (operations log) is a special capped collection, local.oplog.rs, where the primary records every change to the data. Secondaries copy and replay it to stay in sync. Its size sets the oplog window: how long a secondary can be offline and still catch up without a full resync.",
      tags: ["replication", "internals"],
      seeAlso: ["mongodb-intermediate/replica-set-elections", "mongodb-advanced/change-streams"],
      a: [
        { code: `use local
db.oplog.rs.find().sort({ $natural: -1 }).limit(1)
// { op: "u", ns: "shop.users", o: { $v: 2, diff: { u: { city: "Mumbai" } } },
//   o2: { _id: 1 }, ts: Timestamp({ t: 1763280000, i: 1 }), ... }

rs.printReplicationInfo()            // oplog size and time window
rs.printSecondaryReplicationInfo()   // how far behind each secondary is (replication lag)`, lang: "mongo" },
        { ul: [
          "Entries are **idempotent**: applying one twice gives the same result. An `$inc` is stored as the resulting `$set`, for example.",
          "`op` is `i` (insert), `u` (update), `d` (delete), `c` (command) or `n` (no-op).",
          "An `updateMany` that changes 10,000 documents creates **10,000 oplog entries**.",
          "If a secondary falls further behind than the oplog window, it becomes **stale** and needs an initial sync.",
          "Default size is about **5% of free disk** (min 990 MB, max 50 GB). You can resize it, and since 4.4 also set a minimum retention time."
        ] },
        { note: "Change streams, point-in-time backups and many sync tools are built on top of the oplog.", kind: "tip" },
        { note: "💡 Say it like this: 'The oplog is a capped collection where the primary logs every change in an idempotent form. Secondaries replay it to stay in sync. Its size gives the oplog window, the maximum time a secondary can lag before it needs a full resync.'", kind: "tip" }
      ]
    },

    {
      id: "pagination",
      q: "How do you paginate efficiently in MongoDB?",
      tldr: "skip and limit are easy but get slower on deep pages because the server still walks every skipped document. For large data, use range (keyset) pagination: sort by an indexed, unique key and ask for documents after the last one you returned, which is equally fast on every page.",
      tags: ["queries", "performance"],
      seeAlso: ["mongodb-basic/sort-limit-skip", "mongodb-intermediate/facet"],
      a: [
        { code: `// Offset pagination: simple, but page 5000 walks 99,980 documents first
db.posts.find().sort({ _id: -1 }).skip(99980).limit(20)

// Keyset pagination: always fast with an index
const page1 = db.posts.find().sort({ _id: -1 }).limit(20).toArray()
const lastId = page1[page1.length - 1]._id
const page2 = db.posts.find({ _id: { $lt: lastId } }).sort({ _id: -1 }).limit(20)`, lang: "mongo" },
        { p: "**Sorting by a non-unique field** (like `createdAt`): add `_id` as a tie-breaker, in both the sort and the filter." },
        { code: `db.posts.createIndex({ createdAt: -1, _id: -1 })

db.posts.find({
  $or: [
    { createdAt: { $lt: lastCreatedAt } },
    { createdAt: lastCreatedAt, _id: { $lt: lastId } }
  ]
}).sort({ createdAt: -1, _id: -1 }).limit(20)`, lang: "mongo" },
        { table: { head: ["", "skip / limit", "Keyset (range)"], rows: [
          ["Jump to page 37", "Yes", "No, only next / previous"],
          ["Speed on deep pages", "Slow", "Constant"],
          ["Stable when data changes", "Items can repeat or be skipped", "Stable"],
          ["Good for", "Admin tables, small data", "Feeds, infinite scroll, APIs, exports"]
        ] } },
        { note: "💡 Say it like this: 'skip and limit are fine for small data, but skip still walks the skipped documents. For large collections I use keyset pagination: sort by an indexed unique key and query for values after the last one, which is fast on every page.'", kind: "tip" }
      ]
    },

    {
      id: "text-search",
      q: "How does full-text search work in MongoDB?",
      tldr: "Create a text index on string fields and query it with $text and $search. It splits text into words, removes stop words and matches word stems, and you can sort by relevance with textScore. For real search features (fuzzy matching, autocomplete, facets, highlighting), Atlas Search is the better tool.",
      tags: ["search", "indexes"],
      seeAlso: ["mongodb-basic/regex", "mongodb-advanced/atlas-search"],
      a: [
        { code: `db.articles.createIndex(
  { title: "text", body: "text" },
  { weights: { title: 5, body: 1 }, default_language: "english" }
)

db.articles.find(
  { $text: { $search: "index performance -mysql" } },   // OR of words, minus excludes
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })

db.articles.find({ $text: { $search: "\\"covered query\\"" } })   // exact phrase`, lang: "mongo" },
        { ul: [
          "Only **one text index per collection**, but it can include several fields (or all, with `\"$**\"`).",
          "Words are **stemmed** (\"running\" matches \"run\") and stop words (\"the\", \"is\") are ignored.",
          "No fuzzy matching (typos), no partial words, no autocomplete.",
          "On **Atlas**, `$search` uses Apache Lucene: fuzzy search, autocomplete, synonyms, highlighting, facets and relevance tuning. It is the recommended option today."
        ] },
        { note: "💡 Say it like this: 'A text index plus $text gives basic word search with stemming and relevance scores, one text index per collection. For proper search like typo tolerance and autocomplete, I use Atlas Search, which is built on Lucene.'", kind: "tip" }
      ]
    },

    {
      id: "capped-collections",
      q: "What is a capped collection?",
      tldr: "A capped collection has a fixed maximum size (and optionally a maximum number of documents). It keeps documents in insertion order and, when full, overwrites the oldest ones, like a ring buffer. It suits small logs and caches, but TTL indexes or time series collections are usually more flexible today.",
      tags: ["collections"],
      seeAlso: ["mongodb-intermediate/ttl-indexes", "mongodb-advanced/time-series"],
      a: [
        { code: `db.createCollection("recentLogs", { capped: true, size: 10 * 1024 * 1024, max: 5000 })
// at most 10 MB and at most 5000 documents

db.recentLogs.find().sort({ $natural: -1 }).limit(10)   // newest first, in insert order

// A tailable cursor waits for new documents, like "tail -f"
db.recentLogs.find().tailable()`, lang: "mongo" },
        { ul: [
          "Insertion order is preserved, so reading in natural order needs no index.",
          "Oldest documents are removed automatically when the size limit is reached.",
          "Updates that make a document **bigger** fail.",
          "Capped collections **cannot be sharded**.",
          "The replica set **oplog** is itself a capped collection."
        ] },
        { note: "MongoDB's own documentation says that TTL indexes generally give better performance and flexibility than capped collections. Use capped collections when you really want \"keep the last N MB\".", kind: "tip" },
        { note: "💡 Say it like this: 'A capped collection has a fixed size and works like a ring buffer: it keeps insertion order and overwrites the oldest documents when full. The oplog is one. For expiring data by time I prefer a TTL index.'", kind: "tip" }
      ]
    },

    {
      id: "views",
      q: "What are views in MongoDB? What is an on-demand materialized view?",
      tldr: "A view is a read-only virtual collection defined by an aggregation pipeline; the pipeline runs every time you query the view. An on-demand materialized view is a real collection that you refresh by running a pipeline that ends with $merge (or $out), so reads are fast but the data is only as fresh as the last refresh.",
      tags: ["aggregation", "collections"],
      seeAlso: ["mongodb-intermediate/aggregation-stages"],
      a: [
        { code: `// Standard view: always current, computed on read
db.createView("activeCustomers", "customers", [
  { $match: { status: "active" } },
  { $project: { name: 1, email: 1, city: 1 } }      // hides sensitive fields too
])
db.activeCustomers.find({ city: "Pune" })`, lang: "mongo" },
        { code: `// On-demand materialized view: run this on a schedule
db.orders.aggregate([
  { $match: { createdAt: { $gte: ISODate("2026-11-01") } } },
  { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              revenue: { $sum: "$total" } } },
  { $merge: { into: "dailyRevenue", whenMatched: "replace", whenNotMatched: "insert" } }
])
db.dailyRevenue.find().sort({ _id: -1 })   // fast, indexed, precomputed`, lang: "mongo" },
        { table: { head: ["", "View", "Materialized ($merge)"], rows: [
          ["Stored on disk", "No", "Yes"],
          ["Freshness", "Always current", "As of the last refresh"],
          ["Read speed", "Pipeline runs each time", "Fast, can have its own indexes"],
          ["Writable", "No", "It is a normal collection"]
        ] } },
        { ul: [
          "`$out` **replaces** the whole target collection; `$merge` can insert, replace, merge or keep existing documents, so it supports incremental refreshes.",
          "Views are also handy for **security**: give a role access to the view but not to the base collection."
        ] },
        { note: "💡 Say it like this: 'A view is a saved aggregation that runs on every read, so it is always current but not stored. For heavy reports I build an on-demand materialized view with $merge, refresh it on a schedule, and index it.'", kind: "tip" }
      ]
    },

    {
      id: "atomicity",
      q: "Which operations are atomic in MongoDB?",
      tldr: "Every write to a single document is atomic, even when it changes many fields, nested objects and arrays at once. A write that touches several documents, like updateMany, is atomic per document only. For all-or-nothing changes across documents or collections, use a multi-document transaction.",
      tags: ["concurrency", "transactions"],
      seeAlso: ["mongodb-advanced/transactions", "mongodb-basic/embed-vs-reference"],
      a: [
        { code: `// ✓ Atomic: the order total and its items change together, or not at all
db.orders.updateOne(
  { _id: 101 },
  { $push: { items: { sku: "PEN", qty: 2, price: 10 } }, $inc: { total: 20 } }
)

// ✓ Atomic check-and-set: only succeeds if stock is still enough
db.products.updateOne(
  { _id: "PEN", stock: { $gte: 2 } },
  { $inc: { stock: -2 } }
)   // modifiedCount 0 -> not enough stock, nothing changed

// ✗ Not atomic as a whole: if it fails midway, some documents are updated
db.products.updateMany({ category: "pen" }, { $mul: { price: 1.1 } })`, lang: "mongo" },
        { ul: [
          "This is the main reason to **embed**: data in one document can always be changed atomically without a transaction.",
          "The **conditional update** pattern (put the condition in the filter) avoids race conditions without locks.",
          "**Optimistic concurrency**: keep a `version` field, update with `{ _id, version: 5 }` and `$inc: { version: 1 }`; if `modifiedCount` is 0 someone else changed it first."
        ] },
        { note: "💡 Say it like this: 'Any write to one document is atomic, however many fields it touches. Multi-document writes are atomic per document only, so I design to keep related changes in one document, use conditional updates for races, and use transactions when I really need several documents together.'", kind: "tip" }
      ]
    },

    {
      id: "update-pipeline",
      q: "What is an update with an aggregation pipeline?",
      tldr: "Since MongoDB 4.2, the update argument of updateOne or updateMany can be an array of aggregation stages ($set, $unset, $project, $replaceWith, ...). That lets an update compute new values from other fields of the same document, which normal update operators cannot do.",
      tags: ["crud", "aggregation"],
      seeAlso: ["mongodb-intermediate/aggregation-expressions", "mongodb-basic/update-operators"],
      a: [
        { code: `// Build fullName from two existing fields (impossible with plain $set)
db.users.updateMany(
  {},
  [ { $set: { fullName: { $concat: ["$firstName", " ", "$lastName"] } } } ]   // note the [ ]
)

// Conditional update: set a tier from the current total
db.customers.updateMany({}, [
  { $set: { tier: { $cond: [{ $gte: ["$totalSpend", 50000] }, "gold", "standard"] } } }
])

// Schema migration: turn a string price into a decimal, then drop the old field
db.products.updateMany(
  { price: { $type: "string" } },
  [ { $set: { priceDec: { $toDecimal: "$price" } } }, { $unset: "price" } ]
)`, lang: "mongo" },
        { ul: [
          "The **square brackets** are what make it a pipeline. Without them `\"$firstName\"` would be stored as the literal string \"$firstName\".",
          "Allowed stages: `$set`/`$addFields`, `$unset`/`$project`, `$replaceRoot`/`$replaceWith`.",
          "It still runs on the server and is atomic per document, so no read-modify-write round trip is needed.",
          "It is the go-to tool for **data migrations** after a schema change."
        ] },
        { note: "💡 Say it like this: 'Since 4.2 an update can be an aggregation pipeline in square brackets, so I can compute a new value from other fields of the same document, like fullName from first and last name. I use it a lot for migrations.'", kind: "tip" }
      ]
    }

  ]
});
