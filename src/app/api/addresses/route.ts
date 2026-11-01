import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { addressOwner, companyContext } from "@/services/company-service";

/** Saved addresses of the logged-in customer (shared by the whole company for company members). */
async function owner() {
  const session = await getSession();
  if (!session) return null;
  return addressOwner(session.phone, await companyContext(session.phone));
}

export async function GET() {
  const o = await owner();
  if (!o) return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  return NextResponse.json({ addresses: await repo.listSavedAddresses(o) });
}

const Body = z.object({
  label: z.string().trim().min(1).max(40),
  address: z.string().trim().min(3).max(300),
  details: z.string().trim().max(200).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const o = await owner();
  if (!o) return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  if ((await repo.listSavedAddresses(o)).length >= 50) return NextResponse.json({ error: "TOO_MANY" }, { status: 400 });
  const d = parsed.data;
  const { id } = await repo.addSavedAddress({ owner: o, label: d.label, address: d.address, details: d.details || null, lat: d.lat ?? null, lng: d.lng ?? null });
  return NextResponse.json({ id });
}

export async function DELETE(req: NextRequest) {
  const o = await owner();
  if (!o) return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const ok = await repo.deleteSavedAddress(id, o); // only deletes inside the caller's own list
  return NextResponse.json({ ok });
}
