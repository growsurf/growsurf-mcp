/** JavaScript string data inside an HTML script raw-text element. */
export const htmlScriptString = (value: string): string => JSON.stringify(value)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");

/** Ruby double-quoted strings also interpolate #{}, #@ and #$ expressions. */
export const rubyString = (value: string): string => JSON.stringify(value).replace(/#/g, "\\#");

/** PHP double-quoted strings interpolate $, and use hex rather than JSON unicode escapes. */
export const phpString = (value: string): string => JSON.stringify(value)
  .replace(/\$/g, "\\$")
  // Match complete JSON escapes so a literal backslash followed by f/b/u
  // is not mistaken for an encoded control character.
  .replace(/\\(?:\\|u00[\da-f]{2}|b|f)/gi, escape => {
    if (escape === "\\b") return "\\x08";
    if (escape === "\\f") return "\\x0c";
    return escape.startsWith("\\u00") ? `\\x${escape.slice(4)}` : escape;
  });

/** Kotlin templates start with $, and form feed requires a unicode escape. */
export const kotlinString = (value: string): string => JSON.stringify(value)
  .replace(/\$/g, "\\$")
  .replace(/\\(?:\\|f)/g, escape => escape === "\\f" ? "\\u000c" : escape);
