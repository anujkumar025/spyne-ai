declare global {
    namespace Express {
        export interface Request {
            userId?: string;
        }
    }
}


import express, { Request, Response } from "express";
import {User, Car} from './db';
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import { userMiddleware } from "./middleware";

dotenv.config();

const PORT = process.env.PORT;
const JWT_PASSWORD = process.env.JWT_PASSWORD;
const app = express();

if (!JWT_PASSWORD) {
    throw new Error("JWT_PASSWORD is not defined in environment variables.");
}

app.use(express.json());

// Multer setup for file uploads
const storage = multer.memoryStorage();
interface MulterFile extends Express.Multer.File {
    buffer: Buffer;
}

interface MulterRequest extends Express.Request {
    files: MulterFile[];
}

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
    fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed"));
        }
        cb(null, true);
    },
}).array("images", 10); // Maximum 10 images

app.post("/api/signup", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    console.log(username + password);
    
    try{
        await User.create({
            username,
            password
        })
        
        res.json({
            message: "User signed up"
        });
    }
    catch(e){
        res.status(411).json({
            message: "User already exist"
        })
    }
    
})

app.post("/api/signin", async (req, res) => {
    const username = req.body.username;   
    const password = req.body.password;

    const userExist = await User.findOne({
        username,
        password
    })
    
    if(userExist){
        const token = jwt.sign({
            id: userExist._id
        }, JWT_PASSWORD)

        res.json({
            token
        })
    }
    else{
        res.status(403).json({
            message: "Incorrect credentials"
        })
    }
})


// API to add a outdicar
app.post("/api/createcars", userMiddleware, (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    const { title, description, tags } = req.body;
    const userId = (req as any).userId;

    // Validation
    if (!title || !description || !tags || !tags.carType || !tags.company || !tags.dealer) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const imageFiles = (req.files as Express.Multer.File[]) || [];
    const imageUrls = imageFiles.map((file) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`);

    if (imageUrls.length > 10) {
      return res.status(400).json({ message: "You can upload up to 10 images" });
    }

    try {
      // Create a new car entry
      const newCar = new Car({
        title,
        description,
        images: imageUrls,
        tags,
        owner: userId,
      });

      await newCar.save();

      res.status(201).json({ message: "Car added successfully", car: newCar });
    } catch (error) {
      console.error("Error adding car:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
});


app.get("/api/cars", userMiddleware, async (req: Request, res: Response) => {
    const userId = (req as any).userId; // Get the authenticated user's ID
  
    try {
      // Query the database to find cars owned by the authenticated user
      const cars = await Car.find({ owner: userId }, "title description tags");
  
      res.status(200).json({
        message: "Cars retrieved successfully",
        cars,
      });
    } catch (error) {
      console.error("Error retrieving cars:", error);
      res.status(500).json({ message: "Internal server error" });
    }
});
  


app.put("/api/cars/:carId", userMiddleware, async (req: Request, res: Response): Promise<void> => {
    const carId = req.params.carId;
    const userId = (req as any).userId;
    const { title, description, tags } = req.body;
  
    // Validate input
    if (!title && !description && !tags) {
      res.status(400).json({
        message: "At least one field (title, description, tags) must be provided for update.",
      });
      return;
    }
  
    try {
      // Find the car and ensure it belongs to the user
      const car = await Car.findOne({ _id: carId, owner: userId });
  
      if (!car) {
        res.status(404).json({ message: "Car not found or you do not have permission to update it." });
        return;
      }
  
      // Update car details
      if (title) car.title = title;
      if (description) car.description = description;
      if (tags) car.tags = { ...car.tags, ...tags }; // Merge new tags with existing tags
  
      await car.save();
  
      res.json({
        message: "Car details updated successfully",
        car: {
          title: car.title,
          description: car.description,
          tags: car.tags,
        },
      });
    } catch (error) {
      console.error("Error updating car:", error);
      res.status(500).json({ message: "Internal server error" });
    }
});


  


app.listen(PORT, ()=>{
    console.log("started at port ", PORT);
})