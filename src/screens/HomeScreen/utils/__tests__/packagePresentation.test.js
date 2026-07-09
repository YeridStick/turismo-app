jest.mock("../helpers", () => ({
  getPackageGradient: jest.fn(() => ["#000000", "#111111"]),
  getPackageImage: jest.fn(() => null),
}));

import {
  buildPlacesById,
  getPackagePresentation,
  getPackageRoutePlaces,
} from "../packagePresentation";

describe("packagePresentation", () => {
  const places = [
    {
      id: 10,
      name: "Desierto de la Tatacoa",
      categoryName: "Naturaleza",
      imageUrl: "https://example.com/tatacoa.jpg",
    },
    {
      id: 20,
      name: "San Agustin",
      city: "San Agustin",
    },
  ];

  it("builds a stable place lookup by string id", () => {
    const placesById = buildPlacesById(places);

    expect(placesById.get("10")).toBe(places[0]);
    expect(placesById.get("20")).toBe(places[1]);
  });

  it("resolves package route places from ids with the provided lookup", () => {
    const placesById = buildPlacesById(places);
    const routePlaces = getPackageRoutePlaces(
      { placeIds: [10, 20, 30] },
      { placesById },
    );

    expect(routePlaces).toEqual([places[0], places[1], { id: 30 }]);
  });

  it("prepares package display fields shared by card and modal", () => {
    const placesById = buildPlacesById(places);
    const presentation = getPackagePresentation(
      {
        id: "pkg-1",
        title: "Ruta arqueologica",
        city: "Neiva / San Agustin",
        includes: ["Transporte", "", "Guia"],
        siteIds: [10],
        days: 3,
        summary: "Plan de dos noches.",
      },
      {
        placesById,
        getImage: () => "https://example.com/package.jpg",
        getGradient: () => ["#111111", "#222222"],
      },
    );

    expect(presentation.includeList).toEqual(["Transporte", "Guia"]);
    expect(presentation.remainingIncludes).toBe(0);
    expect(presentation.visibleCityTags).toEqual(["Neiva", "San Agustin"]);
    expect(presentation.packageImage).toBe("https://example.com/package.jpg");
    expect(presentation.fallbackGradient).toEqual(["#111111", "#222222"]);
    expect(presentation.description).toBe("Plan de dos noches.");
    expect(presentation.vibeTags[0]).toBe("Ruta extendida");
    expect(presentation.routePlaces[0]).toMatchObject({
      id: 10,
      name: "Desierto de la Tatacoa",
      meta: "Naturaleza",
      detailMeta: "Naturaleza",
      imageUri: "https://example.com/tatacoa.jpg",
    });
  });

  it("keeps separate route meta fallbacks for card and modal", () => {
    const presentation = getPackagePresentation({
      id: "pkg-2",
      title: "Ruta sin sitios",
      placeIds: [99],
    });

    expect(presentation.routePlaces[0]).toMatchObject({
      meta: "Destino",
      detailMeta: "Destino turistico",
    });
  });
});
