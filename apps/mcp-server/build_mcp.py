"""
PyInstaller entry point for the MCP server.

Build a standalone .exe:
    cd apps/mcp-server
    pyinstaller --onefile --console --name local-kb-mcp build_mcp.py
"""
from knowledge_mcp.server import main

if __name__ == "__main__":
    main()
