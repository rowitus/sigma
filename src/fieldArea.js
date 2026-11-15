// Builds the "estimated field area": a square of `sizeKm` centered on a point.
// We don't have real parcel boundaries, so this is clearly labeled as an estimate.
export function fieldAreaGeoJSON(lat, lon, sizeKm = 1) {
  const half = sizeKm / 2;
  const dLat = half / 111.32; // km per degree of latitude
  const dLon = half / (111.32 * Math.cos((lat * Math.PI) / 180));
  const ring = [
    [lon - dLon, lat - dLat],
    [lon + dLon, lat - dLat],
    [lon + dLon, lat + dLat],
    [lon - dLon, lat + dLat],
    [lon - dLon, lat - dLat],
  ];
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { label: "Estimated field area (1 km box)" },
        geometry: { type: "Polygon", coordinates: [ring] },
      },
    ],
  };
}
