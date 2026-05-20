import { useEffect, useState } from "react"

export default function PasswordStrengthIndicator({ password }) {
  const [reqs, setReqs] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  })

  useEffect(() => {
    setReqs({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\/\\;'`~]/.test(password)
    })
  }, [password])

  const met = Object.values(reqs).filter(Boolean).length
  const strength = met <= 1 ? "Weak" : met <= 3 ? "Fair" : met <= 4 ? "Good" : "Strong"
  const barColor =
    met <= 1 ? "bg-red-500" : met <= 3 ? "bg-stone-500" : met <= 4 ? "bg-zinc-500" : "bg-white dark:bg-slate-100"
  const textColor =
    met <= 1 ? "text-red-500" : met <= 3 ? "text-stone-500" : met <= 4 ? "text-zinc-500" : "text-slate-700 dark:text-slate-100"

  return (
    <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">Password strength</span>
        <span className={`text-xs font-semibold ${textColor}`}>{strength}</span>
      </div>

      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${(met / 5) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-1">
        {[
          { key: "length", label: "8+ characters" },
          { key: "uppercase", label: "Uppercase letter" },
          { key: "lowercase", label: "Lowercase letter" },
          { key: "number", label: "Number" },
          { key: "special", label: "Special character" }
        ].map(({ key, label }) => (
          <div
            key={key}
            className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
              reqs[key] ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
              reqs[key] ? "bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500" : "bg-slate-200 dark:bg-slate-600"
            }`}>
              {reqs[key] ? (
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500 block" />
              )}
            </span>
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
