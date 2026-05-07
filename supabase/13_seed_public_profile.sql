-- ============================================================================
-- TRAINER PRO — Demo seed for the public profile + testimonials
-- ============================================================================
-- Populates your trainer record (the first signup) with sample marketing
-- content so /p/<slug> looks live for demos. Idempotent — re-run to reset.
--
-- Pictures pull from Unsplash's CDN — free, no auth, stable URLs.
-- Customize freely afterward via Settings → Public profile site.
-- ============================================================================

do $$
declare
  t_id uuid;
  t_slug text;
begin
  -- 1. Find first trainer (you) ----------------------------------------------
  select id, slug into t_id, t_slug from public.trainers
    order by created_at asc limit 1;
  if t_id is null then
    raise exception 'No trainer found. Sign up first.';
  end if;

  -- 2. Make sure they have a slug -------------------------------------------
  if t_slug is null or t_slug = '' then
    update public.trainers
       set slug = 'demo-trainer'
     where id = t_id;
    t_slug := 'demo-trainer';
  end if;

  -- 3. Populate the public_profile JSON --------------------------------------
  update public.trainers
     set public_profile = jsonb_build_object(
       'hero', jsonb_build_object(
         'title', 'Build your body. Transform your life.',
         'subtitle', 'Personalized 1-on-1 training designed around your goals, your schedule, and your body. No group classes, no judgment, no shortcuts.',
         'photo_url', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80',
         'cta_text', 'Book a free consultation'
       ),
       'about', jsonb_build_object(
         'headline', 'Hi, I''m here to help you train smart.',
         'body', E'I''ve spent the last 8 years coaching clients through every kind of goal — first marathons, post-injury recoveries, strength PRs, and just feeling good in your own body again.\n\nWhat sets the work apart is the relationship. Every program I write starts with one question: what does your week actually look like? From there we build something sustainable, measurable, and yours alone.\n\nNo cookie-cutter routines. No quick fixes. Just the kind of training you''ll still be doing five years from now.',
         'photo_url', 'https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=1200&q=80'
       ),
       'contact', jsonb_build_object(
         'phone', '+1 (514) 555-0100',
         'email', 'hi@example.com',
         'instagram', 'demo_fitness',
         'whatsapp', '+15145550100',
         'address', '123 Main St · Montreal, QC'
       ),
       'gallery', jsonb_build_array(
         jsonb_build_object('url', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80', 'caption', 'Strength session'),
         jsonb_build_object('url', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80', 'caption', 'Studio'),
         jsonb_build_object('url', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=900&q=80', 'caption', 'Mobility work'),
         jsonb_build_object('url', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80', 'caption', 'Outdoor training'),
         jsonb_build_object('url', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=900&q=80', 'caption', 'Form coaching'),
         jsonb_build_object('url', 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=900&q=80', 'caption', 'Conditioning')
       )
     )
   where id = t_id;

  -- 4. Make sure default packages look good ---------------------------------
  update public.trainers
     set default_packages = '[
       {"name": "Single session", "sessions": 1, "price": 95},
       {"name": "5-session pack",  "sessions": 5, "price": 425},
       {"name": "10-session pack", "sessions": 10, "price": 800}
     ]'::jsonb
   where id = t_id
     and (default_packages is null or default_packages = '[]'::jsonb);

  -- 5. Wipe any old demo testimonials and insert fresh ones -----------------
  delete from public.testimonials
    where trainer_id = t_id and client_name like '%[demo]';

  insert into public.testimonials
    (trainer_id, client_name, client_role, client_photo_url, body, rating, display_order, is_published)
  values
    (t_id, 'Sarah M. [demo]', 'Marathon runner',
     'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80',
     'I came in wanting to run my first marathon and walked out 18 weeks later having finished it. The programs were challenging but never punishing — exactly what I needed.',
     5, 0, true),
    (t_id, 'Marcus C. [demo]', 'Strength enthusiast',
     'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
     'Best coach I''ve worked with. Programmed me through three PRs in six months — a 405 squat, 500 deadlift, and 315 bench. Real attention to form, real results.',
     5, 1, true),
    (t_id, 'Priya P. [demo]', 'Lost 25 lbs',
     'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&q=80',
     'I''d tried gyms, classes, apps — nothing stuck until this. Having someone who actually knew my schedule, my injuries, and my goals made all the difference.',
     5, 2, true),
    (t_id, 'James O. [demo]', 'Post-injury return',
     'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80',
     'I came back from a herniated disc terrified I''d never lift again. The phased return-to-strength plan was thoughtful and the patient coaching gave me my confidence back.',
     5, 3, true);

  raise notice 'Public profile seeded. Visit /p/% to see it.', t_slug;
end $$;
