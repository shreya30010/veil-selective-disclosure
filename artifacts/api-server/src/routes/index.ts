import { Router, type IRouter } from "express";
import healthRouter from "./health";
import veilRouter from "./veil";

const router: IRouter = Router();

router.use(healthRouter);
router.use(veilRouter);

export default router;
