import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Layout({ children, header, footer }: LayoutProps) {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans antialiased">
      <a href="#main-content" className="skip-link">
        Eduki nagusira joan
      </a>
      <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto bg-brand-bg relative">
        {header && (
          <header className="sticky top-0 z-40 bg-brand-bg border-b-[3px] border-brand-border pt-[env(safe-area-inset-top)]">
            <div className="h-[60px] flex justify-between items-center px-4">
            {header}
            </div>
          </header>
        )}

        <main
          id="main-content"
          className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0"
          role="main"
          tabIndex={-1}
        >
          <div className="mx-auto w-full max-w-4xl h-full flex flex-col p-4 md:p-8">
            {children}
          </div>
        </main>

        {footer && (
          <nav
            className="fixed bottom-0 left-0 right-0 flex md:hidden bg-white border-t-[3px] border-brand-border items-center justify-around px-2 py-3 shrink-0 z-40 pb-[env(safe-area-inset-bottom)]"
            role="navigation"
            aria-label="Nabigazio nagusia"
          >
            <div className="w-full max-w-md mx-auto flex justify-around">
              {footer}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
