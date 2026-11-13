import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addSavedAddress, deleteSavedAddress, listSavedAddresses } from "@/db/lib/addresses";
import { getSession } from "@/services/session";
import { addressOwner, canEditAddresses, companyContext } from "@/services/company-service";
import { withErrorHandling } from "@/lib/route";

/** Saved addresses of the logged-in customer (shared by the whole company for company members). */
async function owner() {
  const session = await getSession();
  if (!session) return null;
  const ctx = await companyContext(session.phone);
  return { list: addressOwner(session.phone, ctx), canEdit: canEditAddresses(ctx) };
}

export const GET = withErrorHandling("GET /api/addresses", async function GET() {
  const o = await owner();
  if (!o) return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  return NextResponse.json({ addresses: await listSavedAddresses(o.list), canEdit: o.canEdit });
});

const Body = z.object({
  label: z.string().trim().min(1).max(40),
  address: z.string().trim().min(3).max(300),
  details: z.string().trim().max(300).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
});

export const POST = withErrorHandling("POST /api/addresses", async function POST(req: NextRequest) {
  const o = await owner();
  if (!o) return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  if (!o.canEdit) return NextResponse.json({ error: "COMPANY_ADMIN_ONLY" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  if ((await listSavedAddresses(o.list)).length >= 50)
    return NextResponse.json({ error: "TOO_MANY" }, { status: 400 });
  const d = parsed.data;
  const { id } = await addSavedAddress({
    owner: o.list,
    label: d.label,
    address: d.address,
    details: d.details || null,
    lat: d.lat ?? null,
    lng: d.lng ?? null,
  });
  return NextResponse.json({ id });
});

export const DELETE = withErrorHandling("DELETE /api/addresses", async function DELETE(req: NextRequest) {
  const o = await owner();
  if (!o) return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  if (!o.canEdit) return NextResponse.json({ error: "COMPANY_ADMIN_ONLY" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const ok = await deleteSavedAddress(id, o.list); // only deletes inside the caller's own list
  return NextResponse.json({ ok });
});
