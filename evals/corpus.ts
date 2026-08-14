// Fictional course material used only by the evaluation harness. It stands in
// for a student's uploaded documents so evaluations can exercise real
// embedding, retrieval, and grounded generation without touching real data.

export interface CorpusChunk {
  document: string;
  page: number;
  content: string;
}

export const corpus: CorpusChunk[] = [
  {
    document: "Lecture 6 — Balanced Trees",
    page: 2,
    content: "An AVL tree stores a balance factor at every node, defined as the height of the left subtree minus the height of the right subtree. A node is balanced when its balance factor is -1, 0, or 1. Any value outside that range means the subtree rooted at that node must be rebalanced before further operations continue.",
  },
  {
    document: "Lecture 6 — Balanced Trees",
    page: 3,
    content: "An LL imbalance occurs when a node is left-heavy and the offending insertion happened in the left subtree of its left child. The fix is a single right rotation about the unbalanced node. The mirror case, an RR imbalance, is repaired with a single left rotation.",
  },
  {
    document: "Lecture 6 — Balanced Trees",
    page: 4,
    content: "LR and RL imbalances require two rotations. For LR, first apply a left rotation on the left child, which converts the shape into an LL case, then apply a right rotation on the unbalanced node. Each rotation runs in constant time, so rebalancing costs O(1) after an O(log n) search.",
  },
  {
    document: "Lecture 3 — Normalization",
    page: 5,
    content: "Third normal form removes transitive dependencies. A relation is in 3NF when it is in second normal form and no non-key attribute depends on another non-key attribute. Removing the transitive dependency prevents update anomalies where the same fact is stored in more than one row.",
  },
  {
    document: "Lecture 3 — Normalization",
    page: 7,
    content: "Boyce-Codd normal form is a stricter form of 3NF. A relation is in BCNF when every determinant is a candidate key. A determinant is any attribute set that functionally determines another attribute, so BCNF eliminates the remaining anomalies that 3NF can leave behind when a table has overlapping candidate keys.",
  },
  {
    document: "Lecture 4 — Transactions",
    page: 1,
    content: "A database transaction guarantees four properties, abbreviated ACID: atomicity, consistency, isolation, and durability. Atomicity means the transaction executes entirely or not at all; a partial transaction is rolled back so the database never reflects half of an operation.",
  },
  {
    document: "Lecture 4 — Transactions",
    page: 2,
    content: "Isolation means concurrent transactions do not observe each other's intermediate state. Without isolation, one transaction could read a value another transaction is still modifying, producing a dirty read. Durability guarantees that once a transaction commits, its effects survive a crash.",
  },
  {
    document: "Lecture 9 — Hashing",
    page: 3,
    content: "A hash table maps a key to a bucket index using a hash function. When two keys map to the same bucket, the table has a collision. Separate chaining resolves collisions by storing a linked list in each bucket, while open addressing probes for the next free slot in the underlying array.",
  },
];
