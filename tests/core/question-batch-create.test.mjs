import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Question Bank queues validated drafts and saves them together, including attached images", async () => {
  const source = await readFile(new URL("../../components/hub/QuestionLibrary.jsx", import.meta.url), "utf8");

  assert.match(source, /const \[questionDrafts, setQuestionDrafts\] = useState\(\[\]\)/);
  assert.match(source, /questionFormRef\.current\?\.reportValidity\(\)/);
  assert.match(source, /setQuestionDrafts\(\(drafts\) => \[\.\.\.drafts, \{ \.\.\.form, options: \{ \.\.\.form\.options \} \}\]\)/);
  assert.match(source, /const batch = \[\.\.\.questionDrafts, \{ \.\.\.form, options: \{ \.\.\.form\.options \} \}\]/);
  assert.match(source, /for \(const item of batch\)/);
  assert.match(source, /delete payload\.image_file/);
  assert.match(source, /\.\.\.carryQuestionMetadata\(form\)/);
  assert.match(source, /<select required value=\{form\.block\}/);
  assert.match(source, /SIMPAN SEMUA \(\$\{questionDrafts\.length \+ 1\}\)/);
  assert.match(source, /TAMBAH SOAL/);
});
