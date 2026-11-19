"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";

type Feedback = {
  kind: "success" | "error";
  message: string;
};

export function AddressEntry() {
  const t = useTranslations("home");
  const locale = useLocale();
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    let frameId: number | undefined;

    try {
      const draft = sessionStorage.getItem("delivery-address-draft");
      if (draft) {
        frameId = window.requestAnimationFrame(() => setAddress(draft));
      }
    } catch {
      frameId = window.requestAnimationFrame(() => {
        setFeedback({ kind: "error", message: t("storageError") });
      });
    }

    return () => {
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
    };
  }, [t]);

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = address.trim();

    if (!value) {
      setFeedback({ kind: "error", message: t("addressRequired") });
      return;
    }

    try {
      sessionStorage.setItem("delivery-address-draft", value);
    } catch {
      setFeedback({ kind: "error", message: t("storageError") });
      return;
    }

    router.push(`/${locale}/accueil`);
  }

  function locateUser() {
    if (!navigator.geolocation) {
      setFeedback({ kind: "error", message: t("locationUnavailable") });
      return;
    }

    setIsLocating(true);
    setFeedback(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = coords.latitude.toFixed(5);
        const longitude = coords.longitude.toFixed(5);
        setAddress(`${latitude}, ${longitude}`);
        setFeedback({
          kind: "success",
          message: t("coordinatesReceived", { latitude, longitude }),
        });
        setIsLocating(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? t("locationDenied")
            : error.code === error.TIMEOUT
              ? t("locationTimedOut")
              : t("locationUnavailable");

        setFeedback({ kind: "error", message });
        setIsLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  }

  return (
    <form className="address-form" onSubmit={saveDraft}>
      <label className="field-label" htmlFor="delivery-address">
        {t("addressLabel")}
      </label>
      <input
        autoComplete="street-address"
        className="address-input"
        id="delivery-address"
        maxLength={180}
        onChange={(event) => {
          setAddress(event.target.value);
          setFeedback(null);
        }}
        placeholder={t("addressPlaceholder")}
        value={address}
      />
      <button
        className="location-button"
        disabled={isLocating}
        onClick={locateUser}
        type="button"
      >
        <Icon name="crosshair" />
        {isLocating ? t("locating") : t("useLocation")}
      </button>
      <button className="continue-button" type="submit">
        {t("continue")}
        <Icon name="arrowRight" />
      </button>
      {feedback && (
        <p className="form-feedback" data-kind={feedback.kind} role="status">
          {feedback.message}
        </p>
      )}
    </form>
  );
}
