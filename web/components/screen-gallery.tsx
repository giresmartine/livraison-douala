"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale, ScreenGroup } from "@/lib/screens";
import { screenGroups, screenHref, screens } from "@/lib/screens";
import { brand } from "@/lib/config/brand";

const groupOrder: ScreenGroup[] = ["client", "partner", "courier", "operations"];

export function ScreenGallery({ locale }: { locale: Locale }) {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<ScreenGroup | "all">("all");
  const copy =
    locale === "fr"
      ? {
          eyebrow: "Plan du produit",
          title: "Parcours disponibles",
          count: (count: number) => `${count} parcours`,
          search: "Rechercher un écran, un rôle ou une fonctionnalité",
          all: "Tous",
          preview: "Ouvrir",
          back: "Retour à l’accueil",
        }
      : {
          eyebrow: "Product map",
          title: "Available journeys",
          count: (count: number) => `${count} journeys`,
          search: "Search screens, roles or features",
          all: "All",
          preview: "Open",
          back: "Back to home",
        };

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = screens.filter((screen) => {
    const matchesGroup = activeGroup === "all" || screen.group === activeGroup;
    const matchesQuery =
      !normalizedQuery ||
      [
        screen.id,
        screen.title[locale],
        screen.description[locale],
        screen.role[locale],
        ...screen.sections.map((section) => section[locale]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

    return matchesGroup && matchesQuery;
  });

  return (
    <main className="screen-gallery">
      <header className="gallery-header">
        <Link className="gallery-brand" href={`/${locale}`}>
          <span className="brand-symbol" aria-hidden="true">{brand.logoText}</span>
          <span>{brand.name}</span>
        </Link>
        <Link className="text-link" href={`/${locale}`}>
          {copy.back}
        </Link>
      </header>

      <div className="gallery-intro">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.count(screens.length)}</p>
      </div>

      <label className="gallery-search-label" htmlFor="screen-search">
        {copy.search}
      </label>
      <input
        className="gallery-search"
        id="screen-search"
        onChange={(event) => setQuery(event.target.value)}
        type="search"
        value={query}
      />

      <div className="gallery-filters" aria-label={copy.eyebrow}>
        <button
          aria-pressed={activeGroup === "all"}
          className="filter-chip"
          onClick={() => setActiveGroup("all")}
          type="button"
        >
          {copy.all} <span>{screens.length}</span>
        </button>
        {groupOrder.map((group) => {
          const count = screens.filter((screen) => screen.group === group).length;
          return (
            <button
              aria-pressed={activeGroup === group}
              className="filter-chip"
              key={group}
              onClick={() => setActiveGroup(group)}
              type="button"
            >
              {screenGroups[group][locale]} <span>{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-panel">
          {locale === "fr" ? "Aucun écran ne correspond." : "No screens match."}
        </p>
      ) : (
        <div className="gallery-groups">
          {groupOrder.map((group) => {
            const groupScreens = filtered.filter((screen) => screen.group === group);
            if (groupScreens.length === 0) return null;

            return (
              <section className="gallery-group" key={group}>
                <div className="gallery-group-heading">
                  <h2>{screenGroups[group][locale]}</h2>
                  <span>{groupScreens.length}</span>
                </div>
                <div className="screen-card-grid">
                  {groupScreens.map((screen) => (
                    <Link
                      className="screen-card"
                      href={screenHref(locale, screen.href)}
                      key={screen.id}
                    >
                      <span className="screen-card-top">
                        <span className={`screen-id group-${screen.group}`}>
                          {screen.id}
                        </span>
                        <span className="preview-label">{copy.preview}</span>
                      </span>
                      <strong>{screen.title[locale]}</strong>
                      <span className="screen-card-description">
                        {screen.description[locale]}
                      </span>
                      <span className="screen-card-bottom">
                        {screen.role[locale]}
                        <span aria-hidden="true">→</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
