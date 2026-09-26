import { Github, Globe, Linkedin, Mail, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Small About panel, shown under every page signed in or out.
 *
 * Deliberately a footer rather than a page or a modal: it is context, not a
 * destination, and nothing here is worth interrupting someone for.
 */

const LINKS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: 'https://kashyappatel.vercel.app', label: 'Portfolio', icon: Globe },
  { href: 'https://github.com/DeAtHfIrE26', label: 'GitHub', icon: Github },
  { href: 'https://linkedin.com/in/kashyap-patel2673', label: 'LinkedIn', icon: Linkedin },
  { href: 'mailto:kashyappatel2673@gmail.com', label: 'Email', icon: Mail },
];

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn('border-t border-border', className)}
      aria-labelledby="about-heading"
      data-testid="site-footer"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <h2 id="about-heading" className="text-xs font-semibold uppercase tracking-wide text-text">
          About
        </h2>

        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-text-muted">
          HealthHubPro tracks steps, sleep, hydration and workouts, and turns your own numbers into
          advice that always shows its working — a deterministic rules engine, not a language model.
          It is a React and Express app deployed as a single serverless function on Vercel, storing
          data in Postgres when a database is connected and in a seeded in-memory store when one is
          not. You can import a year of history from Apple Health or a CSV and export all of it back
          out whenever you like.
        </p>

        <p className="mt-3 max-w-2xl text-xs leading-relaxed text-text-muted">
          Built by Kashyap Patel, a full-stack engineer working across .NET, React, Python and
          cloud, with a focus on fast, well-crafted systems.
        </p>

        <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-sm text-xs text-text-muted transition-colors duration-150 hover:text-text"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
