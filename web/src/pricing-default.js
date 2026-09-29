// Default pricing wizard. The admin dashboard saves an edited copy on the
// server; this file is only used until that happens.
//   price : added to the total, in rupiah
//   mult  : multiplies the total (1.3 = +30%)
//   multi : true = pick several, false = pick one

export const DEFAULT_SETTINGS = {
  wa: '', // WhatsApp number, international format without "+"
  range: 0.15, // estimate is shown as mid ± range
  ratesMode: 'auto', // 'auto' = live exchange rates, 'manual' = the rates below
  manualRates: { USD: 16500, AUD: 11000 }, // rupiah per 1 unit
}

export const DEFAULT_PRICING = {
  root: {
    title: { id: 'Lu butuh bantuan apa?', en: 'What do you need help with?' },
    hint: { id: 'Pilih satu layanan. Nanti kami tanya detailnya.', en: 'Pick one service. We will ask for the details next.' },
    multi: false,
    options: [
      {
        id: 'web', ico: '🧩', next: 'web_platform',
        title: { id: 'Web / Mobile Apps Development', en: 'Web / Mobile Apps Development' },
        desc: {
          id: 'Landing page, company profile, marketplace, SaaS, sampai aplikasi mobile iOS & Android.',
          en: 'Landing pages, company profiles, marketplaces, SaaS, and mobile apps for iOS & Android.',
        },
      },
      {
        id: 'ai', ico: '🤖', next: 'ai_type',
        title: { id: 'AI Development', en: 'AI Development' },
        desc: {
          id: 'Chatbot, knowledge base (RAG), agent otomasi, computer vision, atau model custom.',
          en: 'Chatbots, knowledge bases (RAG), automation agents, computer vision, or custom models.',
        },
      },
      {
        id: 'vapt', ico: '🛡️', next: 'vapt_target',
        title: { id: 'VAPT / Cyber Security', en: 'VAPT / Cyber Security' },
        desc: {
          id: 'Vulnerability Assessment & Penetration Testing untuk web, API, mobile, dan network.',
          en: 'Vulnerability Assessment & Penetration Testing for web, API, mobile and network.',
        },
      },
    ],
  },

  /* ---------- VAPT ---------- */
  vapt_target: {
    title: { id: 'Apa aja yang mau diuji?', en: 'What should we test?' },
    hint: { id: 'Boleh pilih lebih dari satu.', en: 'You can pick more than one.' },
    multi: true, next: 'vapt_method',
    options: [
      { id: 'web', price: 15000000, title: { id: 'Web Application', en: 'Web Application' }, desc: { id: 'Website atau web app: XSS, injection, auth bypass, business logic, dsb.', en: 'Website or web app: XSS, injection, auth bypass, business logic and more.' } },
      { id: 'api', price: 12000000, title: { id: 'API', en: 'API' }, desc: { id: 'REST/GraphQL: broken auth, IDOR, rate limiting, data exposure.', en: 'REST/GraphQL: broken auth, IDOR, rate limiting, data exposure.' } },
      { id: 'mobile', price: 18000000, title: { id: 'Mobile App', en: 'Mobile App' }, desc: { id: 'Android/iOS: reverse engineering, insecure storage, komunikasi tidak aman.', en: 'Android/iOS: reverse engineering, insecure storage, insecure communication.' } },
      { id: 'network', price: 14000000, title: { id: 'Network / Infra', en: 'Network / Infra' }, desc: { id: 'Server, firewall, service terbuka, misconfiguration.', en: 'Servers, firewalls, exposed services, misconfiguration.' } },
    ],
  },
  vapt_method: {
    title: { id: 'Metode pengujiannya?', en: 'Which testing method?' },
    hint: { id: 'Semakin dalam akses yang kami dapat, semakin menyeluruh hasilnya.', en: 'The deeper the access we get, the more thorough the result.' },
    multi: false, next: 'vapt_size',
    options: [
      { id: 'black', mult: 1.0, title: { id: 'Black Box', en: 'Black Box' }, desc: { id: 'Tanpa info internal. Simulasi penyerang dari luar.', en: 'No inside information. Simulates an outside attacker.' } },
      { id: 'gray', mult: 1.25, title: { id: 'Gray Box', en: 'Gray Box' }, desc: { id: 'Dengan akun user & dokumentasi terbatas. Paling umum dipilih.', en: 'With a user account and limited documentation. The most common choice.' } },
      { id: 'white', mult: 1.6, title: { id: 'White Box', en: 'White Box' }, desc: { id: 'Akses penuh ke source code & arsitektur. Paling menyeluruh.', en: 'Full access to source code and architecture. The most thorough.' } },
    ],
  },
  vapt_size: {
    title: { id: 'Seberapa besar sistemnya?', en: 'How large is the system?' },
    hint: { id: 'Perkiraan aja, nanti kami verifikasi.', en: 'A rough guess is fine. We will verify later.' },
    multi: false, next: 'vapt_retest',
    options: [
      { id: 's', mult: 1.0, title: { id: 'Kecil', en: 'Small' }, desc: { id: '< 20 halaman/endpoint, 1–2 role user.', en: '< 20 pages/endpoints, 1–2 user roles.' } },
      { id: 'm', mult: 1.5, title: { id: 'Sedang', en: 'Medium' }, desc: { id: '20–80 halaman/endpoint, beberapa role.', en: '20–80 pages/endpoints, several roles.' } },
      { id: 'l', mult: 2.2, title: { id: 'Besar', en: 'Large' }, desc: { id: '> 80 halaman/endpoint, multi-tenant, atau integrasi kompleks.', en: '> 80 pages/endpoints, multi-tenant, or complex integrations.' } },
    ],
  },
  vapt_retest: {
    title: { id: 'Perlu re-test setelah perbaikan?', en: 'Need a re-test after fixes?' },
    hint: { id: 'Kami uji ulang temuan setelah tim lu memperbaikinya.', en: 'We test the findings again after your team fixes them.' },
    multi: false, next: 'RESULT',
    options: [
      { id: 'yes', mult: 1.2, title: { id: 'Ya, termasuk re-test', en: 'Yes, include a re-test' }, desc: { id: '1× re-test dalam 30 hari + laporan final.', en: '1× re-test within 30 days + final report.' } },
      { id: 'no', mult: 1.0, title: { id: 'Tidak perlu', en: 'Not needed' }, desc: { id: 'Laporan temuan + rekomendasi saja.', en: 'Findings report + recommendations only.' } },
    ],
  },

  /* ---------- WEB / MOBILE ---------- */
  web_platform: {
    title: { id: 'Platform apa yang dibutuhkan?', en: 'Which platforms do you need?' },
    hint: { id: 'Boleh pilih lebih dari satu.', en: 'You can pick more than one.' },
    multi: true, next: 'web_type',
    options: [
      { id: 'web', price: 10000000, title: { id: 'Website / Web App', en: 'Website / Web App' }, desc: { id: 'Diakses lewat browser, responsive di semua device.', en: 'Runs in the browser, responsive on every device.' } },
      { id: 'android', price: 15000000, title: { id: 'Android', en: 'Android' }, desc: { id: 'Aplikasi native/cross-platform, publish ke Play Store.', en: 'Native or cross-platform app, published to the Play Store.' } },
      { id: 'ios', price: 15000000, title: { id: 'iOS', en: 'iOS' }, desc: { id: 'Aplikasi native/cross-platform, publish ke App Store.', en: 'Native or cross-platform app, published to the App Store.' } },
    ],
  },
  web_type: {
    title: { id: 'Jenis aplikasinya?', en: 'What kind of application?' },
    hint: { id: '', en: '' },
    multi: false, next: 'web_features',
    options: [
      { id: 'landing', mult: 0.6, title: { id: 'Landing Page', en: 'Landing Page' }, desc: { id: '1–3 halaman, fokus konversi. Cocok buat campaign atau produk tunggal.', en: '1–3 pages focused on conversion. Good for a campaign or a single product.' } },
      { id: 'profile', mult: 1.0, title: { id: 'Company Profile', en: 'Company Profile' }, desc: { id: '5–10 halaman, CMS supaya bisa update konten sendiri.', en: '5–10 pages with a CMS so you can update content yourself.' } },
      { id: 'commerce', mult: 2.2, title: { id: 'E-commerce / Marketplace', en: 'E-commerce / Marketplace' }, desc: { id: 'Katalog, keranjang, checkout, pembayaran, manajemen order.', en: 'Catalogue, cart, checkout, payments, order management.' } },
      { id: 'saas', mult: 3.0, title: { id: 'SaaS / Platform', en: 'SaaS / Platform' }, desc: { id: 'Multi-user, subscription, dashboard, role & permission.', en: 'Multi-user, subscriptions, dashboard, roles & permissions.' } },
      { id: 'custom', mult: 2.5, title: { id: 'Custom / Internal Tool', en: 'Custom / Internal Tool' }, desc: { id: 'Sistem sesuai proses bisnis lu: ERP ringan, booking, inventory, dsb.', en: 'A system built around your process: light ERP, booking, inventory and more.' } },
    ],
  },
  web_features: {
    title: { id: 'Fitur tambahan?', en: 'Extra features?' },
    hint: { id: 'Centang yang dibutuhkan. Boleh kosong.', en: 'Tick what you need. You can leave it empty.' },
    multi: true, optional: true, next: 'web_timeline',
    options: [
      { id: 'auth', price: 4000000, title: { id: 'Login & User Management', en: 'Login & User Management' }, desc: { id: 'Registrasi, login sosial, reset password, role.', en: 'Sign-up, social login, password reset, roles.' } },
      { id: 'payment', price: 5000000, title: { id: 'Payment Gateway', en: 'Payment Gateway' }, desc: { id: 'Midtrans/Xendit: transfer, e-wallet, kartu, QRIS.', en: 'Midtrans/Xendit: bank transfer, e-wallet, cards, QRIS.' } },
      { id: 'admin', price: 6000000, title: { id: 'Admin Dashboard', en: 'Admin Dashboard' }, desc: { id: 'Panel untuk kelola data, user, dan laporan.', en: 'A panel to manage data, users and reports.' } },
      { id: 'notif', price: 3000000, title: { id: 'Notifikasi', en: 'Notifications' }, desc: { id: 'Email, push notification, atau WhatsApp otomatis.', en: 'Email, push notifications, or automated WhatsApp.' } },
      { id: 'integ', price: 6000000, title: { id: 'Integrasi Pihak Ketiga', en: 'Third-party Integration' }, desc: { id: 'API eksternal, ERP, CRM, atau sistem yang sudah ada.', en: 'External APIs, ERP, CRM, or your existing systems.' } },
      { id: 'i18n', price: 2500000, title: { id: 'Multi-bahasa', en: 'Multi-language' }, desc: { id: 'Dukungan lebih dari satu bahasa.', en: 'Support for more than one language.' } },
    ],
  },
  web_timeline: {
    title: { id: 'Seberapa cepat harus jadi?', en: 'How fast do you need it?' },
    hint: { id: '', en: '' },
    multi: false, next: 'RESULT',
    options: [
      { id: 'normal', mult: 1.0, title: { id: 'Normal', en: 'Normal' }, desc: { id: 'Ikut estimasi timeline kami. Harga standar.', en: 'Follows our estimated timeline. Standard price.' } },
      { id: 'fast', mult: 1.35, title: { id: 'Prioritas', en: 'Priority' }, desc: { id: 'Perlu lebih cepat dari normal. Tim diperbesar.', en: 'Needed sooner than normal. We enlarge the team.' } },
    ],
  },

  /* ---------- AI ---------- */
  ai_type: {
    title: { id: 'Solusi AI seperti apa?', en: 'What kind of AI solution?' },
    hint: { id: '', en: '' },
    multi: false, next: 'ai_data',
    options: [
      { id: 'chatbot', price: 20000000, title: { id: 'Chatbot / Customer Service', en: 'Chatbot / Customer Service' }, desc: { id: 'Jawab pertanyaan pelanggan 24/7 di web, WhatsApp, atau Telegram.', en: 'Answers customer questions 24/7 on web, WhatsApp or Telegram.' } },
      { id: 'rag', price: 35000000, title: { id: 'Knowledge Base (RAG)', en: 'Knowledge Base (RAG)' }, desc: { id: 'AI yang menjawab berdasarkan dokumen internal perusahaan lu.', en: "AI that answers from your company's internal documents." } },
      { id: 'agent', price: 45000000, title: { id: 'Agent / Otomasi Workflow', en: 'Agent / Workflow Automation' }, desc: { id: 'AI yang mengeksekusi tugas: input data, kirim email, proses dokumen.', en: 'AI that carries out tasks: data entry, sending email, processing documents.' } },
      { id: 'cv', price: 50000000, title: { id: 'Computer Vision', en: 'Computer Vision' }, desc: { id: 'Deteksi objek, OCR, klasifikasi gambar/video.', en: 'Object detection, OCR, image/video classification.' } },
      { id: 'custom', price: 75000000, title: { id: 'Model Custom / Fine-tuning', en: 'Custom Model / Fine-tuning' }, desc: { id: 'Melatih model khusus untuk kasus lu.', en: 'Training a model specifically for your case.' } },
    ],
  },
  ai_data: {
    title: { id: 'Kondisi datanya gimana?', en: 'What state is your data in?' },
    hint: { id: '', en: '' },
    multi: false, next: 'ai_deploy',
    options: [
      { id: 'ready', mult: 1.0, title: { id: 'Data sudah siap', en: 'Data is ready' }, desc: { id: 'Dokumen/dataset sudah terkumpul dan rapi.', en: 'Documents or datasets are collected and tidy.' } },
      { id: 'messy', mult: 1.3, title: { id: 'Ada, tapi berantakan', en: 'Exists, but messy' }, desc: { id: 'Perlu dibersihkan, dilabeli, atau distrukturkan.', en: 'Needs cleaning, labelling or structuring.' } },
      { id: 'none', mult: 1.6, title: { id: 'Belum ada', en: 'None yet' }, desc: { id: 'Perlu dikumpulkan dari nol. Kami bantu rancang.', en: 'Needs collecting from scratch. We help design it.' } },
    ],
  },
  ai_deploy: {
    title: { id: 'Mau di-deploy di mana?', en: 'Where should it be deployed?' },
    hint: { id: '', en: '' },
    multi: false, next: 'RESULT',
    options: [
      { id: 'cloud', mult: 1.0, title: { id: 'Cloud (kami kelola)', en: 'Cloud (managed by us)' }, desc: { id: 'Paling cepat jalan. Biaya server terpisah.', en: 'Fastest to get running. Server costs are separate.' } },
      { id: 'onprem', mult: 1.4, title: { id: 'On-premise', en: 'On-premise' }, desc: { id: 'Di server lu sendiri. Untuk data sensitif.', en: 'On your own servers. For sensitive data.' } },
      { id: 'api', mult: 0.85, title: { id: 'API only', en: 'API only' }, desc: { id: 'Kami sediakan endpoint, tim lu yang integrasikan.', en: 'We provide the endpoint, your team integrates it.' } },
    ],
  },
}

export const SERVICE_COLOR = { web: '#fbbf24', ai: '#f97316', vapt: '#d08a4e' }
