'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api-client';
import {
  MotionProvider,
  Card,
  CardContent,
  Input,
  Button,
  Heading,
  Text,
  Label,
  HelperText,
  GradientText,
  Link,
  FadeIn,
  ScaleIn,
  Spin,
  GradientShift,
} from '@/components/ui';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirect = searchParams?.get('redirect') || '/dashboard/singers';

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Store token
      localStorage.setItem('token', token);

      // Verify token works
      const data = await authAPI.me() as any;

      if (data.authenticated) {
        // Redirect to dashboard or specified page
        router.push(redirect);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err) {
      console.error('[Sign In] Error:', err);
      setError('Invalid token. Please check and try again.');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }

  // Auto-fill with test token for development
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  return (
    <MotionProvider>
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
        {/* Animated gradient background */}
        <GradientShift className="absolute inset-0 opacity-30" />

        <div className="max-w-md w-full relative z-10">
          <FadeIn>
            <Card variant="glass">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <Heading as="h1" className="mb-2">
                    <GradientText>AI Influencer Studio</GradientText>
                  </Heading>
                  <Text variant="muted">Sign in to continue</Text>
                </div>

          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <Label required>Access Token</Label>
              <Input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="test-token-demo-user"
                required
              />
              <HelperText>
                For demo, use: test-token-demo-user
              </HelperText>
            </div>

            {error && (
              <ScaleIn>
                <Card variant="default" className="border-error-200 bg-error-50">
                  <CardContent className="p-4">
                    <Text className="text-error-700">{error}</Text>
                  </CardContent>
                </Card>
              </ScaleIn>
            )}

            <ScaleIn delay={100}>
              <Button
                type="submit"
                disabled={loading || !token}
                loading={loading}
                variant="primary"
                size="lg"
                fullWidth
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </ScaleIn>
          </form>

          <div className="mt-6 text-center">
            <Text size="sm" variant="muted">
              Don't have an account?{' '}
              <Link href="/sign-up" variant="default">
                Sign up
              </Link>
            </Text>
          </div>

          {/* Development Helper */}
          <div className="mt-8 pt-6 border-t border-border">
            <HelperText className="mb-3">Quick Test Access:</HelperText>
            <Button
              type="button"
              onClick={() => setToken('7d6c9c2e47f8e06d83c5d745187e9c8c8c85b131764f05abab786fb4bde3295c')}
              variant="ghost"
              size="sm"
              fullWidth
            >
              Use Production Token
            </Button>
          </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </MotionProvider>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <GradientShift className="absolute inset-0 opacity-30" />
        <div className="relative z-10">
          <Spin size="lg" className="text-primary" />
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
