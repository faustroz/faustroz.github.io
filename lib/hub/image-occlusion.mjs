export const IMAGE_OCCLUSION_RUN_KEY = "4allx:academic-image-occlusion-run:v1";
export const IMAGE_OCCLUSION_MODES = Object.freeze(["hide_one", "hide_all"]);
export const IMAGE_OCCLUSION_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_OCCLUSION_MIME_TYPES = Object.freeze(["image/png", "image/jpeg"]);

export function validateOcclusionMasks(masks = []) {
  if (!Array.isArray(masks) || masks.length === 0) throw new Error("Tambahkan setidaknya satu mask.");
  return masks.map((mask, index) => {
    const x = Number(mask.x);
    const y = Number(mask.y);
    const width = Number(mask.width);
    const height = Number(mask.height);
    const answer = String(mask.answer || "").trim();
    if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1.000001 || y + height > 1.000001) {
      throw new Error(`Posisi mask ${index + 1} tidak valid.`);
    }
    if (!answer) throw new Error(`Jawaban mask ${index + 1} wajib diisi.`);
    return { id: typeof mask.id === "string" ? mask.id : null, position: index, x, y, width, height, answer };
  });
}

export function createImageOcclusionRun(set, cards, mode = set?.mode || "hide_one") {
  if (!set?.id || !set?.image_path || !Array.isArray(cards) || cards.length === 0) return null;
  if (!IMAGE_OCCLUSION_MODES.includes(mode)) throw new Error("Pilih mode Hide One atau Hide All.");
  return {
    version: 1,
    setId: set.id,
    title: String(set.title || "Image Occlusion"),
    imagePath: set.image_path,
    mode,
    cards: cards.map((card) => ({
      id: card.id,
      position: card.position,
      x: Number(card.x), y: Number(card.y), width: Number(card.width), height: Number(card.height),
      answer: String(card.answer || ""),
      reviewState: card.reviewState || null,
    })),
    index: 0,
    responses: cards.map(() => ({ revealed: false, rating: null })),
  };
}

export function isValidImageOcclusionRun(run) {
  return Boolean(run && run.version === 1 && typeof run.setId === "string" && typeof run.imagePath === "string" &&
    IMAGE_OCCLUSION_MODES.includes(run.mode) && Array.isArray(run.cards) && run.cards.length > 0 &&
    Number.isInteger(run.index) && run.index >= 0 && run.index < run.cards.length &&
    Array.isArray(run.responses) && run.responses.length === run.cards.length &&
    run.cards.every((card) => card && typeof card.id === "string" && [card.x, card.y, card.width, card.height].every(Number.isFinite) && typeof card.answer === "string"));
}

export function readImageOcclusionRun(storage) {
  try {
    const value = JSON.parse(storage?.getItem(IMAGE_OCCLUSION_RUN_KEY) || "null");
    return isValidImageOcclusionRun(value) ? value : null;
  } catch { return null; }
}

export function writeImageOcclusionRun(storage, run) {
  if (!isValidImageOcclusionRun(run) || typeof storage?.setItem !== "function") return false;
  try { storage.setItem(IMAGE_OCCLUSION_RUN_KEY, JSON.stringify(run)); return true; }
  catch { return false; }
}

