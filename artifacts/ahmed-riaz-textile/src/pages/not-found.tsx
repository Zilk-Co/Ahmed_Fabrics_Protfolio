import { AlertCircle, ArrowLeft, Home, Phone } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full bg-background px-4 py-12 sm:px-5 sm:py-16 text-foreground">
      <div className="mx-auto flex min-h-[70dvh] max-w-[1380px] flex-col justify-center">
        <span className="font-mono-ui text-[9px] uppercase tracking-[.15em] text-secondary sm:text-[10px] sm:tracking-[.18em]">Error 404</span>
        <div className="mt-4 flex items-start gap-3 sm:mt-6 sm:gap-4">
          <AlertCircle className="mt-1.5 h-5.5 w-5.5 shrink-0 text-secondary sm:mt-2 sm:h-7 sm:w-7" />
          <div>
            <h1 className="font-display text-4xl leading-none tracking-[-.04em] text-primary sm:text-6xl lg:text-8xl">Wrong aisle.</h1>
            <p className="mt-4 max-w-md text-[13px] leading-6 text-muted-foreground sm:mt-6 sm:text-sm sm:leading-7">That page does not exist or has been moved. Return to the factory overview or get in touch.</p>
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
              <Link href="/" data-testid="link-not-found-home" className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-primary-foreground hover:bg-secondary hover:text-primary sm:px-5 sm:py-3"><Home size={14} /> Back to factory</Link>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground hover:border-primary hover:text-primary sm:px-5 sm:py-3"><Phone size={14} /> Contact us</Link>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-6 sm:mt-16">
          <p className="font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground sm:text-[9px]">Quick links</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[{ href: '/products', label: 'Products' }, { href: '/designs', label: 'Designs' }, { href: '/services', label: 'Services' }, { href: '/about', label: 'About' }].map(link => (
              <Link key={link.href} href={link.href} className="border border-border px-3 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:text-sm">{link.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
