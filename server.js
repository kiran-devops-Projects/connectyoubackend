const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const http = require("http");
const path = require('path');
const app = express();

dotenv.config();

// Your environment variable checks (as per previous configuration)
const requiredEnvVars = [
    'MONGODB_URI',
    'GEMINI_API_KEY',
    'JWT_SECRET',
    'NODE_ENV'
];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
}
app.use('/uploads', express.static('uploads'))
// Routes setup
const profileRoutes = require('./routes/profile');
const aiRoutes = require('./routes/ai');
const coursesRoutes = require('./routes/courses');
const mentorRoutes = require('./routes/mentor');
const usersRoutes = require('./routes/users');
const errorHandler = require("./middleware/errorHandler");
const requestLogger = require("./middleware/requestLogger");
const projectRoutes = require('./routes/projects');
const jobsRoute = require('./routes/jobs');
const eventRoutes = require('./routes/events');
const workshopRoutes = require('./routes/workshops');
const chatRoutes = require('./routes/chat');  // Added chat routes

// Security and logging middleware
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// CORS Configuration (Global CORS handling)
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') 
        : '*',
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"], // Add x-auth-token here
    credentials: true
}));

// Rate limiting for API routes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,  // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later"
});
app.use("/api/", limiter);

// Body Parsers for JSON and URL Encoded Data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom request logging middleware
app.use(requestLogger);

// Routes setup
app.use("/api/profile", profileRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/mentor", mentorRoutes);
app.use("/api/users", usersRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/jobs', jobsRoute);
app.use('/api/events', eventRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/chat', (req, res, next) => {
    req.io = io;  // Pass io instance to the request object for routes
    next();
}, chatRoutes);  // Add chat routes

app.get("/", (req, res) => {
    res.send("✅ ConnectYou backend is running");
});

// Health check endpoint for service monitoring
app.get("/health", (req, res) => {
    const status = {
        timestamp: new Date().toISOString(),
        service: "ConnectYou API",
        status: "OK",
        mongodb: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        aiService: process.env.GEMINI_API_KEY ? "Configured" : "Not Configured"
    };
    res.json(status);
});

// MongoDB Connection with retry mechanism
const connectDB = async (retries = 5) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connectyou', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ MongoDB Connected");
    } catch (err) {
        if (retries > 0) {
            console.log(`❌ MongoDB connection failed. Retrying... (${retries} attempts left)`);
            setTimeout(() => connectDB(retries - 1), 5000);
        } else {
            console.error("❌ MongoDB Connection Error:", err);
            process.exit(1);
        }
    }
};

// Global error handler for the application
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async () => {
    console.log('🔄 Received shutdown signal');
    try {
        await mongoose.connection.close();
        console.log('📦 MongoDB connection closed');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during graceful shutdown:', err);
        process.exit(1);
    }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    if (process.env.NODE_ENV === 'development') {
        process.exit(1);
    }
});

// Create HTTP server and initialize Socket.io
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Initialize the chatSocket function
const chatSocket = require('./socket/socket');
chatSocket(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`
🚀 Server is running
📍 PORT: ${PORT}
🌍 ENV: ${process.env.NODE_ENV}
⏰ Time: ${new Date().toLocaleString()}
    `);
});

// Connect to MongoDB
connectDB();

module.exports = { app, server };
