/**
 * Shared deny-list of sensitive file patterns.
 *
 * An automated agent that touches a customer repository must NEVER read, echo,
 * stage, or otherwise surface these files. This module is intentionally
 * dependency-free (no glob library) so any consumer — including a CommonJS
 * sibling app — can import it cheaply.
 *
 * Pattern semantics (see {@link isSecretPath}):
 * - Patterns WITHOUT a `/` are matched against the file's basename only.
 * - Patterns WITH a `/` are matched against the full (optionally nested) path.
 * - `*` matches any run of characters within a single path segment (never `/`).
 * - A trailing `/*` (e.g. `.aws/*`) matches anything under that directory,
 *   including nested sub-paths.
 * Matching is always case-insensitive.
 */
export const SECRET_DENY_LIST: string[] = [
  // --- Environment files (every common variant) ---
  ".env",
  ".env.*",
  "*.env",

  // --- Private keys, certificates, keystores ---
  "*.pem",
  "*.key",
  "*.p12",
  "*.pfx",
  "*.jks",
  "*.keystore",
  "*.crt",
  "*.cer",
  "*.der",
  "*.ppk",
  "id_rsa*",
  "id_dsa*",
  "id_ecdsa*",
  "id_ed25519*",

  // --- Credential / auth files ---
  ".npmrc",
  ".netrc",
  ".git-credentials",
  ".pgpass",
  ".htpasswd",

  // --- Cloud / infra credentials ---
  ".aws/*",
  "*.tfstate",
  "*.tfstate.*",
  "serviceAccount*.json",
  "gcp-*.json",
  "*credentials*.json",
  ".dockercfg",
  ".docker/config.json",
  "*.kubeconfig",
  "kubeconfig",

  // --- Generic secret-ish names ---
  "secrets.*",
  "*.secret",
  "*secret*.json",
  "*.asc",
  "*.gpg",
];

/**
 * Normalize a path for matching: convert Windows separators, strip a leading
 * `./` and any leading `/`, then lowercase it. (Matching is case-insensitive,
 * but normalizing here keeps the basename/segment logic simple.)
 */
const normalizePath = (path: string): string =>
  path
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .toLowerCase();

/**
 * Return the last path segment (basename) of a normalized path.
 */
const basenameOf = (path: string): string => {
  const segments = path.split("/").filter((segment) => segment.length > 0);
  return segments.length > 0 ? (segments[segments.length - 1] as string) : path;
};

/**
 * Compile a single glob pattern into an anchored, case-insensitive RegExp.
 *
 * - A trailing `/*` becomes `/.*` so a directory pattern matches anything under
 *   that directory (at any depth).
 * - Remaining `*` becomes `[^/]*` (within a single segment).
 * - When `allowNestedPrefix` is set, the match may begin at any segment
 *   boundary so e.g. `.docker/config.json` also matches `home/.docker/config.json`.
 */
const globToRegExp = (glob: string, allowNestedPrefix: boolean): RegExp => {
  let body = glob;
  let suffix = "";
  if (body.endsWith("/*")) {
    body = body.slice(0, -2);
    suffix = "/.*";
  }
  const escaped = body
    // Escape every regex metacharacter except `*` (handled next).
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*");
  const prefix = allowNestedPrefix ? "(?:.*/)?" : "";
  return new RegExp(`^${prefix}${escaped}${suffix}$`, "i");
};

// Precompile every pattern once. Patterns containing a `/` match the full path
// (with a nested-prefix allowance); the rest match the basename only.
const COMPILED_DENY_LIST: ReadonlyArray<{ basenameOnly: boolean; regExp: RegExp }> = SECRET_DENY_LIST.map(
  (pattern) => {
    const hasSlash = pattern.includes("/");
    return { basenameOnly: !hasSlash, regExp: globToRegExp(pattern, hasSlash) };
  },
);

/**
 * Return true when `path` matches any pattern in {@link SECRET_DENY_LIST}.
 *
 * Used to gate automated file reads/echoes against sensitive files. Considers
 * both the file's basename and its full (normalized) path.
 */
export const isSecretPath = (path: string): boolean => {
  if (!path) return false;
  const normalized = normalizePath(path);
  if (!normalized) return false;
  const base = basenameOf(normalized);
  return COMPILED_DENY_LIST.some(({ basenameOnly, regExp }) =>
    regExp.test(basenameOnly ? base : normalized),
  );
};
