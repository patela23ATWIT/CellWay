import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import * as api from '../services/api'; // Import API functions

export const useAuth = () => {
    const [user, setUser] = useState(null); // Store user object { id, email, ... } or null
    const [isLoading, setIsLoading] = useState(true); // Track initial session check

    // Check session on initial load
    const checkSession = useCallback(async () => {
    setIsLoading(true);
    try {
        const response = await api.checkUserSession();
        if (response.data?.user_id) {
            // Fetch full user details if needed, or just store ID
            // For now, just store ID as before
            setUser({ id: response.data.user_id });
            // console.log("Session check: User is logged in.", response.data.user_id);
        } else {
            setUser(null);
        }
    } catch (error) {
        // 401 is expected if not logged in, don't log error for that
        if (error.response?.status !== 401) {
            console.error('Error checking authentication status:', error);
        }
        setUser(null);
    } finally {
        setIsLoading(false);
    }
    }, []);

    useEffect(() => {
    checkSession();
    }, [checkSession]);

    // Login function
    const login = useCallback(async (email, password) => {
    try {
        const response = await api.loginUser(email, password);
        if (response.data?.success && response.data?.user) {
            const userData = { ...response.data.user, id: response.data.user._id }; // Standardize ID field
            delete userData._id; // Remove MongoDB specific ID if present
            setUser(userData);
            toast.success('Logged in successfully!');
            return { success: true, user: userData };
        }
        // Errors handled by interceptor or below
        return { success: false, error: 'Login failed.' }; // Fallback error
    } catch (error) {
        const status = error.response?.status;
        let errorMsg = error.response?.data?.error || 'Login failed. Please try again.';

        // Specific handling for lockout (status 403 as set in backend route)
        if (status === 403 && errorMsg.includes("Account locked")) {
            // Keep the specific message from backend
            toast.error(errorMsg, { id: 'login-lockout-err'});
        } else {
            // Use interceptor's default toast or show generic here if needed
            toast.error(errorMsg, { id: 'login-err'});
        }
        return { success: false, error: errorMsg };
    }
    }, []);

    // Register function
    const register = useCallback(async (email, password) => {
    try {
        const response = await api.registerUser(email, password);
        if (response.data?.success && response.data?.user) {
            const userData = { ...response.data.user, id: response.data.user._id };
            delete userData._id;
            setUser(userData);
            toast.success('Registration successful! You are now logged in.');
            return { success: true, user: userData };
        }
        return { success: false, error: 'Registration failed.' };
    } catch (error) {
        const errorMsg = error.response?.data?.error || 'Registration failed. Please try again.';
        // toast.error(errorMsg);
        return { success: false, error: errorMsg };
    }
    }, []);

    // Logout function
    const logout = useCallback(async () => {
    try {
        await api.logoutUser();
        setUser(null);
        toast.success('Logged out.');
        return { success: true };
    } catch (error) {
        console.error("Logout failed:", error);
        toast.error("Logout failed. Please try again.");
        return { success: false, error: 'Logout failed.' };
    }
    }, []);

    // Forgot Password function
    const forgotPassword = useCallback(async (email) => {
        try {
            const response = await api.forgotPasswordRequest(email);
             // Backend now *always* returns success: true, and a generic message
            if (response.data?.success && response.data?.message) {
                toast.success(response.data.message); // Show the generic message
                return { success: true, message: response.data.message };
            }
            // This part might not be reached if backend always returns success
            return { success: false, error: 'Failed to send reset email.' };
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to send password reset email.';
            // toast.error(errorMsg);
            return { success: false, error: errorMsg };
        }
    }, []);

    // Reset Password function
    const resetPassword = useCallback(async (token, newPassword) => {
        try {
            const response = await api.resetPassword(token, newPassword);
            if (response.data?.success) {
                toast.success(response.data.message || 'Password reset successfully!');
                return { success: true, message: response.data.message };
            }
             // Should not happen if backend returns error via catch block
            return { success: false, error: 'Password reset failed.' };
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Password reset failed. Please try again.';
            toast.error(errorMsg); // Show specific error from backend
            return { success: false, error: errorMsg };
        }
    }, []);


    return {
        user,
        isLoading,
        isLoggedIn: !!user,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        checkSession
    };
};