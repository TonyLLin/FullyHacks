import { useState, useEffect, useRef } from "react";
import { 
  Pencil, FishSymbol, MapPin, Coins, CalendarDays, ChevronDown,
  ChevronUp
} from "lucide-react";
import "./app.css";
import Map from "./map.jsx";


const daysBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const diff = end - start;
  return Math.round(diff / (1000 * 60 * 60 * 24));
};

function LeftSidebar( {days, scrollToDay, topRef, locationsRef, costRef, itineraryRef} ) {
  const scrollTo = (ref) => {
    ref.current.scrollIntoView({ behavior: "smooth" });
  };

  const [open, setOpen] = useState(false);

  return (
    <div className="sidebar-left">
      <div 
        className="home"
        onClick={() => topRef.current.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <FishSymbol />
      </div>

      <hr />

      <div 
        className="locations-button" 
        onClick={() => scrollTo(locationsRef)}
      >
        <MapPin />
      </div>

      <div 
        className="cost-button"
        onClick={() => scrollTo(costRef)}  
      >
        <Coins />
      </div>


      <div className={`days-container ${open ? "open" : ""}`}>
        <div className="itinerary-folder" onClick={() => setOpen(!open)}>
          <CalendarDays />
        </div>
        
        <div className={`days-container ${open ? "open" : ""}`}>
          {Array.from({ length: days }, (_, i) => (
            <div key={i} className="day" onClick={(e) => { e.stopPropagation(); scrollToDay(i); }}>
              <h2>{i + 1}</h2>
            </div>
          ))}
        </div>

        <div className="arrow" onClick={() => setOpen(!open)}>
          {open ? <ChevronUp /> : <ChevronDown />}
        </div>
      </div>
    </div> 
  )
}

function Stats( {tripData, tripLength, total} ) {
  const distance = 420;
  const stopsPerDay = 6;
  const cost = "2,840";

  return (
    <div className="stats-bar">
      <div className="stat-pill">
        <span>📅</span>
        <p>
          <span className="stat-value">{tripLength}</span> days
        </p>
      </div>
      <div className="stat-pill">
        <span>📍</span>
        <p>
          <span className="stat-value">{distance}</span> mi total
        </p>
      </div>
      <div className="stat-pill">
        <span>🚗</span>
        <p>
          <span className="stat-value">{stopsPerDay}</span> stops/day avg
        </p>
      </div>
      <div className="stat-pill">
        <span>$</span>
        <p>
          <span className="stat-value">${total.toFixed(2)}</span> est.
        </p>
      </div>
    </div>
  )
}

function Days( {tripLength, dayRefs} ) {
  return (
    <div className="days-list">
      {Array.from({ length: tripLength }, (_, i) => (
        <div 
          key={i} 
          className="day-card"
          ref={el => dayRefs.current[i] = el}
        >
          <h3>Day {i + 1}</h3>
        </div>
      ))}
    </div>
  );
}

function RightSidebar( {stops,removeStop, topRef, locationsRef, costRef, itineraryRef, tripData, dayRefs} ) {
  const startLocation = tripData.origin;
  const endLocation = tripData.destination;

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return "";
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    const startFormatted = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
    const endFormatted = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    return `${startFormatted} – ${endFormatted}`;
  };

  const tripDateRange = formatDateRange(tripData.start, tripData.end);
  const tripLength = daysBetween(tripData.start, tripData.end);

  const [tripName, setTripName] = useState("Trip to " + endLocation);
  const [editing, setEditing] = useState(false);

  const [costItems, setCostItems] = useState([]);
  const total = costItems.reduce((sum, item) => sum + item.amount, 0);

  const CATEGORIES = ["Food", "Gas", "Lodging", "Activities", "Other"];

  return (
    <div className="sidebar-right" ref={topRef}>
      <div className="trip-info">
        {editing ? (
          <input
            className="trip-name-input"
            value={tripName}
            onChange={e => setTripName(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={e => e.key === "Enter" && setEditing(false)}
            autoFocus
          />
        ) : (
          <div className="trip-name-wrapper" onClick={() => setEditing(true)}>
            <h2 className="trip-name">{tripName}</h2>
            <Pencil size={14} className="edit-icon" />
          </div>
        )}

        <div className="trip-location-time-container">
          <p>
            <span className="stat-value">{startLocation}</span>
            {" → "}
            <span className="stat-value">{endLocation}</span>
          </p>
          <p>
            <span className="stat-value">{tripDateRange}</span>
          </p>
        </div>

        <Stats tripData={tripData} tripLength={tripLength} total={total}/>
      </div>

      <div className="locations-container" ref={locationsRef}>
        <h2>Locations</h2>
        {stops.length === 0 && (
          <p className="empty-hint">Search for places to add them here.</p>
        )}
        {stops.map((stop, i) => (
          <div key={stop.id} className="location-item">
            <div className="location-index">{i + 1}</div>
            <div className="location-info">
              <p className="location-name">{stop.name}</p>
              <p className="location-coords">{stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}</p>
            </div>
            <button className="location-remove" onClick={() => removeStop(stop.id)}>✕</button>
          </div>
        ))}
      </div>

      <div className="cost-container" ref={costRef}>
          <h2>Cost</h2>
          {costItems.length > 0 && (
            <div className="cost-summary">
              {CATEGORIES.map(cat => {
                const catItems = costItems.filter(i => i.category === cat);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat} className="cost-category">
                    <h4>{cat}</h4>
                    {catItems.map((item, i) => (
                      <div key={i} className="cost-item">
                        <span>{item.label}</span>
                        <span>${item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              <p className="cost-total">Total: ${total.toFixed(2)}</p>
            </div>
          )}
          <Cost items={costItems} setItems={setCostItems} />
      </div>

      <div className="itinerary-container" ref={itineraryRef}>
        <h2>Itinerary</h2>
        <Days tripLength={tripLength} dayRefs={dayRefs}/>
      </div>
    </div>
  )
}

function Cost({ items, setItems }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [open, setOpen] = useState(false);

  const CATEGORIES = ["Food", "Gas", "Lodging", "Activities", "Other"];

  const addItem = () => {
    if (!label.trim() || !amount) return;
    setItems([...items, { label, amount: parseFloat(amount), category }]);
    setLabel("");
    setAmount("");
    setCategory("Other");
    setOpen(false)
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {});

  return (
    <div className="cost">
      <button className="open-cost-btn" onClick={() => setOpen(true)}>
        + Add Cost
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="modal-backdrop" onClick={() => setOpen(false)} />

          {/* modal */}
          <div className="modal">
            <div className="modal-header">
              <h3>Trip Costs</h3>
              <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="cost-form">
              <input
                placeholder="Label..."
                value={label}
                onChange={e => setLabel(e.target.value)}
              />
              <input
                placeholder="Amount..."
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button onClick={addItem}>Add</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Search({ addStop, stops }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`)
        .then(r => r.json())
        .then(data => setResults(data.nominatim));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const selectResult = (result) => {
    addStop({
      name: result.display_name,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      day: 1,
      order: stops.length
    });
    setQuery("");
    setResults([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && results.length > 0) {
      selectResult(results[0]); // picks the top result
    }
  };

  return (
    <div className="search-container">
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          className="search-box"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a place..."
        />
      </div>
      {results.length > 0 && (
        <ul className="suggestions">
          {results.map((result, i) => (
            <li key={i} onClick={() => selectResult(result)}>
              {result.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Planner( {tripData} ) {
  const [stops, setStops] = useState([]);
  const [polyline, setPolyline] = useState([]);
  const [waypoints, setWaypoints] = useState([]);

  const addStop = async (stopData) => {
    const response = await fetch("/api/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stopData)
    });
    const newStop = await response.json();
    
    const updatedStops = [...stops, newStop];
    setStops(updatedStops);

    // auto-route if we have at least 2 stops
    if (updatedStops.length >= 2) {
      getRoute(updatedStops);
    }
  };

  const getRoute = async (currentStops) => {
    console.log("sending stops:", currentStops);
    
    const response = await fetch("/api/itinerary/day/1/route", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const text = await response.text();
    console.log("route response:", text);

    const data = JSON.parse(text);
    const newPolyline = data.route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    const newWaypoints = data.route.waypoints.map(w => [w.location[1], w.location[0]]);

    setPolyline(newPolyline);
    setWaypoints(newWaypoints);
  };

  const removeStop = async (stopId) => {
    await fetch(`/api/itinerary/${stopId}`, { method: "DELETE" });
    const updatedStops = stops.filter(s => s.id !== stopId);
    setStops(updatedStops);
    if (updatedStops.length >= 2) getRoute(updatedStops);
    else { setPolyline([]); setWaypoints([]); }
  };

  const [sidebarWidth, setSidebarWidth] = useState(300);
  const isResizing = useRef(false);

  const topRef = useRef(null);
  const locationsRef = useRef(null);
  const costRef = useRef(null);
  const itineraryRef = useRef(null);
  const dayRefs = useRef([]);

  const tripLength = daysBetween(tripData.start, tripData.end);
  dayRefs.current = Array.from({ length: tripLength }, (_, i) => dayRefs.current[i] || null);

  const scrollToDay = (index) => {
    dayRefs.current[index]?.scrollIntoView({ behavior: "smooth" });
  };

  const handleMouseDown = () => {
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    const newWidth = Math.min(Math.max(e.clientX, 200), 600);
    setSidebarWidth(newWidth);
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="app-container">
      <aside className="sidebar" style={{ width: sidebarWidth }}>
        <LeftSidebar 
          days={tripLength}
          scrollToDay={scrollToDay}
          topRef={topRef}
          locationsRef={locationsRef}
          costRef={costRef}
          itineraryRef={itineraryRef}
        />
        <RightSidebar 
          stops={stops}
          removeStop={removeStop}
          topRef={topRef}
          locationsRef={locationsRef}
          costRef={costRef}
          itineraryRef={itineraryRef}
          tripData={tripData}
          dayRefs={dayRefs}
        />
      </aside>

      <div className="resize-handle" onMouseDown={handleMouseDown} />

      <main className="main-content">
        <Search addStop={addStop} stops={stops} />
        <div className="map-container">
          <Map polyline={polyline} waypoints={waypoints} />
        </div>
      </main>
    </div>
  );
}

function LandingPage({ onSubmit }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const handleSubmit = () => {
    if (!origin.trim() || !destination.trim() || !start || !end) return;
    onSubmit({ origin, destination, start, end });
  };

  const isValid = origin.trim() && destination.trim() && start && end;

  return (
    <div className="landing">
      <h1>Shoal</h1>
      <h3>plan your road trip</h3>
      <div className="landing-inputs">
        <input
          placeholder="Starting from..."
          value={origin}
          onChange={e => setOrigin(e.target.value)}
        />
        <input
          placeholder="Going to..."
          value={destination}
          onChange={e => setDestination(e.target.value)}
        />
        <input
          placeholder="Start date"
          type="date"
          value={start}
          onChange={e => setStart(e.target.value)}
        />
        <input
          placeholder="End date"
          type="date"
          value={end}
          onChange={e => setEnd(e.target.value)}
        />
      </div>
      <button onClick={handleSubmit} disabled={!isValid}>
        Dive Deeper
      </button>
    </div>
  );
}

function App() {
  const [tripData, setTripData] = useState(null);
  const [animating, setAnimating] = useState(false);

  const handleSubmit = (data) => {
    setAnimating(true);
    setTimeout(() => {
      setTripData(data);
      setAnimating(false);
    }, 800);
  };

  return (
    <>
      <div className={`background ${animating || tripData ? "shifted" : ""}`} />

      {tripData === null
        ? <div className={`landing ${animating ? "slide-up" : ""}`}>
            <LandingPage onSubmit={handleSubmit} />
          </div>
        : <Planner tripData={tripData} />
      }
    </>
  );
}

export default App;