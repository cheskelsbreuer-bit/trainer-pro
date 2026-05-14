// Public profile for a nutrition_coach trainer — what prospective
// clients see at /p/<slug>. Themed with the nutrition app's palette
// (cream paper, sage + coral, soft photo cards) and grounded in PN
// language so a curious prospect understands what "habit-based
// coaching" actually means before they book a consult.
//
// Renders as a standalone marketing page — no AppShell wrapper, no
// sidebar, no auth — because public visitors don't have a session.

import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  Instagram,
  MessageCircle,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Calendar,
  Heart,
} from 'lucide-react';
import type { PublicProfile, PackageDefinition, Testimonial } from '../../lib/database.types';
import { formatMoney } from '../../lib/format';
import { N, SERIF_FONT } from '../theme';

interface PublicTrainer {
  full_name: string;
  business_name: string | null;
  slug: string | null;
  primary_color: string | null;
  logo_url: string | null;
  currency: string | null;
}

interface NutritionPublicProfileProps {
  trainer: PublicTrainer;
  profile: PublicProfile;
  packages: PackageDefinition[];
  testimonials: Pick<
    Testimonial,
    'id' | 'client_name' | 'client_role' | 'client_photo_url' | 'body' | 'rating'
  >[];
}

const PN_PILLARS = [
  {
    icon: <Heart size={18} />,
    title: 'Practices, not perfection',
    body: "We work on one small daily habit at a time — eat slowly, eat to 80% full, hand-portion your protein. Two weeks per habit, then we layer the next one in.",
  },
  {
    icon: <Sparkles size={18} />,
    title: 'Hand portions over math',
    body: 'No food scales, no logging apps. Your palm portions protein. Your fist portions vegetables. Your hand scales to your body — calorie control without the chore.',
  },
  {
    icon: <Calendar size={18} />,
    title: 'Live weekly check-ins',
    body: "We meet on video every week. You bring how the week went — energy, sleep, hunger, struggles. I bring the next step. Behavior change is built on the conversation, not the spreadsheet.",
  },
];

