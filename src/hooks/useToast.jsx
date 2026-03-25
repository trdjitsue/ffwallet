import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), duration)
  }, [])

  return { toast, showToast }
}

export function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.type === 'success' && '✅ '}
      {toast.type === 'error' && '❌ '}
      {toast.type === 'info' && '💜 '}
      {toast.message}
    </div>
  )
}
