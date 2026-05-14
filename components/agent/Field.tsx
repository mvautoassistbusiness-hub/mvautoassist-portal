// Reusable form field — works inside NewCertificateWizard (and future agent forms).
// No 'use client' needed — parent wizard is already a client component.

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
  error?: string;
};

export default function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  textarea = false,
  error,
}: FieldProps) {
  const base =
    'w-full px-4 py-3 bg-stone-50 border text-sm transition-colors focus:outline-none focus:bg-white ' +
    (error
      ? 'border-red-300 focus:border-red-500'
      : 'border-stone-200 focus:border-slate-900');

  return (
    <div>
      <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
        {label}
      </label>

      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${base} rounded-lg resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${base} rounded-lg`}
        />
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
