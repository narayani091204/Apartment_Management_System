import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-destructive">403</p>
      <p className="text-lg text-muted-foreground">
        You don&apos;t have permission to view this page.
      </p>
      <Link to="/" className={buttonVariants()}>
        Back to dashboard
      </Link>
    </div>
  );
}
