export const isScreenGalleryEnabled =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_SHOW_SCREEN_GALLERY === "true";
