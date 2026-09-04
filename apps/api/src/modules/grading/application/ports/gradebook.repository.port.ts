export interface GradebookStudentRow {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  documentNumber: string | null;
  sectionId: string;
  sectionName: string;
}

export interface SearchGradebookStudentsFilter {
  academicYearId: string;
  search?: string;
  page: number;
  pageSize: number;
  enrollmentIds?: string[];
}

export interface PaginatedGradebookStudents {
  items: GradebookStudentRow[];
  total: number;
}

export abstract class GradebookRepositoryPort {
  abstract searchStudents(filter: SearchGradebookStudentsFilter): Promise<PaginatedGradebookStudents>;
}
