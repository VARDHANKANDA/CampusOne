"""Initial schema — all core tables per docs/DATABASE.md.

Revision ID: 0001
Revises:
Create Date: 2026-08-06

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column(
            "role",
            sa.Enum("student", "faculty", "warden", "maintenance_staff", "admin", name="user_role"),
            nullable=False,
        ),
        sa.Column("department", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "buildings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=False, unique=True),
        sa.Column("location", sa.String(), nullable=True),
    )

    op.create_table(
        "rooms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "building_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("buildings.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "type",
            sa.Enum("classroom", "lab", "auditorium", "seminar_hall", name="room_type"),
            nullable=False,
        ),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column(
            "equipment_tags", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("requires_approval", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_rooms_building_id", "rooms", ["building_id"])

    op.create_table(
        "equipment",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "category",
            sa.Enum(
                "projector",
                "computer",
                "lab_equipment",
                "smart_board",
                "furniture",
                "other",
                name="equipment_category",
            ),
            nullable=False,
        ),
        sa.Column(
            "building_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("buildings.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("department", sa.String(), nullable=True),
        sa.Column("purchase_date", sa.Date(), nullable=True),
        sa.Column("warranty_expiry", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "available", "in_use", "under_repair", "decommissioned", name="equipment_status"
            ),
            nullable=False,
            server_default="available",
        ),
    )

    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "room_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("rooms.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "requester_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "time_range",
            postgresql.TSTZRANGE(),
            sa.Computed("tstzrange(start_time, end_time, '[)')", persisted=True),
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "confirmed", "cancelled", "rejected", name="booking_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("purpose", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_bookings_room_time",
        "bookings",
        ["room_id", "start_time", "end_time"],
        postgresql_using="gist",
    )
    op.execute(
        "ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap_when_confirmed "
        "EXCLUDE USING gist (room_id WITH =, time_range WITH &&) WHERE (status = 'confirmed')"
    )

    op.create_table(
        "maintenance_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "room_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("rooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
    )

    op.create_table(
        "waitlist_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "room_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("rooms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("requested_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("requested_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "complaints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "reporter_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "category",
            sa.Enum(
                "plumbing", "electrical", "network", "furniture", "other", name="complaint_category"
            ),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("completion_image_url", sa.Text(), nullable=True),
        sa.Column(
            "priority",
            sa.Enum("low", "medium", "high", "urgent", name="complaint_priority"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "submitted",
                "assigned",
                "in_progress",
                "completed",
                "verified",
                name="complaint_status",
            ),
            nullable=False,
            server_default="submitted",
        ),
        sa.Column(
            "assigned_to",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_complaints_status", "complaints", ["status"])
    op.create_index("ix_complaints_assigned_to", "complaints", ["assigned_to"])

    op.create_table(
        "maintenance_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "complaint_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("complaints.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "equipment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("equipment.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "technician_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "in_progress", "completed", name="maintenance_request_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("estimated_completion", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_completion", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completion_photo_url", sa.Text(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "room_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("rooms.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "organizer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "time_range",
            postgresql.TSTZRANGE(),
            sa.Computed("tstzrange(start_time, end_time, '[)')", persisted=True),
        ),
        sa.Column(
            "status",
            sa.Enum("scheduled", "cancelled", name="event_status"),
            nullable=False,
            server_default="scheduled",
        ),
    )
    op.execute(
        "ALTER TABLE events ADD CONSTRAINT events_no_overlap_when_scheduled "
        "EXCLUDE USING gist (room_id WITH =, time_range WITH &&) WHERE (status = 'scheduled')"
    )

    op.create_table(
        "attendance_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "faculty_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("course_code", sa.String(), nullable=False),
        sa.Column("qr_token", sa.String(), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "attendance_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attendance_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "scanned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("session_id", "student_id", name="uq_attendance_once"),
    )
    op.create_index("ix_attendance_records_session_id", "attendance_records", ["session_id"])

    op.create_table(
        "lost_found_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "reporter_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("type", sa.Enum("lost", "found", name="lost_found_type"), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("open", "matched", "closed", name="lost_found_status"),
            nullable=False,
            server_default="open",
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_notifications_user_read", "notifications", ["user_id", "read_at"])

    op.create_table(
        "notification_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(), nullable=False, unique=True),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "updated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.execute(
        "INSERT INTO notification_settings (id, event_type, email_enabled) VALUES "
        "(gen_random_uuid(), 'booking_confirmed', false), "
        "(gen_random_uuid(), 'booking_cancelled', false), "
        "(gen_random_uuid(), 'complaint_status_changed', false), "
        "(gen_random_uuid(), 'event_reminder', false), "
        "(gen_random_uuid(), 'maintenance_assigned', false), "
        "(gen_random_uuid(), 'waitlist_slot_opened', false)"
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "actor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("before_state", postgresql.JSONB(), nullable=True),
        sa.Column("after_state", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_audit_logs_entity", "audit_logs", ["entity_type", "entity_id"])
    # Append-only per docs/DATABASE.md §2.16 / docs/RULES.md §5: no role other than the
    # migration owner may UPDATE or DELETE audit_logs, even the application's own DB role.
    op.execute("REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC")

    op.create_table(
        "equipment_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "equipment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("equipment.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "requester_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("purpose", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", name="equipment_request_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_table("equipment_requests")
    op.drop_table("audit_logs")
    op.drop_table("notification_settings")
    op.drop_table("notifications")
    op.drop_table("lost_found_items")
    op.drop_table("attendance_records")
    op.drop_table("attendance_sessions")
    op.drop_table("events")
    op.drop_table("maintenance_requests")
    op.drop_table("complaints")
    op.drop_table("waitlist_entries")
    op.drop_table("maintenance_schedules")
    op.drop_table("bookings")
    op.drop_table("equipment")
    op.drop_table("rooms")
    op.drop_table("buildings")
    op.drop_table("users")
    for enum_name in (
        "user_role",
        "room_type",
        "equipment_category",
        "equipment_status",
        "booking_status",
        "complaint_category",
        "complaint_priority",
        "complaint_status",
        "maintenance_request_status",
        "event_status",
        "lost_found_type",
        "lost_found_status",
        "equipment_request_status",
    ):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
