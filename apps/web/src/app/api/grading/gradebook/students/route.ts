import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { GradebookStudentRow, PaginatedResult } from '@eduapp/shared-types';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const students = await serverApiFetch<PaginatedResult<GradebookStudentRow>>(
    `/grading/gradebook/students?${qs}`,
  );
  if (students === null) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json(students);
}
