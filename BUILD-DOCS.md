# 🚀 Panduan Lengkap Build & Update VPS Skinet

Dokumen ini berisi rangkuman seluruh langkah build, konfigurasi environment, dan pemeliharaan server VPS agar proses update selalu berjalan lancar dan bebas error.

---

## ⚡ 1. Cara Update Cepat (1 Baris Perintah)

Setiap kali ada pembaruan kode di GitHub dan Anda ingin memperbarui VPS, jalankan perintah berikut di terminal VPS:

```bash
cd ~/skinet && git fetch origin main && git reset --hard origin/main && bash deploy.sh
```

---

## ⚙️ 2. Konfigurasi Environment (`.env.local`)

Pastikan file `~/skinet/apps/web/.env.local` berisi konfigurasi berikut:

```env
# URL Supabase HTTPS Proxy (mencegah error Mixed Content)
NEXT_PUBLIC_SUPABASE_URL=https://mybiz.itpintar.co.id/supabase

# Kunci Anon & Service Role Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Catatan Penting:** 
> Pengaturan `https://mybiz.itpintar.co.id/supabase` otomatis diteruskan oleh reverse proxy internal Next.js ke `http://127.0.0.1:8000` di dalam server lokal VPS, sehingga koneksi selalu aman (HTTPS).

---

## 📁 3. Penyimpanan Gambar (Upload Lokal VPS)

- Gambar yang diunggah dari menu **Help Center** atau fitur lainnya disimpan langsung di penyimpanan lokal VPS pada folder:
  `~/skinet/apps/web/public/uploads/`
- Browser mengakses gambar secara langsung melalui URL:
  `https://mybiz.itpintar.co.id/uploads/[folder]/[nama-file].png`
- Tidak memerlukan layanan Cloudflare R2 atau storage eksternal.

---

## 🔧 4. Perintah Pemeliharaan PM2 (Troubleshooting)

| Kebutuhan | Perintah Terminal |
| :--- | :--- |
| **Cek Status Server** | `pm2 status` |
| **Lihat Log Server** | `pm2 logs skinet-web --lines 30 --nostream` |
| **Restart Server** | `pm2 restart skinet-web` |
| **Reload Server (Zero Downtime)** | `pm2 reload skinet-web` |
| **Daftar Ulang PM2 Jika Error** | `cd ~/skinet/apps/web && pm2 delete skinet-web && pm2 start ./node_modules/next/dist/bin/next --name "skinet-web" -- start -p 3000 && pm2 save` |

---

## 🛠️ 5. Penjelasan Script Otomatis (`deploy.sh`)

Script [`deploy.sh`](file:///Volumes/SSD_LEXAR_512/workspace/workspaceSkinet/source-code/apps/web/deploy.sh) otomatis menjalankan 4 tahapan:
1. `git fetch origin main && git reset --hard origin/main` (Tarik commit terbaru)
2. `rsync -av --delete ~/skinet/app/ ~/skinet/apps/web/app/` (Sinkronisasi monorepo)
3. `cd ~/skinet/apps/web && pnpm build` (Kompilasi Next.js production bundle)
4. `pm2 reload skinet-web` (Memuat ulang server tanpa downtime)
