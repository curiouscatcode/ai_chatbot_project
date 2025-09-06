import React from "react";
import { useState, useEffect, useRef } from "react"; // Removed useContext as it's not used
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

  // --- NEW STATE FOR MOBILE SIDEBAR VISIBILITY ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // New state for context menu
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [selectedChatForMenu, setSelectedChatForMenu] = useState(null); // Stores the chat object right-clicked

  const handleContextMenu = (e, chat) => {
    e.preventDefault(); // Prevent the default browser context menu
    setSelectedChatForMenu(chat);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

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
  }, [showContextMenu]);

  const handleRenameTitle = async () => {
    if (!selectedChatForMenu) return; // Safeguard

    setShowContextMenu(false); // Hide the context menu immediately

    const newTitle = prompt(
      "Enter new title for the chat:",
      selectedChatForMenu.title
    );

    if (newTitle === null || newTitle.trim() === "") {
      console.log("Rename cancelled or empty title entered.");
      return;
    }

    try {
      const response = await fetch(
        `https://ai-chatbot-project-new-deployment-4.onrender.com/auth/chats/${selectedChatForMenu.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ newTitle: newTitle.trim() }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to rename chat.");
      }

      const data = await response.json();
      console.log("Chat renamed successfully:", data.chat);

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === selectedChatForMenu.id
            ? { ...chat, title: data.chat.title }
            : chat
        )
      );

      setError(null);
    } catch (err) {
      console.error("Error renaming chat:", err);
      setError(
        err.message || "An unexpected error occurred while renaming chat."
      );
    } finally {
      setSelectedChatForMenu(null);
    }
  };

  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchMessages = async (chatId) => {
    if (!chatId) return;
    try {
      setError(null);
      setMessages([]);
      const res = await fetch(
        `https://ai-chatbot-project-new-deployment-4.onrender.com/auth/chats/${chatId}/messages`,
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

  useEffect(() => {
    const fetchAllChatsAndSetInitial = async () => {
      try {
        const res = await fetch(
          "https://ai-chatbot-project-new-deployment-4.onrender.com/auth/chats",
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

        if (data.chats.length > 0) {
          const latestChatId = data.chats[0].id;
          setCurrentChatId(latestChatId);
          await fetchMessages(latestChatId);
        } else {
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
  }, []);

  const createNewChat = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const res = await fetch(
        "https://ai-chatbot-project-new-deployment-4.onrender.com/auth/chat/new",
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
      setChats([data.chat, ...chats]);
      setCurrentChatId(data.chat.id);
      setMessages([]);
    } catch (err) {
      console.error("Chat creation failed:", err);
      setError(err.message || "Failed to create a new chat.");
    } finally {
      setIsLoading(false);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    }
  };

  const handleSendMessage = async () => {
    if (currentInput.trim() === "") return;

    const newUserMessage = { sender: "user", text: currentInput };
    setMessages((prevMessages) => {
      return [...prevMessages, newUserMessage];
    });

    setCurrentInput("");

    setError(null);

    try {
      setIsLoading(true);
      const response = await fetch(
        "https://ai-chatbot-project-new-deployment-4.onrender.com/auth/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            prompt: newUserMessage.text,
            chatId: currentChatId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to get response from bot."
        );
      }

      setIsLoading(false);
      const data = await response.json();
      const botMessage = { sender: "bot", text: data.reply };

      setMessages((prevMessages) => [...prevMessages, botMessage]);

      if (data.newChatTitle && currentChatId) {
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === currentChatId
              ? { ...chat, title: data.newChatTitle }
              : chat
          )
        );
        console.log("Chat title updated in frontend state:", data.newChatTitle);
      }
    } catch (err) {
      console.error("API call error:", err);
      setError(err.message || "An unexpected error occurred.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleDeleteChat = async () => {
    if (!selectedChatForMenu) return;

    const isConfirmed = window.confirm(
      `Are you sure you want to delete "${selectedChatForMenu.title}" and all its messages? This cannot be undone.`
    );

    if (!isConfirmed) {
      setShowContextMenu(false);
      setSelectedChatForMenu(null);
      return;
    }

    setShowContextMenu(false);
    setIsLoading(true);

    try {
      const response = await fetch(
        `https://ai-chatbot-project-new-deployment-4.onrender.com/auth/chats/${selectedChatForMenu.id}`,
        {
          method: "DELETE",
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

      setChats((prevChats) =>
        prevChats.filter((chat) => chat.id !== selectedChatForMenu.id)
      );

      if (currentChatId === selectedChatForMenu.id) {
        setMessages([]);
        const remainingChats = chats.filter(
          (chat) => chat.id !== selectedChatForMenu.id
        );
        if (remainingChats.length > 0) {
          setCurrentChatId(remainingChats[0].id);
          fetchMessages(remainingChats[0].id);
        } else {
          setCurrentChatId(null);
        }
      }
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }

      setError(null);
    } catch (err) {
      console.error("Error deleting chat:", err);
      setError(
        err.message || "An unexpected error occurred while deleting chat."
      );
    } finally {
      setIsLoading(false);
      setSelectedChatForMenu(null);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* --- Sidebar --- */}
      <div
        className={`
          w-64 h-screen bg-gradient-to-tl from-slate-400 from-10% via-slate-300 via-30% to-gray-200 to-90%
          font-bold text-red-500 flex flex-col  
          fixed top-0 left-0 z-40 transform transition-transform duration-300
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 md:flex
        `}
      >
        <button
          className="w-full text-2xl py-2 rounded mt-10 mb-4 text-red-600
                     [background-image:linear-gradient(to_right,_#f0abfc,_#f9a8d4,_#fecaca)]
                     [background-size:200%_200%] [background-position:left_center]
                     transition-[background-position] duration-1000 ease-in-out
                     hover:[background-position:right_center] cursor-pointer"
          onClick={createNewChat}
        >
          + New Chat
        </button>
        <div className="overflow-y-auto flex-grow px-4 space-y-2 cursor-pointer">
          {chats && chats.length > 0 ? (
            chats.map((item) => (
              <p
                key={item.id}
                className={`p-2 mb-3 rounded text-white font-bold cursor-pointer ${
                  currentChatId === item.id ? "bg-gray-600" : "bg-gray-400"
                }`}
                onClick={() => {
                  setCurrentChatId(item.id);
                  fetchMessages(item.id);
                  setIsSidebarOpen(false);
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
        <button
          className="w-full text-2xl py-2 rounded my-4 text-red-600 mt-auto
               [background-image:linear-gradient(to_right,_#f0abfc,_#f9a8d4,_#fecaca)]
               [background-size:200%_200%] [background-position:left_center]
               transition-[background-position] duration-1000 ease-in-out
               hover:[background-position:right_center] cursor-pointer"
          onClick={handleLogout}
        >
          LogOut
        </button>
      </div>

      {/* --- Overlay for Mobile Sidebar --- */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col z-20">
        {/* --- Mobile Menu Button (Hamburger) --- */}
        <div className="md:hidden flex items-center p-4 bg-white border-b shadow-sm">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-md p-2"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800 ml-4">
            AI Chatbot
          </h1>
        </div>

        {/* Chat display */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-100">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded max-w-md ${
                msg.sender === "user"
                  ? "self-end bg-blue-200 ml-auto"
                  : "self-start bg-gray-300 mr-auto"
              }`}
            >
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
            <div className="text-red-500 text-center mt-2">{error}</div>
          )}

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
            value={currentInput}
            onChange={(e) => {
              setCurrentInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
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
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={handleRenameTitle}>
            Rename Title
          </div>
          <div className="context-menu-item" onClick={handleDeleteChat}>
            Delete Chat
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
