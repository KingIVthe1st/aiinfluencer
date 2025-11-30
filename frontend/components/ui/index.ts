/**
 * UI Component Primitives
 *
 * Barrel export file for all base UI components.
 * Import components from this file for cleaner imports:
 *
 * import { Button, Card, Input, Heading, Text } from '@/components/ui'
 */

// Button Components
export { Button, buttonVariants } from './Button';
export type { ButtonProps } from './Button';

// Card Components
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
} from './Card';
export type { CardProps } from './Card';

// Input Components
export {
  Input,
  Textarea,
  Label,
  HelperText,
  inputVariants,
  textareaVariants,
} from './Input';
export type { InputProps, TextareaProps } from './Input';

// Typography Components
export {
  Heading,
  Text,
  Display,
  GradientText,
  Code,
  Blockquote,
  List,
  ListItem,
  Link,
  headingVariants,
  textVariants,
  displayVariants,
  codeVariants,
  linkVariants,
} from './Typography';
export type { HeadingProps, TextProps, DisplayProps, CodeProps, LinkProps } from './Typography';

// Motion Components
export {
  MotionProvider,
  useReducedMotion,
  FadeIn,
  SlideIn,
  ScaleIn,
  Stagger,
  Reveal,
  PulseGlow,
  GradientShift,
  Spin,
} from './Motion';
