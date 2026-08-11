import { CreateSurveyForm } from '@/features/surveys/components/create-survey-form';
import { SurveysList } from '@/features/surveys/components/surveys-list';
import { getCurrentUser } from '@/lib/server-api';
import { canManageSurveys } from '@/lib/permissions';

export default async function SurveysPage() {
  const user = await getCurrentUser();
  const canManage = canManageSurveys(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Encuestas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Encuestas institucionales — respondé una vez, después ves los resultados.
        </p>
      </div>

      {canManage && <CreateSurveyForm />}
      <SurveysList />
    </main>
  );
}
