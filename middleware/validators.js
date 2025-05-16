/**
 * Validators for ConnectYou application
 * Contains validation functions for API requests
 */

// Validate AI message requests
exports.validateAIRequest = (req, res, next) => {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
            error: "Invalid request",
            details: "Message is required and must be a non-empty string"
        });
    }
    
    next();
};

/**
 * Validates user profile data
 * @param {Object} data - The profile data to validate
 * @returns {Object} Object containing validation result and any errors
 */
exports.validateProfile = (data) => {
    const errors = [];
    
    if (!data.name || typeof data.name !== 'string') {
        errors.push('Name is required and must be a string');
    }
    
    if (!data.role || typeof data.role !== 'string') {
        errors.push('Role is required and must be a string');
    }
    
    if (!data.email || !isValidEmail(data.email)) {
        errors.push('Valid email is required');
    }
    
    if (data.skills && !Array.isArray(data.skills)) {
        errors.push('Skills must be an array');
    }
    
    if (data.interests && !Array.isArray(data.interests)) {
        errors.push('Interests must be an array');
    }
    
    if (data.experience && !Array.isArray(data.experience)) {
        errors.push('Experience must be an array');
    }
    
    return {
        success: errors.length === 0,
        errors
    };
};

/**
 * Helper function to validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} True if email is valid
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};