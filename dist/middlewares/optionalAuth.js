import jwt, {} from "jsonwebtoken";
import { getAuthTokenFromRequest } from "../utils/authCookie.js";
export const optionalAuth = (req, _res, next) => {
    try {
        const token = getAuthTokenFromRequest(req);
        if (!token) {
            return next();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded._id || decoded.userId;
        if (userId) {
            req.userId = String(userId);
        }
    }
    catch {
        // Ignore invalid public-route tokens and continue as guest.
    }
    next();
};
//# sourceMappingURL=optionalAuth.js.map