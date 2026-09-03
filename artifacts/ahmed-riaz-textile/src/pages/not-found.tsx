import { AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full bg-background px-5 py-16 text-foreground">
      <div className="mx-auto flex min-h-[70dvh] max-w-[1380px] flex-col justify-center">
        <span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary/60">AR / 404</span>
        <div className="mt-6 flex items-start gap-4">
          <AlertCircle className="mt-2 h-7 w-7 shrink-0 text-secondary-foreground" />
          <div>
            <h1 className="font-display text-6xl leading-none tracking-[-.04em] text-primary sm:text-8xl">Wrong aisle.</h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-muted-foreground">That page is not in the current production catalogue. Return to the factory overview and choose another route.</p>
            <Link href="/" data-testid="link-not-found-home" className="mt-8 inline-flex items-center border-b border-primary/40 pb-2 text-[10px] font-bold uppercase tracking-[.14em] text-primary hover:border-primary">Back to the factory</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
