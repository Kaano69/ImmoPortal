import { BellRing, CheckCircle2, FileWarning, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCentsToEuro, formatDate } from "@/lib/formatters";

import type { Reminders } from "../queries";

const MAX_ITEMS = 5;

function ReminderCard({
  title,
  icon: Icon,
  count,
  tone,
  emptyText,
  description,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  count: number;
  tone: "warning" | "destructive";
  emptyText: string;
  description: string;
  children: ReactNode[];
}) {
  const visible = children.slice(0, MAX_ITEMS);
  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
        {count > 0 ? <Badge variant={tone}>{count}</Badge> : null}
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-xs text-muted-foreground">{description}</p>
        {count === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4" aria-hidden />
            {emptyText}
          </p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {visible}
            {children.length > MAX_ITEMS ? (
              <li className="text-xs text-muted-foreground">
                + {children.length - MAX_ITEMS} weitere
              </li>
            ) : null}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RemindersSection({ reminders }: { reminders: Reminders }) {
  const { rentIncreases, payments, documents } = reminders;
  const overdueCount = payments.filter((payment) => payment.overdue).length;

  return (
    <section aria-labelledby="reminders-heading" className="grid gap-3">
      <h2 id="reminders-heading" className="flex items-center gap-2 text-lg font-semibold">
        <BellRing className="size-5" aria-hidden />
        Erinnerungen &amp; Fristen
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <ReminderCard
          title="Zahlungs-Mahnungen"
          icon={Wallet}
          count={payments.length}
          tone={overdueCount > 0 ? "destructive" : "warning"}
          description="Unbezahlte oder überfällige Mieten des laufenden Monats (fällig am 1., überfällig ab dem 4.)."
          emptyText="Alle Mieten dieses Monats sind eingegangen."
        >
          {payments.map((payment) => (
            <li key={payment.key} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/properties/${payment.propertyId}?tab=finance`}
                  className="block truncate font-medium hover:underline"
                >
                  {payment.unitNumber ? `${payment.unitNumber} · ` : ""}
                  {payment.propertyName}
                </Link>
                <span className="block truncate text-xs text-muted-foreground">
                  {payment.label} · fällig {formatDate(payment.dueDate)}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="tabular-nums">{formatCentsToEuro(payment.amountCents)}</span>
                <Badge variant={payment.overdue ? "destructive" : "warning"}>
                  {payment.overdue ? "Überfällig" : "Ausstehend"}
                </Badge>
              </div>
            </li>
          ))}
        </ReminderCard>

        <ReminderCard
          title="Mieterhöhungs-Radar"
          icon={TrendingUp}
          count={rentIncreases.length}
          tone="warning"
          description="Wohnraummietverträge mit Mietbeginn vor mehr als 15 Monaten – eine Anpassung nach § 558 BGB ist möglich. Frühere Erhöhungen sind nicht erfasst."
          emptyText="Keine Mietverhältnisse über 15 Monate."
        >
          {rentIncreases.map((item) => (
            <li key={item.leaseId} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/properties/${item.propertyId}`}
                  className="block truncate font-medium hover:underline"
                >
                  {item.unitNumber} · {item.propertyName}
                </Link>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.tenantName} · seit {formatDate(item.startDate)}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="tabular-nums">{formatCentsToEuro(item.coldRentCents)}</span>
                <span className="text-xs text-muted-foreground">{item.monthsRunning} Monate</span>
              </div>
            </li>
          ))}
        </ReminderCard>

        <ReminderCard
          title="Dokumenten-Check"
          icon={FileWarning}
          count={documents.length}
          tone="warning"
          description="Objekte, denen Pflichtunterlagen fehlen: Kaufvertrag, Grundbuchauszug oder Energieausweis (erkannt an Dateiname oder Schlagwort)."
          emptyText="Alle Pflichtunterlagen sind vorhanden."
        >
          {documents.map((item) => (
            <li key={item.propertyId} className="grid gap-1">
              <Link
                href={`/properties/${item.propertyId}?tab=documents`}
                className="truncate font-medium hover:underline"
              >
                {item.propertyName}
              </Link>
              <div className="flex flex-wrap gap-1">
                {item.missing.map((label) => (
                  <Badge key={label} variant="warning" className="font-normal">
                    {label} fehlt
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ReminderCard>
      </div>
    </section>
  );
}
