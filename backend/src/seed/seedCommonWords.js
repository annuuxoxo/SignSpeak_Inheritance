import mongoose from "mongoose";
import dotenv from "dotenv";

import Course from "../models/Course.js";
import Section from "../models/Section.js";
import Lecture from "../models/Lecture.js";

dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("DB connected for Common Words seeding");

  // Delete old courses (Everyday Static Signs and Dynamic ASL Expressions)
  const existingCourses = await Course.find({ title: { $in: ["Everyday Static Signs", "Dynamic ASL Expressions"] } });
  for (const course of existingCourses) {
    await Section.deleteMany({ courseId: course._id });
    await Lecture.deleteMany({ courseId: course._id });
    await Course.deleteOne({ _id: course._id });
    console.log(`🗑️  Deleted course: ${course.title}`);
  }

  const courses = [
    /* ===================== COMMON WORDS 1 ===================== */
    {
      title: "Common Words 1",
      complexity: "Intermediate",
      sections: [
        {
          title: "Starter Signs",
          lectures: [
            { title: "Come Here", type: "video" },
            {
              title: "Up",
              type: "video",
              description:
                "How to sign: Raise the index finger of your dominant hand upward, as though pointing toward something above.\n\nWord definition: Direction toward a higher place.\n\nSynonyms: Above, Higher."
            },
            { title: "Down", type: "video" },
            { title: "Time", type: "video" },
            {
              title: "Ball",
              type: "video",
              description:
                "How to sign: With open hands and slightly curved fingers facing each other, repeatedly touch each fingertip to its corresponding one on the opposite hand.\n\nWord definition: Object - a round object you can throw, kick, or bounce.\n\nSynonyms: Sphere, Globe, Orb."
            },
            { title: "Desk", type: "video" },
            {
              title: "Mouse",
              type: "video",
              description:
                "How to sign: Extend your pointer finger, tuck the other fingers into your palm, and gently brush your nose with the pointer finger a couple of times."
            }
          ]
        }
      ]
    },

    /* ===================== COMMON WORDS 2 ===================== */
    {
      title: "Common Words 2",
      complexity: "Intermediate",
      sections: [
        {
          title: "Starter Signs",
          lectures: [
            { title: "Family", type: "video" },
            { title: "Boy", type: "video" },
            { title: "Me", type: "video" },
            { title: "Student", type: "video" },
            { title: "Joy", type: "video" },
            { title: "Big", type: "video" },
            { title: "Hear", type: "video" },
            { title: "Arm", type: "video" }
          ]
        }
      ]
    }
  ];

  for (const courseData of courses) {
    const course = await Course.create({
      title: courseData.title,
      description: `${courseData.title} ASL course`,
      complexity: courseData.complexity
    });

    for (const sectionData of courseData.sections) {
      const section = await Section.create({
        courseId: course._id,
        title: sectionData.title
      });

      course.sections.push(section._id);

      for (const lec of sectionData.lectures) {
        const lecture = await Lecture.create({
          title: lec.title,
          description: lec.description || `ASL gesture for ${lec.title}`,
          contentType: lec.type,
          courseId: course._id,
          sectionId: section._id,
          videoPublicId: null,
          imagePublicId: null
        });

        section.lectures.push(lecture._id);
      }

      await section.save();
    }

    await course.save();
    console.log(`✅ Created course: ${course.title}`);
  }

  console.log("Common Words courses seeded successfully ✅");
  process.exit();
};

seed();

