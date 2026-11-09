import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Gift,
  HeartHandshake,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/session'

const features = [
  {
    title: 'Every gift, remembered',
    body: 'Log cash, groceries, décor and every promise — each with a note and a photo so nothing slips away.',
  },
  {
    title: 'Promised vs received',
    body: 'See at a glance what has landed and what is still on its way, so follow-ups feel gentle, not pushy.',
  },
  {
    title: 'A clear running total',
    body: 'Live totals in Zambian Kwacha, contributor counts and outstanding gifts, updated as you go.',
  },
  {
    title: 'Private to your account',
    body: 'Your registry is tied to your sign-in, protected by securely hashed passwords and private sessions.',
  },
]

const steps = [
  { icon: UsersRound, title: 'Create your account', body: 'Sign up in under a minute with just your name, email and a password.' },
  { icon: Gift, title: 'Add contributions', body: 'Record each gift as it arrives, or mark it as promised until it is delivered.' },
  { icon: BarChart3, title: 'Track the day', body: 'Watch the totals grow and keep a calm overview of your whole celebration.' },
]

export default async function LandingPage() {
  const user = await getCurrentUser()
  const dashboardHref = user?.role === 'admin' ? '/admin' : '/dashboard'

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link className="landing-brand" href="/">
          <span className="brand-mark"><Gift aria-hidden="true" /></span>
          <span className="landing-brand-text"><strong>Impahla app</strong><small>PARTY REGISTRY</small></span>
        </Link>
        <nav className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
        </nav>
        <div className="landing-nav-actions">
          {user ? (
            <Link className="primary-button" href={dashboardHref}>
              {user.role === 'admin' ? 'Open admin console' : 'Go to my registry'} <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link className="ghost-button" href="/login">Sign in</Link>
              <Link className="primary-button" href="/signup">Create account</Link>
            </>
          )}
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-kicker"><Sparkles aria-hidden="true" />MADE FOR ZAMBIAN CELEBRATIONS</span>
          <h1>
            Every gift for her big day, <em>beautifully kept.</em>
          </h1>
          <p>
            Impahla app is a private contribution registry for kitchen parties and bridal showers — cash, gifts and
            promises, all in one calm place you can trust.
          </p>
          <div className="landing-hero-actions">
            {user ? (
              <Link className="primary-button landing-cta" href={dashboardHref}>
                Continue to your registry <ArrowRight aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link className="primary-button landing-cta" href="/signup">
                  Get started free <ArrowRight aria-hidden="true" />
                </Link>
                <Link className="secondary-button landing-cta-secondary" href="/login">I already have an account</Link>
              </>
            )}
          </div>
          <p className="landing-hero-note"><LockKeyhole aria-hidden="true" />Your records stay private to your account.</p>
        </div>
        <div className="landing-hero-media">
          <img
            src="https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=warm%20joyful%20African%20kitchen%20party%20celebration%20with%20wrapped%20gifts%2C%20colorful%20chitenge%20fabrics%2C%20flowers%20and%20a%20golden%20table%20setting%2C%20soft%20natural%20light%2C%20editorial%20photography&image_size=portrait_4_3"
            alt="A warmly decorated kitchen party table with gifts and flowers"
            loading="eager"
          />
          <div className="landing-hero-badge">
            <span className="landing-hero-badge-icon"><CalendarDays aria-hidden="true" /></span>
            <span><strong>A celebration in the making</strong><small><MapPin aria-hidden="true" />Lusaka, Zambia</small></span>
          </div>
        </div>
      </section>

      <section className="landing-features" id="features">
        <p className="landing-section-kicker">WHY IMPAHLA APP</p>
        <h2>Built for the people who hold the day together</h2>
        <div className="landing-feature-grid">
          {features.map(({ title, body }) => (
            <article className="landing-feature-card" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-how" id="how">
        <div className="landing-how-head">
          <p className="landing-section-kicker">HOW IT WORKS</p>
          <h2>Three calm steps</h2>
        </div>
        <div className="landing-how-grid">
          {steps.map(({ icon: Icon, title, body }, index) => (
            <article className="landing-step" key={title}>
              <span className="landing-step-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="landing-step-icon"><Icon aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta-band">
        <div>
          <h2>Ready to keep her day in good hands?</h2>
          <p>Create your registry in a minute and start recording every generous heart.</p>
        </div>
        <Link className="primary-button landing-cta" href={user ? dashboardHref : '/signup'}>
          {user ? 'Open my registry' : 'Create my account'} <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <footer className="landing-footer">
        <div className="landing-brand">
          <span className="brand-mark"><Gift aria-hidden="true" /></span>
          <span className="landing-brand-text"><strong>Impahla app</strong><small>PARTY REGISTRY</small></span>
        </div>
        <div className="landing-footer-links">
          <Link href="/login">Sign in</Link>
          <Link href="/signup">Create account</Link>
        </div>
        <span className="landing-footer-note">One celebration, held with care.</span>
      </footer>
    </div>
  )
}
