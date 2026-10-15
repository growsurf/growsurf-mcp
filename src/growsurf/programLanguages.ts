/**
 * Language codes a program can run in (`languages` in the program options) and a participant can be
 * set to. Listed in tool descriptions only, never as an input or output `enum`: the API validates each
 * code against the program's languages, so a newly supported language works without an MCP release.
 */
export const PROGRAM_LANGUAGE_CODES = Object.freeze([
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt-BR",
  "nl",
  "pl",
  "sv",
  "tr",
  "ja",
  "ko",
  "zh-CN",
  "id",
  "da",
  "nb",
  "nn",
  "fi",
  "is",
  "cs",
  "sk",
  "hu",
  "ro",
  "hr",
  "sl",
  "et",
  "lv",
  "lt",
  "el",
  "bg",
  "uk",
  "ru",
  "pt-PT",
  "ca",
  "vi",
  "ms",
  "fil",
  "af",
  "sw",
] as const);

export const PROGRAM_LANGUAGE_CODES_TEXT = `Supported codes: ${PROGRAM_LANGUAGE_CODES.map((code) => `\`${code}\``).join(", ")}.`;
