import { repo } from "@/db/repo";
import { CouponManager } from "@/components/admin/CouponManager";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requirePermission("coupon:manage");
  const coupons = await repo.listCoupons();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">كوبونات الخصم</h1>
        <p className="text-muted">اعمل أكواد خصم (نسبة أو مبلغ) للعملاء — بتشتغل في الحجز وفي حساب سعر التوصيل.</p>
      </div>
      <CouponManager coupons={coupons} />
    </div>
  );
}
