# [Task]: T003 [From]: specs/phase3-chatbot/ai-agent/plan.md §Agent
# OpenAI Agents SDK integration with MCP Server for task management.
# Connects to MCP Server via SSE and runs natural language commands.

import os

from agents import Agent, Runner
from agents.mcp import MCPServerSse

MCP_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8001/sse")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """You are TaskFlow Assistant, an AI that helps users manage their to-do tasks.
You have access to tools that can add, list, complete, delete, and update tasks.

The current user's ID is: {user_id}
Always use this user_id when calling any tool.

Rules:
- When the user asks to add a task, use the add_task tool with the user_id and the task title.
- When the user asks to see/list their tasks, use the list_tasks tool.
- When the user asks to complete/finish/done a task, use the complete_task tool.
- When the user asks to delete/remove a task, use the delete_task tool.
- When the user asks to update/edit/rename a task, use the update_task tool.
- After performing an action, confirm what you did in a friendly, concise way.
- If the user's request is ambiguous, ask for clarification.
- For list_tasks, format the results in a readable way with task IDs.
- Keep responses short and helpful.

Context awareness:
- Use the conversation history above to resolve references and pronouns.
- If the user says "it", "that", "that one", "the first one", "the last task", etc., look at previous messages to determine what they mean.
- Example: if the user said "Add task Buy milk" and then says "delete it", "it" refers to the "Buy milk" task.
- Example: if you listed 3 tasks and the user says "complete the second one", complete the 2nd task from that list.
- Always prefer resolving from context over asking for clarification.

Language:
- Always respond in the SAME language the user writes in.
- If the user writes in Urdu, respond in Urdu. If Spanish, respond in Spanish. If Arabic, respond in Arabic.
- Generate suggestion chips in the user's language too.
- If the user switches languages mid-conversation, match their latest message language.

Smart suggestions:
- After EVERY response, append exactly this format on its own line at the very end:
  <!--suggestions:["suggestion 1","suggestion 2","suggestion 3"]-->
- Generate 2-3 short, contextual follow-up suggestions based on what just happened.
- Suggestions should be natural language commands the user might want to do next.
- Examples after adding a task: <!--suggestions:["List all tasks","Add another task","Complete a task"]-->
- Examples after listing tasks: <!--suggestions:["Complete task 1","Add a new task","Delete a task"]-->
- Examples after completing a task: <!--suggestions:["List remaining tasks","Add a new task"]-->
- ALWAYS include the suggestions line. Never skip it.
"""


async def run_agent(user_id: str, message: str, history: list[dict]) -> str:
    """
    Run the AI agent with MCP tools to handle a user's chat message.

    Args:
        user_id: The authenticated user's ID
        message: The user's chat message
        history: Previous messages as [{"role": "user"|"assistant", "content": "..."}]

    Returns:
        The agent's text response
    """
    async with MCPServerSse(
        name="todo-mcp",
        params={"url": MCP_URL},
        cache_tools_list=True,
    ) as mcp_server:
        agent = Agent(
            name="TaskFlow Assistant",
            instructions=SYSTEM_PROMPT.format(user_id=user_id),
            model=MODEL,
            mcp_servers=[mcp_server],
        )

        # Build input: history + new user message
        input_items = []
        for msg in history:
            input_items.append({
                "role": msg["role"],
                "content": msg["content"],
            })
        input_items.append({"role": "user", "content": message})

        result = await Runner.run(agent, input_items)
        return result.final_output