export function NutritionPublicProfile({
  trainer,
  profile,
  packages,
  testimonials,
}: NutritionPublicProfileProps) {
  const heading = trainer.business_name || trainer.full_name;
  const firstName = trainer.full_name.split(' ')[0];
  const heroTitle =
    profile.hero.title ||
    `Eat well. Feel strong. Without the spreadsheet.`;
  const heroSubtitle =
    profile.hero.subtitle ||
    `1-on-1 nutrition coaching with ${firstName} — habit-based, evidence-rooted, with weekly live check-ins. Built on the Precision Nutrition method.`;
  const heroCta = profile.hero.cta_text || 'Book a free intro call';
  const aboutHeadline = profile.about.headline || `Hi, I'm ${firstName}.`;
  const aboutBody = profile.about.body;

  const bookHref = trainer.slug ? `/book/${trainer.slug}` : null;

  return (
    <div
      className="nutrition-theme-light min-h-screen"
      style={{
        background: 'var(--nut-paper)',
        color: 'var(--nut-ink)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Top nav */}
      <nav
        className="px-6 sm:px-10 py-4 flex items-center justify-between"
        style={{ background: N.paper }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base"
            style={{ background: N.coral, color: '#FFF' }}
            aria-hidden
          >
            {(heading[0] || 'N').toUpperCase()}
          </div>
          <span className="text-sm font-semibold" style={{ color: N.ink }}>
            {heading}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm">
          <a href="#about" style={{ color: N.inkSoft }} className="hover:opacity-80">
            About
          </a>
          <a href="#approach" style={{ color: N.inkSoft }} className="hover:opacity-80">
            Approach
          </a>
          <a href="#services" style={{ color: N.inkSoft }} className="hover:opacity-80">
            Services
          </a>
          {testimonials.length > 0 && (
            <a href="#stories" style={{ color: N.inkSoft }} className="hover:opacity-80">
              Stories
            </a>
          )}
          <a href="#contact" style={{ color: N.inkSoft }} className="hover:opacity-80">
            Contact
          </a>
        </div>
        {bookHref && (
          <Link
            to={bookHref}
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: N.coral, color: '#FFF' }}
          >
            Book a call <ArrowRight size={14} />
          </Link>
        )}
      </nav>

      {/* Hero */}
      <section className="px-6 sm:px-10 pt-12 pb-16 max-w-5xl mx-auto">
        <p
          className="text-xs font-semibold uppercase tracking-[0.25em] mb-4"
          style={{ color: N.coral }}
        >
          Nutrition Practice · Habit-based coaching
        </p>
        <h1
          className="leading-[1.05] mb-6"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 600,
            letterSpacing: '-0.025em',
          }}
        >
          {heroTitle}
        </h1>
        <p
          className="text-lg leading-relaxed max-w-2xl mb-8"
          style={{ color: N.inkSoft }}
        >
          {heroSubtitle}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {bookHref && (
            <Link
              to={bookHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base"
              style={{ background: N.coral, color: '#FFF' }}
            >
              {heroCta} <ArrowRight size={16} />
            </Link>
          )}
          <a
            href="#approach"
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl font-semibold text-base"
            style={{
              background: 'transparent',
              color: N.coral,
              border: `1px solid ${N.coral}55`,
            }}
          >
            How I coach
          </a>
        </div>
      </section>

      {/* About */}
      <section
        id="about"
        className="px-6 sm:px-10 py-16"
        style={{ background: N.card, borderTop: `1px solid ${N.rule}` }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 items-start">
          <div
            className="aspect-square rounded-3xl flex items-center justify-center"
            style={{ background: N.sageSoft }}
          >
            {profile.about.photo_url ? (
              <img
                src={profile.about.photo_url}
                alt={trainer.full_name}
                className="w-full h-full rounded-3xl object-cover"
              />
            ) : (
              <span
                style={{
                  fontFamily: SERIF_FONT,
                  color: N.sageDeep,
                  fontSize: '6rem',
                  fontWeight: 500,
                  fontStyle: 'italic',
                }}
              >
                {firstName[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.25em] mb-3"
              style={{ color: N.coral }}
            >
              About
            </p>
            <h2
              className="leading-tight mb-4"
              style={{
                fontFamily: SERIF_FONT,
                color: N.ink,
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              {aboutHeadline}
            </h2>
            {aboutBody ? (
              <p
                className="text-base leading-relaxed whitespace-pre-line"
                style={{ color: N.inkSoft }}
              >
                {aboutBody}
              </p>
            ) : (
              <p
                className="text-base leading-relaxed"
                style={{ color: N.inkSoft }}
              >
                I coach the way I'd want to be coached. We work on the small
                daily habits that decide where you end up in a year — not on
                strict food rules that fall apart by Wednesday. Weekly check-ins
                keep us honest, and the conversation is where the real change
                happens.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Approach / PN pillars */}
      <section
        id="approach"
        className="px-6 sm:px-10 py-16 max-w-5xl mx-auto"
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.25em] mb-3 text-center"
          style={{ color: N.coral }}
        >
          The Approach
        </p>
        <h2
          className="leading-tight text-center mb-12 max-w-2xl mx-auto"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          How I coach
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PN_PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl p-6"
              style={{
                background: N.card,
                border: `1px solid ${N.rule}`,
                boxShadow: 'var(--nut-shadow)',
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: N.coralSoft, color: N.coral }}
              >
                {p.icon}
              </div>
              <h3
                className="leading-tight mb-2"
                style={{
                  fontFamily: SERIF_FONT,
                  color: N.ink,
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                }}
              >
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: N.inkSoft }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Services / Packages */}
      {packages.length > 0 && (
        <section
          id="services"
          className="px-6 sm:px-10 py-16"
          style={{ background: N.card, borderTop: `1px solid ${N.rule}` }}
        >
          <div className="max-w-5xl mx-auto">
            <p
              className="text-xs font-semibold uppercase tracking-[0.25em] mb-3 text-center"
              style={{ color: N.coral }}
            >
              Services
            </p>
            <h2
              className="leading-tight text-center mb-12 max-w-2xl mx-auto"
              style={{
                fontFamily: SERIF_FONT,
                color: N.ink,
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              How we'd work together
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {packages.slice(0, 3).map((pkg, i) => {
                const featured = i === 1 && packages.length >= 3;
                return (
                  <div
                    key={pkg.name + i}
                    className="rounded-2xl p-6 flex flex-col"
                    style={{
                      background: featured ? N.coral : N.paper,
                      color: featured ? '#FFF' : N.ink,
                      border: `1px solid ${featured ? N.coral : N.rule}`,
                      boxShadow: featured ? 'var(--nut-shadow)' : 'none',
                    }}
                  >
                    {featured && (
                      <span
                        className="self-start text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-3"
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          color: '#FFF',
                        }}
                      >
                        Most popular
                      </span>
                    )}
                    <h3
                      className="leading-tight mb-2"
                      style={{
                        fontFamily: SERIF_FONT,
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        color: featured ? '#FFF' : N.ink,
                      }}
                    >
                      {pkg.name}
                    </h3>
                    <p
                      className="mb-4"
                      style={{
                        fontFamily: SERIF_FONT,
                        fontSize: '2.25rem',
                        fontWeight: 600,
                        color: featured ? '#FFF' : N.coral,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {formatMoney(pkg.price, trainer.currency ?? 'USD')}
                    </p>
                    {pkg.sessions > 0 && (
                      <p
                        className="text-sm mb-4"
                        style={{
                          color: featured ? 'rgba(255,255,255,0.85)' : N.mute,
                        }}
                      >
                        {pkg.sessions} session{pkg.sessions === 1 ? '' : 's'} included
                      </p>
                    )}
                    <ul className="space-y-2 text-sm flex-1">
                      <li
                        className="flex items-start gap-2"
                        style={{ color: featured ? 'rgba(255,255,255,0.95)' : N.inkSoft }}
                      >
                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                        Weekly live video check-in
                      </li>
                      <li
                        className="flex items-start gap-2"
                        style={{ color: featured ? 'rgba(255,255,255,0.95)' : N.inkSoft }}
                      >
                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                        Custom daily practice plan
                      </li>
                      <li
                        className="flex items-start gap-2"
                        style={{ color: featured ? 'rgba(255,255,255,0.95)' : N.inkSoft }}
                      >
                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                        Messaging between sessions
                      </li>
                    </ul>
                    {bookHref && (
                      <Link
                        to={bookHref}
                        className="mt-5 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm"
                        style={{
                          background: featured ? '#FFF' : N.coral,
                          color: featured ? N.coral : '#FFF',
                        }}
                      >
                        Get started <ArrowRight size={14} />
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
        <section id="stories" className="px-6 sm:px-10 py-16 max-w-5xl mx-auto">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em] mb-3 text-center"
            style={{ color: N.coral }}
          >
            Client stories
          </p>
          <h2
            className="leading-tight text-center mb-12 max-w-2xl mx-auto"
            style={{
              fontFamily: SERIF_FONT,
              color: N.ink,
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            What clients say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {testimonials.slice(0, 4).map((t) => (
              <figure
                key={t.id}
                className="rounded-2xl p-6"
                style={{
                  background: N.card,
                  border: `1px solid ${N.rule}`,
                }}
              >
                <blockquote
                  className="text-base leading-relaxed mb-4"
                  style={{
                    fontFamily: SERIF_FONT,
                    color: N.ink,
                    fontStyle: 'italic',
                  }}
                >
                  "{t.body}"
                </blockquote>
                <figcaption
                  className="flex items-center gap-3 pt-3 border-t"
                  style={{ borderColor: N.rule }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ background: N.sageSoft, color: N.sageDeep }}
                  >
                    {(t.client_name[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: N.ink }}>
                      {t.client_name}
                    </p>
                    {t.client_role && (
                      <p className="text-xs" style={{ color: N.mute }}>
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

      {/* Contact / CTA */}
      <section
        id="contact"
        className="px-6 sm:px-10 py-16"
        style={{ background: N.coral, color: '#FFF' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="leading-tight mb-4"
            style={{
              fontFamily: SERIF_FONT,
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            Ready to feel better in your body?
          </h2>
          <p className="text-base leading-relaxed mb-8 max-w-xl mx-auto opacity-90">
            Book a free 15-minute call. We'll talk about what's worked, what
            hasn't, and whether we're a fit.
          </p>
          {bookHref && (
            <Link
              to={bookHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base"
              style={{ background: '#FFF', color: N.coral }}
            >
              {heroCta} <ArrowRight size={16} />
            </Link>
          )}

          <div className="flex flex-wrap items-center justify-center gap-5 mt-10 text-sm opacity-90">
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
            {profile.contact.whatsapp && (
              <a
                href={`https://wa.me/${profile.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 hover:opacity-80"
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
            {profile.contact.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} /> {profile.contact.address}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 sm:px-10 py-6 text-center text-xs"
        style={{ color: N.muteFaint, background: N.paper }}
      >
        © {new Date().getFullYear()} {heading}. Nutrition coaching practice.
      </footer>
    </div>
  );
}
