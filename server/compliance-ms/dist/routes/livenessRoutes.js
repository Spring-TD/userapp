"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.livenessRoutes = void 0;
const express_1 = require("express");
const livenessController_1 = require("../controllers/livenessController");
const router = (0, express_1.Router)();
exports.livenessRoutes = router;
router.post('/webhook', livenessController_1.LivenessController.handleLivenessResult);
router.get('/status/:providerReference', livenessController_1.LivenessController.checkLivenessStatus);
router.post('/generate/:shareholderId', livenessController_1.LivenessController.generateLivenessTest);
//# sourceMappingURL=livenessRoutes.js.map