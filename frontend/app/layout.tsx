import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/hooks/use-toast";
import { WorkspaceProvider } from "@/components/providers/WorkspaceProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AutoChain AI — Enterprise Workflow Automation",
  description:
    "Design, generate, and execute AI-powered workflows with enterprise-grade observability",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
            <WorkspaceProvider>{children}</WorkspaceProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
