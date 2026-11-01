import { repo } from "@/data/repo";
import { AgentBookingForm } from "@/components/admin/AgentBookingForm";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const [vehicles, staff] = await Promise.all([repo.listVehicles(), repo.listStaff()]);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">حجز جديد للعميل</h1>
      <AgentBookingForm vehicles={vehicles} staff={staff} />
    </div>
  );
}
