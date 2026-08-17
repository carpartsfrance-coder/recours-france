import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s — Administration Recours France" },
  robots: { index: false, follow: false },
};

/** L'administration n'est jamais indexée. L'authentification est portée par le
 *  groupe (interne), afin que la page de connexion reste accessible. */
export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
