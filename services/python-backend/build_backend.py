"""
PyInstaller entry point for the knowledge backend.

Build a standalone .exe:
    cd services/python-backend
    pyinstaller --onefile --console --name knowledge-backend build_backend.py
"""
from knowledge_backend.main import main

if __name__ == "__main__":
    main()
