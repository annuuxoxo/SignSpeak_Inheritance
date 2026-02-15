import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Lecture from '../models/Lecture.js';

dotenv.config();

const descriptions = {
  "Up": "How to sign: Raise the index finger of your dominant hand upward, as though pointing toward something above.\n\nWord definition: Direction toward a higher place.\n\nSynonyms: Above, Higher.",
  
  "Ball": "How to sign: With open hands and slightly curved fingers facing each other, repeatedly touch each fingertip to its corresponding one on the opposite hand.\n\nWord definition: Object - a round object you can throw, kick, or bounce.\n\nSynonyms: Sphere, Globe, Orb.",
  
  "Mouse": "How to sign: Extend your pointer finger, tuck the other fingers into your palm, and gently brush your nose with the pointer finger a couple of times."
};

async function updateDescriptions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    for (const [title, description] of Object.entries(descriptions)) {
      const result = await Lecture.updateOne(
        { title: title },
        { $set: { description: description } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated: ${title}`);
      } else {
        console.log(`⚠️  No changes for: ${title} (might not exist or already has this description)`);
      }
    }

    console.log('\n✅ Description update complete!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateDescriptions();
