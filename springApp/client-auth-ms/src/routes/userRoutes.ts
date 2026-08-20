/**
 * User routes (mounted at /api/v1/user).
 *
 * @openapi
 * /api/v1/user/list:
 *   get:
 *     summary: List users
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User list
 * /api/v1/user/profile:
 *   get:
 *     summary: Get profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *   put:
 *     summary: Update profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 * /api/v1/user/email:
 *   put:
 *     summary: Update email
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email updated
 * /api/v1/user/{userId}/status:
 *   put:
 *     summary: Update user status
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status updated
 * /api/v1/user/deactivate:
 *   post:
 *     summary: Deactivate account
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deactivated
 * /api/v1/user/callbacks:
 *   put:
 *     summary: Update callback URLs
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Callbacks updated
 * /api/v1/user/info/{userId}:
 *   get:
 *     summary: Get user info (admin)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User info
 * /api/v1/user/verify-info/{userId}:
 *   post:
 *     summary: Verify user info (admin)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verified
 * /api/v1/user/suspend/{userId}:
 *   put:
 *     summary: Suspend user (admin)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User suspended
 * /api/v1/user/activate/{userId}:
 *   put:
 *     summary: Activate user (admin)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User activated
 */
import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { UserController } from '../controllers/userController';
import { InternalUserController } from '../controllers/internalUserController';
import { authenticate } from '../middleware/auth';
import { internalServiceAuth } from '../middleware/internalServiceAuth';
import {
  ALLOWED_PROFILE_PICTURE_MIME_TYPES,
  getMaxProfilePictureUploadSizeBytes
} from '../services/spacesService';

const router = Router();

const profilePictureUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxProfilePictureUploadSizeBytes() },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_PROFILE_PICTURE_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error(`Invalid profile picture type. Allowed: ${ALLOWED_PROFILE_PICTURE_MIME_TYPES.join(', ')}`));
      return;
    }
    cb(null, true);
  }
});

const handleProfilePictureUpload = (req: Request, res: Response, next: NextFunction): void => {
  profilePictureUpload.single('profile_picture')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    const maxMb = getMaxProfilePictureUploadSizeBytes() / (1024 * 1024);
    const message =
      error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? `Profile picture size must not exceed ${maxMb}MB`
        : error instanceof Error
          ? error.message
          : 'Invalid profile picture upload';

    res.status(400).json({
      success: false,
      error: message
    });
  });
};

router.get(
  '/internal/phone/:userId',
  internalServiceAuth,
  InternalUserController.getUserPhone
);

router.get(
  '/internal/applicant-name/:userId',
  internalServiceAuth,
  InternalUserController.getApplicantName
);

router.get(
  '/internal/profile/:userId',
  internalServiceAuth,
  InternalUserController.getInternalProfile
);

router.get(
  '/internal/merchant-owner/:merchantId',
  internalServiceAuth,
  InternalUserController.getMerchantOwnerByTenantId
);

router.get(
  '/internal/apps/:appId/customer-count',
  internalServiceAuth,
  InternalUserController.getAppCustomerCount
);

router.get(
  '/internal/apps/:appId/customers',
  internalServiceAuth,
  InternalUserController.listAppRetailCustomers
);

router.post(
  '/internal/contacts',
  internalServiceAuth,
  InternalUserController.getUserContactsBatch
);

// User profile management routes
router.get('/list', authenticate, UserController.listUsers);
router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, handleProfilePictureUpload, UserController.updateProfile);
router.put('/email', authenticate, UserController.updateEmail);
router.put('/:userId/status', authenticate, UserController.updateStatus);
router.post('/deactivate', authenticate, UserController.deactivate);
router.put('/callbacks', authenticate, UserController.updateCallbackUrls);

// Admin user management routes
router.get('/info/:userId', authenticate, UserController.getInfo);
router.post('/verify-info/:userId', authenticate, UserController.verifyInfo);
router.put('/suspend/:userId', authenticate, UserController.suspend);
router.put('/activate/:userId', authenticate, UserController.activate);

export { router as userRoutes };