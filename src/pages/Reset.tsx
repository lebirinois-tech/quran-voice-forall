import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type ResetStep =
  | "idle"
  | "unregistering"
  | "clearing_caches"
  | "done"
  | "error";

export default function Reset() {
  const [step, setStep] = useState<ResetStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);

  const canReset = useMemo(() => {
    return typeof window !== "undefined";
  }, []);

  useEffect(() => {
    // Helpful to ensure the page is usable even if SW is in a weird state.
    document.title = "Réinitialiser l’application";
  }, []);

  const runReset = async () => {
    setError(null);
    setDetails([]);

    try {
      setStep("unregistering");
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        setDetails((d) => [...d, `Service workers supprimés: ${regs.length}`]);
      } else {
        setDetails((d) => [...d, "Service worker non supporté sur ce navigateur."]);
      }

      setStep("clearing_caches");
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        setDetails((d) => [...d, `Caches supprimés: ${keys.length}`]);
      } else {
        setDetails((d) => [...d, "Cache API non supportée sur ce navigateur."]);
      }

      // Keep auth/local preferences intact by default.
      // If you want to also clear localStorage/sessionStorage, we can add an option.

      setStep("done");
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }
  };

  return (
    <main className="min-h-screen bg-background pattern-islamic">
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Réinitialiser l’application</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Utile quand l’app installée reste bloquée sur une ancienne version. Cette action supprime le service
            worker et les caches du navigateur pour forcer un re-téléchargement.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              onClick={runReset}
              disabled={!canReset || step === "unregistering" || step === "clearing_caches"}
            >
              {step === "idle" && "Réinitialiser maintenant"}
              {step === "unregistering" && "Suppression du service worker…"}
              {step === "clearing_caches" && "Suppression des caches…"}
              {step === "done" && "Réinitialisation terminée"}
              {step === "error" && "Réessayer"}
            </Button>

            {error && (
              <p className="text-sm text-destructive">Erreur: {error}</p>
            )}

            {details.length > 0 && (
              <ul className="text-sm text-muted-foreground list-disc pl-5">
                {details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}

            {step === "done" && (
              <div className="mt-1 text-sm text-foreground">
                <p className="font-medium">Étapes suivantes</p>
                <ol className="mt-2 list-decimal pl-5 text-muted-foreground">
                  <li>Ferme toutes les fenêtres de l’app / du navigateur.</li>
                  <li>Rouvre le site puis réinstalle l’application.</li>
                  <li>Ouvre l’icône installée: tu dois arriver sur /app.</li>
                </ol>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => window.location.assign("/")}
                  >
                    Retour accueil
                  </Button>
                  <Button type="button" variant="outline" onClick={() => window.location.assign("/app")}
                  >
                    Ouvrir /app
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
