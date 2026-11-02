import type { Metadata } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'LearnFlow — Learn, practice, grow',
    template: '%s · LearnFlow',
  },
  description:
    'LearnFlow is a full-stack learning and assessment platform with courses, timed examinations, automatic grading and real performance analytics.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
