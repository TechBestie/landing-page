# Tech Bestie

Situs 3D Tech Bestie: portofolio, estimasi harga, dan dashboard admin.
Tersedia dalam Bahasa Indonesia dan Inggris, dengan harga dalam IDR, USD, atau AUD.

| Environment | Branch | URL | Server |
| --- | --- | --- | --- |
| Development | `dev` | https://dev.techbestie.id | 169.58.12.253, `/opt/techbestie-dev` |
| Production | `prod` | https://techbestie.id | server prod, `/opt/techbestie` |

## Menjalankan di lokal

Butuh Node 22.9+ dan PostgreSQL.

```bash
npm install
cp .env.example .env
npm run hash-password          # salin hasilnya ke ADMIN_PASSWORD_HASH di .env
# isi DATABASE_URL di .env, contoh: postgres://user:pass@127.0.0.1:5432/techbestie
npm run dev
```

Buka http://localhost:5183. Dashboard admin ada di http://localhost:5183/admin.
Tabel database dibuat otomatis saat server pertama kali jalan.

Test (butuh database kosong khusus test, isinya dihapus):

```bash
npm run build
DATABASE_URL=postgres://... npm test
```

## Alur kerja dan CI/CD

```
feature branch --PR--> dev --PR--> prod
                        |           |
                 dev.techbestie.id  techbestie.id
```

Workflow ada di `.github/workflows/ci-cd.yml`.

| Event | Yang dijalankan |
| --- | --- |
| Pull request ke `main`, `dev`, `prod` | Build, test (dengan Postgres), shellcheck, `npm audit` |
| Push ke `dev` | Test, lalu deploy ke development |
| Push ke `prod` | Test, lalu deploy ke production |

Cara deploy: GitHub Actions membangun image Docker, mengirimnya ke server lewat SSH (`docker save | docker load`, tanpa registry), menyalin `docker-compose.yml` dan `backup.sh` ke folder app, lalu menjalankan `deploy/release.sh`.
Script itu mengganti container dan menunggu health check `/api/health`. Kalau container tidak sehat, otomatis kembali ke build sebelumnya. Tiga build terakhir disimpan untuk rollback manual.

Pengaturan per environment di GitHub (Settings → Environments):

| Nama | Jenis | Isi |
| --- | --- | --- |
| `SSH_HOST` | variable | IP server |
| `SSH_USER` | variable | user SSH (harus bisa menjalankan `docker`) |
| `APP_URL` | variable | opsional, untuk smoke test, contoh `https://techbestie.id` |
| `SMOKE_RESOLVE` | variable | opsional, contoh `techbestie.id:443:1.2.3.4` selama DNS belum pindah |
| `SSH_KEY` | secret | private key deploy |
| `SSH_KNOWN_HOSTS` | secret | hasil `ssh-keyscan <IP server>` |

Environment `development` hanya menerima deploy dari branch `dev`, dan `production` hanya dari `prod`.

### Rollback manual

```bash
cd /opt/techbestie                 # atau /opt/techbestie-dev
docker image ls techbestie         # atau techbestie-dev
docker tag techbestie:<sha-lama> techbestie:current
docker compose up -d --force-recreate --no-deps app
```

Rollback tidak membatalkan perubahan isi database.

## Setup server production (sekali saja)

Production memakai Postgres bersama (shared) dan nginx bersama, keduanya dalam container dan terhubung lewat Docker network. App tidak membuka port ke host.

1. **Database dan user baru** di Postgres bersama (sesuaikan nama container):
   ```bash
   PW=$(openssl rand -hex 24); echo "$PW"
   docker exec -i shared-db psql -U admin -d postgres <<SQL
   CREATE ROLE techbestie LOGIN CONNECTION LIMIT 5 PASSWORD '$PW';
   CREATE DATABASE techbestie OWNER techbestie;
   REVOKE ALL ON DATABASE techbestie FROM PUBLIC;
   SQL
   ```
   Tabel dibuat oleh app sendiri. User ini cukup menjadi owner database-nya, tidak perlu superuser.

2. **Folder app dan `.env`**:
   ```bash
   install -d -m 750 /opt/techbestie && cd /opt/techbestie
   cat > .env <<EOF
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=<hasil npm run hash-password>
   DATABASE_URL=postgres://techbestie:<PW>@shared-db:5432/techbestie
   # Kalau nama Docker network di server berbeda:
   # NGINX_NETWORK=compose_nginx-network
   # DB_NETWORK=shared-db-net
   EOF
   chmod 600 .env
   ```

3. **Deploy key** untuk GitHub Actions:
   ```bash
   ssh-keygen -t ed25519 -N '' -C gha-techbestie-prod -f ~/.ssh/gha_techbestie_prod
   echo "restrict $(cat ~/.ssh/gha_techbestie_prod.pub)" >> ~/.ssh/authorized_keys
   ```
   Isi environment `production` di GitHub: `SSH_HOST`, `SSH_USER`, `SSH_KEY` (isi file private key), dan `SSH_KNOWN_HOSTS` (`ssh-keyscan <IP>`). Lalu push ke `prod`.

4. **SSL dari Cloudflare (bukan certbot)**: domain di-proxy Cloudflare dengan mode SSL/TLS **Full (strict)**. Di dashboard Cloudflare buka SSL/TLS → Origin Server → Create Certificate untuk `techbestie.id, *.techbestie.id` (RSA, 15 tahun). Simpan certificate sebagai `fullchain.pem` dan private key sebagai `privkey.pem` (chmod 600) di `/root/master/certbot/live/techbestie.id/`. Sertifikat ini tidak perlu diperpanjang.

