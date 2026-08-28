function assertClient(client) {
  if (!client?.from) throw new Error("A Supabase client is required.");
}

function assertId(id) {
  if (!id) throw new Error("A record id is required.");
}

export function createCrudRepository(client, table, options = {}) {
  assertClient(client);
  if (!table) throw new Error("A table name is required.");

  const orderBy = options.orderBy ?? "created_at";
  const ascending = options.ascending ?? false;

  return {
    async list() {
      const { data, error } = await client
        .from(table)
        .select("*")
        .is("deleted_at", null)
        .order(orderBy, { ascending });
      if (error) throw error;
      return data ?? [];
    },

    async create(values) {
      const { data, error } = await client
        .from(table)
        .insert(values)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },

    async update(id, values) {
      assertId(id);
      const { data, error } = await client
        .from(table)
        .update(values)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },

    async remove(id) {
      assertId(id);
      const { error } = await client.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    async restore(id) { assertId(id); const { error } = await client.from(table).update({ deleted_at: null }).eq("id", id); if (error) throw error; },
    async permanentlyRemove(id) { assertId(id); const { error } = await client.from(table).delete().eq("id", id); if (error) throw error; },
  };
}
