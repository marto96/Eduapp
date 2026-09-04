import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { unlockModelo2027 } from './actions';

export function PasswordGate({ error }: { error?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-1 text-lg font-semibold">Acceso restringido</h1>
        <p className="mb-5 text-sm text-muted-foreground">Ingresa la contraseña para continuar.</p>
        <form action={unlockModelo2027} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" autoFocus required />
          </div>
          <Button type="submit" className="w-full">
            Entrar
          </Button>
          {error && <p className="text-sm text-destructive">Contraseña incorrecta.</p>}
        </form>
      </Card>
    </main>
  );
}
