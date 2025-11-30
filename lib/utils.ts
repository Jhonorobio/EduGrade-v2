// A simplified utility for constructing class names from conditional strings.
// This is a lightweight version of the 'clsx' and 'tailwind-merge' libraries
// commonly used in shadcn-ui projects.
export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return inputs.filter(Boolean).join(' ');
}
