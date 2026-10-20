import "dotenv/config";
import mongoose from "mongoose";
import { Requirement } from "../models/Requirement";

const SEED_NAMES = [
  "Global Tech Summit 2026",
  "College Fest Security Team",
  "Summer Electronic Music Festival",
  "Sangeet Night Live Band",
  "Corporate Annual Gala",
  "Luxury Destination Wedding in Udaipur",
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri);
  const r = await Requirement.deleteMany({ eventName: { $in: SEED_NAMES } });
  console.log("Deleted", r.deletedCount, "sample requirements");
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});