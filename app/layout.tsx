import React from 'react';

import { Header } from '../components/Header/Header';
import { ThemeProvider } from '../components/ThemeProvider/ThemeProvider';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <div className="app-layout">
        <Header />
        <main className="main-content">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default Layout; 