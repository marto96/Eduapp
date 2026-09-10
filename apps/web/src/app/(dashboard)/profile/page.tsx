import { ProfileForm } from '@/features/profile/components/profile-form';

export default function ProfilePage() {
  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Actualizá tu foto y tus datos básicos.
        </p>
      </div>
      <div className="max-w-xl">
        <ProfileForm />
      </div>
    </main>
  );
}
