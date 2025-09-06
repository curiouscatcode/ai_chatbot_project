require("dotenv").config();
const express = require("express");
const app = express();
const pool = require("./db");
const cors = require("cors");
// app.use(cors());

// app.use(
//   cors({
//     origin:
//       "https://684d4ae8f9b8ab379ab05064--relaxed-salamander-50b4a5.netlify.app",
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     credentials: true, // optional if using cookies
//   })
// );

const allowedOrigins = ["https://relaxed-salamander-50b4a5.netlify.app"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman / server requests
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// app.use(
//   cors({
//     origin:
//       "https://684d4ae8f9b8ab379ab05064--relaxed-salamander-50b4a5.netlify.app",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true,
//   })
// );

// app.options("*", cors());

//Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("ai_chatbot_project API is running !");
});

// app.get("/test-db", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT NOW()");
//     res.json({ success: true, time: result.rows[0].now });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
