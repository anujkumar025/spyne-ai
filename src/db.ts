import mongoose, { Document, Schema, Model } from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const DATABASE: string = process.env.DATABASE || "default_url";

const connect = mongoose.connect(DATABASE);

connect.then(() => {
    console.log("Connected to database.");
}).catch((err) => {
    console.log("some error occured");
})


// User Interface
interface IUser extends Document {
  username: string;
  // email: string;
  password: string; // Hashed password
  // createdAt: Date;
}

// Car Interface
interface ICar extends Document {
  title: string;
  description: string;
  images: string[]; // Array of image URLs
  tags: {
    carType: string;
    company: string;
    dealer: string;
  };
  owner: mongoose.Types.ObjectId; // Reference to User
  createdAt: Date;
  updatedAt: Date;
}

// User Schema
const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 8}, 
});

// Car Schema
const carSchema = new Schema<ICar>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  images: {
    type: [String],
    validate: {
      validator: (val: string[]) => val.length <= 10,
      message: "Images array exceeds the limit of 10",
    },
  },
  tags: {
    carType: { type: String, required: true },
    company: { type: String, required: true },
    dealer: { type: String, required: true },
  },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Middleware to update the updatedAt field
carSchema.pre<ICar>("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Index for search functionality
carSchema.index({
  title: "text",
  "tags.carType": "text",
  "tags.company": "text",
  "tags.dealer": "text",
});

// Models
const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
const Car: Model<ICar> = mongoose.model<ICar>("Car", carSchema);

export { User, Car, IUser, ICar };
