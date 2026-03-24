import validator from 'validator';

export const validateAddress = (address: string): { isValid: boolean; error?: string } => {
  if (!address) {
    return { isValid: false, error: 'Address is required' };
  }

  if (typeof address !== 'string') {
    return { isValid: false, error: 'Address must be a string' };
  }

  if (address.length > 200) {
    return { isValid: false, error: 'Address must be 200 characters or less' };
  }

  // Check for ASCII only characters
  if (!validator.isAscii(address)) {
    return { isValid: false, error: 'Address must contain only ASCII characters' };
  }

  // Basic address format validation
  const trimmedAddress = address.trim();
  if (trimmedAddress.length < 5) {
    return { isValid: false, error: 'Address too short' };
  }

  return { isValid: true };
};

export const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'File type not allowed. Only JPG, PNG, and GIF files are accepted.' 
    };
  }

  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: 'File size too large. Maximum size is 5MB.' 
    };
  }

  return { isValid: true };
};

// Simple in-memory rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (ip: string, maxRequests = 30, windowMs = 60000): boolean => {
  const now = Date.now();
  const clientData = requestCounts.get(ip);

  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (clientData.count >= maxRequests) {
    return false;
  }

  clientData.count++;
  return true;
};