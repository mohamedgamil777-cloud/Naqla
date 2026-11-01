import { repo } from "@/db/repo";
import { formatEgp } from "@/lib/money";
import { HelpCenter } from "@/components/HelpCenter";
import { fillFaq, phoneLabel, telHref, waDigits } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const [business, content] = await Promise.all([repo.getBusiness(), repo.getAppContent()]);
  const vars = { cancelHours: business.freeCancelHours, loaderFee: formatEgp(content.order.loaderFee) };

  return (
    <HelpCenter
      phoneHref={telHref(content.supportPhone)}
      phoneLabel={phoneLabel(content.supportPhone)}
      whatsapp={waDigits(content.whatsapp)}
      faqs={content.faqs.map((f) => ({ ...f, a: fillFaq(f.a, vars) }))}
    />
  );
}
