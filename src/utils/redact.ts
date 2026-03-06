const SENSITIVE_KEYS = new Set([
  "password",
  "passwd",
  "token",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "auth",
  "cookie",
  "session",
  "otp",
  "pin",
  "cvv",
  "card",
  "account_number",
  "private_key",
  "private_key_id",
  "client_secret",
  "service_account_key",
  "aws_secret",
  "secret_access_key",
  "access_key_id",
  "connection_string",
  "database_url",
  "db_url",
  "dsn",
  "refresh_token",
  "id_token",
  "access_token",
  "x-api-key",
  "x_api_key",
  "ssn",
  "social_security",
  "encryption_key",
  "signing_key",
  "hmac",
]);

const TEXT_PATTERNS: [RegExp, string | ((m: string) => string)][] = [
  [
    /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss|amqp|amqps):\/\/[^\s"']+/g,
    "[REDACTED_CONNECTION_STRING]",
  ],
  [
    /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    "[REDACTED_JWT]",
  ],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_KEY]"],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]"],
  [
    /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    (m: string) => (m === "127.0.0.1" || m === "0.0.0.0" ? m : "[REDACTED_IP]"),
  ],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]"],
  [/\bBearer\s+[A-Za-z0-9_\-.]{16,}/g, "[REDACTED_BEARER]"],
  [
    /\b(?:sk_|pk_|ghp_|xox[baprs]-|ya29\.)[A-Za-z0-9_\-]{16,}\b/g,
    "[REDACTED_TOKEN]",
  ],
  [/\b(?:\+?\d[\d\s\-()]{8,}\d)\b/g, "[REDACTED_PHONE]"],
  [/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_CARD]"],
];

export function redactText(input: string): string {
  let out = input;

  for (const [pattern, replacement] of TEXT_PATTERNS) {
    out = out.replace(pattern, replacement as string);
  }

  return out;
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();

  for (const hint of SENSITIVE_KEYS) {
    if (lower.includes(hint)) return true;
  }

  return false;
}

export function redactValueByKey(keyPath: string, value: unknown): string {
  if (isSensitiveKey(keyPath)) return "[REDACTED]";

  return redactText(String(value));
}

function isPrimitive(value: unknown): boolean {
  return value === null || typeof value !== "object";
}

function redactPrimitive(value: unknown, keyHint?: string): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    if (keyHint && isSensitiveKey(keyHint)) return "[REDACTED]";

    return redactText(value);
  }

  return value;
}

export function redactDeep(input: unknown, keyHint?: string): unknown {
  if (isPrimitive(input)) return redactPrimitive(input, keyHint);

  const stack: {
    source: unknown;
    key: string | number;
    parent: Record<string, unknown> | unknown[];
  }[] = [];

  const root = Array.isArray(input)
    ? [...input]
    : { ...(input as Record<string, unknown>) };

  if (Array.isArray(root)) {
    for (let i = root.length - 1; i >= 0; i--) {
      stack.push({ source: root[i], key: i, parent: root });
    }
  } else {
    for (const [k, v] of Object.entries(root)) {
      stack.push({ source: v, key: k, parent: root });
    }
  }

  while (stack.length > 0) {
    const { source, key, parent } = stack.pop()!;

    const hint = typeof key === "string" ? key : keyHint;

    if (isPrimitive(source)) {
      (parent as Record<string | number, unknown>)[key] = redactPrimitive(
        source,
        hint,
      );
      continue;
    }

    const copy = Array.isArray(source)
      ? [...source]
      : { ...(source as Record<string, unknown>) };

    (parent as Record<string | number, unknown>)[key] = copy;

    if (Array.isArray(copy)) {
      for (let i = copy.length - 1; i >= 0; i--) {
        stack.push({ source: copy[i], key: i, parent: copy });
      }
    } else {
      for (const [k, v] of Object.entries(copy)) {
        stack.push({ source: v, key: k, parent: copy });
      }
    }
  }

  return root;
}
