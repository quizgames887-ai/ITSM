"use client";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const getStrength = (pwd: string): { level: number; label: string; color: string } => {
    if (!pwd) return { level: 0, label: "", color: "" };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z\d]/.test(pwd)) strength++;

    const levels = [
      { level: 0, label: "Very Weak", color: "bg-red-500" },
      { level: 1, label: "Weak", color: "bg-orange-500" },
      { level: 2, label: "Fair", color: "bg-yellow-500" },
      { level: 3, label: "Good", color: "bg-blue-500" },
      { level: 4, label: "Strong", color: "bg-green-500" },
      { level: 5, label: "Very Strong", color: "bg-green-600" },
    ];

    return levels[Math.min(strength, 5)];
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600">Password strength:</span>
        <span className={`font-medium ${
          strength.level <= 1 ? "text-red-600" :
          strength.level <= 2 ? "text-orange-600" :
          strength.level <= 3 ? "text-yellow-600" :
          strength.level <= 4 ? "text-blue-600" :
          "text-green-600"
        }`}>
          {strength.label}
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full ${strength.color} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${(strength.level / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}
