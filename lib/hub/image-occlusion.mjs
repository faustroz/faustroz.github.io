export const IMAGE_OCCLUSION_RUN_KEY = "4allx:academic-image-occlusion-run:v1";
export const IMAGE_OCCLUSION_MODES = Object.freeze(["hide_one", "hide_all"]);
export const IMAGE_OCCLUSION_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_OCCLUSION_MIME_TYPES = Object.freeze(["image/png", "image/jpeg"]);
const IMAGE_OCCLUSION_RATING_KEYS = Object.freeze({ "1": "again", "2": "hard", "3": "good", "4": "easy" });

export function getImageOcclusionRatingFromKey(key) {
  return IMAGE_OCCLUSION_RATING_KEYS[key] || null;
}

export function validateOcclusionMasks(masks = [], answerMode = "answer") {
  if (!Array.isArray(masks) || masks.length === 0) throw new Error("Tambahkan setidaknya satu mask.");
  if (!["answer", "mask_only"].includes(answerMode)) throw new Error("Pilih mode jawaban yang valid.");
  return masks.map((mask, index) => {
    const x = Number(mask.x);
    const y = Number(mask.y);
    const width = Number(mask.width);
    const height = Number(mask.height);
    const rotation = Number(mask.rotation ?? mask.rotation_degrees ?? 0);
    const answer = String(mask.answer || "").trim();
    if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1.000001 || y + height > 1.000001) {
      throw new Error(`Posisi mask ${index + 1} tidak valid.`);
    }
    if (!Number.isInteger(rotation) || rotation < -180 || rotation > 180) throw new Error(`Sudut mask ${index + 1} harus berupa bilangan bulat antara -180° dan 180°.`);
    if (answerMode === "answer" && !answer) throw new Error(`Jawaban mask ${index + 1} wajib diisi.`);
    return { id: typeof mask.id === "string" ? mask.id : null, position: index, x, y, width, height, rotation, answer: answerMode === "answer" ? answer : null };
  });
}

export function createImageOcclusionCardPayloads(images, setId, savedImageByPath, existingIds, createId = () => crypto.randomUUID()) {
  let position = 0;
  return images.flatMap((image) => {
    const savedImage = savedImageByPath.get(image.imagePath);
    if (!savedImage) throw new Error("Gambar tidak berhasil disimpan. Coba lagi.");
    return image.masks.map((mask) => ({
      id: mask.id && existingIds.has(mask.id) ? mask.id : createId(),
      set_id: setId,
      image_id: savedImage.id,
      position: position++,
      x: mask.x,
      y: mask.y,
      width: mask.width,
      height: mask.height,
      rotation_degrees: mask.rotation,
      answer: mask.answer,
    }));
  });
}

export function createImageOcclusionRun(set, cards, mode = set?.mode || "hide_one") {
  const fallbackImagePath = set?.images?.[0]?.image_path || set?.image_path;
  if (!set?.id || !fallbackImagePath || !Array.isArray(cards) || cards.length === 0) return null;
  if (!IMAGE_OCCLUSION_MODES.includes(mode)) throw new Error("Pilih mode Hide One atau Hide All.");
  return {
    version: 1,
    setId: set.id,
    title: String(set.title || "Image Occlusion"),
    imagePath: fallbackImagePath,
    mode,
    answerMode: set.answer_mode || "answer",
    cards: cards.map((card) => ({
      id: card.id,
      imageId: card.image_id || card.imageId || null,
      imagePath: card.image_path || card.imagePath || fallbackImagePath,
      position: card.position,
      x: Number(card.x), y: Number(card.y), width: Number(card.width), height: Number(card.height),
      rotation: Number(card.rotation_degrees ?? card.rotation ?? 0),
      answer: typeof card.answer === "string" ? card.answer : null,
      reviewState: card.reviewState || null,
    })),
    index: 0,
    responses: cards.map(() => ({ revealed: false, rating: null })),
  };
}

