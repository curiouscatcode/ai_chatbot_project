import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Form1 = ({ type }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Auto-redirect if token already exists
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, []);

  const handleSubmit = async (e) => {
    // 1. prevent default
    e.preventDefault();

    // 2. routing endpoint
    const endpoint = type === "login" ? "login" : "register";

    // try & catch
    try {
      // 3. fetch Api and its 2 arguments
      const res = await fetch(
        `https://ai-chatbot-project-3.onrender.com/auth/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      // 4. storing response in json
      const data = await res.json();

      console.log(data);

      // 5. edge case
      if (!res.ok) {
        alert(data.error || "Something went wrong");
        return;
      }
      // 6. login case
      if (type === "login") {
        localStorage.setItem("token", data.token);
        alert("Login successful !");
        // 7. redirection to the dashboard
        navigate("/dashboard");
      } else {
        localStorage.setItem("token", data.token);
        alert("User registered successfully!");
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      alert("Server error !");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* email */}
        <label
          htmlFor="email"
          className="text-sm font-medium block pl-4 pt-6 pb-1.5"
        >
          Email
        </label>
        <input
          type="email"
          placeholder="Enter your mail_Id"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          id={`email-${type}`}
          className="border border-gray-300 rounded px-2 py-1 m-0.5 ml-4.5"
        />
        {/* Password */}
        <label
          htmlFor="password"
          className="text-sm font-medium block pl-4 pt-8 pb-1.5"
        >
          Password
        </label>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          name="password"
          id={`password-${type}`}
          className="border border-gray-300 rounded px-2 py-1 m-0.5 ml-4.5"
        />
        <div className="mt-7 flex justify-center">
          {/* submit button */}
          <button
            type="submit"
            className="bg-fuchsia-500 text-white rounded-xl px-4 py-2 hover:bg-fuchsia-600 cursor-pointer font-bold"
          >
            {type === "login" ? "LogIn" : "SignIn"}
          </button>
        </div>
      </form>
    </>
  );
};

export default Form1;
