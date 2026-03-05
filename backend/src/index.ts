import express from "express";
import cors from "cors";
import { initScheduledJobs } from "./config/scheduler";
import healthRoutes from "./routes/health.routes";
import productRoutes from "./routes/product.routes";
import alertRoutes from "./routes/alert.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import notificationRoutes from "./routes/notification.routes";
import notificationStreamRoutes from "./routes/notification-stream.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express(); //initialize express application
const PORT = process.env.PORT || 3001;

// initialize scheduled jobs (start cron job when server starts)
initScheduledJobs();

//global middleware
app.use(cors());
app.use(express.json());

//routes
app.use("/health", healthRoutes);
app.use("/api/products", productRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/notifications/stream", notificationStreamRoutes);

//global error handling
app.use(errorHandler);

//log if server is running
app.listen(PORT, () => {
  console.log(`Server successfully running at http://localhost:${PORT}/health`);
});
