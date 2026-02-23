import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

export function requireAuth(req, res, next) {
  try {
    // Try to get token from Authorization header first (backward compatibility)
    let token = null;
    const auth = req.headers.authorization || req.headers.Authorization;
    
    // Check Authorization header
    if (auth && typeof auth === 'string') {
      const parts = auth.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }
    
    // If no token from header, try httpOnly cookie (preferred method)
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    // Only allow dev mode bypass if explicitly in development AND localhost
    const IS_LOCAL_DEV = (
      (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev') &&
      (process.env.ALLOW_DEV_BYPASS === 'true') &&
      (req.hostname === 'localhost' || req.hostname === '127.0.0.1')
    );
    
    // In development on localhost with explicit flag, allow missing auth (set anonymous user)
    if (IS_LOCAL_DEV && !token) {
      console.log('✅ Dev mode: allowing request without auth token (local development only)');
      req.user = {
        id: 'dev-user',
        username: 'developer',
        isAdmin: false,
      };
      return next();
    }

    // All other cases: require auth (production, deployed dev, or configured for strict auth)
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    // Normalize payload into req.user
    req.user = {
      id: payload.sub || payload.id || payload.userId,
      username: payload.username || payload.name,
      isAdmin: payload.isAdmin === true || payload.admin === true,
    };

    return next();
  } catch (err) {
    console.warn('Auth failure:', err.message);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export default requireAuth;
