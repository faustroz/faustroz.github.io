import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AcademicPanel from "@/components/hub/AcademicPanel";

// Mock requireSupabase for QuestionLibrary and CrudPanel
vi.mock("@/lib/supabase/client", () => {
  const fakeFrom = () => ({
    select: () => ({
      is: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => ({}),
      }),
    }),
    removeChannel: vi.fn(),
  });

  return {
    requireSupabase: () => ({
      from: fakeFrom,
      channel: () => ({
        on: () => ({
          subscribe: () => ({}),
        }),
      }),
      removeChannel: vi.fn(),
    }),
  };
});

describe("AcademicPanel and QuestionLibrary integration", () => {
  it("renders Academic workspace and switches between Record & Targets and Question Bank", async () => {
    render(<AcademicPanel />);

    // Default view is RECORD & TARGETS
    expect(screen.getByRole("tab", { name: /record & targets/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/IPK \/ CUMULATIVE/i)).toBeInTheDocument();
    expect(screen.getByText(/BLOK KEDOKTERAN/i)).toBeInTheDocument();

    // Switch to QUESTION BANK
    const questionBankTab = screen.getByRole("tab", { name: /question bank/i });
    fireEvent.click(questionBankTab);

    expect(questionBankTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: /question library/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new question/i })).toBeInTheDocument();
  });
});

