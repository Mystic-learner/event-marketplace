import "dotenv/config";
import mongoose from "mongoose";
import { CrewRequirement, PerformerRequirement, PlannerRequirement, Requirement } from "../models/Requirement";

const day = (n: number) => new Date(Date.now() + n * 864e5);

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri);
  await Requirement.deleteMany({});

  await PlannerRequirement.create([
    {
      eventName: "Luxury Destination Wedding in Udaipur", eventType: "Wedding", dateMode: "range",
      startDate: day(60), endDate: day(63), location: "Udaipur, Rajasthan", venue: "Taj Lake Palace",
      services: ["Full planning", "Decor", "Catering"], guestCount: 300, budgetMin: 50000, budgetMax: 120000,
      experienceLevel: "Expert", languages: ["English", "Hindi"], notes: "Looking for high-end royal theme execution.",
    },
    {
      eventName: "Corporate Annual Gala", eventType: "Corporate", dateMode: "single",
      startDate: day(40), endDate: day(40), location: "Mumbai, Maharashtra",
      services: ["Logistics", "Vendor coordination"], guestCount: 150, budgetMin: 80000, budgetMax: 150000,
      experienceLevel: "Intermediate", languages: ["English"],
    },
  ]);

  await PerformerRequirement.create([
    {
      eventName: "Summer Electronic Music Festival", eventType: "Festival", dateMode: "single",
      startDate: day(50), endDate: day(50), location: "Goa, India", venue: "Vagator Beach",
      performanceType: "DJ", genre: "EDM", duration: 120, feeMin: 8000, feeMax: 15000,
      equipmentProvided: false, specialRequirements: "Pioneer CDJ-3000 setup required.",
    },
    {
      eventName: "Sangeet Night Live Band", eventType: "Wedding", dateMode: "single",
      startDate: day(35), endDate: day(35), location: "Hyderabad, Telangana",
      performanceType: "Live band", genre: "Bollywood", duration: 90, feeMin: 25000, feeMax: 40000,
      equipmentProvided: true,
    },
  ]);

  await CrewRequirement.create([
    {
      eventName: "Global Tech Summit 2026", eventType: "Corporate", dateMode: "range",
      startDate: day(30), endDate: day(32), location: "Bengaluru, Karnataka", venue: "Palace Grounds",
      role: "Sound", headcount: 6, shiftHours: 10, payRate: 250, payUnit: "hour",
      experienceLevel: "Expert", notes: "Experience with Line Array systems required.",
    },
    {
      eventName: "College Fest Security Team", eventType: "Festival", dateMode: "single",
      startDate: day(25), endDate: day(25), location: "Hyderabad, Telangana",
      role: "Security", headcount: 12, shiftHours: 8, payRate: 1500, payUnit: "day",
      experienceLevel: "Intermediate",
    },
  ]);

  console.log("Seeded 2 requirements per category.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});