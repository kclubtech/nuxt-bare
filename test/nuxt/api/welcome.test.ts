import { describe, expect, it, vi } from "vitest";
import { createEvent, defineEventHandler } from "h3";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { jsonResponse } from "../../../server/utils/common/response";

// Stub Nitro server auto-imports used by the route handler
vi.stubGlobal("defineEventHandler", defineEventHandler);
vi.stubGlobal("jsonResponse", jsonResponse);

function createTestEvent() {
  const req = new IncomingMessage(new Socket());
  req.method = "GET";
  req.url = "/api";
  req.headers = { host: "localhost", accept: "application/json" };
  const res = new ServerResponse(req);
  return createEvent(req, res);
}

describe("Users API", () => {
  it("should return a testing message", async () => {
    const { default: handler } = await import("../../../server/api/index.get");
    const response = await handler(createTestEvent());
    expect(response.data).toEqual({ message: "Hello from API!" });
  });
});
