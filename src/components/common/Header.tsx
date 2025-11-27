import { Link, useLocation } from 'react-router-dom';
import { Activity, Menu } from 'lucide-react';
import routes from '@/routes';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function Header() {
  const location = useLocation();
  const navigation = routes.filter((route) => route.visible !== false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary">Bio-Appointment</span>
          </Link>
        </div>

        <nav className="hidden xl:flex items-center gap-6 ml-8">
          {navigation.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === item.path
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild className="xl:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-4 mt-8">
                {navigation.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-base font-medium transition-colors hover:text-primary ${
                      location.pathname === item.path
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
