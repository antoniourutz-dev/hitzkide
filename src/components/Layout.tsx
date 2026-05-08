import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Layout({ children, header, footer }: LayoutProps) {
  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans">
      <a href="#main-content" className="skip-link">
        Eduki nagusira joan
      </a>
      <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto bg-white md:shadow-xl md:my-4 lg:my-8 md:rounded-3xl border border-slate-200/50 overflow-hidden relative transition-all duration-300">
        {header && (
          <header className="fixed top-0 left-0 right-0 h-[60px] flex justify-between items-center border-b border-slate-100/50 bg-white/90 backdrop-blur-md z-30 pt-[env(safe-area-inset-top)] px-4">
            {header}
          </header>
        )}

        <main
          id="main-content"
          className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden pt-[calc(60px+env(safe-area-inset-top))] pb-[calc(76px+env(safe-area-inset-bottom))] md:pt-0 md:pb-0"
          role="main"
          tabIndex={-1}
        >
          <div className="mx-auto w-full max-w-2xl h-full flex flex-col p-4 md:p-8">
            {children}
          </div>
        </main>

        {footer && (
          <nav
            className="fixed bottom-0 left-0 right-0 flex md:hidden bg-white border-t border-slate-100 items-center justify-around px-2 py-3 shrink-0 z-30 pb-[env(safe-area-inset-bottom)]"
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
