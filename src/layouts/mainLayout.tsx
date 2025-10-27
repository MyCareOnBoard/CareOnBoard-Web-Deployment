import { Outlet } from "react-router";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-semibold text-destructive">
          Something went wrong
        </h1>
        <p className="mb-6 text-muted-foreground">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<LoadingFallback />}>
          <main className="container mx-auto px-4 py-6 md:px-6 lg:px-8">
            <Outlet />
          </main>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}