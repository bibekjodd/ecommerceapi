"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.isAuthenticatedUser = void 0;
const User_Model_1 = __importDefault(require("../models/User.Model"));
const errorHandler_1 = require("../lib/errorHandler");
const catchAsyncError_1 = require("./catchAsyncError");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * middleware to check if the user is valid or not from `req.cookies.token`
 */
exports.isAuthenticatedUser = (0, catchAsyncError_1.catchAsyncError)(async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token)
            return next(new errorHandler_1.ErrorHandler("Please login to access this resource", 401));
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!decoded.id)
            return next(new errorHandler_1.ErrorHandler("Please login to access this resource", 401));
        const user = await User_Model_1.default.findById(decoded.id).select("+password");
        if (!user)
            return next(new errorHandler_1.ErrorHandler("Please login to access this resource", 401));
        req.user = user;
        next();
    }
    catch (error) {
        return next(new errorHandler_1.ErrorHandler("Please login to access this resource", 401));
    }
});
/**
 * middleware that checks if the user is admin or not
 * isAuthenticatedUser must be used before this.
 */
exports.isAdmin = (0, catchAsyncError_1.catchAsyncError)(async (req, res, next) => {
    if (req.user?.role !== "admin")
        return next(new errorHandler_1.ErrorHandler("Only admin can perform this action", 403));
    next();
});
