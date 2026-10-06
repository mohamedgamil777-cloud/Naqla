import { repo } from "@/data/repo";
import { formatEgp } from "@/lib/money";
import { HelpCenter } from "@/components/HelpCenter";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const [business, pricing] = await Promise.all([repo.getBusiness(), repo.defaultPricingInput()]);
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+201000000000";
  // Short hotlines (e.g. 16xxx) show as-is; full numbers show in local format (0100…).
  const phoneLabel = phone.replace(/^\+20/, "0");
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP ?? "+201000000000").replace(/\D/g, "");

  return (
    <HelpCenter
      phone={phone}
      phoneLabel={phoneLabel}
      whatsapp={whatsapp}
      freeCancelHours={business.freeCancelHours}
      loaderFee={formatEgp(pricing.loaderFeePerPerson)}
    />
  );
}
