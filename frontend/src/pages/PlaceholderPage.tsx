import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

/** Stub page for feature modules to be built on top of this scaffold. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader
        title={title}
        description="This module is not built yet."
        icon={Construction}
        iconBg="bg-slate-100"
        iconColor="text-slate-600"
      />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Construction className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Hook this page up to the <code>/{title.toLowerCase()}</code> API endpoints.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
