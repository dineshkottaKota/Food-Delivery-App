import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import foodRouter from './routes/foodRoute.js';
import userRouter from './routes/userRoute.js';
import cartRouter from './routes/cartRoute.js';
import 'dotenv/config'
import orderRouter from './routes/orderRoute.js';
const app=express();
const PORT = process.env.PORT || 3000;


//middleware
app.use(express.json());
app.use(cors({
  origin: ['https://food-delivery-app-2-d0pf.onrender.com'], // Your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  credentials: true, // Allow cookies/auth tokens if needed
}));


//db connection
connectDB();

//api endpoints
app.use("/api/food",foodRouter);
app.use("/images",express.static('uploads'))
app.use("/api/user",userRouter)
app.use("/api/cart",cartRouter)
app.use("/api/order",orderRouter)

app.get("/",(req,res)=>{
    res.send('API working');
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
