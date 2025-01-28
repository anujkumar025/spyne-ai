"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("./db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
const middleware_1 = require("./middleware");
dotenv_1.default.config();
const PORT = process.env.PORT;
const JWT_PASSWORD = process.env.JWT_PASSWORD;
const app = (0, express_1.default)();
if (!JWT_PASSWORD) {
    throw new Error("JWT_PASSWORD is not defined in environment variables.");
}
app.use(express_1.default.json());
// Multer setup for file uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed"));
        }
        cb(null, true);
    },
}).array("images", 10); // Maximum 10 images
app.post("/api/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const username = req.body.username;
    const password = req.body.password;
    console.log(username + password);
    try {
        yield db_1.User.create({
            username,
            password
        });
        res.json({
            message: "User signed up"
        });
    }
    catch (e) {
        res.status(411).json({
            message: "User already exist"
        });
    }
}));
app.post("/api/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const username = req.body.username;
    const password = req.body.password;
    const userExist = yield db_1.User.findOne({
        username,
        password
    });
    if (userExist) {
        const token = jsonwebtoken_1.default.sign({
            id: userExist._id
        }, JWT_PASSWORD);
        res.json({
            token
        });
    }
    else {
        res.status(403).json({
            message: "Incorrect credentials"
        });
    }
}));
// API to add a outdicar
app.post("/api/createcars", middleware_1.userMiddleware, (req, res) => {
    upload(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        const { title, description, tags } = req.body;
        const userId = req.userId;
        // Validation
        if (!title || !description || !tags || !tags.carType || !tags.company || !tags.dealer) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const imageFiles = req.files || [];
        const imageUrls = imageFiles.map((file) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`);
        if (imageUrls.length > 10) {
            return res.status(400).json({ message: "You can upload up to 10 images" });
        }
        try {
            // Create a new car entry
            const newCar = new db_1.Car({
                title,
                description,
                images: imageUrls,
                tags,
                owner: userId,
            });
            yield newCar.save();
            res.status(201).json({ message: "Car added successfully", car: newCar });
        }
        catch (error) {
            console.error("Error adding car:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }));
});
app.get("/api/cars", middleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId; // Get the authenticated user's ID
    try {
        // Query the database to find cars owned by the authenticated user
        const cars = yield db_1.Car.find({ owner: userId }, "title description tags");
        res.status(200).json({
            message: "Cars retrieved successfully",
            cars,
        });
    }
    catch (error) {
        console.error("Error retrieving cars:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
app.put("/api/cars/:carId", middleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const carId = req.params.carId;
    const userId = req.userId;
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
        const car = yield db_1.Car.findOne({ _id: carId, owner: userId });
        if (!car) {
            res.status(404).json({ message: "Car not found or you do not have permission to update it." });
            return;
        }
        // Update car details
        if (title)
            car.title = title;
        if (description)
            car.description = description;
        if (tags)
            car.tags = Object.assign(Object.assign({}, car.tags), tags); // Merge new tags with existing tags
        yield car.save();
        res.json({
            message: "Car details updated successfully",
            car: {
                title: car.title,
                description: car.description,
                tags: car.tags,
            },
        });
    }
    catch (error) {
        console.error("Error updating car:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
app.listen(PORT, () => {
    console.log("started at port ", PORT);
});
