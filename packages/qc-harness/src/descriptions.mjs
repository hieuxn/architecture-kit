// What each gate enforces, in one line, beside the gate rather than in a consumer's prose.
//
// QC-007 asks every rule to name its check. A repository used to satisfy that by hand-writing
// the map, which put the same sentence in two places and let one of them rot. The sentence
// lives here now, so a repository generates its map instead of maintaining it.

export const gateDescriptions = Object.freeze({
  "eight-blocks": "A feature keeps the anatomy it declares, and no block or slice is empty",
  citations: "Every cited id and doc path resolves, and nothing references another repository",
  "registry-agreement": "A value written twice agrees with the registry that owns it",
  "sql-identifiers": "A query names a column a migration declares, and only its own feature's tables",
  "tenant-predicate": "Every statement on a business table filters on the tenant",
  "claimed-requirements": "A requirement a route claims names the test that proves it",
  "public-routes": "The edge lets through exactly the routes the api serves without a session",
  "internal-routes": "Every path a worker posts to is a route the api serves",
  "headless-sagas": "The block that carries a workflow runs without a view layer",
  "saga-tests": "Every workflow is named by a test that imports no view module",
  "gate-tests": "A repository's own gates each ship a case that must fail",
  "audit-append-only": "The audit log has no update or delete path in any repository",
  "enforcement-map": "Every rule names a check, and every check the kit runs is named",
});

/** The gates a consumer can switch on, so a caller need not import the defaults to find out. */
export function describedGates() {
  return Object.keys(gateDescriptions);
}
