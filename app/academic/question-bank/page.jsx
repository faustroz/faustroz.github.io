import QuestionLibrary from "@/components/hub/QuestionLibrary";

export const metadata = { title: "Question Bank — Academic | 4allx", robots: "noindex, nofollow" };

export default function AcademicQuestionBankPage() {
  return (
    <main className="hub-private-page hub-academic-page hub-question-bank-page">
      <QuestionLibrary />
    </main>
  );
}
