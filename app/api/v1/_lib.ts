/**
 * Shared helpers for the mobile API (/api/v1). Mobile clients authenticate with
 * "Authorization: Bearer <token>" (token from POST /api/v1/auth/verify); getSession reads it.
 * All money is integer piastres, all times ISO-8601 UTC.
 */
import { NextResponse } from "next/server";

export const err = (code: string, status = 400) => NextResponse.json({ error: code }, { status });
