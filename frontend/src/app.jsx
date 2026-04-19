import { useState, useEffect, useRef } from "react";
import { 
  Pencil, FishSymbol, MapPin, Coins, CalendarDays,
  ChevronDown, ChevronUp, Info
} from "lucide-react";
import "./app.css";
import Map from "./map.jsx";

// ── Day colors ────────────────────────────────────────────────────────────────
const DAY_COLORS = [
  "#f5a623", "#4caf7d", "#5b8cff", "#e05555",
  "#b57bee", "#f0c040", "#00bcd4", "#ff7043"
];
const getDayColor = (day) => DAY_COLORS[(day - 1) % DAY_COLORS.length];

// ── Helpers ───────────────────────────────────────────────────────────────────
const daysBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

// ── LeftSidebar ───────────────────────────────────────────────────────────────
function LeftSidebar({ days, scrollToDay, topRef, locationsRef, costRef, itineraryRef }) {
  const [open, setOpen] = useState(false);

  const scrollTo = (ref) => {
    topRef.current?.scrollTo({ top: ref.current?.offsetTop, behavior: "smooth" });
  };

  return (
    <div className="sidebar-left">
      <div className="home" onClick={() => topRef.current?.scrollTo({ top: 0, behavior: "smooth" })}>
        <FishSymbol />
      </div>
      <hr />
      <div className="locations-button" onClick={() => scrollTo(locationsRef)}><MapPin /></div>
      <div className="cost-button" onClick={() => scrollTo(costRef)}><Coins /></div>

      <div className="itinerary-folder" onClick={() => setOpen(!open)}>
        <CalendarDays />
      </div>

      <div className={`days-container ${open ? "open" : ""}`}>
        {Array.from({ length: days }, (_, i) => (
          <div
            key={i}
            className="day"
            style={{ borderLeft: `3px solid ${getDayColor(i + 1)}` }}
            onClick={(e) => { e.stopPropagation(); scrollToDay(i); }}
          >
            <h2>{i + 1}</h2>
          </div>
        ))}
      </div>

      <div className="arrow" onClick={() => setOpen(!open)}>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function Stats({ tripLength, total }) {
  return (
    <div className="stats-bar">
      <div className="stat-pill">
        <span>📅</span>
        <p><span className="stat-value">{tripLength}</span> days</p>
      </div>
      <div className="stat-pill">
        <span>$</span>
        <p><span className="stat-value">${total.toFixed(2)}</span> est.</p>
      </div>
    </div>
  );
}

// ── Location Item ─────────────────────────────────────────────────────────────
function LocationItem({ stop, tripLength, onRemove, onDayChange, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="location-item">
      <div className="location-main">
        <div className="location-drag">
          <button className="drag-btn" onClick={onMoveUp} disabled={isFirst}>▲</button>
          <button className="drag-btn" onClick={onMoveDown} disabled={isLast}>▼</button>
        </div>

        <div className="location-day-dot" style={{ background: getDayColor(stop.day) }}>
          {stop.day}
        </div>

        <div className="location-info">
          <p className="location-name">{stop.name.split(",")[0]}</p>
          <p className="location-coords">{stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}</p>
        </div>

        <div className="location-actions">
          <button className="icon-btn" onClick={() => setExpanded(!expanded)}>
            <Info size={13} />
          </button>
          <button className="location-remove" onClick={() => onRemove(stop.id)}>✕</button>
        </div>
      </div>

      {expanded && (
        <div className="location-expanded">
          <p className="location-full-name">{stop.name}</p>
          <div className="day-assign">
            <span>Assign to day:</span>
            <select value={stop.day} onChange={e => onDayChange(stop.id, parseInt(e.target.value))}>
              {Array.from({ length: tripLength }, (_, i) => (
                <option key={i + 1} value={i + 1}>Day {i + 1}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Days (itinerary) ──────────────────────────────────────────────────────────
function Days({ tripLength, dayRefs, stops }) {
  return (
    <div className="days-list">
      {Array.from({ length: tripLength }, (_, i) => {
        const dayNum = i + 1;
        const dayStops = stops.filter(s => s.day === dayNum);
        return (
          <div
            key={i}
            className="day-card"
            ref={el => dayRefs.current[i] = el}
            style={{ borderLeft: `3px solid ${getDayColor(dayNum)}` }}
          >
            <h3>Day {dayNum}</h3>
            {dayStops.length === 0
              ? <p className="empty-hint">No stops yet</p>
              : dayStops.map((s, j) => (
                  <div key={s.id} className="day-stop-item">
                    <span className="day-stop-num">{j + 1}</span>
                    <span className="day-stop-name">{s.name.split(",")[0]}</span>
                  </div>
                ))
            }
          </div>
        );
      })}
    </div>
  );
}

// ── Cost ──────────────────────────────────────────────────────────────────────
function Cost({ items, setItems }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [open, setOpen] = useState(false);
  const CATEGORIES = ["Food", "Gas", "Lodging", "Activities", "Other"];

  const addItem = () => {
    if (!label.trim() || !amount) return;
    setItems([...items, { label, amount: parseFloat(amount), category }]);
    setLabel(""); setAmount(""); setCategory("Other"); setOpen(false);
  };

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {});

  return (
    <div className="cost">
      <button className="open-cost-btn" onClick={() => setOpen(true)}>+ Add Cost</button>
      {open && (
        <>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <div className="modal">
            <div className="modal-header">
              <h3>Trip Costs</h3>
              <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="cost-form">
              <input placeholder="Label..." value={label} onChange={e => setLabel(e.target.value)} />
              <input placeholder="Amount..." type="number" value={amount} onChange={e => setAmount(e.target.value)} />
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button onClick={addItem}>Add</button>
            </div>
            {CATEGORIES.map(cat => byCategory[cat].length > 0 && (
              <div key={cat} className="cost-category">
                <h4>{cat}</h4>
                {byCategory[cat].map((item, i) => (
                  <div key={i} className="cost-item">
                    <span>{item.label}</span>
                    <span>${item.amount.toFixed(2)}</span>
                    <button onClick={() => removeItem(items.indexOf(item))}>✕</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── RightSidebar ──────────────────────────────────────────────────────────────
function RightSidebar({totalDistance, stops, removeStop, moveStop, changeStopDay, topRef, locationsRef, costRef, itineraryRef, tripData, dayRefs }) {
  const startLocation = tripData.origin?.name?.split(",")[0] || "";
  const endLocation = tripData.destination?.name?.split(",")[0] || "";
  const tripLength = daysBetween(tripData.start, tripData.end);

  const formatDateRange = (s, e) => {
    if (!s || !e) return "";
    const start = new Date(s + "T00:00:00");
    const end = new Date(e + "T00:00:00");
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const [tripName, setTripName] = useState("Trip to " + endLocation);
  const [editing, setEditing] = useState(false);
  const [costItems, setCostItems] = useState([]);
  const total = costItems.reduce((sum, item) => sum + item.amount, 0);
  const CATEGORIES = ["Food", "Gas", "Lodging", "Activities", "Other"];

  return (
    <div className="sidebar-right-wrapper">
      <Bubbles />
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
            <p><span className="stat-value">{formatDateRange(tripData.start, tripData.end)}</span></p>
          </div>
          <Stats tripLength={tripLength} total={total} totalDistance={totalDistance} />
        </div>

        <div className="locations-container" ref={locationsRef}>
          <h2>Locations</h2>
          {stops.length === 0
            ? <p className="empty-hint">Search for places to add them here.</p>
            : stops.map((stop, i) => (
                <LocationItem
                  key={stop.id}
                  stop={stop}
                  tripLength={tripLength}
                  onRemove={removeStop}
                  onDayChange={changeStopDay}
                  onMoveUp={() => moveStop(i, i - 1)}
                  onMoveDown={() => moveStop(i, i + 1)}
                  isFirst={i === 0}
                  isLast={i === stops.length - 1}
                />
              ))
          }
        </div>

        <div className="cost-container" ref={costRef}>
          <h2>Cost</h2>
          {costItems.length > 0 && (
            <div className="cost-summary">
              {CATEGORIES.map(cat => {
                const catItems = costItems.filter(i => i.category === cat);
                if (!catItems.length) return null;
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
          <Days tripLength={tripLength} dayRefs={dayRefs} stops={stops} />
        </div>

        <Algae />
      </div>
    </div>
  );
}

// ── Search ────────────────────────────────────────────────────────────────────
function Search({ addStop, stops, selectedDay }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`)
        .then(r => r.json())
        .then(data => setResults(data.nominatim || []));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const selectResult = (result) => {
    addStop({
      name: result.display_name,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      day: selectedDay,
      order: stops.filter(s => s.day === selectedDay).length
    });
    setQuery("");
    setResults([]);
  };

  return (
    <div className="search-container">
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          className="search-box"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && results.length > 0 && selectResult(results[0])}
          placeholder="Search for a place..."
        />
      </div>
      {results.length > 0 && (
        <ul className="suggestions">
          {results.map((result, i) => (
            <li key={i} onClick={() => selectResult(result)}>
              <span className="suggestion-name">{result.display_name.split(",")[0]}</span>
              <span className="suggestion-detail">{result.display_name.split(",").slice(1, 3).join(",")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Planner ───────────────────────────────────────────────────────────────────
function Planner({ tripData }) {
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState({});
  const [selectedDay, setSelectedDay] = useState(1);
  const [totalDistance, setTotalDistance] = useState(0);

  const tripLength = daysBetween(tripData.start, tripData.end);

  // clear store and seed origin/destination on mount
  useEffect(() => {
    fetch("/api/itinerary", { method: "DELETE" })
      .then(() => {
        const seeds = [];

        if (tripData.origin) {
          seeds.push(fetch("/api/itinerary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: tripData.origin.name,
              lat: tripData.origin.lat,
              lon: tripData.origin.lon,
              day: 1,
              order: 0
            })
          }).then(r => r.json()));
        }

        if (tripData.destination) {
          seeds.push(fetch("/api/itinerary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: tripData.destination.name,
              lat: tripData.destination.lat,
              lon: tripData.destination.lon,
              day: tripLength || 1,
              order: 1
            })
          }).then(r => r.json()));
        }

        Promise.all(seeds).then(seeded => {
          setStops(seeded);
          if (seeded.length >= 2) getRouteForDay(1);
        });
      });
  }, []);

  const getRouteForDay = async (day) => {
    const response = await fetch(`/api/itinerary/day/${day}/route`);
    if (!response.ok) return;
    const data = await response.json();
    const polyline = data.route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    const waypoints = data.route.waypoints.map(w => [w.location[1], w.location[0]]);

    // update total distance in miles
    const meters = data.route.distance_meters || 0;
    setTotalDistance(prev => {
      // subtract old day distance if re-routing
      return Math.round(meters * 0.000621371 * 10) / 10;
    });

    setRoutes(prev => ({ ...prev, [day]: { polyline, waypoints, color: getDayColor(day) } }));
  };

  const changeStopDay = async (stopId, newDay) => {
    const stop = stops.find(s => s.id === stopId);
    const oldDay = stop.day;
    const newOrder = stops.filter(s => s.day === newDay).length;

    await fetch(`/api/itinerary/${stopId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: newDay, order: newOrder })
    });

    const updatedStops = stops.map(s => s.id === stopId ? { ...s, day: newDay, order: newOrder } : s);
    setStops(updatedStops);

    if (updatedStops.filter(s => s.day === oldDay).length >= 2) getRouteForDay(oldDay);
    else setRoutes(prev => { const r = { ...prev }; delete r[oldDay]; return r; });
    if (updatedStops.filter(s => s.day === newDay).length >= 2) getRouteForDay(newDay);
  };

  const addStop = async (stopData) => {
    const response = await fetch("/api/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stopData)
    });
    const newStop = await response.json();
    const updatedStops = [...stops, newStop];
    setStops(updatedStops);
    if (updatedStops.filter(s => s.day === stopData.day).length >= 2) {
      getRouteForDay(stopData.day);
    }
  };

  const removeStop = async (stopId) => {
    const stop = stops.find(s => s.id === stopId);
    await fetch(`/api/itinerary/${stopId}`, { method: "DELETE" });
    const updatedStops = stops.filter(s => s.id !== stopId);
    setStops(updatedStops);
    if (updatedStops.filter(s => s.day === stop.day).length >= 2) {
      getRouteForDay(stop.day);
    } else {
      setRoutes(prev => { const r = { ...prev }; delete r[stop.day]; return r; });
    }
  };

 const moveStop = async (fromIndex, toIndex) => {
  if (toIndex < 0 || toIndex >= stops.length) return;
  const updated = [...stops];
  const [moved] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, moved);
  const reordered = updated.map((s, i) => ({ ...s, order: i }));
  setStops(reordered);

  await fetch(`/api/itinerary/${moved.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order: toIndex })
  });

  // also patch the stop that got displaced
  const displaced = stops[toIndex];
  if (displaced) {
    await fetch(`/api/itinerary/${displaced.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: fromIndex })
    });
  }

  // re-route all affected days after both patches complete
  const affectedDays = [...new Set(reordered.map(s => s.day))];
  affectedDays.forEach(day => {
    if (reordered.filter(s => s.day === day).length >= 2) getRouteForDay(day);
  });
};

  const [sidebarWidth, setSidebarWidth] = useState(300);
  const isResizing = useRef(false);
  const topRef = useRef(null);
  const locationsRef = useRef(null);
  const costRef = useRef(null);
  const itineraryRef = useRef(null);
  const dayRefs = useRef([]);
  dayRefs.current = Array.from({ length: tripLength }, (_, i) => dayRefs.current[i] || null);

  const scrollToDay = (index) => {
    topRef.current?.scrollTo({ top: dayRefs.current[index]?.offsetTop, behavior: "smooth" });
  };

  const handleMouseDown = () => {
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    setSidebarWidth(Math.min(Math.max(e.clientX, 200), 600));
  };
  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    fetch("/api/itinerary", { method: "DELETE" })
      .then(() => setStops([]))
      .then(() => setRoutes({}));
  }, []);

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
          totalDistance={totalDistance}
          stops={stops}
          removeStop={removeStop}
          moveStop={moveStop}
          changeStopDay={changeStopDay}
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
        <Search addStop={addStop} stops={stops} selectedDay={selectedDay} />
        <div className="map-container">
          <Map routes={routes} stops={stops} />
        </div>
      </main>
    </div>
  );
}

// ── LandingPage ───────────────────────────────────────────────────────────────
function LocationSearch({ placeholder, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`)
        .then(r => r.json())
        .then(data => setResults(data.nominatim || []));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const select = (result) => {
    const loc = {
      name: result.display_name,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    };
    setSelected(loc);
    setQuery(result.display_name.split(",")[0]);
    setResults([]);
    onSelect(loc);
  };

  return (
    <div className="location-search">
      <input
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); setSelected(null); onSelect(null); }}
        onKeyDown={e => e.key === "Enter" && results.length > 0 && select(results[0])}
      />
      {results.length > 0 && (
        <ul className="suggestions landing-suggestions">
          {results.map((r, i) => (
            <li key={i} onClick={() => select(r)}>
              <span className="suggestion-name">{r.display_name.split(",")[0]}</span>
              <span className="suggestion-detail">{r.display_name.split(",").slice(1, 3).join(",")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LandingPage({ onSubmit }) {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const isValid = origin && destination && start && end;

  return (
    <div className="landing">
      <h1>Shoal</h1>
      <h3>plan your road trip</h3>
      <div className="landing-inputs">
        <LocationSearch placeholder="Starting from..." onSelect={setOrigin} />
        <LocationSearch placeholder="Going to..." onSelect={setDestination} />
        <input type="date" value={start} onChange={e => setStart(e.target.value)} />
        <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
      </div>
      <button onClick={() => onSubmit({ origin, destination, start, end })} disabled={!isValid}>
        Dive Deeper
      </button>
    </div>
  );
}

function Bubbles() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;

    const spawnBubble = () => {
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      const size = Math.random() * 50 + 8;
      const closeness = size / 58;
      const duration = 15 - closeness * 8;
      const opacity = 0.3 + closeness * 0.5;
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${Math.random() * 100}%`;
      bubble.style.animationDuration = `${duration}s`;
      bubble.style.setProperty("--max-opacity", opacity);
      container.appendChild(bubble);
      setTimeout(() => bubble.remove(), duration * 1000);
    };

    const interval = setInterval(spawnBubble, 2000);
    for (let i = 0; i < 5; i++) {
      setTimeout(spawnBubble, i * 600);
    }

    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  return <div className="bubbles" ref={containerRef} />;
}

function Algae() {
  const strands = [
    { left: "5%",  height: 180, delay: 0 },
    { left: "15%", height: 240, delay: 0.5 },
    { left: "25%", height: 160, delay: 1.2 },
    { left: "38%", height: 280, delay: 0.3 },
    { left: "50%", height: 200, delay: 0.8 },
    { left: "62%", height: 260, delay: 1.5 },
    { left: "75%", height: 190, delay: 0.6 },
    { left: "88%", height: 220, delay: 1.0 },
  ];

  return (
    <div className="algae-container">
      {strands.map((s, i) => (
        <svg
          key={i}
          className="kelp-strand"
          style={{
            left: s.left,
            height: s.height,
            animationDelay: `${s.delay}s`,
            animationDuration: `${3 + i * 0.4}s`,
          }}
          viewBox="0 0 20 100"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* main stalk */}
          <path
            d="M10 100 C8 80 12 60 9 40 C7 20 11 10 10 0"
            stroke="#555" strokeWidth="2.5" fill="none" strokeLinecap="round"
          />
          {/* leaves alternating left and right */}
          <path d="M9 80 C2 72 1 62 5 60 C8 65 9 72 9 80" fill="#444" />
          <path d="M10 65 C17 57 18 47 14 45 C11 50 10 57 10 65" fill="#555" />
          <path d="M9 50 C2 42 1 32 5 30 C8 35 9 42 9 50" fill="#444" />
          <path d="M10 35 C17 27 18 17 14 15 C11 20 10 27 10 35" fill="#555" />
          <path d="M9 20 C3 13 2 6 6 4 C9 8 9 14 9 20" fill="#444" />
        </svg>
      ))}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [tripData, setTripData] = useState(null);
  const [animating, setAnimating] = useState(false);

  const handleSubmit = (data) => {
    setAnimating(true);
    setTimeout(() => { setTripData(data); setAnimating(false); }, 800);
  };

  return (
    <>
      <div className={`background ${animating || tripData ? "shifted" : ""}`}>
        <img className={`background-image ${animating || tripData ? "shifted" : ""}`} src="./fih.png" alt="" />
        {tripData === null ? <Bubbles /> : <></>}
      </div>
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
