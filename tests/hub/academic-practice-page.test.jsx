import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AcademicPracticePage from "@/components/hub/AcademicPracticePage";
import { createPracticeRun, writePracticeRun } from "@/lib/hub/academic-practice.mjs";

const { mockBack } = vi.hoisted(() => ({ mockBack: vi.fn() }));
const attemptInsert = vi.fn();
const attemptUpdate = vi.fn();
const reviewRpc = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack }),
}));

vi.mock("@/lib/supabase/client", () => ({
  requireSupabase: () => ({
    from: () => ({
      insert: (payload) => {
        attemptInsert(payload);
        return { select: () => ({ single: async () => ({ data: { ...payload, id: "attempt-test" }, error: null }) }) };
      },
      update: (payload) => { attemptUpdate(payload); return { eq: () => ({ select: () => ({ single: async () => ({ data: payload, error: null }) }) }) }; },
    }),
    rpc: async (name, params) => { reviewRpc(name, params); return { data: { id: params.p_attempt_id, review_rating: params.p_rating }, error: null }; },
    storage: { from: () => ({ createSignedUrl: async (path) => ({ data: { signedUrl: "signed:" + path }, error: null }) }) },
  }),
}));

const questions = [
  { id: "q-1", question_text: "Question one?", block: "Block 1", topic: "Topic A", options: { A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo" }, correct_answer: "A", explanation: "Explanation one" },
  { id: "q-2", question_text: "Question two?", block: "Block 1", topic: "Topic A", options: { A: "First", B: "Second", C: "Third", D: "Fourth", E: "Fifth" }, correct_answer: "B", explanation: "Explanation two" },
];

describe("standalone Academic Practice page", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    mockBack.mockClear();
    attemptInsert.mockClear();
    attemptUpdate.mockClear();
    reviewRpc.mockClear();
    writePracticeRun(window.localStorage, createPracticeRun(questions, { block: "Block 1", topic: "Topic A" }));
  });

  it("supports essay answers and keeps them outside automatic MCQ scoring", async () => {
    const essay = { id: "essay-1", question_type: "essay", question_text: "Jelaskan proses bilirubin.", reference_answer: "Heme diubah menjadi bilirubin lalu dikonjugasi.", explanation: "Tinjau tahap di hepar.", options: {} };
    writePracticeRun(window.localStorage, createPracticeRun([essay], { examType: "OSPE", subject: "Fisiologi", questionType: "essay" }));
    render(<AcademicPracticePage />);
    expect(await screen.findByText(essay.question_text)).toBeInTheDocument();
    expect(screen.queryByText(essay.reference_answer)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/jawaban anda/i), { target: { value: "Jawaban saya" } });
    fireEvent.click(screen.getByRole("button", { name: /kirim jawaban/i }));
    expect(await screen.findByText(essay.reference_answer)).toBeInTheDocument();
    await waitFor(() => expect(attemptInsert).toHaveBeenCalledTimes(1));
    expect(attemptInsert.mock.calls[0][0]).toMatchObject({ question_id: "essay-1", response_text: "Jawaban saya", is_correct: null, selected_answer: null });
    expect(JSON.parse(window.localStorage.getItem("4allx:academic-practice-run:v1")).stats.wrong).toBe(0);
    for (const rating of ["Again", "Hard", "Good", "Easy"]) expect(screen.getByRole("button", { name: rating })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Again" }));
    await waitFor(() => expect(reviewRpc).toHaveBeenCalledWith("rate_academic_essay_attempt_review", { p_attempt_id: "attempt-test", p_rating: "again" }));
    expect(JSON.parse(window.localStorage.getItem("4allx:academic-practice-run:v1")).responses[0].reviewRating).toBe("again");
  });

  it("resolves question images through a private signed URL at display time", async () => {
    const imageQuestion = { ...questions[0], image_path: "owner-id/question.webp", image_url: "https://expired.example" };
    writePracticeRun(window.localStorage, createPracticeRun([imageQuestion]));
    render(<AcademicPracticePage />);
    const image = await screen.findByRole("img", { name: "Gambar soal" });
    expect(image).toHaveAttribute("src", "signed:owner-id/question.webp");
    expect(JSON.parse(window.localStorage.getItem("4allx:academic-practice-run:v1")).questions[0]).not.toHaveProperty("image_url");
  });

  it("hides right and wrong during the session, lets you jump between questions, and reveals results at the end", async () => {
    render(<AcademicPracticePage />);
    const initialRun = JSON.parse(window.localStorage.getItem("4allx:academic-practice-run:v1"));
    const firstQuestion = initialRun.questions[0];
    const secondQuestion = initialRun.questions[1];
    expect(await screen.findByText(firstQuestion.question_text)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Keluar ke Question Bank/i })).toBeInTheDocument();

    const correct = firstQuestion.shuffledCorrectAnswer;
    const incorrect = ["A", "B", "C", "D", "E"].find((option) => option !== correct);
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(`^${incorrect}`) }));
    fireEvent.click(screen.getByRole("button", { name: /Simpan jawaban/i }));
    await waitFor(() => expect(attemptInsert).toHaveBeenCalledTimes(1));
    // Saving moves straight to the next question, without a separate Next click.
    expect(await screen.findByText(secondQuestion.question_text)).toBeInTheDocument();
    expect(screen.queryByText(/Belum tepat|Jawaban yang benar|Pembahasan|benar|salah/i)).not.toBeInTheDocument();
    expect(screen.queryByText(firstQuestion.explanation)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Soal 1, sudah dijawab" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(`^${secondQuestion.shuffledCorrectAnswer}`) }));
    fireEvent.click(screen.getByRole("button", { name: /Simpan jawaban/i }));
    await waitFor(() => expect(attemptInsert).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole("button", { name: "Soal 1, sudah dijawab" }));
    expect(await screen.findByText(firstQuestion.question_text)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: new RegExp(`^${incorrect}`) })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: new RegExp(`^${incorrect}`) })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Selesai" }));
    expect(await screen.findByText("SESI SELESAI")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent.replace(/\s+/g, " ").includes("1 MCQ benar") && element.textContent.includes("1 salah"))).toBeInTheDocument();
    expect(screen.getByText(firstQuestion.explanation)).toBeInTheDocument();
  });

  it("warns before finishing with unanswered questions and counts them on the result", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AcademicPracticePage />);
    expect(await screen.findByText(/Question one\?|Question two\?/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Selesai" }));
    expect(confirm).toHaveBeenCalledWith("2 soal belum dijawab. Selesai sekarang?");
    expect(await screen.findByText("SESI SELESAI")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent === "2 belum dijawab")).toBeInTheDocument();
    confirm.mockRestore();
  });
});
