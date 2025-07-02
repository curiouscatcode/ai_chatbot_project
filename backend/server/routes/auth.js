const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// POST/register (signin)
router.post("/register", async (req, res) => {
  // 1. req.body: destructuring
  const { email, password } = req.body;
  // 2. edge case 01
  if (!email || !password) {
    return res.status(400).json({
      error: "All fields required !",
    });
  }
  // try & catch
  try {
    // 3. edge case 02: check if user already exists
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({
        error: "Email already registered !",
      });
    }

    // 4. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Insert into DB
    const newUser = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
      [email, hashedPassword]
    );

    // 6. Generate token after user created
    const token = jwt.sign(
      {
        userId: newUser.rows[0].id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // 7. Send response with token
    res.status(201).json({
      message: "User created successfully!",
      token: token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error !",
    });
  }
});

// POST /login (Checking for login)
router.post("/login", async (req, res) => {
  // console.log("Login hit");
  // res.status(200).json({ message: "Backend is alive" });
  // 1. req.body: destructuring
  const { email, password } = req.body;

  // 2. edge case 01: all fields required
  if (!email || !password) {
    return res.status(400).json({
      error: "All fields required !",
    });
  }

  // try & catch
  try {
    // 3. edge case 02: check if user exists
    const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (userRes.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid credentials. No user exists with this email Id !",
      });
    }

    // 4. extract user data
    const user = userRes.rows[0];

    // 5. compare the entered password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);

    // 6. If password does not match, return error
    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid credentials. Password does not matches.",
      });
    }

    // 7. Create token
    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // 8. response
    res.status(200).json({
      message: "Login successful !",
      token: token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error !",
    });
  }
});

// PROTECTED ROUTES: DASHBOARD
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    // 1. Extract userId from JWT token
    // (which is already added to req.user by requireAuth)
    const userId = req.user.id;

    // 2. global variable & select query db
    const result = await pool.query(
      "SELECT id, email FROM users WHERE id = $1",
      [userId]
    );

    //3. If user not found, send error
    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "User not found !",
      });
    }

    // 4. response
    res.status(200).json({
      message: "Welcome to your dashboard !",
      user: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error !",
    });
  }
});

