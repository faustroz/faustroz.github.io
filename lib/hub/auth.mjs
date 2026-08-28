export function createAuthService(client) {
  if (!client?.auth) throw new Error("A Supabase auth client is required.");

  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session ?? null;
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      return data.session ?? null;
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    subscribe(callback) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        callback(session ?? null);
      });

      return () => data.subscription.unsubscribe();
    },
  };
}
