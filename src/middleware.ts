import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload }  from "jsonwebtoken";


const JWT_PASSWORD = process.env.JWT_PASSWORD;

if (!JWT_PASSWORD) {
    throw new Error("JWT_PASSWORD is not defined in environment variables.");
}


export const userMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers["authorization"];
    const decoded = jwt.verify(header as string, JWT_PASSWORD);

    if(decoded){
        req.userId = (decoded as JwtPayload).id;
        next();
    }else{
        res.status(403).json({
            message: "You are not logged in."
        })
    }
}