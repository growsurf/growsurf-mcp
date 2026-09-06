// Small markdown helpers shared by the guidance renderers.

// Wraps code in a fenced block with the given language tag.
export const codeBlock = (language: string, code: string): string => ["```" + language, code, "```"].join("\n");

// Escapes a value for use inside a markdown table cell: pipes would split the row and newlines
// would end it, so both are neutralized.
export const tableCell = (value: unknown): string =>
  String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n+/g, " ")
    .trim();

// Renders a markdown table. `numericFrom` right-aligns every column from that index onward.
export const table = (headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<unknown>>, numericFrom = headers.length): string => {
  const separator = headers.map((_, index) => (index >= numericFrom ? "---:" : "---"));
  return [
    `| ${headers.map(tableCell).join(" | ")} |`,
    `|${separator.join("|")}|`,
    ...rows.map((row) => `| ${row.map(tableCell).join(" | ")} |`),
  ].join("\n");
};
