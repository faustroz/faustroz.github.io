# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Satu pengguna utama: pemilik Personal Hub. Produk digunakan dari iPhone dan desktop untuk mengelola finance pribadi, studi, proyek, portfolio, vault/dokumen, serta utility pribadi lainnya.

## Product Purpose

Personal Hub adalah private personal command center yang cepat, simpel, dan terpusat untuk mencatat, mengelola, dan meninjau aktivitas serta data pribadi. Keberhasilan berarti pekerjaan pencatatan dan peninjauan sehari-hari terasa praktis tanpa kompleksitas yang tidak perlu.

## Positioning

Satu PWA pribadi yang menyatukan finance, studi, proyek, portfolio, dokumen, dan utility owner-only dalam akses Supabase yang privat, sambil mempertahankan landing portfolio publik yang terpisah.

## Operating Context

Pemilik menggunakan aplikasi pada iPhone dan desktop. Personal Hub berjalan sebagai static PWA yang kompatibel dengan GitHub Pages. Data privat dikelola melalui Supabase Auth dan owner-scoped RLS.

## Capabilities and Constraints

- Akses data privat harus terautentikasi melalui Supabase.
- Existing working features dan data tidak boleh rusak saat UI diperbaiki.
- Mobile-first, tetap nyaman dan efektif di desktop.
- Jangan mengubah business logic hanya demi perubahan visual.
- Jangan membuat data, statistik, atau insight palsu ketika source data kosong.
- Fitur baru harus praktis dan tidak menambah kompleksitas tanpa alasan.

## Brand Commitments

Monochrome Command Console adalah identitas visual untuk `/hub`; Night Operations tidak digunakan sebagai acuan baru. Aplikasi harus privacy-first: data sensitif tidak ditampilkan sebelum autentikasi. UI harus minimal, compact, cepat, dan menghindari card atau container yang tidak perlu.

## Evidence on Hand

- Implementasi Next.js/React berada di `app/`, `components/`, dan `lib/`.
- Modul privat dan RLS berada di `supabase/migrations/`.
- Portfolio publik tetap berada di route `/`; Personal Hub berada di `/hub`.
- Tidak ada klaim, statistik, atau data contoh yang boleh dibuat sebagai pengganti source data nyata.

## Product Principles

1. Privacy dan data ownership mendahului kenyamanan presentasi.
2. Satu tindakan harus sesingkat dan sejelas mungkin di iPhone maupun desktop.
3. Data nyata atau state kosong yang jujur lebih baik daripada metrik dekoratif.
4. Perbaikan UI harus melindungi fitur dan data yang sudah berjalan.
5. Kepadatan informasi harus fungsional, bukan dekoratif.

## Accessibility & Inclusion

Kontrol dan alur harus tetap dapat digunakan pada layar kecil maupun desktop, dengan state autentikasi, loading, error, dan no-data yang jelas.
