// Boxing-gym public profile — what prospective fighters see at /p/<slug>.
// Fight-poster aesthetic, same visual language as the in-app boxing
// experience: black + red + bone-white, Bebas Neue display type,
// red-corner / blue-corner accent rules.

import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  Instagram,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Trophy,
  Dumbbell,
  Flame,
} from 'lucide-react';
import type { PublicProfile, PackageDefinition, Testimonial } from '../../lib/database.types';
import { formatMoney } from '../../lib/format';
import { C, DISPLAY_FONT } from '../theme';

interface PublicTrainer {
  full_name: string;
  business_name: string | null;
  slug: string | null;
  primary_color: string | null;
  logo_url: string | null;
  currency: string | null;
}

interface BoxingPublicProfileProps {
  trainer: PublicTrainer;
  profile: PublicProfile;
  packages: PackageDefinition[];
  testimonials: Pick<
    Testimonial,
    'id' | 'client_name' | 'client_role' | 'client_photo_url' | 'body' | 'rating'
  >[];
}

const BOXING_PILLARS = [
  {
    icon: <Dumbbell size={18} />,
    title: 'Real boxing, no fitness gimmick',
    body: 'Fundamentals first — stance, footwork, jab. The same drills that built champions. Beginners welcome, but this is a real gym.',
  },
  {
    icon: <Flame size={18} />,
    title: 'Round-based training, every session',
    body: '3-minute rounds. Mitts, bag work, conditioning. You walk out exhausted, focused, and better than you came in.',
  },
  {
    icon: <Trophy size={18} />,
    title: 'Built to compete, if you want',
    body: 'Most members never fight. The few who do have a path: amateur registration, sparring nights, USA Boxing smokers. Your choice.',
  },
];

