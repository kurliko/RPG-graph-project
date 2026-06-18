from neo4j import GraphDatabase

class Neo4jConnection:
    def __init__(self, uri, user, pwd):
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))

    def close(self):
        if self.driver:
            self.driver.close()

    def query(self, query, parameters=None, db=None):
        assert self.driver is not None, "Driver not initialized!"
        session = None
        response = None
        try: 
            session = self.driver.session(database=db) if db is not None else self.driver.session() 
            response = list(session.run(query, parameters))
        except Exception as e:
            print("Query failed:", e)
        finally: 
            if session is not None: 
                session.close()
        return response

import os

# Inicjalizacja połączenia z bazą działającą w Dockerze
NEO4J_URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
db = Neo4jConnection(NEO4J_URI, "neo4j", "rpg-password123")
