const Snowfall = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="animate-snow absolute text-white"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${4 + Math.random() * 0.2}s`,
            fontSize: `${Math.random() * 10 + 10}px`,
            color: "#fff",
          }}
        >
          *
        </div>
      ))}
    </div>
  );
};

export default Snowfall;
