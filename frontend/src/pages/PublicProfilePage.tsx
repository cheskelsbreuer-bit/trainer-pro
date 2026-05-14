import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Star,
  Phone,
  Mail,
  Instagram,
  MessageCircle,
  MapPin,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatMoney } from '../lib/format';
import type { PublicProfile, Testimonial, PackageDefinition } from '../lib/database.types';
import { NutritionPublicProfile } from '../nutrition/pages/NutritionPublicProfile';

interface ProfilePayload {
  trainer: {
    full_name: string;
    business_name: string | null;
    slug: string | null;
    primary_color: string | null;
    logo_url: string | null;
    currency: string | null;
    // Added in migration 35 — drives which themed layout we render.
    template_slugs?: string[] | null;
  };
  profile: PublicProfile;
  packages: PackageDefinition[];
  testimonials: Pick<
    Testimonial,
    'id' | 'client_name' | 'client_role' | 'client_photo_url' | 'body' | 'rating'
  >[];
}

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-profile', slug],
    queryFn: async (): Promise<ProfilePayload | null> => {
      if (!slug) return null;
      const { data, error } = await supabase.rpc('public_profile_info', { p_slug: slug });
      if (error) throw error;
      return data as ProfilePayload | null;
    },
    enabled: !!slug,
  });

  // Push the trainer's color into the page CSS variable so every accent picks it up
  useEffect(() => {
    const color = data?.trainer.primary_color || '#2d6a9f';
    document.documentElement.style.setProperty('--brand', color);
    document.documentElement.style.setProperty('--brand-dark', darken(color, 14));
    return () => {
      document.documentElement.style.removeProperty('--brand');
      document.documentElement.style.removeProperty('--brand-dark');
    };
  }, [data?.trainer.primary_color]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-sm border border-slate-200">
          <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
          <p className="text-sm text-slate-500 mt-2">
            This trainer profile doesn't exist or isn't published yet.
          </p>
        </div>
      </div>
    );
  }

  const { trainer, profile, packages, testimonials } = data;

  // Template-driven fork — if the trainer's primary template is
  // nutrition_coach (or other themed ones), render the dedicated
  // themed public profile instead of the generic trainer one.
  const primaryTemplate = trainer.template_slugs?.[0];
  if (primaryTemplate === 'nutrition_coach') {
    return (
      <NutritionPublicProfile
        trainer={trainer}
        profile={profile}
        packages={packages}
        testimonials={testimonials}
      />
    );
  }

  const heading = trainer.business_name || trainer.full_name;
  const heroTitle = profile.hero.title || `Train with ${trainer.full_name.split(' ')[0]}.`;
  const heroSubtitle =
    profile.hero.subtitle ||
    'Personalized 1-on-1 training designed around your body, your goals, your schedule.';
  const heroCta = profile.hero.cta_text || 'Book a free consultation';
  const heroPhoto = profile.hero.photo_url;
  const aboutHeadline = profile.about.headline || `Hi, I'm ${trainer.full_name.split(' ')[0]}.`;
  const aboutBody = profile.about.body;

  const bookHref = trainer.slug ? `/book/${trainer.slug}` : null;

  return (
    <div className="bg-white text-slate-900">
      {/* Top nav */}
      <nav className="absolute top-0 left-0 right-0 z-30 px-6 py-5 flex items-center justify-between text-white">
        <div className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {trainer.logo_url ? (
            <img src={trainer.logo_url} alt="" className="h-8 w-8 rounded-full bg-white/10 object-cover" />
          ) : (
            <span className="text-2xl">💪</span>
          )}
          {heading}
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm">
          <a href="#about" className="opacity-90 hover:opacity-100">About</a>
          <a href="#services" className="opacity-90 hover:opacity-100">Services</a>
          {testimonials.length > 0 && (
            <a href="#testimonials" className="opacity-90 hover:opacity-100">Reviews</a>
          )}
          <a href="#contact" className="opacity-90 hover:opacity-100">Contact</a>
          {bookHref && (
            <Link
              to={bookHref}
              className="bg-white text-slate-900 px-4 py-2 rounded-full text-sm font-medium hover:bg-slate-100 transition shadow-sm"
            >
              Book now
            </Link>
          )}
        </div>
      </nav>

      {/* HERO */}
      <header
        className="relative min-h-[88vh] flex items-center text-white overflow-hidden"
        style={{
          background: heroPhoto
            ? `url(${heroPhoto}) center/cover no-repeat`
            : `linear-gradient(135deg, var(--brand, #2d6a9f), var(--brand-dark, #1b4670))`,
        }}
      >
        {heroPhoto && (
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-black/65" />
        )}
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-32">
          <p className="text-white/80 uppercase tracking-[0.2em] text-xs font-semibold mb-4">
            {trainer.business_name ? trainer.full_name : 'Personal Training'}
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight max-w-3xl">
            {heroTitle}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed">
            {heroSubtitle}
          </p>
          {bookHref && (
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to={bookHref}
                className="inline-flex items-center gap-2 bg-white text-slate-900 px-7 py-3.5 rounded-full text-base font-semibold hover:bg-slate-100 transition shadow-lg hover:shadow-xl"
              >
                {heroCta}
                <ArrowRight size={16} />
              </Link>
              <a
                href="#services"
                className="inline-flex items-center gap-2 text-white/90 hover:text-white text-base font-medium px-3 py-3 transition"
              >
                See packages
              </a>
            </div>
          )}
        </div>
      </header>

      {/* ABOUT */}
      <section id="about" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p
              className="uppercase tracking-[0.2em] text-xs font-semibold mb-3"
              style={{ color: 'var(--brand, #2d6a9f)' }}
            >
              About
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              {aboutHeadline}
            </h2>
            {aboutBody ? (
              <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                {aboutBody}
              </div>
            ) : (
              <div className="text-slate-700 leading-relaxed space-y-4">
                <p>
                  I work with clients one-on-one to design programs around their bodies, their
                  schedules, and their lives — not the other way around.
                </p>
                <p>
                  No cookie-cutter routines, no group classes, no judgment. Just a sustainable
                  practice you'll actually show up to.
                </p>
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-2">
              <Pill>Personalized programs</Pill>
              <Pill>1-on-1 attention</Pill>
              <Pill>Flexible scheduling</Pill>
              <Pill>Progress tracking</Pill>
            </div>
          </div>

          <div className="relative">
            {profile.about.photo_url ? (
              <img
                src={profile.about.photo_url}
                alt={trainer.full_name}
                className="rounded-2xl shadow-xl object-cover w-full aspect-[4/5]"
              />
            ) : (
              <div
                className="rounded-2xl shadow-xl w-full aspect-[4/5] flex items-center justify-center text-white text-7xl font-bold"
                style={{
                  background:
                    'linear-gradient(135deg, var(--brand, #2d6a9f), var(--brand-dark, #1b4670))',
                }}
              >
                {trainer.full_name
                  .split(' ')
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')}
              </div>
            )}
            {/* decorative */}
            <div
              className="hidden md:block absolute -z-10 -top-6 -right-6 w-32 h-32 rounded-full opacity-30"
              style={{ background: 'var(--brand, #2d6a9f)' }}
            />
          </div>
        </div>
      </section>

      {/* SERVICES / PACKAGES */}
      {packages && packages.length > 0 && (
        <section id="services" className="py-24 px-6 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <p
              className="uppercase tracking-[0.2em] text-xs font-semibold mb-3 text-center"
              style={{ color: 'var(--brand, #2d6a9f)' }}
            >
              Services
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-3">
              Pick a package that fits
            </h2>
            <p className="text-slate-500 text-center max-w-xl mx-auto mb-12">
              Single sessions or multi-session packs. Every plan includes a free consultation,
              custom programming, and ongoing support.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {packages.slice(0, 3).map((p, i) => {
                const featured = i === 1 && packages.length >= 3;
                return (
                  <div
                    key={p.name}
                    className={`rounded-2xl p-7 transition shadow-sm hover:shadow-lg ${
                      featured
                        ? 'bg-slate-900 text-white scale-[1.02] shadow-xl'
                        : 'bg-white border border-slate-200'
                    }`}
                  >
                    {featured && (
                      <span
                        className="text-[10px] uppercase tracking-[0.18em] font-semibold inline-block mb-3 px-2 py-0.5 rounded-full"
                        style={{
                          background: 'var(--brand, #2d6a9f)',
                          color: 'white',
                        }}
                      >
                        Most popular
                      </span>
                    )}
                    <h3 className={`text-lg font-bold ${featured ? 'text-white' : 'text-slate-900'}`}>
                      {p.name}
                    </h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span
                        className={`text-4xl font-bold tracking-tight ${
                          featured ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {formatMoney(p.price, trainer.currency || 'USD').replace(/\.00$/, '')}
                      </span>
                      <span className={featured ? 'text-white/70' : 'text-slate-500'}>
                        / {p.sessions} {p.sessions === 1 ? 'session' : 'sessions'}
                      </span>
                    </div>
                    <ul className={`mt-6 space-y-2 text-sm ${featured ? 'text-white/90' : 'text-slate-700'}`}>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                        Personalized programming
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                        Flexible scheduling
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                        Progress tracking
                      </li>
                    </ul>
                    {bookHref && (
                      <Link
                        to={bookHref}
                        className={`mt-7 inline-flex items-center justify-center gap-2 w-full py-3 rounded-full text-sm font-semibold transition ${
                          featured
                            ? 'bg-white text-slate-900 hover:bg-slate-100'
                            : 'text-white hover:opacity-90'
                        }`}
                        style={
                          featured
                            ? undefined
                            : { background: 'var(--brand, #2d6a9f)' }
                        }
                      >
                        Book {p.name}
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {profile.gallery && profile.gallery.length > 0 && (
        <section className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <p
              className="uppercase tracking-[0.2em] text-xs font-semibold mb-3 text-center"
              style={{ color: 'var(--brand, #2d6a9f)' }}
            >
              Gallery
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-12">
              Inside the work
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {profile.gallery.slice(0, 9).map((g, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-xl group cursor-pointer relative"
                >
                  <img
                    src={g.url}
                    alt={g.caption || `Gallery ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {g.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {g.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section
          id="testimonials"
          className="py-24 px-6 text-white"
          style={{
            background:
              'linear-gradient(135deg, var(--brand, #2d6a9f), var(--brand-dark, #1b4670))',
          }}
        >
          <div className="max-w-5xl mx-auto">
            <p className="uppercase tracking-[0.2em] text-xs font-semibold mb-3 text-center text-white/80">
              Reviews
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-12">
              What clients say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {testimonials.slice(0, 4).map((t) => (
                <div key={t.id} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/15">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                      <Star key={i} size={14} className="fill-white text-white" />
                    ))}
                  </div>
                  <p className="text-base leading-relaxed mb-5">"{t.body}"</p>
                  <div className="flex items-center gap-3">
                    {t.client_photo_url ? (
                      <img
                        src={t.client_photo_url}
                        alt={t.client_name}
                        className="w-10 h-10 rounded-full object-cover bg-white/15"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-sm font-semibold">
                        {t.client_name
                          .split(' ')
                          .map((p) => p[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join('')}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm">{t.client_name}</div>
                      {t.client_role && (
                        <div className="text-xs text-white/80">{t.client_role}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA strip */}
      {bookHref && (
        <section className="py-20 px-6 bg-slate-900 text-white text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Ready to start?
            </h2>
            <p className="text-slate-300 mb-8 text-lg">
              Pick a slot, fill out a quick intake, and we'll meet for the first session.
            </p>
            <Link
              to={bookHref}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold text-slate-900 bg-white hover:bg-slate-100 transition shadow-lg"
            >
              <Calendar size={16} />
              {heroCta}
            </Link>
          </div>
        </section>
      )}

      {/* CONTACT / FOOTER */}
      <footer id="contact" className="py-16 px-6 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <p
              className="uppercase tracking-[0.2em] text-xs font-semibold mb-2"
              style={{ color: 'var(--brand, #2d6a9f)' }}
            >
              Get in touch
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">{heading}</h2>
            <ul className="space-y-2.5 text-sm text-slate-700">
              {profile.contact.phone && (
                <ContactRow icon={<Phone size={14} />} href={`tel:${profile.contact.phone}`}>
                  {profile.contact.phone}
                </ContactRow>
              )}
              {profile.contact.email && (
                <ContactRow icon={<Mail size={14} />} href={`mailto:${profile.contact.email}`}>
                  {profile.contact.email}
                </ContactRow>
              )}
              {profile.contact.whatsapp && (
                <ContactRow
                  icon={<MessageCircle size={14} />}
                  href={`https://wa.me/${profile.contact.whatsapp.replace(/[^\d]/g, '')}`}
                >
                  WhatsApp
                </ContactRow>
              )}
              {profile.contact.instagram && (
                <ContactRow
                  icon={<Instagram size={14} />}
                  href={`https://instagram.com/${profile.contact.instagram.replace('@', '')}`}
                >
                  @{profile.contact.instagram.replace('@', '')}
                </ContactRow>
              )}
              {profile.contact.address && (
                <ContactRow icon={<MapPin size={14} />}>{profile.contact.address}</ContactRow>
              )}
            </ul>
          </div>

          <div className="md:text-right text-xs text-slate-400 self-end">
            <div>© {new Date().getFullYear()} {heading}</div>
            <div className="mt-1">
              Powered by <span className="text-slate-500">Trainer Pro</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-700">
      {children}
    </span>
  );
}

function ContactRow({
  icon,
  children,
  href,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <span className="flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: 'var(--brand, #2d6a9f)' }}>
        {icon}
      </span>
      <span>{children}</span>
    </span>
  );
  return href ? (
    <li>
      <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition">
        {inner}
      </a>
    </li>
  ) : (
    <li>{inner}</li>
  );
}

function darken(hex: string, percent: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - Math.round(255 * (percent / 100)));
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - Math.round(255 * (percent / 100)));
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - Math.round(255 * (percent / 100)));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
