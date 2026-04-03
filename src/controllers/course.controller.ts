import Course from "../models/Course.js";

// CREATE
export const createCourse = async (req: any, res: any) => {
  try {
    const course = await Course.create({
      ...req.body,
      tutor: req.user.id,
    });

    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: "Error creating course" });
  }
};

// GET MY COURSES
export const getMyCourses = async (req: any, res: any) => {
  try {
    const courses = await Course.find({ tutor: req.user.id });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: "Error fetching courses" });
  }
};

// UPDATE
export const updateCourse = async (req: any, res: any) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(course);
  } catch (err) {
    res.status(500).json({ message: "Error updating course" });
  }
};

// DELETE
export const deleteCourse = async (req: any, res: any) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: "Course deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting course" });
  }
};