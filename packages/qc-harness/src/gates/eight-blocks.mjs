// The feature anatomy, as a pure function. docs/architecture.md.
// The CLI does the I/O; every decision lives here so it can be tested.
//
// Two anatomies, both named by config: a bounded vertical slice, and the flat
// pipeline a narrow single-operation feature may keep.

export const BLOCKS = Object.freeze([
  "index",
  "trigger",
  "pipeline",
  "resource",
  "branch",
  "fragment",
  "ledger",
  "record",
]);

export const REQUIRED_BLOCKS = Object.freeze(["index", "trigger", "pipeline", "resource"]);

export const SLICE_REQUIRED_ROOTS = Object.freeze(["index", "trigger", "schema"]);
export const ALLOWED_SUBDIRS = Object.freeze(["slices", "shared"]);
export const ALLOWED_SHARED_FILES = Object.freeze(["types", "queries", "guards", "runner"]);

const TEST_SUFFIX = ".test.ts";
const TEST_SUFFIX_TSX = ".test.tsx";

/** A config may name blocks with or without an extension; the gate compares stems. */
function stems(names) {
  return names.map((name) => name.replace(/\.[cm]?[jt]sx?$/, ""));
}

/** Config, resolved once, with the reference anatomy as the default. */
function anatomyOf(options = {}) {
  const slice = options.slice ?? {};
  const block = options.block ?? {};
  return {
    sliceRequired: stems(slice.required ?? SLICE_REQUIRED_ROOTS),
    sliceDir: slice.sliceDir ?? "slices",
    sharedDir: slice.sharedDir ?? "shared",
    sharedFiles: stems(slice.sharedFiles ?? ALLOWED_SHARED_FILES),
    blocks: stems([...(block.required ?? []), ...(block.optional ?? [])]).length
      ? stems([...(block.required ?? REQUIRED_BLOCKS), ...(block.optional ?? [])])
      : BLOCKS,
    blockRequired: stems(block.required ?? REQUIRED_BLOCKS),
    // Roots where the flat anatomy is no longer allowed at all.
    sliceOnlyRoots: options.sliceOnlyRoots ?? ["backend/src/features"],
  };
}

function checkSliceSubfolder(feature, file, anatomy) {
  const parts = file.split("/");
  const dir = parts[0];
  if (![anatomy.sliceDir, anatomy.sharedDir].includes(dir) || parts.length > 2) {
    return { feature, rule: "disallowed-subfolder", detail: file };
  }
  const basename = parts[1].replace(/\.test\.(tsx?)$/, "").replace(/\.(tsx?)$/, "");
  if (basename === "index") {
    return { feature, rule: "no-subfolder-index", detail: file };
  }
  if (dir === anatomy.sharedDir && !anatomy.sharedFiles.includes(basename)) {
    return { feature, rule: "disallowed-shared-file", detail: file };
  }
  return null;
}

function checkSliceFeature(feature, files, anatomy) {
  const problems = [];
  const roots = new Set();
  let hasSlice = false;

  for (const file of files) {
    if (file.includes("/")) {
      const subProb = checkSliceSubfolder(feature, file, anatomy);
      if (subProb) {
        problems.push(subProb);
        continue;
      }
      if (file.endsWith(TEST_SUFFIX) || file.endsWith(TEST_SUFFIX_TSX)) continue;
      if (file.startsWith(`${anatomy.sliceDir}/`)) hasSlice = true;
      continue;
    }
    if (file.endsWith(TEST_SUFFIX) || file.endsWith(TEST_SUFFIX_TSX)) continue;
    const name = file.replace(/\.tsx?$/, "");
    if (!anatomy.sliceRequired.includes(name)) {
      problems.push({ feature, rule: "unknown-block", detail: file });
      continue;
    }
    roots.add(name);
  }

  for (const required of anatomy.sliceRequired) {
    if (!roots.has(required)) problems.push({ feature, rule: "missing-block", detail: required });
  }
  if (!hasSlice) {
    problems.push({
      feature,
      rule: "empty-slices",
      detail: `no slice files found under ${anatomy.sliceDir}/`,
    });
  }
  return problems;
}

function checkFlatFeature(feature, files, anatomy) {
  const problems = [];
  const blocks = new Set();
  for (const file of files) {
    if (file.includes("/")) {
      problems.push({ feature, rule: "no-subfolder", detail: file });
      continue;
    }
    if (file.endsWith(TEST_SUFFIX) || file.endsWith(TEST_SUFFIX_TSX)) continue;
    const name = file.replace(/\.tsx?$/, "");
    if (!anatomy.blocks.includes(name)) {
      problems.push({ feature, rule: "unknown-block", detail: file });
      continue;
    }
    blocks.add(name);
  }
  for (const required of anatomy.blockRequired) {
    if (!blocks.has(required)) problems.push({ feature, rule: "missing-block", detail: required });
  }
  return problems;
}

/**
 * @param {{feature: string, files: string[]}[]} features
 *   `files` are basenames directly inside the feature folder; a nested path
 *   keeps its separator so the subfolder rule can see it.
 * @returns {{feature: string, rule: string, detail: string}[]}
 */
export function checkFeatureAnatomy(features, options = {}) {
  const anatomy = anatomyOf(options);
  const schemaFiles = anatomy.sliceRequired.filter((name) => name !== "index" && name !== "trigger");
  const problems = [];
  for (const { feature, files } of features) {
    const isSlice = files.some(
      (file) =>
        file.startsWith(`${anatomy.sliceDir}/`) ||
        schemaFiles.includes(file.replace(/\.tsx?$/, "")),
    );
    if (!isSlice && anatomy.sliceOnlyRoots.some((root) => feature.includes(root))) {
      problems.push({
        feature,
        rule: "disallowed-flat-anatomy",
        detail: `features under ${anatomy.sliceOnlyRoots.find((root) => feature.includes(root))} must use bounded vertical slices`,
      });
      continue;
    }
    const featureProblems = isSlice
      ? checkSliceFeature(feature, files, anatomy)
      : checkFlatFeature(feature, files, anatomy);
    problems.push(...featureProblems);
  }
  return problems;
}

/** An empty block or slice is a review finding, not an option. ADR-0047, ADR-0054. */
export function checkNoEmptyBlock(files, options = {}) {
  const anatomy = anatomyOf(options);
  const known = new Set([...anatomy.blocks, ...anatomy.sliceRequired]);
  return files
    .filter(({ path, contents }) => {
      const name = path.split("/").pop().replace(/\.tsx?$/, "");
      const isBlock = known.has(name);
      const isSubdirFile =
        path.includes(`/${anatomy.sliceDir}/`) || path.includes(`/${anatomy.sharedDir}/`);
      if (!isBlock && !isSubdirFile) return false;
      const meaningful = contents
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("//") && !line.startsWith("*") && !line.startsWith("/*"));
      return meaningful.length === 0;
    })
    .map(({ path }) => ({ feature: path, rule: "empty-block", detail: path }));
}
