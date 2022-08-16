export async function fetchJSON(url: string, allowError = false) {
  const res = await fetch(url)
  if (!res.ok && !allowError) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  return await res.json()
}