// Initialize the generative ai client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/chat", requireAuth, async (req, res) => {
  try {
    console.log(req.body);
    // 1. Get the user prompt from the request body: the body is {prompt: newUserMessage.text}
    // A. Also, extracvt chatId from body since we need them in storing chat in db
    const { prompt, chatId } = req.body;

    // 2. edge case 01: no prompt
    if (!prompt) {
      return res.status(400).json({
        message: "Prompt is required !",
      });
    }

    // edge case: Ensure chatId is present
    if (!chatId) {
      return res.status(400).json({
        message: "Chat ID is required to save messages!",
      });
    }

    const userId = req.user.id;

    // B. Use your db pool
    const pool = require("../db");

    // C. Confirm chat exists and belongs to the user
    const chatCheck = await pool.query(
      "SELECT id, title FROM chats WHERE id = $1 AND user_id = $2",
      [chatId, userId]
    );

    // console.log(chatCheck);

    // check to see if a chat with a given chatId exists in your database
    if (chatCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Chat not found or unauthorized." });
    }

    // extract the current title of the chat
    const currentChatTitle = chatCheck.rows[0].title;
    console.log(currentChatTitle);

    // D. Save the user propmt into the messages table
    await pool.query(
      "INSERT INTO messages (chat_id, sender, text) VALUES ($1, $2, $3)",
      [chatId, "user", prompt]
    );

    // 3. variable and using gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 4. result variable
    const result = await model.generateContent(prompt);
    // console.log("result: ", result);
    const response = await result.response;
    // console.log("response: ", response);
    // 5. this is the actual text generated by gemini
    const aiResponseText = response.text();
    // console.log("text: ", aiResponseText);

    // E. Save bot response into messages table
    await pool.query(
      "INSERT INTO messages (chat_id, sender, text) VALUES ($1, $2, $3)",
      [chatId, "bot", aiResponseText]
    );

    // Logic for auto renaming the title ( we already have got currentChatTitle)
    // This variable will hold the new title if one is generated
    let newChatTitle = null; // initially null

    // Condition 1: Check if the chat still has its default "New Chat" title
    if (currentChatTitle === "New Chat") {
      // Condition 2: Count the total messages in this chat
      // We'll rename the chat afte rthe first user message + first bot response (2 messages total)
      const messageCountResult = await pool.query(
        "SELECT COUNT(*) FROM messages WHERE chat_id = $1",
        [chatId]
      );
      // convert the count into integer
      const messageCount = parseInt(messageCountResult.rows[0].count, 10);
      console.log(`Message count for chat ${chatId}: ${messageCount}`);

      // if condition
      if (messageCount === 2) {
        console.log(
          "Message count is 2. Attempting title generation from Gemini."
        );
        try {
          // Fetch the actual two messages to provide context for title generation
          const conversationHistory = await pool.query(
            "SELECT sender, text FROM messages WHERE chat_id = $1 ORDER BY id ASC LIMIT 2",
            [chatId]
          );

          let summaryContext = "";
          if (conversationHistory.rows.length === 2) {
            // Combine the first user message and the bot's response for Gemini's context
            summaryContext = `User: "${conversationHistory.rows[0].text}" | Bot: "${conversationHistory.rows[1].text}"`;
          } else {
            // Fallback, though this path should ideally not be hit if messageCount is 2
            summaryContext = prompt; // Just use the current prompt as context
          }

          // Prompt Gemini to generate a title
          const titleGenerationModel = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
          });
          const titlePrompt = `Generate a very short, concise, and descriptive title (max 5 words) for the following conversation snippet. Respond only with the title, no extra text.
          Conversation Snippet: "${summaryContext}"`;

          const titleResult = await titleGenerationModel.generateContent(
            titlePrompt
          );

          // Get the response object first, then it's text
          const titleResponseObject = titleResult.response;
          let generatedTitle = titleResponseObject.text().trim();
          console.log("Raw generated title from Gemini: ", generatedTitle);

          // Clean up common AI artifacts (e.g., extra quotes, "Title: " prefix, trailing period)
          generatedTitle = generatedTitle.replace(/^"|"$/g, "");
          generatedTitle = generatedTitle.replace(/Title: /i, "");
          generatedTitle = generatedTitle.replace(/\.$/, "");

          if (generatedTitle) {
            // Update the chat's title in db
            await pool.query(
              "UPDATE chats SET title = $1 WHERE id = $2 AND user_id = $3",
              [generatedTitle, chatId, userId]
            );
            // store the new title to send to the frontend
            newChatTitle = generatedTitle;
          }
        } catch (titleGenError) {
          console.error(
            "Error generating or updating chat title:",
            titleGenError
          );
        }
      }
    }

    // 6. final response to frontend in json: reply and chat title
    res.status(200).json({ reply: aiResponseText, newChatTitle: newChatTitle });
    // console.log(res, text);

    // Till here both the user input and bot messages are done. Right ? Do we need to write here or do i we need a counter to keep the count of how many times the input response cycle has happened and once it's happened for let say 3 times, auto rename the title. So, i am confused where to write the logic.
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({
      message: "Failed to get a response from the AI.",
      error: error.message,
    });
  }
});

router.post("/chat/new", requireAuth, async (req, res) => {
  try {
    // 1. req.body
    const { title } = req.body;
    // 2. req.user.id
    const userId = req.user.id;
    // 3. global variable and insert into command
    const result = await pool.query(
      "INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING *",
      [userId, title || "New Chat"]
    );

    // 4. response
    res.status(201).json({ chat: result.rows[0] });
  } catch (error) {
    console.error("Error creating chat: ", error);
    res.status(500).json({ message: "Failed to create chat " });
  }
});

