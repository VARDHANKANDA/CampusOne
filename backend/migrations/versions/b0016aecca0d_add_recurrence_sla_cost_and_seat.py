"""add_recurrence_sla_cost_and_seat

Revision ID: b0016aecca0d
Revises: 0001
Create Date: 2026-08-07 18:29:33.378328

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b0016aecca0d'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Define Enum recurrence_type first (since it's a new PG enum)
    recurrence_type = postgresql.ENUM('none', 'daily', 'weekly', name='recurrence_type')
    recurrence_type.create(op.get_bind(), checkfirst=True)

    # 2. Add columns to bookings
    op.add_column('bookings', sa.Column('recurrence_type', sa.Enum('none', 'daily', 'weekly', name='recurrence_type'), server_default='none', nullable=False))
    op.add_column('bookings', sa.Column('recurrence_end_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('bookings', sa.Column('recurrence_parent_id', sa.UUID(), nullable=True))
    op.add_column('bookings', sa.Column('checked_in_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('bookings', sa.Column('seat_number', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_bookings_recurrence_parent', 'bookings', 'bookings', ['recurrence_parent_id'], ['id'], ondelete='CASCADE')

    # 3. Add columns to complaints
    op.add_column('complaints', sa.Column('sla_due_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('complaints', sa.Column('sla_breached', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('complaints', sa.Column('escalated_to_admin', sa.Boolean(), server_default='false', nullable=False))

    # 4. Add columns to maintenance_requests
    op.add_column('maintenance_requests', sa.Column('cost', sa.Float(), nullable=True))


def downgrade() -> None:
    # 1. Drop foreign key and columns from bookings
    op.drop_constraint('fk_bookings_recurrence_parent', 'bookings', type_='foreignkey')
    op.drop_column('bookings', 'seat_number')
    op.drop_column('bookings', 'checked_in_at')
    op.drop_column('bookings', 'recurrence_parent_id')
    op.drop_column('bookings', 'recurrence_end_date')
    op.drop_column('bookings', 'recurrence_type')

    # 2. Drop enum recurrence_type
    recurrence_type = postgresql.ENUM('none', 'daily', 'weekly', name='recurrence_type')
    recurrence_type.drop(op.get_bind(), checkfirst=True)

    # 3. Drop columns from complaints
    op.drop_column('complaints', 'escalated_to_admin')
    op.drop_column('complaints', 'sla_breached')
    op.drop_column('complaints', 'sla_due_at')

    # 4. Drop columns from maintenance_requests
    op.drop_column('maintenance_requests', 'cost')
