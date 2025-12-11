const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');
const cors = require('cors');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser (for request bodies)
app.use(express.json());

// Enable CORS for all origins (in production, restrict this)
app.use(cors());

// Serve static assets from the client build folder (assuming React build)
// app.use(express.static(path.join(__dirname, 'dist'))); 

// Define Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const fileRoutes = require('./routes/fileRoutes');
const folderRoutes = require('./routes/folderRoutes'); // ADDED
const reviewRoutes = require('./routes/reviewRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/folders', folderRoutes); // ADDED
app.use('/api/reviews', reviewRoutes);

// General Error Handler Middleware
app.use((err, req, res, next) => {
    // Determine the status code, default to 500
    const statusCode = err.statusCode || 500;
    
    // Log the full error stack to the server console in all environments
    console.error(err.stack);
    
    // Send a minimal error response to the client in production
    // Send the full stack only if in development mode
    const errorResponse = {
        success: false,
        message: err.message || 'Server Error'
    };

    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }
    
    res.status(statusCode).json(errorResponse);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));

// Handle unhandled rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    // server.close(() => process.exit(1)); 
});