export const errorHandler = (err, req, res, next) => {
    console.error("ERROR:", err);
    return res.status(500).json({
        message: err.message || "Internal Server Error",
    });
};
//# sourceMappingURL=errorHandler.js.map