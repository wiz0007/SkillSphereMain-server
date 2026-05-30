import jwt, {} from "jsonwebtoken";
import { getAuthTokenFromRequest } from "../utils/authCookie.js";
/* ================= PROTECT ================= */
export const protect = (req, res, next) => {
    try {
        const token = getAuthTokenFromRequest(req);
        if (!token) {
            return res.status(401).json({
                message: "No token provided",
            });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded._id || decoded.userId;
        if (!userId) {
            return res.status(401).json({
                message: "Invalid token payload",
            });
        }
        req.userId = userId;
        next();
    }
    catch (error) {
        return res.status(401).json({
            message: "Invalid token",
        });
    }
};
//# sourceMappingURL=protect.js.map