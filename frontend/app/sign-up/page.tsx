'use client';

import {
  MotionProvider,
  Card,
  CardContent,
  Button,
  Heading,
  Text,
  GradientText,
  FadeIn,
  ScaleIn,
  GradientShift,
} from '@/components/ui';

export default function SignUpPage() {
  return (
    <MotionProvider>
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
        {/* Animated gradient background */}
        <GradientShift className="absolute inset-0 opacity-30" />

        <div className="max-w-md w-full relative z-10">
          <FadeIn>
            <Card variant="glass">
              <CardContent className="p-8 text-center">
                <Heading as="h1" className="mb-4">
                  <GradientText>AI Singer Studio</GradientText>
                </Heading>
                <Text className="mb-6">
                  Sign up functionality coming soon!
                </Text>
                <Text size="sm" variant="muted" className="mb-6">
                  For now, please use the test access token on the sign-in page.
                </Text>
                <ScaleIn delay={100}>
                  <Button
                    onClick={() => window.location.href = '/sign-in'}
                    variant="primary"
                    size="lg"
                  >
                    Go to Sign In
                  </Button>
                </ScaleIn>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </MotionProvider>
  );
}
