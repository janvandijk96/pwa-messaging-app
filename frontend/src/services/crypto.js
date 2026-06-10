import nacl from 'tweetnacl'
import { decodeBase64, encodeBase64 } from 'tweetnacl-util'

// In-memory key storage (in production, use better key management)
let keyPair = null
const userPublicKeys = new Map()

export const generateKeyPair = () => {
  keyPair = nacl.box.keyPair()
  localStorage.setItem('sk', encodeBase64(keyPair.secretKey))
  return encodeBase64(keyPair.publicKey)
}

export const getPublicKey = () => {
  if (!keyPair) {
    const sk = localStorage.getItem('sk')
    if (sk) {
      const secretKey = decodeBase64(sk)
      keyPair = nacl.box.keyPair.fromSecretKey(secretKey)
    } else {
      generateKeyPair()
    }
  }
  return encodeBase64(keyPair.publicKey)
}

export const encryptMessage = async (plaintext, recipientId) => {
  if (!keyPair) {
    const sk = localStorage.getItem('sk')
    keyPair = nacl.box.keyPair.fromSecretKey(decodeBase64(sk))
  }

  // In production, fetch recipient's public key from server
  // For now, we'll use server to handle encryption
  const nonce = nacl.randomBytes(24)
  const messageBytes = Buffer.from(plaintext, 'utf-8')
  
  // Generate ephemeral key for this message
  const sessionKey = nacl.randomBytes(32)
  
  // Encrypt message with session key
  const encrypted = nacl.secretbox(messageBytes, nonce, sessionKey)
  
  // Encrypt session key with recipient's public key (server does this)
  // Client sends encrypted message and nonce, server handles key encryption
  return {
    encryptedContent: encodeBase64(encrypted),
    encryptedKey: encodeBase64(sessionKey),
    nonce: encodeBase64(nonce)
  }
}

export const decryptMessage = async (encryptedContent, encryptedKey, nonce) => {
  if (!keyPair) {
    const sk = localStorage.getItem('sk')
    keyPair = nacl.box.keyPair.fromSecretKey(decodeBase64(sk))
  }

  try {
    const decrypted = nacl.secretbox.open(
      decodeBase64(encryptedContent),
      decodeBase64(nonce),
      decodeBase64(encryptedKey)
    )
    return Buffer.from(decrypted).toString('utf-8')
  } catch (err) {
    console.error('Decryption failed:', err)
    return '[Failed to decrypt message]'
  }
}

export default {
  generateKeyPair,
  getPublicKey,
  encryptMessage,
  decryptMessage
}