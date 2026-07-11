import { Link } from "react-router-dom";
import { RotateCcw } from "lucide-react";

export const FloatingResetButton = () => (
  <Link
    to="/reset"
    aria-label="Réinitialiser l'application"
    className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg ring-2 ring-primary/40 hover:brightness-110 active:scale-95"
  >
    <RotateCcw className="h-4 w-4" />
    Réinitialiser
  </Link>
);