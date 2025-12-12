import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'day' | 'week' | 'month';

interface ResourceBoardViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export default function ResourceBoardViewSwitcher({ currentView, onViewChange }: ResourceBoardViewSwitcherProps) {
  const views: Array<{ value: ViewMode; label: string; icon: React.ReactNode; disabled?: boolean }> = [
    { value: 'day', label: '日视图', icon: <Calendar className="h-4 w-4" /> },
    { value: 'week', label: '周视图', icon: <CalendarDays className="h-4 w-4" /> },
    { value: 'month', label: '月视图', icon: <CalendarRange className="h-4 w-4" /> },
  ];

  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
      {views.map((view) => (
        <Button
          key={view.value}
          variant={currentView === view.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange(view.value)}
          className={cn(
            'gap-2',
            currentView === view.value && 'shadow-sm'
          )}
        >
          {view.icon}
          {view.label}
        </Button>
      ))}
    </div>
  );
}