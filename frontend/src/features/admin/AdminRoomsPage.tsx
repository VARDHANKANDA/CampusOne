import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";
import {
  useBuildings,
  useCreateBuilding,
  useCreateRoom,
  useRooms,
  useUpdateRoom,
} from "@/features/campus/api";
import type { RoomType } from "@/features/campus/types";
import { exportToCSV } from "@/utils/export";

const ROOM_TYPES: RoomType[] = ["classroom", "lab", "auditorium", "seminar_hall"];

export function AdminRoomsPage(): React.JSX.Element {
  const { data: buildings } = useBuildings();
  const { data: rooms } = useRooms();
  const createBuilding = useCreateBuilding();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();

  const [buildingName, setBuildingName] = useState("");
  const [buildingCode, setBuildingCode] = useState("");

  const [roomBuildingId, setRoomBuildingId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState<RoomType>("classroom");
  const [roomCapacity, setRoomCapacity] = useState(30);

  const handleExportRooms = () => {
    if (!rooms) return;
    const exportData = rooms.map((r) => ({
      ID: r.id,
      Name: r.name,
      Type: r.type,
      Capacity: r.capacity,
      Status: r.is_active ? "Active" : "Inactive",
    }));
    exportToCSV(exportData, "campus_rooms_directory.csv");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Buildings &amp; Rooms master data</h1>
          <p className="font-body text-xs text-slate mt-1">Manage physical infrastructure, classroom registers, and student capacities</p>
        </div>
        <Button onClick={handleExportRooms} variant="secondary" className="py-2.5 px-4 font-semibold text-xs self-stretch sm:self-auto">
          Export Rooms CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* New Building Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createBuilding.mutate(
              { name: buildingName, code: buildingCode },
              { onSuccess: () => {
                setBuildingName("");
                setBuildingCode("");
              } },
            );
          }}
          className="flex flex-col gap-4 rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-1"
        >
          <h2 className="font-body text-xs font-bold uppercase tracking-widest text-slate border-b border-card-border pb-2">
            Register New Building
          </h2>
          <TextField
            label="Building Name"
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            required
            placeholder="e.g. Science Block A"
          />
          <TextField
            label="Location Code"
            value={buildingCode}
            onChange={(e) => setBuildingCode(e.target.value)}
            required
            placeholder="e.g. SCI-A"
          />
          <Button type="submit" isLoading={createBuilding.isPending} className="w-fit py-2 px-4 mt-1">
            Create Building
          </Button>
        </form>

        {/* New Room Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createRoom.mutate(
              {
                building_id: roomBuildingId,
                name: roomName,
                type: roomType,
                capacity: roomCapacity,
              },
              { onSuccess: () => setRoomName("") },
            );
          }}
          className="flex flex-col gap-4 rounded-plaque border border-card-border bg-card-bg p-5 shadow-level-1"
        >
          <h2 className="font-body text-xs font-bold uppercase tracking-widest text-slate border-b border-card-border pb-2">
            Register New Room / Lab / Venue
          </h2>
          <div className="flex flex-col gap-1">
            <label htmlFor="room-building" className="font-body text-xs font-semibold text-text-primary">
              Building Block Location
            </label>
            <select
              id="room-building"
              className="rounded-plaque border border-card-border bg-canvas px-3 py-2 font-body text-sm text-text-primary outline-none focus:ring-2 focus:ring-brass"
              value={roomBuildingId}
              onChange={(e) => setRoomBuildingId(e.target.value)}
              required
            >
              <option value="">Select building...</option>
              {buildings?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <TextField
            label="Room Identifier / Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
            placeholder="e.g. Room 402, Lab-3"
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="room-type" className="font-body text-xs font-semibold text-text-primary">
              Room Category / Type
            </label>
            <select
              id="room-type"
              className="rounded-plaque border border-card-border bg-canvas px-3 py-2 font-body text-sm text-text-primary outline-none focus:ring-2 focus:ring-brass"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value as RoomType)}
            >
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <TextField
            label="Max Seating Capacity"
            type="number"
            min={1}
            value={roomCapacity}
            onChange={(e) => setRoomCapacity(Number(e.target.value))}
          />

          <Button type="submit" isLoading={createRoom.isPending} className="w-fit py-2 px-4 mt-1">
            Create Room
          </Button>
        </form>
      </div>

      {/* Rooms Master Table view */}
      <div className="overflow-x-auto rounded-plaque border border-card-border bg-card-bg shadow-level-1">
        <table className="w-full text-left font-body text-sm border-collapse">
          <thead className="border-b border-card-border bg-canvas/40 text-[10px] uppercase font-bold tracking-wider text-slate">
            <tr>
              <th className="px-5 py-3">Room Identifier</th>
              <th className="px-5 py-3">Category Type</th>
              <th className="px-5 py-3">Seating Capacity</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {rooms?.map((room) => (
              <tr key={room.id} className="hover:bg-canvas/10 transition-colors">
                <td className="px-5 py-3.5 font-bold text-text-primary">{room.name}</td>
                <td className="px-5 py-3.5 text-slate capitalize">{room.type.replace("_", " ")}</td>
                <td className="px-5 py-3.5 text-slate font-mono">{room.capacity} seats</td>
                <td className="px-5 py-3.5">
                  <StatusBadge
                    label={room.is_active ? "Active" : "Inactive"}
                    tone={room.is_active ? "success" : "muted"}
                  />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Button
                    variant="secondary"
                    isLoading={updateRoom.isPending && updateRoom.variables?.roomId === room.id}
                    onClick={() =>
                      updateRoom.mutate({ roomId: room.id, is_active: !room.is_active })
                    }
                    className="py-1 px-3.5 text-xs"
                  >
                    {room.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {(!rooms || rooms.length === 0) && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate">
                  No rooms or buildings registered in the database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
