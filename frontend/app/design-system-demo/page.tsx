'use client';

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Textarea,
  Label,
  HelperText,
  Heading,
  Text,
  Display,
  GradientText,
  Code,
  List,
  ListItem,
  Link,
  FadeIn,
  SlideIn,
  ScaleIn,
  Stagger,
  Reveal,
  PulseGlow,
  GradientShift,
  Spin,
  MotionProvider,
} from '@/components/ui';

export default function DesignSystemDemo() {
  return (
    <MotionProvider>
      <div className="min-h-screen bg-background">
        {/* Hero Section with Gradient Mesh */}
        <section className="relative overflow-hidden py-24">
          <GradientShift className="absolute inset-0 opacity-60" />

          <div className="container mx-auto px-6 relative z-10">
            <FadeIn>
              <Display gradient animate className="mb-6">
                AI Singer Studio
              </Display>
              <Text size="xl" variant="muted" className="max-w-2xl">
                Premium design system for multi-million dollar quality web applications
              </Text>
            </FadeIn>
          </div>
        </section>

        {/* Typography Showcase */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-6">
            <Reveal>
              <Heading as="h2" className="mb-8">
                Typography System
              </Heading>
            </Reveal>

            <Stagger staggerDelay={100} className="space-y-6">
              <div>
                <Heading as="h1">Heading 1 - Display Font</Heading>
                <Text variant="muted">Font size: 6xl (clamp responsive)</Text>
              </div>
              <div>
                <Heading as="h2">Heading 2 - Section Headers</Heading>
                <Text variant="muted">Font size: 5xl</Text>
              </div>
              <div>
                <Heading as="h3">Heading 3 - Subsections</Heading>
                <Text variant="muted">Font size: 4xl</Text>
              </div>
              <div>
                <Text size="lg">
                  Body text large - Perfect for introductory paragraphs and important content
                </Text>
              </div>
              <div>
                <Text>
                  Body text base - The default size for most content. Optimized for readability
                  with fluid scaling using CSS clamp() function.
                </Text>
              </div>
              <div>
                <Text size="sm" variant="muted">
                  Small text - Used for captions, metadata, and supplementary information
                </Text>
              </div>
              <div>
                <GradientText>
                  Gradient text effect - Eye-catching text with animated gradient background
                </GradientText>
              </div>
              <div>
                <Code>const code = 'inline code block';</Code>
              </div>
            </Stagger>
          </div>
        </section>

        {/* Button Variants */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <Heading as="h2" className="mb-8">
              Button Components
            </Heading>

            <div className="space-y-8">
              <Reveal>
                <div>
                  <Text className="mb-4" weight="medium">
                    Primary Actions
                  </Text>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="primary" size="sm">
                      Small Primary
                    </Button>
                    <Button variant="primary">Medium Primary</Button>
                    <Button variant="primary" size="lg">
                      Large Primary
                    </Button>
                    <Button variant="primary" size="xl">
                      Extra Large Primary
                    </Button>
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <div>
                  <Text className="mb-4" weight="medium">
                    Button Variants
                  </Text>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="link">Link Button</Button>
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <div>
                  <Text className="mb-4" weight="medium">
                    Button States
                  </Text>
                  <div className="flex flex-wrap gap-4">
                    <Button>Normal State</Button>
                    <Button loading>Loading State</Button>
                    <Button disabled>Disabled State</Button>
                    <Button fullWidth>Full Width Button</Button>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Card Variants */}
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-6">
            <Heading as="h2" className="mb-8">
              Card Components
            </Heading>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ScaleIn delay={0}>
                <Card variant="default">
                  <CardHeader>
                    <CardTitle>Default Card</CardTitle>
                    <CardDescription>
                      Standard card with border and subtle shadow
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Text>
                      This is the default card variant with clean, minimal styling.
                    </Text>
                  </CardContent>
                </Card>
              </ScaleIn>

              <ScaleIn delay={100}>
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Glass Card</CardTitle>
                    <CardDescription>Glassmorphism effect with backdrop blur</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Text>
                      Modern glass effect with semi-transparent background and blur.
                    </Text>
                  </CardContent>
                </Card>
              </ScaleIn>

              <ScaleIn delay={200}>
                <Card variant="feature">
                  <CardHeader>
                    <CardTitle>Feature Card</CardTitle>
                    <CardDescription>Premium glass card for feature highlights</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Text>Enhanced glass effect perfect for showcasing key features.</Text>
                  </CardContent>
                </Card>
              </ScaleIn>

              <ScaleIn delay={300}>
                <Card variant="interactive">
                  <CardHeader>
                    <CardTitle>Interactive Card</CardTitle>
                    <CardDescription>Hover to see scale and shadow effects</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Text>This card responds to hover with scale and shadow changes.</Text>
                  </CardContent>
                </Card>
              </ScaleIn>

              <ScaleIn delay={400}>
                <Card variant="premium">
                  <CardHeader>
                    <CardTitle>
                      <GradientText>Premium Card</GradientText>
                    </CardTitle>
                    <CardDescription>Glass effect with gradient border glow</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Text>
                      Premium variant with gradient border and hover glow effect.
                    </Text>
                  </CardContent>
                </Card>
              </ScaleIn>

              <ScaleIn delay={500}>
                <PulseGlow color="primary">
                  <Card variant="feature">
                    <CardHeader>
                      <CardTitle>Pulse Glow Card</CardTitle>
                      <CardDescription>Card with animated glow effect</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Text>Perfect for highlighting important content or features.</Text>
                    </CardContent>
                  </Card>
                </PulseGlow>
              </ScaleIn>
            </div>
          </div>
        </section>

        {/* Form Components */}
        <section className="py-16">
          <div className="container mx-auto px-6 max-w-2xl">
            <Heading as="h2" className="mb-8">
              Form Components
            </Heading>

            <Stagger staggerDelay={100} className="space-y-6">
              <div>
                <Label required>Full Name</Label>
                <Input placeholder="Enter your full name" />
                <HelperText>This field is required</HelperText>
              </div>

              <div>
                <Label>Email Address</Label>
                <Input type="email" placeholder="you@example.com" success />
                <HelperText success>Email format is correct</HelperText>
              </div>

              <div>
                <Label>Password</Label>
                <Input type="password" placeholder="Enter password" error />
                <HelperText error>Password must be at least 8 characters</HelperText>
              </div>

              <div>
                <Label>Message</Label>
                <Textarea placeholder="Enter your message here..." />
                <HelperText>Maximum 500 characters</HelperText>
              </div>

              <div>
                <Label>Input Sizes</Label>
                <div className="space-y-3">
                  <Input inputSize="sm" placeholder="Small input" />
                  <Input inputSize="md" placeholder="Medium input (default)" />
                  <Input inputSize="lg" placeholder="Large input" />
                </div>
              </div>
            </Stagger>
          </div>
        </section>

        {/* Animation Showcase */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-6">
            <Heading as="h2" className="mb-8">
              Animation System
            </Heading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <Text className="mb-4" weight="medium">
                  Fade In Animation
                </Text>
                <FadeIn>
                  <Card>
                    <CardContent className="p-6">
                      <Text>Content fades in smoothly</Text>
                    </CardContent>
                  </Card>
                </FadeIn>
              </div>

              <div>
                <Text className="mb-4" weight="medium">
                  Slide In From Bottom
                </Text>
                <SlideIn direction="bottom">
                  <Card>
                    <CardContent className="p-6">
                      <Text>Content slides up from bottom</Text>
                    </CardContent>
                  </Card>
                </SlideIn>
              </div>

              <div>
                <Text className="mb-4" weight="medium">
                  Slide In From Left
                </Text>
                <SlideIn direction="left">
                  <Card>
                    <CardContent className="p-6">
                      <Text>Content slides in from left</Text>
                    </CardContent>
                  </Card>
                </SlideIn>
              </div>

              <div>
                <Text className="mb-4" weight="medium">
                  Scale In Animation
                </Text>
                <ScaleIn>
                  <Card>
                    <CardContent className="p-6">
                      <Text>Content scales up with spring easing</Text>
                    </CardContent>
                  </Card>
                </ScaleIn>
              </div>
            </div>

            <div className="mt-12">
              <Text className="mb-4" weight="medium">
                Staggered Animation (Sequential Children)
              </Text>
              <Stagger staggerDelay={150} animation="slide" direction="bottom">
                <Card className="mb-3">
                  <CardContent className="p-4">
                    <Text>First item - Animates immediately</Text>
                  </CardContent>
                </Card>
                <Card className="mb-3">
                  <CardContent className="p-4">
                    <Text>Second item - 150ms delay</Text>
                  </CardContent>
                </Card>
                <Card className="mb-3">
                  <CardContent className="p-4">
                    <Text>Third item - 300ms delay</Text>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Text>Fourth item - 450ms delay</Text>
                  </CardContent>
                </Card>
              </Stagger>
            </div>

            <div className="mt-12">
              <Text className="mb-4" weight="medium">
                Loading States
              </Text>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <Spin size="sm" />
                  <Text size="sm" className="mt-2">
                    Small
                  </Text>
                </div>
                <div className="text-center">
                  <Spin size="md" />
                  <Text size="sm" className="mt-2">
                    Medium
                  </Text>
                </div>
                <div className="text-center">
                  <Spin size="lg" />
                  <Text size="sm" className="mt-2">
                    Large
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Color System */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <Heading as="h2" className="mb-8">
              Color System
            </Heading>

            <div className="space-y-8">
              <div>
                <Text className="mb-4" weight="medium">
                  Semantic Colors
                </Text>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="h-24 rounded-lg bg-primary mb-2" />
                    <Text size="sm">Primary</Text>
                  </div>
                  <div className="text-center">
                    <div className="h-24 rounded-lg bg-accent mb-2" />
                    <Text size="sm">Accent</Text>
                  </div>
                  <div className="text-center">
                    <div className="h-24 rounded-lg bg-muted mb-2 border border-border" />
                    <Text size="sm">Muted</Text>
                  </div>
                  <div className="text-center">
                    <div className="h-24 rounded-lg bg-card border border-border mb-2" />
                    <Text size="sm">Card</Text>
                  </div>
                </div>
              </div>

              <div>
                <Text className="mb-4" weight="medium">
                  Status Colors
                </Text>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="h-24 rounded-lg bg-success-500 mb-2" />
                    <Text size="sm">Success</Text>
                  </div>
                  <div className="text-center">
                    <div className="h-24 rounded-lg bg-warning-500 mb-2" />
                    <Text size="sm">Warning</Text>
                  </div>
                  <div className="text-center">
                    <div className="h-24 rounded-lg bg-error-500 mb-2" />
                    <Text size="sm">Error</Text>
                  </div>
                </div>
              </div>

              <div>
                <Text className="mb-4" weight="medium">
                  Gradients
                </Text>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-32 rounded-lg bg-gradient-primary" />
                  <div className="h-32 rounded-lg bg-gradient-accent" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lists and Links */}
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-6 max-w-2xl">
            <Heading as="h2" className="mb-8">
              Lists & Links
            </Heading>

            <div className="space-y-8">
              <div>
                <Text className="mb-4" weight="medium">
                  Unordered List
                </Text>
                <List>
                  <ListItem>Design system foundation complete</ListItem>
                  <ListItem>Component primitives implemented</ListItem>
                  <ListItem>Typography system with fluid scaling</ListItem>
                  <ListItem>Motion primitives and animations</ListItem>
                </List>
              </div>

              <div>
                <Text className="mb-4" weight="medium">
                  Ordered List
                </Text>
                <List ordered>
                  <ListItem>Install dependencies</ListItem>
                  <ListItem>Configure design tokens</ListItem>
                  <ListItem>Build component library</ListItem>
                  <ListItem>Test and iterate</ListItem>
                </List>
              </div>

              <div>
                <Text className="mb-4" weight="medium">
                  Link Variants
                </Text>
                <div className="space-y-2">
                  <div>
                    <Link href="#" variant="default">
                      Default link style
                    </Link>
                  </div>
                  <div>
                    <Link href="#" variant="muted">
                      Muted link style
                    </Link>
                  </div>
                  <div>
                    <Link href="#" variant="subtle">
                      Subtle link style
                    </Link>
                  </div>
                  <div>
                    <Link href="https://example.com" external>
                      External link (opens in new tab)
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 bg-card border-t border-border">
          <div className="container mx-auto px-6 text-center">
            <Text variant="muted">
              AI Singer Studio Design System v1.0.0 - Built with precision and care for
              multi-million dollar quality
            </Text>
          </div>
        </footer>
      </div>
    </MotionProvider>
  );
}
