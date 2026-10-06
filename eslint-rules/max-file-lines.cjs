// Counts code lines (lines holding at least one non-comment token) and reports files above the budget.
// Large files tend to hide several responsibilities; the budget pushes them to be split.
'use strict';

module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Limit the number of code lines per file' },
    schema: [{ type: 'object', properties: { max: { type: 'integer', minimum: 1 } }, additionalProperties: false }],
    messages: { tooLong: 'File has {{count}} code lines (budget {{max}}). Split it by responsibility.' },
  },
  create(context) {
    const max = context.options[0]?.max ?? 350;
    return {
      Program(node) {
        const codeLines = new Set();
        for (const token of context.sourceCode.ast.tokens) {
          for (let line = token.loc.start.line; line <= token.loc.end.line; line++) codeLines.add(line);
        }
        if (codeLines.size > max) {
          context.report({ node, messageId: 'tooLong', data: { count: String(codeLines.size), max: String(max) } });
        }
      },
    };
  },
};