export function BoxingPublicProfile({
  trainer,
  profile,
  packages,
  testimonials,
}: BoxingPublicProfileProps) {
  const heading = trainer.business_name || trainer.full_name;
  const firstName = trainer.full_name.split(' ')[0];
  const heroTitle =
    profile.hero.title || 'TRAIN LIKE A FIGHTER.';
  const heroSubtitle =
    profile.hero.subtitle ||
    `Boxing coaching with ${firstName}. Fundamentals, conditioning, sparring when you're ready. Train hard, train smart, leave better.`;
  const heroCta = profile.hero.cta_text || 'Book your free first session';
  const aboutHeadline = profile.about.headline || `Coach ${firstName}.`;
  const aboutBody = profile.about.body;

  const bookHref = trainer.slug ? `/book/${trainer.slug}` : null;

  return (
    <div
      className="boxing-theme-dark min-h-screen"
      style={{
        background: 'var(--boxing-ink)',
        color: 'var(--boxing-text)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Red-corner top bar */}
      <div className="h-[3px] w-full" style={{ background: C.red }} aria-hidden />

      {/* Nav */}
      <nav
        className="px-6 sm:px-10 py-4 flex items-center justify-between"
        style={{ background: C.ink }}
      >
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-2xl">🥊</span>
          <span
            className="font-black uppercase tracking-wider"
            style={{
              fontFamily: DISPLAY_FONT,
              color: C.text,
              letterSpacing: '0.08em',
              fontSize: '1.0625rem',
            }}
          >
            {heading}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-5 text-xs uppercase tracking-widest">
          <a href="#about" className="hover:opacity-80" style={{ color: C.textDim }}>
            About
          </a>
          <a href="#approach" className="hover:opacity-80" style={{ color: C.textDim }}>
            Approach
          </a>
          <a href="#packages" className="hover:opacity-80" style={{ color: C.textDim }}>
            Packages
          </a>
          {testimonials.length > 0 && (
            <a href="#fighters" className="hover:opacity-80" style={{ color: C.textDim }}>
              Fighters
            </a>
          )}
          <a href="#contact" className="hover:opacity-80" style={{ color: C.textDim }}>
            Contact
          </a>
        </div>
        {bookHref && (
          <Link
            to={bookHref}
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-widest"
            style={{
              background: C.red,
              color: '#FFF',
              fontFamily: DISPLAY_FONT,
              letterSpacing: '0.15em',
            }}
          >
            Walk in <ArrowRight size={13} />
          </Link>
        )}
      </nav>

      {/* Hero — fight poster style */}
      <section
        className="px-6 sm:px-10 py-16 sm:py-24 text-center relative overflow-hidden"
        style={{ background: C.ink, borderBottom: `1px solid ${C.rule}` }}
      >
        <p
          className="text-xs uppercase tracking-[0.5em] font-bold mb-6"
          style={{ color: C.red }}
        >
          ━━━ {heading} ━━━
        </p>
        <h1
          className="leading-[0.95] mb-8 mx-auto max-w-4xl uppercase"
          style={{
            fontFamily: DISPLAY_FONT,
            color: C.text,
            fontSize: 'clamp(3rem, 9vw, 7.5rem)',
            fontWeight: 900,
            letterSpacing: '0.02em',
          }}
        >
          {heroTitle}
        </h1>
        <p
          className="text-base sm:text-lg leading-relaxed mx-auto max-w-2xl mb-10"
          style={{ color: C.textDim }}
        >
          {heroSubtitle}
        </p>
        {bookHref && (
          <Link
            to={bookHref}
            className="inline-flex items-center gap-2 px-8 py-4 font-bold uppercase tracking-widest text-sm"
            style={{
              background: C.red,
              color: '#FFF',
              fontFamily: DISPLAY_FONT,
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
        style={{ background: C.inkSoft, borderBottom: `1px solid ${C.rule}` }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 items-start">
          <div
            className="aspect-square flex items-center justify-center"
            style={{
              background: C.ink,
              border: `1px solid ${C.rule}`,
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
                  fontFamily: DISPLAY_FONT,
                  color: C.red,
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
              style={{ color: C.red }}
            >
              About the coach
            </p>
            <h2
              className="leading-tight mb-5 uppercase"
              style={{
                fontFamily: DISPLAY_FONT,
                color: C.text,
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 900,
                letterSpacing: '0.02em',
              }}
            >
              {aboutHeadline}
            </h2>
            {aboutBody ? (
              <p
                className="text-base leading-relaxed whitespace-pre-line"
                style={{ color: C.textDim }}
              >
                {aboutBody}
              </p>
            ) : (
              <p
                className="text-base leading-relaxed"
                style={{ color: C.textDim }}
              >
                I coach the sweet science the way I learned it — from the
                fundamentals up. Footwork before flash. Conditioning before
                combinations. Beginners get the same drills the pros get. Show
                up, work hard, walk out better. That's it.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Approach pillars */}
      <section
        id="approach"
        className="px-6 sm:px-10 py-20 max-w-6xl mx-auto"
      >
        <p
          className="text-[10px] uppercase tracking-[0.5em] font-bold text-center mb-3"
          style={{ color: C.red }}
        >
          The Approach
        </p>
        <h2
          className="leading-tight text-center mb-12 uppercase"
          style={{
            fontFamily: DISPLAY_FONT,
            color: C.text,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900,
            letterSpacing: '0.02em',
          }}
        >
          How I run a gym
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BOXING_PILLARS.map((p, i) => (
            <div
              key={p.title}
              className="p-6"
              style={{
                background: C.inkSoft,
                border: `1px solid ${C.rule}`,
                borderTop: `3px solid ${i % 2 === 0 ? C.red : C.blueCorner}`,
              }}
            >
              <div
                className="w-11 h-11 flex items-center justify-center mb-4"
                style={{
                  background: 'transparent',
                  color: i % 2 === 0 ? C.red : C.blueCorner,
                  border: `1px solid ${i % 2 === 0 ? C.red : C.blueCorner}`,
                }}
              >
                {p.icon}
              </div>
              <h3
                className="leading-tight mb-2 uppercase"
                style={{
                  fontFamily: DISPLAY_FONT,
                  color: C.text,
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: C.textDim }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      {packages.length > 0 && (
        <section
          id="packages"
          className="px-6 sm:px-10 py-20"
          style={{ background: C.inkSoft, borderTop: `1px solid ${C.rule}` }}
        >
          <div className="max-w-5xl mx-auto">
            <p
              className="text-[10px] uppercase tracking-[0.5em] font-bold text-center mb-3"
              style={{ color: C.red }}
            >
              Packages
            </p>
            <h2
              className="leading-tight text-center mb-12 uppercase"
              style={{
                fontFamily: DISPLAY_FONT,
                color: C.text,
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 900,
                letterSpacing: '0.02em',
              }}
            >
              Train with me
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {packages.slice(0, 3).map((pkg, i) => {
                const featured = i === 1 && packages.length >= 3;
                return (
                  <div
                    key={pkg.name + i}
                    className="p-6 flex flex-col"
                    style={{
                      background: featured ? C.red : C.ink,
                      color: featured ? '#FFF' : C.text,
                      border: `1px solid ${featured ? C.red : C.rule}`,
                    }}
                  >
                    {featured && (
                      <span
                        className="self-start text-[10px] font-bold uppercase tracking-[0.25em] px-2 py-0.5 mb-3"
                        style={{
                          background: 'rgba(0,0,0,0.25)',
                          color: '#FFF',
                          fontFamily: DISPLAY_FONT,
                        }}
                      >
                        Main event
                      </span>
                    )}
                    <h3
                      className="uppercase leading-tight mb-2"
                      style={{
                        fontFamily: DISPLAY_FONT,
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
                        fontFamily: DISPLAY_FONT,
                        fontSize: '2.5rem',
                        fontWeight: 900,
                        color: featured ? '#FFF' : C.red,
                        letterSpacing: '0.02em',
                        lineHeight: 1,
                      }}
                    >
                      {formatMoney(pkg.price, trainer.currency ?? 'USD')}
                    </p>
                    {pkg.sessions > 0 && (
                      <p
                        className="text-sm uppercase tracking-wide mb-4"
                        style={{
                          color: featured ? 'rgba(255,255,255,0.85)' : C.textDim,
                        }}
                      >
                        {pkg.sessions} {pkg.sessions === 1 ? 'session' : 'sessions'}
                      </p>
                    )}
                    <ul className="space-y-2 text-sm flex-1">
                      {['1-on-1 coaching', 'Mitts + bag work', 'Sparring when ready'].map((line) => (
                        <li
                          key={line}
                          className="flex items-start gap-2"
                          style={{ color: featured ? 'rgba(255,255,255,0.92)' : C.textDim }}
                        >
                          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                          {line}
                        </li>
                      ))}
                    </ul>
                    {bookHref && (
                      <Link
                        to={bookHref}
                        className="mt-5 inline-flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em]"
                        style={{
                          background: featured ? '#FFF' : C.red,
                          color: featured ? C.red : '#FFF',
                          fontFamily: DISPLAY_FONT,
                        }}
                      >
                        Choose <ArrowRight size={14} />
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
        <section
          id="fighters"
          className="px-6 sm:px-10 py-20 max-w-5xl mx-auto"
        >
          <p
            className="text-[10px] uppercase tracking-[0.5em] font-bold text-center mb-3"
            style={{ color: C.red }}
          >
            From the floor
          </p>
          <h2
            className="leading-tight text-center mb-12 uppercase"
            style={{
              fontFamily: DISPLAY_FONT,
              color: C.text,
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              letterSpacing: '0.02em',
            }}
          >
            What fighters say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testimonials.slice(0, 4).map((t) => (
              <figure
                key={t.id}
                className="p-6"
                style={{
                  background: C.inkSoft,
                  border: `1px solid ${C.rule}`,
                  borderLeft: `3px solid ${C.red}`,
                }}
              >
                <blockquote className="text-base leading-relaxed mb-4" style={{ color: C.text }}>
                  "{t.body}"
                </blockquote>
                <figcaption
                  className="pt-3 border-t flex items-center gap-3"
                  style={{ borderColor: C.rule }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: C.red,
                      color: '#FFF',
                      fontFamily: DISPLAY_FONT,
                    }}
                  >
                    {(t.client_name[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p
                      className="text-sm font-bold uppercase tracking-wide"
                      style={{ color: C.text, fontFamily: DISPLAY_FONT }}
                    >
                      {t.client_name}
                    </p>
                    {t.client_role && (
                      <p className="text-xs" style={{ color: C.textDim }}>
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
        style={{ background: C.red, color: '#FFF' }}
      >
        <h2
          className="leading-tight mb-4 uppercase mx-auto max-w-3xl"
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 'clamp(2rem, 6vw, 4rem)',
            fontWeight: 900,
            letterSpacing: '0.02em',
          }}
        >
          Walk in. Train hard. Walk out better.
        </h2>
        <p className="text-base leading-relaxed mb-8 max-w-xl mx-auto opacity-95">
          Free first session. No commitment. See if the gym is for you.
        </p>
        {bookHref && (
          <Link
            to={bookHref}
            className="inline-flex items-center gap-2 px-8 py-4 font-bold uppercase tracking-widest text-sm"
            style={{
              background: '#FFF',
              color: C.red,
              fontFamily: DISPLAY_FONT,
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
        style={{ color: C.textFaint, background: C.ink }}
      >
        © {new Date().getFullYear()} {heading} · Boxing gym
      </footer>
    </div>
  );
}
