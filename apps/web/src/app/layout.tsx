'use client';

import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import { ChatWidget } from '@/components/chatbot/ChatWidget';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Finfinity BRE — Financial Intelligence Platform</title>
        <meta
          name="description"
          content="Finfinity BRE — AI-powered loan optimization and financial strategy platform for Indian borrowers."
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-black text-text antialiased">
        <QueryClientProvider client={queryClient}>
          {children}
          <ChatWidget />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#132723',
                color: '#e8f5f1',
                border: '1px solid #1e3d34',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: {
                iconTheme: {
                  primary: '#25F0C0',
                  secondary: '#132723',
                },
              },
              error: {
                iconTheme: {
                  primary: '#f87171',
                  secondary: '#132723',
                },
              },
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  );
}
