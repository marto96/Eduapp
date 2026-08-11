import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Book } from '@eduapp/shared-types';

export async function GET() {
  const books = await serverApiFetch<Book[]>('/library/books');
  if (books === null) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  return NextResponse.json(books);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const book = await serverApiFetch<Book>('/library/books', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (book === null) {
    return NextResponse.json({ message: 'No se pudo crear el libro' }, { status: 400 });
  }
  return NextResponse.json(book, { status: 201 });
}
