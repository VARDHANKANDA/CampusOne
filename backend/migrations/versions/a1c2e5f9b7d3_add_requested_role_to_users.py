"""add_requested_role_to_users

Revision ID: a1c2e5f9b7d3
Revises: fdb613a0ba34
Create Date: 2026-08-10 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1c2e5f9b7d3"
down_revision: str | None = "fdb613a0ba34"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "requested_role",
            sa.Enum(
                "student",
                "faculty",
                "warden",
                "maintenance_staff",
                "admin",
                name="user_role",
                create_type=False,
            ),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "requested_role")
