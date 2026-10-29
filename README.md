# CHARGEGUARD: Multi-Edge Charging Station Guardian & Battery Estimator

Sistem Pemantau Keamanan & Estimasi Baterai Charging Station Multi-Edge berbasis Web IoT (Android Web APIs + MQTT over WebSockets).

---

## Daftar Isi
1. [Arsitektur Sistem](#1-arsitektur-sistem)
2. [Struktur File](#2-struktur-file)
3. [Panduan Menjalankan Sistem](#3-panduan-menjalankan-sistem)
4. [Tantangan Teknis & Kunci Keberhasilan](#4-tantangan-teknis--kunci-keberhasilan)
5. [Rumus Algoritma yang Diterapkan](#5-rumus-algoritma-yang-diterapkan)
6. [Skenario Pengujian Demo](#6-skenario-pengujian-demo)

---

## 1. Arsitektur Sistem

ChargeGuard terdiri dari 3 simpul (node) yang saling terhubung:
```
  [ Edge Node 1: HP 1 ]                [ Edge Node 2: HP 2 ]
 (Ditempel di Charging Dock)          (Dipegang Rekan Mahasiswa)
  - Fuel Gauge (Battery API)           - Alarm Darurat (Siren)
  - 3-Axis Accel & SMV                 - Remote Disarm Command
  - Decision Tree Edge                 - Live Security Badge
            │                                    │
            │ wss:// (WebSockets)                │ wss://
            ▼                                    ▼
     ┌──────────────────────────────────────────────────┐
     │           Public Cloud MQTT Broker               │
     │      (broker.emqx.io / broker.hivemq.com)        │
     └──────────────────────────────────────────────────┘
                            ▲
                            │ wss://
                            │
               [ Central Dashboard: Laptop ]
                - Time-Series Batch Processing
                - Linear Regression (Y = mX + c)
                - Dual Chart: Baterai & SMV Stream
                - Audit Trail Log Table
```

### Topik MQTT:
* `chargeguard/{roomId}/node1/telemetry`: Data periodik baterai, status charging, dan nilai SMV.
* `chargeguard/{roomId}/node1/alert`: Jalur prioritas tinggi (QoS 1) jika terdeteksi Status 4 (Pencurian).
* `chargeguard/{roomId}/command`: Jalur kendali jarak jauh (Disarm, Test Alarm, Set Sensitivitas SMV).

---

## 2. Struktur File

```
chargeguard/
├── index.html       # Launcher Hub + QR Code Generator dinamis untuk HP 1 & HP 2
├── node1.html       # Edge Device 1 (Charging Node - Sensor Baterai & SMV)
├── node2.html       # Edge Device 2 (Watcher Node - Alarm Darurat & Monitor)
├── dashboard.html   # Central Dashboard (Grafik Chart.js, Regresi Linear, Audit Log)
├── shared.js        # Modul bersama (MQTT config, Siren Web Audio, WakeLock, Linear Regression)
├── server.js        # Local Web Server (Node.js tanpa dependencies luar)
└── README.md        # Panduan teknis lengkap
```

---

## 3. Panduan Menjalankan Sistem

### Opsi A: Menggunakan Local Server (Node.js) + Cloudflare/Ngrok (Direkomendasikan)
Karena Android Chrome **mewajibkan HTTPS** untuk mengakses Battery Status API dan DeviceMotion API:

1. Buka terminal di folder proyek:
   ```bash
   cd chargeguard
   node server.js
   ```
2. Buat tunnel HTTPS instan (gratis tanpa daftar):
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
   *(Atau pakai ngrok: `npx ngrok http 3000`)*
3. Anda akan mendapatkan URL HTTPS publik, contoh:
   `https://random-subdomain.trycloudflare.com`
4. Buka URL tersebut di browser laptop:
   * Halaman `index.html` akan menampilkan **QR Code** untuk HP 1 dan HP 2.
   * Scan QR Code Node 1 dengan HP 1.
   * Scan QR Code Node 2 dengan HP 2.
   * Buka Dashboard di Laptop.

### Opsi B: Deploy ke GitHub Pages / Vercel (Gratis & Langsung HTTPS)
Karena semua file bersifat statis (HTML/JS/CSS), Anda cukup upload folder ini ke repository GitHub dan aktifkan **GitHub Pages**, atau drag-and-drop ke **Vercel / Netlify**.

---

## 4. Tantangan Teknis & Kunci Keberhasilan

1. **Wajib HTTPS:** Browser modern (Chrome Android) mematikan `navigator.getBattery` dan `devicemotion` pada HTTP biasa demi privasi. Selalu gunakan URL HTTPS.
2. **Screen Wake Lock:** HP 1 dilengkapi tombol **"Aktifkan Pengawasan (Start Guard)"**. Saat tombol ditekan, browser meminta izin `navigator.wakeLock` agar layar tidak mati, sehingga Android tidak mem-freeze JavaScript di latar belakang.
3. **Web Audio Siren:** Sirene dibuat secara sintetis (*pure synthesizer*) menggunakan Web Audio API (gelombang *sawtooth* 650Hz–1250Hz), tidak memerlukan file MP3 eksternal sehingga dijamin 100% berbunyi seketika tanpa masalah buffer.
4. **Temporal Buffer:** Deteksi pencurian menggunakan *rolling buffer* 2 detik. Jika kabel terlepas, sistem mengecek getaran dalam 2 detik terakhir sehingga sentakan sebelum kabel lepas tetap tercatat sebagai pencurian.

---

## 5. Rumus Algoritma yang Diterapkan

### A. Signal Magnitude Vector (SMV)
Untuk mereduksi getaran 3-sumbu menjadi 1 besaran skalar:
$$\text{SMV} = \sqrt{X^2 + Y^2 + Z^2}$$

* Nilai $\text{SMV} \le 2.5\text{ m/s}^2$: Getaran normal / noise meja.
* Nilai $\text{SMV} > 2.5\text{ m/s}^2$: Gerakan fisik signifikan (HP diangkat / dicabut paksa).

### B. Decision Tree Keamanan (4 Status)
```
[Evaluasi Sensor]
 ├── Status charging == TRUE?
 │    ├── Level Baterai >= 95%?
 │    │    ├── YA  --> [Status 2: Baterai Penuh (Silakan Cabut)]
 │    │    └── TIDAK -> [Status 1: Aman / Sedang Mengisi Daya]
 │    └── Status charging == FALSE (Kabel Lepas)?
 │         ├── Max SMV (2 detik terakhir) > Threshold?
 │         │    ├── YA  --> [Status 4: BAHAYA - Pencabutan Paksa / Dicuri!]
 │         │    └── TIDAK -> [Status 3: Peringatan - Listrik Padam / Kabel Kendor]
```

### C. Regresi Linear Estimasi Waktu Penuh
Menghitung laju kenaikan baterai per menit:
$$Y = m \cdot X + c$$

Di mana:
* $m = \frac{N \sum (t \cdot L) - (\sum t)(\sum L)}{N \sum (t^2) - (\sum t)^2}$ (Laju pengisian % per menit)
* $c = \frac{\sum L - m \sum t}{N}$ (Intersep awal)
* Waktu saat baterai mencapai 100%:
  $$t_{\text{penuh}} = \frac{100 - c}{m}$$
* Sisa Waktu (Menit):
  $$t_{\text{sisa}} = t_{\text{penuh}} - t_{\text{saat ini}}$$

---

## 6. Skenario Pengujian Demo (Saat Presentasi)

Pada `node1.html`, disediakan tombol **"Alat Uji Simulasi (Demo Meja)"** untuk memudahkan presentasi di depan dosen/penilai:

1. **Skenario 1 (Normal Charging):** Klik *"Colok Charger"* $\rightarrow$ Status berubah menjadi **Status 1 (Hijau - Aman)**.
2. **Skenario 2 (Baterai Penuh):** Klik *"Simulasikan 100%"* $\rightarrow$ Status berubah menjadi **Status 2 (Biru - Baterai Penuh)**.
3. **Skenario 3 (Listrik Padam / Kabel Kendor):** Klik *"Cabut Halus"* $\rightarrow$ Status berubah menjadi **Status 3 (Kuning - Peringatan)** tanpa bunyi alarm.
4. **Skenario 4 (Pencurian HP):** Klik *"Cabut Sentak (Curi!)"* atau goyangkan HP fisik saat kabel dicabut $\rightarrow$ **Status 4 (Merah Berkedip)**:
   * HP 1 membunyikan sirene polisi keras dan bergetar.
   * HP 2 (Watcher) seketika bergetar dan membunyikan alarm darurat via MQTT.
   * Dashboard menampilkan banner merah dan log audit darurat.
5. **Skenario 5 (Disarm Jarak Jauh):** Tekan tombol *"Disarm"* di HP 2 atau Dashboard $\rightarrow$ Alarm di HP 1 seketika mati.
