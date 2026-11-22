export function canSeat(capacity: number, confirmed: number, party: number, waiting: boolean) {
  return !waiting && party > 0 && confirmed + party <= capacity
}
export function mailboxIdentity(address: string) {
  const [local, domain] = address.trim().toLowerCase().split('@')
  return domain === 'gmail.com' || domain === 'googlemail.com'
    ? local.split('+')[0].replaceAll('.', '') + '@gmail.com'
    : local + '@' + domain
}
