import mongoose from 'mongoose';
export const connectDB=async()=>{
    await mongoose.connect('mongodb+srv://dineshkottakota:Dinesh123@cluster0.b1tvdev.mongodb.net/food-del').then(()=>console.log("DB Connnected"));
}

