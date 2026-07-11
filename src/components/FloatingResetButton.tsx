import { RotateCcw } from "lucide-react";

export const FloatingResetButton = () => (
  <a
    href="/reset"
    aria-label="Réinitialiser l'application"
    className="fixed bottom-4 right-4 z-[2147483647] flex items-center gap-2 rounded-full border-2 border-primary-foreground bg-primary px-5 py-4 text-base font-bold text-primary-foreground shadow-2xl ring-4 ring-primary/40 hover:brightness-110 active:scale-95"
  >
    <RotateCcw className="h-4 w-4" />
    Réinitialiser
  </a>
);