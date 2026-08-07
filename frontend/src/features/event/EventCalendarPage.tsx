import React, { useState } from "react";

import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/core/auth/useAuth";
import {
  useEvents,
  useRSVPStatus,
  useRSVP,
  useCancelRSVP,
  useAttendees,
} from "@/features/event/api";
import { useRooms } from "@/features/campus/api";
import type { CampusEvent } from "@/features/event/types";

export function EventCalendarPage(): React.JSX.Element {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Fetch events for current month scope
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const fromTime = new Date(year, month, 1).toISOString();
  const toTime = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data: events, isLoading: loadingEvents } = useEvents({
    from: fromTime,
    to: toTime,
  });

  const { data: rooms } = useRooms();

  // Find the selected event object if any
  const selectedEvent = events?.find((e) => e.id === selectedEventId);

  // Fetch RSVP status and attendees for active event details
  const rsvpStatus = useRSVPStatus(selectedEventId);
  const attendees = useAttendees(selectedEventId);
  const joinRSVP = useRSVP();
  const leaveRSVP = useCancelRSVP();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedEventId(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedEventId(null);
  };

  // Helper to format days in a month
  const getDaysInMonth = () => {
    const startDayOfWeek = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: (Date | null)[] = Array(startDayOfWeek).fill(null);
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const daysGrid = getDaysInMonth();
  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  // Filter events scheduled on the selected day
  const eventsOnSelectedDay = events?.filter((e) => {
    const eDate = new Date(e.start_time).toISOString().split("T")[0];
    return eDate === selectedDateStr;
  }) || [];

  const handleRSVPToggle = () => {
    if (!selectedEventId || !rsvpStatus.data) return;
    if (rsvpStatus.data.user_rsvped) {
      leaveRSVP.mutate(selectedEventId);
    } else {
      joinRSVP.mutate(selectedEventId);
    }
  };

  const isOrganizerOrAdmin =
    selectedEvent && user && (selectedEvent.organizer_id === user.id || user.role === "admin");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Campus Event Calendar</h1>
        <p className="font-body text-xs text-slate mt-1">Register for seminars, reserve venue seats, and browse event schedules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar & Event Day List (Left columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-1 space-y-4">
            
            {/* Calendar Controls */}
            <div className="flex justify-between items-center border-b border-card-border pb-3">
              <h2 className="font-display text-base font-bold text-text-primary">
                {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
              </h2>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handlePrevMonth} className="p-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <Button variant="secondary" onClick={handleNextMonth} className="p-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>

            {/* Days header */}
            <div className="grid grid-cols-7 text-center text-xs font-bold text-slate py-1 border-b border-card-border">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Day Grid */}
            {loadingEvents ? (
              <div className="h-64 animate-pulse bg-slate/10 rounded-plaque" />
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {daysGrid.map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} className="h-12 sm:h-16" />;
                  
                  const dateStr = date.toISOString().split("T")[0];
                  const hasEvents = (events || []).some(
                    (e) => new Date(e.start_time).toISOString().split("T")[0] === dateStr
                  );
                  const isSelected = date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth();

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedEventId(null);
                      }}
                      className={`h-12 sm:h-16 rounded-plaque flex flex-col justify-between p-1.5 border text-left transition ${
                        isSelected
                          ? "bg-brass/10 border-brass text-text-primary font-bold"
                          : "bg-canvas/20 border-card-border hover:border-brass/45 text-text-primary"
                      }`}
                    >
                      <span className="text-xs">{date.getDate()}</span>
                      {hasEvents && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brass self-end mr-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Events list on selected day */}
          <div className="space-y-3">
            <h3 className="font-body text-xs font-bold uppercase tracking-widest text-slate">
              Scheduled Events: {selectedDate.toDateString()}
            </h3>

            {eventsOnSelectedDay.length === 0 ? (
              <div className="rounded-plaque border border-card-border bg-card-bg/40 p-6 text-center text-xs text-slate">
                No events scheduled for this day.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eventsOnSelectedDay.map((e) => {
                  const venue = rooms?.find((r) => r.id === e.room_id)?.name || "Campus Venue";
                  const startStr = new Date(e.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const endStr = new Date(e.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div
                      key={e.id}
                      onClick={() => setSelectedEventId(e.id)}
                      className={`p-4 rounded-plaque border bg-card-bg cursor-pointer transition ${
                        selectedEventId === e.id ? "border-brass ring-1 ring-brass" : "border-card-border hover:border-brass/50"
                      }`}
                    >
                      <span className="block font-display text-sm font-bold text-text-primary mb-1">
                        {e.title}
                      </span>
                      <div className="flex flex-col gap-1 text-[11px] text-slate">
                        <div className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span>{venue}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{startStr} – {endStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Event Panel Drawer (Right column) */}
        <div className="lg:col-span-1">
          {selectedEvent ? (
            <div className="rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-2 space-y-6 sticky top-4 animate-in slide-in-from-right-3 duration-200">
              
              {/* Header */}
              <div className="border-b border-card-border pb-3">
                <StatusBadge label={selectedEvent.status} tone={selectedEvent.status === "scheduled" ? "success" : "muted"} />
                <h3 className="font-display text-lg font-bold text-text-primary mt-2">
                  {selectedEvent.title}
                </h3>
              </div>

              {/* Event Metadata */}
              <div className="space-y-3.5 text-xs text-text-primary">
                <div>
                  <span className="block text-[10px] text-slate font-bold uppercase tracking-wider mb-0.5">Location Venue</span>
                  <span className="font-semibold">
                    {rooms?.find((r) => r.id === selectedEvent.room_id)?.name || "Main Auditorium"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate font-bold uppercase tracking-wider mb-0.5">Timing slot</span>
                  <span>
                    {new Date(selectedEvent.start_time).toLocaleString()} – {new Date(selectedEvent.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {/* RSVP Actions Board */}
              {rsvpStatus.isLoading ? (
                <div className="h-10 animate-pulse bg-slate/10 rounded-plaque" />
              ) : (
                <div className="rounded-plaque border border-card-border bg-canvas/30 p-4 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-primary font-semibold">Event Registration</span>
                    <span className="font-mono text-xs font-bold text-quad-green">
                      {rsvpStatus.data?.rsvp_count || 0} attending
                    </span>
                  </div>
                  <Button
                    onClick={handleRSVPToggle}
                    isLoading={joinRSVP.isPending || leaveRSVP.isPending}
                    className={`w-full py-2 ${
                      rsvpStatus.data?.user_rsvped
                        ? "bg-brick hover:bg-brick/90 text-white font-bold"
                        : "bg-quad-green hover:bg-quad-green/90 text-white font-bold"
                    }`}
                  >
                    {rsvpStatus.data?.user_rsvped ? "Cancel RSVP Registration" : "RSVP to Attend"}
                  </Button>
                </div>
              )}

              {/* Organizer / Admin attendees list */}
              {isOrganizerOrAdmin && (
                <div className="border-t border-card-border pt-4 space-y-3">
                  <h4 className="font-display text-xs font-bold text-text-primary uppercase tracking-wider">
                    Organizer Control: Attendee register
                  </h4>

                  {attendees.isLoading ? (
                    <div className="h-20 animate-pulse bg-slate/10 rounded-plaque" />
                  ) : !attendees.data || attendees.data.length === 0 ? (
                    <p className="text-xs text-slate italic">No RSVPs received yet.</p>
                  ) : (
                    <div className="overflow-hidden border border-card-border rounded-plaque bg-canvas/20">
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-left font-body text-xs border-collapse">
                          <thead className="bg-canvas/50 text-[10px] uppercase font-bold text-slate border-b border-card-border">
                            <tr>
                              <th className="px-3 py-2">Name</th>
                              <th className="px-3 py-2">Department</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-card-border text-[11px]">
                            {attendees.data.map((att) => (
                              <tr key={att.id}>
                                <td className="px-3 py-2 text-text-primary font-semibold">{att.full_name}</td>
                                <td className="px-3 py-2 text-slate">{att.department || "N/A"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center p-8 border border-dashed border-card-border bg-card-bg/20 rounded-plaque h-64 text-center text-xs text-slate">
              Select an event to view registrations, timings, and attendee listings
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
