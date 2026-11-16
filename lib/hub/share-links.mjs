import { normalizeSharedImageOcclusionSet } from "./image-occlusion.mjs";

// Unlisted share links. The token is the only key; a shared item is read through one RPC.
export const SHARE_KINDS = Object.freeze({
  IMAGE_OCCLUSION_SET: "image_occlusion_set",
  QUESTION_BANK: "question_bank",
  AUSCULTATION_LAB: "auscultation_lab",
});
export const SHARE_TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const SHARED_IMAGE_BUCKET = "academic-question-images";
const SIGNED_URL_TTL_SECONDS = 3600;

export function readShareTokenFromHash(hash = "") {
  const token = String(hash || "").replace(/^#/, "").trim();
  return SHARE_TOKEN_PATTERN.test(token) ? token : null;
}

export function buildShareUrl(origin, token) {
  return `${String(origin).replace(/\/+$/, "")}/share#${token}`;
}

export function createShareLinkRepository(client) {
  if (!client?.from) throw new Error("A Supabase client is required.");
  const scoped = (query, targetId) => (targetId ? query.eq("target_id", targetId) : query.is("target_id", null));

  return {
    async getShareLink(kind, targetId = null) {
      const { data, error } = await scoped(client.from("academic_share_links").select("token").eq("kind", kind), targetId).maybeSingle();
      if (error) throw error;
      return data?.token || null;
    },

    async createShareLink(kind, targetId = null) {
      const { data, error } = await client.from("academic_share_links").insert({ kind, target_id: targetId }).select("token").single();
      if (error) throw error;
      return data.token;
    },

    async revokeShareLink(kind, targetId = null) {
      const { error } = await scoped(client.from("academic_share_links").delete().eq("kind", kind), targetId);
      if (error) throw error;
    },
  };
}

export function normalizeSharedQuestionBank(payload) {
  if (!payload || !Array.isArray(payload.questions)) return null;
  const questions = payload.questions.map((question) => ({ ...question, options: question.options || {} }));
  return {
    title: String(payload.title || "Bank soal"),
    questions,
    imagePaths: [...new Set(questions.map((question) => question.image_path).filter(Boolean))],
  };
}

export function normalizeSharedAuscultationLab(payload) {
  if (!payload || typeof payload !== "object") return null;
  return { title: String(payload.title || "Auscultation Lab"), imagePaths: [] };
}

export function filterSharedQuestions(questions = [], { block = "", query = "" } = {}) {
  const needle = String(query || "").trim().toLocaleLowerCase("id");
  return questions.filter((question) => {
    if (block && (question.block || "") !== block) return false;
    if (!needle) return true;
    return [question.question_text, question.topic, question.subtopic, question.subject, question.block]
      .some((value) => String(value || "").toLocaleLowerCase("id").includes(needle));
  });
}

export async function loadSharedContent(client, token) {
  const { data, error } = await client.rpc("get_shared_content", { p_token: token });
  if (error) throw error;
  if (!data?.kind) throw new Error("Link tidak valid atau sudah dicabut.");

  let content;
  if (data.kind === SHARE_KINDS.IMAGE_OCCLUSION_SET) content = normalizeSharedImageOcclusionSet(data.payload);
  else if (data.kind === SHARE_KINDS.QUESTION_BANK) content = normalizeSharedQuestionBank(data.payload);
  else if (data.kind === SHARE_KINDS.AUSCULTATION_LAB) content = normalizeSharedAuscultationLab(data.payload);
  if (!content) throw new Error("Isi link tidak dapat dibaca.");

  const imageUrls = new Map();
  if (content.imagePaths.length) {
    const { data: signed, error: signError } = await client.storage.from(SHARED_IMAGE_BUCKET).createSignedUrls(content.imagePaths, SIGNED_URL_TTL_SECONDS);
    if (signError) throw signError;
    for (const entry of signed || []) if (!entry.error && entry.signedUrl) imageUrls.set(entry.path, entry.signedUrl);
  }
  return { kind: data.kind, ...content, imageUrls };
}
