// Dojo public profile — what prospective students see at /p/<slug>.
// Honor-wall aesthetic, crimson + parchment, traditional dojo gravity.

import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  Instagram,
  MapPin,
  ArrowRight,
  Shield,
  Award,
  Users,
} from 'lucide-react';
import type { PublicProfile, PackageDefinition, Testimonial } from '../../lib/database.types';
import { formatMoney } from '../../lib/format';
import { DOJO_COLORS } from '../theme';

interface PublicTrainer {
  full_name: string;
  business_name: string | null;
  slug: string | null;
  primary_color: string | null;
  logo_url: string | null;
  currency: string | null;
}

interface DojoPublicProfileProps {
  trainer: PublicTrainer;
  profile: PublicProfile;
  packages: PackageDefinition[];
  testimonials: Pick<
    Testimonial,
    'id' | 'client_name' | 'client_role' | 'client_photo_url' | 'body' | 'rating'
  >[];
}

const HEADER_FONT =
  "'Bebas Neue', 'Oswald', 'Arial Narrow', system-ui, sans-serif";

const DOJO_PILLARS = [
  {
    icon: <Shield size={18} />,
    title: 'Discipline first, technique always',
    body: 'Every class starts the same way, regardless of rank. Stance, footwork, breath. The fundamentals never stop earning rent.',
  },
  {
    icon: <Award size={18} />,
    title: 'Belts mean something here',
    body: 'No paid promotions, no automatic advancement. Belts are earned through attendance, demonstrated technique, and a written test.',
  },
  {
    icon: <Users size={18} />,
    title: 'A real dojo, all ages',
    body: 'Kids classes for ages 6+. Teen and adult tracks. Family memberships for siblings, parents and kids. Train together.',
  },
];

