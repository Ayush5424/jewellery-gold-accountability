import React from 'react';

interface AlignedDecimalProps {
  value: number | string | null | undefined;
  decimals?: number;
  unit?: string;
  className?: string;
  isNegative?: boolean;
}

export const AlignedDecimal: React.FC<AlignedDecimalProps> = ({
  value,
  decimals = 3,
  unit = 'g',
  className = '',
  isNegative = false,
}) => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return <span className={`font-mono text-slate-400 ${className}`}>—</span>;
  }

  const num = Number(value);
  const formatted = Math.abs(num).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = num < 0 || isNegative ? '-' : '';

  return (
    <span className={`font-mono tabular-nums inline-flex items-baseline justify-end text-slate-800 ${className}`}>
      <span className="font-semibold text-slate-900 tracking-tight">
        {sign}{formatted}
      </span>
      {unit && <span className="ml-1 text-xs text-slate-500 font-sans">{unit}</span>}
    </span>
  );
};
