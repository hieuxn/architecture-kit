// A promise is awaited, never continued with a callback.
//
// `.then()` and `.catch()` split one flow across two scopes: the value arrives somewhere the
// surrounding code cannot see, a thrown error lands in a handler the reader has to go find, and
// a forgotten `return` inside the callback silently drops the chain. `await` in a `try`/`catch`
// keeps the whole flow on the page, in order, under one error path.
//
// `.finally()` is left alone: it carries no value, reads as cleanup, and has no await form.
//
// `allow` names the modules that may still chain: racing a promise against an abort, and marking
// a rejection handled without waiting for it, have no await form at all. Naming those files keeps
// the primitive in one audited place instead of spreading disable comments over the callers.

import { optionsOf, pathSuffix, schemaOf } from "../options.mjs";

const DEFAULT_METHODS = ["then", "catch"];

export default {
  meta: {
    type: "problem",
    docs: { description: "a promise is awaited, never continued with .then() or .catch()" },
    schema: schemaOf({
      methods: { type: "array", items: { type: "string" } },
      allow: { type: "array", items: { type: "string" } },
    }),
    messages: {
      chained: "Await the promise instead of chaining .{{method}}(). Use try/catch for the failure path.",
    },
  },
  create(context) {
    const options = optionsOf(context);
    const methods = options.methods ?? DEFAULT_METHODS;
    const allowed = (options.allow ?? []).some((file) => pathSuffix(file).test(context.filename));
    if (allowed) return {};
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        if (callee.property.type !== "Identifier") return;
        if (!methods.includes(callee.property.name)) return;
        // Only a call whose argument is a callback is a promise continuation; `x.catch` with
        // no function argument is some other api borrowing the name.
        const [first] = node.arguments;
        if (first === undefined) return;
        if (first.type !== "ArrowFunctionExpression" && first.type !== "FunctionExpression" && first.type !== "Identifier") return;
        context.report({ node: callee.property, messageId: "chained", data: { method: callee.property.name } });
      },
    };
  },
};
