import { getSession } from "@/services/session";
import { repo } from "@/data/repo";
import { EmptyState, LinkButton } from "@/components/ui";
import { LogoutButton } from "@/components/LogoutButton";
import { DocumentsUploader } from "@/components/DocumentsUploader";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) {
    return (
      <EmptyState
        title="مسجّلتش دخول"
        subtitle="سجّل دخولك برقم موبايلك"
        action={<LinkButton href="/login">دخول برقم الموبايل</LinkButton>}
      />
    );
  }

  const documents = await repo.listDocuments(session.phone);

  return (
    <div className="p-4 flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">حسابي</h1>

      <div className="bg-panel border border-line rounded-card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary text-white grid place-items-center text-2xl">👤</div>
        <div>
          <div className="font-extrabold text-lg">{session.name ?? "عميل نقلة"}</div>
          <div className="text-muted" dir="ltr">{session.phone}</div>
        </div>
      </div>

      <div className="bg-panel border border-line rounded-card divide-y divide-line">
        <Item href="/bookings" icon="📋" label="حجوزاتي" />
        <Item href="/help" icon="💬" label="المساعدة" />
      </div>

      <section>
        <h2 className="font-extrabold text-lg mb-1">مستنداتي</h2>
        <p className="text-muted text-sm mb-3">صوّر بطاقتك ورخصتك عشان تسهّل استلام العربية.</p>
        <DocumentsUploader docs={documents} />
      </section>

      <LogoutButton />
    </div>
  );
}

function Item({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a href={href} className="flex items-center gap-3 p-4 font-semibold">
      <span className="text-2xl">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="text-muted">›</span>
    </a>
  );
}
