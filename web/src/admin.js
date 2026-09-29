// Admin dashboard: slides, features & prices, settings and leads.
// Credentials are checked by the server, never in this file.

import { t, tr, onLang } from './i18n.js'
import { format } from './currency.js'

const $ = (id) => document.getElementById(id)
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props)
  n.append(...kids.filter((k) => k != null && k !== false))
  return n
}

const MAX_SIDE = 1600
const TABS = ['slides', 'pricing', 'settings', 'leads']

async function api(method, url, body, raw) {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body && !raw ? { 'Content-Type': 'application/json' } : undefined,
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: res.status })
  return data
}

// Shrink large pictures in the browser so uploads stay small.
async function shrink(file) {
  const bitmap = await createImageBitmap(file)
  const r = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bitmap.width * r)
  c.height = Math.round(bitmap.height * r)
  c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height)
  return new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', 0.88))
}

const asBoth = (v) => (typeof v === 'string' ? { id: v, en: v } : { id: v?.id || '', en: v?.en || '' })

export function initAdmin({ categories, getContent, preview, apply, show }) {
  let draft = null
  let saved = null
  let dirty = false
  let tab = 'slides'
  let timer = 0
  let isOpen = false
  const openSteps = new Set(['root'])

  const status = (msg, bad) => {
    $('admin-status').textContent = msg
    $('admin-status').classList.toggle('bad', Boolean(bad))
  }

  const touch = () => {
    dirty = true
    status(t('admin.unsaved'))
  }

  const touchSlide = (focus) => {
    touch()
    clearTimeout(timer)
    timer = setTimeout(() => preview(structuredClone(draft.projects), focus), 250)
  }

  /* ---------- Field helpers ---------- */

  function field(label, input, help) {
    return el('label', {}, label, input, help && el('small', { textContent: help }))
  }

  function textInput(obj, key, onChange, { max = 80, area = false, placeholder = '' } = {}) {
    const input = area
      ? el('textarea', { value: obj[key] ?? '', maxLength: max, rows: 2, placeholder })
      : el('input', { type: 'text', value: obj[key] ?? '', maxLength: max, placeholder })
    input.addEventListener('input', () => {
      obj[key] = input.value
      onChange()
    })
    return input
  }

  // One text in two languages, side by side.
  function bothField(label, obj, key, onChange, opts) {
    obj[key] = asBoth(obj[key])
    return el('div', { className: 'both' },
      field(`${label} · ID`, textInput(obj[key], 'id', onChange, opts)),
      field(`${label} · EN`, textInput(obj[key], 'en', onChange, opts)))
  }

  function numberInput(obj, key, onChange, { min, max, step }) {
    const input = el('input', { type: 'number', value: obj[key], min, max, step, inputMode: 'decimal' })
    input.addEventListener('input', () => {
      const v = Number(input.value)
      if (input.value !== '' && Number.isFinite(v)) {
        obj[key] = v
        onChange()
      }
    })
    return input
  }

  /* ---------- Slides ---------- */

  function slidesTab() {
    const add = el('button', { className: 'mini wide', type: 'button', textContent: t('admin.addSlide'), disabled: draft.projects.length >= 24 })
    add.addEventListener('click', () => {
      draft.projects.push({ title: t('admin.newSlide'), client: '', category: categories[0].id, sample: false, summary: { id: '', en: '' }, tags: [], image: '' })
      touchSlide(draft.projects.length - 1)
      render()
      $('admin-body').scrollTo({ top: $('admin-body').scrollHeight, behavior: 'smooth' })
    })
    return [el('ul', { className: 'slides' }, ...draft.projects.map(slideRow)), add]
  }

  function slideRow(p, i) {
    const change = () => touchSlide(i)
    const category = el('select', {}, ...categories.map((c) => el('option', { value: c.id, textContent: tr(c.label) })))
    category.value = p.category
    category.addEventListener('change', () => {
      p.category = category.value
      change()
    })

    const thumb = el('div', { className: 'thumb' })
    if (p.image) thumb.style.backgroundImage = `url(${p.image})`
    else thumb.textContent = t('admin.noPicture')
    const file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true })
    const pick = el('button', { type: 'button', className: 'mini', textContent: p.image ? t('admin.changePicture') : t('admin.addPicture') })
    pick.addEventListener('click', () => file.click())
    file.addEventListener('change', async () => {
      if (!file.files[0]) return
      status(t('admin.uploading'))
      try {
        const { url } = await api('POST', '/api/upload', await shrink(file.files[0]), true)
        p.image = url
        p.sample = false
        change()
        render()
      } catch (err) {
        status(err.message, true)
        if (err.status === 401) reopen()
      }
    })
    const buttons = [pick, file]
    if (p.image) {
      const clear = el('button', { type: 'button', className: 'mini', textContent: t('admin.removePicture') })
      clear.addEventListener('click', () => {
        p.image = ''
        change()
        render()
      })
      buttons.push(clear)
    }
    if (draft.projects.length > 1) {
      const del = el('button', { type: 'button', className: 'mini danger', textContent: t('admin.deleteSlide') })
      del.addEventListener('click', () => {
        if (!confirm(t('admin.confirmDelete', { name: p.title || '-' }))) return
        draft.projects.splice(i, 1)
        touchSlide(Math.max(0, i - 1))
        render()
      })
      buttons.push(del)
    }

    const head = el('button', { type: 'button', className: 'slide-head' },
      el('span', { className: 'num', textContent: String(i + 1).padStart(2, '0') }),
      el('span', { textContent: t('admin.show') }))
    head.addEventListener('click', () => preview(structuredClone(draft.projects), i))

    return el('li', { className: 'slide' },
      head,
      el('div', { className: 'slide-body' },
        thumb,
        el('div', { className: 'fields' },
          field(t('admin.f.title'), textInput(p, 'title', change, { max: 60 })),
          field(t('admin.f.client'), textInput(p, 'client', change, { max: 60 })),
          field(t('admin.f.category'), category))),
      bothField(t('admin.f.desc'), p, 'summary', change, { max: 400, area: true }),
      el('div', { className: 'row' }, ...buttons))
  }

  /* ---------- Features & prices ---------- */

  function pricingTab() {
    const keys = Object.keys(draft.pricing)
    return [el('div', { className: 'steps' }, ...keys.map((key) => stepBlock(key, draft.pricing[key])))]
  }

  function stepBlock(key, step) {
    const isRoot = key === 'root'
    const priced = step.options.some((o) => o.price != null)
    const box = el('details', { className: 'step', open: openSteps.has(key) })
    box.addEventListener('toggle', () => (box.open ? openSteps.add(key) : openSteps.delete(key)))
    const title = el('span', { className: 'step-title', textContent: tr(step.title) })
    box.append(
      el('summary', {}, title, el('span', { className: 'step-meta', textContent: t('admin.options', { n: step.options.length }) })),
      bothField(t('admin.f.question'), step, 'title', () => {
        title.textContent = tr(step.title)
        touch()
      }, { max: 120 }),
      bothField(t('admin.f.hint'), step, 'hint', touch, { max: 200 }),
      el('ul', { className: 'options' }, ...step.options.map((o, i) => optionRow(step, o, i, isRoot))))
    if (!isRoot && step.options.length < 12) {
      const add = el('button', { className: 'mini wide', type: 'button', textContent: t('admin.addOption') })
      add.addEventListener('click', () => {
        const name = t('admin.newOption')
        const o = { id: 'o' + Date.now().toString(36), title: { id: name, en: name }, desc: { id: '', en: '' } }
        if (priced) o.price = 0
        else o.mult = 1
        step.options.push(o)
        touch()
        render()
      })
      box.append(add)
    }
    return box
  }

  function optionRow(step, o, i, isRoot) {
    const kids = [
      bothField(t('admin.f.title'), o, 'title', touch, { max: 80 }),
      bothField(t('admin.f.desc'), o, 'desc', touch, { max: 240, area: true }),
    ]
    const tools = []
    if (o.price != null) {
      const hint = el('small', { textContent: format(o.price, 'IDR') })
      tools.push(el('label', {}, t('admin.f.price'),
        numberInput(o, 'price', () => {
          hint.textContent = format(o.price, 'IDR')
          touch()
        }, { min: 0, max: 1e10, step: 100000 }), hint))
    } else if (!isRoot) {
      tools.push(field(t('admin.f.mult'), numberInput(o, 'mult', touch, { min: 0.1, max: 10, step: 0.05 }), t('admin.f.multHelp')))
    }
    if (!isRoot && step.options.length > 1) {
      const del = el('button', { type: 'button', className: 'mini danger', textContent: t('admin.deleteOption') })
      del.addEventListener('click', () => {
        if (!confirm(t('admin.confirmDelete', { name: tr(o.title) || '-' }))) return
        step.options.splice(i, 1)
        touch()
        render()
      })
      tools.push(del)
    }
    if (tools.length) kids.push(el('div', { className: 'row end' }, ...tools))
    return el('li', { className: 'option' }, ...kids)
  }

  /* ---------- Settings ---------- */

  function settingsTab() {
    const s = draft.settings
    const pct = { value: Math.round(s.range * 100) }
    const live = el('small', { className: 'live' })
    api('GET', '/api/rates')
      .then((r) => r.source === 'live' && (live.textContent = t('admin.s.live', { usd: format(r.rates.USD, 'IDR'), aud: format(r.rates.AUD, 'IDR') })))
      .catch(() => {})

    const manual = el('div', { className: 'both', hidden: s.ratesMode !== 'manual' },
      field(t('admin.s.usd'), numberInput(s.manualRates, 'USD', touch, { min: 100, max: 1000000, step: 1 })),
      field(t('admin.s.aud'), numberInput(s.manualRates, 'AUD', touch, { min: 100, max: 1000000, step: 1 })))
    const mode = el('select', {},
      el('option', { value: 'auto', textContent: t('admin.s.auto') }),
      el('option', { value: 'manual', textContent: t('admin.s.manual') }))
    mode.value = s.ratesMode
    mode.addEventListener('change', () => {
      s.ratesMode = mode.value
      manual.hidden = s.ratesMode !== 'manual'
      touch()
    })
    const wa = textInput(s, 'wa', touch, { max: 20, placeholder: '6281234567890' })
    wa.inputMode = 'numeric'

    return [el('div', { className: 'settings' },
      field(t('admin.s.wa'), wa, t('admin.s.waHelp')),
      field(t('admin.s.range'), numberInput(pct, 'value', () => {
        s.range = Math.min(50, Math.max(0, pct.value)) / 100
        touch()
      }, { min: 0, max: 50, step: 1 })),
      field(t('admin.s.rates'), mode),
      live, manual)]
  }

  /* ---------- Leads ---------- */

  function leadsTab() {
    const list = el('ul', { className: 'leads' })
    api('GET', '/api/leads')
      .then(({ leads }) => {
        if (!leads.length) return list.append(el('li', { className: 'empty', textContent: t('admin.leads.empty') }))
        list.append(...leads.map((l) =>
          el('li', { className: 'lead-row' },
            el('div', { className: 'lead-top' }, el('b', { textContent: l.name }), el('span', { textContent: new Date(l.at).toLocaleString() })),
            el('div', { className: 'lead-contact', textContent: l.contact }),
            el('div', { className: 'lead-est', textContent: `${l.service} · ${l.estimate}` }),
            l.summary && el('pre', { textContent: l.summary }),
            l.note && el('p', { textContent: l.note }))))
      })
      .catch((err) => err.status === 401 && reopen())
    return [list]
  }

  /* ---------- Shell ---------- */

  function render() {
    if (!draft) return
    $('admin-tabs').replaceChildren(
      ...TABS.map((id) => {
        const b = el('button', { type: 'button', role: 'tab', textContent: t(`admin.tab.${id}`) })
        b.setAttribute('aria-selected', String(id === tab))
        b.addEventListener('click', () => {
          tab = id
          render()
          $('admin-body').scrollTop = 0
        })
        return b
      })
    )
    const body = $('admin-body')
    const top = body.scrollTop
    body.replaceChildren(...{ slides: slidesTab, pricing: pricingTab, settings: settingsTab, leads: leadsTab }[tab]())
    body.scrollTop = top
  }

  function reopen() {
    dirty = false
    open()
  }

  async function open() {
    const { admin } = await api('GET', '/api/session').catch(() => ({ admin: false }))
    if (!admin) {
      isOpen = false
      $('login-error').textContent = ''
      show('login')
      $('login-user').focus()
      return
    }
    saved = structuredClone(getContent())
    draft = structuredClone(saved)
    dirty = false
    isOpen = true
    status('')
    render()
    show('admin')
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    $('login-error').textContent = ''
    try {
      await api('POST', '/api/login', { username: $('login-user').value, password: $('login-pass').value })
      $('login-pass').value = ''
      open()
    } catch (err) {
      $('login-error').textContent = err.message
    }
  })

  $('admin-save').addEventListener('click', async () => {
    const untitled =
      draft.projects.some((p) => !p.title.trim()) ||
      Object.values(draft.pricing).some((s) => s.options.some((o) => !o.title.id.trim() && !o.title.en.trim()))
    if (untitled) return status(t('admin.needTitle'), true)
    status(t('admin.saving'))
    try {
      const content = await api('PUT', '/api/content', draft)
      saved = structuredClone(content)
      draft = structuredClone(content)
      dirty = false
      await apply(structuredClone(content))
      render()
      status(t('admin.saved'))
    } catch (err) {
      status(err.message, true)
      if (err.status === 401) reopen()
    }
  })

  $('admin-logout').addEventListener('click', async () => {
    if (dirty && !confirm(t('admin.confirmLogout'))) return
    await api('POST', '/api/logout').catch(() => {})
    if (dirty) preview(structuredClone(saved.projects))
    dirty = false
    isOpen = false
    show('browse')
  })

  addEventListener('beforeunload', (e) => {
    if (dirty) e.preventDefault()
  })

  onLang(() => isOpen && render())

  return {
    open,
    // Called before the dashboard closes. Returns false to stay in it.
    leave() {
      if (dirty) {
        if (!confirm(t('admin.confirmClose'))) return false
        dirty = false
        preview(structuredClone(saved.projects))
      }
      isOpen = false
      return true
    },
  }
}
