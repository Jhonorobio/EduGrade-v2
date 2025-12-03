import React from 'react';

/**
 * This RootLayout component is an adaptation for the current Vite/React environment.
 * It mimics the structure of a Next.js layout file by providing a root wrapper
 * for its children. Next.js-specific features like metadata, font optimization,
 * and Vercel Analytics have been omitted as they are handled differently in this setup.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // The <html>, <body>, and global font styles are managed by index.html.
  // This component provides a structural container.
  return (
    <div className="h-full">
      {children}
    </div>
  );
}
