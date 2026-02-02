import { Router } from 'express';
import { register, loginWithOtp, verifyOtp, googleLogin } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login-otp', loginWithOtp);
router.post('/verify-otp', verifyOtp);
router.post('/google', googleLogin);

export default router;
