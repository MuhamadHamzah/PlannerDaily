// App.jsx (modernized + dark mode toggle)
import React, { useState, useEffect } from 'react';
import { backend } from 'declarations/backend';
import '../index.css';

const App = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthData, setMonthData] = useState([]);
  const [dayDetail, setDayDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchMonthData(currentDate.getFullYear(), currentDate.getMonth() + 1);
  }, [currentDate]);

  useEffect(() => {
    fetchDayDetail();
  }, [selectedDate]);

  const fetchMonthData = async (year, month) => {
    setLoading(true);
    try {
      const data = await backend.get_month_data(year, month);
      setMonthData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDayDetail = async () => {
    setLoading(true);
    const dateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
    try {
      const data = await backend.get_day_data(dateString);
      setDayDetail(data?.[0] || { notes: [], on_this_day: null });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    const content = newNoteContent.trim();
    if (!content || selectedDate < new Date().setHours(0, 0, 0, 0)) return;

    const dateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
    setLoading(true);
    try {
      await backend.add_note(dateString, content);
      setNewNoteContent('');
      fetchDayDetail();
      fetchMonthData(currentDate.getFullYear(), currentDate.getMonth() + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteNote = async (noteId) => {
    const dateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
    setLoading(true);
    try {
      await backend.complete_note(dateString, noteId);
      fetchDayDetail();
      fetchMonthData(currentDate.getFullYear(), currentDate.getMonth() + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchOnThisDay = async () => {
    const dateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
    setLoading(true);
    try {
      await backend.fetch_and_store_on_this_day(dateString);
      fetchDayDetail();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="calendar-grid">
        {[...Array(startDay)].map((_, i) => <div key={`empty-${i}`} className="empty-day"></div>)}
        {daysArray.map(day => {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isPast = date < new Date().setHours(0, 0, 0, 0);
          const notes = monthData.find(d => new Date(d[0]).toDateString() === date.toDateString())?.[1].notes || [];
          const incompleteNotes = notes.filter(n => !n.is_completed).length;

          return (
            <div
              key={day}
              className={`day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <span>{day}</span>
              {incompleteNotes > 0 && <span className="note-count-indicator">{incompleteNotes}</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div id="app">
      <button id="mode-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
      </button>

      <h1>Daily Planner</h1>

      <div id="calendar">
        <h2>{currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <button id="today" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}>Today</button>
        {renderCalendar()}
      </div>

      <div id="day-detail">
        <h2>{selectedDate.toLocaleDateString()}</h2>

        <div className="on-this-day">
          <h3>On This Day</h3>
          {dayDetail?.on_this_day?.length ? (
            <>
              <p>{dayDetail.on_this_day[0].title} ({dayDetail.on_this_day[0].year})</p>
              <a href={dayDetail.on_this_day[0].wiki_link} target="_blank" rel="noreferrer">Read more</a>
            </>
          ) : (
            <button id="fetch-on-this-day" onClick={handleFetchOnThisDay}>Get data from the Internet</button>
          )}
        </div>

        <div className="notes">
          <h3>Notes</h3>
          <ul>
            {dayDetail?.notes?.map((note, i) => (
              <li key={i} className={note.is_completed ? 'completed' : ''}>
                {note.content}
                {!note.is_completed && (
                  <button onClick={() => handleCompleteNote(note.id)}>Mark Complete</button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {selectedDate >= new Date(new Date().setHours(0, 0, 0, 0)) && (
          <div className="add-note">
            <input
              type="text"
              placeholder="New note"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
            />
            <button onClick={handleAddNote}>Add Note</button>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default App;
