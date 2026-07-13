import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST() {
  const cookieStore = await cookies();
  
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');

  return NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
