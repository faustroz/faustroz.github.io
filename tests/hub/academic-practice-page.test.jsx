import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AcademicPracticePage from "@/components/hub/AcademicPracticePage";
import { createPracticeRun, writePracticeRun } from "@/lib/hub/academic-practice.mjs";

const { mockBack } = vi.hoisted(() => ({ mockBack: vi.fn() }));
const attemptInsert = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack }),
}));

vi.mock("@/lib/supabase/client", () => ({
  requireSupabase: () => ({
    from: () => ({
      insert: (payload) => {
        attemptInsert(payload);
        return { select: () => ({ single: async () => ({ data: payload, error: null }) }) };
      },
    }),
  }),
}));

const questions = [
  { id: "q-1", question_text: "Question one?", block: "Block 1", topic: "Topic A", options: { A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo" }, correct_answer: "A", explanation: "Explanation one" },
  { id: "q-2", question_text: "Question two?", block: "Block 1", topic: "Topic A", options: { A: "First", B: "Second", C: "Third", D: "Fourth", E: "Fifth" }, correct_answer: "B", explanation: "Explanation two" },
];

describe("standalone Academic Practice page", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockBack.mockClear();
    attemptInsert.mockClear();
    writePracticeRun(window.sessionStorage, createPracticeRun(questions, { block: "Block 1", topic: "Topic A" }));
  });

  it("keeps the answer hidden until submit, saves only once, advances, and shows a separate result", async () => {
    render(<AcademicPracticePage />);
    expect(await screen.findByText("Question one?")).toBeInTheDocument();
    expect(screen.queryByText(/Jawaban yang benar:/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Keluar ke Question Bank/i })).toBeInTheDocument();

    const correct = JSON.parse(window.sessionStorage.getItem("4allx:academic-practice-run:v1")).questions[0].shuffledCorrectAnswer;
    const incorrect = ["A", "B", "C", "D", "E"].find((option) => option !== correct);
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(`^${incorrect}`) }));
    fireEvent.click(screen.getByRole("button", { name: /Periksa jawaban/i }));

    await waitFor(() => expect(attemptInsert).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Belum tepat/i)).toBeInTheDocument();
    expect(screen.getByText("Explanation one")).toBeInTheDocument();
    expect(screen.getByText(/Jawaban yang benar:/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /NEXT QUESTION/i }));
    expect(await screen.findByText("Question two?")).toBeInTheDocument();
    expect(JSON.parse(window.sessionStorage.getItem("4allx:academic-practice-run:v1")).stats.wrong).toBe(1);

    const secondAnswer = JSON.parse(window.sessionStorage.getItem("4allx:academic-practice-run:v1")).questions[1].shuffledCorrectAnswer;
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(`^${secondAnswer}`) }));
    fireEvent.click(screen.getByRole("button", { name: /Periksa jawaban/i }));
    fireEvent.click(await screen.findByRole("button", { name: /NEXT QUESTION/i }));
    expect(await screen.findByText("SESI SELESAI")).toBeInTheDocument();
    expect(screen.queryByText("Question two?")).not.toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent.replace(/\s+/g, " ").includes("1 benar · 1 salah · 2 soal"))).toBeInTheDocument();
  });
});
