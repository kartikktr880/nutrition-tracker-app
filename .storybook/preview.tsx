import React from 'react';
import type { Preview } from "@storybook/react";
import { ThemeProvider } from 'next-themes';
import '../styles/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-background text-foreground">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default preview; 