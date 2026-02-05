import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'path';

import router from './routes/routes.js';

dotenv.config();

const app = express();

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.log('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

await connectDB();

// Serve CSS + uploaded images
app.use(express.static('static'));
app.use('/uploads', express.static(path.resolve('uploads')));

app.get('/', (req, res) => res.redirect('/photos'));
app.use('/photos', router);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ http://localhost:${port}`));
