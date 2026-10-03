from dotenv import load_dotenv
load_dotenv()

import os
from alembic import context
from sqlmodel import SQLModel
from logging.config import fileConfig

config = context.config

# ✅ Pull from env
sync_url = os.getenv("SYNC_DATABASE_URL")
if not sync_url:
    raise RuntimeError("SYNC_DATABASE_URL not set")
config.set_main_option("sqlalchemy.url", sync_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import models
from app.models.user import User
target_metadata = SQLModel.metadata