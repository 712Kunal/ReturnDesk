import { Router } from "express";
import { AppError } from "../utils/errors.js";
import * as svc from "../services/requestService.js";
import {
  validateDetails,
  validateNote,
  validateTransition,
  validateListQuery,
} from "../validators/validation.js";

const router = Router();

router.param("id", (req, res, next, value) => {
  if (!/^\d{1,15}$/.test(value))
    throw new AppError(
      400,
      "INVALID_ID",
      "Request id must be a positive integer",
    );
  req.requestId = Number(value);
  next();
});

router.get("/", async (req, res) => {
  res.json(await svc.listRequests(validateListQuery(req.query)));
});

router.post("/", async (req, res) => {
  const created = await svc.createRequest(
    validateDetails(req.body, { partial: false }),
  );
  res
    .status(201)
    .location(`/api/requests/${created.id}`)
    .json({ data: created });
});

router.get("/:id", async (req, res) => {
  res.json({ data: await svc.getRequest(req.requestId) });
});

router.patch("/:id", async (req, res) => {
  const updated = await svc.updateRequest(
    req.requestId,
    validateDetails(req.body, { partial: true }),
  );
  res.json({ data: updated });
});

router.post("/:id/transition", async (req, res) => {
  const updated = await svc.transitionRequest(
    req.requestId,
    validateTransition(req.body),
  );
  res.json({ data: updated });
});

router.post("/:id/notes", async (req, res) => {
  const note = await svc.addNote(req.requestId, validateNote(req.body));
  res.status(201).json({ data: note });
});

router.delete("/:id", async (req, res) => {
  await svc.removeRequest(req.requestId);
  res.status(204).end();
});

export default router;
