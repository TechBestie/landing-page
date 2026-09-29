// Two languages: Indonesian (id) and English (en).
// Static text uses data-i18n="key" in the HTML; content from the admin
// dashboard is stored as { id, en } and read with tr().

const STR = {
  en: {
    'loader.tag': 'We build fast. We ship faster.',
    'nav.work': 'Work',
    'nav.pricing': 'Pricing',
    'nav.contact': 'Contact',
    'hero.line1': 'We build fast.',
    'hero.line2': 'We ship faster.',
    'hero.sub': 'Software, AI and cyber security that help your business grow.',
    'finder.title': 'What are you looking for?',
    'finder.cta': 'Price your project',
    'hint.scroll': 'Scroll or drag to explore',
    close: 'Close',
    'detail.cta': 'Price something like this',
    'contact.kicker': 'Contact',
    'contact.title': 'Tell us what you want to build',
    'contact.body': 'Send a short message about your business and the problem you want solved. We reply with a plan and a price.',
    'contact.cta': 'Chat on WhatsApp',
    'contact.msg': 'Hi Tech Bestie, I would like to discuss a project.',
    'services.title': 'Services',

    'est.kicker': 'Instant price estimate',
    'est.h1a': 'Know the ',
    'est.h1mark': 'rough cost',
    'est.h1b': ' of your project in 1 minute.',
    'est.sub': 'Answer a few short questions and we calculate the estimate right away. No sign-up, no waiting for sales to reply.',
    'est.step': 'Step {n} of {total}',
    'est.done': 'Done ✓',
    'est.back': '← Back',
    'est.next': 'Next',
    'est.see': 'See estimate',
    'est.label': 'Estimated cost',
    'est.tax': 'excluding tax',
    'est.note': 'This is an initial estimate based on what you picked. The final price is set once we understand the details.',
    'est.wa': '💬 In a hurry? Chat on WhatsApp',
    'est.restart': '↻ Start over',
    'est.rate': 'Converted at {rate}. Rates from {date}.',
    'est.rateManual': 'Converted at {rate}.',
    'est.waMsg': 'Hi Tech Bestie, I just checked the estimate on your website.\n\nService: {svc}\n{summary}\n\nEstimate: {low} – {high}\n\nCan we discuss further?',
    'lead.title': 'Want our team to contact you?',
    'lead.body': 'Leave your contact and we reply within 1 working day with a more detailed proposal.',
    'lead.name': 'Name',
    'lead.namePh': 'Your name',
    'lead.contact': 'Email or WhatsApp number',
    'lead.contactPh': 'name@email.com / +62812…',
    'lead.note': 'Short project story (optional)',
    'lead.notePh': 'For example: we need a marketplace for small businesses, launching in December…',
    'lead.send': 'Send & request a proposal →',
    'lead.sending': 'Sending…',
    'lead.thanks': 'Thank you, {name}!',
    'lead.thanksBody': 'We have your details. The Tech Bestie team will contact you at {contact} within 1 working day.',
    'lead.error': 'Could not send. Please try again or chat on WhatsApp.',
    'why.title': 'Why can you trust the estimate?',
    'why.1t': 'Based on scope, not guesses',
    'why.1b': 'The number comes from what you pick: platform, method, features and scale.',
    'why.2t': 'A range, not a fixed number',
    'why.2b': 'We give a range of ±{pct}% because technical details usually surface during discussion.',
    'why.3t': 'Free & no commitment',
    'why.3b': 'This estimate is only a starting point. If it fits, we move on to a detailed proposal.',

    'login.kicker': 'Admin',
    'login.title': 'Log in to edit',
    'login.user': 'Username',
    'login.pass': 'Password',
    'login.submit': 'Log in',
    'admin.title': 'Admin dashboard',
    'admin.tab.slides': 'Slides',
    'admin.tab.pricing': 'Features & prices',
    'admin.tab.settings': 'Settings',
    'admin.tab.leads': 'Leads',
    'admin.save': 'Save',
    'admin.logout': 'Log out',
    'admin.unsaved': 'Unsaved changes',
    'admin.saving': 'Saving…',
    'admin.saved': 'Saved',
    'admin.uploading': 'Uploading picture…',
    'admin.needTitle': 'Every slide and option needs a title.',
    'admin.confirmClose': 'Close the dashboard and discard unsaved changes?',
    'admin.confirmLogout': 'Log out and discard unsaved changes?',
    'admin.confirmDelete': 'Delete "{name}"?',
    'admin.show': 'Show on screen',
    'admin.f.title': 'Title',
    'admin.f.client': 'Client',
    'admin.f.category': 'Category',
    'admin.f.desc': 'Description',
    'admin.f.question': 'Question',
    'admin.f.hint': 'Hint',
    'admin.f.price': 'Price (Rp)',
    'admin.f.mult': 'Multiplier',
    'admin.f.multHelp': '1 = no change, 1.3 = +30%, 0.85 = −15%',
    'admin.noPicture': 'No picture',
    'admin.addPicture': 'Add picture',
    'admin.changePicture': 'Change picture',
    'admin.removePicture': 'Remove picture',
    'admin.deleteSlide': 'Delete slide',
    'admin.addSlide': '+ Add slide',
    'admin.newSlide': 'New slide',
    'admin.addOption': '+ Add option',
    'admin.deleteOption': 'Delete option',
    'admin.newOption': 'New option',
    'admin.options': '{n} options',
    'admin.s.wa': 'WhatsApp number',
    'admin.s.waHelp': 'International format, digits only. Example: 6281234567890',
    'admin.s.range': 'Estimate range (± %)',
    'admin.s.rates': 'Exchange rates',
    'admin.s.auto': 'Automatic (updated daily)',
    'admin.s.manual': 'Manual',
    'admin.s.usd': 'Rupiah per 1 USD',
    'admin.s.aud': 'Rupiah per 1 AUD',
    'admin.s.live': 'Live rates now: 1 USD = {usd}, 1 AUD = {aud}',
    'admin.leads.empty': 'No leads yet.',
  },
  id: {
    'loader.tag': 'Bangun cepat. Rilis lebih cepat.',
    'nav.work': 'Karya',
    'nav.pricing': 'Harga',
    'nav.contact': 'Kontak',
    'hero.line1': 'Bangun cepat.',
    'hero.line2': 'Rilis lebih cepat.',
    'hero.sub': 'Software, AI, dan cyber security yang bantu bisnis lu tumbuh.',
    'finder.title': 'Lagi cari apa?',
    'finder.cta': 'Hitung harga project',
    'hint.scroll': 'Scroll atau geser untuk jelajah',
    close: 'Tutup',
    'detail.cta': 'Hitung harga yang seperti ini',
    'contact.kicker': 'Kontak',
    'contact.title': 'Ceritain apa yang mau lu bangun',
    'contact.body': 'Kirim pesan singkat soal bisnis lu dan masalah yang mau diselesaikan. Kami balas dengan rencana dan harga.',
    'contact.cta': 'Chat WhatsApp',
    'contact.msg': 'Halo Tech Bestie, saya mau diskusi soal project.',
    'services.title': 'Layanan',

    'est.kicker': 'Estimasi harga instan',
    'est.h1a': 'Tau ',
    'est.h1mark': 'kisaran biaya',
    'est.h1b': ' project lu dalam 1 menit.',
    'est.sub': 'Jawab beberapa pertanyaan singkat, kami hitung estimasinya langsung. Tanpa daftar, tanpa nunggu sales balesin.',
    'est.step': 'Langkah {n} dari {total}',
    'est.done': 'Selesai ✓',
    'est.back': '← Kembali',
    'est.next': 'Lanjut',
    'est.see': 'Lihat estimasi',
    'est.label': 'Estimasi biaya',
    'est.tax': 'belum termasuk PPN',
    'est.note': 'Angka ini estimasi awal berdasarkan komposisi yang lu pilih. Harga final ditentukan setelah kami pahami detail kebutuhannya.',
    'est.wa': '💬 Butuh cepat? Chat WA',
    'est.restart': '↻ Hitung ulang',
    'est.rate': 'Dikonversi dengan kurs {rate}. Kurs per {date}.',
    'est.rateManual': 'Dikonversi dengan kurs {rate}.',
    'est.waMsg': 'Halo Tech Bestie, saya baru cek estimasi di website.\n\nLayanan: {svc}\n{summary}\n\nEstimasi: {low} – {high}\n\nBisa diskusi lebih lanjut?',
    'lead.title': 'Mau dihubungi tim kami?',
    'lead.body': 'Tinggalkan kontak, kami balas dalam 1×24 jam kerja dengan proposal yang lebih detail.',
    'lead.name': 'Nama',
    'lead.namePh': 'Nama lu',
    'lead.contact': 'Email atau nomor WhatsApp',
    'lead.contactPh': 'nama@email.com / 0812…',
    'lead.note': 'Cerita singkat project (opsional)',
    'lead.notePh': 'Misal: kami butuh marketplace untuk UMKM, target launch Desember…',
    'lead.send': 'Kirim & minta proposal →',
    'lead.sending': 'Mengirim…',
    'lead.thanks': 'Terima kasih, {name}!',
    'lead.thanksBody': 'Kami sudah terima detailnya. Tim Tech Bestie bakal hubungi lu lewat {contact} dalam 1×24 jam kerja.',
    'lead.error': 'Gagal mengirim. Coba lagi atau chat lewat WhatsApp.',
    'why.title': 'Kenapa estimasinya bisa dipercaya?',
    'why.1t': 'Berdasarkan scope, bukan tebakan',
    'why.1b': 'Angka dihitung dari komposisi yang lu pilih: platform, metode, fitur, dan skala.',
    'why.2t': 'Range, bukan angka mati',
    'why.2b': 'Kami kasih rentang ±{pct}% karena detail teknis biasanya baru ketahuan saat diskusi.',
    'why.3t': 'Gratis & tanpa komitmen',
    'why.3b': 'Estimasi ini cuma titik awal. Kalau cocok, kami lanjut ke proposal detail.',

    'login.kicker': 'Admin',
    'login.title': 'Login untuk mengedit',
    'login.user': 'Username',
    'login.pass': 'Password',
    'login.submit': 'Login',
    'admin.title': 'Dashboard admin',
    'admin.tab.slides': 'Slide',
    'admin.tab.pricing': 'Fitur & harga',
    'admin.tab.settings': 'Pengaturan',
    'admin.tab.leads': 'Leads',
    'admin.save': 'Simpan',
    'admin.logout': 'Logout',
    'admin.unsaved': 'Ada perubahan belum disimpan',
    'admin.saving': 'Menyimpan…',
    'admin.saved': 'Tersimpan',
    'admin.uploading': 'Mengunggah gambar…',
    'admin.needTitle': 'Setiap slide dan opsi harus punya judul.',
    'admin.confirmClose': 'Tutup dashboard dan buang perubahan yang belum disimpan?',
    'admin.confirmLogout': 'Logout dan buang perubahan yang belum disimpan?',
    'admin.confirmDelete': 'Hapus "{name}"?',
    'admin.show': 'Tampilkan di layar',
    'admin.f.title': 'Judul',
    'admin.f.client': 'Klien',
    'admin.f.category': 'Kategori',
    'admin.f.desc': 'Deskripsi',
    'admin.f.question': 'Pertanyaan',
    'admin.f.hint': 'Petunjuk',
    'admin.f.price': 'Harga (Rp)',
    'admin.f.mult': 'Pengali',
    'admin.f.multHelp': '1 = tetap, 1.3 = +30%, 0.85 = −15%',
    'admin.noPicture': 'Belum ada gambar',
    'admin.addPicture': 'Tambah gambar',
    'admin.changePicture': 'Ganti gambar',
    'admin.removePicture': 'Hapus gambar',
    'admin.deleteSlide': 'Hapus slide',
    'admin.addSlide': '+ Tambah slide',
    'admin.newSlide': 'Slide baru',
    'admin.addOption': '+ Tambah opsi',
    'admin.deleteOption': 'Hapus opsi',
    'admin.newOption': 'Opsi baru',
    'admin.options': '{n} opsi',
    'admin.s.wa': 'Nomor WhatsApp',
    'admin.s.waHelp': 'Format internasional, angka saja. Contoh: 6281234567890',
    'admin.s.range': 'Rentang estimasi (± %)',
    'admin.s.rates': 'Kurs',
    'admin.s.auto': 'Otomatis (diperbarui harian)',
    'admin.s.manual': 'Manual',
    'admin.s.usd': 'Rupiah per 1 USD',
    'admin.s.aud': 'Rupiah per 1 AUD',
    'admin.s.live': 'Kurs saat ini: 1 USD = {usd}, 1 AUD = {aud}',
    'admin.leads.empty': 'Belum ada leads.',
  },
}

export const LANGS = ['id', 'en']

const stored = (() => {
  try {
    return localStorage.getItem('tb_lang')
  } catch {
    return null
  }
})()
let lang = LANGS.includes(stored) ? stored : (navigator.language || '').toLowerCase().startsWith('id') ? 'id' : 'en'
const listeners = new Set()

export const getLang = () => lang

export function t(key, vars) {
  let s = STR[lang][key] ?? STR.en[key] ?? key
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k])
  return s
}

// Read a { id, en } value in the current language, falling back to the other.
export function tr(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  return v[lang] || v.id || v.en || ''
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((n) => (n.textContent = t(n.dataset.i18n)))
  root.querySelectorAll('[data-i18n-label]').forEach((n) => n.setAttribute('aria-label', t(n.dataset.i18nLabel)))
}

export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return
  lang = next
  try {
    localStorage.setItem('tb_lang', lang)
  } catch {}
  document.documentElement.lang = lang
  applyI18n()
  listeners.forEach((cb) => cb(lang))
}

export const onLang = (cb) => listeners.add(cb)

document.documentElement.lang = lang
