import { listVehicles } from "@/db/lib/vehicles";
import { getSession } from "@/services/session";
import { BookingWizard } from "@/components/booking-wizard/BookingWizard";
import type { VehicleKind } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; vehicle?: string }>;
}) {
  const sp = await searchParams;
  const vehicles = await listVehicles();
  const session = await getSession();
  const kind = sp.kind === "pickup" || sp.kind === "van" ? (sp.kind as VehicleKind) : undefined;

  return (
    <BookingWizard
      vehicles={vehicles}
      initialKind={kind}
      initialVehicleId={sp.vehicle}
      isAuthed={Boolean(session)}
      initialName={session?.name ?? ""}
    />
  );
}
