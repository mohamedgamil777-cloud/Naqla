import { deleteSavedAddressAction } from "@/actions/customer/company";
import Link from "next/link";
import { getSession } from "@/services/session";
import { listSavedAddresses } from "@/db/lib/addresses";
import { countDeliveryOrdersByStatus } from "@/db/lib/delivery-orders";
import { getAppContent } from "@/db/lib/settings";
import { waDigits } from "@/lib/content";
import { addressOwner, companyContext } from "@/services/company-service";
import { toLocal } from "@/lib/phone";
import { EmptyState, LinkButton } from "@/components/ui";
import { LogoutButton } from "@/components/LogoutButton";
import { Icon, type IconName } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) {
    return (
      <EmptyState
        title="أهلاً بيك في انقلي"
        subtitle="سجّل دخولك برقم موبايلك عشان تتابع طلباتك"
        action={<LinkButton href="/login?next=/account">دخول برقم الموبايل</LinkButton>}
      />
    );
  }

  const ctx = await companyContext(session.phone);
  const [counts, content, saved] = await Promise.all([
    countDeliveryOrdersByStatus({ phone: session.phone }),
    getAppContent(),
    ctx ? Promise.resolve([]) : listSavedAddresses(addressOwner(session.phone, null)),
  ]);
  const done = counts.completed ?? 0;
  const active = Object.entries(counts)
    .filter(([status]) => status !== "completed" && status !== "cancelled")
    .reduce((sum, [, n]) => sum + (n ?? 0), 0);
  const wa = waDigits(content.whatsapp);

  return (
    <div className="p-4 flex flex-col gap-5 w-full max-w-3xl mx-auto">
      <h1 className="text-[1.7rem] font-extrabold leading-tight">حسابي</h1>

      {/* Profile */}
      <section className="bg-panel border border-line rounded-card p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <span className="w-16 h-16 shrink-0 rounded-full bg-primary-soft text-primary grid place-items-center">
            <Icon name="user" className="w-8 h-8" />
          </span>
          <div className="min-w-0">
            <div className="font-extrabold text-xl truncate">{session.name ?? "عميل انقلي"}</div>
            <div className="text-muted flex items-center gap-1.5">
              <Icon name="phone" className="w-4 h-4" />
              <span dir="ltr">{toLocal(session.phone) ?? session.phone}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Stat value={active} label="طلبات حالية" />
          <Stat value={done} label="توصيلات تمّت" />
        </div>
      </section>

      {ctx && (
        <Link
          href="/company"
          className="bg-primary-soft border border-primary/20 rounded-card p-4 flex items-center gap-3"
        >
          <span
            className="w-12 h-12 shrink-0 rounded-2xl bg-panel grid place-items-center text-2xl"
            aria-hidden
          >
           <Icon name="building" className="w-4 h-4 inline-block align-[-3px] me-1.5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-xs text-muted">حساب شركة</span>
            <span className="block font-extrabold text-lg truncate">{ctx.company.name}</span>
            <span className="block text-sm text-ink-2">طلبات الشركة، كشف الحساب، العناوين والمستخدمين</span>
          </span>
          <Icon name="chevronLeft" className="w-5 h-5 text-primary shrink-0" />
        </Link>
      )}

      {!ctx && saved.length > 0 && (
        <section className="bg-panel border border-line rounded-card p-4 flex flex-col gap-2">
          <h2 className="font-extrabold">عناويني المحفوظة</h2>
          <div className="flex flex-col divide-y divide-line">
            {saved.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold"><Icon name="mapPin" className="w-4 h-4 inline-block align-[-3px] me-1.5" />{a.label}</div>
                  <div className="text-sm text-muted truncate">{a.address}</div>
                </div>
                <form action={deleteSavedAddressAction}>
                  <button name="id" value={a.id} className="text-booked text-sm font-bold">
                    حذف
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Menu */}
      <nav className="bg-panel border border-line rounded-card divide-y divide-line overflow-hidden">
        <Item href="/bookings" icon="orders" label="طلباتي" hint="تابع حالة توصيلاتك" />
        <Item href="/estimate" icon="truck" label="اطلب توصيلة جديدة" hint="السعر قدامك قبل ما تطلب" />
        <Item href="/help" icon="help" label="المساعدة والأسئلة الشائعة" />
        {wa && (
          <Item
            href={`https://wa.me/${wa}`}
            external
            icon="whatsapp"
            label="كلّمنا على واتساب"
            hint="أسرع وسيلة للمساعدة"
          />
        )}
      </nav>

      <LogoutButton />
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-ground rounded-2xl py-3 text-center">
      <div className="text-2xl font-extrabold text-emph">{value}</div>
      <div className="text-xs text-muted font-semibold">{label}</div>
    </div>
  );
}

function Item({
  href,
  icon,
  label,
  hint,
  external,
}: {
  href: string;
  icon: IconName;
  label: string;
  hint?: string;
  external?: boolean;
}) {
  const body = (
    <>
      <span className="w-10 h-10 shrink-0 rounded-full bg-primary-soft text-primary grid place-items-center">
        <Icon name={icon} className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-bold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <Icon name="chevronLeft" className="w-5 h-5 text-muted shrink-0" />
    </>
  );
  const cls = "flex items-center gap-3 p-3.5 hover:bg-ground/60";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}
