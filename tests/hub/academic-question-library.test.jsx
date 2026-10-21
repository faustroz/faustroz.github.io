import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AcademicPanel from "@/components/hub/AcademicPanel";
import QuestionLibrary from "@/components/hub/QuestionLibrary";

const sampleQuestions = [
  {
    id: "q-1",
    user_id: "user-1",
    subject: "Kedokteran",
    block: "Kardiovaskular",
    topic: "Aritmia",
    question_text: "Pasien datang dengan palpitasi...",
    options: { A: "Amiodarone", B: "Digoxin", C: "Verapamil", D: "Adenosine", E: "Atropine" },
    correct_answer: "A",
    explanation: "Amiodarone adalah antiaritmia kelas III...",
    tags: ["cardio"],
    is_bookmarked: false,
    deleted_at: null,
    created_at: "2026-04-10T10:00:00Z",
  },
  {
    id: "q-2",
    user_id: "user-1",
    subject: "Kedokteran",
    block: "Kardiovaskular",
    topic: "Aritmia",
    question_text: "EKG menunjukkan takikardia supraventrikular...",
    options: { A: "Adenosine", B: "Amiodarone", C: "Lidocaine", D: "Metoprolol", E: "Digoxin" },
    correct_answer: "A",
    explanation: "Adenosine adalah drug of choice...",
    tags: ["svt"],
    is_bookmarked: false,
    deleted_at: null,
    created_at: "2026-04-10T10:05:00Z",
  },
  {
    id: "q-3",
    user_id: "user-1",
    subject: "Kedokteran",
    block: "Respirasi",
    topic: "Asma",
    question_text: "Pasien mengeluh sesak napas...",
    options: { A: "Salbutamol", B: "Ipratropium", C: "Budesonide", D: "Theophylline", E: "Prednisone" },
    correct_answer: "A",
    explanation: "SABA adalah lini pertama...",
    tags: ["asma"],
    is_bookmarked: false,
    deleted_at: null,
    created_at: "2026-04-10T10:10:00Z",
  },
];

let mockDbQuestions = [];
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
}));

// Mock requireSupabase for QuestionLibrary and CrudPanel
vi.mock("@/lib/supabase/client", () => {
  const fakeFrom = (table) => {
    const builder = {
      select: vi.fn(() => builder),
      is: vi.fn(() => builder),
      order: vi.fn(() => {
        const data = table === "academic_questions" ? mockDbQuestions : [];
        return Promise.resolve({ data, error: null });
      }),
      eq: vi.fn(() => builder),
      update: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      single: vi.fn(() => Promise.resolve({ data: mockDbQuestions[0] || null, error: null })),
      then: (resolve) => {
        if (table === "academic_questions") {
          // For removeByTopic returning ids
          const deletedIds = mockDbQuestions
            .filter((q) => q.topic === "Aritmia")
            .map((q) => ({ id: q.id }));
          return resolve({ data: deletedIds.length ? deletedIds : mockDbQuestions, error: null });
        }
        return resolve({ data: [], error: null });
      },
    };
    return builder;
  };

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
  it("starts a shuffled standalone practice route and retains the selected filters", async () => {
    mockDbQuestions = [...sampleQuestions];
    mockPush.mockClear();
    window.sessionStorage.clear();
    render(<QuestionLibrary />);
    await waitFor(() => expect(screen.getByText(/3 SOAL TERSEDIA/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/blok kedokteran/i), { target: { value: "Kardiovaskular" } });
    fireEvent.change(screen.getByLabelText(/topik \(opsional\)/i), { target: { value: "Aritmia" } });
    fireEvent.click(screen.getByRole("button", { name: /mulai latihan/i }));

    expect(mockPush).toHaveBeenCalledWith("/academic/practice");
    const run = JSON.parse(window.sessionStorage.getItem("4allx:academic-practice-run:v1"));
    expect(run.questions).toHaveLength(2);
    expect(run.block).toBe("Kardiovaskular");
    expect(run.topic).toBe("Aritmia");
    expect(run.questions.every((question) => question.shuffledOptions[question.shuffledCorrectAnswer] === question.options[question.correct_answer])).toBe(true);
    expect(JSON.parse(window.sessionStorage.getItem("4allx:academic-practice-filters:v1"))).toEqual({ examType: "", block: "Kardiovaskular", subject: "", topic: "Aritmia", questionType: "", count: "all" });
  });

  it("renders the concise Academic overview and navigates dedicated workspace pages", async () => {
    mockDbQuestions = [];
    render(<AcademicPanel />);

    // Overview is the concise default; record management lives on its own page.
    expect(screen.getByRole("tab", { name: /overview/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/IPK \/ CUMULATIVE/i)).toBeInTheDocument();
    expect(screen.getByText(/BLOK KEDOKTERAN/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new entry/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /grades & credits/i }));
    expect(screen.getByRole("tab", { name: /grades & credits/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /blok kedokteran/i })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: /mata kuliah umum/i }));
    expect(screen.getByRole("tab", { name: /mata kuliah umum/i })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: /academic target/i }));
    expect(screen.getByRole("heading", { name: /target ip semester/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /grade calculator/i }));
    expect(screen.getByRole("heading", { name: /target kkm 55/i })).toBeInTheDocument();
    expect(screen.getByText(/aturan pembobotan nilai blok/i)).toBeInTheDocument();

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

  it("supports deleting all questions in a selected topic with confirmation modal", async () => {
    mockDbQuestions = [...sampleQuestions];
    render(<QuestionLibrary />);

    // Switch to LIBRARY tab
    const libraryTab = screen.getByRole("tab", { name: /library/i });
    fireEvent.click(libraryTab);

    // Wait for questions to load
    await waitFor(() => {
      expect(screen.getByText(/3 \/ 3 SOAL/i)).toBeInTheDocument();
    });

    // "HAPUS SEMUA DI TOPIK" should not be visible when no topic is selected
    expect(screen.queryByRole("button", { name: /hapus semua di topik/i })).not.toBeInTheDocument();

    // Select topic "Aritmia"
    const topicSelect = screen.getByLabelText(/topik/i);
    fireEvent.change(topicSelect, { target: { value: "Aritmia" } });

    // Button should now be visible and display the count (2 matching questions)
    const deleteTopicBtn = screen.getByRole("button", { name: /hapus semua di topik \(2\)/i });
    expect(deleteTopicBtn).toBeInTheDocument();

    // Click to open confirmation modal
    fireEvent.click(deleteTopicBtn);

    // Confirmation modal should be visible
    const modal = screen.getByRole("dialog", { name: /konfirmasi hapus soal di topik/i });
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent(/apakah anda yakin ingin menghapus semua 2 soal pada topik/i);
    expect(modal).toHaveTextContent("Aritmia");

    // Test cancelling
    const cancelBtn = screen.getByRole("button", { name: /batalkan/i });
    fireEvent.click(cancelBtn);

    // Modal should close
    expect(screen.queryByRole("dialog", { name: /konfirmasi hapus soal di topik/i })).not.toBeInTheDocument();

    // Reopen and confirm deletion
    fireEvent.click(screen.getByRole("button", { name: /hapus semua di topik \(2\)/i }));
    const confirmBtn = screen.getByRole("button", { name: /ya, hapus 2 soal/i });
    fireEvent.click(confirmBtn);

    // Modal should close and notification toast should appear
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /konfirmasi hapus soal di topik/i })).not.toBeInTheDocument();
      expect(screen.getByText(/berhasil memindahkan 2 soal di topik "Aritmia" ke trash/i)).toBeInTheDocument();
    });
  });
});
