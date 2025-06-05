import { initializeTheme } from "@/lib/utils";
import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <Script id="theme-initializer" strategy="beforeInteractive">
          {`
          (function() {
            try {
              const savedTheme = localStorage.getItem('color-theme');
              
              if (savedTheme) {
                document.documentElement.classList.remove('theme-blue', 'theme-green', 'theme-purple');
                document.documentElement.classList.add('theme-' + savedTheme);
              } else {
                document.documentElement.classList.add('theme-blue');
              }

              const darkMode = localStorage.getItem('dark-mode') === 'true';
              if (darkMode) {
                document.documentElement.classList.add('dark');
              }
            } catch (e) {
              console.error('Erro ao inicializar tema:', e);
            }
          })();
          `}
        </Script>
      </head>
      <body>
        <Script id="theme-init">
          {`
          if (typeof window !== 'undefined') {
            try {
              window.addEventListener('DOMContentLoaded', function() {
                if (typeof window.initializeTheme === 'function') {
                  window.initializeTheme();
                }
              });
            } catch (e) {
              console.error('Erro ao configurar inicialização de tema:', e);
            }
          }
          `}
        </Script>
        {children}
      </body>
    </html>
  );
} 