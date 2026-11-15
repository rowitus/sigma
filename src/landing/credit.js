// Credit for the hero photo (see public/images/CREDITS.txt).
export const PHOTO_CREDIT = {
  photographer: "Federico Respini",
  source: "Unsplash",
  licenceUrl: "https://unsplash.com/license",
};

export function creditLine() {
  return `Photo: ${PHOTO_CREDIT.photographer} on ${PHOTO_CREDIT.source}`;
}
