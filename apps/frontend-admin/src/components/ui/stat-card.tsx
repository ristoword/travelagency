import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  loading?: boolean;
}

export function StatCard({
  title, value, change, changePositive, icon: Icon, iconColor = 'text-blue-600', iconBg = 'bg-blue-50', loading,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 bg-gray-100 rounded animate-pulse w-3/4" />
      ) : (
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      )}
      {change && (
        <p className={cn('text-sm mt-1', changePositive ? 'text-green-600' : 'text-red-600')}>
          {changePositive ? '↑' : '↓'} {change} vs mese prec.
        </p>
      )}
    </div>
  );
}
