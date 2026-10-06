import Link from "next/link";
import { getSession } from "@/services/session";
import { repo } from "@/data/repo";
import { waDigits } from "@/data/content";
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
        title="أهلاً بيك في نقلة"
        subtitle="سجّل دخولك برقم موبايلك عشان تتابع طلباتك"
        action={<LinkButton href="/login?next=/account">دخول برقم الموبايل</LinkButton>}
      />
    );
  }

  const [orders, content] = await Promise.all([repo.listDeliveryOrdersByPhone(session.phone), repo.getAppContent()]);
  const active = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length;
  const done = orders.filter((o) => o.status === "completed").length;
  const wa = waDigits(content.whatsapp);

  return (
    <div className="p-4 flex flex-col gap-5">
      <h1 className="text-[1.7rem] font-extrabold leading-tight">حسابي</h1>

      {/* Profile */}
      <section className="bg-panel border border-line rounded-card shadow-sm p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <span className="w-16 h-16 shrink-0 rounded-full bg-primary-soft text-primary grid place-items-center">
            <Icon name="user" className="w-8 h-8" />
          </span>
          <div className="min-w-0">
            <div className="font-extrabold text-xl truncate">{session.name ?? "عميل نقلة"}</div>
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

      {/* Menu */}
      <nav className="bg-panel border border-line rounded-card shadow-sm divide-y divide-line overflow-hidden">
        <Item href="/bookings" icon="orders" label="طلباتي" hint="تابع حالة توصيلاتك" />
        <Item href="/estimate" icon="truck" label="اطلب توصيلة جديدة" hint="السعر قدامك قبل ما تطلب" />
        <Item href="/help" icon="help" label="المساعدة والأسئلة الشائعة" />
        {wa && <Item href={`https://wa.me/${wa}`} external icon="whatsapp" label="كلّمنا على واتساب" hint="أسرع وسيلة للمساعدة" />}
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

function Item({ href, icon, label, hint, external }: { href: string; icon: IconName; label: string; hint?: string; external?: boolean }) {
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
