import { useEffect } from "react";
import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router";
import logoSrc from "@/assets/icons/green-black-logo.svg";

function isChunkLoadError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return (
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("Loading chunk")
    );
}

export default function RouteErrorPage() {
    const error = useRouteError();
    const navigate = useNavigate();

    // Auto-reload once when a stale deployment causes chunk fetch failures.
    // The sessionStorage flag prevents an infinite reload loop if the reload
    // doesn't resolve the error.
    useEffect(() => {
        if (isChunkLoadError(error)) {
            const key = "cob_chunk_error_reload";
            if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, "1");
                window.location.reload();
            }
        }
    }, [error]);

    let title = "Something went wrong";
    let message = "An unexpected error occurred. Please try refreshing or go back to the home page.";
    let statusCode: number | null = null;

    if (isChunkLoadError(error)) {
        title = "Update available";
        message = "A new version of the app was deployed. The page will reload automatically — or click Reload below.";
    } else if (isRouteErrorResponse(error)) {
        statusCode = error.status;
        if (error.status === 404) {
            title = "Page not found";
            message = "The page you're looking for doesn't exist or has been moved.";
        } else if (error.status === 403) {
            title = "Access denied";
            message = "You don't have permission to view this page.";
        } else if (error.status === 401) {
            title = "Unauthorized";
            message = "Please log in to access this page.";
        } else {
            message = error.statusText || message;
        }
    } else if (error instanceof Error) {
        message = error.message;
    }

    const isDev = import.meta.env.DEV;
    const errorStack = error instanceof Error ? error.stack : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 flex flex-col items-center justify-center px-4 py-16">
            <div className="w-full max-w-lg">
                {/* Logo */}
                <div className="flex justify-center mb-10">
                    <img src={logoSrc} alt="Care-On-Board" className="h-10 w-auto" />
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                    {/* Icon */}
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                        <svg
                            className="h-8 w-8 text-red-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.75}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                            />
                        </svg>
                    </div>

                    {/* Status code badge */}
                    {statusCode && (
                        <span className="inline-block mb-3 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-500 tracking-wide">
                            Error {statusCode}
                        </span>
                    )}

                    <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">{message}</p>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00B4B8] hover:bg-[#009ea2] text-white text-sm font-medium px-5 py-2.5 transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Reload page
                        </button>
                        <button
                            onClick={() => navigate("/")}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-5 py-2.5 transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                            </svg>
                            Go home
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-5 py-2.5 transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                            Go back
                        </button>
                    </div>

                    {/* Dev-only error details */}
                    {isDev && (errorStack != null || error != null) && (
                        <details className="mt-8 text-left">
                            <summary className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-slate-600 select-none">
                                Developer details
                            </summary>
                            <pre className="mt-3 rounded-lg bg-slate-950 text-emerald-400 text-[11px] p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-56">
                                {errorStack ?? String(error)}
                            </pre>
                        </details>
                    )}
                </div>

                <p className="mt-6 text-center text-xs text-slate-400">
                    If this keeps happening, please contact{" "}
                    <a href="mailto:support@careonboard.com" className="text-[#00B4B8] hover:underline">
                        support
                    </a>
                    .
                </p>
            </div>
        </div>
    );
}