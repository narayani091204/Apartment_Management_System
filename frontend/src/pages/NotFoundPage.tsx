import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <p className="text-lg text-muted-foreground">This page doesn&apos;t exist.</p>
      <Link to="/" className={buttonVariants()}>
        Back to dashboard
      </Link>
    </div>
  );
}
