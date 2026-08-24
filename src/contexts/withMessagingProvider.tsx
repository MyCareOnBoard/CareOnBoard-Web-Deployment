import type { ComponentType } from "react";
import { MessagingProvider } from "./MessagingContext";

/** Keeps the full messaging graph inside lazy route chunks that actually use it. */
export function withMessagingProvider<Props extends object>(
  Component: ComponentType<Props>,
) {
  function MessagingScopedComponent(props: Props) {
    return (
      <MessagingProvider>
        <Component {...props} />
      </MessagingProvider>
    );
  }

  MessagingScopedComponent.displayName =
    `withMessagingProvider(${Component.displayName || Component.name || "Component"})`;
  return MessagingScopedComponent;
}
