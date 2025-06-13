import React from "react";
import { useState, useEffect, useRef, useContext } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  // Initialize your chat messages state
  const [messages, setMessages] = useState([]); // initially, empty array
  // state for input
  const [currentInput, setCurrentInput] = useState(""); // Initially, empty
  // state to display any errors
  const [error, setError] = useState(null);
  // state for loading animation
  const [isLoading, setIsLoading] = useState(false); // initially false
  // state for chatId
  const [currentChatId, setCurrentChatId] = useState(null);
  // state for chats
  const [chats, setChats] = useState([]);

  // New state for context menu
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [selectedChatForMenu, setSelectedChatForMenu] = useState(null); // Stores the chat object right-clicked

  // --- ADD THIS handleContextMenu FUNCTION ---
  const handleContextMenu = (e, chat) => {
    console.log("Right-click event triggered on chat:", chat.title, e); // <-- ADD THIS LINE
    e.preventDefault(); // Prevent the default browser context menu
    setSelectedChatForMenu(chat);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // --- ADD THIS useEffect to close context menu on outside click ---
  useEffect(() => {
    const handleClickOutside = () => {
      if (showContextMenu) {
        setShowContextMenu(false);
        setSelectedChatForMenu(null); // Clear selected chat when menu closes
      }
    };

    // Attach event listener to the document body
    document.addEventListener("click", handleClickOutside);

    // Cleanup event listener when the component unmounts or showContextMenu changes to false
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showContextMenu]); // Dependency array: re-run this effect when showContextMenu changes

  // Rename function
  const handleRenameTitle = async () => {
    if (!selectedChatForMenu) return; // Safeguard

    // Hide the context menu immediately
    setShowContextMenu(false);

    // Use the built-in prompt for quick testing. For better UX, you might use a modal later.
    const newTitle = prompt(
      "Enter new title for the chat:",
      selectedChatForMenu.title
    );

    if (newTitle === null || newTitle.trim() === "") {
      // User cancelled the prompt or entered an empty/whitespace-only title
      console.log("Rename cancelled or empty title entered.");
      return;
    }

    try {
      const response = await fetch(
        `https://ai-chatbot-project-3.onrender.com/auth/chats/${selectedChatForMenu.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ newTitle: newTitle.trim() }), // Send the trimmed new title
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to rename chat.");
      }

      const data = await response.json(); // Backend sends back { message, chat: { id, title } }
      console.log("Chat renamed successfully:", data.chat);

      // Update the frontend state to reflect the new title
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === selectedChatForMenu.id
            ? { ...chat, title: data.chat.title }
            : chat
        )
      );

      setError(null); // Clear any previous error messages
    } catch (err) {
      console.error("Error renaming chat:", err);
      setError(
        err.message || "An unexpected error occurred while renaming chat."
      );
    } finally {
      setSelectedChatForMenu(null); // Clear selected chat after operation
    }
  };

  // console.log(messages);
  // console.log(setMessages);
  // handleSendMessage

  // Create bottomRef to create the reference for latest message so that we can use useEffect() to scroll to latest message.
  const bottomRef = useRef(null);

  // useEffect to scroll whenever messages update
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 1. create a new chat and store the chatId
  // NEW: Function to fetch messages for a specific chat
  const fetchMessages = async (chatId) => {
    if (!chatId) return; // Prevent fetching for null or undefined chatId
    try {
      setError(null); // Clear previous errors
      setMessages([]); // Clear current messages while loading new chat
      const res = await fetch(
        `https://ai-chatbot-project-3.onrender.com/auth/chats/${chatId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch chat messages.");
      }
      const data = await res.json();
      setMessages(data.messages);
    } catch (err) {
      console.error("Failed to fetch chat messages:", err);
      setError(err.message || "Failed to load chat history.");
    }
  };

  // For loading chat history
  // 1. Initial Load: Fetch all chats and set an initial currentChatId
  useEffect(() => {
    const fetchAllChatsAndSetInitial = async () => {
      try {
        const res = await fetch(
          "https://ai-chatbot-project-3.onrender.com/auth/chats",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to fetch chat list.");
        }
        const data = await res.json();
        setChats(data.chats);

        // If there are existing chats, load the most recent one (first in list)
        // or a default if you prefer
        if (data.chats.length > 0) {
          const latestChatId = data.chats[0].id; // Assuming latest is first due to ORDER BY DESC
          setCurrentChatId(latestChatId);
          await fetchMessages(latestChatId); // Load messages for this chat
        } else {
          // If no chats exist, automatically create a new one
          await createNewChat();
        }
      } catch (err) {
        console.error(
          "Error fetching initial chats or creating new chat:",
          err
        );
        setError(err.message || "Could not load initial chat data.");
      }
    };
    fetchAllChatsAndSetInitial();
  }, []); // Run once on component mount

  // 2. Create a new chat and store the chatId
  const createNewChat = async () => {
    try {
      setError(null); // Clear previous errors
      setIsLoading(true); // Indicate loading for new chat creation
      const res = await fetch(
        "https://ai-chatbot-project-3.onrender.com/auth/chat/new",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ title: "New Chat" }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Chat creation failed.");
      }

      const data = await res.json();
      setChats([data.chat, ...chats]); // Add new chat to the top of the list
      setCurrentChatId(data.chat.id); // IMPORTANT: Use data.chat.id, not _id as _id is from MongoDB
      setMessages([]); // Clear chat area for the new chat
    } catch (err) {
      console.error("Chat creation failed:", err);
      setError(err.message || "Failed to create a new chat.");
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  const handleSendMessage = async () => {
    // prevent sending empty array
    if (currentInput.trim() === "") return;

    // 1. Add user message to message sender: object
    const newUserMessage = { sender: "user", text: currentInput };
    // update the function
    setMessages((prevMessages) => {
      return [...prevMessages, newUserMessage];
    });

    // 2. Clear the input field
    setCurrentInput("");

    setError(null); // clear any previous errors
    // 3. (Next step) call your backend API to get a gemini response

    try {
      // 0. show a loading animation
      setIsLoading(true);
      // 1. call the backend api with user's message
      // fetch has two arguments: (link, data)
      const response = await fetch(
        "https://ai-chatbot-project-3.onrender.com/auth/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            prompt: newUserMessage.text,
            chatId: currentChatId, // Ensure this is always set from state
          }),
        }
      );

      // edge case
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to get response from bot."
        );
      }

      // turn off loading animation
      setIsLoading(false);
      const data = await response.json(); // Parse the JSON response from the backend
      const botMessage = { sender: "bot", text: data.reply }; // Extract the bot's reply from the response

      // Add the bot's message to the chat history
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      // New logic to display the auto-generated title
      if (data.newChatTitle && currentChatId) {
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === currentChatId
              ? { ...chat, title: data.newChatTitle }
              : chat
          )
        );
        console.log("Chat title updated in frontend state:", data.newChatTitle); // Debug log for frontend
      }
    } catch (err) {
      console.error("API call error:", err); // Log the error to console
      setError(err.message || "An unexpected error occurred."); // Set error state to display in UI
      // You might want to remove the user's last message if the bot failed to respond
      // setMessages(prevMessages => prevMessages.slice(0, -1));
    }
  };

  // // dynamically adding chats on left sidebar
  // {
  //   chats && chats.length > 0 ? (
  //     chats.map((item) => (
  //       <p
  //         key={item.id}
  //         className={`bg-gray-400 p-2 mb-3 rounded text-white font-bold cursor-pointer ${
  //           currentChatId === item.id ? "bg-gray-600" : ""
  //         }`}
  //         onClick={() => {
  //           setCurrentChatId(item.id); // ✅ set the current chatId
  //           fetchMessages(item.id); // ✅ load that chat’s messages (see next step)
  //         }}
  //         onContextMenu={(e) => handleContextMenu(e, item)} // Pass the event and the chat item
  //       >
  //         {item.title}
  //       </p>
  //     ))
  //   ) : (
  //     <p className="text-sm text-gray-500">No chats yet 🥺</p>
  //   );
  // }

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleDeleteChat = async () => {
    if (!selectedChatForMenu) return; // Safeguard

    // 1. Ask for user confirmation
    const isConfirmed = window.confirm(
      `Are you sure you want to delete "${selectedChatForMenu.title}" and all its messages? This cannot be undone.`
    );

    if (!isConfirmed) {
      setShowContextMenu(false); // Hide menu if user cancels
      setSelectedChatForMenu(null); // Clear selected chat
      return; // Exit if user cancels
    }

    setShowContextMenu(false); // Hide the context menu immediately after confirmation
    setIsLoading(true); // Show loading spinner

    try {
      const response = await fetch(
        `https://ai-chatbot-project-3.onrender.com/auth/chats/${selectedChatForMenu.id}`,
        {
          method: "DELETE", // Specify DELETE method
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete chat.");
      }

      const data = await response.json();
      console.log("Chat deleted successfully:", data.deletedChatId);

      // 2. Update frontend state to remove the deleted chat
      setChats((prevChats) =>
        prevChats.filter((chat) => chat.id !== selectedChatForMenu.id)
      );

      // 3. Handle active chat selection after deletion
      if (currentChatId === selectedChatForMenu.id) {
        // If the deleted chat was currently active, clear messages and select another chat
        setMessages([]); // Clear chat display
        const remainingChats = chats.filter(
          (chat) => chat.id !== selectedChatForMenu.id
        );
        if (remainingChats.length > 0) {
          // Select the first remaining chat (or any other logic, e.g., most recent)
          setCurrentChatId(remainingChats[0].id);
          fetchMessages(remainingChats[0].id); // Load messages for the newly selected chat
        } else {
          // If no chats left, set currentChatId to null and potentially create a new one
          setCurrentChatId(null);
          // Optionally, automatically create a new chat if all are deleted
          // await createNewChat(); // You can uncomment this if you want a new chat always to appear
        }
      }

      setError(null); // Clear any previous error messages
    } catch (err) {
      console.error("Error deleting chat:", err);
      setError(
        err.message || "An unexpected error occurred while deleting chat."
      );
    } finally {
      setIsLoading(false); // Hide loading spinner
      setSelectedChatForMenu(null); // Clear selected chat after operation
    }
  };

  return (
    <div className="flex h-screen w-screen">
      <>
        {/* Sidebar */}
        <div className="w-64 h-full bg-gradient-to-tl from-slate-400 from-10% via-slate-300 via-30% to-gray-200 to-90% font-bold text-red-500 flex flex-col justify-between">
          <button
            className="w-full text-2xl py-2 rounded mb-8 mt-10 text-red-600 
                  [background-image:linear-gradient(to_right,_#f0abfc,_#f9a8d4,_#fecaca)]
                  [background-size:200%_200%] [background-position:left_center]
                  transition-[background-position] duration-1000 ease-in-out 
                  hover:[background-position:right_center] cursor-pointer"
            onClick={createNewChat}
          >
            + New Chat
          </button>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 cursor-pointer">
            <div className="flex-1 overflow-y-auto px-4 space-y-2 cursor-pointer">
              {chats && chats.length > 0 ? (
                chats.map((item) => (
                  <p
                    key={item.id} // from postgres
                    className={`p-2 mb-3 rounded text-white font-bold cursor-pointer ${
                      currentChatId === item.id ? "bg-gray-600" : "bg-gray-400"
                    }`} // Apply active styling
                    onClick={() => {
                      setCurrentChatId(item.id); // Set the current chatId
                      fetchMessages(item.id); // Load that chat’s messages
                    }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    {item.title}
                  </p>
                ))
              ) : (
                <p className="text-sm text-gray-500">No chats yet 🥺</p>
              )}
            </div>
          </div>
          <button
            className="w-full text-2xl py-2 rounded mb-8 text-red-600 
                  [background-image:linear-gradient(to_right,_#f0abfc,_#f9a8d4,_#fecaca)]
                  [background-size:200%_200%] [background-position:left_center]
                  transition-[background-position] duration-1000 ease-in-out 
                  hover:[background-position:right_center] cursor-pointer"
            onClick={handleLogout}
          >
            LogOut
          </button>
        </div>
      </>

      {/* Chat area */}
      <div className="flex-1 flex flex-col ">
        {/* Chat display */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-100">
          {messages.map((msg, index) => (
            <div
              key={index} // In a real app, we will use a uniqueId from the backend, but index is okay for now
              className={`p-3 rounded max-w-md ${
                msg.sender === "user"
                  ? "self-end bg-blue-200 ml-auto"
                  : "self-start bg-gray-300 mr-auto"
              }`}
            >
              {/* Use ReactMarkdown for bot messages, plain text for user messages */}
              {msg.sender === "bot" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              ) : (
                msg.text
              )}
            </div>
          ))}
          {error && (
            // Display error message if state is set
            <div className="text-red-500 text-center mt-2">{error}</div>
          )}

          {/*  loading animation */}
          {isLoading && (
            <div className="p-3 rounded max-w-md self-start bg-gray-300 mr-auto animate-pulse text-gray-700">
              <div className="loader w-[100px] h-[20px] shadow-[0_3px_0_#ff7272] relative clip-path-[inset(-40px_0_-5px)]" />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Box */}
        <div className="p-4 bg-white border-t flex gap-2 ">
          <textarea
            type="text"
            placeholder="Type your prompt..."
            className="flex-1 border rounded px-4 py-2 resize-none overflow-hidden"
            value={currentInput} // display current state
            onChange={(e) => {
              // update state on change
              setCurrentInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // prevent new line on enter
                handleSendMessage();
              }
            }}
          />
          <button
            className="bg-fuchsia-800 text-white px-4 py-2 rounded hover:bg-fuchsia-400 cursor-pointer font-semibold"
            type="submit"
            onClick={handleSendMessage}
          >
            Send
          </button>
        </div>
      </div>

      {showContextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
          onClick={(e) => e.stopPropagation()} // Important to prevent immediate re-closing
        >
          <div className="context-menu-item" onClick={handleRenameTitle}>
            Rename Title
          </div>
          {/* Delete option will go here later */}
          <div className="context-menu-item" onClick={handleDeleteChat}>
            Delete Chat
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
