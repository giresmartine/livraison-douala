"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileField({
  siteKey,
  resetSignal,
  onTokenChange,
  locale,
}: {
  siteKey: string;
  resetSignal: number;
  onTokenChange: (token: string) => void;
  locale: "fr" | "en";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const previousResetSignal = useRef(resetSignal);
  const [widgetError, setWidgetError] = useState(false);

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current) return;

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
    }

    setWidgetError(false);
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => {
        onTokenChange(token);
        setWidgetError(false);
      },
      "expired-callback": () => {
        onTokenChange("");
        setWidgetError(true);
      },
      "error-callback": () => {
        onTokenChange("");
        setWidgetError(true);
      },
    });
  }, [onTokenChange, siteKey]);

  function retryVerification() {
    setWidgetError(false);
    onTokenChange("");
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    } else {
      window.location.reload();
    }
  }

  useEffect(() => {
    if (resetSignal === previousResetSignal.current) return;
    previousResetSignal.current = resetSignal;
    onTokenChange("");
    if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
  }, [onTokenChange, resetSignal]);

  useEffect(
    () => () => {
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
    },
    [],
  );

  return (
    <div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
        onError={() => {
          onTokenChange("");
          setWidgetError(true);
        }}
      />
      <div className="turnstile-widget" ref={containerRef} />
      {widgetError && (
        <div className="turnstile-error" role="status">
          <p className="form-feedback" data-kind="error">
            {locale === "fr"
              ? "La vérification anti-robot a expiré ou est indisponible."
              : "Bot verification expired or is unavailable."}
          </p>
          <button
            className="turnstile-retry"
            onClick={retryVerification}
            type="button"
          >
            {locale === "fr" ? "Réessayer" : "Try again"}
          </button>
        </div>
      )}
    </div>
  );
}
