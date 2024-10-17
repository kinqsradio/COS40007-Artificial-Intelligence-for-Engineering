"""Initial migration.

Revision ID: 57139266dabd
Revises: 
Create Date: 2024-10-17 13:37:03.708911

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '57139266dabd'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('global_settings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('detection_model_name', sa.String(length=100), nullable=False),
    sa.Column('segmentation_model_name', sa.String(length=100), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('global_settings')
    # ### end Alembic commands ###
