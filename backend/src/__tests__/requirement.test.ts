import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../app";
import { Requirement } from "../models/Requirement";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await Requirement.deleteMany({});
});

const future = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

const base = {
  eventName: "Royal Palace Gala",
  eventType: "Wedding",
  dateMode: "single",
  startDate: future(30),
  endDate: future(30),
  location: "Udaipur, Rajasthan, India",
  latitude: 24.5854,
  longitude: 73.7125,
};
const planner = { ...base, category: "planner", services: ["Decor", "Catering"], guestCount: 200, budgetMin: 50000, budgetMax: 200000, experienceLevel: "Expert", languages: ["English", "Hindi"] };
const performer = { ...base, category: "performer", performanceType: "DJ", genre: "EDM", duration: 90, feeMin: 8000, feeMax: 15000, equipmentProvided: true };
const crew = { ...base, category: "crew", role: "Sound", headcount: 4, shiftHours: 8, payRate: 250, payUnit: "hour", experienceLevel: "Intermediate" };

describe("POST /api/requirements", () => {
  it.each([
    ["planner", planner],
    ["performer", performer],
    ["crew", crew],
  ])("creates a %s requirement", async (category, payload) => {
    const res = await request(app).post("/api/requirements").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category).toBe(category);
    expect(res.body.data._id).toBeDefined();
    expect(await Requirement.countDocuments({ category })).toBe(1);
  });

  it("rejects an empty body with a category error", async () => {
    const res = await request(app).post("/api/requirements").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.fields.category).toBeDefined();
  });

  it("rejects a planner without services", async () => {
    const res = await request(app).post("/api/requirements").send({ ...planner, services: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.services).toBeDefined();
  });

  it("rejects an end date before the start date", async () => {
    const res = await request(app)
      .post("/api/requirements")
      .send({ ...crew, dateMode: "range", startDate: future(10), endDate: future(5) });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.endDate).toBeDefined();
  });

  it("rejects a past date", async () => {
    const res = await request(app).post("/api/requirements").send({ ...crew, startDate: "2020-01-01", endDate: "2020-01-01" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.startDate).toBeDefined();
  });

  it("rejects budget min greater than max", async () => {
    const res = await request(app).post("/api/requirements").send({ ...planner, budgetMin: 300000, budgetMax: 1000 });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.budgetMax).toBeDefined();
  });

  it("strips unknown keys", async () => {
    const res = await request(app).post("/api/requirements").send({ ...crew, hack: "x" });
    expect(res.status).toBe(201);
    expect(res.body.data.hack).toBeUndefined();
  });
});

describe("GET /api/requirements", () => {
  it("filters by category", async () => {
    await request(app).post("/api/requirements").send(planner);
    await request(app).post("/api/requirements").send(crew);
    const res = await request(app).get("/api/requirements?category=crew");
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].category).toBe("crew");
  });

  it("paginates results", async () => {
    for (let i = 0; i < 3; i++) await request(app).post("/api/requirements").send(crew);
    const res = await request(app).get("/api/requirements?limit=2&page=1");
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.totalPages).toBe(2);
  });

  it("searches by text", async () => {
    await request(app).post("/api/requirements").send({ ...crew, eventName: "Goa Beach Festival" });
    await request(app).post("/api/requirements").send(planner);
    const res = await request(app).get("/api/requirements?q=goa");
    expect(res.body.data.items).toHaveLength(1);
  });

  it("rejects an invalid category filter", async () => {
    const res = await request(app).get("/api/requirements?category=banana");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/requirements/:id", () => {
  it("returns 400 for an invalid id", async () => {
    const res = await request(app).get("/api/requirements/not-an-id");
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app).get(`/api/requirements/${new mongoose.Types.ObjectId().toString()}`);
    expect(res.status).toBe(404);
  });

  it("returns the requirement when it exists", async () => {
    const created = await request(app).post("/api/requirements").send(performer);
    const res = await request(app).get(`/api/requirements/${created.body.data._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.genre).toBe("EDM");
  });
});

describe("GET /api/health", () => {
  it("responds ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
  });
});
describe("DELETE /api/requirements/:id", () => {
  it("deletes an existing requirement", async () => {
    const created = await request(app).post("/api/requirements").send(crew);
    const id = created.body.data._id;
    const res = await request(app).delete(`/api/requirements/${id}`);
    expect(res.status).toBe(200);
    expect(await Requirement.countDocuments({})).toBe(0);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app).delete(`/api/requirements/${new mongoose.Types.ObjectId().toString()}`);
    expect(res.status).toBe(404);
  });

  it("returns 400 for an invalid id", async () => {
    const res = await request(app).delete("/api/requirements/not-an-id");
    expect(res.status).toBe(400);
  });
});

describe("location coordinates", () => {
  it("saves the coordinates with the requirement", async () => {
    const res = await request(app).post("/api/requirements").send(crew);
    expect(res.status).toBe(201);
    expect(res.body.data.latitude).toBeCloseTo(24.5854);
    expect(res.body.data.longitude).toBeCloseTo(73.7125);
  });

  it("rejects a payload without coordinates", async () => {
    const res = await request(app).post("/api/requirements").send({ ...crew, latitude: undefined, longitude: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.location).toBeDefined();
  });

  it("rejects a latitude above 90", async () => {
    const res = await request(app).post("/api/requirements").send({ ...crew, latitude: 95 });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.location).toBeDefined();
  });

  it("rejects a longitude above 180", async () => {
    const res = await request(app).post("/api/requirements").send({ ...crew, longitude: 190 });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.location).toBeDefined();
  });

  it("rejects non-numeric coordinates", async () => {
    const res = await request(app).post("/api/requirements").send({ ...crew, latitude: "abc" });
    expect(res.status).toBe(400);
  });
});

describe("event name quality", () => {
  it.each(["asdfgh", "aaaa", "12345", "ab", "asds", "jkjk"])("rejects event name %s", async (name) => {
    const res = await request(app).post("/api/requirements").send({ ...crew, eventName: name });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.eventName).toBeDefined();
  });

  it.each(["DJ Nite", "Sharma Wedding Reception"])("accepts event name %s", async (name) => {
    const res = await request(app).post("/api/requirements").send({ ...crew, eventName: name });
    expect(res.status).toBe(201);
  });
});
