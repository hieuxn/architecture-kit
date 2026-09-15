// QC-007's map, built from the rules and gates themselves so adding one cannot leave it stale.

import { enabled } from "./config.mjs";
import { gateDescriptions } from "./descriptions.mjs";
import { rules } from "./eslint/index.mjs";

export const OPEN = "<!-- generated: rule-to-check. -->";
export const CLOSE = "<!-- /generated -->";

function sentence(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** @returns {string} a markdown table of every check in force, one row each. */
export function enforcementMap(config) {
  const rows = [
    ...Object.keys(rules)
      .filter((name) => enabled(config.rules, name))
      .sort()
      .map((name) => `| ${sentence(rules[name].meta.docs.description)} | \`qc/${name}\` |`),
    ...Object.keys(config.gates)
      .filter((name) => enabled(config.gates, name))
      .sort()
      .map((name) => `| ${sentence(gateDescriptions[name])} | \`qc check\` (${name}) |`),
  ];
  return `| Rule | Check |\n|---|---|\n${rows.join("\n")}`;
}

/** Splices the table between the markers, leaving whatever a repository wrote around them. */
export function withEnforcementMap(markdown, config) {
  const at = markdown.indexOf(OPEN);
  if (at === -1) return markdown;
  const after = markdown.indexOf(CLOSE, at);
  const tail = after === -1 ? "" : markdown.slice(after + CLOSE.length);
  return `${markdown.slice(0, at)}${OPEN}\n\n${enforcementMap(config)}\n\n${CLOSE}${tail}`;
}
