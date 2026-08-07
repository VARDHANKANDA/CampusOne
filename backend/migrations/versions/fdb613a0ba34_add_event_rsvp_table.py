"""add_event_rsvp_table

Revision ID: fdb613a0ba34
Revises: b0016aecca0d
Create Date: 2026-08-07 18:35:50.018559

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'fdb613a0ba34'
down_revision: Union[str, None] = 'b0016aecca0d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'event_rsvps',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('event_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id', 'user_id', name='uq_event_user_rsvp')
    )


def downgrade() -> None:
    op.drop_table('event_rsvps')
