## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

### Rules

* For codebase questions, use Graphify before browsing source files manually.
* If `graphify-out/graph.json` exists, first run:

```bash
graphify query "<question>"
```

* Use focused commands instead of broad file exploration:

  * `graphify query "<question>"` for scoped codebase questions.
  * `graphify path "<A>" "<B>"` for relationships between files, functions, or concepts.
  * `graphify explain "<concept>"` for focused concept exploration.

These commands return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md`, raw grep output, or opening many source files.

* Avoid reading large files, folders, or unrelated modules until Graphify identifies the relevant nodes/files.

* Dirty `graphify-out/` files are expected after hooks or incremental updates. Dirty graph files are not a reason to skip Graphify.

* Only skip Graphify if:

  * the task is specifically about stale/incorrect graph output;
  * `graphify-out/graph.json` does not exist;
  * or the user explicitly says not to use Graphify.

* If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.

* Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when `query`, `path`, or `explain` do not surface enough context.

* After modifying code, run:

```bash
graphify update .
```

This keeps the graph current using AST-only refresh with no API cost.

### Token-saving workflow

For every code task:

1. Use Graphify first.
2. Identify the smallest relevant set of nodes/files.
3. Open only the files directly related to the task.
4. Make the smallest safe change.
5. Avoid unrelated refactors.
6. Run tests/typecheck when relevant.
7. Run `graphify update .` after code changes.
8. Summarize changed files and affected graph nodes.
