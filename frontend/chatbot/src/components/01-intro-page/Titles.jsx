const Titles = ({ heading }) => {
  return (
    <div className="sign-in">
      <h1 className="text-white underline text-4xl text-center pt-4">
        {heading === "login" ? "LogIn" : "SignIn"}
      </h1>
    </div>
  );
};

export default Titles;
