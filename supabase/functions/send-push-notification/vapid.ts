// VAPID JWT implementation for Web Push
// Based on RFC 8292: https://tools.ietf.org/rfc/rfc8292.txt

interface VAPIDKeys {
  publicKey: string
  privateKey: string
  subject: string
}

// Convert base64url to ArrayBuffer
function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64url.length % 4) % 4)
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Convert ArrayBuffer to base64url
function arrayBufferToBase64url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Import VAPID private key for signing
async function importVAPIDPrivateKey(privateKeyBase64url: string): Promise<CryptoKey> {
  try {
    const keyData = base64urlToArrayBuffer(privateKeyBase64url)
    
    return await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      false,
      ['sign']
    )
  } catch (error) {
    console.error('Failed to import VAPID private key:', error)
    throw new Error('Invalid VAPID private key format')
  }
}

// Generate VAPID JWT token
async function generateVAPIDJWT(
  audience: string,
  subject: string,
  privateKey: CryptoKey,
  expirationTime?: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = expirationTime || (now + 12 * 60 * 60) // 12 hours default

  // JWT Header
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  }

  // JWT Payload
  const payload = {
    aud: audience,
    exp: exp,
    sub: subject
  }

  // Encode header and payload
  const encodedHeader = arrayBufferToBase64url(
    new TextEncoder().encode(JSON.stringify(header))
  )
  const encodedPayload = arrayBufferToBase64url(
    new TextEncoder().encode(JSON.stringify(payload))
  )

  // Create signature
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signingInputBuffer = new TextEncoder().encode(signingInput)

  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256'
    },
    privateKey,
    signingInputBuffer
  )

  const encodedSignature = arrayBufferToBase64url(signature)

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
}

// Extract audience from push endpoint
function getAudienceFromEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint)
    return `${url.protocol}//${url.host}`
  } catch (error) {
    console.error('Invalid endpoint URL:', endpoint)
    throw new Error('Invalid push endpoint URL')
  }
}

// Generate VAPID headers for push request
export async function generateVAPIDHeaders(
  endpoint: string,
  vapidKeys: VAPIDKeys
): Promise<Record<string, string>> {
  try {
    // Basic headers for all requests
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'TTL': '86400' // 24 hours
    }

    // If VAPID keys are not configured, return basic headers
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      console.warn('VAPID keys not configured, using basic headers only')
      return headers
    }

    // Get audience from endpoint
    const audience = getAudienceFromEndpoint(endpoint)

    // Import private key
    const privateKey = await importVAPIDPrivateKey(vapidKeys.privateKey)

    // Generate JWT
    const jwt = await generateVAPIDJWT(
      audience,
      vapidKeys.subject,
      privateKey
    )

    // Add VAPID headers
    headers['Authorization'] = `vapid t=${jwt}, k=${vapidKeys.publicKey}`
    headers['Crypto-Key'] = `p256ecdsa=${vapidKeys.publicKey}`

    return headers

  } catch (error) {
    console.error('Failed to generate VAPID headers:', error)
    
    // Fallback to basic headers if VAPID generation fails
    return {
      'Content-Type': 'application/json',
      'TTL': '86400'
    }
  }
}

// Validate VAPID key format
export function validateVAPIDKeys(publicKey: string, privateKey: string): boolean {
  try {
    // Basic validation - check if they look like base64url strings
    const base64urlPattern = /^[A-Za-z0-9_-]+$/
    
    if (!base64urlPattern.test(publicKey) || !base64urlPattern.test(privateKey)) {
      return false
    }

    // Check approximate lengths (P-256 keys)
    // Public key should be ~87 chars, private key should be ~43 chars
    if (publicKey.length < 80 || publicKey.length > 100) {
      return false
    }

    if (privateKey.length < 40 || privateKey.length > 50) {
      return false
    }

    return true
  } catch (error) {
    return false
  }
}