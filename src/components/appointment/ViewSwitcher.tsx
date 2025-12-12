import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'day' | 'week' | 'month';

interface ViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export default function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const views: Array<{ value: ViewMode; label: string; icon: React.ReactNode; disabled?: boolean }> = [
    { value: 'day', label: '日视图', icon: <Calendar className="h-4 w-4" /> },
    { value: 'week', label: '周视图', icon: <CalendarDays className="h-4 w-4" />, disabled: true },
    { value: 'month', label: '月视图', icon: <CalendarRange className="h-4 w-4" />, disabled: true },
  ];

  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
      {views.map((view) => (
        <Button
          key={view.value}
          variant={currentView === view.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => !view.disabled && onViewChange(view.value)}
          disabled={view.disabled}
          className={cn(
            'gap-2',
            currentView === view.value && 'shadow-sm',
            view.disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {view.icon}
          {view.label}
        </Button>
      ))}
    </div>
  );
}
