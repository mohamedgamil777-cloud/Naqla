import { listCategories } from "@/db/lib/categories";
import { getAppContent } from "@/db/lib/settings";
import { HomeView } from "@/components/HomeView";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [cats, content] = await Promise.all([listCategories(), getAppContent()]);
  const sizes = cats.filter((c) => c.sizeCode && c.active).sort((a, b) => a.sort - b.sort);
  return <HomeView sizes={sizes} content={content} />;
}
