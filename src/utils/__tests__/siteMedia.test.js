import {
  MAX_SITE_IMAGE_SIZE_BYTES,
  toLocalSiteImage,
  validateSiteImage,
} from "../siteMedia";

describe("siteMedia", () => {
  it("normalizes an Expo asset as local-only media", () => {
    expect(toLocalSiteImage({ uri: "file:///photo.png", mimeType: "image/png" }, 0, 1)).toMatchObject({
      uri: "file:///photo.png",
      mimeType: "image/png",
      status: "local",
    });
  });

  it("validates type and size before upload", () => {
    expect(validateSiteImage({ uri: "file:///a.gif", mimeType: "image/gif" })).toBe("invalid_type");
    expect(validateSiteImage({ uri: "file:///a.jpg", mimeType: "image/jpeg", fileSize: MAX_SITE_IMAGE_SIZE_BYTES + 1 })).toBe("too_large");
  });
});

