// Price estimate wizard: a few questions, then a price range.

import { t, tr, getLang, onLang } from './i18n.js'
import { CURRENCIES, getCurrency, setCurrency, onCurrency, getRates, money, rateText } from './currency.js'
import { SERVICE_COLOR } from './pricing-default.js'

const $ = (id) => document.getElementById(id)
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props)
  n.append(...kids.filter((k) => k != null && k !== false))
  return n
}
const CHECK =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3 3 7-7"/></svg>'
const noQ = (s) => s.replace(/\?$/, '')

export function initPricing({ onStack }) {
  let config = {}
  let settings = {}
  let trail = [] // answered steps: [{ step, picks: [ids] }]
  let current = 'root'
  let picks = new Set()
  let dir = 'fwd'
  let sent = null // { name, contact } once the lead form is submitted

  const option = (step, id) => config[step].options.find((o) => o.id === id)
  const service = () => trail[0] && option('root', trail[0].picks[0])

  function totalSteps() {
    const svc = service()
    if (!svc) return 4
    let n = 1
    for (let s = svc.next; s && s !== 'RESULT' && config[s] && n < 20; s = config[s].next) n++
    return n
  }

  function compute() {
    let add = 0
    let mult = 1
    for (const h of trail)
      for (const id of h.picks) {
        const o = option(h.step, id)
        if (o.price) add += o.price
        if (o.mult) mult *= o.mult
      }
    const mid = add * mult
    return { low: mid * (1 - settings.range), high: mid * (1 + settings.range), mid }
  }

  const summaryText = () =>
    trail
      .slice(1)
      .map((h) => `${noQ(tr(config[h.step].title))}: ${h.picks.map((id) => tr(option(h.step, id).title)).join(', ') || '-'}`)
      .join('\n')

  // Tell the 3D scene which blocks to stack: one per chosen option.
  function pushStack() {
    const all = [...trail, ...(current !== 'RESULT' && picks.size ? [{ step: current, picks: [...picks] }] : [])]
    const color = SERVICE_COLOR[all[0]?.picks[0]] || SERVICE_COLOR.web
    onStack(
      all.flatMap((h) =>
        h.picks.map((id) => {
          const o = option(h.step, id)
          return { key: `${h.step}:${id}`, label: tr(o.title), price: o.price || 0, color }
        })
      )
    )
  }

  function renderCurrency() {
    $('currency').replaceChildren(
      ...Object.keys(CURRENCIES).map((code) => {
        const b = el('button', { type: 'button', textContent: code })
        b.setAttribute('aria-pressed', String(code === getCurrency()))
        b.addEventListener('click', () => setCurrency(code))
        return b
      })
    )
  }

  function renderWhy() {
    const pct = Math.round(settings.range * 100)
    $('why').replaceChildren(
      el('h3', { textContent: t('why.title') }),
      el('div', { className: 'why-grid' },
        ...[1, 2, 3].map((n) => el('div', {}, el('b', { textContent: t(`why.${n}t`) }), el('p', { textContent: t(`why.${n}b`, { pct }) }))))
    )
  }

  function render() {
    if (!config.root) return
    renderCurrency()
    renderWhy()
    const done = current === 'RESULT'
    const total = totalSteps()
    $('est-intro').hidden = trail.length > 0
    $('wiz-bar').style.width = (done ? 100 : (trail.length / total) * 100) + '%'
    $('wiz-step').textContent = done ? t('est.done') : t('est.step', { n: trail.length + 1, total })
    $('wiz-crumbs').replaceChildren(
      ...trail
        .filter((h) => h.picks.length)
        .map((h) => el('span', { className: 'crumb', textContent: h.picks.map((id) => tr(option(h.step, id).title)).join(', ') }))
    )
    pushStack()
    if (done) return renderResult()

    const step = config[current]
    const hint = tr(step.hint)
    const nextBtn = el('button', {
      className: 'cta solid', type: 'button',
      textContent: (step.next === 'RESULT' ? t('est.see') : t('est.next')) + ' →',
      disabled: !(picks.size || step.optional),
    })
    nextBtn.addEventListener('click', next)
    const backBtn = trail.length ? el('button', { className: 'cta', type: 'button', textContent: t('est.back') }) : el('span')
    if (trail.length) backBtn.addEventListener('click', back)

    const opts = step.options.map((o) => {
      const tag = o.price
        ? '+ ' + money(o.price)
        : o.mult && o.mult !== 1
          ? (o.mult > 1 ? '+' : '−') + Math.round(Math.abs(o.mult - 1) * 100) + '%'
          : ''
      const chk = el('span', { className: 'chk' })
      chk.innerHTML = CHECK
      const b = el('button', { type: 'button', className: 'opt' + (step.multi ? '' : ' single') },
        o.ico && el('span', { className: 'ico', textContent: o.ico }),
        el('span', { className: 'opt-t' }, el('span', { textContent: tr(o.title) }), chk),
        el('span', { className: 'opt-d', textContent: tr(o.desc) }),
        tag && el('span', { className: 'opt-p', textContent: tag }))
      b.dataset.id = o.id
      b.setAttribute('aria-pressed', String(picks.has(o.id)))
      b.addEventListener('click', () => {
        if (step.multi) picks.has(o.id) ? picks.delete(o.id) : picks.add(o.id)
        else picks = new Set([o.id])
        body.querySelectorAll('.opt').forEach((x) => x.setAttribute('aria-pressed', String(picks.has(x.dataset.id))))
        nextBtn.disabled = !(picks.size || step.optional)
        pushStack()
        if (!step.multi) setTimeout(next, 220)
      })
      return b
    })

    const body = $('wiz-body')
    body.replaceChildren(
      el('div', { className: 'q' + (dir === 'back' ? ' back' : '') },
        el('div', {}, el('h3', { textContent: tr(step.title) }), hint && el('p', { className: 'q-hint', textContent: hint })),
        el('div', { className: 'opts', role: 'group' }, ...opts),
        el('div', { className: 'actions' }, backBtn, nextBtn))
    )
  }

  function next() {
    const step = config[current]
    if (current === 'RESULT' || (!picks.size && !step.optional)) return
    const arr = [...picks]
    trail.push({ step: current, picks: arr })
    dir = 'fwd'
    picks = new Set()
    current = current === 'root' ? option('root', arr[0]).next : step.next
    render()
    $('calc').scrollTo({ top: 0, behavior: 'smooth' })
  }

  function back() {
    const h = trail.pop()
    dir = 'back'
    current = h.step
    picks = new Set(h.picks)
    render()
  }

  function restart() {
    trail = []
    picks = new Set()
    current = 'root'
    dir = 'back'
    sent = null
    render()
  }

  function renderResult() {
    const { low, high } = compute()
    const svc = tr(service().title)
    const range = `${money(low)} – ${money(high)}`
    const code = getCurrency()
    const { source, date } = getRates()
    const msg = t('est.waMsg', { svc, summary: summaryText(), low: money(low), high: money(high) })

    const wa = el('a', { className: 'cta wa', target: '_blank', rel: 'noopener', textContent: t('est.wa') })
    wa.href = `https://wa.me/${settings.wa}?text=${encodeURIComponent(msg)}`
    const again = el('button', { className: 'link', type: 'button', textContent: t('est.restart') })
    again.addEventListener('click', restart)

    const card = el('div', { className: 'price-card' },
      el('span', { className: 'lab', textContent: t('est.label') }),
      el('div', { className: 'price', textContent: range }),
      el('small', { textContent: `${svc} · ${t('est.tax')}` }),
      el('ul', { className: 'sum' },
        ...trail.slice(1).map((h) =>
          el('li', {},
            el('span', { textContent: noQ(tr(config[h.step].title)) }),
            el('span', { textContent: h.picks.map((id) => tr(option(h.step, id).title)).join(', ') || '—' })))),
      code !== 'IDR' &&
        el('p', { className: 'note', textContent: source === 'live' && date ? t('est.rate', { rate: rateText(), date }) : t('est.rateManual', { rate: rateText() }) }),
      el('p', { className: 'note', textContent: t('est.note') }),
      el('div', { className: 'est-cta' }, wa, again))

    $('wiz-body').replaceChildren(el('div', { className: 'result' }, card, sent ? thanks() : leadForm(low, high)))
  }

  const thanks = () =>
    el('div', { className: 'thanks' },
      el('b', { textContent: t('lead.thanks', { name: sent.name }) }),
      el('span', { textContent: t('lead.thanksBody', { contact: sent.contact }) }))

  function leadForm(low, high) {
    const name = el('input', { id: 'f-name', required: true, maxLength: 80, placeholder: t('lead.namePh'), autocomplete: 'name' })
    const contact = el('input', { id: 'f-contact', required: true, maxLength: 120, placeholder: t('lead.contactPh') })
    const note = el('textarea', { id: 'f-note', maxLength: 1000, rows: 3, placeholder: t('lead.notePh') })
    // Hidden from people; spam bots that fill every field are dropped by the server.
    const trap = el('input', { name: 'website', tabIndex: -1, autocomplete: 'off' })
    const error = el('p', { className: 'error', role: 'alert' })
    const submit = el('button', { className: 'cta solid', type: 'submit', textContent: t('lead.send') })
    const form = el('form', { className: 'lead', noValidate: true },
      el('h3', { textContent: t('lead.title') }),
      el('p', { textContent: t('lead.body') }),
      el('label', {}, t('lead.name'), name),
      el('label', {}, t('lead.contact'), contact),
      el('label', {}, t('lead.note'), note),
      el('label', { className: 'sr-only', ariaHidden: 'true' }, 'Website', trap),
      error, submit)
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const n = name.value.trim()
      const c = contact.value.trim()
      if (!n || !c) return (n ? contact : name).focus()
      submit.disabled = true
      submit.textContent = t('lead.sending')
      error.textContent = ''
      try {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: n, contact: c, note: note.value.trim(), website: trap.value, lang: getLang(), currency: getCurrency(),
            service: tr(service().title), summary: summaryText(),
            estimate: `${money(low, 'IDR')} – ${money(high, 'IDR')}`,
          }),
        })
        if (!res.ok) throw new Error()
        sent = { name: n, contact: c }
        form.replaceWith(thanks())
      } catch {
        error.textContent = t('lead.error')
        submit.disabled = false
        submit.textContent = t('lead.send')
      }
    })
    return form
  }

  onLang(render)
  onCurrency(render)

  return {
    // Called at start and whenever the admin saves new prices or settings.
    setContent(nextConfig, nextSettings) {
      config = nextConfig
      settings = nextSettings
      // Answers may refer to options that no longer exist.
      const valid = trail.every((h) => config[h.step] && h.picks.every((id) => option(h.step, id)))
      if (!valid || (current !== 'RESULT' && !config[current])) restart()
      else render()
    },
    restart,
  }
}
