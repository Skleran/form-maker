'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { loginAdmin } from '@/actions/auth-actions';
import { FormMakerLogo } from '@/components/formmaker-logo';
import { Hint } from '@/components/hint';
import { getSafeRedirectPath } from '@/lib/safe-redirect';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = getSafeRedirectPath(searchParams.get('from'));

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginAdmin({ username, password });
      if (res.success) {
        router.push(from);
        router.refresh();
      } else {
        setError(
          res.error || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.',
        );
      }
    } catch {
      setError('Giriş yapılırken beklenmeyen bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4 py-12 relative">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Branding header */}
        <FormMakerLogo className="size-6 text-foreground" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          Yönetim Paneli
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Formları yönetmek ve yanıtları incelemek için giriş yapın.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 text-sm text-destructive"
              >
                <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="login-username"
                className="block text-sm font-medium text-foreground"
              >
                Kullanıcı Adı
              </label>
              <Input
                id="login-username"
                type="text"
                autoComplete="username"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                spellCheck={false}
                className="h-11 text-base sm:h-10 md:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-foreground"
              >
                Şifre
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-11 text-base sm:h-10 md:text-sm"
                />
                <Hint label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </Hint>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 sm:h-10 font-medium cursor-pointer gap-2 mt-2"
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              <span>{isLoading ? 'Giriş yapılıyor…' : 'Giriş Yap'}</span>
            </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
