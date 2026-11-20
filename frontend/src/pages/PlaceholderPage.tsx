import React from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function PlaceholderPage({
  title,
  description = 'This section is coming soon. It will be fully implemented in the next phases.',
  icon,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        {icon ?? <Construction size={28} className="text-slate-400" />}
      </div>
      <h1 className="text-xl font-semibold text-slate-700 mb-2">{title}</h1>
      <p className="text-sm text-slate-400 max-w-sm">{description}</p>
    </div>
  );
}
