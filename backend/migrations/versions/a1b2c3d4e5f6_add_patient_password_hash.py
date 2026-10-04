"""add patient password hash

Revision ID: a1b2c3d4e5f6
Revises: 27a3a3a83ad9
Create Date: 2026-10-04 01:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '27a3a3a83ad9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('patients', sa.Column('password_hash', sa.String(length=255), server_default='', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('patients', 'password_hash')
