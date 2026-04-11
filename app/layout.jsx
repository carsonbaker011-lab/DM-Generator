import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata = {
  title: 'Growth Flow AI — AI messages that actually get replies',
  description: 'Generate high-converting cold DMs, emails, and call scripts with AI',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap" rel="stylesheet" />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