export function DojoPublicProfile({
  trainer,
  profile,
  packages,
  testimonials,
}: DojoPublicProfileProps) {
  const heading = trainer.business_name || trainer.full_name;
  const firstName = trainer.full_name.split(' ')[0];
  const heroTitle =
    profile.hero.title || 'BEGIN ON THE MAT.';
  const heroSubtitle =
    profile.hero.subtitle ||
    `Traditional martial arts coaching with Sensei ${firstName}. Belt-rank progression, kids and adults, family memberships. Discipline, respect, technique.`;
  const heroCta = profile.hero.cta_text || 'Try a free class';
  const aboutHeadline = profile.about.headline || `Sensei ${firstName}.`;
  const aboutBody = profile.about.body;

  const bookHref = trainer.slug ? `/book/${trainer.slug}` : null;

  return (
    <div
      className="dojo-theme-dark min-h-screen"
      style={{
        background: 'var(--dojo-bg-page)',
        color: 'var(--dojo-text-primary)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div className="h-[3px] w-full" style={{ background: DOJO_COLORS.brand }} aria-hidden />

      <nav
        className="px-6 sm:px-10 py-4 flex items-center justify-between"
        style={{ background: DOJO_COLORS.bgPanel, borderBottom: `1px solid ${DOJO_COLORS.divider}` }}
      >
        <div className="flex items-center gap-3">
          <span aria-hidden style={{ color: DOJO_COLORS.brand, fontSize: '1.5rem' }}>
            道
          </span>
          <span
            className="font-black uppercase tracking-wider"
            style={{
              fontFamily: HEADER_FONT,
              color: DOJO_COLORS.textPrimary,
              fontSize: '1.0625rem',
              letterSpacing: '0.08em',
            }}
          >
            {heading}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-5 text-xs uppercase tracking-widest">
          <a href="#about" style={{ color: DOJO_COLORS.textSecondary }}>About</a>
          <a href="#path" style={{ color: DOJO_COLORS.textSecondary }}>The path</a>
          <a href="#programs" style={{ color: DOJO_COLORS.textSecondary }}>Programs</a>
          {testimonials.length > 0 && (
            <a href="#voices" style={{ color: DOJO_COLORS.textSecondary }}>Voices</a>
          )}
          <a href="#contact" style={{ color: DOJO_COLORS.textSecondary }}>Contact</a>
        </div>
        {bookHref && (
          <Link
            to={bookHref}
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-widest"
            style={{
              background: DOJO_COLORS.brand,
              color: '#FFF',
              fontFamily: HEADER_FONT,
              letterSpacing: '0.15em',
            }}
          >
            Visit <ArrowRight size={13} />
          </Link>
        )}
      </nav>

      {/* Hero */}
      <section
        className="px-6 sm:px-10 py-16 sm:py-24 text-center"
        style={{
          background: DOJO_COLORS.bgPage,
          borderBottom: `1px solid ${DOJO_COLORS.divider}`,
        }}
      >
        <p
          className="text-xs uppercase tracking-[0.5em] font-bold mb-6"
          style={{ color: DOJO_COLORS.gold }}
        >
          ━━━ The Dojo ━━━
        </p>
        <h1
          className="leading-[0.95] mb-8 mx-auto max-w-4xl uppercase"
          style={{
            fontFamily: HEADER_FONT,
            color: DOJO_COLORS.textPrimary,
            fontSize: 'clamp(3rem, 9vw, 7.5rem)',
            fontWeight: 900,
            letterSpacing: '0.04em',
          }}
        >
          {heroTitle}
        </h1>
        <p
          className="text-base sm:text-lg leading-relaxed mx-auto max-w-2xl mb-10"
          style={{ color: DOJO_COLORS.textSecondary }}
        >
          {heroSubtitle}
        </p>
        {bookHref && (
          <Link
            to={bookHref}
            className="inline-flex items-center gap-2 px-8 py-4 font-bold uppercase tracking-widest text-sm"
            style={{
              background: DOJO_COLORS.brand,
              color: '#FFF',
              fontFamily: HEADER_FONT,
              letterSpacing: '0.15em',
            }}
          >
            {heroCta} <ArrowRight size={16} />
          </Link>
        )}
      </section>

      {/* About */}
      <section
        id="about"
        className="px-6 sm:px-10 py-20"
        style={{
          background: DOJO_COLORS.bgPanel,
          borderBottom: `1px solid ${DOJO_COLORS.divider}`,
        }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 items-start">
          <div
            className="aspect-square flex items-center justify-center"
            style={{
              background: DOJO_COLORS.bgInset,
              border: `1px solid ${DOJO_COLORS.divider}`,
            }}
          >
            {profile.about.photo_url ? (
              <img
                src={profile.about.photo_url}
                alt={trainer.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                style={{
                  fontFamily: HEADER_FONT,
                  color: DOJO_COLORS.brand,
                  fontSize: '8rem',
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                }}
              >
                {firstName[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.5em] font-bold mb-3"
              style={{ color: DOJO_COLORS.gold }}
            >
              The sensei
            </p>
            <h2
              className="leading-tight mb-5 uppercase"
              style={{
                fontFamily: HEADER_FONT,
                color: DOJO_COLORS.textPrimary,
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 900,
                letterSpacing: '0.04em',
              }}
            >
              {aboutHeadline}
            </h2>
            {aboutBody ? (
              <p
                className="text-base leading-relaxed whitespace-pre-line"
                style={{ color: DOJO_COLORS.textSecondary }}
              >
                {aboutBody}
              </p>
            ) : (
              <p
                className="text-base leading-relaxed"
                style={{ color: DOJO_COLORS.textSecondary }}
              >
                I teach the way I was taught. Fundamentals every class.
                Respect on and off the mat. Belts are markers of the
                journey, not the destination. Open to all ages — kids,
                teens, adults. Walk in, bow, leave better than you came.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section id="path" className="px-6 sm:px-10 py-20 max-w-6xl mx-auto">
        <p
          className="text-[10px] uppercase tracking-[0.5em] font-bold text-center mb-3"
          style={{ color: DOJO_COLORS.gold }}
        >
          The path
        </p>
        <h2
          className="leading-tight text-center mb-12 uppercase"
          style={{
            fontFamily: HEADER_FONT,
            color: DOJO_COLORS.textPrimary,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900,
            letterSpacing: '0.04em',
          }}
        >
          How we train
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DOJO_PILLARS.map((p, i) => (
            <div
              key={p.title}
              className="p-6"
              style={{
                background: DOJO_COLORS.bgPanel,
                border: `1px solid ${DOJO_COLORS.divider}`,
                borderTop: `3px solid ${i % 2 === 0 ? DOJO_COLORS.brand : DOJO_COLORS.gold}`,
              }}
            >
              <div
                className="w-11 h-11 flex items-center justify-center mb-4"
                style={{
                  background: 'transparent',
                  color: i % 2 === 0 ? DOJO_COLORS.brand : DOJO_COLORS.gold,
                  border: `1px solid ${i % 2 === 0 ? DOJO_COLORS.brand : DOJO_COLORS.gold}`,
                }}
              >
                {p.icon}
              </div>
              <h3
                className="leading-tight mb-2 uppercase"
                style={{
                  fontFamily: HEADER_FONT,
                  color: DOJO_COLORS.textPrimary,
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: DOJO_COLORS.textSecondary }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Programs */}
      {packages.length > 0 && (
        <section
          id="programs"
          className="px-6 sm:px-10 py-20"
          style={{ background: DOJO_COLORS.bgPanel, borderTop: `1px solid ${DOJO_COLORS.divider}` }}
        >
          <div className="max-w-5xl mx-auto">
            <p
              className="text-[10px] uppercase tracking-[0.5em] font-bold text-center mb-3"
              style={{ color: DOJO_COLORS.gold }}
            >
              Programs
            </p>
            <h2
              className="leading-tight text-center mb-12 uppercase"
              style={{
                fontFamily: HEADER_FONT,
                color: DOJO_COLORS.textPrimary,
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 900,
                letterSpacing: '0.04em',
              }}
            >
              Join the dojo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {packages.slice(0, 3).map((pkg, i) => {
                const featured = i === 1 && packages.length >= 3;
                return (
                  <div
                    key={pkg.name + i}
                    className="p-6 flex flex-col"
                    style={{
                      background: featured ? DOJO_COLORS.brand : DOJO_COLORS.bgInset,
                      color: featured ? '#FFF' : DOJO_COLORS.textPrimary,
                      border: `1px solid ${featured ? DOJO_COLORS.brand : DOJO_COLORS.divider}`,
                    }}
                  >
                    {featured && (
                      <span
                        className="self-start text-[10px] font-bold uppercase tracking-[0.25em] px-2 py-0.5 mb-3"
                        style={{
                          background: 'rgba(0,0,0,0.25)',
                          color: '#FFF',
                          fontFamily: HEADER_FONT,
                        }}
                      >
                        Most picked
                      </span>
                    )}
                    <h3
                      className="uppercase leading-tight mb-2"
                      style={{
                        fontFamily: HEADER_FONT,
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {pkg.name}
                    </h3>
                    <p
                      className="mb-4"
                      style={{
                        fontFamily: HEADER_FONT,
                        fontSize: '2.5rem',
                        fontWeight: 900,
                        color: featured ? '#FFF' : DOJO_COLORS.gold,
                        letterSpacing: '0.02em',
                        lineHeight: 1,
                      }}
                    >
                      {formatMoney(pkg.price, trainer.currency ?? 'USD')}
                    </p>
                    {bookHref && (
                      <Link
                        to={bookHref}
                        className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em]"
                        style={{
                          background: featured ? '#FFF' : DOJO_COLORS.brand,
                          color: featured ? DOJO_COLORS.brand : '#FFF',
                          fontFamily: HEADER_FONT,
                        }}
                      >
                        Enroll <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section id="voices" className="px-6 sm:px-10 py-20 max-w-5xl mx-auto">
          <p
            className="text-[10px] uppercase tracking-[0.5em] font-bold text-center mb-3"
            style={{ color: DOJO_COLORS.gold }}
          >
            Voices from the dojo
          </p>
          <h2
            className="leading-tight text-center mb-12 uppercase"
            style={{
              fontFamily: HEADER_FONT,
              color: DOJO_COLORS.textPrimary,
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              letterSpacing: '0.04em',
            }}
          >
            What students say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testimonials.slice(0, 4).map((t) => (
              <figure
                key={t.id}
                className="p-6"
                style={{
                  background: DOJO_COLORS.bgPanel,
                  border: `1px solid ${DOJO_COLORS.divider}`,
                  borderLeft: `3px solid ${DOJO_COLORS.brand}`,
                }}
              >
                <blockquote
                  className="text-base leading-relaxed mb-4"
                  style={{ color: DOJO_COLORS.textPrimary }}
                >
                  "{t.body}"
                </blockquote>
                <figcaption
                  className="pt-3 border-t flex items-center gap-3"
                  style={{ borderColor: DOJO_COLORS.divider }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: DOJO_COLORS.brand,
                      color: '#FFF',
                      fontFamily: HEADER_FONT,
                    }}
                  >
                    {(t.client_name[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p
                      className="text-sm font-bold uppercase tracking-wide"
                      style={{ color: DOJO_COLORS.textPrimary, fontFamily: HEADER_FONT }}
                    >
                      {t.client_name}
                    </p>
                    {t.client_role && (
                      <p className="text-xs" style={{ color: DOJO_COLORS.textSecondary }}>
                        {t.client_role}
                      </p>
                    )}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section
        id="contact"
        className="px-6 sm:px-10 py-20 text-center"
        style={{ background: DOJO_COLORS.brand, color: '#FFF' }}
      >
        <h2
          className="leading-tight mb-4 uppercase mx-auto max-w-3xl"
          style={{
            fontFamily: HEADER_FONT,
            fontSize: 'clamp(2rem, 6vw, 4rem)',
            fontWeight: 900,
            letterSpacing: '0.04em',
          }}
        >
          Walk in. Bow. Begin.
        </h2>
        <p className="text-base leading-relaxed mb-8 max-w-xl mx-auto opacity-95">
          Free first class. Beginners welcome. Kids and adults.
        </p>
        {bookHref && (
          <Link
            to={bookHref}
            className="inline-flex items-center gap-2 px-8 py-4 font-bold uppercase tracking-widest text-sm"
            style={{
              background: '#FFF',
              color: DOJO_COLORS.brand,
              fontFamily: HEADER_FONT,
              letterSpacing: '0.15em',
            }}
          >
            {heroCta} <ArrowRight size={16} />
          </Link>
        )}

        <div className="flex flex-wrap items-center justify-center gap-5 mt-12 text-sm opacity-95">
          {profile.contact.email && (
            <a href={`mailto:${profile.contact.email}`} className="inline-flex items-center gap-1.5 hover:opacity-80">
              <Mail size={14} /> {profile.contact.email}
            </a>
          )}
          {profile.contact.phone && (
            <a href={`tel:${profile.contact.phone}`} className="inline-flex items-center gap-1.5 hover:opacity-80">
              <Phone size={14} /> {profile.contact.phone}
            </a>
          )}
          {profile.contact.instagram && (
            <a
              href={`https://instagram.com/${profile.contact.instagram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:opacity-80"
            >
              <Instagram size={14} /> {profile.contact.instagram}
            </a>
          )}
          {profile.contact.address && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} /> {profile.contact.address}
            </span>
          )}
        </div>
      </section>

      <footer
        className="px-6 sm:px-10 py-6 text-center text-[10px] uppercase tracking-widest"
        style={{ color: DOJO_COLORS.textMuted, background: DOJO_COLORS.bgPage }}
      >
        © {new Date().getFullYear()} {heading} · Martial arts dojo
      </footer>
    </div>
  );
}
