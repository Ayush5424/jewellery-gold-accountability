import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface AlertBannerProps {
  type?: 'warning' | 'info' | 'success' | 'error';
  title?: string;
  message: string;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'warning',
  title,
  message,
  className = '',
}) => {
  const configs = {
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />,
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />,
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />,
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />,
    },
  };

  const config = configs[type];

  return (
    <div className={`p-3.5 border rounded flex gap-3 text-sm ${config.bg} ${className}`}>
      {config.icon}
      <div>
        {title && <p className="font-semibold text-xs tracking-wide uppercase mb-0.5">{title}</p>}
        <p className="text-xs leading-relaxed">{message}</p>
      </div>
    </div>
  );
};
