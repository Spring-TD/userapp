import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config';

// Helper to generate JWT
const generateToken = (userId: string) => {
    return jwt.sign({ id: userId }, config.jwtSecret, {
        expiresIn: '7d' // Long-lived token for convenience
    });
};

// Regular Email Registration
export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        // 1. Validation
        if (!name || !email) {
            return res.status(400).json({ error: 'Please provide name and email' });
        }

        // 2. Check overlap
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // 3. Create User (password optional)
        const userData: any = {
            name,
            email
        };
        
        if (password) {
            // Hash password if provided
            const salt = await bcrypt.genSalt(10);
            userData.password = await bcrypt.hash(password, salt);
        }

        // 4. Create User
        const user = await User.create(userData);

        // 5. Response
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token: generateToken(user.id),
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

// Login with OTP Request
export const loginWithOtp = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Please provide email' });
        }

        // Check if user exists
        let user = await User.findOne({ email });
        // If user doesn't exist, we generally shouldn't reveal it, but for this specific flow 'We missed you',
        // it implies returning users. If new user tries this, we could error or auto-register.
        // Let's assume strict login for now.
        if (!user) {
            return res.status(200).json({
                message: 'If an account exists, an OTP has been sent.',
                email
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP to user
        user.otpCode = otp;
        user.otpExpires = otpExpires;
        await user.save();

        // Send Email
        const { sendOtpEmail } = await import('../services/emailService');
        await sendOtpEmail(email, otp);

        res.status(200).json({
            success: true,
            message: 'OTP sent to email',
            email
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

// Verify OTP
export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Please provide email and OTP' });
        }

        const user = await User.findOne({ email });

        if (!user || !user.otpCode || !user.otpExpires) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Check expiration
        if (new Date() > user.otpExpires) {
            return res.status(400).json({ error: 'OTP has expired' });
        }

        // Check code match
        if (user.otpCode !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // Clear OTP
        user.otpCode = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Generate Token
        res.status(200).json({
            success: true,
            token: generateToken(user.id),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ error: 'Server error during verification' });
    }
};

// Google Sign-In
export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { email, name, googleId, avatar } = req.body;

        if (!email || !googleId) {
            return res.status(400).json({ error: 'Missing Google user data (email and googleId required)' });
        }

        // Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            // If user exists but no googleId (was email/pass user), link it?
            // For now, just update googleId if missing
            if (!user.googleId) {
                user.googleId = googleId;
                if (avatar) user.avatar = avatar;
                await user.save();
            }
        } else {
            // Create new user via Google
            user = await User.create({
                name: name || email.split('@')[0], // Fallback name
                email,
                googleId,
                avatar,
                // No password for google users
            });
        }

        res.status(200).json({
            success: true,
            token: generateToken(user.id),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ error: 'Server error during Google auth' });
    }
};
