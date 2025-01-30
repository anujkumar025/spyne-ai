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
import cors from "cors";

dotenv.config();

const PORT = process.env.PORT;
const JWT_PASSWORD = process.env.JWT_PASSWORD;
const app = express();
app.use(cors({
  origin: 'http://localhost:3000', // Your client origin
  credentials: true
}));
// Add this to your Express app setup

if (!JWT_PASSWORD) {
    throw new Error("JWT_PASSWORD is not defined in environment variables.");
}

const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory as buffers
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));



app.post("/api/signup", async (req: Request, res: Response) => {
  const username = req.body.username;
  const password = req.body.password;

  
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
app.post("/api/createcars", upload.array('images'), userMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, tags } = req.body;
    const files = req.files as Express.Multer.File[];
    const userId = (req as any).userId;

    // Validation
    if (!title || !description || !tags || !tags.carType || !tags.company || !tags.dealer) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    // Extract buffers from files
    const images = files.map(file => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`);

    if (images.length > 10) {
      res.status(400).json({ message: "Maximum 10 images allowed" });
      return;
    }

    const newCar = new Car({
      title,
      description,
      images, // Store binary buffers directly
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

app.put("/api/cars/test-route", (req, res) => {
  res.json({ message: "PUT endpoint works!" });
});


app.put(
  "/api/cars/:carId",
  upload.array('images'),
  userMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const carId = req.params.carId;
    const userId = (req as any).userId;
    const { title, description, tags } = req.body;
    const files = req.files as Express.Multer.File[];

    try {
      // Validate at least one field is provided
      const hasUpdates = title || description || tags || (files && files.length > 0);
      if (!hasUpdates) {
        res.status(400).json({
          message: "At least one field (title, description, tags, images) must be provided for update.",
        });
        return;
      }

      // Find the car with ownership check
      const car = await Car.findOne({ _id: carId, owner: userId });
      if (!car) {
        res.status(404).json({ message: "Car not found or no permission to update" });
        return;
      }

      // Process images if any
      if (files && files.length > 0) {
        const newImages = files.map(file => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`);
        const updatedImages = [...car.images, ...newImages];
        
        // Validate total images count
        if (updatedImages.length > 10) {
          res.status(400).json({ message: "Maximum 10 images allowed" });
          return;
        }
        car.images = updatedImages;
      }

      // Update other fields
      if (title) car.title = title;
      if (description) car.description = description;
      if (tags) {
        // Merge tags while preserving existing values
        car.tags = {
          carType: tags.carType || car.tags.carType,
          company: tags.company || car.tags.company,
          dealer: tags.dealer || car.tags.dealer
        };
      }

      await car.save();

      // Prepare response without binary data
      const responseCar = {
        _id: car._id,
        title: car.title,
        description: car.description,
        tags: car.tags,
        images: car.images.map((_, index) => ({
          id: index,
          url: `/api/cars/${carId}/images/${index}` // Endpoint to retrieve images
        })),
        owner: car.owner,
        createdAt: car.createdAt,
        updatedAt: car.updatedAt
      };

      res.json({
        message: "Car updated successfully",
        car: responseCar
      });

    } catch (error) {
      console.error("Error updating car:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);


app.get("/api/cars/search", userMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId; // Get the authenticated user's ID
  const { keyword } = req.query;

  // Validate query parameter
  if (!keyword || typeof keyword !== "string") {
    res.status(400).json({
      message: "Keyword is required for search.",
    });
    return;
  }

  try {
    // Search for cars owned by the user where title, description, or tags match the keyword
    const cars = await Car.find({
      owner: userId,
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { "tags.carType": { $regex: keyword, $options: "i" } },
        { "tags.company": { $regex: keyword, $options: "i" } },
        { "tags.dealer": { $regex: keyword, $options: "i" } },
      ],
    }).select("title description tags"); // Return only specific fields

    res.json({
      message: "Search results",
      results: cars,
    });
  } catch (error) {
    console.error("Error during search:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


app.get("/api/cars/:carId", userMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId; // Extract authenticated user ID
  const { carId } = req.params;

  try {
    // Fetch the car by ID and ensure it belongs to the authenticated user
    const car = await Car.findOne({ _id: carId, owner: userId }, "title description tags images");

    if (!car) {
      res.status(404).json({ message: "Car not found or you do not have access to this car." });
      return;
    }

    res.json({
      message: "Car details fetched successfully",
      car,
    });
  } catch (error) {
    console.error("Error fetching car details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


  
app.delete("/api/cars/:carId", userMiddleware, async (req: Request, res: Response): Promise<void> => {
  // console.log("DELETE request received for car:", req.params.carId);
  // console.log("Authenticated user ID:", (req as any).userId);

  const userId = (req as any).userId;
  const { carId } = req.params;

  try {
    const car = await Car.findOne({ _id: carId, owner: userId });
    if (!car) {
      console.log("Car not found or unauthorized");
      res.status(404).json({ message: "Car not found or you do not have access to delete this car." });
      return;
    }

    await Car.deleteOne({ _id: carId });
    // console.log("Car deleted successfully");

    res.json({ message: "Car deleted successfully", carId });
  } catch (error) {
    console.error("Error deleting car:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});



app.listen(PORT, ()=>{
    console.log("started at port ", PORT);
})