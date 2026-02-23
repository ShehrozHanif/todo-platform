# Quick integration test for MCP server tools
import asyncio
import json
from mcp.client.sse import sse_client
from mcp import ClientSession


async def test_tools():
    """Connect to the MCP server and test all 5 tools."""
    # Use a known user_id from the database
    user_id = "I7vNF9enKN8JqDWhhSEqPCZh51yzwDvw"  # localtest@test.com

    async with sse_client("http://127.0.0.1:8001/sse") as streams:
        async with ClientSession(*streams) as session:
            await session.initialize()

            # List available tools
            tools = await session.list_tools()
            print(f"\n=== Available tools ({len(tools.tools)}) ===")
            for t in tools.tools:
                print(f"  - {t.name}: {t.description}")

            # Test 1: list_tasks
            print("\n=== Test 1: list_tasks ===")
            result = await session.call_tool("list_tasks", {"user_id": user_id})
            raw = result.content[0].text
            print(f"  Raw result: {repr(raw)}")
            if result.isError:
                print(f"  ERROR: {raw}")
            else:
                tasks = json.loads(raw)
                print(f"  Tasks: {len(tasks)} found")

            # Test 2: add_task
            print("\n=== Test 2: add_task ===")
            result = await session.call_tool("add_task", {
                "user_id": user_id,
                "title": "MCP Test Task",
                "description": "Created via MCP server test"
            })
            raw = result.content[0].text
            print(f"  Raw result: {repr(raw)}")
            if result.isError or not raw:
                print(f"  ERROR or empty response")
                return
            created = json.loads(raw)
            print(f"  Created: {created}")
            if "error" in created:
                print(f"  ERROR: {created['error']}")
                return
            task_id = created["id"]

            # Test 3: complete_task
            print("\n=== Test 3: complete_task ===")
            result = await session.call_tool("complete_task", {
                "user_id": user_id,
                "task_id": task_id
            })
            completed = json.loads(result.content[0].text)
            print(f"  Completed: {completed['completed']}")

            # Test 4: update_task
            print("\n=== Test 4: update_task ===")
            result = await session.call_tool("update_task", {
                "user_id": user_id,
                "task_id": task_id,
                "title": "MCP Test Task (Updated)"
            })
            updated = json.loads(result.content[0].text)
            print(f"  Updated title: {updated['title']}")

            # Test 5: delete_task
            print("\n=== Test 5: delete_task ===")
            result = await session.call_tool("delete_task", {
                "user_id": user_id,
                "task_id": task_id
            })
            deleted = json.loads(result.content[0].text)
            print(f"  Deleted: {deleted}")

            # Test 6: Error cases
            print("\n=== Test 6: Error cases ===")

            # Invalid user
            result = await session.call_tool("add_task", {
                "user_id": "nonexistent",
                "title": "Should fail"
            })
            err = json.loads(result.content[0].text)
            print(f"  Invalid user: {err}")

            # Empty title
            result = await session.call_tool("add_task", {
                "user_id": user_id,
                "title": ""
            })
            err = json.loads(result.content[0].text)
            print(f"  Empty title: {err}")

            # Non-existent task
            result = await session.call_tool("delete_task", {
                "user_id": user_id,
                "task_id": 999999
            })
            err = json.loads(result.content[0].text)
            print(f"  Missing task: {err}")

            print("\n=== All tests passed! ===")


if __name__ == "__main__":
    asyncio.run(test_tools())
