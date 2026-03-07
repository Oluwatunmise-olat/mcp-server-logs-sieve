import { redactDeep, redactText } from "../src/utils/redact.js";

describe("redactText", () => {
  it("Should redact secrets", () => {
    const log =
      "token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c3IxMjMifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    expect(redactText(log)).toContain("[REDACTED_JWT]");
    expect(
      redactText("login attempt from oluwatunmise@thecloaq.com"),
    ).toContain("[REDACTED_EMAIL]");
    expect(redactText("auth Bearer supersecrettokenvalue12345")).toContain(
      "[REDACTED_BEARER]",
    );
  });

  it("Should redact public ip", () => {
    expect(redactText("request from 203.0.113.42")).toContain("[REDACTED_IP]");
  });
});

describe("redactDeep", () => {
  it("Should redact sensitive keys", () => {
    const entry = {
      user: "Oluwatunmise",
      auth: { password: "password001", token: "xoxb" },
      sessions: [{ ip: "203.0.113.42", refresh_token: "rft_390" }],
    };
    const out = redactDeep(entry) as any;

    expect(out.user).toBe("Oluwatunmise");
    expect(out.auth.password).toBe("[REDACTED]");
    expect(out.auth.token).toBe("[REDACTED]");
    expect(out.sessions[0].ip).toBe("[REDACTED_IP]");
    expect(out.sessions[0].refresh_token).toBe("[REDACTED]");
  });
});
