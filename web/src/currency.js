// Prices are stored in rupiah and converted for display.
// `rates` holds rupiah per 1 unit of each currency.

import { getLang } from './i18n.js'

export const CURRENCIES = {
  IDR: { symbol: 'Rp ', locale: 'id-ID' },
  USD: { symbol: '$', locale: 'en-US' },
  AUD: { symbol: 'A$', locale: 'en-AU' },
}

let rates = { IDR: 1, USD: 16500, AUD: 11000 }
let info = { source: 'manual', date: '' }
const listeners = new Set()

const stored = (() => {
  try {
    return localStorage.getItem('tb_currency')
  } catch {
    return null
  }
})()
let currency = CURRENCIES[stored] ? stored : getLang() === 'id' ? 'IDR' : 'USD'

export const getCurrency = () => currency
export const getRates = () => ({ rates, ...info })
export const onCurrency = (cb) => listeners.add(cb)

export function setCurrency(next) {
  if (!CURRENCIES[next] || next === currency) return
  currency = next
  try {
    localStorage.setItem('tb_currency', currency)
  } catch {}
  listeners.forEach((cb) => cb())
}

export async function loadRates() {
  try {
    const r = await fetch('/api/rates').then((x) => x.json())
    if (r?.rates?.USD > 0 && r?.rates?.AUD > 0) {
      rates = { IDR: 1, USD: r.rates.USD, AUD: r.rates.AUD }
      info = { source: r.source, date: r.date || '' }
      listeners.forEach((cb) => cb())
    }
  } catch {}
}

// Round to a tidy figure: estimates should not look more exact than they are.
function tidy(value, code) {
  if (code === 'IDR') return Math.round(value / 100000) * 100000
  const step = value >= 2000 ? 50 : value >= 200 ? 10 : 1
  return Math.round(value / step) * step
}

export function format(value, code = currency) {
  const c = CURRENCIES[code]
  return c.symbol + new Intl.NumberFormat(c.locale, { maximumFractionDigits: 0 }).format(value)
}

// Rupiah amount -> text in the visitor's currency.
export const money = (idr, code = currency) => format(tidy(idr / rates[code], code), code)

export const rateText = (code = currency) => `1 ${code} = ${format(Math.round(rates[code]), 'IDR')}`
