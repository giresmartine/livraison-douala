"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { DeliveryAddressFields } from "@/components/delivery-address-fields";
import { Icon } from "@/components/ui/icon";
import {
  doualaCoverage,
  isClearlyFarFromDouala,
  isWithinDoualaCoverage,
  validateDeliveryAddress,
} from "@/lib/config/coverage";
import type { Coordinates } from "@/lib/config/coverage";

const savedAddressDraftSchema = z.object({
  neighborhood: z.string().optional(),
  landmark: z.string().optional(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
});

function parseSavedAddressDraft(value: string) {
  try {
    const parsed = savedAddressDraftSchema.safeParse(JSON.parse(value));
    if (parsed.success) return parsed.data;
  } catch {
    return { neighborhood: value };
  }

  return { neighborhood: value };
}

type Feedback = {
  kind: "success" | "error";
  message: string;
};

export function AddressEntry() {
  const t = useTranslations("home");
  const locale = useLocale();
  const router = useRouter();
  const [neighborhood, setNeighborhood] = useState("");
  const [landmark, setLandmark] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates>();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    let frameId: number | undefined;

    try {
      const draft = sessionStorage.getItem("delivery-address-draft");
      if (draft) {
        const parsed = parseSavedAddressDraft(draft);
        frameId = window.requestAnimationFrame(() => {
          setNeighborhood(parsed.neighborhood ?? "");
          setLandmark(parsed.landmark ?? "");
          setCoordinates(parsed.coordinates);
        });
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
    const draft = {
      city: doualaCoverage.city,
      neighborhood: neighborhood.trim(),
      landmark: landmark.trim(),
      coordinates,
    };
    const validation = validateDeliveryAddress(draft);

    if (!validation.accepted) {
      setFeedback({ kind: "error", message: t("addressRequired") });
      return;
    }

    try {
      sessionStorage.setItem("delivery-address-draft", JSON.stringify(draft));
      if (coordinates) {
        sessionStorage.setItem("delivery-address-location", JSON.stringify(coordinates));
      } else {
        sessionStorage.removeItem("delivery-address-location");
      }
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
        const currentCoordinates = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        if (!isWithinDoualaCoverage(currentCoordinates)) {
          setCoordinates(undefined);
          setIsLocating(false);
          if (isClearlyFarFromDouala(currentCoordinates)) {
            router.push(`/${locale}/zone-indisponible`);
          } else {
            setFeedback({ kind: "error", message: t("locationOutsideCoverage") });
          }
          return;
        }

        const latitude = coords.latitude.toFixed(5);
        const longitude = coords.longitude.toFixed(5);
        setCoordinates(currentCoordinates);
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
      <div className="address-field">
        <label className="field-label" htmlFor="delivery-city">
          {t("cityLabel")}
        </label>
        <input
          className="address-input"
          id="delivery-city"
          readOnly
          value={doualaCoverage.city}
        />
      </div>
      <DeliveryAddressFields
        landmark={landmark}
        neighborhood={neighborhood}
        onLandmarkChange={(value) => {
          setLandmark(value);
          setFeedback(null);
        }}
        onNeighborhoodChange={(value) => {
          setNeighborhood(value);
          setFeedback(null);
        }}
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
