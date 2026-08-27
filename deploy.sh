#!/bin/bash
set -e

echo "=========================================="
echo "🚀 Memulai Proses Update & Build Skinet Web"
echo "=========================================="

# 1. Masuk ke root direktori
cd ~/skinet

# 2. Tarik kode terbaru dari branch main
echo "📥 [1/4] Menarik kode terbaru dari GitHub..."
git fetch origin main
git reset --hard origin/main

# 3. Sinkronisasi file ke subfolder apps/web jika ada
echo "🔄 [2/4] Menyinkronkan struktur aplikasi..."
if [ -d "$HOME/skinet/apps/web" ]; then
  rsync -av --delete --exclude 'node_modules' --exclude '.next' ~/skinet/app/ ~/skinet/apps/web/app/
  cp ~/skinet/next.config.js ~/skinet/apps/web/next.config.js 2>/dev/null || true
  
  echo "🏗️  [3/4] Menjalankan proses build (Next.js)..."
  cd ~/skinet/apps/web
  pnpm build
else
  echo "🏗️  [3/4] Menjalankan proses build (Next.js)..."
  pnpm build
fi

# 4. Reload PM2
echo "♻️  [4/4] Me-reload server PM2..."
cd ~/skinet/apps/web
pm2 reload skinet-web || pm2 start ./node_modules/next/dist/bin/next --name "skinet-web" -- start -p 3000
pm2 save

echo "=========================================="
echo "✅ DEPLOYMENT BERHASIL! Website telah aktif."
echo "=========================================="