export function createImageOcclusionRepository(client) {
  if (!client?.from || !client?.storage || !client?.auth) throw new Error("A Supabase client is required.");

  return {
    async listSets() {
      const { data: sets, error } = await client.from("academic_image_occlusion_sets")
        .select("id,title,image_path,mode,created_at,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      if (!sets?.length) return [];
      const setIds = sets.map(({ id }) => id);
      const { data: cards, error: cardError } = await client.from("academic_image_occlusion_cards")
        .select("id,set_id,position,x,y,width,height,answer,created_at,updated_at").in("set_id", setIds).order("position");
      if (cardError) throw cardError;
      const cardIds = (cards || []).map(({ id }) => id);
      const { data: states, error: stateError } = cardIds.length
        ? await client.from("academic_image_occlusion_review_state").select("card_id,due_at,interval_days,ease_factor,repetitions,correct_streak,lapse_count,attempts_count,mastered,last_rating,last_reviewed_at").in("card_id", cardIds)
        : { data: [], error: null };
      if (stateError) throw stateError;
      const stateByCard = new Map((states || []).map((state) => [state.card_id, state]));
      const cardsBySet = new Map();
      for (const card of cards || []) {
        const list = cardsBySet.get(card.set_id) || [];
        list.push({ ...card, reviewState: stateByCard.get(card.id) || null });
        cardsBySet.set(card.set_id, list);
      }
      return sets.map((set) => ({ ...set, cards: cardsBySet.get(set.id) || [] }));
    },

    async saveSet({ id = null, title, mode = "hide_one", imagePath = null, imageFile = null, masks = [] }) {
      const cleanTitle = String(title || "").trim();
      if (!cleanTitle) throw new Error("Nama kumpulan wajib diisi.");
      if (!IMAGE_OCCLUSION_MODES.includes(mode)) throw new Error("Mode occlusion tidak valid.");
      if (!imageFile && !imagePath) throw new Error("Pilih gambar untuk kumpulan ini.");
      if (imageFile && (!IMAGE_OCCLUSION_MIME_TYPES.includes(imageFile.type) || imageFile.size > IMAGE_OCCLUSION_MAX_IMAGE_BYTES)) {
        throw new Error("Gambar harus PNG, JPG, atau JPEG dengan ukuran maksimal 5 MB.");
      }
      const cleanMasks = validateOcclusionMasks(masks);
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData?.user) throw new Error("Sesi login tidak valid. Silakan masuk kembali.");

      const userId = authData.user.id;
      let uploadedPath = null;
      const previousPath = imagePath;
      let savedSet = null;
      let createdSet = false;
      let metadataWritten = false;
      try {
        let nextImagePath = imagePath;
        if (imageFile) {
          const extension = imageFile.type === "image/png" ? "png" : "jpg";
          uploadedPath = `${userId}/occlusion/${crypto.randomUUID()}.${extension}`;
          const { error } = await client.storage.from("academic-question-images").upload(uploadedPath, imageFile, { contentType: imageFile.type, upsert: false });
          if (error) throw new Error(`Upload gambar gagal: ${error.message}`);
          nextImagePath = uploadedPath;
        }
        if (id) {
          const { data, error } = await client.from("academic_image_occlusion_sets").update({ title: cleanTitle, mode, image_path: nextImagePath }).eq("id", id).select("id,title,image_path,mode").single();
          if (error) throw error;
          savedSet = data;
          metadataWritten = true;
        } else {
          const { data, error } = await client.from("academic_image_occlusion_sets").insert({ title: cleanTitle, mode, image_path: nextImagePath }).select("id,title,image_path,mode").single();
          if (error) throw error;
          savedSet = data;
          createdSet = true;
        }

        const { data: existing, error: existingError } = await client.from("academic_image_occlusion_cards").select("id").eq("set_id", savedSet.id);
        if (existingError) throw existingError;
        const existingIds = new Set((existing || []).map(({ id: cardId }) => cardId));
        const payloads = cleanMasks.map((mask) => ({ ...(mask.id && existingIds.has(mask.id) ? { id: mask.id } : {}), set_id: savedSet.id, position: mask.position, x: mask.x, y: mask.y, width: mask.width, height: mask.height, answer: mask.answer }));
        const { error: cardSaveError } = await client.from("academic_image_occlusion_cards").upsert(payloads, { onConflict: "id" });
        if (cardSaveError) throw cardSaveError;
        const retainedExistingIds = new Set(payloads.map(({ id: cardId }) => cardId).filter((cardId) => cardId && existingIds.has(cardId)));
        for (const oldId of existingIds) {
          if (retainedExistingIds.has(oldId)) continue;
          const { error } = await client.from("academic_image_occlusion_cards").delete().eq("id", oldId).eq("set_id", savedSet.id);
          if (error) throw error;
        }
        if (uploadedPath && previousPath && uploadedPath !== previousPath) await client.storage.from("academic-question-images").remove([previousPath]);
        return savedSet;
      } catch (error) {
        if (uploadedPath && !createdSet && !metadataWritten) await client.storage.from("academic-question-images").remove([uploadedPath]).catch(() => {});
        if (createdSet && savedSet?.id) {
          await client.from("academic_image_occlusion_sets").delete().eq("id", savedSet.id);
          if (uploadedPath) await client.storage.from("academic-question-images").remove([uploadedPath]);
        }
        throw error;
      }
    },

    async deleteSet(id) {
      const { data, error: lookupError } = await client.from("academic_image_occlusion_sets").select("image_path").eq("id", id).single();
      if (lookupError) throw lookupError;
      const { error } = await client.from("academic_image_occlusion_sets").delete().eq("id", id);
      if (error) throw error;
      const { error: storageError } = await client.storage.from("academic-question-images").remove([data.image_path]);
      if (storageError) throw storageError;
    },

    async listCards(setId) {
      const { data, error } = await client.from("academic_image_occlusion_cards").select("id,set_id,position,x,y,width,height,answer").eq("set_id", setId).order("position");
      if (error) throw error;
      const cards = data || [];
      if (!cards.length) return [];
      const { data: states, error: stateError } = await client.from("academic_image_occlusion_review_state").select("card_id,due_at,interval_days,ease_factor,repetitions,correct_streak,lapse_count,attempts_count,mastered,last_rating,last_reviewed_at").in("card_id", cards.map(({ id }) => id));
      if (stateError) throw stateError;
      const byId = new Map((states || []).map((state) => [state.card_id, state]));
      return cards.map((card) => ({ ...card, reviewState: byId.get(card.id) || null }));
    },

    async rateCard(cardId, rating) {
      if (!cardId || !["again", "hard", "good", "easy"].includes(rating)) throw new Error("Pilih rating yang valid.");
      const { data, error } = await client.rpc("rate_academic_image_occlusion_card", { p_card_id: cardId, p_rating: rating });
      if (error) throw error;
      return data;
    },
  };
}
