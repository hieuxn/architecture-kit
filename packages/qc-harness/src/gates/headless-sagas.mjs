// Headless-first architecture check. docs/architecture.md, ADR-0032.
// The pipeline block must stay callable without a view layer or the DOM.

const DEFAULT_BLOCK = "pipeline";
const DEFAULT_VIEW_MODULES = ["react", "react-dom"];
const HOOK_IMPORT = /\bimport\s+{[^}]*\b(?:use[A-Z]\w+)[^}]*}\s+from/;

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {{path: string, contents: string}[]} files
 * @param {{block?: string, viewModules?: string[]}} [options]
 */
export function checkHeadlessPipelines(files, options = {}) {
  const block = options.block ?? DEFAULT_BLOCK;
  const viewModules = options.viewModules ?? DEFAULT_VIEW_MODULES;
  const viewImport = new RegExp(`\\bfrom\\s+["'](?:${viewModules.map(escape).join("|")})["']`);
  const isBlock = new RegExp(`(?:^|/)${escape(block)}\\.[cm]?[jt]sx?$`);

  const problems = [];
  for (const { path, contents } of files) {
    if (!isBlock.test(path)) continue;
    if (viewImport.test(contents)) {
      problems.push({
        path,
        rule: "headless-pipeline-no-view",
        detail: `${block} must stay headless and cannot import ${viewModules.join(" or ")}`,
      });
    }
    if (HOOK_IMPORT.test(contents)) {
      problems.push({
        path,
        rule: "headless-pipeline-no-hooks",
        detail: `${block} must stay headless and cannot import view hooks`,
      });
    }
  }
  return problems;
}
