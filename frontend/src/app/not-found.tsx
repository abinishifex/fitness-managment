import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="form-shell">
      <div className="form-card text-center">
        <div className="eyebrow">404</div>
        <h1 className="display">Off protocol</h1>
        <p className="muted">That page is not in the training map.</p>
        <Link className="btn" href="/">
          Back to FORGE
        </Link>
      </div>
    </div>
  );
}
