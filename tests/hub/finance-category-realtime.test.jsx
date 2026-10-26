import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ModuleWorkspace from "@/components/hub/ModuleWorkspace";

const realtime = vi.hoisted(() => {
  const topics = [];
  const channel = { on: vi.fn(function on() { return this; }), subscribe: vi.fn(function subscribe() { return this; }) };
  return {
    topics,
    channel,
    client: {
      channel: vi.fn((topic) => { topics.push(topic); return channel; }),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/supabase/client", () => ({ requireSupabase: () => realtime.client }));
vi.mock("@/lib/hub/crud.mjs", () => ({
  createCrudRepository: () => ({ list: async () => [] }),
}));

const channels = [{
  id: "categories",
  label: "Categories",
  sections: ["expense", "income"].map((kind) => ({
    id: `${kind}-categories`,
    table: "finance_categories",
    title: `${kind} categories`,
    description: "Manage categories",
    fields: [{ name: "name", label: "Name" }],
    recordScope: { kind },
  })),
}];

describe("Finance category realtime subscriptions", () => {
  beforeEach(() => {
    realtime.topics.length = 0;
    realtime.client.channel.mockClear();
    realtime.client.removeChannel.mockClear();
    realtime.channel.on.mockClear();
    realtime.channel.subscribe.mockClear();
  });

  it("uses a separate Supabase channel for each category panel on the same table", async () => {
    render(<ModuleWorkspace channels={channels} />);

    expect(screen.getByRole("heading", { name: "expense categories" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "income categories" })).toBeInTheDocument();
    await waitFor(() => expect(realtime.topics).toHaveLength(2));
    expect(new Set(realtime.topics).size).toBe(2);
    expect(realtime.topics.every((topic) => topic.startsWith("hub-crud-finance_categories-"))).toBe(true);
  });
});
