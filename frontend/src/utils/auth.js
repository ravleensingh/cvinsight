const STORAGE_KEY_TOKEN = 'token'
const STORAGE_KEY_REFRESH = 'refreshToken'
const STORAGE_KEY_USER = 'user'

function getActiveStorage() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY_TOKEN)
    ? localStorage
    : sessionStorage.getItem(STORAGE_KEY_TOKEN)
    ? sessionStorage
    : null
}

export const setToken = (token) => {
  const storage = getActiveStorage() || localStorage
  storage.setItem(STORAGE_KEY_TOKEN, token)
}

export const getToken = () => {
  if (typeof window === 'undefined') return null
  return (
    localStorage.getItem(STORAGE_KEY_TOKEN) ||
    sessionStorage.getItem(STORAGE_KEY_TOKEN) ||
    null
  )
}

export const removeToken = () => {
  localStorage.removeItem(STORAGE_KEY_TOKEN)
  sessionStorage.removeItem(STORAGE_KEY_TOKEN)
}

export const setRefreshToken = (refreshToken) => {
  const storage = getActiveStorage() || localStorage
  storage.setItem(STORAGE_KEY_REFRESH, refreshToken)
}

export const getRefreshToken = () => {
  if (typeof window === 'undefined') return null
  return (
    localStorage.getItem(STORAGE_KEY_REFRESH) ||
    sessionStorage.getItem(STORAGE_KEY_REFRESH) ||
    null
  )
}

export const removeRefreshToken = () => {
  localStorage.removeItem(STORAGE_KEY_REFRESH)
  sessionStorage.removeItem(STORAGE_KEY_REFRESH)
}

export const isAuthenticated = () => !!getToken()

export const setUser = (user) => {
  const storage = getActiveStorage() || localStorage
  storage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
}

export const getUser = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY_USER) ||
      sessionStorage.getItem(STORAGE_KEY_USER)
    if (!raw || raw === 'undefined' || raw === 'null') return null
    return JSON.parse(raw)
  } catch {
    clearAuth()
    return null
  }
}

export const clearAuth = () => {
  ;[localStorage, sessionStorage].forEach((s) => {
    s.removeItem(STORAGE_KEY_TOKEN)
    s.removeItem(STORAGE_KEY_REFRESH)
    s.removeItem(STORAGE_KEY_USER)
  })
}

/**
 * Persist auth data after login/verify.
 * rememberMe=true  → localStorage  (survives browser close)
 * rememberMe=false → sessionStorage (cleared on tab close)
 */
export const setSession = ({ token, refreshToken, user, rememberMe = true }) => {
  const target = rememberMe ? localStorage : sessionStorage
  const other = rememberMe ? sessionStorage : localStorage

  // Clear the other storage first to avoid stale tokens
  ;[STORAGE_KEY_TOKEN, STORAGE_KEY_REFRESH, STORAGE_KEY_USER].forEach((k) =>
    other.removeItem(k)
  )

  if (token) target.setItem(STORAGE_KEY_TOKEN, token)
  if (refreshToken) target.setItem(STORAGE_KEY_REFRESH, refreshToken)
  if (user) target.setItem(STORAGE_KEY_USER, JSON.stringify(user))
}
