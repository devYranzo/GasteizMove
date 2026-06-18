const fs = require("fs");

const geojson = JSON.parse(fs.readFileSync("./streets.geojson", "utf8"));

const streetsMap = new Map();

for (const feature of geojson.features) {
  const props = feature.properties;

  const nameEs = props["name:es"] || props["name"] || "";
  const nameEu = props["name:eu"] || props["name"] || "";

  if (!nameEs && !nameEu) continue;

  const [longitude, latitude] = feature.geometry.coordinates;

  const key = `${nameEs}|${nameEu}`;

  if (!streetsMap.has(key)) {
    streetsMap.set(key, {
      nameEs,
      nameEu,
      latitudeSum: latitude,
      longitudeSum: longitude,
      count: 1,
    });

    continue;
  }

  const street = streetsMap.get(key);

  street.latitudeSum += latitude;
  street.longitudeSum += longitude;
  street.count += 1;
}

const streets = Array.from(streetsMap.values())
  .map((street) => ({
    nameEs: street.nameEs,
    nameEu: street.nameEu,
    latitude: street.latitudeSum / street.count,
    longitude: street.longitudeSum / street.count,
  }))
  .sort((a, b) => a.nameEs.localeCompare(b.nameEs));

fs.writeFileSync("./streets.json", JSON.stringify(streets, null, 2), "utf8");

console.log(`Generadas ${streets.length} calles`);
