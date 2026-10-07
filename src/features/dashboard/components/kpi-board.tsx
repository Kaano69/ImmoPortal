"use client";

import { Eye, EyeOff, Settings2 } from "lucide-react";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type KpiItem = {
  id: string;
  label: string;
  node: ReactNode;
  /** Breite Karten stehen unter dem Raster der kleinen Karten. */
  wide?: boolean;
};

const STORAGE_KEY = "cockpit.hiddenKpis";
const CHANGE_EVENT = "cockpit:hidden-kpis-changed";
const EMPTY = "[]";

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function writeHidden(hidden: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
  } catch {
    // localStorage ist gesperrt (z. B. privater Modus): Die Auswahl gilt dann nur bis zum Neuladen nicht.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function parseHidden(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/**
 * KPI-Leiste mit Anzeige-Menü: Einzelne Karten lassen sich aus- und einblenden,
 * die Auswahl wird im localStorage gespeichert. Der Server rendert alle Karten,
 * ausgeblendete verschwinden nach dem Laden im Browser.
 */
export function KpiBoard({ items }: { items: KpiItem[] }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => EMPTY);
  const hidden = parseHidden(raw);

  const toggle = useCallback(
    (id: string) => {
      const next = hidden.includes(id) ? hidden.filter((value) => value !== id) : [...hidden, id];
      writeHidden(next);
    },
    [hidden],
  );

  const visible = items.filter((item) => !hidden.includes(item.id));
  const small = visible.filter((item) => !item.wide);
  const wide = visible.filter((item) => item.wide);

  return (
    <section aria-label="Kennzahlen" className="grid gap-4">
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Settings2 />
              Kennzahlen anpassen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kennzahlen anzeigen</DialogTitle>
              <DialogDescription>
                Wähle, welche Karten auf dem Dashboard erscheinen. Die Auswahl wird in diesem Browser
                gespeichert.
              </DialogDescription>
            </DialogHeader>
            <ul className="grid gap-2">
              {items.map((item) => {
                const isVisible = !hidden.includes(item.id);
                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm hover:bg-accent/50">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={isVisible}
                        onChange={() => toggle(item.id)}
                      />
                      <span className="flex-1">{item.label}</span>
                      {isVisible ? (
                        <Eye className="size-4 text-muted-foreground" aria-hidden />
                      ) : (
                        <EyeOff className="size-4 text-muted-foreground" aria-hidden />
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => writeHidden([])}>
                Alle einblenden
              </Button>
              <DialogClose asChild>
                <Button type="button">Fertig</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          Alle Kennzahlen sind ausgeblendet. Über „Kennzahlen anpassen“ blendest du sie wieder ein.
        </p>
      ) : null}

      {small.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {small.map((item) => (
            <div key={item.id} className="contents">
              {item.node}
            </div>
          ))}
        </div>
      ) : null}
      {wide.map((item) => (
        <div key={item.id} className="contents">
          {item.node}
        </div>
      ))}
    </section>
  );
}