5. **Nginx**: salin `deploy/prod/nginx-techbestie.id.conf` ke `/root/master/nginx/conf.d/techbestie.id.conf`, lalu `docker exec nginx nginx -t && docker exec nginx nginx -s reload`. App bisa dijangkau dari container nginx di `http://techbestie-app:3000`. IP asli pengunjung diambil dari `CF-Connecting-IP`, dan hanya dipercaya kalau koneksinya datang dari IP Cloudflare.

   DNS `@` dan `www` (proxied, awan oranye) mengarah ke `62.146.235.187`. Email memakai `mx1/mx2.hostinger.com`, jadi tidak terpengaruh.

6. **Backup harian** (shared-db memakai PostgreSQL 16, jadi set `BACKUP_PG_IMAGE=postgres:16-alpine` di `.env`):
   ```bash
   echo '30 2 * * * root /opt/techbestie/backup.sh >> /var/log/techbestie-backup.log 2>&1' > /etc/cron.d/techbestie-backup
   ```

## Server development

Sudah terpasang di 169.58.12.253:

- `/opt/techbestie-dev`: `.env`, `docker-compose.yml` (app dan Postgres sendiri), `uploads/`, `backups/`
- App hanya listen di `127.0.0.1:5183`, lalu nginx host meneruskan `dev.techbestie.id` ke port itu.
- Backup harian jam 02:30 lewat `/etc/cron.d/techbestie-dev-backup`, disimpan 14 hari.

Setelah record `dev` (proxied) di Cloudflare mengarah ke 169.58.12.253, aktifkan HTTPS memakai Cloudflare Origin Certificate yang sama dengan prod (berlaku untuk `*.techbestie.id`):

```bash
install -d -m 700 /etc/ssl/techbestie.id   # isi fullchain.pem + privkey.pem dari Cloudflare
cp deploy/dev/nginx-dev.techbestie.id.conf /etc/nginx/sites-available/dev.techbestie.id
nginx -t && systemctl reload nginx
gh variable set APP_URL --env development -R TechBestie/landing-page -b https://dev.techbestie.id
```

## Backup dan restore

`backup.sh` menyimpan dump database (`pg_dump`, format custom) dan arsip `uploads/` ke `backups/`.

```bash
cd /opt/techbestie
docker run --rm -i --network container:techbestie-app postgres:17-alpine \
  pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" < backups/db-<waktu>.dump
tar -xzf backups/uploads-<waktu>.tar.gz
```

Backup masih tersimpan di server yang sama. Untuk perlindungan penuh, salin juga folder `backups/` ke tempat lain secara berkala.

## Dashboard admin

| Tab | Isi |
| --- | --- |
| Slide | Judul, klien, kategori, deskripsi, dan gambar tiap slide |
| Fitur & harga | Pertanyaan, opsi, harga, dan pengali di estimasi harga |
| Pengaturan | Nomor WhatsApp, rentang estimasi, dan kurs |
| Leads | Kontak yang masuk dari form estimasi (500 terbaru) |

Untuk mengganti password admin: jalankan `npm run hash-password`, masukkan hasilnya ke `ADMIN_PASSWORD_HASH` di `.env` server, lalu `docker compose up -d --force-recreate app`.
Sesi login disimpan di database dan berlaku 8 jam.

## Keamanan

- Password admin disimpan sebagai hash scrypt. Sesi disimpan di database sebagai hash.
- Login dibatasi 5 percobaan per menit per IP. Form leads dibatasi 5 kiriman per 10 menit per IP dan punya honeypot anti-bot.
- Request yang mengubah data harus datang dari origin yang sama.
- Header yang dikirim: CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, dan `Permissions-Policy`. HSTS dikirim oleh nginx.
- `TRUST_PROXY=1` membuat app memercayai `X-Real-IP` dan `X-Forwarded-Proto`. Hanya aktifkan kalau port app tidak bisa dijangkau langsung dari internet.

## Cara harga dihitung

Setiap opsi punya `price` (ditambahkan, dalam rupiah) atau `mult` (pengali).
Total = jumlah semua `price` × semua `mult`, lalu ditampilkan sebagai rentang ± persentase di Pengaturan.
Harga disimpan dalam rupiah dan dikonversi saat ditampilkan.

Kurs otomatis diambil dari api.frankfurter.dev, dengan open.er-api.com sebagai cadangan, dan disimpan 6 jam.
Kalau keduanya tidak bisa diakses, kurs manual di Pengaturan yang dipakai.

## Isi folder

| Path | Isi |
| --- | --- |
| `server.js` | Server HTTP dan API |
| `db.js` | Skema dan query PostgreSQL |
| `password.js` | Hash password admin (`npm run hash-password`) |
| `test/` | Test integrasi (server sungguhan dan Postgres) |
| `Dockerfile` | Image production |
| `deploy/release.sh` | Ganti container, cek kesehatan, dan rollback otomatis |
| `deploy/backup.sh` | Backup database dan uploads |
| `deploy/dev/`, `deploy/prod/` | Docker Compose dan config nginx tiap environment |
| `web/` | Kode situs |
| `web/src/pricing-default.js` | Pertanyaan dan harga bawaan |
| `web/src/i18n.js` | Teks situs dalam dua bahasa |
| `web/src/data.js` | Slide bawaan dan kategori |
| `index.html` | File estimator asli, sumber isi wizard. Tidak dipakai situs |
