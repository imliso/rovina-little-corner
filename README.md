# Rovina's Little Corner

Halaman profil sederhana untuk Rovina, dengan tautan media sosial, hobi, musik favorit, dan feed foto/kenangan. Tidak perlu login. Supabase menyimpan postingan dan foto; GitHub Pages dapat meng-host halaman web secara gratis.

## Menjalankan di komputer

Buka folder proyek di VS Code dan gunakan **Live Server**, atau jalankan `python -m http.server 8000`. Buka `http://localhost:8000`.

## Menghubungkan feed publik Supabase

URL proyek dan kunci publik sudah disimpan di `config.js`. Kunci publik memang boleh dipakai di browser. Jangan pernah memasukkan kunci `service_role` atau secret key.

Skema awal (`supabase/schema.sql`) sudah dibuat. Untuk menambahkan feed, reaksi, foto utama, dan izin unggah publik:

1. Buka `supabase/public_feed_migration.sql`.
2. Di Supabase, buka **SQL Editor → New query**, salin seluruh isi file, lalu pilih **Run**. Jalankan file terbaru ini sekali. Jika pernah menjalankan versi sebelumnya atau upload foto ditolak oleh RLS, jalankan ulang seluruh file ini; tabel dan kebijakan akan diperbarui dengan aman.
3. Setelah query berhasil, muat ulang situs. Folder `portrait/` kini diizinkan untuk upload dan penghapusan foto utama.

**Perhatian:** tanpa login, siapa pun yang memiliki tautan situs dapat menambahkan postingan, mengganti foto utama Rovina, memberi hati, dan menghapus postingan/foto. Konfirmasi bukan pembatas akses. Hati dibatasi satu per browser dan dapat diakali dengan menghapus data browser. Jangan bagikan tautan ke publik jika situs hanya untuk lingkaran teman.

## Mengisi profil Rovina

Buka `rovina-profile.js` untuk mengisi bio, foto utama, hobi, artis atau lagu favorit, tautan playlist Spotify, ulang tahun (`MM-DD`), daftar fakta, dan sosial media Rovina. Ganti teks contoh dengan informasi yang benar; jangan biarkan placeholder dianggap sebagai informasi sebenarnya. Tautan sosial yang kosong tidak akan ditampilkan. Foto terbaru di feed otomatis menjadi foto utama jika `portraitUrl` belum diisi. Stiker foto dapat diklik untuk kejutan kecil.

## Hosting gratis dengan GitHub Pages

Repository lokal sudah disiapkan dengan workflow deploy otomatis.

1. Di VS Code, buka **Source Control**. Pilih **Publish to GitHub**, masuk dengan akun GitHub tujuan, lalu pilih **Public repository**. Ini mengunggah file dari folder proyek yang sedang terbuka; tidak menghapus folder lokal.
2. Setelah repository dibuat, buka repository GitHub → **Settings → Pages** dan ubah sumber deploy menjadi **GitHub Actions**.
3. Workflow akan menerbitkan situs setelah push pertama dan setiap push berikutnya. Alamat situs akan muncul di **Settings → Pages**.

Foto Rovina dan feed bersifat publik. File `config.js` berisi publishable key Supabase yang memang dipakai browser; jangan pernah menambahkan `service_role` atau secret key ke repository. Tanpa login, siapa pun dengan tautan situs dapat menambah dan menghapus postingan.
