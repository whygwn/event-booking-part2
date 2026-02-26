"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit2, Trash2, ChevronLeft, Calendar, MapPin } from "lucide-react";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    date: "",
    location: "",
    start_time: "",
    end_time: "",
    capacity: 10,
  });

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      if (decoded.role !== "admin") {
        router.push("/");
        return;
      }
    } catch {
      router.push("/login");
    }

    fetchEvents();
  }, [router]);

  const fetchEvents = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("/api/events?pageSize=100", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setEvents(data.data);
      } else {
        setError("Unable to load events right now.");
      }
    } catch (err) {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTimeLocal = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  };

  const handleEdit = async (event: any) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let slotStart = "";
    let slotEnd = "";
    let slotCapacity = 10;
    try {
      const detailRes = await fetch(`/api/events/${event.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const defaultSlot = (detail?.slots || []).sort(
          (a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )[0];
        if (defaultSlot) {
          slotStart = formatDateTimeLocal(defaultSlot.start_time);
          slotEnd = formatDateTimeLocal(defaultSlot.end_time);
          slotCapacity = Number(defaultSlot.capacity || 10);
        }
      }
    } catch {}

    setEditingId(event.id);
    setFormData({
      title: event.title,
      description: event.description || "",
      category: event.category || "",
      date: event.date,
      location: event.location || "",
      start_time: slotStart,
      end_time: slotEnd,
      capacity: slotCapacity,
    });
    setShowForm(true);
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/events/${editingId}` : "/api/events";
    const payload: any = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      date: formData.date,
      location: formData.location,
    };

    if (formData.start_time && formData.end_time) {
      payload.start_time = new Date(formData.start_time).toISOString();
      payload.end_time = new Date(formData.end_time).toISOString();
      payload.capacity = formData.capacity;
    } else if (!editingId) {
      setMessage({ type: "error", text: "Start time, end time, and capacity are required for new events." });
      return;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: "success",
          text: editingId ? "Event updated successfully!" : "Event created successfully!",
        });
        setFormData({
          title: "",
          description: "",
          category: "",
          date: "",
          location: "",
          start_time: "",
          end_time: "",
          capacity: 10,
        });
        setEditingId(null);
        setShowForm(false);
        fetchEvents();
      } else {
        setMessage({ type: "error", text: data.error || "Unable to complete this action right now." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Unable to connect to the server. Please try again." });
    }
  };

  const handleDelete = async (eventId: number) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Event deleted successfully!" });
        fetchEvents();
      } else {
        setMessage({ type: "error", text: data.error || "Unable to delete this event right now." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Unable to connect to the server. Please try again." });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Manage Events</h1>
          <p className="text-muted-foreground text-sm">Create, edit, and delete events</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              title: "",
              description: "",
              category: "",
              date: "",
              location: "",
              start_time: "",
              end_time: "",
              capacity: 10,
            });
          }}
          variant={showForm ? "destructive" : "default"}
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancel" : "New Event"}
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Event" : "Create New Event"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Event title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Event description"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Tech / Music / Sports"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Event location"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required={!editingId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required={!editingId}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Total Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                {editingId ? "Update Event" : "Create Event"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Total events: {events.length}</p>
        {events.length === 0 ? (
          <Card className="border-dashed shadow-none py-10">
            <CardContent className="text-center text-muted-foreground italic">
              No events yet. Create your first event!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {events.map((e: any) => (
              <Card key={e.id} className="overflow-hidden">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg line-clamp-1">{e.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{e.description}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </Badge>
                    </div>

                    {e.location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {e.location}
                      </div>
                    )}

                    {e.category && (
                      <Badge variant="outline" className="w-fit">
                        {e.category}
                      </Badge>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(e)}
                        className="flex-1"
                      >
                        <Edit2 className="w-3 h-3 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(e.id)}
                        className="flex-1"
                      >
                        <Trash2 className="w-3 h-3 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
