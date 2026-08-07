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

const ROOM_TYPES: RoomType[] = ["classroom", "lab", "auditorium", "seminar_hall"];

/** docs/PRD.md FR-14.2 — manage buildings and rooms/labs/venues master data. */
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

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl text-ink-navy">Buildings &amp; Rooms</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createBuilding.mutate(
              { name: buildingName, code: buildingCode },
              { onSuccess: () => setBuildingName("") },
            );
          }}
          className="flex flex-col gap-3 rounded-plaque border border-slate/15 bg-white p-4 shadow-level-1"
        >
          <h2 className="font-body text-sm font-semibold uppercase tracking-wide text-slate">
            New building
          </h2>
          <TextField
            label="Name"
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            required
          />
          <TextField
            label="Code"
            value={buildingCode}
            onChange={(e) => setBuildingCode(e.target.value)}
            required
          />
          <Button type="submit" isLoading={createBuilding.isPending} className="w-fit">
            Create building
          </Button>
        </form>

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
          className="flex flex-col gap-3 rounded-plaque border border-slate/15 bg-white p-4 shadow-level-1"
        >
          <h2 className="font-body text-sm font-semibold uppercase tracking-wide text-slate">
            New room
          </h2>
          <div className="flex flex-col gap-1">
            <label htmlFor="room-building" className="font-body text-sm font-medium text-ink-navy">
              Building
            </label>
            <select
              id="room-building"
              className="rounded-plaque border border-slate/30 bg-chalk px-3 py-2 font-body text-sm text-ink-navy"
              value={roomBuildingId}
              onChange={(e) => setRoomBuildingId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {buildings?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <TextField
            label="Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="room-type" className="font-body text-sm font-medium text-ink-navy">
              Type
            </label>
            <select
              id="room-type"
              className="rounded-plaque border border-slate/30 bg-chalk px-3 py-2 font-body text-sm text-ink-navy"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value as RoomType)}
            >
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <TextField
            label="Capacity"
            type="number"
            min={1}
            value={roomCapacity}
            onChange={(e) => setRoomCapacity(Number(e.target.value))}
          />
          <Button type="submit" isLoading={createRoom.isPending} className="w-fit">
            Create room
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-plaque border border-slate/15 bg-white shadow-level-1">
        <table className="w-full text-left font-body text-sm">
          <thead className="border-b border-slate/15 text-xs uppercase tracking-wide text-slate">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Capacity</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate/10">
            {rooms?.map((room) => (
              <tr key={room.id}>
                <td className="px-4 py-2 text-ink-navy">{room.name}</td>
                <td className="px-4 py-2 text-slate">{room.type}</td>
                <td className="px-4 py-2 text-slate">{room.capacity}</td>
                <td className="px-4 py-2">
                  <StatusBadge
                    label={room.is_active ? "Active" : "Inactive"}
                    tone={room.is_active ? "success" : "muted"}
                  />
                </td>
                <td className="px-4 py-2">
                  <Button
                    variant="secondary"
                    isLoading={updateRoom.isPending && updateRoom.variables?.roomId === room.id}
                    onClick={() =>
                      updateRoom.mutate({ roomId: room.id, is_active: !room.is_active })
                    }
                  >
                    {room.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
