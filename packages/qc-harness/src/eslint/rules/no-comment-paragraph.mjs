// Code carries the meaning; a comment exists only where it cannot. docs/enforcement.md.
// Prose quality stays a review concern — this rule enforces only what is mechanical.

import { optionsOf, schemaOf } from "../options.mjs";

const DEFAULT_MAX_LINES = 2;

// A rule of repeated punctuation used as a divider.
const BANNER = /^\s*[*/]*\s*(?:[-=*_~#]{4,})\s*[*/]*\s*$/;

// A statement shape that also ends like a statement: prose beginning "import from here" or
// ending in a semicolon is a sentence, not code.
const CODE_SHAPE = [
  /^(?:const|let|var|function|class|import|export|return|await)\s+\S+/,
  /^(?:if|for|while|switch)\s*\(/,
  /^[\w.$[\]]+\([^)]*\)\s*$/,
];
const STATEMENT_END = /[;{})]$/;
const BRACE_ONLY = /^\}\s*(?:else\b.*)?[;{)]?$/;

function looksLikeCode(line) {
  if (BRACE_ONLY.test(line)) return true;
  return CODE_SHAPE.some((shape) => shape.test(line)) && STATEMENT_END.test(line);
}

function proseLinesOf(comment) {
  return comment.value
    .split("\n")
    .map((line) => line.replace(/^\s*\*+\s?/, "").trim())
    .filter((line) => line !== "");
}

/** Consecutive line comments are one thought, so they are measured as one block. */
function runsOf(comments) {
  const runs = [];
  let current = null;
  for (const comment of comments) {
    if (comment.type === "Block") {
      runs.push([comment]);
      current = null;
      continue;
    }
    const previous = current?.[current.length - 1];
    if (previous && comment.loc.start.line === previous.loc.end.line + 1) {
      current.push(comment);
      continue;
    }
    current = [comment];
    runs.push(current);
  }
  return runs;
}

export default {
  meta: {
    type: "suggestion",
    docs: { description: "a comment is one line of why, never a paragraph, a banner or code" },
    schema: schemaOf({
      maxLines: { type: "integer", minimum: 1 },
      doc: { type: "string" },
    }),
    messages: {
      paragraph: "Comment paragraph. One line of why the code cannot say — {{doc}}.",
      banner: "Banner comment. {{doc}}.",
      code: "Commented-out code. {{doc}}.",
    },
  },
  create(context) {
    const options = optionsOf(context);
    const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
    const doc = options.doc ?? "docs/enforcement.md";

    return {
      Program() {
        for (const run of runsOf(context.sourceCode.getAllComments())) {
          const prose = run.flatMap(proseLinesOf);
          const node = run[0];
          if (prose.some((line) => BANNER.test(line))) {
            context.report({ node, messageId: "banner", data: { doc } });
            continue;
          }
          if (prose.some(looksLikeCode)) {
            context.report({ node, messageId: "code", data: { doc } });
            continue;
          }
          if (prose.length > maxLines) {
            context.report({ node, messageId: "paragraph", data: { doc } });
          }
        }
      },
    };
  },
};
