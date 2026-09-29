// Default content. Slides saved from the admin editor replace PROJECTS.
// Only the first project is real; the rest are samples.

export const CATEGORIES = [
  { id: 'web', label: { id: 'Web & Mobile Apps', en: 'Web & Mobile Apps' }, color: '#fbbf24' },
  { id: 'ai', label: { id: 'AI Development', en: 'AI Development' }, color: '#f97316' },
  { id: 'security', label: { id: 'Cyber Security', en: 'Cyber Security' }, color: '#d08a4e' },
]

export const PROJECTS = [
  {
    title: 'YB To-Do',
    client: 'YourBestie',
    category: 'web',
    sample: false,
    summary: {
      id: 'Tracker tugas harian, KPI, dan proyek untuk tim YourBestie, dipakai bersama di semua cabang dengan sinkronisasi langsung.',
      en: 'Daily task, KPI and project tracker for the YourBestie team, shared across every branch with live sync.',
    },
    tags: ['Task tracking', 'KPI', 'Team sync', 'PWA'],
  },
  {
    title: 'Rental Booking',
    client: 'Sample project',
    category: 'web',
    sample: true,
    summary: {
      id: 'Booking online dengan ketersediaan unit, deposit, dan pengambilan di cabang.',
      en: 'Online booking with availability, deposits and branch pickup.',
    },
    tags: ['Booking', 'Payments', 'Admin'],
  },
  {
    title: 'Support Assistant',
    client: 'Sample project',
    category: 'ai',
    sample: true,
    summary: {
      id: 'Asisten AI yang menjawab pertanyaan pelanggan berdasarkan dokumen perusahaan.',
      en: 'An AI assistant that answers customer questions from your own documents.',
    },
    tags: ['AI chat', 'Knowledge base'],
  },
  {
    title: 'WhatsApp Agent',
    client: 'Sample project',
    category: 'ai',
    sample: true,
    summary: {
      id: 'Balasan otomatis, pengingat, dan follow-up lewat WhatsApp.',
      en: 'Automatic replies, reminders and follow-ups sent over WhatsApp.',
    },
    tags: ['WhatsApp', 'Agent'],
  },
  {
    title: 'Payment Link',
    client: 'Sample project',
    category: 'web',
    sample: true,
    summary: {
      id: 'Payment gateway yang terhubung ke invoice dan pembukuan.',
      en: 'Payment gateway connected to invoices and bookkeeping.',
    },
    tags: ['Payments', 'Invoices'],
  },
  {
    title: 'Fleet Dashboard',
    client: 'Sample project',
    category: 'web',
    sample: true,
    summary: {
      id: 'Satu layar untuk kendaraan, jadwal servis, dan pendapatan per cabang.',
      en: 'One screen for vehicles, maintenance schedules and revenue per branch.',
    },
    tags: ['Dashboard', 'Reports'],
  },
  {
    title: 'Document Reader',
    client: 'Sample project',
    category: 'ai',
    sample: true,
    summary: {
      id: 'Membaca KTP, struk, dan kontrak lalu mengisi datanya ke sistem.',
      en: 'Reads IDs, receipts and contracts and fills the data into your system.',
    },
    tags: ['AI', 'OCR'],
  },
  {
    title: 'Security Audit',
    client: 'Sample project',
    category: 'security',
    sample: true,
    summary: {
      id: 'Pengujian penetrasi web dan API dengan laporan temuan dan rekomendasi perbaikan.',
      en: 'Web and API penetration test with a findings report and fix recommendations.',
    },
    tags: ['VAPT', 'Pentest'],
  },
]
