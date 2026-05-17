// Labeled field cell used inside the PDF-style certificate grid.
// Renders an uppercase tracked label + a value below it.
// Add to a CSS grid container; last:border-r-0 removes the trailing right border.

type InfoBoxProps = {
  label: string;
  value: string | React.ReactNode;
  mono?: boolean;
};

export default function InfoBox({ label, value, mono = false }: InfoBoxProps) {
  return (
    <div className="p-4 border-r border-b border-stone-200 last:border-r-0">
      <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className="text-sm font-semibold"
        style={mono ? { fontFamily: "'JetBrains Mono', monospace" } : undefined}
      >
        {value || '—'}
      </div>
    </div>
  );
}
