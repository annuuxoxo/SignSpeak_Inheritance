import mongoose from "mongoose";
import dotenv from "dotenv";

import Course from "../models/Course.js";
import Section from "../models/Section.js";
import Lecture from "../models/Lecture.js";

dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("DB connected for ASL seeding");

  await Course.deleteMany();
  await Section.deleteMany();
  await Lecture.deleteMany();

  const courses = [
    /* ===================== 1. BASICS ===================== */
    {
      title: "Basics",
      complexity: "Beginner",
      sections: [
        {
          title: "Introduction to ASL",
          lectures: [
            { title: "What is ASL?", type: "video" },
            { title: "Deaf Culture Overview", type: "video" }
          ]
        },
        {
          title: "Core Foundations",
          lectures: [
            { title: "Facial Expressions in ASL", type: "video" },
            { title: "Dominant Hand Usage", type: "image" },
            { title: "Signing Space", type: "image" }
          ]
        }
      ]
    },

    /* ===================== 2. ALPHABET 1 ===================== */
    {
      title: "Alphabet 1",
      complexity: "Beginner",
      sections: [
        {
          title: "Fingerspelling A–M",
          lectures: [
            { title: "Letter A", type: "image" },
            { title: "Letter B", type: "image" },
            { title: "Letter C", type: "image" },
            { title: "Letter D", type: "image" },
            { title: "Letter E", type: "image" },
            { title: "Letter F", type: "image" },
            { title: "Letter G", type: "image" },
            { title: "Letter H", type: "image" },
            { title: "Letter I", type: "image" },
            { title: "Letter J", type: "image" },
            { title: "Letter K", type: "image" },
            { title: "Letter L", type: "image" },
            { title: "Letter M", type: "image" }
          ]
        }
      ]
    },

    /* ===================== 3. ALPHABET 2 ===================== */
    {
      title: "Alphabet 2",
      complexity: "Beginner",
      sections: [
        {
          title: "Fingerspelling N–Z",
          lectures: [
            { title: "Letter N", type: "image" },
            { title: "Letter O", type: "image" },
            { title: "Letter P", type: "image" },
            { title: "Letter Q", type: "image" },
            { title: "Letter R", type: "image" },
            { title: "Letter S", type: "image" },
            { title: "Letter T", type: "image" },
            { title: "Letter U", type: "image" },
            { title: "Letter V", type: "image" },
            { title: "Letter W", type: "image" },
            { title: "Letter X", type: "image" },
            { title: "Letter Y", type: "image" },
            { title: "Letter Z", type: "image" }
          ]
        }
      ]
    },

    /* ===================== 4. STATIC SIGNS ===================== */
    {
      title: "Everyday Static Signs",
      complexity: "Intermediate",
      sections: [
        {
          title: "People & Relationships",
          lectures: [
            { title: "Family", type: "image" },
            { title: "Boy", type: "image" },
            { title: "Student", type: "image" }
          ]
        },
        {
          title: "Places",
          lectures: [
            { title: "Museum", type: "image" },
            { title: "Bookstore", type: "image" },
            { title: "Address", type: "image" }
          ]
        },
        {
          title: "Objects",
          lectures: [
            { title: "Mouse", type: "image" },
            { title: "Dictionary", type: "image" },
            { title: "Desk", type: "image" }
          ]
        }
      ]
    },

    /* ===================== 5. DYNAMIC SIGNS ===================== */
    {
      title: "Dynamic ASL Expressions",
      complexity: "Advanced",
      sections: [
        {
          title: "Actions",
          lectures: [
            { title: "Walk", type: "video" },
            { title: "Come Here", type: "video" },
            { title: "Wear", type: "video" }
          ]
        },
        {
          title: "Emotions",
          lectures: [
            { title: "Joy", type: "video" },
            { title: "Emotion", type: "video" },
            { title: "Honest", type: "video" }
          ]
        },
        {
          title: "Movement & Direction",
          lectures: [
            { title: "Come Here", type: "video" },
            { title: "Up", type: "video" },
            { title: "Down", type: "video" }
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
          description: `ASL gesture for ${lec.title}`,
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
  }

  console.log("FINAL ASL seed completed ✅");
  process.exit();
};

seed();
