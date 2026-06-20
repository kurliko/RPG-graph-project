from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import graph, nodes, links, game_logic

app = FastAPI(title="RPG Graph API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graph.router)
app.include_router(nodes.router)
app.include_router(links.router)
app.include_router(game_logic.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to RPG Graph API!"}
