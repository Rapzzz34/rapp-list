import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mediaRouter from "./media";
import storageRouter from "./storage";
import analyzeRouter from "./analyze";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mediaRouter);
router.use(analyzeRouter);
router.use(storageRouter);

export default router;
