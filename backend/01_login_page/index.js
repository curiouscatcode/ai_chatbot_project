require("dotenv").config();
const express = require("express");
const app = express();
const pool = require("./db");
const cors = require("cors");
app.use(cors());

//Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("ai_chatbot_project API is running !");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
