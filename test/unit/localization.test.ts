import { describe, expect, it } from "vitest";
import type { H3Event } from "h3";
import {
  getRequestLanguage,
  normalizeLanguage,
} from "../../server/utils/common/localization";

function mockEvent(acceptLanguage?: string): H3Event {
  const headers = new Headers();
  if (acceptLanguage !== undefined) {
    headers.set("accept-language", acceptLanguage);
  }
  return { headers } as unknown as H3Event;
}

describe("normalizeLanguage", () => {
  it("keeps supported plain codes", () => {
    expect(normalizeLanguage("en")).toBe("en");
    expect(normalizeLanguage("id")).toBe("id");
  });

  it("strips region suffixes", () => {
    expect(normalizeLanguage("en-US")).toBe("en");
    expect(normalizeLanguage("en-GB")).toBe("en");
    expect(normalizeLanguage("id-ID")).toBe("id");
  });

  it("is case-insensitive", () => {
    expect(normalizeLanguage("EN")).toBe("en");
    expect(normalizeLanguage("Id-ID")).toBe("id");
  });

  it("falls back to en for unsupported languages", () => {
    expect(normalizeLanguage("fr-FR")).toBe("en");
    expect(normalizeLanguage("de")).toBe("en");
    expect(normalizeLanguage("")).toBe("en");
  });
});

describe("getRequestLanguage", () => {
  it("extracts the first language from accept-language", () => {
    expect(getRequestLanguage(mockEvent("en-US,en;q=0.9,id;q=0.8"))).toBe("en");
    expect(getRequestLanguage(mockEvent("id-ID,id;q=0.9,en;q=0.8"))).toBe("id");
  });

  it("normalizes region codes", () => {
    expect(getRequestLanguage(mockEvent("id-ID"))).toBe("id");
    expect(getRequestLanguage(mockEvent("en-GB,en;q=0.9"))).toBe("en");
  });

  it("falls back to en when the header is missing or empty", () => {
    expect(getRequestLanguage(mockEvent())).toBe("en");
    expect(getRequestLanguage(mockEvent(""))).toBe("en");
  });

  it("tolerates internal calls without a real event", () => {
    // @ts-expect-error - internal call with a partial event-like object
    expect(getRequestLanguage(undefined)).toBe("en");
  });
});