export function isValidImageOcclusionRun(run) {
  const answerMode = run?.answerMode || "answer";
  return Boolean(run && run.version === 1 && typeof run.setId === "string" && typeof run.imagePath === "string" &&
    IMAGE_OCCLUSION_MODES.includes(run.mode) && Array.isArray(run.cards) && run.cards.length > 0 &&
    Number.isInteger(run.index) && run.index >= 0 && run.index < run.cards.length &&
    Array.isArray(run.responses) && run.responses.length === run.cards.length &&
    ["answer", "mask_only"].includes(answerMode) &&
    run.cards.every((card) => card && typeof card.id === "string" && [card.x, card.y, card.width, card.height].every(Number.isFinite) &&
      (card.rotation == null || (Number.isFinite(card.rotation) && card.rotation >= -180 && card.rotation <= 180)) &&
      (typeof card.answer === "string" || (answerMode === "mask_only" && card.answer === null))));
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
        .select("id,title,image_path,mode,answer_mode,created_at,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      if (!sets?.length) return [];
      const setIds = sets.map(({ id }) => id);
      const { data: images, error: imageError } = await client.from("academic_image_occlusion_images")
        .select("id,set_id,image_path,position,created_at,updated_at").in("set_id", setIds).order("position");
      if (imageError) throw imageError;
      const { data: cards, error: cardError } = await client.from("academic_image_occlusion_cards")
        .select("id,set_id,image_id,position,x,y,width,height,rotation_degrees,answer,created_at,updated_at").in("set_id", setIds).order("position");
      if (cardError) throw cardError;
      const cardIds = (cards || []).map(({ id }) => id);
      const { data: states, error: stateError } = cardIds.length
        ? await client.from("academic_image_occlusion_review_state").select("card_id,due_at,interval_days,ease_factor,repetitions,correct_streak,lapse_count,attempts_count,mastered,last_rating,last_reviewed_at").in("card_id", cardIds)
        : { data: [], error: null };
      if (stateError) throw stateError;
      const stateByCard = new Map((states || []).map((state) => [state.card_id, state]));
      const imageById = new Map((images || []).map((image) => [image.id, image]));
      const cardsBySet = new Map();
      for (const card of cards || []) {
        const list = cardsBySet.get(card.set_id) || [];
        list.push({ ...card, image_path: imageById.get(card.image_id)?.image_path || null, reviewState: stateByCard.get(card.id) || null });
        cardsBySet.set(card.set_id, list);
      }
      const imagesBySet = new Map();
      for (const image of images || []) {
        const list = imagesBySet.get(image.set_id) || [];
        list.push(image);
        imagesBySet.set(image.set_id, list);
      }
      return sets.map((set) => {
        const setImages = imagesBySet.get(set.id) || [{ id: null, set_id: set.id, image_path: set.image_path, position: 0 }];
        const byImage = new Map(setImages.map((image) => [image.id, image]));
        const setCards = (cardsBySet.get(set.id) || []).map((card) => ({ ...card, image_path: byImage.get(card.image_id)?.image_path || card.image_path || set.image_path }));
        return { ...set, images: setImages.map((image) => ({ ...image, cards: setCards.filter((card) => card.image_id === image.id) })), cards: setCards };
      });
    },

    async saveSet({ id = null, title, mode = "hide_one", answerMode = "answer", imagePath = null, imageFile = null, masks = [], images: requestedImages = null }) {
      const cleanTitle = String(title || "").trim();
      if (!cleanTitle) throw new Error("Nama kumpulan wajib diisi.");
      if (!IMAGE_OCCLUSION_MODES.includes(mode)) throw new Error("Mode occlusion tidak valid.");
      if (!["answer", "mask_only"].includes(answerMode)) throw new Error("Mode jawaban tidak valid.");
      const sourceImages = Array.isArray(requestedImages) ? requestedImages : [{ id: null, imagePath, imageFile, masks }];
      if (!sourceImages.length) throw new Error("Tambahkan setidaknya satu gambar.");
      const cleanImages = sourceImages.map((image, imageIndex) => {
        if (!image.imageFile && !image.imagePath) throw new Error(`Pilih file untuk gambar ${imageIndex + 1}.`);
        if (image.imageFile && (!IMAGE_OCCLUSION_MIME_TYPES.includes(image.imageFile.type) || image.imageFile.size > IMAGE_OCCLUSION_MAX_IMAGE_BYTES)) {
          throw new Error(`Gambar ${imageIndex + 1} harus PNG, JPG, atau JPEG dengan ukuran maksimal 5 MB.`);
        }
        return { ...image, masks: validateOcclusionMasks(image.masks || [], answerMode) };
      });
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData?.user) throw new Error("Sesi login tidak valid. Silakan masuk kembali.");

      const userId = authData.user.id;
      const uploadedPaths = [];
      let savedSet = null;
      let createdSet = false;
      try {
        const preparedImages = [];
        for (const image of cleanImages) {
          let nextImagePath = image.imagePath || null;
          if (image.imageFile) {
            const extension = image.imageFile.type === "image/png" ? "png" : "jpg";
            nextImagePath = `${userId}/occlusion/${crypto.randomUUID()}.${extension}`;
            const { error } = await client.storage.from("academic-question-images").upload(nextImagePath, image.imageFile, { contentType: image.imageFile.type, upsert: false });
            if (error) throw new Error(`Upload gambar gagal: ${error.message}`);
            uploadedPaths.push(nextImagePath);
          }
          preparedImages.push({ ...image, imagePath: nextImagePath });
        }
        if (id) {
          const { data, error } = await client.from("academic_image_occlusion_sets").select("id,title,image_path,mode,answer_mode").eq("id", id).single();
          if (error) throw error;
          savedSet = data;
        } else {
          const { data, error } = await client.from("academic_image_occlusion_sets").insert({ title: cleanTitle, mode, answer_mode: answerMode, image_path: preparedImages[0].imagePath }).select("id,title,image_path,mode,answer_mode").single();
          if (error) throw error;
          savedSet = data;
          createdSet = true;
        }
        const previousSetPath = savedSet.image_path;

        const { data: existingImages, error: imageLookupError } = await client.from("academic_image_occlusion_images").select("id,image_path,position").eq("set_id", savedSet.id);
        if (imageLookupError) throw imageLookupError;
        const existingImageIds = new Set((existingImages || []).map(({ id: imageId }) => imageId));
        const imagePayloads = preparedImages.map((image, position) => ({
          ...(image.id && existingImageIds.has(image.id) ? { id: image.id } : {}),
          set_id: savedSet.id, position, image_path: image.imagePath,
        }));
        const { error: imageSaveError } = await client.from("academic_image_occlusion_images").upsert(imagePayloads, { onConflict: "id" });
        if (imageSaveError) throw imageSaveError;
        const { data: savedImages, error: savedImagesError } = await client.from("academic_image_occlusion_images").select("id,image_path,position").eq("set_id", savedSet.id).order("position");
        if (savedImagesError) throw savedImagesError;
        const savedImageByPath = new Map((savedImages || []).map((image) => [image.image_path, image]));
        const { data: updatedSet, error: setUpdateError } = await client.from("academic_image_occlusion_sets")
          .update({ title: cleanTitle, mode, answer_mode: answerMode, image_path: preparedImages[0].imagePath })
          .eq("id", savedSet.id).select("id,title,image_path,mode,answer_mode").single();
        if (setUpdateError) throw setUpdateError;
        savedSet = updatedSet;

        const { data: existing, error: existingError } = await client.from("academic_image_occlusion_cards").select("id").eq("set_id", savedSet.id);
        if (existingError) throw existingError;
        const existingIds = new Set((existing || []).map(({ id: cardId }) => cardId));
        const payloads = createImageOcclusionCardPayloads(preparedImages, savedSet.id, savedImageByPath, existingIds);
        const { error: cardSaveError } = await client.from("academic_image_occlusion_cards").upsert(payloads, { onConflict: "id" });
        if (cardSaveError) throw cardSaveError;
        const retainedExistingIds = new Set(payloads.map(({ id: cardId }) => cardId).filter((cardId) => cardId && existingIds.has(cardId)));
        for (const oldId of existingIds) {
          if (retainedExistingIds.has(oldId)) continue;
          const { error } = await client.from("academic_image_occlusion_cards").delete().eq("id", oldId).eq("set_id", savedSet.id);
          if (error) throw error;
        }
        const retainedImageIds = new Set(preparedImages.map((image) => savedImageByPath.get(image.imagePath)?.id).filter(Boolean));
        const removedImages = (existingImages || []).filter((image) => !retainedImageIds.has(image.id));
        for (const removed of removedImages) {
          const { error } = await client.from("academic_image_occlusion_images").delete().eq("id", removed.id).eq("set_id", savedSet.id);
          if (error) throw error;
        }
        const retainedPaths = new Set(preparedImages.map(({ imagePath: path }) => path));
        const obsoletePaths = [...new Set([...(existingImages || []).map(({ image_path: path }) => path), ...(id ? [previousSetPath] : [])])].filter((path) => path && !retainedPaths.has(path));
        if (obsoletePaths.length) {
          const { error } = await client.storage.from("academic-question-images").remove(obsoletePaths);
          if (error) throw error;
        }
        return savedSet;
      } catch (error) {
        if (createdSet && savedSet?.id) {
          await client.from("academic_image_occlusion_sets").delete().eq("id", savedSet.id);
          if (uploadedPaths.length) await client.storage.from("academic-question-images").remove(uploadedPaths).catch(() => {});
        } else {
          const orphanedPaths = [];
          for (const path of uploadedPaths) {
            const { data } = await client.from("academic_image_occlusion_images").select("id").eq("image_path", path).maybeSingle();
            if (!data) orphanedPaths.push(path);
          }
          if (orphanedPaths.length) await client.storage.from("academic-question-images").remove(orphanedPaths).catch(() => {});
        }
        throw error;
      }
    },

    async deleteSet(id) {
      const { data, error: lookupError } = await client.from("academic_image_occlusion_sets").select("image_path").eq("id", id).single();
      if (lookupError) throw lookupError;
      const { data: images, error: imageError } = await client.from("academic_image_occlusion_images").select("image_path").eq("set_id", id);
      if (imageError) throw imageError;
      const { error } = await client.from("academic_image_occlusion_sets").delete().eq("id", id);
      if (error) throw error;
      const paths = [...new Set([data.image_path, ...(images || []).map(({ image_path: path }) => path)].filter(Boolean))];
      const { error: storageError } = await client.storage.from("academic-question-images").remove(paths);
      if (storageError) throw storageError;
    },

    async listCards(setId) {
      const { data, error } = await client.from("academic_image_occlusion_cards").select("id,set_id,image_id,position,x,y,width,height,rotation_degrees,answer").eq("set_id", setId).order("position");
      if (error) throw error;
      const cards = data || [];
      if (!cards.length) return [];
      const { data: images, error: imageError } = await client.from("academic_image_occlusion_images").select("id,image_path").in("id", [...new Set(cards.map(({ image_id }) => image_id))]);
      if (imageError) throw imageError;
      const imageById = new Map((images || []).map((image) => [image.id, image]));
      const { data: states, error: stateError } = await client.from("academic_image_occlusion_review_state").select("card_id,due_at,interval_days,ease_factor,repetitions,correct_streak,lapse_count,attempts_count,mastered,last_rating,last_reviewed_at").in("card_id", cards.map(({ id }) => id));
      if (stateError) throw stateError;
      const byId = new Map((states || []).map((state) => [state.card_id, state]));
      return cards.map((card) => ({ ...card, image_path: imageById.get(card.image_id)?.image_path || null, reviewState: byId.get(card.id) || null }));
    },

    async rateCard(cardId, rating) {
      if (!cardId || !["again", "hard", "good", "easy"].includes(rating)) throw new Error("Pilih rating yang valid.");
      const { data, error } = await client.rpc("rate_academic_image_occlusion_card", { p_card_id: cardId, p_rating: rating });
      if (error) throw error;
      return data;
    },
  };
}
