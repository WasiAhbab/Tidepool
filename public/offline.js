const list = document.getElementById('passes')
let passes = []
try {
  passes = JSON.parse(localStorage.getItem('tidepool.offline') || '[]')
} catch {}
for (const p of passes.filter((v) => Date.parse(v.expires) > Date.now())) {
  const card = document.createElement('article')
  for (const [tag, value] of [
    ['h2', p.title],
    ['p', p.when + ' · ' + p.venue],
    ['p', p.name + ' · ' + p.status],
  ]) {
    const el = document.createElement(tag)
    el.textContent = value
    card.append(el)
  }
  if (/^data:image\/png;base64,/.test(p.image)) {
    const image = document.createElement('img')
    image.src = p.image
    image.alt = 'Entry QR code'
    card.append(image)
  }
  list.append(card)
}
if (!list.childElementCount) list.textContent = 'You have no saved passes on this device.'
