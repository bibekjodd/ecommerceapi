import cloudinary from "cloudinary";
import express, { Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import validateEnv from "../lib/validateEnv";
import { catchAsyncError } from "../middlewares/catchAsyncError";
import mongoose from "mongoose";
import connectDatabase from "./database";

export const initialConfig = (app: Express) => {
  validateEnv();

  cloudinary.v2.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    cloud_name: process.env.CLOUDINARY_API_CLOUD_NAME,
  });

  mongoose.connection.once("open", () => {
    global.databaseConnected = true;
  });

  mongoose.connection.once("error", () => {
    global.databaseConnected = false;
  });

  app.use(
    catchAsyncError(async (req, res, next) => {
      if (
        mongoose.ConnectionStates.disconnected ||
        mongoose.connections.length < 1 ||
        mongoose.ConnectionStates.uninitialized
      ) {
        await connectDatabase();
      }

      next();
    })
  );

  app.get("/", (req, res) => {
    res.json({
      message:
        envLoaded && databaseConnected
          ? "Server is running fine"
          : "Server started but might have some error",
      databaseConnected,
      envLoaded,
      mongooseConnections: mongoose.connections.length,
      env: process.env.NODE_ENV,
    });
  });

  app.get("/api/status", (req, res) => {
    res.status(200).json({
      message: "Server is running",
      envLoaded: global.envLoaded,
      databaseConnected: global.databaseConnected,
      NODE_ENV: process.env.NODE_ENV,
      mongooseConnections: mongoose.connections.length,
      FRONTEND_URL: process.env.FRONTEND_URL?.split(" ") || [],
    });
  });

  app.get(
    "/refresh",
    catchAsyncError(async (req, res) => {
      if (
        mongoose.connections.length < 1 ||
        mongoose.ConnectionStates.disconnected ||
        mongoose.ConnectionStates.uninitialized
      ) {
        await connectDatabase();
      }
      res.status(200).json({ message: "Server Refreshed" });
    })
  );

  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL?.split(" ") || [],
      credentials: true,
    })
  );
  app.enable("trust proxy");

  app.use((req, res, next) => {
    if (!global.envLoaded || !global.databaseConnected)
      return res.status(500).json({
        message: "Server has configuration issues",
      });

    next();
  });
};
