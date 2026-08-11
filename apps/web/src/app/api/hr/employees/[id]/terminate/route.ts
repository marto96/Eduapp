import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { Employee } from '@eduapp/shared-types';

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const employee = await serverApiFetch<Employee>(`/hr/employees/${params.id}/terminate`, {
    method: 'PATCH',
  });
  if (employee === null) {
    return NextResponse.json({ message: 'No se pudo dar de baja el legajo' }, { status: 400 });
  }
  return NextResponse.json(employee);
}
