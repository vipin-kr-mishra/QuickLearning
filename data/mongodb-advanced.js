/* MongoDB - Advanced. 30 questions. See data/manifest.js for the authoring guide. */
QL.register({
  id: "mongodb-advanced",
  topic: "MongoDB",
  level: "Advanced",
  short: "MongoDB Advanced",
  accent: "green",
  desc: "What senior and architect interviews ask: transactions and consistency, sharding and shard keys, change streams, WiredTiger and performance tuning, schema design patterns, time series and window functions, security, encryption, backups and production best practices.",
  questions: [

    {
      id: "transactions",
      q: "How do multi-document transactions work in MongoDB?",
      tldr: "Since 4.0 (replica sets) and 4.2 (sharded clusters), MongoDB supports ACID transactions across many documents and collections. You start a session, run the operations inside it, and commit or abort; other clients see either all the changes or none. They work, but a good schema needs them only for a small part of the writes.",
      tags: ["transactions", "consistency"],
      seeAlso: ["mongodb-intermediate/atomicity", "mongodb-advanced/transaction-best-practices"],
      a: [
        { code: `// Move 100 from account A to B: both updates or neither
const session = db.getMongo().startSession()
const accounts = session.getDatabase("bank").accounts

session.withTransaction(() => {
  const res = accounts.updateOne(
    { _id: "A", balance: { $gte: 100 } },
    { $inc: { balance: -100 } }
  )
  if (res.modifiedCount !== 1) throw new Error("Insufficient funds")   // aborts
  accounts.updateOne({ _id: "B" }, { $inc: { balance: 100 } })
}, {
  readConcern:  { level: "snapshot" },
  writeConcern: { w: "majority" }
})

session.endSession()`, lang: "mongo" },
        { ul: [
          "**Requires** a replica set or a sharded cluster (not a standalone server). Atlas always qualifies.",
          "Reads inside the transaction see a **snapshot** taken at the start, plus the transaction's own writes.",
          "Writes are invisible to others until **commit**. If anything fails or you throw, everything is rolled back.",
          "`withTransaction` (a driver and mongosh helper) **retries automatically** on transient errors, so prefer it over manual `startTransaction` / `commitTransaction`.",
          "Every operation inside must use the **session**; an operation without it runs outside the transaction."
        ] },
        { note: "Interviewers often follow up with \"so is MongoDB ACID?\" The answer: single-document writes always were; multi-document ACID arrived in 4.0. The design advice is still to model data so most writes touch one document.", kind: "tip" },
        { note: "💡 Say it like this: 'MongoDB has multi-document ACID transactions since 4.0. I start a session, run the operations with that session inside withTransaction, which handles commit and retries, and use snapshot read concern with majority write concern. I still design the schema so most writes are single-document.'", kind: "tip" }
      ]
    },

    {
      id: "transaction-best-practices",
      q: "What are the limits and best practices for transactions?",
      tldr: "Keep transactions short and small: by default they are aborted after 60 seconds, and every change is held in the WiredTiger cache until commit. Handle TransientTransactionError and UnknownTransactionCommitResult by retrying, expect write conflicts on hot documents, use indexes for every query inside, and never do slow external calls in the middle.",
      tags: ["transactions", "performance"],
      seeAlso: ["mongodb-advanced/transactions", "mongodb-advanced/wiredtiger"],
      a: [
        { table: { head: ["Limit / behaviour", "Detail"], rows: [
          ["Time limit", "`transactionLifetimeLimitSeconds`, **60 s** by default, then aborted"],
          ["Size", "No hard document limit, but MongoDB advises about **1,000 modified documents** at most per transaction"],
          ["Write conflicts", "Two transactions writing the same document: one fails with a `WriteConflict` (labelled transient)"],
          ["Lock wait", "Waiting for a lock longer than `maxTransactionLockRequestTimeoutMillis` (5 ms) aborts the transaction"],
          ["DDL", "Creating collections and indexes inside is allowed only since 4.4, with limits; avoid it"],
          ["Cost", "Cross-shard transactions use a two-phase commit and are slower"]
        ] } },
        { p: "**Error labels you must handle** (withTransaction does this for you):" },
        { ul: [
          "`TransientTransactionError`: retry the **whole** transaction (conflict, failover, network blip).",
          "`UnknownTransactionCommitResult`: retry only the **commit**; it may already have succeeded."
        ] },
        { p: "**Best practices:**" },
        { ol: [
          "Model data so that most changes are **single-document** and need no transaction.",
          "Keep the transaction **short**: prepare data before, call payment APIs or send emails **after** commit.",
          "Make every query inside use an **index**, so it does not read and lock-check many documents.",
          "Use `w: \"majority\"` and `readConcern: \"snapshot\"` for real all-or-nothing guarantees.",
          "Split huge batch jobs into many small transactions."
        ] },
        { note: "💡 Say it like this: 'Transactions should be short and small: they abort after 60 seconds, hold changes in cache and can hit write conflicts. I retry transient errors, which withTransaction does for me, keep external calls outside, index every query inside, and avoid transactions where the schema can make the write single-document.'", kind: "tip" }
      ]
    },

    {
      id: "sharding-architecture",
      q: "What is sharding, and what are the components of a sharded cluster?",
      tldr: "Sharding splits one collection's data across several replica sets, called shards, by a shard key, so the cluster can store more data and handle more writes than one server. Apps connect to mongos routers, which use the metadata on the config servers to send each query to the right shards.",
      tags: ["sharding", "scaling"],
      seeAlso: ["mongodb-advanced/shard-key", "mongodb-advanced/targeted-vs-broadcast", "mongodb-advanced/when-to-shard"],
      a: [
        { code: `            App / driver
                 │
        ┌────────┴────────┐
        ▼                 ▼
     mongos            mongos          <- query routers (stateless)
        │                 │
        ├──── reads metadata from ────►  Config servers (a replica set)
        │                                which key ranges live on which shard
        ▼
 ┌────────────┐  ┌────────────┐  ┌────────────┐
 │  Shard A   │  │  Shard B   │  │  Shard C   │   <- each shard is a replica set
 │ userId a–h │  │ userId i–p │  │ userId q–z │
 └────────────┘  └────────────┘  └────────────┘`, lang: "text" },
        { table: { head: ["Component", "Job"], rows: [
          ["**Shard**", "A replica set holding part of the data"],
          ["**mongos**", "Router: the app connects here; it sends each operation to the right shard(s) and merges results"],
          ["**Config servers**", "A replica set storing cluster metadata: shard key ranges (chunks) and their locations"],
          ["**Balancer**", "Background process that moves chunks so shards hold similar amounts of data"]
        ] } },
        { code: `sh.enableSharding("shop")                                // optional since 6.0
sh.shardCollection("shop.orders", { customerId: "hashed" })
sh.status()                                              // see shards, chunks, balancer`, lang: "mongo" },
        { ul: [
          "Only the collections you choose are sharded. Others live on the database's **primary shard**.",
          "Sharding adds complexity (more servers, shard key design), so do it when one replica set is really not enough.",
          "Atlas can run sharded clusters for you; self-managed you need at least 3 config servers plus each shard's replica set."
        ] },
        { note: "💡 Say it like this: 'Sharding spreads one collection over several replica sets using a shard key. The app talks to mongos routers, config servers hold the map of which key ranges live where, and the balancer moves data to keep shards even. It is MongoDB's horizontal scaling.'", kind: "tip" }
      ]
    },

    {
      id: "shard-key",
      q: "How do you choose a good shard key?",
      tldr: "A good shard key has high cardinality (many distinct values), a low frequency of any single value, and does not grow monotonically, so writes spread across all shards. It should also appear in your most common queries, so they can be sent to one shard instead of all of them.",
      tags: ["sharding", "design"],
      seeAlso: ["mongodb-advanced/hashed-vs-ranged", "mongodb-advanced/resharding", "mongodb-advanced/targeted-vs-broadcast"],
      a: [
        { table: { head: ["Property", "Good", "Bad example", "Problem"], rows: [
          ["Cardinality", "Millions of values", "`country` (about 200 values)", "Data cannot be split finer than one value: **jumbo chunks**"],
          ["Frequency", "Values evenly used", "`status` where 90% are \"done\"", "One shard gets most of the data"],
          ["Monotonic change", "Random or spread out", "`createdAt`, ObjectId `_id`", "All inserts hit the last range: one **hot shard**"],
          ["Query isolation", "In most query filters", "A field never used in filters", "Every query goes to **all** shards"]
        ] } },
        { code: `// Multi-tenant SaaS: tenant first for isolation, then a high-cardinality field
sh.shardCollection("app.events", { tenantId: 1, userId: 1 })

// Write-heavy with no natural key: hash for even distribution
sh.shardCollection("iot.readings", { deviceId: "hashed" })

// ✗ Classic mistake: monotonic key, all new writes go to one shard
sh.shardCollection("shop.orders", { createdAt: 1 })`, lang: "mongo" },
        { ul: [
          "**Compound keys** often work best: a field for query isolation plus a field for cardinality.",
          "The shard key needs a supporting **index** (it is created for you on an empty collection).",
          "Since 4.2 you can update a document's shard key **value**, since 4.4 refine the key, and since 5.0 reshard to a new key, but it is still costly. Choose carefully up front.",
          "Test with realistic data: `analyzeShardKey` (7.0+) reports cardinality, frequency and monotonicity of a candidate key."
        ] },
        { note: "💡 Say it like this: 'I look for high cardinality, low frequency and non-monotonic values so writes spread evenly, and I want the key in my main queries so they target one shard. A compound key like tenantId plus userId, or a hashed key, is common. createdAt alone is the classic bad choice.'", kind: "tip" }
      ]
    },

    {
      id: "hashed-vs-ranged",
      q: "What is the difference between hashed and ranged sharding? What are zones?",
      tldr: "Ranged sharding keeps documents with nearby key values together, which makes range queries efficient but can create hot spots with monotonic keys. Hashed sharding distributes by a hash of the key, which spreads writes evenly but turns range queries into queries on all shards. Zones pin key ranges to specific shards, for example to keep EU data in EU data centres.",
      tags: ["sharding"],
      seeAlso: ["mongodb-advanced/shard-key"],
      a: [
        { table: { head: ["", "Ranged `{ key: 1 }`", "Hashed `{ key: \"hashed\" }`"], rows: [
          ["Data placement", "Nearby values on the same shard", "Spread randomly by hash"],
          ["Range queries (`$gt`, sort)", "Targeted to few shards", "Sent to **all** shards"],
          ["Equality queries", "Targeted", "Targeted"],
          ["Monotonic keys (`_id`, dates)", "Hot shard on inserts", "Even distribution"],
          ["Good for", "Range scans, zones, time ranges per tenant", "Write-heavy, equality lookups"]
        ] } },
        { code: `// Zones: keep EU customers on EU shards (data residency)
sh.addShardToZone("shardEU1", "EU")
sh.addShardToZone("shardUS1", "US")

sh.shardCollection("app.customers", { region: 1, customerId: 1 })
sh.updateZoneKeyRange("app.customers",
  { region: "EU", customerId: MinKey }, { region: "EU", customerId: MaxKey }, "EU")
sh.updateZoneKeyRange("app.customers",
  { region: "US", customerId: MinKey }, { region: "US", customerId: MaxKey }, "US")`, lang: "mongo" },
        { ul: [
          "A compound shard key can mix both: `{ region: 1, userId: \"hashed\" }` (since 4.4) gives zones by region and even spread within a region.",
          "Zones are also used for **tiered storage**: recent data on fast shards, old data on cheap shards."
        ] },
        { note: "💡 Say it like this: 'Ranged sharding keeps nearby keys together, good for range queries but risky with increasing keys. Hashed sharding spreads writes evenly but range queries go everywhere. Zones pin key ranges to chosen shards, which I would use for data residency like EU data staying in the EU.'", kind: "tip" }
      ]
    },

    {
      id: "chunks-balancer",
      q: "What are chunks, the balancer and jumbo chunks?",
      tldr: "A sharded collection is divided into chunks: contiguous ranges of shard key values, each living on one shard. The balancer moves chunks between shards in the background to keep data even. A jumbo chunk is a chunk that grew too large but cannot be split, usually because too many documents share one shard key value, so it cannot be moved.",
      tags: ["sharding", "internals"],
      seeAlso: ["mongodb-advanced/shard-key", "mongodb-advanced/sharding-architecture"],
      a: [
        { code: `chunk 1: { userId: MinKey } -> { userId: "f" }   on shard A
chunk 2: { userId: "f" }    -> { userId: "m" }   on shard B
chunk 3: { userId: "m" }    -> { userId: MaxKey } on shard C`, lang: "text" },
        { ul: [
          "Default chunk (range) size is **128 MB** since MongoDB 6.0 (64 MB before).",
          "When a chunk is too big, it is **split** into two ranges; when shards are uneven, the balancer **migrates** chunks.",
          "In recent versions (6.0.3+ and 7.0) the balancer evens out **data size** per shard rather than the number of chunks.",
          "A migration copies the documents to the new shard, catches up on changes, then updates the config servers; the old copies are deleted later (**orphaned documents** exist briefly).",
          "Migrations cost I/O and network, so you can set a **balancer window** for quiet hours."
        ] },
        { code: `sh.getBalancerState()
sh.stopBalancer()        // e.g. during a backup
sh.startBalancer()

// Run the balancer only at night
use config
db.settings.updateOne(
  { _id: "balancer" },
  { $set: { activeWindow: { start: "01:00", stop: "05:00" } } },
  { upsert: true }
)`, lang: "mongo" },
        { note: "Jumbo chunks are a shard key problem: if 5 million documents have `country: \"IN\"`, that range can never be split. The fix is a key with higher cardinality (refine or reshard).", kind: "warn" },
        { note: "💡 Say it like this: 'Chunks are ranges of shard key values, each on one shard. The balancer splits and migrates them to keep data even across shards. A jumbo chunk is one that cannot be split because too many documents share a key value, which means the shard key has too low cardinality.'", kind: "tip" }
      ]
    },

    {
      id: "targeted-vs-broadcast",
      q: "What is the difference between a targeted query and a scatter-gather (broadcast) query?",
      tldr: "If the query filter includes the shard key (or its prefix), mongos knows which shard holds the data and sends the query only there: a targeted query. Without the shard key, mongos must ask every shard and merge the answers: a scatter-gather query, which gets slower as the cluster grows.",
      tags: ["sharding", "performance"],
      seeAlso: ["mongodb-advanced/shard-key"],
      a: [
        { code: `// Shard key: { customerId: 1, orderDate: 1 }

db.orders.find({ customerId: 42 })                          // ✓ targeted (key prefix)
db.orders.find({ customerId: 42, orderDate: { $gte: d } })  // ✓ targeted
db.orders.find({ orderDate: { $gte: d } })                  // ✗ scatter-gather (no prefix)
db.orders.find({ status: "paid" })                          // ✗ scatter-gather

db.orders.find({ customerId: 42 }).explain()
// winningPlan.stage: "SINGLE_SHARD"  vs  "SHARD_MERGE" for broadcast`, lang: "mongo" },
        { ul: [
          "Scatter-gather is fine for rare admin or analytics queries; it is a problem for **high-volume** queries, because every query loads every shard.",
          "A sort across shards is merged on mongos; `$group` work is split between shards and a merging step.",
          "Updates and deletes of a single document (`updateOne`, `deleteOne`) traditionally needed the shard key or `_id` in the filter. MongoDB 7.1 relaxed this, but targeting is still much cheaper.",
          "Design rule: the **most frequent** queries of the app should contain the shard key."
        ] },
        { note: "💡 Say it like this: 'If the filter contains the shard key or its prefix, mongos sends the query to just the right shard. Without it, it is scatter-gather: every shard runs the query and mongos merges the results. I choose the shard key so the hottest queries are targeted.'", kind: "tip" }
      ]
    },

    {
      id: "resharding",
      q: "Can you change a shard key? What are refineCollectionShardKey and reshardCollection?",
      tldr: "In early versions the shard key was fixed forever. Since 4.4 you can refine it by adding suffix fields (refineCollectionShardKey), which is cheap and splits jumbo chunks. Since 5.0 you can reshard to a completely new key online (reshardCollection), which copies the whole collection in the background and needs extra disk space and time.",
      tags: ["sharding", "operations"],
      seeAlso: ["mongodb-advanced/shard-key", "mongodb-advanced/chunks-balancer"],
      a: [
        { code: `// Refine: { customerId: 1 }  ->  { customerId: 1, orderId: 1 }
db.orders.createIndex({ customerId: 1, orderId: 1 })        // index must exist first
db.adminCommand({
  refineCollectionShardKey: "shop.orders",
  key: { customerId: 1, orderId: 1 }
})

// Reshard to a completely different key (5.0+)
db.adminCommand({
  reshardCollection: "shop.orders",
  key: { region: 1, orderId: "hashed" }
})`, lang: "mongo" },
        { table: { head: ["", "Refine (4.4+)", "Reshard (5.0+)"], rows: [
          ["Change", "Add fields to the end of the current key", "Any new key"],
          ["Data movement", "None at first (metadata change)", "Copies the whole collection"],
          ["Cost", "Low", "High: extra disk, CPU, network; can take hours"],
          ["Writes during it", "Normal", "Allowed; briefly blocked (about 2 s) at the end"]
        ] } },
        { ul: [
          "Since 4.2 you can also change a document's shard key **value** (inside a transaction or retryable write).",
          "Before resharding, check you have enough free disk (about 1.2x the collection size on each recipient shard) and run it at low traffic.",
          "Use `analyzeShardKey` (7.0+) to test the new key before committing to it."
        ] },
        { note: "💡 Say it like this: 'A shard key is no longer permanent. refineCollectionShardKey adds suffix fields cheaply, which helps split jumbo chunks, and reshardCollection, since 5.0, moves to a brand-new key online by copying the collection, so it needs disk headroom and a quiet time.'", kind: "tip" }
      ]
    },

    {
      id: "when-to-shard",
      q: "How do you scale MongoDB? When should you shard?",
      tldr: "First optimise queries, indexes and schema, then scale up the hardware, and use replica set secondaries for some reads. Shard when one replica set cannot hold the data or the working set in RAM, or cannot keep up with the write load, or when you need data in specific regions.",
      tags: ["scaling", "architecture"],
      seeAlso: ["mongodb-advanced/sharding-architecture", "mongodb-advanced/working-set"],
      a: [
        { ol: [
          "**Fix the basics**: indexes for every hot query, projections, a schema that matches the access patterns. Most slow systems stop here.",
          "**Scale up** (vertical): more RAM so the working set fits, faster disks, more CPU. Simple, no app change.",
          "**Read scaling** with secondaries, only for reads that tolerate slightly stale data (reports, analytics nodes).",
          "**Cache** very hot reads (Redis, or in-app) if the same data is read constantly.",
          "**Shard** (horizontal) when the limits below are reached."
        ] },
        { p: "**Signs that it is time to shard:**" },
        { ul: [
          "The data set (or working set) is bigger than what one affordable server can hold in disk or RAM.",
          "**Write** throughput is more than one primary can handle (secondaries do not help writes).",
          "Backups and restores of one huge replica set take too long.",
          "Legal **data residency**: some data must stay in a given country or region (zones)."
        ] },
        { note: "Sharding early \"just in case\" adds cost and complexity, but picking a shard key **late**, with terabytes of data, is painful. Design documents with a likely shard key in mind even before you shard.", kind: "tip" },
        { note: "💡 Say it like this: 'I scale in steps: indexes and schema first, then bigger hardware, then secondaries for stale-tolerant reads and caching. I shard when one replica set cannot hold the working set or keep up with writes, or for data residency.'", kind: "tip" }
      ]
    },

    {
      id: "causal-consistency",
      q: "What is causal consistency? How do you get read-your-own-writes in MongoDB?",
      tldr: "Causal consistency means operations that depend on each other are seen in order, so after you write something, your next read, even on a secondary, sees that write. In MongoDB you get it with a causally consistent client session plus majority read and write concern; the session passes an operation time so a lagging secondary waits until it has caught up.",
      tags: ["consistency", "replication"],
      seeAlso: ["mongodb-intermediate/read-concern", "mongodb-intermediate/read-preference"],
      a: [
        { p: "**The problem:** a user changes their name (written to the primary), the page reloads and reads from a secondary that has not replicated it yet, and the old name appears." },
        { code: `const session = db.getMongo().startSession({ causalConsistency: true })
const users = session.getDatabase("app").users

users.updateOne(
  { _id: 7 }, { $set: { name: "Asha K" } },
  { writeConcern: { w: "majority" } }
)

// Even on a secondary, this read waits until it has the write above
users.find({ _id: 7 })
  .readPref("secondary")
  .readConcern("majority")`, lang: "mongo" },
        { ul: [
          "The session tracks an **operationTime** / **clusterTime**. Reads send `afterClusterTime`, and the member waits until it has reached that time.",
          "Guarantees inside one session: read your own writes, monotonic reads, monotonic writes, and writes follow reads.",
          "The guarantees are only solid with **majority** read and write concern; with `w: 1` a rollback could break them.",
          "It works **within a session**. Two different users or services do not get it automatically."
        ] },
        { note: "The simplest answer in many apps is still: read from the **primary** right after a write.", kind: "tip" },
        { note: "💡 Say it like this: 'Causal consistency gives read-your-own-writes even on secondaries. I use a causally consistent session with majority read and write concern, and the session makes a lagging secondary wait until it has caught up to my last write.'", kind: "tip" }
      ]
    },

    {
      id: "retryable-writes",
      q: "What are retryable writes and retryable reads?",
      tldr: "With retryable writes (on by default in modern drivers), if a write fails because of a network error or a primary failover, the driver automatically retries it once against the new primary, and the server makes sure it is applied only once. Retryable reads do the same for read operations.",
      tags: ["availability", "drivers"],
      seeAlso: ["mongodb-intermediate/replica-set-elections", "mongodb-advanced/transactions"],
      a: [
        { code: `mongodb+srv://cluster0.example.net/shop?retryWrites=true&retryReads=true&w=majority`, lang: "text", caption: "both are true by default; shown for clarity" },
        { ul: [
          "The driver attaches a **transaction id** (session + number) to the write. If the retry reaches a server that already applied it, the server returns the saved result instead of applying it twice.",
          "Only **one** retry, and only for retryable errors (network errors, `NotWritablePrimary`, shutdown in progress...).",
          "Supported: `insertOne`/`insertMany`, single-document `updateOne`/`replaceOne`/`deleteOne`, `findOneAnd...`, `bulkWrite` without multi-document operations.",
          "**Not** retryable: `updateMany` and `deleteMany` (multi-document writes). Make those idempotent yourself.",
          "Needs a replica set or sharded cluster, not a standalone server."
        ] },
        { note: "Retries cover short blips like an election (a few seconds). Your app still needs error handling for longer outages and for `updateMany`.", kind: "tip" },
        { note: "💡 Say it like this: 'Retryable writes are on by default: if a single-document write fails because of a network error or failover, the driver retries it once, and the server uses a transaction id so it is never applied twice. Multi-document writes like updateMany are not retryable, so I make those idempotent.'", kind: "tip" }
      ]
    },

    {
      id: "rollbacks",
      q: "What is a rollback in a replica set and how do you avoid losing data?",
      tldr: "A rollback happens when a primary accepted writes that never reached a majority, then failed. When it rejoins as a secondary, it must undo those writes to match the new primary. MongoDB saves them in rollback files, but the app thought they had succeeded. Using w: \"majority\" prevents this, because a majority-acknowledged write can never be rolled back.",
      tags: ["replication", "durability"],
      seeAlso: ["mongodb-intermediate/write-concern", "mongodb-intermediate/replica-set-elections"],
      a: [
        { ol: [
          "The app writes with `w: 1`; the primary P1 applies it and replies \"OK\".",
          "P1 crashes **before** any secondary copies the write.",
          "The secondaries elect P2 as the new primary and continue taking writes.",
          "P1 comes back, sees its history has diverged, and **rolls back** the un-replicated writes to match P2.",
          "The rolled-back documents are written as BSON files in a `rollback` directory for manual recovery."
        ] },
        { table: { head: ["Setting", "Can the acknowledged write be rolled back?"], rows: [
          ["`w: 1`", "Yes"],
          ["`w: \"majority\"`", "No: a majority already has it, and only an up-to-date member can win the election"],
          ["`j: true` with `w: 1`", "Survives a process crash on that node, but **can still be rolled back** after failover"]
        ] } },
        { ul: [
          "`w: \"majority\"` is the default write concern since **5.0** (except some arbiter setups).",
          "Readers can see writes that later roll back if they use `readConcern: \"local\"`. Use `\"majority\"` reads for data that must not disappear.",
          "Monitor **replication lag**: the bigger the lag, the more data a `w: 1` failover can roll back."
        ] },
        { note: "💡 Say it like this: 'A rollback is when an old primary had writes that never reached a majority, and must undo them after a failover. The app had already got OK for those writes. With w: majority that cannot happen, which is why majority is the default since 5.0.'", kind: "tip" }
      ]
    },

    {
      id: "change-streams",
      q: "What are change streams and what are they used for?",
      tldr: "Change streams let an application subscribe to real-time inserts, updates, deletes and other changes on a collection, a database or the whole cluster, using watch(). They are built on the oplog, can be filtered with an aggregation pipeline, and are resumable with a resume token, so you do not miss events after a restart.",
      tags: ["real-time", "replication"],
      seeAlso: ["mongodb-intermediate/oplog"],
      a: [
        { code: `const stream = db.orders.watch(
  [ { $match: { operationType: { $in: ["insert", "update"] }, "fullDocument.status": "paid" } } ],
  { fullDocument: "updateLookup" }      // include the whole current document on updates
)

while (!stream.isClosed()) {
  const change = stream.tryNext()
  if (change) {
    printjson(change.fullDocument)
    saveResumeToken(change._id)         // persist it somewhere durable
  }
}

// After a restart: continue right after the last processed event
db.orders.watch([], { resumeAfter: loadResumeToken() })`, lang: "mongo" },
        { p: "**Typical uses:**" },
        { ul: [
          "Push live updates to clients (notifications, dashboards, chat).",
          "Keep other systems in sync: a search index, a cache, a data warehouse, Kafka (the MongoDB Kafka connector uses change streams).",
          "Event-driven microservices and the **outbox pattern**.",
          "Audit trails of what changed."
        ] },
        { ul: [
          "Requires a **replica set** or sharded cluster.",
          "You can resume only while the token is still inside the **oplog window**; after that, a full resync is needed.",
          "Since 6.0 you can also get the document **before** the change (`fullDocumentBeforeChange`) when pre-images are enabled on the collection.",
          "Events only include **majority-committed** changes, so you never see data that will be rolled back."
        ] },
        { note: "💡 Say it like this: 'Change streams let me watch a collection, database or cluster for changes in real time. They are built on the oplog, filterable with a pipeline, and resumable with a resume token. I use them to sync caches and search indexes or push live updates.'", kind: "tip" }
      ]
    },

    {
      id: "wiredtiger",
      q: "What is WiredTiger and how does it handle concurrency and durability?",
      tldr: "WiredTiger is MongoDB's default storage engine since 3.2. It gives document-level concurrency using optimistic control and MVCC snapshots, compresses data and indexes on disk, keeps hot data in its own cache, and makes writes durable with a write-ahead journal plus checkpoints every 60 seconds.",
      tags: ["internals", "storage"],
      seeAlso: ["mongodb-advanced/working-set", "mongodb-advanced/transaction-best-practices"],
      a: [
        { table: { head: ["Feature", "How it works"], rows: [
          ["Concurrency", "**Document-level**: two writes to different documents in the same collection run in parallel. Conflicting writes are detected and one is retried automatically"],
          ["MVCC", "Each operation reads a consistent **snapshot**; readers do not block writers"],
          ["Cache", "Internal cache of **50% of (RAM − 1 GB)**, or 256 MB minimum. The OS file cache holds the compressed files too"],
          ["Compression", "Collections: **snappy** by default (zstd or zlib optional). Indexes: **prefix compression**"],
          ["Journal", "Write-ahead log, flushed to disk every **100 ms** (or immediately with `j: true`)"],
          ["Checkpoints", "A consistent snapshot of all data written to disk every **60 seconds**"]
        ] } },
        { p: "**Crash recovery:** on restart, WiredTiger loads the last checkpoint and replays the journal after it, so at most about 100 ms of un-journaled writes can be lost (none with `j: true`, and on a replica set the other members have them anyway)." },
        { code: `db.serverStatus().wiredTiger.cache["bytes currently in the cache"]
db.serverStatus().wiredTiger.cache["maximum bytes configured"]
db.orders.stats().wiredTiger.creationString   // shows block_compressor=snappy etc.

// Choose stronger compression for a cold archive collection
db.createCollection("archive", { storageEngine: { wiredTiger: { configString: "block_compressor=zstd" } } })`, lang: "mongo" },
        { note: "The old MMAPv1 engine (collection-level locking, no compression) was removed in MongoDB 4.2. If an interviewer asks about \"global lock\" problems, that is history.", kind: "tip" },
        { note: "💡 Say it like this: 'WiredTiger is the default storage engine. It gives document-level concurrency with MVCC snapshots, compresses data with snappy and indexes with prefix compression, keeps hot data in a cache of about half the RAM, and is durable thanks to a journal flushed every 100 ms plus checkpoints every minute.'", kind: "tip" }
      ]
    },

    {
      id: "working-set",
      q: "What is the working set, and why does RAM matter so much for MongoDB?",
      tldr: "The working set is the data and indexes your application touches regularly. When it fits in the WiredTiger cache, reads come from memory and are fast. When it does not, MongoDB keeps reading from disk and evicting pages, and latency jumps. Sizing RAM for the working set, especially for indexes, is the most important capacity decision.",
      tags: ["performance", "capacity"],
      seeAlso: ["mongodb-advanced/wiredtiger", "mongodb-advanced/when-to-shard"],
      a: [
        { ul: [
          "The working set is **not** the whole database: an orders app may touch only the last 30 days of orders plus all indexes.",
          "**Indexes** are used on almost every query, so they should fit in RAM fully.",
          "Signs it does not fit: high disk read I/O, a cache that is always full, many pages read into cache, and `application threads page eviction` stats rising.",
          "Ways to shrink it: remove unused indexes, use **partial** indexes, project only needed fields, archive old data, use more compact schemas (shorter arrays, the bucket pattern)."
        ] },
        { code: `// Total index size per collection: should fit in memory alongside hot data
db.orders.totalIndexSize()
db.orders.stats({ scale: 1024 * 1024 })      // sizes in MB

// Cache pressure indicators
const c = db.serverStatus().wiredTiger.cache
c["bytes currently in the cache"] / c["maximum bytes configured"]   // near 0.95+ = pressure
c["pages read into cache"]                                           // keeps climbing fast = disk reads`, lang: "mongo" },
        { note: "Atlas and Ops Manager show these as charts (cache usage, disk IOPS, page faults). In an interview, name the metrics and what they tell you.", kind: "tip" },
        { note: "💡 Say it like this: 'The working set is the hot data plus indexes the app uses all the time. It should fit in the WiredTiger cache; if it does not, every query goes to disk and latency spikes. I keep indexes lean, archive cold data, and size RAM for the working set.'", kind: "tip" }
      ]
    },

    {
      id: "performance-troubleshooting",
      q: "How do you find and fix slow queries in production?",
      tldr: "Find them with the slow query log and the database profiler (or Atlas Query Profiler and Performance Advisor), look at running operations with $currentOp, then run explain on the bad query shapes. The usual fixes are a better index (following ESR), a narrower projection, a schema change, or rewriting the query or pipeline.",
      tags: ["performance", "operations"],
      seeAlso: ["mongodb-intermediate/explain", "mongodb-advanced/index-strategy"],
      a: [
        { code: `// 1. Profile operations slower than 100 ms on this database
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ millis: -1 }).limit(5)
// look at: planSummary (COLLSCAN?), docsExamined vs nreturned, hasSortStage

// 2. What is running right now, and for how long?
db.currentOp({ active: true, secs_running: { $gte: 5 } })
db.killOp(12345)                                // stop a runaway query

// 3. Explain the query shape found above
db.orders.find({ status: "paid", city: "Pune" }).sort({ createdAt: -1 })
  .explain("executionStats")

// 4. Which indexes are actually used?
db.orders.aggregate([ { $indexStats: {} } ])`, lang: "mongo" },
        { table: { head: ["Symptom", "Likely fix"], rows: [
          ["`COLLSCAN` on a big collection", "Add an index for the filter"],
          ["`SORT` stage in memory", "Index that matches the sort (ESR order)"],
          ["docsExamined ≫ nReturned", "More selective or compound index"],
          ["Big documents returned", "Projection, or the subset pattern"],
          ["Slow `$lookup`", "Index `foreignField`, or embed / extended reference"],
          ["Many slow ops at once, high CPU", "Look for one bad query shape repeated thousands of times"],
          ["Disk I/O high, cache full", "Working set does not fit: RAM, fewer indexes, archive"]
        ] } },
        { ul: [
          "Even with profiling off, every operation slower than `slowms` (100 ms) is written to the **log**.",
          "Profiling level 2 (everything) is heavy; use it only briefly.",
          "Set `maxTimeMS` on queries so one bad query cannot run forever.",
          "Tools: `mongostat`, `mongotop`, Atlas **Performance Advisor** (suggests indexes) and **Query Insights**."
        ] },
        { note: "💡 Say it like this: 'I find slow query shapes in the slow query log or profiler, check what is running with currentOp, then run explain with executionStats. Usually the fix is an ESR-ordered compound index, a projection, or a schema tweak, and I set maxTimeMS as a safety net.'", kind: "tip" }
      ]
    },

    {
      id: "index-strategy",
      q: "How do you design an indexing strategy for a large collection?",
      tldr: "Index for your real query shapes, not for every field: a few well-ordered compound indexes (ESR) that serve several queries through their prefixes. Remove unused and redundant indexes, use partial indexes for hot subsets, test removals safely with hidden indexes, and remember each index costs RAM and write speed.",
      tags: ["indexes", "performance"],
      seeAlso: ["mongodb-intermediate/compound-indexes", "mongodb-intermediate/index-options", "mongodb-advanced/performance-troubleshooting"],
      a: [
        { ol: [
          "**List the query shapes** (filter + sort + projection) and how often each runs.",
          "Design **compound indexes** in ESR order that cover the frequent shapes; let one index serve several queries via its **prefixes**.",
          "Prefer **selective** leading fields for equality; a boolean as the only field rarely helps.",
          "Use **partial indexes** when queries always target a subset (`status: \"active\"`).",
          "**Drop redundant** indexes: `{ a: 1 }` is redundant if `{ a: 1, b: 1 }` exists.",
          "Find **unused** indexes with `$indexStats` and verify with a hidden index before dropping.",
          "Keep the total index size within RAM; watch write latency as indexes grow."
        ] },
        { code: `// Hide an index: the planner ignores it but it is still maintained (4.4+)
db.orders.hideIndex("status_1_createdAt_-1")
// ...watch performance for a few days. If something breaks:
db.orders.unhideIndex("status_1_createdAt_-1")   // instant, no rebuild
// If nothing broke:
db.orders.dropIndex("status_1_createdAt_-1")`, lang: "mongo" },
        { ul: [
          "A collection can have at most **64 indexes**, but if you are anywhere near that, the design is wrong.",
          "Index builds (since 4.2) hold an exclusive lock only at the start and end, so they run online, but they still use I/O. On big clusters, build in a **rolling** fashion or at quiet times.",
          "**Index intersection** (using two indexes for one query) exists but is rarely chosen. Do not rely on it; build a compound index.",
          "Low-cardinality fields (`isActive`, `gender`) are better as later fields in a compound index or in a partial filter."
        ] },
        { note: "💡 Say it like this: 'I index for query shapes, not fields: a few ESR-ordered compound indexes that serve many queries through prefixes, partial indexes for hot subsets, and I remove unused or redundant ones, testing first with a hidden index. Every index costs RAM and write speed.'", kind: "tip" }
      ]
    },

    {
      id: "collation",
      q: "How do you do case-insensitive queries and language-aware sorting efficiently?",
      tldr: "Use a collation: rules for comparing strings in a given language. With strength 2, \"asha\" equals \"ASHA\". Create the index with the same collation and pass it in the query (or set it as the collection's default), so case-insensitive queries use the index instead of a slow case-insensitive regex.",
      tags: ["queries", "indexes"],
      seeAlso: ["mongodb-basic/regex"],
      a: [
        { code: `// Index with a case-insensitive collation
db.users.createIndex(
  { email: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
)

// ✓ Uses the index: same collation in the query
db.users.find({ email: "Asha@Example.com" }).collation({ locale: "en", strength: 2 })

// ✗ Does not use it: no collation, simple binary comparison
db.users.find({ email: "Asha@Example.com" })

// Collection default: every query and index uses it unless overridden
db.createCollection("customers", { collation: { locale: "en", strength: 2 } })`, lang: "mongo" },
        { table: { head: ["Strength", "Ignores"], rows: [
          ["1", "Case **and** accents (`e` = `E` = `é`)"],
          ["2", "Case only (`e` = `E`, but `e` ≠ `é`)"],
          ["3 (default)", "Nothing: case and accents both matter"]
        ] } },
        { ul: [
          "The unique index above also makes emails unique **case-insensitively**.",
          "Collation also fixes sorting for languages (German, Swedish...) and `numericOrdering: true` sorts \"10\" after \"9\".",
          "The alternative is storing a normalised copy (`emailLower`) and indexing that. Simple and works everywhere, but it is extra data to keep in sync."
        ] },
        { note: "💡 Say it like this: 'For case-insensitive matching I use a collation with strength 2, create the index with the same collation and pass it in the query, so it uses the index instead of a slow /i regex. It also makes a unique index case-insensitive.'", kind: "tip" }
      ]
    },

    {
      id: "schema-patterns",
      q: "What are the common MongoDB schema design patterns?",
      tldr: "Reusable solutions for common data shapes: Attribute (varied fields as key-value pairs), Bucket (group many small items into one document), Computed (store precomputed values), Subset (embed only the hot part), Extended Reference (copy a few fields of a referenced document), Outlier (handle the rare huge case separately), Polymorphic and Schema Versioning.",
      tags: ["design", "schema"],
      seeAlso: ["mongodb-basic/embed-vs-reference", "mongodb-intermediate/one-to-many", "mongodb-advanced/anti-patterns"],
      a: [
        { table: { head: ["Pattern", "Problem it solves", "Example"], rows: [
          ["**Attribute**", "Many optional, varied fields need indexing", "`specs: [ { k: \"ram\", v: \"16GB\" }, { k: \"color\", v: \"red\" } ]` + index on `specs.k, specs.v`"],
          ["**Bucket**", "Huge numbers of tiny documents (IoT, logs)", "One document per sensor per hour with an array of readings"],
          ["**Computed**", "The same expensive calculation on every read", "Store `ratingAvg`, `reviewCount`; update them on write"],
          ["**Subset**", "Big documents, but only part is shown often", "Embed the 10 newest reviews; keep all reviews in another collection"],
          ["**Extended reference**", "A `$lookup` on every read", "Copy `{ customerId, name, city }` into each order"],
          ["**Outlier**", "A few documents are far bigger than the rest", "A celebrity with millions of followers gets `hasOverflow: true` + overflow docs"],
          ["**Polymorphic**", "Different kinds of things in one collection", "`products` with `type: \"book\"` or `\"laptop\"` and different fields"],
          ["**Schema versioning**", "Changing shape without downtime", "`schemaVersion: 2`; the app reads both versions and migrates lazily"],
          ["**Approximation**", "Exact counters cause too many writes", "Update the page-view counter every 100 views"],
          ["**Tree**", "Hierarchies (categories)", "Store `parent` plus `ancestors: [ ... ]` for fast subtree queries"]
        ] } },
        { code: `// Extended reference + subset + computed in one product document
{
  _id: "P-1",
  name: "Noise-cancelling headphones",
  brand: { _id: "B-9", name: "Acme" },          // extended reference
  ratingAvg: 4.6, reviewCount: 1280,             // computed
  recentReviews: [ /* last 10 reviews only */ ]  // subset
}`, lang: "mongo" },
        { note: "The guiding idea behind all of them: **design for how the app reads and writes**, not for normalisation. Duplicating a little data is fine when it removes a join from a hot path.", kind: "tip" },
        { note: "💡 Say it like this: 'MongoDB schema patterns are standard answers to access problems: Bucket for many tiny records, Computed to precalculate, Subset to embed only the hot part, Extended Reference to avoid joins, Outlier for rare huge documents, Attribute for varied fields, and Schema Versioning for changes.'", kind: "tip" }
      ]
    },

    {
      id: "time-series",
      q: "What are time series collections and the bucket pattern?",
      tldr: "The bucket pattern groups many small measurements into one document (for example one per sensor per hour) to cut document count, index size and storage. Since MongoDB 5.0, time series collections do this bucketing automatically: you insert one document per measurement, and MongoDB stores them in compressed buckets by time and metadata.",
      tags: ["design", "time-series"],
      seeAlso: ["mongodb-advanced/schema-patterns", "mongodb-advanced/window-functions"],
      a: [
        { code: `// Manual bucket pattern: one document per sensor per hour
{
  sensorId: "S-12",
  hour: ISODate("2026-11-16T10:00:00Z"),
  count: 3, sum: 72.9,                       // computed values for quick averages
  readings: [ { t: ISODate("...10:00:05Z"), v: 24.1 }, { t: ISODate("...10:00:10Z"), v: 24.3 } ]
}`, lang: "mongo" },
        { code: `// Native time series collection (5.0+): MongoDB buckets for you
db.createCollection("readings", {
  timeseries: {
    timeField: "ts",          // required: the timestamp
    metaField: "sensor",      // what identifies the series (labels that rarely change)
    granularity: "seconds"    // hint for bucket size: seconds | minutes | hours
  },
  expireAfterSeconds: 60 * 60 * 24 * 90      // keep 90 days
})

db.readings.insertOne({ ts: new Date(), sensor: { id: "S-12", site: "Pune" }, temp: 24.1 })

db.readings.aggregate([
  { $match: { "sensor.id": "S-12", ts: { $gte: ISODate("2026-11-16") } } },
  { $group: { _id: { $dateTrunc: { date: "$ts", unit: "hour" } }, avgTemp: { $avg: "$temp" } } }
])`, lang: "mongo" },
        { ul: [
          "Time series collections store data **columnar and compressed** inside each bucket: far less disk and RAM than one plain document per reading.",
          "Writes work best when inserts arrive roughly **in time order** per series.",
          "Use the `metaField` for the series identity (device, site) and never for values that change every reading.",
          "Updates and deletes are more limited than in normal collections; they are designed for append-mostly data."
        ] },
        { note: "💡 Say it like this: 'For IoT or metrics I avoid one document per reading. The bucket pattern groups readings into one document per device per hour, and since 5.0 time series collections do that automatically with compression, plus automatic expiry.'", kind: "tip" }
      ]
    },

    {
      id: "window-functions",
      q: "What does $setWindowFields do?",
      tldr: "$setWindowFields (since 5.0) adds window functions to aggregation, like SQL's OVER (PARTITION BY ... ORDER BY ...). For each document it computes a value over a window of related documents, without collapsing them like $group does: running totals, moving averages, ranks, and differences from the previous row.",
      tags: ["aggregation", "analytics"],
      seeAlso: ["mongodb-intermediate/group-accumulators", "mongodb-advanced/time-series"],
      a: [
        { code: `db.sales.aggregate([
  { $setWindowFields: {
      partitionBy: "$storeId",                 // like PARTITION BY
      sortBy: { day: 1 },                      // like ORDER BY
      output: {
        runningTotal: { $sum: "$amount",
                        window: { documents: ["unbounded", "current"] } },
        movingAvg7:   { $avg: "$amount",
                        window: { documents: [-6, "current"] } },     // last 7 rows
        rankInStore:  { $rank: {} },
        prevAmount:   { $shift: { output: "$amount", by: -1, default: 0 } }
      }
  } }
])`, lang: "mongo" },
        { table: { head: ["$group", "$setWindowFields"], rows: [
          ["One output document per group", "Every input document is kept"],
          ["Totals per group", "Running / moving values per document"],
          ["Like `GROUP BY`", "Like `SUM(...) OVER (PARTITION BY ... ORDER BY ...)`"]
        ] } },
        { ul: [
          "`documents` windows count rows; `range` windows use values, for example `range: [-7, 0], unit: \"day\"` for the last 7 calendar days even with gaps.",
          "Functions include `$sum`, `$avg`, `$min`, `$max`, `$rank`, `$denseRank`, `$documentNumber`, `$shift`, `$derivative`, `$integral`, `$expMovingAvg`.",
          "Put an indexed `$match` and `$sort` (matching partition + sort) before it to keep it fast."
        ] },
        { note: "💡 Say it like this: '$setWindowFields is SQL window functions in MongoDB: partitionBy and sortBy define the window, and I compute running totals, moving averages, ranks or previous values for each document without collapsing them like $group would.'", kind: "tip" }
      ]
    },

    {
      id: "graph-lookup",
      q: "How do you query hierarchical or graph data with $graphLookup?",
      tldr: "$graphLookup does a recursive search inside one collection: starting from a value, it follows a field to the next documents again and again, like walking up a reporting line or through friends of friends. You can limit the depth and record how deep each match was.",
      tags: ["aggregation", "design"],
      seeAlso: ["mongodb-intermediate/lookup", "mongodb-advanced/aggregation-limits"],
      a: [
        { code: `// employees: { _id: "e5", name: "Ravi", managerId: "e2" }

// The full management chain above Ravi
db.employees.aggregate([
  { $match: { _id: "e5" } },
  { $graphLookup: {
      from: "employees",
      startWith: "$managerId",       // where to start
      connectFromField: "managerId", // follow this field...
      connectToField: "_id",         // ...to documents with this value
      as: "chain",
      maxDepth: 10,
      depthField: "level"            // 0 = direct manager, 1 = their manager, ...
  } }
])`, lang: "mongo" },
        { ul: [
          "Good for org charts, category trees, bill of materials, \"people you may know\" up to 2 hops.",
          "**Index** `connectToField`, or every step scans the collection.",
          "It must stay within the **100 MB** memory limit and cannot spill to disk, so limit the depth and filter with `restrictSearchWithMatch`.",
          "For deep, heavy graph workloads (shortest paths, many hops) a graph database is a better fit. For trees you can also store an **ancestors array** and query it with a normal index."
        ] },
        { note: "💡 Say it like this: '$graphLookup is a recursive lookup within a collection: it follows a field like managerId from document to document, with maxDepth to limit it and depthField to show the level. It is fine for trees and short hops; for heavy graph work I would use a graph database.'", kind: "tip" }
      ]
    },

    {
      id: "aggregation-limits",
      q: "What are the memory and size limits of aggregation, and how do you work around them?",
      tldr: "Each blocking stage such as $group or $sort may use 100 MB of RAM; beyond that it must spill to disk, which is allowed by default since 6.0 (allowDiskUse). Every output document must be under 16 MB, and some stages, like $graphLookup, cannot spill at all. Work around them by filtering early, projecting less, using indexes for sorts, and writing big results out with $merge.",
      tags: ["aggregation", "limits"],
      seeAlso: ["mongodb-intermediate/pipeline-optimization", "mongodb-intermediate/views"],
      a: [
        { table: { head: ["Limit", "Detail", "Workaround"], rows: [
          ["100 MB per stage", "`$group`, `$sort`, `$bucket`, `$setWindowFields` ...", "Spill with `allowDiskUse` (default true since 6.0), filter first"],
          ["16 MB per document", "Includes `$group` results with `$push` and the single `$facet` output", "`$limit` inside, avoid giant arrays"],
          ["`$graphLookup`", "100 MB and **no** disk spill", "`maxDepth`, `restrictSearchWithMatch`"],
          ["Time", "No limit by default", "Set `maxTimeMS`"],
          ["Pipeline length", "At most 1,000 stages", "Never a real problem"]
        ] } },
        { code: `db.events.aggregate(
  [
    { $match: { ts: { $gte: ISODate("2026-01-01") } } },     // index, fewer docs
    { $project: { userId: 1, type: 1 } },                    // drop big fields early
    { $group: { _id: { userId: "$userId", type: "$type" }, n: { $sum: 1 } } },
    { $merge: { into: "userEventCounts" } }                  // big result -> collection
  ],
  { allowDiskUse: true, maxTimeMS: 120000 }
)`, lang: "mongo" },
        { ul: [
          "Spilling to disk works but is **much slower**. If a pipeline spills often, fix the pipeline or pre-aggregate.",
          "The **result** of `aggregate()` is a cursor, so the total result can be larger than 16 MB; only each document is limited.",
          "Run heavy analytics on an **analytics node** or a secondary (read preference with tags) so the primary is not affected."
        ] },
        { note: "💡 Say it like this: 'Each blocking stage gets 100 MB of RAM, then spills to disk, which is on by default since 6.0 but slow. Each output document is capped at 16 MB, and $graphLookup cannot spill. I filter and project early, sort with an index, and use $merge for big outputs.'", kind: "tip" }
      ]
    },

    {
      id: "anti-patterns",
      q: "What are common MongoDB schema anti-patterns?",
      tldr: "Unbounded arrays that grow forever, bloated documents that carry rarely used data, massive numbers of collections, unnecessary indexes, separating data that is always read together (needing $lookup everywhere), and case-insensitive queries without a matching index. Each one hurts memory, performance or the 16 MB limit.",
      tags: ["design", "performance"],
      seeAlso: ["mongodb-advanced/schema-patterns", "mongodb-basic/document-size-limit"],
      a: [
        { table: { head: ["Anti-pattern", "Why it hurts", "Fix"], rows: [
          ["**Unbounded arrays**", "Documents grow toward 16 MB; every update rewrites a huge doc; huge multikey indexes", "Reference children, bucket, or `$push` with `$slice`"],
          ["**Bloated documents**", "Working set fills with data no one reads", "Subset pattern: move rarely used parts out"],
          ["**Massive number of collections**", "Each collection and index is a file with overhead; thousands slow everything", "One collection with a `tenantId` / `type` field"],
          ["**Unnecessary indexes**", "Waste RAM, slow every write", "`$indexStats`, drop unused and redundant ones"],
          ["**Separating data read together**", "`$lookup` on every request", "Embed or extended reference"],
          ["**Case-insensitive regex queries**", "`/x/i` cannot use the index efficiently", "Collation index or normalised field"],
          ["**One collection per day / per user**", "Hard to query across, too many files", "Time series collection or a date field + TTL"]
        ] } },
        { code: `// ✗ Unbounded: comments grow forever inside the post
{ _id: "post1", title: "...", comments: [ /* 200,000 comments */ ] }

// ✓ Comments reference the post; the post keeps only a count and the latest few
{ _id: "post1", title: "...", commentCount: 200000, latestComments: [ /* 5 */ ] }
{ _id: ObjectId("..."), postId: "post1", by: "Asha", text: "...", at: ISODate("...") }`, lang: "mongo" },
        { note: "Atlas **Performance Advisor** and **Schema Anti-Patterns** in Data Explorer flag several of these automatically.", kind: "tip" },
        { note: "💡 Say it like this: 'The big anti-patterns are unbounded arrays, bloated documents, thousands of collections, unused indexes, splitting data that is always read together, and case-insensitive regex without an index. Each one wastes memory or makes the hot path slow.'", kind: "tip" }
      ]
    },

    {
      id: "security",
      q: "How do you secure a MongoDB deployment?",
      tldr: "Turn on authentication and role-based access control, give each app user only the roles it needs, encrypt traffic with TLS, bind to private networks with a firewall or IP allow-list, encrypt data at rest, enable auditing, and keep MongoDB patched. Self-managed MongoDB does not enforce authentication until you enable it.",
      tags: ["security"],
      seeAlso: ["mongodb-advanced/nosql-injection", "mongodb-advanced/encryption"],
      a: [
        { table: { head: ["Layer", "What to do"], rows: [
          ["**Authentication**", "`security.authorization: enabled`; SCRAM-SHA-256, x.509 certificates, or LDAP / Kerberos / OIDC (Enterprise, Atlas)"],
          ["**Authorization (RBAC)**", "Least privilege: `read` / `readWrite` on one database for apps, admin roles only for people"],
          ["**Network**", "`bindIp` to private addresses (localhost is the default since 3.6), firewall, VPC peering or private endpoints, Atlas IP access list"],
          ["**Encryption in transit**", "TLS for clients and between members"],
          ["**Encryption at rest**", "WiredTiger encrypted storage (Enterprise), or disk / cloud encryption; always on in Atlas"],
          ["**Field-level**", "Client-Side Field Level Encryption or Queryable Encryption for the most sensitive fields"],
          ["**Auditing**", "Audit log of logins, schema changes and access (Enterprise, Atlas)"],
          ["**Hardening**", "Disable server-side JavaScript if unused, run as a non-root user, keep versions patched"]
        ] } },
        { code: `use admin
db.createUser({
  user: "orders_api",
  pwd: passwordPrompt(),                          // never hard-code passwords
  roles: [ { role: "readWrite", db: "shop" } ]    // only what the app needs
})

// A custom role: can read orders and update only the status field's collection
db.createRole({
  role: "orderSupport",
  privileges: [ { resource: { db: "shop", collection: "orders" }, actions: ["find", "update"] } ],
  roles: []
})`, lang: "mongo" },
        { note: "Thousands of databases have been wiped by ransom bots because they were open to the internet without authentication. Never expose port 27017 publicly.", kind: "warn" },
        { note: "💡 Say it like this: 'I enable authentication and least-privilege roles, keep the database on a private network with TLS, encrypt data at rest, use field-level encryption for very sensitive fields, audit access, and never expose port 27017 to the internet.'", kind: "tip" }
      ]
    },

    {
      id: "nosql-injection",
      q: "What is NoSQL injection in MongoDB and how do you prevent it?",
      tldr: "If an app puts user input straight into a query object, an attacker can send an operator instead of a value, for example { \"$ne\": null } as the password, and change what the query means. Prevent it by validating and casting input types, never building queries or $where/$function JavaScript from strings, and using sanitising middleware or schema libraries.",
      tags: ["security"],
      seeAlso: ["mongodb-advanced/security"],
      a: [
        { code: `// ✗ Vulnerable Express login: req.body goes straight into the filter
app.post("/login", async (req, res) => {
  const user = await db.collection("users").findOne({
    username: req.body.username,
    password: req.body.password
  })
  // ...
})

// Attacker sends JSON:
// { "username": "admin", "password": { "$ne": null } }
// The filter becomes password != null  ->  logged in as admin without a password`, lang: "javascript" },
        { code: `// ✓ Validate types: a password must be a string, never an object
const { username, password } = req.body
if (typeof username !== "string" || typeof password !== "string") {
  return res.status(400).send("Bad request")
}
const user = await db.collection("users").findOne({ username })
const ok = user && await bcrypt.compare(password, user.passwordHash)   // never store plain passwords`, lang: "javascript" },
        { ul: [
          "Validate every request body with a schema library (zod, Joi, class-validator, or typed DTOs in C#).",
          "Strip keys starting with `$` or containing `.` (for example `express-mongo-sanitize`).",
          "Never use `$where`, `$function` or `mapReduce` with user input; disable server-side JavaScript (`security.javascriptEnabled: false`) if you do not need it.",
          "Escape user input used in `$regex`, or a pattern can be used for a ReDoS attack.",
          "Typed drivers (C#, Java) are safer by default, but building a `BsonDocument` from raw JSON input has the same risk."
        ] },
        { note: "💡 Say it like this: 'NoSQL injection is when user input becomes a query operator, like sending { $ne: null } as a password. I validate and cast input types, never pass req.body straight into a filter, strip $ keys, avoid $where, and hash passwords.'", kind: "tip" }
      ]
    },

    {
      id: "encryption",
      q: "What is the difference between encryption at rest, Client-Side Field Level Encryption and Queryable Encryption?",
      tldr: "Encryption at rest encrypts the data files on disk, but the server sees plain data. Client-Side Field Level Encryption (CSFLE, 4.2+) encrypts chosen fields in the driver, so the server, DBAs and backups only ever see ciphertext. Queryable Encryption (GA in 7.0) also encrypts in the driver but lets you run equality (and, since 8.0, range) queries on the encrypted fields.",
      tags: ["security", "encryption"],
      seeAlso: ["mongodb-advanced/security"],
      a: [
        { table: { head: ["", "At rest", "CSFLE", "Queryable Encryption"], rows: [
          ["Where it is encrypted", "Storage engine on the server", "Driver, before sending", "Driver, before sending"],
          ["Server / DBA can read it", "Yes", "No", "No"],
          ["Protects against", "Stolen disks or backup files", "Also a compromised server or admin", "Same as CSFLE"],
          ["Querying encrypted fields", "Normal", "Equality only with deterministic mode", "Equality; range since 8.0; randomised encryption"],
          ["Keys", "Server keystore / KMIP", "Customer master key in a KMS (AWS, Azure, GCP, KMIP)", "Same"]
        ] } },
        { code: `// Conceptual: what the server stores for a CSFLE / QE field
{
  _id: 1,
  name: "Asha",                                   // plain
  ssn: BinData(6, "AWNkTYTCw89Ss1DPzV3/...")       // ciphertext, the server cannot read it
}`, lang: "mongo" },
        { ul: [
          "Both CSFLE and QE use **envelope encryption**: data keys are stored (encrypted) in a key vault collection; the master key stays in your KMS.",
          "Use them for PII and regulated data (national IDs, card data, health records) to meet GDPR, HIPAA or PCI-DSS needs.",
          "Trade-offs: encrypted fields cannot be sorted or used in most aggregation operators, and the app needs KMS access.",
          "Deleting a customer's data key makes their encrypted data unreadable: a practical way to do \"right to be forgotten\" (crypto-shredding)."
        ] },
        { note: "💡 Say it like this: 'Encryption at rest protects the files, but the server still sees plain data. CSFLE and Queryable Encryption encrypt fields in the driver with keys from a KMS, so the server and DBAs see only ciphertext. Queryable Encryption, GA in 7.0, still lets me query those fields.'", kind: "tip" }
      ]
    },

    {
      id: "backup-restore",
      q: "How do you back up and restore MongoDB? What is point-in-time recovery?",
      tldr: "For small databases, mongodump and mongorestore make logical BSON backups. For production, use filesystem or cloud snapshots, or a managed service (Atlas Cloud Backup, Ops Manager), which can also do point-in-time recovery by replaying the oplog to any second. Whatever you choose, test restores regularly.",
      tags: ["operations", "backup"],
      seeAlso: ["mongodb-intermediate/oplog"],
      a: [
        { code: `# Logical backup of the whole replica set; --oplog makes it consistent to one point in time
mongodump --uri="mongodb://backup_user@host1,host2/?replicaSet=rs0" --oplog --gzip --out=/backups/2026-11-16

# Restore, replaying the captured oplog for a consistent point
mongorestore --uri="mongodb://..." --oplogReplay --gzip /backups/2026-11-16

# One collection, to a different name
mongorestore --nsFrom="shop.orders" --nsTo="shop.orders_restored" --gzip /backups/2026-11-16`, lang: "bash" },
        { table: { head: ["Method", "Good for", "Watch out"], rows: [
          ["`mongodump` / `mongorestore`", "Small data, migrations, single collections", "Slow on large data; rebuilds indexes on restore; not a consistent backup of a sharded cluster"],
          ["Filesystem / volume snapshots", "Large replica sets", "Journal on the same volume, or `fsyncLock` while snapshotting"],
          ["Atlas Cloud Backup / Ops Manager", "Production, sharded clusters", "Cost; but includes scheduling, retention and PITR"],
          ["Delayed secondary", "Recover from a recent mistake", "Not a real backup (same cluster)"]
        ] } },
        { ul: [
          "**Point-in-time recovery (PITR)**: restore the last snapshot, then replay the oplog up to the second **before** the mistake (\"someone ran deleteMany at 14:03:21\").",
          "Back up from a **secondary** (often a hidden one) so the primary is not loaded.",
          "Follow 3-2-1: several copies, different media, one off-site; and **encrypt** backups.",
          "Define **RPO** (how much data you can lose) and **RTO** (how long a restore may take), then pick the method that meets them."
        ] },
        { note: "A backup you have never restored is only a hope. Schedule restore drills.", kind: "warn" },
        { note: "💡 Say it like this: 'mongodump and mongorestore are fine for small data and migrations. For production I use snapshots or Atlas Cloud Backup with point-in-time recovery, which replays the oplog to just before an incident. I back up from a secondary and test restores against our RPO and RTO.'", kind: "tip" }
      ]
    },

    {
      id: "connection-pooling",
      q: "How should an application manage MongoDB connections?",
      tldr: "Create one MongoClient per application process and reuse it everywhere; it is thread-safe and keeps a connection pool (100 connections by default). Do not open a client per request. Tune maxPoolSize, timeouts and retries for your workload, and in serverless functions create the client outside the handler so warm invocations reuse it.",
      tags: ["drivers", "performance"],
      seeAlso: ["mongodb-advanced/retryable-writes"],
      a: [
        { code: `mongodb+srv://orders_api@cluster0.example.net/shop
  ?maxPoolSize=50
  &minPoolSize=5
  &maxIdleTimeMS=60000
  &waitQueueTimeoutMS=5000
  &serverSelectionTimeoutMS=5000
  &retryWrites=true
  &w=majority
  &appName=orders-api`, lang: "text", caption: "connection string options (shown on separate lines for reading)" },
        { code: `// ✓ Serverless / Node: client created once per container, outside the handler
const client = new MongoClient(process.env.MONGODB_URI)
const ready = client.connect()

export async function handler(event) {
  await ready
  return client.db("shop").collection("orders").findOne({ _id: event.id })
}`, lang: "javascript" },
        { table: { head: ["Option", "Meaning"], rows: [
          ["`maxPoolSize`", "Max connections per server (default 100)"],
          ["`minPoolSize`", "Keep some warm connections"],
          ["`waitQueueTimeoutMS`", "How long a request waits for a free connection"],
          ["`serverSelectionTimeoutMS`", "How long to look for a suitable server (default 30 s); lower it to fail fast"],
          ["`appName`", "Shows up in logs and `currentOp`, so you know which service ran a query"]
        ] } },
        { ul: [
          "Each server connection costs about **1 MB** of RAM on the database. 50 app instances x 100 connections x 3 members adds up fast.",
          "In C#, register `MongoClient` as a **singleton** in dependency injection; in Java and Python, create it once at startup.",
          "Use `mongodb+srv://` so the driver discovers all members from DNS."
        ] },
        { note: "💡 Say it like this: 'I create one MongoClient per process, as a singleton, and reuse it; it holds a thread-safe pool of about 100 connections by default. I tune the pool size and timeouts, set an appName, and in serverless I create the client outside the handler so it is reused.'", kind: "tip" }
      ]
    },

    {
      id: "atlas-search",
      q: "What are Atlas Search and Atlas Vector Search?",
      tldr: "Atlas Search is full-text search built into MongoDB Atlas using Apache Lucene, queried with the $search aggregation stage: fuzzy matching, autocomplete, facets, highlighting and relevance scoring. Atlas Vector Search stores embeddings and finds the most similar ones with $vectorSearch, which powers semantic search and RAG for AI apps, right next to your operational data.",
      tags: ["search", "ai"],
      seeAlso: ["mongodb-intermediate/text-search"],
      a: [
        { code: `// Atlas Search: typo-tolerant search across name and description
db.products.aggregate([
  { $search: {
      index: "default",
      text: { query: "wireles hedphones", path: ["name", "description"],
              fuzzy: { maxEdits: 2 } }
  } },
  { $limit: 10 },
  { $project: { name: 1, price: 1, score: { $meta: "searchScore" } } }
])`, lang: "mongo" },
        { code: `// Vector Search: the 5 documents closest in meaning to a question
db.docs.aggregate([
  { $vectorSearch: {
      index: "docs_vector_index",
      path: "embedding",                 // array of numbers from an embedding model
      queryVector: questionEmbedding,    // the question, embedded by the same model
      numCandidates: 200,                // how many to consider (approximate search)
      limit: 5,
      filter: { language: "en" }
  } },
  { $project: { title: 1, chunk: 1, score: { $meta: "vectorSearchScore" } } }
])`, lang: "mongo" },
        { table: { head: ["", "`$text` (text index)", "Atlas Search `$search`", "Vector Search `$vectorSearch`"], rows: [
          ["Matches", "Exact words (stemmed)", "Words, fuzzy, phrases, autocomplete", "Meaning (similar vectors)"],
          ["Engine", "MongoDB server", "Lucene (separate `mongot` process)", "Approximate nearest neighbour (HNSW)"],
          ["Freshness", "Immediate", "Eventually consistent (synced from the change stream)", "Eventually consistent"]
        ] } },
        { ul: [
          "`$search` / `$vectorSearch` must be the **first stage** of the pipeline.",
          "No separate Elasticsearch cluster to run and keep in sync, which is the main selling point.",
          "**RAG** flow: embed the question, `$vectorSearch` the most relevant chunks, send them to an LLM as context."
        ] },
        { note: "💡 Say it like this: 'Atlas Search adds Lucene-based full-text search with fuzzy matching, autocomplete and facets through the $search stage. Atlas Vector Search stores embeddings and finds similar ones with $vectorSearch, which I would use for semantic search or RAG, without running a separate search cluster.'", kind: "tip" }
      ]
    }

  ]
});
