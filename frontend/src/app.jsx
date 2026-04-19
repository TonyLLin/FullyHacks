import { useState, useEffect } from "react";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/trips")
      .then(response => response.json())
      .then(data => {
        setMessage(data.message);
      });
  }, []);

  return (
    <div>
      <p>{message}</p>
    </div>
  );
}

export default App;