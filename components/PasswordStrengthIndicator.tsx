"use client";

import { useMemo } from "react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    if (!password) return { level: 0, label: "", color: "" };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
    };

    Object.values(checks).forEach((check) => {
      if (check) score++;
    });

    if (score <= 2) {
      return { level: 1, label: "Weak", color: "bg-red-500" };
    } else if (score === 3) {
      return { level: 2, label: "Medium", color: "bg-yellow-500" };
    } else if (score === 4) {
      return { level: 3, label: "Good", color: "bg-blue-500" };
    } else {
      return { level: 4, label: "Strong", color: "bg-green-500" };
    }
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${(strength.level / 4) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-600">{strength.label}</span>
      </div>
    </div>
  );
}

