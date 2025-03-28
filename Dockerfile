FROM ghcr.io/astral-sh/uv:latest
WORKDIR /app
COPY . .
RUN uv sync
CMD ["uv", "run", "main.py"]