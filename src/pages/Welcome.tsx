import { Link } from "react-router-dom";

function LogoMark() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" role="img" aria-label="PocketVault logo">
      <rect width="72" height="72" rx="18" fill="#1F4D3A" />
      <path
        d="M16 36 L36 18 L56 36 M22 32 V54 H50 V32"
        fill="none"
        stroke="#FAF6EA"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="42" r="5" fill="#D6E64B" />
    </svg>
  );
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-vault";

export default function Welcome() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-cream px-4 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-24 h-40 w-40 rounded-full border-[18px] border-sage"
      />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-4">
        <LogoMark />
        <h1 className="text-title text-vault">PocketVault</h1>
        <p className="text-heading text-ink">Home for your finances.</p>
        <p className="text-body text-moss">
          Plan your business, track every rand, and stay out of debt.
        </p>
        <div className="mt-4 flex w-full flex-col gap-3">
          <Link
            to="/sign-up"
            className={`flex h-12 items-center justify-center rounded-control bg-vault px-6 text-body font-semibold text-white hover:bg-vault-dark ${focusRing}`}
          >
            Create account
          </Link>
          <Link
            to="/log-in"
            className={`flex h-12 items-center justify-center rounded-control border-2 border-vault bg-white px-6 text-body font-semibold text-vault hover:bg-cream ${focusRing}`}
          >
            Log in
          </Link>
        </div>
        <Link
          to="/privacy"
          className="flex min-h-[44px] items-center text-small text-moss underline"
        >
          Privacy Notice
        </Link>
      </div>
    </main>
  );
}