// GET /chats - fetch past chats for the logged-in user
router.get("/chats", requireAuth, async (req, res) => {
  try {
    // get user id
    const userId = req.user.id;
    // get chat
    const chatList = await pool.query(
      "SELECT id, title FROM chats WHERE user_id = $1 ORDER BY id DESC",
      [userId]
    );
    // respond
    res.json({ chats: chatList.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Error fetching chats" });
  }
});

// New route: GET /chats/:chatId/messages - fetch messages for a specific chat
router.get("/chats/:chatId/messages", requireAuth, async (req, res) => {
  try {
    // 1. req.params
    const { chatId } = req.params;
    // 2. extract user.id from authenticated token
    const userId = req.user.id;

    // 3. global variable and checking whether chat belongs to authenticated user
    const chatCheck = await pool.query(
      "SELECT id FROM chats WHERE id = $1 AND user_id = $2",
      [chatId, userId]
    );

    // 4. if no chat found
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Chat not found or unauthorized.",
      });
    }

    // 5. If authorized, fetch the messages for that chat
    const messages = await pool.query(
      "SELECT sender, text FROM messages WHERE chat_id = $1 ORDER BY id ASC",
      [chatId]
    );

    // 6. response
    res.json({ messages: messages.rows });
  } catch (err) {
    console.error("Error fetching messages for chat:", err.message);
    res.status(500).json({ message: "Error fetching chat messages" });
  }
});

// Rename option route : PUT request
// /auth/chats/:chatId
router.put("/chats/:chatId", requireAuth, async (req, res) => {
  try {
    // 1. req.params: Get chatId from URL
    const { chatId } = req.params;
    // 2. req.body: New Title
    const { newTitle } = req.body;
    // 3. get user.id from authentication
    const userId = req.user.id;

    // 4. edge case
    if (!newTitle || newTitle.trim() === "") {
      return res.status(400).json({ message: "New title cannot be empty." });
    }

    // 5. verify that the chat exists and belongs to the authenticated user
    const chatCheck = await pool.query(
      "SELECT id FROM chats WHERE id = $1 AND user_id = $2",
      [chatId, userId]
    );

    if (chatCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Chat not found or unauthorized." });
    }

    // 6. Update the chat title
    const updateResult = await pool.query(
      "UPDATE chats SET title = $1 WHERE id = $2 AND user_id = $3 RETURNING id, title",
      [newTitle.trim(), chatId, userId]
    );

    if (updateResult.rows.length === 0) {
      // This case should ideally not be hit if chatCheck passed, but good for robustness
      return res
        .status(404)
        .json({ message: "Chat not found or failed to update." });
    }

    // 7. response
    res.status(200).json({
      message: "Chat title updated successfully.",
      chat: updateResult.rows[0],
    });
  } catch (error) {}
});

// DELETE: route for deleting a chat
router.delete("/chats/:chatId", requireAuth, async (req, res) => {
  // 1. req.params
  const chatId = req.params.chatId;
  // 2. Get userid from middleware
  const userId = req.user.id;

  // 3. edge case: No chat with given exists
  if (!chatId) {
    return res.status(400).json({ message: "Chat ID is required" });
  }

  try {
    // 4. check if the chat belongs to the authenticated user
    const chatCheck = await pool.query(
      "SELECT id FROM chats WHERE id = $1 AND user_id = $2",
      [chatId, userId]
    );
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Chat not found or you do not have permission to delete it !",
      });
    }

    // 5. Delete all messages associated with this chat
    // (It's important to delete messages first if the have a foreign key constraint ot chats)
    await pool.query("DELETE FROM messages WHERE chat_id = $1", [chatId]);

    // 6. Delete the chat itself
    const deleteChatResult = await pool.query(
      "DELETE FROM chats WHERE id = $1 AND user_id = $2 RETURNING id",
      [chatId, userId]
    );

    if (deleteChatResult.rows.length === 0) {
      // This case should ideally not happen if the chatCheck passed,
      // but it's a good safeguard.
      return res.status(404).json({
        message: "Chat could not be deleted (might have been removed already.)",
      });
    }

    // 7. response
    res.status(200).json({
      message: "Chat and associated messages deleted successfully.",
      deletedChatId: deleteChatResult.rows[0].id,
    });
  } catch (error) {
    console.error("Error deleting chat: ", error);
    res.status(500).json({ message: "Server error during chat deletion." });
  }
});

module.exports = router;
