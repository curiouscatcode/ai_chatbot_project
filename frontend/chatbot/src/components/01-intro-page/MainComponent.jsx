import Snowfall from "./Snowfall.jsx";
import Form1 from "./Form1.jsx";
import Titles from "./Titles.jsx";

import { Navigate } from "react-router-dom";

const MainComponent = () => {
  // const handleSubmit = async (e) => {
  //   e.preventDefault();

  //   const url = isLogin
  //     ? "https://ai-chatbot-project-3.onrender.com/auth/login"
  //     : "https://ai-chatbot-project-3.onrender.com/auth/register";

  //   const body = {
  //     email,
  //     password,
  //   };

  //   try {
  //     // use fetch api (has two arguments: url, rest of the data) and store it in global variable
  //     const res = await fetch(url, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(body),
  //     });

  //     // data
  //     const data = await res.json();

  //     if (res.ok) {
  //       // save token in localstorage
  //       localStorage.setItem("token", data.token);

  //       // redirect to /dashboard
  //       Navigate("/dashboard");
  //     } else {
  //       alert(data.error);
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     alert("Something went wrong.");
  //   }
  // };

  return (
    <>
      <div className="full-div flex gap-4 min-h-screen items-center justify-center bg-gradient-to-tl from-black from-60% to-red-800 ">
        <div className="main-div relative flex gap-0 w-lg justify-center px-20 py-10 rounded-b-3xl bg-gradient-to-b from-indigo-900 via-purple-900 to-black animate-red-border-lightning hover:scale-105 transition-transform duration-300 ">
          <div className="pr-4 p-2 rounded-bl-3xl bg-teal-700/10 text-teal-200">
            <Titles heading={"Register"} />
            <Form1 type={"register"} />
            <Snowfall />
          </div>
          <div className="log-in bg-teal-700/10 pr-4 p-2 rounded-br-3xl text-teal-200">
            <Titles heading={"login"} />
            <Form1 type={"login"} />
          </div>
        </div>
      </div>
    </>
  );
};

export default MainComponent;
