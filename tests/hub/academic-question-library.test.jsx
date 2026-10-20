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
      order: () => Promise.resolve({ data: [], error: null }),
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

describe("AcademicPanel and QuestionBank redesign integration", () => {
  it("renders Academic workspace and navigates Question Bank modes without difficulty or exam mode", async () => {
    render(<AcademicPanel />);

    // Default view is RECORD & TARGETS
    expect(screen.getByRole("tab", { name: /record & targets/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/IPK \/ CUMULATIVE/i)).toBeInTheDocument();
    expect(screen.getByText(/BLOK KEDOKTERAN/i)).toBeInTheDocument();

    // Switch to QUESTION BANK
    const questionBankTab = screen.getByRole("tab", { name: /question bank/i });
    fireEvent.click(questionBankTab);

    expect(questionBankTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: /question library & practice/i })).toBeInTheDocument();

    // Practice mode is active by default
    expect(screen.getByRole("tab", { name: /practice/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /mulai latihan/i })).toBeInTheDocument();

    // Switch to LIBRARY tab
    const libraryTab = screen.getByRole("tab", { name: /library/i });
    fireEvent.click(libraryTab);
    expect(libraryTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /tambah soal/i })).toBeInTheDocument();

    // Verify difficulty is NOT present in UI
    expect(screen.queryByText(/difficulty/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kesulitan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/exam mode/i)).not.toBeInTheDocument();

    // Switch to MISTAKES tab
    const mistakesTab = screen.getByRole("tab", { name: /mistakes/i });
    fireEvent.click(mistakesTab);
    expect(mistakesTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/soal yang pernah dijawab salah/i)).toBeInTheDocument();

    // Switch to CSV IMPORT tab
    const importTab = screen.getByRole("tab", { name: /csv import/i });
    fireEvent.click(importTab);
    expect(importTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /unduh template csv/i })).toBeInTheDocument();
  });
});
