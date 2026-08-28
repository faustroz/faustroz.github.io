import assert from "node:assert/strict";
import test from "node:test";
import { createAuthService } from "../../lib/hub/auth.mjs";

test("auth service reads session and signs in with trimmed email", async () => {
  const calls = [];
  const session = { user: { id: "user-1", email: "owner@example.com" } };
  const client = {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      signInWithPassword: async (credentials) => {
        calls.push(credentials);
        return { data: { session }, error: null };
      },
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
    },
  };

  const auth = createAuthService(client);
  assert.equal(await auth.getSession(), session);
  assert.equal(await auth.signIn(" owner@example.com ", "secret"), session);
  await auth.signOut();
  assert.deepEqual(calls, [
    { email: "owner@example.com", password: "secret" },
  ]);
});

test("auth service propagates Supabase errors", async () => {
  const expected = new Error("Invalid login credentials");
  const auth = createAuthService({
    auth: {
      getSession: async () => ({ data: {}, error: null }),
      signInWithPassword: async () => ({ data: {}, error: expected }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
    },
  });

  await assert.rejects(() => auth.signIn("owner@example.com", "bad"), expected);
});

test("auth subscription forwards sessions and can unsubscribe", () => {
  let listener;
  let unsubscribed = false;
  const auth = createAuthService({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: (callback) => {
        listener = callback;
        return {
          data: { subscription: { unsubscribe: () => { unsubscribed = true; } } },
        };
      },
    },
  });

  let received;
  const stop = auth.subscribe((session) => { received = session; });
  listener("SIGNED_IN", { user: { id: "user-1" } });
  assert.equal(received.user.id, "user-1");
  stop();
  assert.equal(unsubscribed, true);
});
