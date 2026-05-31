// Minimal Web Push sender for Cloudflare Workers — VAPID auth only, no payload.
// We send "bare" pushes (no encrypted body); the service worker then fetches
// what's due from /due. This keeps us off the (fiddly) aes128gcm payload crypto
// and uses only standard Web Crypto (ECDSA P-256 / ES256), which Workers支持.

function b64urlToBytes(s) {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (norm.length % 4)) % 4)
  const raw = atob(norm + pad)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}
function bytesToB64url(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function jsonToB64url(obj) {
  return bytesToB64url(new TextEncoder().encode(JSON.stringify(obj)))
}

/** Import the VAPID keypair (public uncompressed point + raw private d). */
async function importKey(publicKey, privateKey) {
  const pub = b64urlToBytes(publicKey) // 0x04 || X(32) || Y(32)
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    d: privateKey, // already base64url of the raw 32-byte private scalar
    ext: true,
  }
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

async function signJWT(key, payload) {
  const header = { typ: 'JWT', alg: 'ES256' }
  const unsigned = `${jsonToB64url(header)}.${jsonToB64url(payload)}`
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned))
  return `${unsigned}.${bytesToB64url(new Uint8Array(sig))}`
}

/** Send a payload-less push to one subscription. Returns the fetch Response. */
export async function sendBarePush(subscription, env) {
  const url = new URL(subscription.endpoint)
  const aud = `${url.protocol}//${url.host}`
  const key = await importKey(env.VAPID_PUBLIC, env.VAPID_PRIVATE)
  const jwt = await signJWT(key, {
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env.VAPID_SUBJECT || 'mailto:admin@example.com',
  })

  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      TTL: '86400',
      Urgency: 'high',
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}`,
    },
  })
}
