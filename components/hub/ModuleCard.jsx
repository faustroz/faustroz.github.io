import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function ModuleCard({
  number,
  label,
  status,
  href,
  title,
  description,
  variant = "default",
  testId,
  children,
}) {
  return (
    <Link
      href={href}
      aria-label={`Open ${label}`}
      className={`hub-module-card hub-module-card--${variant}`}
      data-testid={testId}
    >
      <div className="hub-module-meta">
        <span>{number} / {label.toUpperCase()}</span>
        <span className="hub-module-status"><i aria-hidden="true" />{status}</span>
      </div>
      <div className="hub-module-body">
        <h2>{title}</h2>
        <p>{description}</p>
        {children}
      </div>
      <div className="hub-module-action">
        <span>Open module</span>
        <ArrowUpRight aria-hidden="true" />
      </div>
    </Link>
  );
}
