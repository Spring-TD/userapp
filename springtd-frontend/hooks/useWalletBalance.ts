'use client';

import { useState, useEffect, useCallback } from 'react';
import { userWalletApi, Wallet } from '@/lib/walletService';

interface UseWalletBalanceReturn {
    wallet: Wallet | null;
    balance: number;
    formattedBalance: string;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Hook to fetch and display the current user's wallet balance.
 * Extracts userId from the JWT access token stored in localStorage.
 * Calls wallet-ms.fly.dev via walletService.user.getUserWallet(userId)
 */
export function useWalletBalance(): UseWalletBalanceReturn {
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getUserIdFromToken = (): string | null => {
        if (typeof window === 'undefined') return null;
        const token = localStorage.getItem('accessToken');
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.userId || payload.id || payload.sub || null;
        } catch {
            return null;
        }
    };

    const fetchBalance = useCallback(async () => {
        setLoading(true);
        setError(null);

        const userId = getUserIdFromToken();
        if (!userId) {
            setLoading(false);
            setError('Not authenticated');
            return;
        }

        try {
            const response = await userWalletApi.getUserWallet(userId);
            if (response.success && response.data) {
                setWallet(response.data);
            } else {
                setError('Could not fetch wallet');
            }
        } catch (err) {
            // Don't surface wallet errors loudly — mobile home page should still render
            console.warn('Wallet balance fetch failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch wallet');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    const balance = wallet?.mainBalance ?? 0;

    // Format as Nigerian Naira with locale formatting
    const formattedBalance = balance > 0
        ? `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '₦0.00';

    return { wallet, balance, formattedBalance, loading, error, refetch: fetchBalance };
}
