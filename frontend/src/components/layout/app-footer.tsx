import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="border-t py-4 text-center text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4">
        <span>Belfort &copy; {new Date().getFullYear()} — Uso experimental</span>
        <div className="flex gap-4">
          <Link href="/legal" className="hover:text-foreground transition-colors">Aviso legal</Link>
          <Link href="/settings" className="hover:text-foreground transition-colors">Ajustes</Link>
        </div>
      </div>
    </footer>
  );
}
