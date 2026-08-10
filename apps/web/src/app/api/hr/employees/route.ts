import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Employee } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/hr/employees?${qs}` : '/hr/employees';
  const employees = await serverApiFetch<Employee[]>(path);
  if (employees === null) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const employee = await serverApiFetch<Employee>('/hr/employees', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (employee === null) {
    return NextResponse.json({ message: 'No se pudo crear el legajo' }, { status: 400 });
  }
  return NextResponse.json(employee, { status: 201 });
}
