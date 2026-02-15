import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Lecture from '../models/Lecture.js';
import Course from '../models/Course.js';
import Section from '../models/Section.js';

dotenv.config();

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Find all Common Words courses
    const allCourses = await Course.find({
      title: { $in: ['Common Words 1', 'Common Words 2'] }
    }).sort({ createdAt: 1 }); // Oldest first

    console.log(`Found ${allCourses.length} Common Words courses total\n`);

    // Separate by title
    const cw1 = allCourses.filter(c => c.title === 'Common Words 1');
    const cw2 = allCourses.filter(c => c.title === 'Common Words 2');

    console.log(`Common Words 1: ${cw1.length} courses`);
    console.log(`Common Words 2: ${cw2.length} courses\n`);

    // Keep only the last one of each
    const toDelete = [];
    
    if (cw1.length > 1) {
      toDelete.push(...cw1.slice(0, -1)); // Delete all except last
    }
    
    if (cw2.length > 1) {
      toDelete.push(...cw2.slice(0, -1)); // Delete all except last
    }

    console.log(`Will delete ${toDelete.length} old courses:\n`);

    // Delete old courses
    for (const course of toDelete) {
      console.log(` Deleting: ${course.title} (ID: ${course._id})`);
      
      // Delete related sections and lectures
      await Section.deleteMany({ courseId: course._id });
      await Lecture.deleteMany({ courseId: course._id });
      await Course.deleteOne({ _id: course._id });
    }

    console.log('\n Cleanup complete!');
    console.log('\nRemaining courses:');
    
    const remaining = await Course.find({
      title: { $in: ['Common Words 1', 'Common Words 2'] }
    }).sort({ title: 1 });

    for (const course of remaining) {
      const lectureCount = await Lecture.countDocuments({ courseId: course._id });
      console.log(`  ✓ ${course.title} - ${lectureCount} lectures`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanup();
