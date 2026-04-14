import Link from "next/link";

export default function Header() {
  return (
    <nav className="landing-nav">
      <div className="logo">Vector<span>Lead</span></div>
      <ul className="nav-links">
        <li><a href="#how">How it works</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><Link href="/login">Login</Link></li>
      </ul>
      <div className="nav-right">
        <Link href="/login" className="btn-ghost" style={{ textTransform: 'none' }}>Log in</Link>
        <Link href="/signup" className="btn-primary">SIGN UP &rarr;</Link>
      </div>
    </nav>
  );
}
