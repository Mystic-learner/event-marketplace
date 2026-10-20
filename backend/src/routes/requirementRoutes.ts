import { Router } from "express";
import rateLimit from "express-rate-limit";
import { create, getOne, list, remove } from "../controllers/requirementController";

const postLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, error: { message: "Too many requests, please try again later" } },
});

const router = Router();

router.post("/", postLimiter, create);
router.get("/", list);
router.get("/:id", getOne);
router.delete("/:id", remove);

export default router;