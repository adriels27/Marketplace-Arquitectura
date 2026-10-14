"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

export function PublicationLink({ blockedUntil, initialNow, className, children }: {
  blockedUntil: string | null;
  initialNow: string;
  className: string;
  children: ReactNode;
}) {
  const [now, setNow] = useState(() => new Date(initialNow).getTime());
  const [showMessage, setShowMessage] = useState(false);
  const remainingDays = blockedUntil ? Math.max(0, Math.ceil((new Date(blockedUntil).getTime() - now) / (24 * 60 * 60 * 1000))) : 0;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (remainingDays <= 0) return <Link className={className} href="/publicar">{children}</Link>;

  return (
    <span className="publication-link-wrap">
      <button className={`${className} publication-link-disabled`} onClick={() => setShowMessage(true)} type="button">{children}</button>
      {showMessage && <span className="publication-link-message" role="status">Esta opción ha sido deshabilitada. Podrás publicar de nuevo en {remainingDays} {remainingDays === 1 ? "día" : "días"}.</span>}
    </span>
  );
}
